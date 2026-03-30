import { useState, useEffect } from "react";
import { getSignedFileUrl } from "@/lib/storageUtils";

/**
 * Hook to resolve a storage file path to a signed URL.
 * Handles both file paths and legacy full URLs.
 */
export function useSignedUrl(pathOrUrl: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pathOrUrl) {
      setSignedUrl(null);
      return;
    }

    let cancelled = false;
    getSignedFileUrl(pathOrUrl).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });

    return () => { cancelled = true; };
  }, [pathOrUrl]);

  return signedUrl;
}
