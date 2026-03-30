import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Generate a signed URL for a file in the 'files' bucket.
 * If the value is already a full URL (legacy data), extract the path.
 */
export async function getSignedFileUrl(pathOrUrl: string): Promise<string | null> {
  if (!pathOrUrl) return null;

  let filePath = pathOrUrl;

  // Handle legacy full URLs - extract the path after '/object/public/files/'
  const publicMatch = pathOrUrl.match(/\/object\/(?:public|sign)\/files\/(.+?)(?:\?.*)?$/);
  if (publicMatch) {
    filePath = decodeURIComponent(publicMatch[1]);
  } else if (pathOrUrl.startsWith('http')) {
    // External URL (e.g. user-provided image URL) - return as-is
    return pathOrUrl;
  }

  const { data, error } = await supabase.storage
    .from('files')
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}
