import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Eye, EyeOff, KeyRound, Loader2, Save, Send, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface Department {
  id: string;
  name: string;
}

interface RoleRequest {
  id: string;
  desired_role: AppRole;
  status: Database['public']['Enums']['approval_status'];
  created_at: string;
  review_notes: string | null;
}

const roleLabels: Record<AppRole, string> = {
  employee: 'Employee',
  dept_head: 'Department Head',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const AdminAccountSettings: React.FC<{ currentRole: AppRole; onChanged: () => void }> = ({
  currentRole,
  onChanged,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('none');
  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);
  const [desiredRole, setDesiredRole] = useState<AppRole>(currentRole);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'password' | 'department' | 'role' | null>(null);

  const loadSettings = async () => {
    if (!user) return;
    setLoading(true);
    const [departmentResult, profileResult, roleRequestResult] = await Promise.all([
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('profiles').select('department_id').eq('id', user.id).maybeSingle(),
      supabase
        .from('role_change_requests')
        .select('id, desired_role, status, created_at, review_notes')
        .eq('requested_by', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setDepartments(departmentResult.data || []);
    setDepartmentId(profileResult.data?.department_id || 'none');
    setRoleRequest(roleRequestResult.data || null);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || password.length > 72) {
      toast({ title: 'Password not accepted', description: 'Use between 8 and 72 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Enter the same password twice.', variant: 'destructive' });
      return;
    }

    setSaving('password');
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(null);
    if (error) {
      const description = /leaked|pwned|compromis/i.test(error.message)
        ? 'This password appears in a known breach. Choose a different one.'
        : error.message;
      toast({ title: 'Password not changed', description, variant: 'destructive' });
      return;
    }
    setPassword('');
    setConfirmPassword('');
    toast({ title: 'Password changed', description: 'Your new password is active.' });
  };

  const updateDepartment = async () => {
    if (!user) return;
    setSaving('department');
    const { error } = await supabase
      .from('profiles')
      .update({ department_id: departmentId === 'none' ? null : departmentId })
      .eq('id', user.id);
    setSaving(null);
    if (error) {
      toast({ title: 'Department not changed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Department changed', description: 'Your profile now shows the selected department.' });
    onChanged();
  };

  const submitRoleRequest = async () => {
    if (desiredRole === currentRole) {
      toast({ title: 'Choose a different role', description: 'Your selected role is already active.', variant: 'destructive' });
      return;
    }
    setSaving('role');
    const { error } = await supabase.rpc('submit_role_change_request', { _requested_role: desiredRole });
    setSaving(null);
    if (error) {
      toast({ title: 'Request not sent', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Request sent', description: 'A different Super Admin must approve the role change.' });
    loadSettings();
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> Change password</CardTitle>
          <CardDescription>Set a new password for your signed-in administrator account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={updatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-new-password">New password</Label>
              <div className="relative">
                <Input id="admin-new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="pr-11" required />
                <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-0 top-0" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-confirm-password">Confirm password</Label>
              <Input id="admin-confirm-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={saving === 'password'}>
              {saving === 'password' ? <Loader2 className="animate-spin" /> : <KeyRound />} Update password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> My department</CardTitle>
          <CardDescription>Choose the department shown on your administrator profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger aria-label="My department"><SelectValue placeholder="Select a department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No department</SelectItem>
              {departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="w-full sm:w-auto" onClick={updateDepartment} disabled={saving === 'department'}>
            {saving === 'department' ? <Loader2 className="animate-spin" /> : <Save />} Save department
          </Button>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> My role</CardTitle>
          <CardDescription>A different Super Admin must approve changes to your own role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Current role</span>
            <Badge variant="outline">{roleLabels[currentRole]}</Badge>
            {roleRequest && <Badge variant={roleRequest.status === 'rejected' ? 'destructive' : 'secondary'}>Latest request: {roleRequest.status}</Badge>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={desiredRole} onValueChange={(value: AppRole) => setDesiredRole(value)} disabled={roleRequest?.status === 'pending'}>
              <SelectTrigger className="sm:max-w-xs" aria-label="Requested role"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(roleLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={submitRoleRequest} disabled={saving === 'role' || roleRequest?.status === 'pending'}>
              {saving === 'role' ? <Loader2 className="animate-spin" /> : <Send />} Request role change
            </Button>
          </div>
          {roleRequest?.status === 'pending' && <p className="text-xs text-muted-foreground">Your request is waiting for another Super Admin.</p>}
          {roleRequest?.status === 'rejected' && roleRequest.review_notes && <p className="text-xs text-destructive">Review note: {roleRequest.review_notes}</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccountSettings;