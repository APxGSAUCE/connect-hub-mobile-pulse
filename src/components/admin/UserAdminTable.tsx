import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  status: string | null;
  approval_status: 'pending' | 'approved' | 'rejected' | null;
  department_id: string | null;
  position: string | null;
}

interface Props {
  users: AdminUser[];
  canEditRoles: boolean;
  currentUserId?: string;
  onChanged: () => void;
}

const roleOptions = [
  { value: 'employee', label: 'Employee' },
  { value: 'dept_head', label: 'Dept Head' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const approvalOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const roleBadge = (role: string | null) => {
  switch (role) {
    case 'super_admin':
      return 'bg-destructive/10 text-destructive';
    case 'admin':
      return 'bg-primary/10 text-primary';
    case 'dept_head':
      return 'bg-accent text-accent-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const approvalBadge = (status: string | null) => {
  switch (status) {
    case 'approved':
      return 'bg-primary/10 text-primary';
    case 'rejected':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const UserAdminTable: React.FC<Props> = ({ users, canEditRoles, currentUserId, onChanged }) => {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('departments')
      .select('id, name')
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((d) => {
          map[d.id] = d.name;
        });
        setDepartments(map);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.first_name, u.last_name, u.email, u.position, u.role]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [users, query]);

  const initials = (u: AdminUser) =>
    `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || '?';

  const updateField = async (userId: string, changes: Record<string, unknown>, label: string) => {
    setBusyId(userId);
    const { error } = await supabase.from('profiles').update(changes).eq('id', userId);
    setBusyId(null);

    if (error) {
      toast({ title: `Could not update ${label}`, description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved', description: `${label} updated.` });
    onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-4 w-4" /> Roles &amp; approval status
        </CardTitle>
        <CardDescription>
          Change a person's role and whether their account is approved.
        </CardDescription>
        <div className="relative pt-2">
          <Search className="absolute left-3 top-5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or position"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filtered.map((u) => (
          <div key={u.id} className="rounded-lg border p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials(u)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unnamed employee'}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {departments[u.department_id || ''] || 'No department'}
                    {u.position ? ` · ${u.position}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${roleBadge(u.role)} text-xs`}>
                  {u.role === 'dept_head' ? 'Dept Head' : u.role || 'employee'}
                </Badge>
                <Badge className={`${approvalBadge(u.approval_status)} text-xs`}>
                  {u.approval_status || 'pending'}
                </Badge>
                {busyId === u.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

                {canEditRoles && (
                  <Select
                    value={u.role || 'employee'}
                    onValueChange={(value) => updateField(u.id, { role: value }, 'role')}
                    disabled={busyId === u.id || u.id === currentUserId}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select
                  value={u.approval_status || 'pending'}
                  onValueChange={(value) =>
                    updateField(
                      u.id,
                      {
                        approval_status: value,
                        approved_at: value === 'approved' ? new Date().toISOString() : null,
                        approved_by: value === 'approved' ? currentUserId ?? null : null,
                      },
                      'approval status'
                    )
                  }
                  disabled={busyId === u.id || u.id === currentUserId}
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {approvalOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No matching employees.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default UserAdminTable;
