import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getAdminPartnerCheckinData, getUserOverview } from "@/lib/data";
import {
  addDays,
  dateInShanghai,
  daysBetween,
  eventOccurrenceInYear,
  monthBounds,
  recentDates,
  relationshipDays,
  resolvePartnerProfile,
  upcomingEventMeta,
  pastEventMeta,
} from "@/lib/life";
import type {
  AchievementDefinition,
  Announcement,
  CalendarEvent,
  Checkin,
  DailyNote,
  MemoryCandidate,
  MemoryPhoto,
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

type HomeDashboardPayload = {
  profile: Profile;
  wallet: WalletBalance | null;
  checkins: Checkin[];
  products: Product[];
  announcement: Announcement | null;
  transactions: WalletTransaction[];
  today_transactions: WalletTransaction[];
  moods: Mood[];
  mood_response: MoodResponse | null;
  daily_note: DailyNote | null;
  relationship: RelationshipSettings | null;
  events: CalendarEvent[];
  wishes: Wish[];
  profiles: Profile[];
};

type CoupleHomeExtrasPayload = {
  couple_moods?: Mood[];
  couple_notes?: DailyNote[];
  couple_checkins?: Checkin[];
  goal_products?: Product[];
  memory_candidates?: MemoryCandidate[];
};

function stableIndex(seed: string, length: number) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

async function signedLifeImages<T extends { image_url: string | null }>(
  items: T[],
) {
  const paths = items
    .map((item) => item.image_url)
    .filter((path): path is string => Boolean(path));
  if (!paths.length)
    return items.map((item) => ({
      ...item,
      signed_url: null as string | null,
    }));
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("life-images")
    .createSignedUrls(paths, 3600);
  const urls = new Map(
    paths.map((path, index) => [path, data?.[index]?.signedUrl ?? null]),
  );
  return items.map((item) => ({
    ...item,
    signed_url: item.image_url ? (urls.get(item.image_url) ?? null) : null,
  }));
}

async function signedCheckins(
  items: Checkin[],
): Promise<Array<Checkin & { signed_url: string | null }>> {
  if (!items.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("checkin-images")
    .createSignedUrls(
      items.map((item) => item.image_url),
      3600,
    );
  return items.map((item, index) => ({
    ...item,
    signed_url: data?.[index]?.signedUrl ?? null,
  }));
}

export async function getRelationshipData() {
  await requireUser();
  const supabase = await createClient();
  const [settingsRes, profilesRes] = await Promise.all([
    supabase
      .from("relationship_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle(),
    supabase.from("profiles").select("*").order("created_at"),
  ]);
  const settings = settingsRes.data as RelationshipSettings | null;
  return {
    settings,
    profiles: (profilesRes.data ?? []) as Profile[],
    days: relationshipDays(settings?.start_date ?? null),
  };
}

export async function getHomeLifeData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const today = dateInShanghai();
  const trendStart = addDays(today, -6);
  const [
    moodsRes,
    noteRes,
    relationshipRes,
    eventsRes,
    wishesRes,
    recentEventsRes,
    profilesRes,
  ] = await Promise.all([
    supabase
      .from("moods")
      .select("*")
      .eq("user_id", profile.id)
      .gte("mood_date", trendStart)
      .lte("mood_date", today)
      .order("mood_date"),
    supabase
      .from("daily_notes")
      .select("*")
      .eq("user_id", profile.id)
      .eq("note_date", today)
      .maybeSingle(),
    supabase
      .from("relationship_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle(),
    supabase.from("calendar_events").select("*").order("event_date").limit(500),
    supabase
      .from("wishes")
      .select("*")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("calendar_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("profiles").select("*").order("created_at"),
  ]);
  const recentMoods = (moodsRes.data ?? []) as Mood[];
  const mood = recentMoods.find((item) => item.mood_date === today) ?? null;
  let response: MoodResponse | null = null;
  if (mood) {
    const result = await supabase
      .from("mood_responses")
      .select("*")
      .eq("mood_id", mood.id)
      .maybeSingle();
    response = result.data as MoodResponse | null;
  }
  const events = (eventsRes.data ?? []) as CalendarEvent[];
  const allUpcomingEvents = events
    .map((event) => upcomingEventMeta(event, today))
    .filter((item): item is NonNullable<ReturnType<typeof upcomingEventMeta>> =>
      Boolean(item),
    )
    .sort((a, b) => a.occurrence.localeCompare(b.occurrence));
  const latestPastEvent = events
    .map((event) => pastEventMeta(event, today))
    .filter((item): item is NonNullable<ReturnType<typeof pastEventMeta>> =>
      Boolean(item),
    )
    .sort((a, b) => b.occurrence.localeCompare(a.occurrence))[0] ?? null;
  const relationship = relationshipRes.data as RelationshipSettings | null;
  const profiles = (profilesRes.data ?? []) as Profile[];
  const partner = resolvePartnerProfile(profile, profiles, relationship);
  const nearEvents = allUpcomingEvents.filter((item) =>
    Boolean(item.reminderLevel),
  );
  return {
    mood,
    response,
    note: noteRes.data as DailyNote | null,
    relationship,
    relationshipDays: relationshipDays(relationship?.start_date ?? null, today),
    partner,
    responseFrom: response
      ? (profiles.find((item) => item.id === response.from_user_id) ?? partner)
      : null,
    recentMoods,
    trendDates: recentDates(7, today),
    upcoming: allUpcomingEvents[0] ?? null,
    latestPastEvent,
    nearEvents,
    wishes: (wishesRes.data ?? []) as Wish[],
    activities: [
      ...recentMoods.map((item) => ({
        id: `mood-${item.id}`,
        text: `记录了 ${item.mood_date} 的心情`,
        created_at: item.updated_at,
        kind: "mood",
      })),
      ...((recentEventsRes.data ?? []) as CalendarEvent[]).map((item) => ({
        id: `event-${item.id}`,
        text: `收藏了「${item.title}」`,
        created_at: item.created_at,
        kind: "event",
      })),
    ]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5),
  };
}

export async function getHomePageData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const [{ data, error }, extrasResult] = await Promise.all([
    supabase.rpc("get_home_dashboard"),
    supabase.rpc("get_couple_home_extras"),
  ]);
  if (error || !data) {
    const [overview, life, adminCheckinData] = await Promise.all([
      getUserOverview(),
      getHomeLifeData(),
      profile.role === "admin" ? getAdminPartnerCheckinData() : null,
    ]);
    const anniversaryMode =
      life.nearEvents.find((item) => item.daysAway === 0) ?? null;
    return {
      overview: {
        ...overview,
        goalProduct: null,
        goalProgress: 0,
        goalRemaining: 0,
      },
      life: {
        ...life,
        anniversaryMode,
        otherTodayEvents: life.nearEvents.filter(
          (item) =>
            item.daysAway === 0 && item.event.id !== anniversaryMode?.event.id,
        ),
        coupleMoods: life.mood ? [life.mood] : [],
        coupleNotes: life.note ? [life.note] : [],
        coupleCheckins: adminCheckinData?.todayCheckins ?? [],
        randomMemory: null,
      },
    };
  }

  const payload = data as HomeDashboardPayload;
  const extras = (extrasResult.data ?? {}) as CoupleHomeExtrasPayload;
  const today = dateInShanghai();
  const moods = payload.moods ?? [];
  const mood = moods.find((item) => item.mood_date === today) ?? null;
  const events = payload.events ?? [];
  const relationship = payload.relationship;
  const profiles = payload.profiles ?? [profile];
  const partner = resolvePartnerProfile(profile, profiles, relationship);
  const allUpcomingEvents = events
    .map((event) => upcomingEventMeta(event, today))
    .filter((item): item is NonNullable<ReturnType<typeof upcomingEventMeta>> =>
      Boolean(item),
    )
    .sort((a, b) => a.occurrence.localeCompare(b.occurrence));
  const latestPastEvent = events
    .map((event) => pastEventMeta(event, today))
    .filter((item): item is NonNullable<ReturnType<typeof pastEventMeta>> =>
      Boolean(item),
    )
    .sort((a, b) => b.occurrence.localeCompare(a.occurrence))[0] ?? null;
  const recentEvents = [...events]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);
  const todayIncome = (payload.today_transactions ?? [])
    .filter((item) => item.direction === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const coupleMoods =
    extras.couple_moods ?? moods.filter((item) => item.mood_date === today);
  const coupleNotes =
    extras.couple_notes ?? (payload.daily_note ? [payload.daily_note] : []);
  const coupleCheckins = await signedCheckins(
    extras.couple_checkins ?? payload.checkins ?? [],
  );
  const availableBalance = payload.wallet?.available_balance ?? 0;
  const goalProducts = [
    ...(extras.goal_products ?? payload.products ?? []),
  ].sort((a, b) => a.price - b.price);
  const goalProduct =
    goalProducts.find((item) => item.price >= availableBalance) ??
    goalProducts.find((item) => item.is_featured) ??
    goalProducts.at(-1) ??
    null;
  const allCandidates = extras.memory_candidates ?? [];
  const onThisDay = allCandidates.filter(
    (item) => item.memory_date.slice(5) === today.slice(5),
  );
  const candidatePool = onThisDay.length ? onThisDay : allCandidates;
  let selectedMemory = candidatePool.length
    ? candidatePool[stableIndex(`${profile.id}:${today}`, candidatePool.length)]
    : null;
  if (selectedMemory?.kind === "photo") {
    const { data: activePhoto } = await supabase
      .from("memory_photos")
      .select("id")
      .eq("id", selectedMemory.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!activePhoto) selectedMemory = null;
  }
  const [randomMemory] = selectedMemory
    ? await signedLifeImages([selectedMemory])
    : [null];
  const eventPriority = (item: (typeof allUpcomingEvents)[number]) => {
    const title = item.event.title.toLowerCase();
    if (item.event.event_type === "anniversary" && /(在一起|恋爱)/.test(title))
      return 0;
    if (/(第一次见面|初见)/.test(title)) return 1;
    if (item.event.event_type === "birthday") return 2;
    return 3;
  };
  const todayEvents = allUpcomingEvents
    .filter(
      (item) =>
        item.daysAway === 0 &&
        (item.event.repeat_type === "yearly" ||
          item.event.event_type === "anniversary"),
    )
    .sort((a, b) => eventPriority(a) - eventPriority(b));

  return {
    overview: {
      profile: payload.profile ?? profile,
      wallet: payload.wallet,
      today,
      lunchDone: (payload.checkins ?? []).some((item) => item.type === "lunch"),
      dinnerDone: (payload.checkins ?? []).some(
        (item) => item.type === "dinner",
      ),
      todayIncome,
      goalProduct,
      goalProgress: goalProduct
        ? Math.min(
            100,
            Math.floor((availableBalance / goalProduct.price) * 100),
          )
        : 0,
      goalRemaining: goalProduct
        ? Math.max(0, goalProduct.price - availableBalance)
        : 0,
      products: payload.products ?? [],
      announcement: payload.announcement,
      transactions: payload.transactions ?? [],
    },
    life: {
      mood,
      response: payload.mood_response,
      note: payload.daily_note,
      relationship,
      relationshipDays: relationshipDays(
        relationship?.start_date ?? null,
        today,
      ),
      partner,
      responseFrom: payload.mood_response
        ? (profiles.find(
            (item) => item.id === payload.mood_response?.from_user_id,
          ) ?? partner)
        : null,
      recentMoods: moods,
      trendDates: recentDates(7, today),
      upcoming: allUpcomingEvents[0] ?? null,
      latestPastEvent,
      nearEvents: allUpcomingEvents.filter((item) =>
        Boolean(item.reminderLevel),
      ),
      anniversaryMode: todayEvents[0] ?? null,
      otherTodayEvents: todayEvents.slice(1),
      coupleMoods,
      coupleNotes,
      coupleCheckins,
      randomMemory: randomMemory
        ? {
            ...randomMemory,
            daysAgo: daysBetween(randomMemory.memory_date, today),
            isOnThisDay: onThisDay.length > 0,
            owner:
              profiles.find((item) => item.id === randomMemory.user_id) ?? null,
          }
        : null,
      wishes: payload.wishes ?? [],
      activities: [
        ...moods.map((item) => ({
          id: `mood-${item.id}`,
          text: `记录了 ${item.mood_date} 的心情`,
          created_at: item.updated_at,
          kind: "mood",
        })),
        ...recentEvents.map((item) => ({
          id: `event-${item.id}`,
          text: `收藏了「${item.title}」`,
          created_at: item.created_at,
          kind: "event",
        })),
      ]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    },
  };
}

export async function getCalendarData(
  monthInput?: string,
  selectedDate?: string,
) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const bounds = monthBounds(monthInput ?? dateInShanghai().slice(0, 7));
  const today = dateInShanghai();
  const trendStart = addDays(today, -6);
  const [relationshipRes, profilesRes] = await Promise.all([
    supabase
      .from("relationship_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle(),
    supabase.from("profiles").select("*").order("created_at"),
  ]);
  const relationship = relationshipRes.data as RelationshipSettings | null;
  const profiles = (profilesRes.data ?? []) as Profile[];
  const partner = resolvePartnerProfile(profile, profiles, relationship);
  const memberIds = [profile.id, partner?.id].filter((value): value is string =>
    Boolean(value),
  );
  const date =
    selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
      ? selectedDate
      : null;
  const [moodsRes, notesRes, checkinsRes, eventsRes, recentMoodsRes] =
    await Promise.all([
      supabase
        .from("moods")
        .select("*")
        .in("user_id", memberIds)
        .gte("mood_date", bounds.start)
        .lte("mood_date", bounds.end)
        .order("mood_date"),
      supabase
        .from("daily_notes")
        .select("*")
        .in("user_id", memberIds)
        .gte("note_date", bounds.start)
        .lte("note_date", bounds.end)
        .order("note_date"),
      supabase
        .from("checkins")
        .select("*")
        .in("user_id", memberIds)
        .gte("checkin_date", bounds.start)
        .lte("checkin_date", bounds.end)
        .order("checkin_date"),
      supabase
        .from("calendar_events")
        .select("*")
        .order("event_date")
        .limit(500),
      supabase
        .from("moods")
        .select("*")
        .eq("user_id", profile.id)
        .gte("mood_date", trendStart)
        .lte("mood_date", today)
        .order("mood_date"),
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
    const end = new Date(
      new Date(`${date}T00:00:00+08:00`).getTime() + 86_400_000,
    ).toISOString();
    const [transactionsRes, ordersRes] = await Promise.all([
      supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", profile.id)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at"),
      supabase
        .from("orders")
        .select("*")
        .eq("user_id", profile.id)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at"),
    ]);
    dayTransactions = (transactionsRes.data ?? []) as WalletTransaction[];
    dayOrders = (ordersRes.data ?? []) as Order[];
    dayCheckins = await signedCheckins(
      checkins.filter((item) => item.checkin_date === date),
    );
    dayMood = moods.find((item) => item.mood_date === date) ?? null;
    dayNote = notes.find((item) => item.note_date === date) ?? null;
  }
  const eventMatchesDate = (event: CalendarEvent, value: string) =>
    event.repeat_type === "yearly"
      ? eventOccurrenceInYear(event, Number(value.slice(0, 4))) === value
      : event.event_date === value;
  const upcomingEvents = events
    .map((event) => upcomingEventMeta(event, today))
    .filter((item): item is NonNullable<ReturnType<typeof upcomingEventMeta>> =>
      Boolean(item),
    )
    .sort((a, b) => a.occurrence.localeCompare(b.occurrence));
  return {
    profile,
    bounds,
    selectedDate: date,
    moods,
    notes,
    checkins,
    events,
    members: memberIds
      .map((id) => profiles.find((item) => item.id === id))
      .filter((item): item is Profile => Boolean(item)),
    recentMoods: (recentMoodsRes.data ?? []) as Mood[],
    trendDates: recentDates(7, today),
    upcomingEvents,
    day: date
      ? {
          mood: dayMood,
          note: dayNote,
          checkins: dayCheckins,
          events: events.filter((event) => eventMatchesDate(event, date)),
          transactions: dayTransactions,
          orders: dayOrders,
        }
      : null,
  };
}

export async function getDayDetail(dateInput: string) {
  const { profile } = await requireUser();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ? dateInput
    : dateInShanghai();
  const supabase = await createClient();
  const [relationshipRes, profilesRes] = await Promise.all([
    supabase
      .from("relationship_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle(),
    supabase.from("profiles").select("*").order("created_at"),
  ]);
  const relationship = relationshipRes.data as RelationshipSettings | null;
  const profiles = (profilesRes.data ?? []) as Profile[];
  const partner = resolvePartnerProfile(profile, profiles, relationship);
  const memberIds = [profile.id, partner?.id].filter((value): value is string =>
    Boolean(value),
  );
  const start = new Date(`${date}T00:00:00+08:00`).toISOString();
  const end = new Date(
    new Date(`${date}T00:00:00+08:00`).getTime() + 86_400_000,
  ).toISOString();
  const [
    moodsRes,
    notesRes,
    checkinsRes,
    eventsRes,
    photosRes,
    transactionsRes,
    ordersRes,
    wishesRes,
    placesRes,
  ] = await Promise.all([
    supabase
      .from("moods")
      .select("*")
      .in("user_id", memberIds)
      .eq("mood_date", date),
    supabase
      .from("daily_notes")
      .select("*")
      .in("user_id", memberIds)
      .eq("note_date", date),
    supabase
      .from("checkins")
      .select("*")
      .in("user_id", memberIds)
      .eq("checkin_date", date)
      .order("created_at"),
    supabase.from("calendar_events").select("*").order("event_date").limit(500),
    supabase
      .from("memory_photos")
      .select("*")
      .in("user_id", memberIds)
      .is("deleted_at", null)
      .eq("photo_date", date)
      .order("created_at"),
    supabase
      .from("wallet_transactions")
      .select("*")
      .in("user_id", memberIds)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at"),
    supabase
      .from("orders")
      .select("*")
      .in("user_id", memberIds)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at"),
    supabase
      .from("wishes")
      .select("*")
      .in("user_id", memberIds)
      .eq("status", "completed")
      .gte("completed_at", start)
      .lt("completed_at", end),
    supabase
      .from("places")
      .select("*")
      .in("created_by", memberIds)
      .is("deleted_at", null)
      .eq("visit_date", date),
  ]);
  const checkins = await signedCheckins((checkinsRes.data ?? []) as Checkin[]);
  const photos = await signedLifeImages(
    (photosRes.data ?? []) as MemoryPhoto[],
  );
  const events = ((eventsRes.data ?? []) as CalendarEvent[]).filter((event) =>
    event.repeat_type === "yearly"
      ? eventOccurrenceInYear(event, Number(date.slice(0, 4))) === date
      : event.event_date === date,
  );
  return {
    date,
    profile,
    partner,
    members: memberIds
      .map((id) => profiles.find((item) => item.id === id))
      .filter((item): item is Profile => Boolean(item)),
    moods: (moodsRes.data ?? []) as Mood[],
    notes: (notesRes.data ?? []) as DailyNote[],
    checkins,
    events,
    photos,
    transactions: (transactionsRes.data ?? []) as WalletTransaction[],
    orders: (ordersRes.data ?? []) as Order[],
    wishes: (wishesRes.data ?? []) as Wish[],
    places: (placesRes.data ?? []) as Place[],
  };
}

export async function getStoryData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const [relationshipRes, profilesRes, eventsRes, photosRes] =
    await Promise.all([
      supabase
        .from("relationship_settings")
        .select("*")
        .eq("id", true)
        .maybeSingle(),
      supabase.from("profiles").select("*").order("created_at"),
      supabase
        .from("calendar_events")
        .select("*")
        .eq("is_story_event", true)
        .order("event_date"),
      supabase.from("memory_photos").select("*").is("deleted_at", null).order("photo_date").limit(300),
    ]);
  const relationship = relationshipRes.data as RelationshipSettings | null;
  const profiles = (profilesRes.data ?? []) as Profile[];
  const partner = resolvePartnerProfile(profile, profiles, relationship);
  const memberIds = new Set([profile.id, partner?.id].filter(Boolean));
  const photos = await signedLifeImages(
    ((photosRes.data ?? []) as MemoryPhoto[]).filter((photo) =>
      memberIds.has(photo.user_id),
    ),
  );
  return {
    relationship,
    relationshipDays: relationshipDays(relationship?.start_date ?? null),
    events: (eventsRes.data ?? []) as CalendarEvent[],
    photos,
  };
}

export async function getWishesData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("wishes")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  return signedLifeImages((data ?? []) as Wish[]);
}

export async function getAdminWishesData() {
  await requireAdmin();
  const supabase = await createClient();
  const [wishesRes, metaRes] = await Promise.all([
    supabase
      .from("wishes")
      .select("*")
      .order("created_at", { ascending: false }),
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
    supabase
      .from("moods")
      .select("*")
      .order("mood_date", { ascending: false })
      .limit(100),
    supabase.from("mood_responses").select("*"),
    supabase.from("profiles").select("*").order("created_at"),
  ]);
  const profiles = (profilesRes.data ?? []) as Profile[];
  const userIds = new Set(
    profiles
      .filter((profile) => profile.role === "user")
      .map((profile) => profile.id),
  );
  return {
    moods: ((moodsRes.data ?? []) as Mood[]).filter((mood) =>
      userIds.has(mood.user_id),
    ),
    responses: (responsesRes.data ?? []) as MoodResponse[],
    profiles,
  };
}

export async function getAchievementsData(userId?: string) {
  const session = userId ? await requireAdmin() : await requireUser();
  const targetId = userId ?? session.profile.id;
  const supabase = await createClient();
  await supabase.rpc("refresh_achievements", { p_user_id: targetId });
  const [
    definitionsRes,
    unlockedRes,
    moodsRes,
    checkinsRes,
    transactionsRes,
    ordersRes,
    eventsRes,
    wishesRes,
  ] = await Promise.all([
    supabase
      .from("achievement_definitions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("user_achievements").select("*").eq("user_id", targetId),
    supabase
      .from("moods")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetId),
    supabase
      .from("checkins")
      .select("checkin_date,type,checkin_kind")
      .eq("user_id", targetId)
      .order("checkin_date", { ascending: false })
      .limit(800),
    supabase
      .from("wallet_transactions")
      .select("amount,direction")
      .eq("user_id", targetId)
      .eq("direction", "income"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetId)
      .eq("status", "completed"),
    supabase
      .from("calendar_events")
      .select("id", { count: "exact", head: true })
      .eq("created_by", targetId),
    supabase
      .from("wishes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetId)
      .eq("status", "completed"),
  ]);
  const checkins = (checkinsRes.data ?? []) as Pick<
    Checkin,
    "checkin_date" | "type" | "checkin_kind"
  >[];
  const completeDates = new Set<string>();
  for (const item of checkins) {
    if (item.checkin_kind === "makeup") continue;
    if (
      checkins.some(
        (other) =>
          other.checkin_date === item.checkin_date &&
          other.type !== item.type &&
          other.checkin_kind !== "makeup",
      )
    )
      completeDates.add(item.checkin_date);
  }
  let streak = 0;
  let cursor = dateInShanghai();
  while (completeDates.has(cursor)) {
    streak += 1;
    const value = new Date(`${cursor}T12:00:00+08:00`);
    value.setUTCDate(value.getUTCDate() - 1);
    cursor = value.toISOString().slice(0, 10);
  }
  const income = (
    (transactionsRes.data ?? []) as Pick<
      WalletTransaction,
      "amount" | "direction"
    >[]
  ).reduce((sum, item) => sum + item.amount, 0);
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
  const { data } = await supabase
    .from("places")
    .select("*")
    .is("deleted_at", null)
    .order("visit_date", { ascending: false });
  return signedLifeImages((data ?? []) as Place[]);
}

export async function getRecentlyDeletedData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const [photosRes, placesRes] = await Promise.all([
    supabase
      .from("memory_photos")
      .select("*")
      .eq("user_id", profile.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("places")
      .select("*")
      .eq("created_by", profile.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);
  const photos = await signedLifeImages((photosRes.data ?? []) as MemoryPhoto[]);
  const places = await signedLifeImages((placesRes.data ?? []) as Place[]);
  return [
    ...photos.map((item) => ({
      id: item.id,
      type: "memory" as const,
      title: item.caption || "生活照片",
      originalDate: item.photo_date,
      deletedAt: item.deleted_at!,
      signedUrl: item.signed_url,
    })),
    ...places.map((item) => ({
      id: item.id,
      type: "place" as const,
      title: `${item.title} · ${item.place_name}`,
      originalDate: item.visit_date,
      deletedAt: item.deleted_at!,
      signedUrl: item.signed_url,
    })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function getAdminMysteryData() {
  await requireAdmin();
  const supabase = await createClient();
  const [productsRes, detailsRes, ordersRes, orderDetailsRes] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("product_type", "mystery")
        .order("created_at", { ascending: false }),
      supabase.from("product_mystery_details").select("*"),
      supabase
        .from("orders")
        .select("*")
        .not("mystery_status", "is", null)
        .order("created_at", { ascending: false }),
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
  const { data } = await supabase
    .from("order_mystery_details")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  return data as OrderMysteryDetails | null;
}

export async function getDailyReport(date: string) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dateInShanghai();
  const start = new Date(`${safeDate}T00:00:00+08:00`).toISOString();
  const end = new Date(
    new Date(`${safeDate}T00:00:00+08:00`).getTime() + 86_400_000,
  ).toISOString();
  const [
    moodRes,
    noteRes,
    checkinsRes,
    transactionsRes,
    ordersRes,
    eventsRes,
    wishesRes,
  ] = await Promise.all([
    supabase
      .from("moods")
      .select("*")
      .eq("user_id", profile.id)
      .eq("mood_date", safeDate)
      .maybeSingle(),
    supabase
      .from("daily_notes")
      .select("*")
      .eq("user_id", profile.id)
      .eq("note_date", safeDate)
      .maybeSingle(),
    supabase
      .from("checkins")
      .select("*")
      .eq("user_id", profile.id)
      .eq("checkin_date", safeDate),
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", profile.id)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at"),
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", profile.id)
      .gte("created_at", start)
      .lt("created_at", end),
    supabase.from("calendar_events").select("*").order("event_date").limit(500),
    supabase
      .from("wishes")
      .select("*")
      .eq("user_id", profile.id)
      .eq("status", "completed")
      .gte("completed_at", start)
      .lt("completed_at", end),
  ]);
  const events = ((eventsRes.data ?? []) as CalendarEvent[]).filter((event) =>
    event.repeat_type === "yearly"
      ? eventOccurrenceInYear(event, Number(safeDate.slice(0, 4))) === safeDate
      : event.event_date === safeDate,
  );
  const transactions = (transactionsRes.data ?? []) as WalletTransaction[];
  return {
    date: safeDate,
    mood: moodRes.data as Mood | null,
    note: noteRes.data as DailyNote | null,
    checkins: await signedCheckins((checkinsRes.data ?? []) as Checkin[]),
    transactions,
    income: transactions
      .filter((item) => item.direction === "income")
      .reduce((sum, item) => sum + item.amount, 0),
    orders: (ordersRes.data ?? []) as Order[],
    events,
    wishes: (wishesRes.data ?? []) as Wish[],
  };
}

export async function getProfileLifeData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const [relationshipRes, walletRes] = await Promise.all([
    supabase
      .from("relationship_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("wallet_balances")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle(),
  ]);
  const relationship = relationshipRes.data as RelationshipSettings | null;
  return {
    relationship,
    relationshipDays: relationshipDays(relationship?.start_date ?? null),
    wallet: walletRes.data as WalletBalance | null,
  };
}
