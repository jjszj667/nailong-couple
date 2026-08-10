export type UserRole = "admin" | "user";
export type CheckinType = "lunch" | "dinner";
export type ProductStatus = "active" | "inactive" | "sold_out";
export type ProductCategory =
  "food" | "date" | "gift" | "game" | "special" | "other";
export type ProductType = "normal" | "mystery";
export type OrderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "pending_fulfillment"
  | "completed"
  | "cancelled";
export type MoodValue =
  | "very_unpleasant"
  | "unpleasant"
  | "slightly_unpleasant"
  | "neutral"
  | "slightly_pleasant"
  | "pleasant"
  | "very_pleasant";
export type EventRepeatType = "none" | "yearly";
export type WishCategory =
  "food" | "travel" | "gift" | "activity" | "movie" | "other";
export type WishStatus = "active" | "completed" | "archived";
export type MysteryOrderStatus = "preparing" | "ready" | "revealed";
export type MemoryPhotoCategory =
  | "daily"
  | "date"
  | "travel"
  | "food"
  | "gift"
  | "selfie"
  | "scenery"
  | "special"
  | "other";

export type Profile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type WalletBalance = {
  user_id: string;
  available_balance: number;
  frozen_balance: number;
  updated_at: string;
};

export type WalletTransaction = {
  id: string;
  user_id: string;
  amount: number;
  direction: "income" | "expense" | "freeze" | "unfreeze";
  type: string;
  reason: string;
  before_balance: number;
  after_balance: number;
  before_frozen_balance: number;
  after_frozen_balance: number;
  related_order_id: string | null;
  related_checkin_id: string | null;
  operator_id: string | null;
  note: string | null;
  created_at: string;
};

export type Checkin = {
  id: string;
  user_id: string;
  type: CheckinType;
  checkin_date: string;
  image_url: string;
  reward_amount: number;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  price: number;
  stock: number;
  category: ProductCategory;
  status: ProductStatus;
  is_hidden: boolean;
  is_featured: boolean;
  product_type: ProductType;
  mystery_hint: string;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  product_id: string;
  product_name_snapshot: string;
  price_snapshot: number;
  status: OrderStatus;
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
  updated_at: string;
  mystery_status: MysteryOrderStatus | null;
  revealed_at: string | null;
};

export type OrderEvent = {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  operator_id: string;
  note: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SystemSetting = {
  key: string;
  value: number;
  label: string;
  description: string | null;
  updated_at: string;
};

export type ActionState = { ok: boolean; message: string };

export type RelationshipSettings = {
  id: boolean;
  title: string;
  start_date: string | null;
  partner_a_id: string | null;
  partner_b_id: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type Mood = {
  id: string;
  user_id: string;
  mood_date: string;
  value: MoodValue;
  tags: string[];
  note: string;
  created_at: string;
  updated_at: string;
};

export type MoodResponse = {
  id: string;
  mood_id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  coin_reward: number;
  reward_transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyNote = {
  id: string;
  user_id: string;
  note_date: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  note: string;
  repeat_type: EventRepeatType;
  is_story_event: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type MemoryPhoto = {
  id: string;
  user_id: string;
  photo_date: string;
  image_url: string;
  caption: string;
  category: MemoryPhotoCategory;
  created_at: string;
  updated_at: string;
};

export type MemoryCandidate = {
  id: string;
  memory_date: string;
  kind: "photo" | "note" | "mood" | "event" | "place";
  title: string;
  body: string;
  image_url: string | null;
  user_id: string;
};

export type Wish = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: WishCategory;
  status: WishStatus;
  image_url: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WishAdminMeta = {
  wish_id: string;
  status: "not_started" | "preparing" | "ready";
  secret_note: string;
  updated_at: string;
  updated_by: string;
};

export type ProductMysteryDetails = {
  product_id: string;
  surprise_title: string;
  surprise_content: string;
  reveal_image_url: string | null;
  updated_at: string;
  updated_by: string;
};

export type OrderMysteryDetails = {
  order_id: string;
  surprise_title: string;
  surprise_content: string;
  reveal_image_url: string | null;
  admin_message: string;
  prepared_at: string;
  prepared_by: string;
  revealed_at: string | null;
};

export type AchievementDefinition = {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  metric: string;
  target: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
};

export type Place = {
  id: string;
  title: string;
  place_name: string;
  visit_date: string;
  description: string;
  image_url: string | null;
  place_type: string;
  latitude: number | null;
  longitude: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
