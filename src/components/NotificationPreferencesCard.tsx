import { Bell, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNotificationPreferences, type NotificationPreferences } from "@/hooks/useNotificationPreferences";

interface ToggleRow {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}

const UPDATE_ROWS: ToggleRow[] = [
  { key: "show_messages", label: "Message updates", description: "New messages sent to your groups." },
  { key: "show_events", label: "Event updates", description: "Upcoming events you can attend." },
  { key: "show_tasks", label: "Task updates", description: "Approvals, role changes and other account updates." },
  { key: "show_files", label: "File updates", description: "Files shared with you in messages." },
];

const DELIVERY_ROWS: ToggleRow[] = [
  { key: "deliver_in_app", label: "Show in the Activity Center", description: "Turn this off to keep the bell panel empty." },
  { key: "deliver_toast", label: "Pop-up alerts", description: "Brief alerts while you are using the portal." },
  { key: "deliver_email_digest", label: "Email summary", description: "Saved for when email sending is switched on." },
];

export const NotificationPreferencesCard = () => {
  const { preferences, loading, saving, update } = useNotificationPreferences();
  const { toast } = useToast();

  const handleChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const saved = await update({ [key]: value } as Partial<NotificationPreferences>);
    toast(saved
      ? { title: "Preferences saved", description: "Your notification choices were updated." }
      : { title: "Could not save", description: "Please try again.", variant: "destructive" });
  };

  const renderRows = (rows: ToggleRow[]) => rows.map((row) => (
    <div key={row.key} className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <Label htmlFor={`pref-${row.key}`} className="font-medium">{row.label}</Label>
        <p className="text-sm text-muted-foreground">{row.description}</p>
      </div>
      <Switch
        id={`pref-${row.key}`}
        checked={Boolean(preferences[row.key])}
        disabled={loading || saving}
        onCheckedChange={(checked) => void handleChange(row.key, checked)}
      />
    </div>
  ));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell aria-hidden="true" className="h-5 w-5" />
          Notification preferences
          {(loading || saving) && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>Choose which updates appear in your Activity Center and how you are told about them.</CardDescription>
      </CardHeader>
      <CardContent>
        <section aria-labelledby="pref-updates">
          <h3 id="pref-updates" className="text-sm font-semibold">Updates to show</h3>
          <div className="divide-y">{renderRows(UPDATE_ROWS)}</div>
        </section>
        <Separator className="my-4" />
        <section aria-labelledby="pref-delivery">
          <h3 id="pref-delivery" className="text-sm font-semibold">How they reach you</h3>
          <div className="divide-y">{renderRows(DELIVERY_ROWS)}</div>
        </section>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferencesCard;
