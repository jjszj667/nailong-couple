import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { resolvePartnerProfile } from "@/lib/life";
import { getPublicImageUrl, SHANGHAI_TIME_ZONE } from "@/lib/utils";
import type {
  Announcement,
  Checkin,
  Order,
  OrderEvent,
  Product,
  ProductMysteryDetails,
  Profile,
  RelationshipSettings,
  SystemSetting,
  WalletBalance,
  WalletTransaction,
} from "@/types/database";

export function shanghaiToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function calculateStreak(checkins: Checkin[], today: string) {
  const counts = new Map<string, Set<string>>();
  for (const item of checkins) {
    const set = counts.get(item.checkin_date) ?? new Set<string>();
    set.add(item.type);
    counts.set(item.checkin_date, set);
  }
  let cursor = new Date(`${today}T12:00:00+08:00`);
  let streak = 0;
  while (counts.get(cursor.toISOString().slice(0, 10))?.size === 2) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}

async function signCheckinImages(checkins: Checkin[]) {
  if (!checkins.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("checkin-images")
    .createSignedUrls(
      checkins.map((item) => item.image_url),
      3600,
    );
  return checkins.map((item, index) => ({
    ...item,
    signed_url: data?.[index]?.signedUrl ?? null,
  }));
}

export async function getUserOverview() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const today = shanghaiToday();
  const monthStart = `${today.slice(0, 7)}-01`;
  const historyStart = new Date(
    new Date(`${today}T12:00:00+08:00`).getTime() - 400 * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const todayStartUtc = new Date(`${today}T00:00:00+08:00`).toISOString();
  const tomorrowStartUtc = new Date(
    new Date(`${today}T00:00:00+08:00`).getTime() + 86_400_000,
  ).toISOString();

  const [
    walletRes,
    checkinsRes,
    productsRes,
    announcementRes,
    transactionsRes,
    todayTransactionsRes,
    ordersRes,
  ] = await Promise.all([
    supabase
      .from("wallet_balances")
      .select("*")
      .eq("user_id", profile.id)
      .single(),
    supabase
      .from("checkins")
      .select("*")
      .eq("user_id", profile.id)
      .gte("checkin_date", historyStart)
      .order("checkin_date", { ascending: false }),
    supabase
      .from("products")
      .select("*")
      .eq("is_featured", true)
      .eq("is_hidden", false)
      .neq("status", "inactive")
      .order("price")
      .limit(4),
    supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", profile.id)
      .gte("created_at", todayStartUtc)
      .lt("created_at", tomorrowStartUtc)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const wallet = walletRes.data as WalletBalance | null;
  const checkins = (checkinsRes.data ?? []) as Checkin[];
  const todayItems = checkins.filter((item) => item.checkin_date === today);
  const monthItems = checkins.filter((item) => item.checkin_date >= monthStart);
  const todayIncome = ((todayTransactionsRes.data ?? []) as WalletTransaction[])
    .filter((item) => item.direction === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    profile,
    wallet,
    today,
    lunchDone: todayItems.some((item) => item.type === "lunch"),
    dinnerDone: todayItems.some((item) => item.type === "dinner"),
    todayIncome,
    streak: calculateStreak(checkins, today),
    monthCompleteDays: new Set(
      monthItems
        .map((item) => item.checkin_date)
        .filter(
          (date) =>
            monthItems.filter((item) => item.checkin_date === date).length ===
            2,
        ),
    ).size,
    products: (productsRes.data ?? []) as Product[],
    announcement: announcementRes.data as Announcement | null,
    transactions: (transactionsRes.data ?? []) as WalletTransaction[],
    orders: (ordersRes.data ?? []) as Order[],
  };
}

export async function getCheckinPageData() {
  const overview = await getUserOverview();
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("*")
    .in("key", ["lunch_reward", "dinner_reward", "daily_complete_reward"]);
  return { ...overview, settings: (data ?? []) as SystemSetting[] };
}

export async function getShopData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const [walletRes, productsRes] = await Promise.all([
    supabase
      .from("wallet_balances")
      .select("*")
      .eq("user_id", profile.id)
      .single(),
    supabase
      .from("products")
      .select("*")
      .eq("is_hidden", false)
      .neq("status", "inactive")
      .order("is_featured", { ascending: false })
      .order("price"),
  ]);
  return {
    wallet: walletRes.data as WalletBalance | null,
    products: (productsRes.data ?? []) as Product[],
  };
}

export async function getProduct(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Product | null;
}

export async function getOrders(limit?: number) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data ?? []) as Order[];
}

export async function getOrder(id: string) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const [orderRes, transactionsRes, relationshipRes, profilesRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", profile.id)
        .maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select("*")
        .eq("related_order_id", id)
        .eq("user_id", profile.id)
        .order("created_at"),
      supabase
        .from("relationship_settings")
        .select("*")
        .eq("id", true)
        .maybeSingle(),
      supabase.from("profiles").select("*").order("created_at"),
    ]);
  const relationship = relationshipRes.data as RelationshipSettings | null;
  return {
    order: orderRes.data as Order | null,
    transactions: (transactionsRes.data ?? []) as WalletTransaction[],
    partner: resolvePartnerProfile(
      profile,
      (profilesRes.data ?? []) as Profile[],
      relationship,
    ),
  };
}

export async function getWalletData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const [walletRes, transactionsRes, relationshipRes, profilesRes] =
    await Promise.all([
      supabase
        .from("wallet_balances")
        .select("*")
        .eq("user_id", profile.id)
        .single(),
      supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("relationship_settings")
        .select("*")
        .eq("id", true)
        .maybeSingle(),
      supabase.from("profiles").select("*").order("created_at"),
    ]);
  const relationship = relationshipRes.data as RelationshipSettings | null;
  return {
    wallet: walletRes.data as WalletBalance | null,
    transactions: (transactionsRes.data ?? []) as WalletTransaction[],
    partner: resolvePartnerProfile(
      profile,
      (profilesRes.data ?? []) as Profile[],
      relationship,
    ),
  };
}

export async function getMemoriesData(date?: string) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  let query = supabase
    .from("checkins")
    .select("*")
    .eq("user_id", profile.id)
    .order("checkin_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(120);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date))
    query = query.eq("checkin_date", date);
  const { data } = await query;
  return signCheckinImages((data ?? []) as Checkin[]);
}

export async function getProfileData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const [checkinsRes, transactionsRes, ordersRes] = await Promise.all([
    supabase
      .from("checkins")
      .select("*")
      .eq("user_id", profile.id)
      .order("checkin_date", { ascending: false }),
    supabase.from("wallet_transactions").select("*").eq("user_id", profile.id),
    supabase.from("orders").select("*").eq("user_id", profile.id),
  ]);
  const checkins = (checkinsRes.data ?? []) as Checkin[];
  const transactions = (transactionsRes.data ?? []) as WalletTransaction[];
  return {
    profile,
    avatarUrl: getPublicImageUrl("avatars", profile.avatar_url),
    totalCheckins: checkins.length,
    streak: calculateStreak(checkins, shanghaiToday()),
    totalEarned: transactions
      .filter((item) => item.direction === "income")
      .reduce((sum, item) => sum + item.amount, 0),
    totalSpent: Math.abs(
      transactions
        .filter((item) => item.direction === "expense")
        .reduce((sum, item) => sum + item.amount, 0),
    ),
    totalOrders: (ordersRes.data ?? []).length,
  };
}

export async function getAdminDashboard() {
  await requireAdmin();
  const supabase = await createClient();
  const [profilesRes, walletsRes, checkinsRes, ordersRes, transactionsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "user")
        .order("created_at")
        .limit(1),
      supabase.from("wallet_balances").select("*"),
      supabase
        .from("checkins")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
  const user = ((profilesRes.data ?? []) as Profile[])[0] ?? null;
  const wallets = (walletsRes.data ?? []) as WalletBalance[];
  const wallet = user
    ? (wallets.find((item) => item.user_id === user.id) ?? null)
    : null;
  const checkins = (checkinsRes.data ?? []) as Checkin[];
  const userCheckins = user
    ? checkins.filter((item) => item.user_id === user.id)
    : [];
  const orders = (ordersRes.data ?? []) as Order[];
  const transactions = (transactionsRes.data ?? []) as WalletTransaction[];
  const today = shanghaiToday();
  const monthPrefix = today.slice(0, 7);
  return {
    user,
    wallet,
    streak: calculateStreak(userCheckins, today),
    monthCompleteDays: new Set(
      userCheckins
        .filter((item) => item.checkin_date.startsWith(monthPrefix))
        .map((item) => item.checkin_date)
        .filter(
          (date) =>
            userCheckins.filter((item) => item.checkin_date === date).length ===
            2,
        ),
    ).size,
    lunchCount: userCheckins.filter((item) => item.type === "lunch").length,
    dinnerCount: userCheckins.filter((item) => item.type === "dinner").length,
    totalGranted: transactions
      .filter((item) => item.direction === "income")
      .reduce((sum, item) => sum + item.amount, 0),
    totalSpent: Math.abs(
      transactions
        .filter((item) => item.direction === "expense")
        .reduce((sum, item) => sum + item.amount, 0),
    ),
    pendingOrders: orders.filter((item) => item.status === "pending").length,
    orderCount: orders.length,
    recentCheckins: await signCheckinImages(checkins.slice(0, 6)),
    recentOrders: orders.slice(0, 6),
  };
}

export async function getAdminProducts() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Product[];
}

export async function getAdminProduct(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Product | null;
}

export async function getAdminProductMysteryDetails(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_mystery_details")
    .select("*")
    .eq("product_id", id)
    .maybeSingle();
  return data as ProductMysteryDetails | null;
}

export async function getAdminOrders() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Order[];
}

export async function getAdminOrder(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const [orderRes, eventsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("order_events")
      .select("*")
      .eq("order_id", id)
      .order("created_at"),
  ]);
  return {
    order: orderRes.data as Order | null,
    events: (eventsRes.data ?? []) as OrderEvent[],
  };
}

export async function getAdminWalletData() {
  await requireAdmin();
  const supabase = await createClient();
  const [profilesRes, walletsRes, transactionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "user")
      .order("created_at"),
    supabase.from("wallet_balances").select("*"),
    supabase
      .from("wallet_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return {
    profiles: (profilesRes.data ?? []) as Profile[],
    wallets: (walletsRes.data ?? []) as WalletBalance[],
    transactions: (transactionsRes.data ?? []) as WalletTransaction[],
  };
}

export async function getAdminCheckins() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkins")
    .select("*")
    .order("checkin_date", { ascending: false })
    .limit(200);
  return signCheckinImages((data ?? []) as Checkin[]);
}

export async function getAdminAnnouncements() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Announcement[];
}

export async function getAdminSettings() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("*")
    .order("key");
  return (data ?? []) as SystemSetting[];
}
