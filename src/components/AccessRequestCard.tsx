import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type ApprovalStatus = "pending" | "approved" | "rejected" | null;

interface AccessRequestCardProps {
  onSubmitted?: () => void;
}

export const AccessRequestCard = ({ onSubmitted }: AccessRequestCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<ApprovalStatus>(null);
  const [rejectedReason, setRejectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("approval_status, rejected_reason")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      setStatus((data?.approval_status as ApprovalStatus) ?? null);
      setRejectedReason(data?.rejected_reason ?? null);
    } catch (error) {
      console.error("Error loading approval status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSubmit = async () => {
    if (notes.trim().length > 500) {
      toast({
        title: "Message too long",
        description: "Please keep your message under 500 characters.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_access_approval", {
        request_notes: notes.trim() || null,
      });
      if (error) throw error;

      toast({
        title: "Request submitted",
        description: "An administrator will review your request shortly.",
      });
      setNotes("");
      await fetchStatus();
      onSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting access request:", error);
      toast({
        title: "Could not submit request",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Approved employees don't need this card.
  if (status === "approved") return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Account access request</span>
          {status === "pending" && (
            <Badge variant="outline" className="flex items-center gap-1 text-amber-700 border-amber-300">
              <Clock className="w-3 h-3" /> Awaiting review
            </Badge>
          )}
          {status === "rejected" && (
            <Badge variant="outline" className="flex items-center gap-1 text-destructive border-destructive/40">
              <XCircle className="w-3 h-3" /> Rejected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {status === "pending" ? (
          <p className="text-sm text-muted-foreground">
            Your request has been sent to your administrator. You'll be notified as soon as it's reviewed.
          </p>
        ) : (
          <>
            {status === "rejected" && rejectedReason && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive mb-1">Reason for rejection</p>
                <p className="text-muted-foreground">{rejectedReason}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Send a request to your administrator to activate full access to the portal.
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: add your unit, supervisor, or anything the reviewer should know..."
              rows={3}
              maxLength={500}
              className="resize-none bg-background"
            />
            <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {status === "rejected" ? "Submit new request" : "Submit request"}
                </>
              )}
            </Button>
          </>
        )}

        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle className="w-3 h-3" /> Requests are reviewed by admins and department heads.
          <Link to="/access-status" className="underline underline-offset-2 hover:text-foreground">
            View request status
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};

export default AccessRequestCard;
