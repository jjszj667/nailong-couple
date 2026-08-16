"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getCheckinWindow } from "@/lib/checkin-windows";
import { dateInShanghai } from "@/lib/life";
import { deleteConfirmedOrphans } from "@/lib/storage-admin";
import type {
  CheckinType,
  MemoryPhotoCategory,
  MoodValue,
  ProductCategory,
  ProductStatus,
  ProductType,
  WishCategory,
  WishStatus,
} from "@/types/database";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 5 * 1024 * 1024;

function target(path: string, kind: "ok" | "error", message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(message)}`;
}

function errorText(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  if (
    [
      "请选择一张照片。",
      "只支持 JPG、PNG 或 WebP 图片。",
      "图片不能超过 5MB。",
    ].includes(raw)
  )
    return raw;
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
    CHECKIN_WINDOW_CLOSED_LUNCH: "午间签到只在每天 11:00–14:00 开放。",
    CHECKIN_WINDOW_CLOSED_DINNER: "晚间签到只在每天 16:00–22:00 开放。",
    CHECKIN_NOT_STARTED_LUNCH: "午间签到还没开始，请在 11:00 后再来。",
    CHECKIN_NOT_STARTED_DINNER: "晚间签到还没开始，请在 16:00 后再来。",
    INVALID_CHECKIN_KIND: "签到类型不正确，请刷新后再试。",
    INVALID_MOOD_DATE: "不能记录未来的心情。",
    MOOD_NOTE_TOO_LONG: "心情备注不能超过 500 个字。",
    TOO_MANY_MOOD_TAGS: "心情标签最多选择 8 个。",
    INVALID_RESPONSE: "请填写 1～300 个字的回应。",
    INVALID_REWARD: "回应奖励数量不正确。",
    RESPONSE_REWARD_IMMUTABLE:
      "这次回应已经发过奖励，之后只能修改文字，不能重复改动奖励。",
    MYSTERY_NOT_READY: "奶龙还在准备这个惊喜，请再等一下。",
    MYSTERY_ALREADY_REVEALED: "这个惊喜已经揭晓，不能再修改啦。",
  };
  return (
    Object.entries(map).find(([key]) => raw.includes(key))?.[1] ??
    "操作没有成功，请稍后再试。"
  );
}

function validateImage(file: File) {
  if (!file || file.size === 0) throw new Error("请选择一张照片。");
  if (!imageTypes.has(file.type))
    throw new Error("只支持 JPG、PNG 或 WebP 图片。");
  if (file.size > maxImageSize) throw new Error("图片不能超过 5MB。");
}

function extensionFor(file: File) {
  return file.type === "image/png"
    ? "png"
    : file.type === "image/webp"
      ? "webp"
      : "jpg";
}

function storageDatePath() {
  const date = dateInShanghai();
  return `${date.slice(0, 4)}/${date.slice(5, 7)}`;
}

export async function loginAction(formData: FormData) {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(6) })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success)
    redirect(target("/login", "error", "请填写正确的邮箱和密码。"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error)
    redirect(target("/login", "error", "邮箱或密码不正确，请再试一次。"));
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
  if (
    (type !== "lunch" && type !== "dinner") ||
    !(file instanceof File) ||
    !requestId.success
  ) {
    redirect(target("/checkin", "error", "签到信息不完整，请重新选择。"));
  }

  let uploadedPath: string | null = null;
  let isMakeup = false;
  try {
    const checkinType = type as CheckinType;
    const window = getCheckinWindow(checkinType);
    if (window.isBeforeWindow) {
      throw new Error(
        checkinType === "lunch"
          ? "CHECKIN_NOT_STARTED_LUNCH"
          : "CHECKIN_NOT_STARTED_DINNER",
      );
    }
    isMakeup = window.isMakeup;
    validateImage(file);
    const supabase = await createClient();
    const path = `${profile.id}/${storageDatePath()}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const { error: uploadError } = await supabase.storage
      .from("checkin-images")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000",
      });
    if (uploadError) throw uploadError;
    uploadedPath = path;

    const { error } = await supabase.rpc("submit_checkin", {
      p_type: checkinType,
      p_image_url: path,
      p_request_id: requestId.data,
      p_checkin_kind: isMakeup ? "makeup" : "normal",
    });
    if (error) throw error;
  } catch (error) {
    if (uploadedPath) {
      const supabase = await createClient();
      await supabase.storage.from("checkin-images").remove([uploadedPath]);
    }
    redirect(target("/checkin", "error", errorText(error)));
  }
  revalidatePath("/");
  revalidatePath("/checkin");
  redirect(
    target(
      "/checkin",
      "ok",
      isMakeup
        ? "补签成功，1 枚奶龙币已经到账啦！"
        : "今日份好好吃饭任务完成，奶龙币到账啦！",
    ),
  );
}

export async function redeemAction(formData: FormData) {
  await requireUser();
  const id = z.uuid().safeParse(formData.get("product_id"));
  const requestId = z.uuid().safeParse(formData.get("request_id"));
  if (!id.success || !requestId.success)
    redirect(target("/shop", "error", "没有找到这个奖励。"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_redemption", {
    p_product_id: id.data,
    p_request_id: requestId.data,
  });
  if (error) redirect(target(`/shop/${id.data}`, "error", errorText(error)));
  revalidatePath("/");
  revalidatePath("/orders");
  redirect(
    target("/orders", "ok", "兑换申请已经送出去啦，已经告诉他，等他确认～"),
  );
}

export async function cancelOrderAction(formData: FormData) {
  await requireUser();
  const id = z.uuid().safeParse(formData.get("order_id"));
  if (!id.success) redirect(target("/orders", "error", "没有找到这笔兑换。"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_redemption", {
    p_order_id: id.data,
  });
  if (error) redirect(target(`/orders/${id.data}`, "error", errorText(error)));
  revalidatePath("/");
  revalidatePath("/wallet");
  redirect(target("/orders", "ok", "兑换已取消，冻结的奶龙币已经回来啦。"));
}

export async function updateProfileAction(formData: FormData) {
  const { profile } = await requireUser();
  const nickname = z
    .string()
    .trim()
    .min(1)
    .max(30)
    .safeParse(formData.get("nickname"));
  if (!nickname.success)
    redirect(target("/profile", "error", "昵称需要是 1～30 个字。"));
  const supabase = await createClient();
  let avatarPath = profile.avatar_url;
  const previousAvatar = profile.avatar_url;
  let uploadedAvatar: string | null = null;
  const file = formData.get("avatar");
  try {
    if (file instanceof File && file.size > 0) {
      validateImage(file);
      avatarPath = `${profile.id}/${crypto.randomUUID()}.${extensionFor(file)}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(avatarPath, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: "31536000",
        });
      if (uploadError) throw uploadError;
      uploadedAvatar = avatarPath;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ nickname: nickname.data, avatar_url: avatarPath })
      .eq("id", profile.id);
    if (error) throw error;
    if (uploadedAvatar && previousAvatar && previousAvatar !== uploadedAvatar) {
      await supabase.storage.from("avatars").remove([previousAvatar]);
    }
  } catch (error) {
    if (uploadedAvatar) {
      await supabase.storage.from("avatars").remove([uploadedAvatar]);
    }
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
  product_type: z.enum(["normal", "mystery"]),
  mystery_hint: z.string().trim().max(300),
});

export async function saveProductAction(formData: FormData) {
  await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      target("/admin/products", "error", "请检查商品名称、价格、库存和分类。"),
    );
  const supabase = await createClient();
  const id = parsed.data.id || null;
  const productId = id ?? crypto.randomUUID();
  let imagePath = String(formData.get("existing_image") || "") || null;
  const previousImage = imagePath;
  let uploadedImage: string | null = null;
  let databaseSaved = false;
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) {
      validateImage(file);
      imagePath = `products/${productId}/${storageDatePath()}/${crypto.randomUUID()}.${extensionFor(file)}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(imagePath, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
      if (uploadError) throw uploadError;
      uploadedImage = imagePath;
    }
    const payload = {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      stock: parsed.data.stock,
      category: parsed.data.category as ProductCategory,
      status: parsed.data.status as ProductStatus,
      product_type: parsed.data.product_type as ProductType,
      mystery_hint: parsed.data.mystery_hint,
      image_url: imagePath,
      is_hidden: formData.get("is_hidden") === "on",
      is_featured: formData.get("is_featured") === "on",
    };
    const result = id
      ? await supabase
          .from("products")
          .update(payload)
          .eq("id", id)
          .select("id")
          .single()
      : await supabase.from("products").insert({ id: productId, ...payload }).select("id").single();
    if (result.error) throw result.error;
    databaseSaved = true;
    if (parsed.data.product_type === "mystery") {
      const surpriseTitle = z
        .string()
        .trim()
        .min(1)
        .max(100)
        .safeParse(formData.get("surprise_title"));
      const surpriseContent = z
        .string()
        .trim()
        .min(1)
        .max(1000)
        .safeParse(formData.get("surprise_content"));
      if (!surpriseTitle.success || !surpriseContent.success)
        throw new Error("请填写惊喜箱的真实内容。");
      const { profile } = await requireAdmin();
      const mysteryResult = await supabase
        .from("product_mystery_details")
        .upsert({
          product_id: productId,
          surprise_title: surpriseTitle.data,
          surprise_content: surpriseContent.data,
          updated_by: profile.id,
        });
      if (mysteryResult.error) throw mysteryResult.error;
    } else {
      await supabase
        .from("product_mystery_details")
        .delete()
        .eq("product_id", productId);
    }
    if (uploadedImage && previousImage && previousImage !== uploadedImage) {
      await supabase.storage.from("product-images").remove([previousImage]);
    }
  } catch (error) {
    if (uploadedImage && !databaseSaved) {
      await supabase.storage.from("product-images").remove([uploadedImage]);
    }
    redirect(
      target(
        id ? `/admin/products/${id}` : "/admin/products/new",
        "error",
        errorText(error),
      ),
    );
  }
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  redirect(
    target("/admin/products", "ok", id ? "商品已经更新。" : "新奖励已经上架。"),
  );
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("product_id"));
  if (!id.success)
    redirect(target("/admin/products", "error", "商品编号无效。"));
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id.data);
  if (error)
    redirect(
      target(
        "/admin/products",
        "error",
        "已有历史订单的商品不能删除，可以改为下架或隐藏。",
      ),
    );
  revalidatePath("/shop");
  redirect(target("/admin/products", "ok", "商品已经删除。"));
}

export async function processOrderAction(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.uuid(),
      action: z.enum(["approve", "reject", "complete"]),
      note: z.string().max(1000),
    })
    .safeParse({
      id: formData.get("order_id"),
      action: formData.get("action"),
      note: formData.get("note") || "",
    });
  if (!parsed.success)
    redirect(target("/admin/orders", "error", "订单操作参数不正确。"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_process_order", {
    p_order_id: parsed.data.id,
    p_action: parsed.data.action,
    p_note: parsed.data.note || null,
  });
  if (error)
    redirect(
      target(`/admin/orders/${parsed.data.id}`, "error", errorText(error)),
    );
  revalidatePath("/", "layout");
  redirect(
    target(`/admin/orders/${parsed.data.id}`, "ok", "订单状态已经更新。"),
  );
}

export async function adjustWalletAction(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      userId: z.uuid(),
      amount: z.coerce
        .number()
        .int()
        .refine((value) => value !== 0),
      reason: z.string().trim().min(2).max(100),
      note: z.string().trim().max(500),
    })
    .safeParse({
      userId: formData.get("user_id"),
      amount: formData.get("amount"),
      reason: formData.get("reason"),
      note: formData.get("note") || "",
    });
  if (!parsed.success)
    redirect(
      target("/admin/wallet", "error", "请输入非零整数数量，并填写调整原因。"),
    );
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
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(80),
      content: z.string().trim().min(1).max(1000),
    })
    .safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
    });
  if (!parsed.success)
    redirect(
      target("/admin/announcements", "error", "标题和留言内容不能为空。"),
    );
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .insert({ ...parsed.data, is_active: true });
  if (error)
    redirect(target("/admin/announcements", "error", errorText(error)));
  revalidatePath("/");
  redirect(target("/admin/announcements", "ok", "新的小纸条已经发布。"));
}

export async function toggleAnnouncementAction(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({ id: z.uuid(), active: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success)
    redirect(target("/admin/announcements", "error", "留言参数不正确。"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({ is_active: parsed.data.active === "true" })
    .eq("id", parsed.data.id);
  if (error)
    redirect(target("/admin/announcements", "error", errorText(error)));
  revalidatePath("/");
  redirect(target("/admin/announcements", "ok", "留言状态已经更新。"));
}

export async function updateSettingsAction(formData: FormData) {
  await requireAdmin();
  const keys = [
    "lunch_reward",
    "dinner_reward",
    "daily_complete_reward",
    "streak_7_reward",
    "streak_30_reward",
    "mood_checkin_reward",
  ];
  const updates = keys.map((key) => ({
    key,
    value: Number(formData.get(key)),
  }));
  if (updates.some((item) => !Number.isInteger(item.value) || item.value < 0)) {
    redirect(
      target("/admin/settings", "error", "奖励数量必须是大于等于 0 的整数。"),
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_settings", {
    p_settings: Object.fromEntries(
      updates.map((item) => [item.key, item.value]),
    ),
  });
  if (error) redirect(target("/admin/settings", "error", errorText(error)));
  revalidatePath("/", "layout");
  redirect(target("/admin/settings", "ok", "签到奖励规则已经生效。"));
}

const moodValues = [
  "very_unpleasant",
  "unpleasant",
  "slightly_unpleasant",
  "neutral",
  "slightly_pleasant",
  "pleasant",
  "very_pleasant",
] as const;

export async function saveMoodAction(formData: FormData) {
  await requireUser();
  const parsed = z
    .object({
      date: z.iso.date(),
      value: z.enum(moodValues),
      note: z.string().trim().max(500),
    })
    .safeParse({
      date: formData.get("date"),
      value: formData.get("value"),
      note: formData.get("note") || "",
    });
  const returnTo = String(formData.get("return_to") || "/");
  if (!parsed.success)
    redirect(target(returnTo, "error", "请选择心情，并检查备注内容。"));
  const tags = formData.getAll("tags").map(String).filter(Boolean).slice(0, 8);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_mood", {
    p_mood_date: parsed.data.date,
    p_value: parsed.data.value as MoodValue,
    p_tags: tags,
    p_note: parsed.data.note,
  });
  if (error) redirect(target(returnTo, "error", errorText(error)));
  const result = data as { rewarded?: boolean; reward?: number } | null;
  const rewarded = Boolean(result?.rewarded);
  revalidatePath("/", "layout");
  redirect(
    target(
      returnTo,
      "ok",
      rewarded
        ? `今天的心情已收藏，+${result?.reward ?? 0} 奶龙币到账啦！`
        : "心情已经更新。",
    ),
  );
}

export async function respondToMoodAction(formData: FormData) {
  await requireAdmin();
  const responseContent =
    String(formData.get("content") || "").trim() ||
    String(formData.get("quick_content") || "").trim();
  const parsed = z
    .object({
      moodId: z.uuid(),
      content: z.string().trim().min(1).max(300),
      reward: z.coerce.number().int().min(0).max(100000),
    })
    .safeParse({
      moodId: formData.get("mood_id"),
      content: responseContent,
      reward: formData.get("coin_reward") || 0,
    });
  if (!parsed.success)
    redirect(
      target("/admin/moods", "error", "请填写回应内容，并检查奖励数量。"),
    );
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_mood", {
    p_mood_id: parsed.data.moodId,
    p_content: parsed.data.content,
    p_coin_reward: parsed.data.reward,
  });
  if (error) redirect(target("/admin/moods", "error", errorText(error)));
  revalidatePath("/", "layout");
  redirect(target("/admin/moods", "ok", "回应已经送到她的首页。"));
}

export async function saveDailyNoteAction(formData: FormData) {
  const { profile } = await requireUser();
  const parsed = z
    .object({ date: z.iso.date(), content: z.string().trim().min(1).max(240) })
    .safeParse({
      date: formData.get("date"),
      content: formData.get("content"),
    });
  const returnTo = String(formData.get("return_to") || "/");
  if (!parsed.success)
    redirect(target(returnTo, "error", "今日一句需要是 1～240 个字。"));
  const supabase = await createClient();
  const { error } = await supabase.from("daily_notes").upsert(
    {
      user_id: profile.id,
      note_date: parsed.data.date,
      content: parsed.data.content,
    },
    { onConflict: "user_id,note_date" },
  );
  if (error) redirect(target(returnTo, "error", errorText(error)));
  revalidatePath("/", "layout");
  redirect(target(returnTo, "ok", "这句话已经留在今天啦。"));
}

export async function saveCalendarEventAction(formData: FormData) {
  const { profile } = await requireUser();
  const parsed = z
    .object({
      id: z.union([z.literal(""), z.uuid()]).optional(),
      title: z.string().trim().min(1).max(80),
      eventDate: z.iso.date(),
      eventType: z.string().trim().min(1).max(30),
      note: z.string().trim().max(800),
      repeatType: z.enum(["none", "yearly"]),
      isStoryEvent: z.boolean(),
    })
    .safeParse({
      id: formData.get("id") || "",
      title: formData.get("title"),
      eventDate: formData.get("event_date"),
      eventType: formData.get("event_type") || "special",
      note: formData.get("note") || "",
      repeatType: formData.get("repeat_type") || "none",
      isStoryEvent: formData.get("is_story_event") === "on",
    });
  const returnTo = String(formData.get("return_to") || "/calendar");
  if (!parsed.success)
    redirect(target(returnTo, "error", "请检查纪念日标题、日期和备注。"));
  const supabase = await createClient();
  const payload = {
    title: parsed.data.title,
    event_date: parsed.data.eventDate,
    event_type: parsed.data.eventType,
    note: parsed.data.note,
    repeat_type: parsed.data.repeatType,
    is_story_event: parsed.data.isStoryEvent,
  };
  if (parsed.data.id) {
    const { data: existingEvent, error: existingError } = await supabase
      .from("calendar_events")
      .select("created_by")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (existingError || !existingEvent) {
      redirect(
        target(
          returnTo,
          "error",
          existingError ? errorText(existingError) : "没有找到这个纪念日。",
        ),
      );
    }
    if (profile.role !== "admin" && existingEvent.created_by !== profile.id) {
      redirect(target(returnTo, "error", "你只能修改自己创建的纪念日。"));
    }
  }
  const result = parsed.data.id
    ? await supabase
        .from("calendar_events")
        .update(payload)
        .eq("id", parsed.data.id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("calendar_events")
        .insert({ ...payload, created_by: profile.id })
        .select("id")
        .single();
  if (result.error)
    redirect(target(returnTo, "error", errorText(result.error)));
  if (!result.data)
    redirect(target(returnTo, "error", "纪念日没有更新，请刷新后再试。"));
  revalidatePath("/", "layout");
  redirect(
    target(
      returnTo,
      "ok",
      parsed.data.id ? "纪念日已经更新。" : "这个特别的日子已经收藏。",
    ),
  );
}

export async function deleteCalendarEventAction(formData: FormData) {
  const { profile } = await requireUser();
  const id = z.uuid().safeParse(formData.get("event_id"));
  const returnTo = String(formData.get("return_to") || "/calendar");
  if (!id.success) redirect(target(returnTo, "error", "没有找到这个纪念日。"));
  const supabase = await createClient();
  const { data: existingEvent, error: existingError } = await supabase
    .from("calendar_events")
    .select("created_by")
    .eq("id", id.data)
    .maybeSingle();
  if (existingError || !existingEvent) {
    redirect(
      target(
        returnTo,
        "error",
        existingError ? errorText(existingError) : "没有找到这个纪念日。",
      ),
    );
  }
  if (profile.role !== "admin" && existingEvent.created_by !== profile.id) {
    redirect(target(returnTo, "error", "你只能删除自己创建的纪念日。"));
  }
  const { data: deletedEvent, error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error) redirect(target(returnTo, "error", errorText(error)));
  if (!deletedEvent)
    redirect(target(returnTo, "error", "纪念日没有删除，请刷新后再试。"));
  revalidatePath("/", "layout");
  redirect(target(returnTo, "ok", "这个纪念日已经删除。"));
}

async function uploadLifeImage(file: File, userId: string, folder: string) {
  validateImage(file);
  const supabase = await createClient();
  const path = `${userId}/${folder}/${storageDatePath()}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage
    .from("life-images")
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

const memoryPhotoCategories = [
  "daily",
  "date",
  "travel",
  "food",
  "gift",
  "selfie",
  "scenery",
  "special",
  "other",
] as const;

export async function saveMemoryPhotosAction(formData: FormData) {
  const { profile } = await requireUser();
  const parsed = z
    .object({
      photoDate: z.iso.date(),
      caption: z.string().trim().max(240),
      category: z.enum(memoryPhotoCategories),
    })
    .safeParse({
      photoDate: formData.get("photo_date"),
      caption: formData.get("caption") || "",
      category: formData.get("category") || "daily",
    });
  const returnTo = parsed.success
    ? `/calendar/${parsed.data.photoDate}`
    : "/memories";
  if (!parsed.success || parsed.data.photoDate > dateInShanghai()) {
    redirect(target(returnTo, "error", "请检查照片日期、分类和说明。"));
  }

  const files = formData
    .getAll("images")
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length < 1 || files.length > 9) {
    redirect(target(returnTo, "error", "每次请选择 1～9 张生活照片。"));
  }

  const supabase = await createClient();
  const { count: existingCount, error: countError } = await supabase
    .from("memory_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("photo_date", parsed.data.photoDate)
    .is("deleted_at", null);
  if (countError) {
    redirect(target(returnTo, "error", errorText(countError)));
  }
  if ((existingCount ?? 0) + files.length > 9) {
    redirect(
      target(
        returnTo,
        "error",
        `这一天最多保存 9 张生活照片，你还可以添加 ${Math.max(0, 9 - (existingCount ?? 0))} 张。`,
      ),
    );
  }
  const uploadedPaths: string[] = [];
  try {
    for (const file of files) {
      validateImage(file);
      uploadedPaths.push(await uploadLifeImage(file, profile.id, "memories"));
    }
    const { error } = await supabase.from("memory_photos").insert(
      uploadedPaths.map((imageUrl) => ({
        user_id: profile.id,
        photo_date: parsed.data.photoDate,
        image_url: imageUrl,
        caption: parsed.data.caption,
        category: parsed.data.category as MemoryPhotoCategory,
      })),
    );
    if (error) throw error;
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from("life-images").remove(uploadedPaths);
    }
    redirect(target(returnTo, "error", errorText(error)));
  }

  revalidatePath("/", "layout");
  redirect(target(returnTo, "ok", `${files.length} 张照片已经放进这一天啦。`));
}

export async function deleteMemoryPhotoAction(formData: FormData) {
  const { profile } = await requireUser();
  const parsed = z.object({ id: z.uuid(), date: z.iso.date() }).safeParse({
    id: formData.get("photo_id"),
    date: formData.get("photo_date"),
  });
  const returnTo = parsed.success
    ? `/calendar/${parsed.data.date}`
    : "/memories";
  if (!parsed.success) {
    redirect(target(returnTo, "error", "没有找到这张生活照片。"));
  }
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("memory_photos")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!photo) redirect(target(returnTo, "error", "你只能删除自己上传的照片。"));
  const { error } = await supabase
    .from("memory_photos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", profile.id);
  if (error) redirect(target(returnTo, "error", errorText(error)));
  revalidatePath("/", "layout");
  redirect(target(returnTo, "ok", "这张照片已移到最近删除，可在 30 天内恢复。"));
}

export async function saveWishAction(formData: FormData) {
  const { profile } = await requireUser();
  const parsed = z
    .object({
      id: z.union([z.literal(""), z.uuid()]).optional(),
      title: z.string().trim().min(1).max(100),
      description: z.string().trim().max(800),
      category: z.enum([
        "food",
        "travel",
        "gift",
        "activity",
        "movie",
        "other",
      ]),
      status: z.enum(["active", "completed", "archived"]),
    })
    .safeParse({
      id: formData.get("id") || "",
      title: formData.get("title"),
      description: formData.get("description") || "",
      category: formData.get("category") || "other",
      status: formData.get("status") || "active",
    });
  if (!parsed.success)
    redirect(target("/wishes", "error", "请检查愿望名称和内容。"));
  const supabase = await createClient();
  let imageUrl = String(formData.get("existing_image") || "") || null;
  const previousImage = imageUrl;
  let uploadedImage: string | null = null;
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) {
      imageUrl = await uploadLifeImage(file, profile.id, "wishes");
      uploadedImage = imageUrl;
    }
    const payload = {
      user_id: profile.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category as WishCategory,
      status: parsed.data.status as WishStatus,
      image_url: imageUrl,
      completed_at:
        parsed.data.status === "completed" ? new Date().toISOString() : null,
    };
    const result = parsed.data.id
      ? await supabase.from("wishes").update(payload).eq("id", parsed.data.id)
      : await supabase.from("wishes").insert(payload);
    if (result.error) throw result.error;
    if (uploadedImage && previousImage && previousImage !== uploadedImage) {
      await supabase.storage.from("life-images").remove([previousImage]);
    }
  } catch (error) {
    if (uploadedImage) {
      await supabase.storage.from("life-images").remove([uploadedImage]);
    }
    redirect(target("/wishes", "error", errorText(error)));
  }
  revalidatePath("/", "layout");
  redirect(
    target(
      "/wishes",
      "ok",
      parsed.data.status === "completed"
        ? "愿望实现啦 ❤️"
        : "愿望已经收进清单。",
    ),
  );
}

export async function deleteWishAction(formData: FormData) {
  await requireUser();
  const id = z.uuid().safeParse(formData.get("wish_id"));
  if (!id.success) redirect(target("/wishes", "error", "没有找到这个愿望。"));
  const supabase = await createClient();
  const { error } = await supabase.from("wishes").delete().eq("id", id.data);
  if (error) redirect(target("/wishes", "error", errorText(error)));
  revalidatePath("/wishes");
  redirect(target("/wishes", "ok", "愿望已经移出清单。"));
}

export async function updateWishAdminMetaAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const parsed = z
    .object({
      wishId: z.uuid(),
      status: z.enum(["not_started", "preparing", "ready"]),
      note: z.string().trim().max(800),
    })
    .safeParse({
      wishId: formData.get("wish_id"),
      status: formData.get("status"),
      note: formData.get("secret_note") || "",
    });
  if (!parsed.success)
    redirect(target("/admin/wishes", "error", "请检查秘密准备状态和备注。"));
  const supabase = await createClient();
  const { error } = await supabase.from("wish_admin_meta").upsert({
    wish_id: parsed.data.wishId,
    status: parsed.data.status,
    secret_note: parsed.data.note,
    updated_by: profile.id,
  });
  if (error) redirect(target("/admin/wishes", "error", errorText(error)));
  redirect(
    target("/admin/wishes", "ok", "秘密准备状态已经保存，她看不到这里的内容。"),
  );
}

export async function adminCompleteWishAction(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("wish_id"));
  if (!id.success)
    redirect(target("/admin/wishes", "error", "没有找到这个愿望。"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("wishes")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id.data);
  if (error) redirect(target("/admin/wishes", "error", errorText(error)));
  revalidatePath("/wishes");
  redirect(
    target(
      "/admin/wishes",
      "ok",
      "愿望已公开标记为实现，她会看到『愿望实现啦』。",
    ),
  );
}

export async function saveRelationshipAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const optionalProfileId = z.union([z.literal(""), z.uuid()]);
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(30),
      startDate: z.iso.date(),
      partnerAId: optionalProfileId,
      partnerBId: optionalProfileId,
    })
    .safeParse({
      title: formData.get("relationship_title"),
      startDate: formData.get("relationship_start_date"),
      partnerAId: formData.get("partner_a_id") || "",
      partnerBId: formData.get("partner_b_id") || "",
    });
  if (!parsed.success)
    redirect(target("/admin/settings", "error", "请填写关系标题和开始日期。"));
  if (
    parsed.data.partnerAId &&
    parsed.data.partnerAId === parsed.data.partnerBId
  ) {
    redirect(
      target("/admin/settings", "error", "关系双方不能选择同一个账号。"),
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.from("relationship_settings").upsert({
    id: true,
    title: parsed.data.title,
    start_date: parsed.data.startDate,
    partner_a_id: parsed.data.partnerAId || null,
    partner_b_id: parsed.data.partnerBId || null,
    updated_by: profile.id,
  });
  if (error) redirect(target("/admin/settings", "error", errorText(error)));
  revalidatePath("/", "layout");
  redirect(target("/admin/settings", "ok", "我们的纪念日设置已经更新。"));
}

export async function prepareMysteryOrderAction(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      orderId: z.uuid(),
      title: z.string().trim().min(1).max(100),
      content: z.string().trim().min(1).max(1000),
      message: z.string().trim().max(800),
    })
    .safeParse({
      orderId: formData.get("order_id"),
      title: formData.get("surprise_title"),
      content: formData.get("surprise_content"),
      message: formData.get("admin_message") || "",
    });
  if (!parsed.success)
    redirect(target("/admin/mysteries", "error", "请填写惊喜名称和真实内容。"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("prepare_mystery_order", {
    p_order_id: parsed.data.orderId,
    p_surprise_title: parsed.data.title,
    p_surprise_content: parsed.data.content,
    p_admin_message: parsed.data.message,
    p_reveal_image_url: null,
  });
  if (error) redirect(target("/admin/mysteries", "error", errorText(error)));
  revalidatePath("/orders", "layout");
  redirect(
    target("/admin/mysteries", "ok", "惊喜准备好了，她现在可以亲手揭晓。"),
  );
}

export async function revealMysteryOrderAction(formData: FormData) {
  await requireUser();
  const id = z.uuid().safeParse(formData.get("order_id"));
  if (!id.success)
    redirect(target("/orders", "error", "没有找到这个惊喜订单。"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("reveal_mystery_order", {
    p_order_id: id.data,
  });
  if (error) redirect(target(`/orders/${id.data}`, "error", errorText(error)));
  revalidatePath(`/orders/${id.data}`);
  redirect(target(`/orders/${id.data}`, "ok", "惊喜揭晓啦 ❤️"));
}

export async function savePlaceAction(formData: FormData) {
  const { profile } = await requireUser();
  const parsed = z
    .object({
      id: z.union([z.literal(""), z.uuid()]).optional(),
      title: z.string().trim().min(1).max(100),
      placeName: z.string().trim().min(1).max(120),
      visitDate: z.iso.date(),
      description: z.string().trim().max(1000),
      placeType: z.string().trim().min(1).max(30),
      latitude: z.union([z.literal(""), z.coerce.number().min(-90).max(90)]),
      longitude: z.union([z.literal(""), z.coerce.number().min(-180).max(180)]),
    })
    .safeParse({
      id: formData.get("id") || "",
      title: formData.get("title"),
      placeName: formData.get("place_name"),
      visitDate: formData.get("visit_date"),
      description: formData.get("description") || "",
      placeType: formData.get("place_type") || "other",
      latitude: formData.get("latitude") || "",
      longitude: formData.get("longitude") || "",
    });
  if (!parsed.success)
    redirect(target("/places", "error", "请检查地点名称、日期和经纬度。"));
  const supabase = await createClient();
  let imageUrl = String(formData.get("existing_image") || "") || null;
  const previousImage = imageUrl;
  let uploadedImage: string | null = null;
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) {
      imageUrl = await uploadLifeImage(file, profile.id, "places");
      uploadedImage = imageUrl;
    }
    const payload = {
      title: parsed.data.title,
      place_name: parsed.data.placeName,
      visit_date: parsed.data.visitDate,
      description: parsed.data.description,
      place_type: parsed.data.placeType,
      latitude: parsed.data.latitude === "" ? null : parsed.data.latitude,
      longitude: parsed.data.longitude === "" ? null : parsed.data.longitude,
      image_url: imageUrl,
      created_by: profile.id,
    };
    const result = parsed.data.id
      ? await supabase.from("places").update(payload).eq("id", parsed.data.id)
      : await supabase.from("places").insert(payload);
    if (result.error) throw result.error;
    if (uploadedImage && previousImage && previousImage !== uploadedImage) {
      await supabase.storage.from("life-images").remove([previousImage]);
    }
  } catch (error) {
    if (uploadedImage) {
      await supabase.storage.from("life-images").remove([uploadedImage]);
    }
    redirect(target("/places", "error", errorText(error)));
  }
  revalidatePath("/places");
  redirect(target("/places", "ok", "这个地方已经留在我们的足迹里。"));
}

export async function deletePlaceAction(formData: FormData) {
  await requireUser();
  const id = z.uuid().safeParse(formData.get("place_id"));
  if (!id.success) redirect(target("/places", "error", "没有找到这个足迹。"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("places")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.data);
  if (error) redirect(target("/places", "error", errorText(error)));
  revalidatePath("/places");
  redirect(target("/places", "ok", "这条足迹已移到最近删除，可在 30 天内恢复。"));
}

export async function updateStorageWarningAction(formData: FormData) {
  await requireAdmin();
  const warningMb = z.coerce.number().int().min(50).max(100000).safeParse(formData.get("warning_mb"));
  if (!warningMb.success) redirect(target("/admin/storage", "error", "提醒阈值需要是 50～100000 MB。"));
  const supabase = await createClient();
  const { error } = await supabase.from("system_settings").update({ value: warningMb.data }).eq("key", "warning_storage_mb");
  if (error) redirect(target("/admin/storage", "error", errorText(error)));
  revalidatePath("/admin/storage");
  redirect(target("/admin/storage", "ok", "存储提醒阈值已更新。"));
}

export async function cleanupOrphanStorageAction(formData: FormData) {
  await requireAdmin();
  if (formData.get("confirmation") !== "DELETE_ORPHANS") redirect(target("/admin/storage", "error", "请先确认清理操作。"));
  let count: number;
  try {
    count = await deleteConfirmedOrphans();
  } catch (error) {
    redirect(target("/admin/storage", "error", errorText(error)));
  }
  revalidatePath("/admin/storage");
  redirect(target("/admin/storage", "ok", `已清理 ${count} 个未被数据库引用的文件。`));
}

export async function cleanupExpiredTrashAction(formData: FormData) {
  await requireAdmin();
  if (formData.get("confirmation") !== "DELETE_EXPIRED_TRASH") redirect(target("/admin/storage", "error", "请先确认清理操作。"));
  const supabase = await createClient();
  const before = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [photosRes, placesRes] = await Promise.all([
    supabase.from("memory_photos").select("id,image_url").lt("deleted_at", before),
    supabase.from("places").select("id,image_url").lt("deleted_at", before),
  ]);
  if (photosRes.error || placesRes.error) redirect(target("/admin/storage", "error", errorText(photosRes.error ?? placesRes.error)));
  const photos = photosRes.data ?? [];
  const places = placesRes.data ?? [];
  const [photoDelete, placeDelete] = await Promise.all([
    photos.length ? supabase.from("memory_photos").delete().in("id", photos.map((item) => item.id)) : Promise.resolve({ error: null }),
    places.length ? supabase.from("places").delete().in("id", places.map((item) => item.id)) : Promise.resolve({ error: null }),
  ]);
  if (photoDelete.error || placeDelete.error) redirect(target("/admin/storage", "error", errorText(photoDelete.error ?? placeDelete.error)));
  const paths = [...photos, ...places].map((item) => item.image_url).filter((value): value is string => Boolean(value));
  if (paths.length) await supabase.storage.from("life-images").remove(paths);
  revalidatePath("/", "layout");
  redirect(target("/admin/storage", "ok", `已永久清理 ${photos.length + places.length} 条超过 30 天的回收站记录。`));
}

export async function restoreDeletedItemAction(formData: FormData) {
  const { profile } = await requireUser();
  const id = z.uuid().safeParse(formData.get("id"));
  const type = formData.get("type");
  if (!id.success || (type !== "memory" && type !== "place")) {
    redirect(target("/profile/recently-deleted", "error", "没有找到这条记录。"));
  }
  const supabase = await createClient();
  const query = type === "memory"
    ? supabase.from("memory_photos").update({ deleted_at: null }).eq("id", id.data).eq("user_id", profile.id)
    : supabase.from("places").update({ deleted_at: null }).eq("id", id.data).eq("created_by", profile.id);
  const { error } = await query;
  if (error) redirect(target("/profile/recently-deleted", "error", errorText(error)));
  revalidatePath("/", "layout");
  redirect(target("/profile/recently-deleted", "ok", "已经恢复到原来的位置。"));
}

export async function permanentlyDeleteItemAction(formData: FormData) {
  const { profile } = await requireUser();
  const id = z.uuid().safeParse(formData.get("id"));
  const type = formData.get("type");
  if (!id.success || (type !== "memory" && type !== "place")) {
    redirect(target("/profile/recently-deleted", "error", "没有找到这条记录。"));
  }
  const supabase = await createClient();
  const lookup = type === "memory"
    ? supabase.from("memory_photos").select("image_url").eq("id", id.data).eq("user_id", profile.id).not("deleted_at", "is", null).maybeSingle()
    : supabase.from("places").select("image_url").eq("id", id.data).eq("created_by", profile.id).not("deleted_at", "is", null).maybeSingle();
  const { data: item, error: lookupError } = await lookup;
  if (lookupError || !item) redirect(target("/profile/recently-deleted", "error", "没有找到可永久删除的记录。"));
  const deletion = type === "memory"
    ? supabase.from("memory_photos").delete().eq("id", id.data).eq("user_id", profile.id)
    : supabase.from("places").delete().eq("id", id.data).eq("created_by", profile.id);
  const { error } = await deletion;
  if (error) redirect(target("/profile/recently-deleted", "error", errorText(error)));
  if (item.image_url) await supabase.storage.from("life-images").remove([item.image_url]);
  revalidatePath("/", "layout");
  redirect(target("/profile/recently-deleted", "ok", "记录和对应照片已永久删除。"));
}
