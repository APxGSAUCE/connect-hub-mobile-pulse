import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface RequestRow {
  id: string;
  requested_by: string;
  previous_role: AppRole;
  desired_role: AppRole;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

const label = (role: AppRole) => role.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const RoleChangeRequests: React.FC<{ enabled: boolean; onChanged: () => void }> = ({ enabled, onChanged }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!enabled) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('role_change_requests')
      .select('id, requested_by, previous_role, desired_role, created_at, profiles!role_change_requests_requested_by_fkey(first_name, last_name, email)')
      .eq('status', 'pending')
      .order('created_at');
    if (error) toast({ title: 'Could not load role requests', description: error.message, variant: 'destructive' });
    setRequests((data || []) as RequestRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const review = async (request: RequestRow, approve: boolean) => {
    if (request.requested_by === user?.id) {
      toast({ title: 'Another Super Admin is required', description: 'You cannot review your own role request.', variant: 'destructive' });
      return;
    }
    setBusyId(request.id);
    const { error } = await supabase.rpc('review_role_change_request', {
      _request_id: request.id,
      _approve: approve,
      _review_notes: null,
    });
    setBusyId(null);
    if (error) {
      toast({ title: 'Request not updated', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: approve ? 'Role change approved' : 'Role change rejected', description: 'The requester has been notified.' });
    loadRequests();
    onChanged();
  };

  if (!enabled) return null;
  if (loading) return <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Role requests</CardTitle>
        <CardDescription>Changes require a different Super Admin.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No pending role requests.</p>}
        {requests.map((request) => {
          const name = `${request.profiles?.first_name || ''} ${request.profiles?.last_name || ''}`.trim() || request.profiles?.email || 'Administrator';
          const ownRequest = request.requested_by === user?.id;
          return (
            <div key={request.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{label(request.previous_role)}</Badge>
                  <span>to</span>
                  <Badge>{label(request.desired_role)}</Badge>
                </div>
              </div>
              {ownRequest ? (
                <span className="text-xs text-muted-foreground">Awaiting another Super Admin</span>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => review(request, true)} disabled={busyId === request.id}><Check /> Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => review(request, false)} disabled={busyId === request.id}><X /> Reject</Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default RoleChangeRequests;