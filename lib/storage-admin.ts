import "server-only";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type StorageObjectInfo = {
  bucket: string;
  path: string;
  size: number;
  createdAt: string | null;
};

const buckets = ["checkin-images", "life-images", "product-images", "avatars"] as const;

async function listFolder(bucket: string, prefix = "", depth = 0): Promise<StorageObjectInfo[]> {
  if (depth > 8) return [];
  const supabase = await createClient();
  const result: StorageObjectInfo[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    const items = data ?? [];
    for (const item of items) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (!item.id && !item.metadata) {
        result.push(...(await listFolder(bucket, path, depth + 1)));
      } else {
        result.push({ bucket, path, size: Number(item.metadata?.size ?? 0), createdAt: item.created_at ?? null });
      }
    }
    if (items.length < 100) break;
  }
  return result;
}

async function getReferencedPaths() {
  const supabase = await createClient();
  const [checkins, memories, profiles, products, wishes, places, productMysteries, orderMysteries] = await Promise.all([
    supabase.from("checkins").select("image_url"),
    supabase.from("memory_photos").select("image_url"),
    supabase.from("profiles").select("avatar_url"),
    supabase.from("products").select("image_url"),
    supabase.from("wishes").select("image_url"),
    supabase.from("places").select("image_url"),
    supabase.from("product_mystery_details").select("reveal_image_url"),
    supabase.from("order_mystery_details").select("reveal_image_url"),
  ]);
  const failed = [checkins, memories, profiles, products, wishes, places, productMysteries, orderMysteries].find((result) => result.error);
  if (failed?.error) throw failed.error;
  const references = new Set<string>();
  const add = (bucket: string, rows: Array<Record<string, unknown>> | null, key: string) => rows?.forEach((row) => { const value = row[key]; if (typeof value === "string" && value) references.add(`${bucket}/${value}`); });
  add("checkin-images", checkins.data, "image_url");
  add("life-images", memories.data, "image_url");
  add("avatars", profiles.data, "avatar_url");
  add("product-images", products.data, "image_url");
  add("life-images", wishes.data, "image_url");
  add("life-images", places.data, "image_url");
  add("life-images", productMysteries.data, "reveal_image_url");
  add("life-images", orderMysteries.data, "reveal_image_url");
  return references;
}

function thresholdFor(item: StorageObjectInfo) {
  if (item.bucket === "avatars") return 200 * 1024;
  if (item.bucket === "checkin-images") return 500 * 1024;
  if (item.bucket === "product-images") return 500 * 1024;
  return 800 * 1024;
}

export async function getStorageAdminData() {
  await requireAdmin();
  const supabase = await createClient();
  const [filesByBucket, references, settingRes] = await Promise.all([
    Promise.all(buckets.map((bucket) => listFolder(bucket))),
    getReferencedPaths(),
    supabase.from("system_settings").select("*").eq("key", "warning_storage_mb").maybeSingle(),
  ]);
  const files = filesByBucket.flat();
  const now = Date.now();
  const recentBoundary = now - 30 * 86_400_000;
  const totalSize = files.reduce((sum, item) => sum + item.size, 0);
  const recent = files.filter((item) => item.createdAt && new Date(item.createdAt).getTime() >= recentBoundary);
  return {
    files,
    totalSize,
    averageSize: files.length ? Math.round(totalSize / files.length) : 0,
    recentCount: recent.length,
    recentSize: recent.reduce((sum, item) => sum + item.size, 0),
    largest: [...files].sort((a, b) => b.size - a.size).slice(0, 10),
    oversized: files.filter((item) => item.size > thresholdFor(item)).sort((a, b) => b.size - a.size),
    orphans: files.filter((item) => !references.has(`${item.bucket}/${item.path}`)),
    warningMb: Number(settingRes.data?.value ?? 800),
    bucketStats: buckets.map((bucket) => {
      const matches = files.filter((item) => item.bucket === bucket);
      return { bucket, count: matches.length, size: matches.reduce((sum, item) => sum + item.size, 0) };
    }),
  };
}

export async function deleteConfirmedOrphans() {
  const data = await getStorageAdminData();
  const supabase = await createClient();
  for (const bucket of buckets) {
    const paths = data.orphans.filter((item) => item.bucket === bucket).map((item) => item.path);
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (error) throw error;
    }
  }
  return data.orphans.length;
}
