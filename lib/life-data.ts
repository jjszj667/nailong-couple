import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { dateInShanghai, daysBetween, monthBounds, nextEventOccurrence, relationshipDays } from "@/lib/life";
import type {
  AchievementDefinition,
  CalendarEvent,
  Checkin,
  DailyNote,
  Mood,
  MoodResponse,
  Order,
  OrderMysteryDetails,
  Place,
  Product,
  ProductMysteryDetails,
  Profile,
  RelationshipSettings,
  UserAchievement,
  WalletBalance,
  WalletTransaction,
  Wish,
  WishAdminMeta,
} from "@/types/database";

async function signedLifeImages<T extends { image_url: string | null }>(items: T[]) {
  const paths = items.map((item) => item.image_url).filter((path): path is string => Boolean(path));
  if (!paths.length) return items.map((item) => ({ ...item, signed_url: null as string | null }));
  const supabase = await createClient();
  const { data } = await supabase.storage.from("life-images").createSignedUrls(paths, 3600);
  const urls = new Map(paths.map((path, index) => [path, data?.[index]?.signedUrl ?? null]));
  return items.map((item) => ({ ...item, signed_url: item.image_url ? urls.get(item.image_url) ?? null : null }));
}

async function signedCheckins(items: Checkin[]) {
  if (!items.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from("checkin-images").createSignedUrls(items.map((item) => item.image_url), 3600);
  return items.map((item, index) => ({ ...item, signed_url: data?.[index]?.signedUrl ?? null }));
}

export async function getRelationshipData() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("relationship_settings").select("*").eq("id", true).maybeSingle();
  const settings = data as RelationshipSettings | null;
  return { settings, days: relationshipDays(settings?.start_date ?? null) };
}

export async function getHomeLifeData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const today = dateInShanghai();
  const [moodRes, noteRes, relationshipRes, eventsRes, wishesRes, recentMoodsRes, recentEventsRes] = await Promise.all([
    supabase.from("moods").select("*").eq("user_id", profile.id).eq("mood_date", today).maybeSingle(),
    supabase.from("daily_notes").select("*").eq("user_id", profile.id).eq("note_date", today).maybeSingle(),
    supabase.from("relationship_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("calendar_events").select("*").order("event_date").limit(500),
    supabase.from("wishes").select("*").eq("user_id", profile.id).eq("status", "active").order("created_at", { ascending: false }).limit(3),
    supabase.from("moods").select("*").eq("user_id", profile.id).order("updated_at", { ascending: false }).limit(5),
    supabase.from("calendar_events").select("*").order("created_at", { ascending: false }).limit(5),
  ]);
  const mood = moodRes.data as Mood | null;
  let response: MoodResponse | null = null;
  if (mood) {
    const result = await supabase.from("mood_responses").select("*").eq("mood_id", mood.id).maybeSingle();
    response = result.data as MoodResponse | null;
  }
  const events = (eventsRes.data ?? []) as CalendarEvent[];
  const upcoming = events
    .map((event) => ({ event, occurrence: nextEventOccurrence(event, today) }))
    .filter((item): item is { event: CalendarEvent; occurrence: string } => Boolean(item.occurrence))
    .sort((a, b) => a.occurrence.localeCompare(b.occurrence))[0] ?? null;
  const relationship = relationshipRes.data as RelationshipSettings | null;
  return {
    mood,
    response,
    note: noteRes.data as DailyNote | null,
    relationship,
    relationshipDays: relationshipDays(relationship?.start_date ?? null, today),
    upcoming: upcoming ? { ...upcoming, daysAway: daysBetween(today, upcoming.occurrence) } : null,
    wishes: (wishesRes.data ?? []) as Wish[],
    activities: [
      ...((recentMoodsRes.data ?? []) as Mood[]).map((item) => ({ id: `mood-${item.id}`, text: `记录了 ${item.mood_date} 的心情`, created_at: item.updated_at, kind: "mood" })),
      ...((recentEventsRes.data ?? []) as CalendarEvent[]).map((item) => ({ id: `event-${item.id}`, text: `收藏了「${item.title}」`, created_at: item.created_at, kind: "event" })),
    ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
  };
}

export async function getCalendarData(monthInput?: string, selectedDate?: string) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const bounds = monthBounds(monthInput ?? dateInShanghai().slice(0, 7));
  const date = selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) ? selectedDate : null;
  const [moodsRes, notesRes, checkinsRes, eventsRes] = await Promise.all([
    supabase.from("moods").select("*").eq("user_id", profile.id).gte("mood_date", bounds.start).lte("mood_date", bounds.end).order("mood_date"),
    supabase.from("daily_notes").select("*").eq("user_id", profile.id).gte("note_date", bounds.start).lte("note_date", bounds.end).order("note_date"),
    supabase.from("checkins").select("*").eq("user_id", profile.id).gte("checkin_date", bounds.start).lte("checkin_date", bounds.end).order("checkin_date"),
    supabase.from("calendar_events").select("*").order("event_date").limit(500),
  ]);
  const moods = (moodsRes.data ?? []) as Mood[];
  const notes = (notesRes.data ?? []) as DailyNote[];
  const checkins = (checkinsRes.data ?? []) as Checkin[];
  const events = (eventsRes.data ?? []) as CalendarEvent[];
  let dayTransactions: WalletTransaction[] = [];
  let dayOrders: Order[] = [];
  let dayCheckins: Awaited<ReturnType<typeof signedCheckins>> = [];
  let dayMood: Mood | null = null;
  let dayNote: DailyNote | null = null;
  if (date) {
    const start = new Date(`${date}T00:00:00+08:00`).toISOString();
    const end = new Date(new Date(`${date}T00:00:00+08:00`).getTime() + 86_400_000).toISOString();
    const [transactionsRes, ordersRes] = await Promise.all([
      supabase.from("wallet_transactions").select("*").eq("user_id", profile.id).gte("created_at", start).lt("created_at", end).order("created_at"),
      supabase.from("orders").select("*").eq("user_id", profile.id).gte("created_at", start).lt("created_at", end).order("created_at"),
    ]);
    dayTransactions = (transactionsRes.data ?? []) as WalletTransaction[];
    dayOrders = (ordersRes.data ?? []) as Order[];
    dayCheckins = await signedCheckins(checkins.filter((item) => item.checkin_date === date));
    dayMood = moods.find((item) => item.mood_date === date) ?? null;
    dayNote = notes.find((item) => item.note_date === date) ?? null;
  }
  const eventMatchesDate = (event: CalendarEvent, value: string) => event.repeat_type === "yearly"
    ? event.event_date.slice(5) === value.slice(5)
    : event.event_date === value;
  return {
    bounds,
    selectedDate: date,
    moods,
    notes,
    checkins,
    events,
    day: date ? {
      mood: dayMood,
      note: dayNote,
      checkins: dayCheckins,
      events: events.filter((event) => eventMatchesDate(event, date)),
      transactions: dayTransactions,
      orders: dayOrders,
    } : null,
  };
}

export async function getWishesData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("wishes").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
  return signedLifeImages((data ?? []) as Wish[]);
}

export async function getAdminWishesData() {
  await requireAdmin();
  const supabase = await createClient();
  const [wishesRes, metaRes] = await Promise.all([
    supabase.from("wishes").select("*").order("created_at", { ascending: false }),
    supabase.from("wish_admin_meta").select("*"),
  ]);
  return {
    wishes: await signedLifeImages((wishesRes.data ?? []) as Wish[]),
    meta: (metaRes.data ?? []) as WishAdminMeta[],
  };
}

export async function getAdminMoodsData() {
  await requireAdmin();
  const supabase = await createClient();
  const [moodsRes, responsesRes, profilesRes] = await Promise.all([
    supabase.from("moods").select("*").order("mood_date", { ascending: false }).limit(100),
    supabase.from("mood_responses").select("*"),
    supabase.from("profiles").select("*").order("created_at"),
  ]);
  const profiles = (profilesRes.data ?? []) as Profile[];
  const userIds = new Set(profiles.filter((profile) => profile.role === "user").map((profile) => profile.id));
  return {
    moods: ((moodsRes.data ?? []) as Mood[]).filter((mood) => userIds.has(mood.user_id)),
    responses: (responsesRes.data ?? []) as MoodResponse[],
    profiles,
  };
}

export async function getAchievementsData(userId?: string) {
  const session = userId ? await requireAdmin() : await requireUser();
  const targetId = userId ?? session.profile.id;
  const supabase = await createClient();
  await supabase.rpc("refresh_achievements", { p_user_id: targetId });
  const [definitionsRes, unlockedRes, moodsRes, checkinsRes, transactionsRes, ordersRes, eventsRes, wishesRes] = await Promise.all([
    supabase.from("achievement_definitions").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("user_achievements").select("*").eq("user_id", targetId),
    supabase.from("moods").select("id", { count: "exact", head: true }).eq("user_id", targetId),
    supabase.from("checkins").select("checkin_date,type").eq("user_id", targetId).order("checkin_date", { ascending: false }).limit(800),
    supabase.from("wallet_transactions").select("amount,direction").eq("user_id", targetId).eq("direction", "income"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", targetId).eq("status", "completed"),
    supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("created_by", targetId),
    supabase.from("wishes").select("id", { count: "exact", head: true }).eq("user_id", targetId).eq("status", "completed"),
  ]);
  const checkins = (checkinsRes.data ?? []) as Pick<Checkin, "checkin_date" | "type">[];
  const completeDates = new Set<string>();
  for (const item of checkins) {
    if (checkins.some((other) => other.checkin_date === item.checkin_date && other.type !== item.type)) completeDates.add(item.checkin_date);
  }
  let streak = 0;
  let cursor = dateInShanghai();
  while (completeDates.has(cursor)) {
    streak += 1;
    const value = new Date(`${cursor}T12:00:00+08:00`);
    value.setUTCDate(value.getUTCDate() - 1);
    cursor = value.toISOString().slice(0, 10);
  }
  const income = ((transactionsRes.data ?? []) as Pick<WalletTransaction, "amount" | "direction">[]).reduce((sum, item) => sum + item.amount, 0);
  const progress: Record<string, number> = {
    meal_streak: streak,
    mood_days: moodsRes.count ?? 0,
    coins_earned: income,
    orders_completed: ordersRes.count ?? 0,
    calendar_events: eventsRes.count ?? 0,
    wishes_completed: wishesRes.count ?? 0,
  };
  return {
    definitions: (definitionsRes.data ?? []) as AchievementDefinition[],
    unlocked: (unlockedRes.data ?? []) as UserAchievement[],
    progress,
  };
}

export async function getPlacesData() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("places").select("*").order("visit_date", { ascending: false });
  return signedLifeImages((data ?? []) as Place[]);
}

export async function getAdminMysteryData() {
  await requireAdmin();
  const supabase = await createClient();
  const [productsRes, detailsRes, ordersRes, orderDetailsRes] = await Promise.all([
    supabase.from("products").select("*").eq("product_type", "mystery").order("created_at", { ascending: false }),
    supabase.from("product_mystery_details").select("*"),
    supabase.from("orders").select("*").not("mystery_status", "is", null).order("created_at", { ascending: false }),
    supabase.from("order_mystery_details").select("*"),
  ]);
  return {
    products: (productsRes.data ?? []) as Product[],
    productDetails: (detailsRes.data ?? []) as ProductMysteryDetails[],
    orders: (ordersRes.data ?? []) as Order[],
    orderDetails: (orderDetailsRes.data ?? []) as OrderMysteryDetails[],
  };
}

export async function getOrderMysteryDetails(orderId: string) {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("order_mystery_details").select("*").eq("order_id", orderId).maybeSingle();
  return data as OrderMysteryDetails | null;
}

export async function getDailyReport(date: string) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dateInShanghai();
  const start = new Date(`${safeDate}T00:00:00+08:00`).toISOString();
  const end = new Date(new Date(`${safeDate}T00:00:00+08:00`).getTime() + 86_400_000).toISOString();
  const [moodRes, noteRes, checkinsRes, transactionsRes, ordersRes, eventsRes, wishesRes] = await Promise.all([
    supabase.from("moods").select("*").eq("user_id", profile.id).eq("mood_date", safeDate).maybeSingle(),
    supabase.from("daily_notes").select("*").eq("user_id", profile.id).eq("note_date", safeDate).maybeSingle(),
    supabase.from("checkins").select("*").eq("user_id", profile.id).eq("checkin_date", safeDate),
    supabase.from("wallet_transactions").select("*").eq("user_id", profile.id).gte("created_at", start).lt("created_at", end).order("created_at"),
    supabase.from("orders").select("*").eq("user_id", profile.id).gte("created_at", start).lt("created_at", end),
    supabase.from("calendar_events").select("*").order("event_date").limit(500),
    supabase.from("wishes").select("*").eq("user_id", profile.id).eq("status", "completed").gte("completed_at", start).lt("completed_at", end),
  ]);
  const events = ((eventsRes.data ?? []) as CalendarEvent[]).filter((event) => event.repeat_type === "yearly" ? event.event_date.slice(5) === safeDate.slice(5) : event.event_date === safeDate);
  const transactions = (transactionsRes.data ?? []) as WalletTransaction[];
  return {
    date: safeDate,
    mood: moodRes.data as Mood | null,
    note: noteRes.data as DailyNote | null,
    checkins: await signedCheckins((checkinsRes.data ?? []) as Checkin[]),
    transactions,
    income: transactions.filter((item) => item.direction === "income").reduce((sum, item) => sum + item.amount, 0),
    orders: (ordersRes.data ?? []) as Order[],
    events,
    wishes: (wishesRes.data ?? []) as Wish[],
  };
}

export async function getProfileLifeData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const [relationshipRes, walletRes] = await Promise.all([
    supabase.from("relationship_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("wallet_balances").select("*").eq("user_id", profile.id).maybeSingle(),
  ]);
  const relationship = relationshipRes.data as RelationshipSettings | null;
  return {
    relationship,
    relationshipDays: relationshipDays(relationship?.start_date ?? null),
    wallet: walletRes.data as WalletBalance | null,
  };
}
