import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationPreferences {
  show_messages: boolean;
  show_events: boolean;
  show_tasks: boolean;
  show_files: boolean;
  deliver_in_app: boolean;
  deliver_toast: boolean;
  deliver_email_digest: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  show_messages: true,
  show_events: true,
  show_tasks: true,
  show_files: true,
  deliver_in_app: true,
  deliver_toast: true,
  deliver_email_digest: false,
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("show_messages,show_events,show_tasks,show_files,deliver_in_app,deliver_toast,deliver_email_digest")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) console.error("Error loading notification preferences:", error);
    if (data && !Array.isArray(data)) setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...data });
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const update = useCallback(async (changes: Partial<NotificationPreferences>) => {
    if (!userId) return false;
    const next = { ...preferences, ...changes };
    setPreferences(next);
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      console.error("Error saving notification preferences:", error);
      setPreferences(preferences);
      return false;
    }
    return true;
  }, [preferences, userId]);

  const allowsKind = useMemo(() => (kind: "message" | "event" | "task" | "file") => {
    if (!preferences.deliver_in_app) return false;
    if (kind === "message") return preferences.show_messages;
    if (kind === "event") return preferences.show_events;
    if (kind === "file") return preferences.show_files;
    return preferences.show_tasks;
  }, [preferences]);

  return { preferences, loading, saving, update, reload: load, allowsKind };
};
