import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Clock, CheckCircle2, XCircle, FileClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AccessRequestCard from "@/components/AccessRequestCard";

type ApprovalStatus = "pending" | "approved" | "rejected" | null;

interface AuditEntry {
  id: string;
  action: string;
  outcome: string;
  notes: string | null;
  error_message: string | null;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  request_submitted: "Request submitted",
  request_approved: "Request approved",
  request_rejected: "Request rejected",
};

const AccessStatus = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ApprovalStatus>(null);
  const [rejectedReason, setRejectedReason] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<string | null>(null);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [profileRes, auditRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("approval_status, rejected_reason, approval_notes, approved_at")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("access_request_audit")
          .select("id, action, outcome, notes, error_message, created_at")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (profileRes.data) {
        setStatus((profileRes.data.approval_status as ApprovalStatus) ?? null);
        setRejectedReason(profileRes.data.rejected_reason ?? null);
        setApprovalNotes(profileRes.data.approval_notes ?? null);
        setApprovedAt(profileRes.data.approved_at ?? null);
      }
      setHistory(auditRes.data ?? []);
    } catch (error) {
      console.error("Error loading access status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const statusBadge = () => {
    if (status === "approved")
      return (
        <Badge className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/10">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </Badge>
      );
    if (status === "rejected")
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-destructive border-destructive/40">
          <XCircle className="w-3 h-3" /> Rejected
        </Badge>
      );
    if (status === "pending")
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pending review
        </Badge>
      );
    return <Badge variant="secondary">No request yet</Badge>;
  };

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to portal
          </Link>
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base sm:text-lg">
              <span>My access request</span>
              {!loading && statusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {status === "approved" && (
                  <p className="text-sm text-muted-foreground">
                    Your account is approved{approvedAt ? ` since ${new Date(approvedAt).toLocaleDateString()}` : ""}. You
                    have full access to the portal.
                  </p>
                )}
                {status === "pending" && (
                  <p className="text-sm text-muted-foreground">
                    Your request is waiting for review by an administrator or your department head.
                  </p>
                )}
                {status === "rejected" && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <p className="font-medium text-destructive mb-1">Reason for rejection</p>
                    <p className="text-muted-foreground">{rejectedReason || "No reason provided."}</p>
                  </div>
                )}
                {approvalNotes && status !== "rejected" && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Your note: </span>
                    {approvalNotes}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {!loading && status !== "approved" && <AccessRequestCard onSubmitted={load} />}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileClock className="w-4 h-4" /> History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-border pl-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {actionLabels[entry.action] ?? entry.action}
                      </span>
                      {entry.outcome !== "success" && (
                        <Badge variant="outline" className="text-destructive border-destructive/40 text-xs">
                          Failed
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
                    {entry.error_message && (
                      <p className="text-xs text-destructive mt-1">{entry.error_message}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessStatus;
