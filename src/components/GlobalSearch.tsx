import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, FileText, Loader2, MessageSquare, Search, User, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { PortalPermissions } from "@/lib/portalAccess";

type SearchKind = "message" | "event" | "employee" | "task" | "file";
type SearchFilter = "all" | SearchKind;
type SearchResult = { id: string; kind: SearchKind; title: string; description: string; url: string };

const filters: Array<{ value: SearchFilter; label: string }> = [
  { value: "all", label: "All" }, { value: "message", label: "Messages" },
  { value: "event", label: "Events" }, { value: "employee", label: "Employees" },
  { value: "task", label: "Tasks" }, { value: "file", label: "Files" },
];

const iconFor = (kind: SearchKind) => {
  if (kind === "message") return MessageSquare;
  if (kind === "event") return Calendar;
  if (kind === "employee") return User;
  if (kind === "file") return FileText;
  return ClipboardList;
};

export const GlobalSearch = ({ permissions }: { permissions: PortalPermissions }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const search = useCallback(async (term: string) => {
    const clean = term.trim();
    if (clean.length < 2) { setResults([]); setError(false); return; }
    setLoading(true); setError(false);
    try {
      const pattern = `%${clean.replace(/[%_]/g, "")}%`;
      const memberships = await supabase.from("chat_group_members").select("group_id");
      if (memberships.error) throw memberships.error;
      const groupIds = (memberships.data || []).map((row) => row.group_id);

      const messagePromise = groupIds.length
        ? supabase.from("messages").select("id,group_id,content,file_name,file_url,created_at").in("group_id", groupIds).or(`content.ilike.${pattern},file_name.ilike.${pattern}`).order("created_at", { ascending: false }).limit(12)
        : Promise.resolve({ data: [], error: null });
      const employeePromise = permissions.canManageUsers
        ? supabase.rpc("get_employee_details_admin")
        : supabase.rpc("get_department_colleagues");
      const [messages, events, employees, tasks] = await Promise.all([
        messagePromise,
        supabase.from("events").select("id,title,description,location,event_type,start_date").or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern},event_type.ilike.${pattern}`).order("start_date", { ascending: false }).limit(12),
        employeePromise,
        supabase.from("notifications").select("id,title,message,related_id,related_type,created_at").not("type", "in", '("message","event")').or(`title.ilike.${pattern},message.ilike.${pattern}`).order("created_at", { ascending: false }).limit(12),
      ]);
      const failed = [messages, events, employees, tasks].find((result) => result.error);
      if (failed?.error) throw failed.error;
      const q = clean.toLowerCase();
      const employeeRows = (employees.data || []).filter((person: any) => `${person.first_name || ""} ${person.last_name || ""} ${person.position || ""} ${person.email || ""}`.toLowerCase().includes(q)).slice(0, 12);
      setResults([
        ...(messages.data || []).map((message: any) => ({ id: message.id, kind: message.file_url ? "file" as const : "message" as const, title: message.file_url ? message.file_name || "Shared file" : message.content, description: message.file_url ? message.content || "Shared in a conversation" : "Message", url: `/messages?groupId=${message.group_id}&messageId=${message.id}` })),
        ...(events.data || []).map((event: any) => ({ id: event.id, kind: "event" as const, title: event.title, description: `${event.event_type}${event.location ? ` · ${event.location}` : ""}`, url: `/events?eventId=${event.id}` })),
        ...employeeRows.map((person: any) => ({ id: person.id, kind: "employee" as const, title: `${person.first_name || ""} ${person.last_name || ""}`.trim() || "Employee", description: person.position || "Employee", url: `/employees?employeeId=${person.id}` })),
        ...(tasks.data || []).map((task: any) => ({ id: task.id, kind: "task" as const, title: task.title, description: task.message, url: `/?activity=task&notificationId=${task.id}` })),
      ]);
    } catch (searchError) {
      console.error("Global search failed:", searchError);
      setResults([]); setError(true);
    } finally { setLoading(false); }
  }, [permissions.canManageUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => search(query), 300);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  const visible = useMemo(() => filter === "all" ? results : results.filter((result) => result.kind === filter), [filter, results]);
  const openResult = (result: SearchResult) => { setOpen(false); navigate(result.url); };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="min-h-11 gap-2 px-3" aria-label="Search portal">
        <Search className="h-4 w-4" /><span className="hidden lg:inline">Search portal</span><span className="hidden xl:inline text-xs text-muted-foreground">Ctrl K</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b p-4 pr-12 text-left">
            <DialogTitle>Search employee portal</DialogTitle>
            <DialogDescription>Find content you already have permission to view.</DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages, events, people, tasks, and files" className="h-11 pl-9" aria-label="Search all portal content" /></div>
            <div className="mt-3 flex gap-1 overflow-x-auto pb-1" aria-label="Search filters">
              {filters.map((option) => <Button key={option.value} size="sm" variant={filter === option.value ? "secondary" : "ghost"} onClick={() => setFilter(option.value)} aria-pressed={filter === option.value} className="min-h-10 flex-none">{option.label}</Button>)}
            </div>
          </div>
          <div className="max-h-[55vh] overflow-y-auto border-t p-2" aria-live="polite">
            {loading ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /><span className="sr-only">Searching</span></div>
              : query.trim().length < 2 ? <p className="p-8 text-center text-sm text-muted-foreground">Enter at least two characters to search.</p>
              : error ? <p className="p-8 text-center text-sm text-destructive">Search is temporarily unavailable.</p>
              : visible.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No matching results.</p>
              : <ul className="space-y-1">{visible.map((result) => { const Icon = iconFor(result.kind); return <li key={`${result.kind}-${result.id}`}><Button variant="ghost" onClick={() => openResult(result)} className="h-auto w-full justify-start gap-3 whitespace-normal p-3 text-left"><span className="rounded-md bg-muted p-2"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{result.title}</span><span className="block truncate text-xs text-muted-foreground">{result.description}</span></span><Badge variant="outline" className="capitalize">{result.kind}</Badge></Button></li>; })}</ul>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};