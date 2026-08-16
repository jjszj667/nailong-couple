export type ImagePurpose = "checkin" | "memory" | "avatar" | "product";

type CompressionConfig = {
  maxDimension: number;
  quality: number;
  targetBytes: number;
};

const maxUploadBytes = 5 * 1024 * 1024;

export const IMAGE_COMPRESSION_CONFIG: Record<ImagePurpose, CompressionConfig> = {
  checkin: { maxDimension: 1600, quality: 0.78, targetBytes: 500 * 1024 },
  memory: { maxDimension: 1920, quality: 0.82, targetBytes: 800 * 1024 },
  avatar: { maxDimension: 512, quality: 0.8, targetBytes: 200 * 1024 },
  product: { maxDimension: 1400, quality: 0.8, targetBytes: 500 * 1024 },
};

export type CompressedImage = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
};

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const supportedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const heicTypes = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const heicExtensions = new Set(["heic", "heif", "heics", "heifs"]);

function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function extensionFromName(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function isHeicImage(file: File) {
  return heicTypes.has(file.type.toLowerCase()) || heicExtensions.has(extensionFromName(file.name));
}

function isSupportedImage(file: File) {
  return supportedTypes.has(file.type.toLowerCase()) || supportedExtensions.has(extensionFromName(file.name));
}

async function convertHeicToJpeg(source: File) {
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: source,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!blob) throw new Error("empty conversion result");
    const baseName = source.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: source.lastModified || Date.now(),
    });
  } catch {
    throw new Error("HEIC/HEIF 照片转换失败，请在 iPhone 相册里另存或发送为兼容格式后重试。");
  }
}

async function normalizeSourceImage(source: File) {
  if (isHeicImage(source)) return convertHeicToJpeg(source);
  if (isSupportedImage(source)) return source;
  throw new Error("只支持 JPG、PNG、WebP 或 iPhone HEIC/HEIF 照片。");
}

async function decodeImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } catch {
    throw new Error("这张图片无法读取，请换一张 JPG、PNG、WebP 或 iPhone HEIC/HEIF 照片。");
  } finally {
    // The decoded image keeps its bitmap even after the object URL is released.
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(
  source: File,
  purpose: ImagePurpose,
): Promise<CompressedImage> {
  const normalized = await normalizeSourceImage(source);
  const config = IMAGE_COMPRESSION_CONFIG[purpose];
  const image = await decodeImage(normalized);
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const initialScale = Math.min(1, config.maxDimension / longest);
  let width = Math.max(1, Math.round(image.naturalWidth * initialScale));
  let height = Math.max(1, Math.round(image.naturalHeight * initialScale));
  let quality = config.quality;
  let result: Blob | null = null;
  let outputType = "image/webp";

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("浏览器暂时无法处理图片，请刷新后重试。");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    result = await blobFromCanvas(canvas, "image/webp", quality);
    if (!result || result.type !== "image/webp") {
      outputType = "image/jpeg";
      result = await blobFromCanvas(canvas, outputType, quality);
    }
    if (!result) throw new Error("图片压缩失败，请换一张图片重试。");
    if (result.size <= config.targetBytes) break;

    if (quality > 0.64) {
      quality = Math.max(0.64, quality - 0.07);
    } else {
      width = Math.max(1, Math.round(width * 0.86));
      height = Math.max(1, Math.round(height * 0.86));
    }
  }

  if (!result) throw new Error("图片压缩失败，请换一张图片重试。");
  if (result.size > maxUploadBytes) {
    throw new Error("图片不能超过 5MB。");
  }
  const extension = outputType === "image/webp" ? "webp" : "jpg";
  const baseName = normalized.name.replace(/\.[^.]+$/, "") || "image";
  return {
    file: new File([result], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    }),
    originalBytes: source.size,
    compressedBytes: result.size,
    width,
    height,
  };
}

export function formatImageBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
