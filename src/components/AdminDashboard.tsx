import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, UserCheck, UserX, Clock, Shield, Building2, LayoutDashboard, Loader2, RefreshCw, MailPlus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ApprovalCenter } from '@/components/ApprovalCenter';
import { DepartmentManager } from '@/components/admin/DepartmentManager';
import { UserAdminTable, AdminUser } from '@/components/admin/UserAdminTable';
import { InviteEmployee } from '@/components/admin/InviteEmployee';

type Section = 'overview' | 'users' | 'departments' | 'approvals' | 'invite';

const navItems: { key: Section; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Key numbers at a glance' },
  { key: 'invite', label: 'Invite Employee', icon: MailPlus, description: 'Add a new person to the portal' },
  { key: 'users', label: 'Roles & Status', icon: Users, description: 'Roles and approval status' },
  { key: 'departments', label: 'Departments', icon: Building2, description: 'Departments and heads' },
  { key: 'approvals', label: 'Approvals', icon: Clock, description: 'Review new requests' },
];

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [section, setSection] = useState<Section>('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [roleRes, profileRes, deptRes] = await Promise.all([
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id ?? '')
        .order('role', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, status, approval_status, department_id, position')
        .order('created_at', { ascending: false }),
      supabase.from('departments').select('id', { count: 'exact', head: true }),
    ]);

    setUserRole(roleRes.data?.role || 'employee');

    if (profileRes.error) {
      toast({ title: 'Error', description: 'Could not load employees.', variant: 'destructive' });
    } else {
      setUsers((profileRes.data || []) as AdminUser[]);
    }
    setDepartmentCount(deptRes.count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const stats = useMemo(() => {
    const pending = users.filter((u) => (u.approval_status || 'pending') === 'pending').length;
    const approved = users.filter((u) => u.approval_status === 'approved').length;
    const rejected = users.filter((u) => u.approval_status === 'rejected').length;
    const admins = users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;
    const deptHeads = users.filter((u) => u.role === 'dept_head').length;
    return { pending, approved, rejected, admins, deptHeads, total: users.length };
  }, [users]);

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">Access denied</h3>
          <p className="text-sm text-muted-foreground">
            You don't have permission to open the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage departments, roles and account approvals in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Sidebar */}
        <nav className="flex gap-2 overflow-x-auto rounded-lg border bg-card p-2 lg:w-64 lg:flex-col lg:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={`flex flex-shrink-0 items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors lg:w-full ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap font-medium">{item.label}</span>
                {item.key === 'approvals' && stats.pending > 0 && (
                  <span className="ml-auto rounded-full bg-destructive px-2 text-xs text-destructive-foreground">
                    {stats.pending}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-4">
          {section === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatCard label="Total employees" value={stats.total} icon={Users} />
                <StatCard label="Pending approvals" value={stats.pending} icon={Clock} />
                <StatCard label="Approved" value={stats.approved} icon={UserCheck} />
                <StatCard label="Rejected" value={stats.rejected} icon={UserX} />
                <StatCard label="Departments" value={departmentCount} icon={Building2} />
                <StatCard label="Admins & heads" value={stats.admins + stats.deptHeads} icon={Shield} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick actions</CardTitle>
                  <CardDescription>Jump straight to what needs attention.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  {navItems
                    .filter((i) => i.key !== 'overview')
                    .map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSection(item.key)}
                        className="rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                      >
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </button>
                    ))}
                </CardContent>
              </Card>
            </>
          )}

          {section === 'users' && (
            <UserAdminTable
              users={users}
              canEditRoles={userRole === 'super_admin'}
              currentUserId={user?.id}
              onChanged={fetchAll}
            />
          )}

          {section === 'departments' && <DepartmentManager />}

          {section === 'approvals' && <ApprovalCenter />}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; icon: React.ElementType }> = ({
  label,
  value,
  icon: Icon,
}) => (
  <Card className="transition-shadow hover:shadow-md">
    <CardContent className="flex items-center justify-between p-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className="ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </CardContent>
  </Card>
);

export default AdminDashboard;
