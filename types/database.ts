export type UserRole = "admin" | "user";
export type CheckinType = "lunch" | "dinner";
export type ProductStatus = "active" | "inactive" | "sold_out";
export type ProductCategory = "food" | "date" | "gift" | "game" | "special" | "other";
export type OrderStatus = "pending" | "approved" | "rejected" | "pending_fulfillment" | "completed" | "cancelled";

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
