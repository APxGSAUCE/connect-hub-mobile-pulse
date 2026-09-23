import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Bell, Calendar, Check, CheckCircle2, FileText, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

type ActivityKind = "message" | "event" | "task" | "file";
type ActivityFilter = "all" | ActivityKind;

interface ActivityItem {
  id: string;
  sourceId: string;
  kind: ActivityKind;
  title: string;
  description: string;
  createdAt: string;
  unread: boolean;
  notificationId?: string;
}

interface NotificationCenterProps {
  unreadCount: number;
  onCountChange: (count: number) => void;
  onNavigate?: (section: "messages" | "events" | "employees" | "admin") => void;
}

const FILTERS: Array<{ value: ActivityFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "message", label: "Messages" },
  { value: "event", label: "Events" },
  { value: "task", label: "Tasks" },
  { value: "file", label: "Files" },
];

export const NotificationCenter = ({ unreadCount, onCountChange, onNavigate }: NotificationCenterProps) => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const hasLoaded = useRef(false);
  // Keep the latest parent callback in a ref so an inline arrow in Index.tsx
  // cannot change fetchActivity's identity and retrigger the effect loop.
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const fetchActivity = useCallback(async () => {
    if (!user) return;
    if (!hasLoaded.current) setLoading(true);

    try {
      const [notificationsResult, eventsResult, membershipsResult] = await Promise.all([
        supabase.from("notifications").select("id,title,message,type,is_read,created_at,related_id,related_type").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("events").select("id,title,start_date,location,event_type").gte("start_date", new Date().toISOString()).order("start_date", { ascending: true }).limit(20),
        supabase.from("chat_group_members").select("group_id").eq("user_id", user.id),
      ]);

      if (notificationsResult.error) throw notificationsResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (membershipsResult.error) throw membershipsResult.error;

      const groupIds = (membershipsResult.data || []).map((membership) => membership.group_id);
      const messagesResult = groupIds.length
        ? await supabase.from("messages").select("id,content,created_at,sender_id,file_url,file_name").in("group_id", groupIds).neq("sender_id", user.id).order("created_at", { ascending: false }).limit(50)
        : { data: [], error: null };
      if (messagesResult.error) throw messagesResult.error;

      const messageIds = (messagesResult.data || []).map((message) => message.id);
      const receiptsResult = messageIds.length
        ? await supabase.from("message_read_receipts").select("message_id").eq("user_id", user.id).in("message_id", messageIds)
        : { data: [], error: null };
      if (receiptsResult.error) throw receiptsResult.error;
      const readMessageIds = new Set((receiptsResult.data || []).map((receipt) => receipt.message_id));

      const notificationItems: ActivityItem[] = (notificationsResult.data || [])
        .filter((notification) => notification.type !== "message" && notification.type !== "event")
        .map((notification) => ({
          id: `notification-${notification.id}`,
          sourceId: notification.related_id || notification.id,
          notificationId: notification.id,
          kind: "task",
          title: notification.title,
          description: notification.message,
          createdAt: notification.created_at,
          unread: !notification.is_read,
        }));

      const messageItems: ActivityItem[] = (messagesResult.data || []).map((message) => ({
        id: `message-${message.id}`,
        sourceId: message.id,
        kind: message.file_url ? "file" : "message",
        title: message.file_url ? (message.file_name || "Shared file") : "New message",
        description: message.file_url ? (message.content || "A file was shared with you") : message.content,
        createdAt: message.created_at || new Date().toISOString(),
        unread: !readMessageIds.has(message.id),
      }));

      const eventItems: ActivityItem[] = (eventsResult.data || []).map((event) => ({
        id: `event-${event.id}`,
        sourceId: event.id,
        kind: "event",
        title: event.title,
        description: `${new Date(event.start_date).toLocaleString()}${event.location ? ` · ${event.location}` : ""}`,
        createdAt: event.start_date,
        unread: false,
      }));

      const nextItems = [...notificationItems, ...messageItems, ...eventItems]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(nextItems);
      onCountChange(nextItems.filter((item) => item.unread).length);
    } catch (error) {
      console.error("Error fetching activity:", error);
      toast({ title: "Activity unavailable", description: "Could not load the latest activity.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [onCountChange, toast, user]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);
  useEffect(() => {
    const activity = searchParams.get("activity");
    if (!activity || !["message", "event", "task", "file"].includes(activity)) return;
    setFilter(activity as ActivityKind);
    setIsOpen(true);
  }, [searchParams]);
  useRealtimeSubscription("messages", fetchActivity, [user]);
  useRealtimeSubscription("events", fetchActivity, [user]);
  useRealtimeSubscription("notifications", fetchActivity, [user]);

  const visibleItems = useMemo(() => filter === "all" ? items : items.filter((item) => item.kind === filter), [filter, items]);
  const groupedItems = useMemo(() => {
    const order: ActivityKind[] = ["message", "event", "task", "file"];
    return order
      .map((kind) => ({
        kind,
        label: kind === "message" ? "Unread Messages" : kind === "event" ? "Upcoming Events" : kind === "task" ? "Task Updates" : "File Activity",
        items: visibleItems.filter((item) => item.kind === kind),
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleItems]);
  const countFor = (kind: ActivityFilter) => kind === "all" ? items.length : items.filter((item) => item.kind === kind).length;

  const markAsRead = async (item: ActivityItem) => {
    if (!user || !item.unread) return;
    try {
      if (item.notificationId) {
        const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", item.notificationId).eq("user_id", user.id);
        if (error) throw error;
      } else if (item.kind === "message" || item.kind === "file") {
        const { error } = await supabase.rpc("mark_message_as_read", { message_id_param: item.sourceId, user_id_param: user.id });
        if (error) throw error;
      }
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, unread: false } : entry));
      onCountChange(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Error marking activity as read:", error);
      toast({ title: "Update failed", description: "Could not mark this item as read.", variant: "destructive" });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const unreadNotifications = items.filter((item) => item.unread && item.notificationId);
      const unreadMessages = items.filter((item) => item.unread && !item.notificationId && (item.kind === "message" || item.kind === "file"));
      const notificationUpdate = unreadNotifications.length
        ? supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false)
        : Promise.resolve({ error: null });
      const results = await Promise.all([
        notificationUpdate,
        ...unreadMessages.map((item) => supabase.rpc("mark_message_as_read", { message_id_param: item.sourceId, user_id_param: user.id })),
      ]);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
      setItems((current) => current.map((item) => ({ ...item, unread: false })));
      onCountChange(0);
      toast({ title: "Activity updated", description: "Everything is marked as read." });
    } catch (error) {
      console.error("Error marking all activity as read:", error);
      toast({ title: "Update failed", description: "Could not mark all activity as read.", variant: "destructive" });
    }
  };

  const openItem = async (item: ActivityItem) => {
    await markAsRead(item);
    setIsOpen(false);
    if (item.kind === "message" || item.kind === "file") onNavigate?.("messages");
    if (item.kind === "event") onNavigate?.("events");
    if (item.kind === "task") onNavigate?.("employees");
  };

  const iconFor = (kind: ActivityKind) => {
    if (kind === "message") return <MessageSquare aria-hidden="true" className="h-4 w-4" />;
    if (kind === "event") return <Calendar aria-hidden="true" className="h-4 w-4" />;
    if (kind === "file") return <FileText aria-hidden="true" className="h-4 w-4" />;
    return <AlertCircle aria-hidden="true" className="h-4 w-4" />;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative min-h-11 min-w-11" aria-label={`Activity center${unreadCount ? `, ${unreadCount} unread` : ""}`}>
          <Bell aria-hidden="true" />
          {unreadCount > 0 && <Badge aria-hidden="true" className="absolute right-0 top-0 h-5 min-w-5 justify-center px-1 text-[10px]">{unreadCount > 99 ? "99+" : unreadCount}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-[min(100vw,28rem)] flex-col p-0" side="right" showClose={false}
        onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }}
        onTouchEnd={(event) => { const touch = event.changedTouches[0]; if (!touchStart.current) return; const dx = touch.clientX - touchStart.current.x; const dy = touch.clientY - touchStart.current.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) setIsOpen(false); touchStart.current = null; }}>
        <SheetHeader className="border-b p-4 text-left">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="min-h-11 min-w-11" aria-label="Close activity center"><ArrowLeft aria-hidden="true" /></Button>
            <div className="min-w-0 flex-1">
              <SheetTitle>Activity Center</SheetTitle>
              <p className="text-sm text-muted-foreground" aria-live="polite">{unreadCount} unread item{unreadCount === 1 ? "" : "s"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchActivity} className="min-h-11 min-w-11" aria-label="Refresh activity"><RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} /></Button>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Filter activity">
            {FILTERS.map((option) => <Button key={option.value} type="button" size="sm" variant={filter === option.value ? "secondary" : "ghost"} aria-pressed={filter === option.value} onClick={() => setFilter(option.value)} className="min-h-11 flex-none">{option.label}<Badge variant="outline">{countFor(option.value)}</Badge></Button>)}
          </div>
          {unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllAsRead} className="min-h-11 self-start"><CheckCircle2 aria-hidden="true" />Mark all read</Button>}
        </SheetHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center" role="status"><Loader2 aria-hidden="true" className="animate-spin" /><span className="sr-only">Loading activity</span></div>
          ) : visibleItems.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center"><Bell aria-hidden="true" className="mb-3 h-10 w-10 text-muted-foreground" /><p className="font-medium">No activity here</p><p className="text-sm text-muted-foreground">New updates will appear automatically.</p></div>
          ) : (
            <div aria-label={`${FILTERS.find((option) => option.value === filter)?.label} activity`}>
              {groupedItems.map((group) => (
                <section key={group.kind} aria-labelledby={`activity-${group.kind}`}>
                  <div className="sticky top-0 z-10 flex items-center justify-between border-y bg-muted px-4 py-2">
                    <h3 id={`activity-${group.kind}`} className="text-sm font-semibold">{group.label}</h3>
                    <Badge variant="outline">{group.items.length}</Badge>
                  </div>
                  <ul className="divide-y">
                    {group.items.map((item) => (
                      <li key={item.id} className={item.unread ? "bg-accent/70" : "bg-background"}>
                        <div className="flex items-start gap-3 p-4">
                          <span className="mt-1 rounded-md bg-muted p-2 text-foreground">{iconFor(item.kind)}</span>
                          <Button variant="ghost" onClick={() => openItem(item)} className="h-auto min-w-0 flex-1 justify-start whitespace-normal p-0 text-left hover:bg-transparent">
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.title}</span><Badge variant={item.unread ? "default" : "outline"}>{item.unread ? "Unread" : item.kind === "event" ? "Upcoming" : "Read"}</Badge></span>
                              <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
                              <span className="mt-2 block text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
                            </span>
                          </Button>
                          {item.unread && <Button variant="ghost" size="icon" onClick={() => markAsRead(item)} className="min-h-11 min-w-11" aria-label={`Mark ${item.title} as read`}><Check aria-hidden="true" /></Button>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};