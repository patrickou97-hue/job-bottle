import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

const LOGO_BUCKET = "company-logos";
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export function validateLogoFile(file: File) {
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return "请上传 PNG、JPG、WebP 或 SVG 图片。";
  }
  if (file.size > MAX_LOGO_SIZE) {
    return "图片不能超过 2MB。";
  }
  return "";
}

export async function uploadCompanyLogo(
  supabase: SupabaseClient<Database>,
  file: File,
) {
  const validationMessage = validateLogoFile(file);
  if (validationMessage) throw new Error(validationMessage);

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `logos/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);

  return publicUrl;
}
