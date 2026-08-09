"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getCheckinWindow } from "@/lib/checkin-windows";
import type { CheckinType, ProductCategory, ProductStatus } from "@/types/database";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 5 * 1024 * 1024;

function target(path: string, kind: "ok" | "error", message: string) {
  return `${path}?${kind}=${encodeURIComponent(message)}`;
}

function errorText(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  if (["请选择一张照片。", "只支持 JPG、PNG 或 WebP 图片。", "图片不能超过 5MB。"].includes(raw)) return raw;
  const map: Record<string, string> = {
    ALREADY_CHECKED_IN: "今天的这顿饭已经打过卡啦～",
    INSUFFICIENT_BALANCE: "奶龙币还不够，再攒一点吧。",
    INVALID_FROZEN_BALANCE: "冻结余额状态不正确，请刷新后再试。",
    PRODUCT_UNAVAILABLE: "这个奖励已经下架啦。",
    OUT_OF_STOCK: "这个奖励已经被兑换完啦。",
    ORDER_CANNOT_CANCEL: "这个兑换已经由管理员处理，不能取消啦。",
    ORDER_ALREADY_PROCESSED: "这笔兑换已经处理过啦。",
    ORDER_NOT_READY: "这笔兑换还没到可以完成的状态。",
    ADMIN_REQUIRED: "只有管理员可以进行这项操作。",
    REASON_REQUIRED: "请填写清楚调整奶龙币的原因。",
    AMOUNT_CANNOT_BE_ZERO: "调整数量不能为 0。",
    INVALID_IMAGE_PATH: "照片路径校验失败，请重新上传。",
    CHECKIN_WINDOW_CLOSED_LUNCH: "午间签到只在每天 11:00–13:00 开放。",
    CHECKIN_WINDOW_CLOSED_DINNER: "晚间签到只在每天 16:00–22:00 开放。",
  };
  return Object.entries(map).find(([key]) => raw.includes(key))?.[1] ?? "操作没有成功，请稍后再试。";
}

function validateImage(file: File) {
  if (!file || file.size === 0) throw new Error("请选择一张照片。");
  if (!imageTypes.has(file.type)) throw new Error("只支持 JPG、PNG 或 WebP 图片。");
  if (file.size > maxImageSize) throw new Error("图片不能超过 5MB。");
}

function extensionFor(file: File) {
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

export async function loginAction(formData: FormData) {
  const parsed = z.object({ email: z.email(), password: z.string().min(6) }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect(target("/login", "error", "请填写正确的邮箱和密码。"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(target("/login", "error", "邮箱或密码不正确，请再试一次。"));
  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function submitCheckinAction(formData: FormData) {
  const { profile } = await requireUser();
  const type = formData.get("type");
  const file = formData.get("image");
  const requestId = z.uuid().safeParse(formData.get("request_id"));
  if ((type !== "lunch" && type !== "dinner") || !(file instanceof File) || !requestId.success) {
    redirect(target("/checkin", "error", "签到信息不完整，请重新选择。"));
  }

  try {
    const checkinType = type as CheckinType;
    const window = getCheckinWindow(checkinType);
    if (!window.isOpen) {
      throw new Error(checkinType === "lunch" ? "CHECKIN_WINDOW_CLOSED_LUNCH" : "CHECKIN_WINDOW_CLOSED_DINNER");
    }
    validateImage(file);
    const supabase = await createClient();
    const path = `${profile.id}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const { error: uploadError } = await supabase.storage.from("checkin-images").upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });
    if (uploadError) throw uploadError;

    const { error } = await supabase.rpc("submit_checkin", {
      p_type: checkinType,
      p_image_url: path,
      p_request_id: requestId.data,
    });
    if (error) throw error;
  } catch (error) {
    redirect(target("/checkin", "error", errorText(error)));
  }
  revalidatePath("/");
  revalidatePath("/checkin");
  redirect(target("/checkin", "ok", "今日份好好吃饭任务完成，奶龙币到账啦！"));
}

export async function redeemAction(formData: FormData) {
  await requireUser();
  const id = z.uuid().safeParse(formData.get("product_id"));
  const requestId = z.uuid().safeParse(formData.get("request_id"));
  if (!id.success || !requestId.success) redirect(target("/shop", "error", "没有找到这个奖励。"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_redemption", {
    p_product_id: id.data,
    p_request_id: requestId.data,
  });
  if (error) redirect(target(`/shop/${id.data}`, "error", errorText(error)));
  revalidatePath("/");
  revalidatePath("/orders");
  redirect(target("/orders", "ok", "兑换申请已经偷偷送到管理员那里啦。"));
}

export async function cancelOrderAction(formData: FormData) {
  await requireUser();
  const id = z.uuid().safeParse(formData.get("order_id"));
  if (!id.success) redirect(target("/orders", "error", "没有找到这笔兑换。"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_redemption", { p_order_id: id.data });
  if (error) redirect(target(`/orders/${id.data}`, "error", errorText(error)));
  revalidatePath("/");
  revalidatePath("/wallet");
  redirect(target("/orders", "ok", "兑换已取消，冻结的奶龙币已经回来啦。"));
}

export async function updateProfileAction(formData: FormData) {
  const { profile } = await requireUser();
  const nickname = z.string().trim().min(1).max(30).safeParse(formData.get("nickname"));
  if (!nickname.success) redirect(target("/profile", "error", "昵称需要是 1～30 个字。"));
  const supabase = await createClient();
  let avatarPath = profile.avatar_url;
  const file = formData.get("avatar");
  try {
    if (file instanceof File && file.size > 0) {
      validateImage(file);
      avatarPath = `${profile.id}/${crypto.randomUUID()}.${extensionFor(file)}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(avatarPath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
    }
    const { error } = await supabase.from("profiles").update({ nickname: nickname.data, avatar_url: avatarPath }).eq("id", profile.id);
    if (error) throw error;
  } catch (error) {
    redirect(target("/profile", "error", errorText(error)));
  }
  revalidatePath("/", "layout");
  redirect(target("/profile", "ok", "个人资料已经更新啦。"));
}

const productSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]).optional(),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(1000),
  price: z.coerce.number().int().positive(),
  stock: z.coerce.number().int().nonnegative(),
  category: z.enum(["food", "date", "gift", "game", "special", "other"]),
  status: z.enum(["active", "inactive", "sold_out"]),
});

export async function saveProductAction(formData: FormData) {
  await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(target("/admin/products", "error", "请检查商品名称、价格、库存和分类。"));
  const supabase = await createClient();
  const id = parsed.data.id || null;
  let imagePath = String(formData.get("existing_image") || "") || null;
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) {
      validateImage(file);
      imagePath = `products/${crypto.randomUUID()}.${extensionFor(file)}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(imagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
    }
    const payload = {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      stock: parsed.data.stock,
      category: parsed.data.category as ProductCategory,
      status: parsed.data.status as ProductStatus,
      image_url: imagePath,
      is_hidden: formData.get("is_hidden") === "on",
      is_featured: formData.get("is_featured") === "on",
    };
    const result = id
      ? await supabase.from("products").update(payload).eq("id", id)
      : await supabase.from("products").insert(payload);
    if (result.error) throw result.error;
  } catch (error) {
    redirect(target(id ? `/admin/products/${id}` : "/admin/products/new", "error", errorText(error)));
  }
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  redirect(target("/admin/products", "ok", id ? "商品已经更新。" : "新奖励已经上架。"));
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("product_id"));
  if (!id.success) redirect(target("/admin/products", "error", "商品编号无效。"));
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id.data);
  if (error) redirect(target("/admin/products", "error", "已有历史订单的商品不能删除，可以改为下架或隐藏。"));
  revalidatePath("/shop");
  redirect(target("/admin/products", "ok", "商品已经删除。"));
}

export async function processOrderAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), action: z.enum(["approve", "reject", "complete"]), note: z.string().max(1000) }).safeParse({
    id: formData.get("order_id"), action: formData.get("action"), note: formData.get("note") || "",
  });
  if (!parsed.success) redirect(target("/admin/orders", "error", "订单操作参数不正确。"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_process_order", {
    p_order_id: parsed.data.id,
    p_action: parsed.data.action,
    p_note: parsed.data.note || null,
  });
  if (error) redirect(target(`/admin/orders/${parsed.data.id}`, "error", errorText(error)));
  revalidatePath("/", "layout");
  redirect(target(`/admin/orders/${parsed.data.id}`, "ok", "订单状态已经更新。"));
}

export async function adjustWalletAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ userId: z.uuid(), amount: z.coerce.number().int().refine((value) => value !== 0), reason: z.string().trim().min(2).max(100), note: z.string().trim().max(500) }).safeParse({
    userId: formData.get("user_id"), amount: formData.get("amount"), reason: formData.get("reason"), note: formData.get("note") || "",
  });
  if (!parsed.success) redirect(target("/admin/wallet", "error", "请输入非零整数数量，并填写调整原因。"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_adjust_wallet", {
    p_user_id: parsed.data.userId,
    p_amount: parsed.data.amount,
    p_reason: parsed.data.reason,
    p_note: parsed.data.note || null,
  });
  if (error) redirect(target("/admin/wallet", "error", errorText(error)));
  revalidatePath("/", "layout");
  redirect(target("/admin/wallet", "ok", "奶龙币和对应流水已经一起更新。"));
}

export async function saveAnnouncementAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ title: z.string().trim().min(1).max(80), content: z.string().trim().min(1).max(1000) }).safeParse({
    title: formData.get("title"), content: formData.get("content"),
  });
  if (!parsed.success) redirect(target("/admin/announcements", "error", "标题和留言内容不能为空。"));
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ ...parsed.data, is_active: true });
  if (error) redirect(target("/admin/announcements", "error", errorText(error)));
  revalidatePath("/");
  redirect(target("/admin/announcements", "ok", "新的小纸条已经发布。"));
}

export async function toggleAnnouncementAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), active: z.enum(["true", "false"]) }).safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) redirect(target("/admin/announcements", "error", "留言参数不正确。"));
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").update({ is_active: parsed.data.active === "true" }).eq("id", parsed.data.id);
  if (error) redirect(target("/admin/announcements", "error", errorText(error)));
  revalidatePath("/");
  redirect(target("/admin/announcements", "ok", "留言状态已经更新。"));
}

export async function updateSettingsAction(formData: FormData) {
  await requireAdmin();
  const keys = ["lunch_reward", "dinner_reward", "daily_complete_reward", "streak_7_reward", "streak_30_reward"];
  const updates = keys.map((key) => ({ key, value: Number(formData.get(key)) }));
  if (updates.some((item) => !Number.isInteger(item.value) || item.value < 0)) {
    redirect(target("/admin/settings", "error", "奖励数量必须是大于等于 0 的整数。"));
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_settings", {
    p_settings: Object.fromEntries(updates.map((item) => [item.key, item.value])),
  });
  if (error) redirect(target("/admin/settings", "error", errorText(error)));
  revalidatePath("/", "layout");
  redirect(target("/admin/settings", "ok", "签到奖励规则已经生效。"));
}
