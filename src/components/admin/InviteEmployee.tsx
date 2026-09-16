import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MailPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  canGrantAdmin: boolean;
  onInvited: () => void;
}

const emptyForm = {
  email: '',
  first_name: '',
  last_name: '',
  position: '',
  employee_id: '',
  department_id: 'none',
  role: 'employee',
};

export const InviteEmployee: React.FC<Props> = ({ canGrantAdmin, onInvited }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...emptyForm });
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase
      .from('departments')
      .select('id, name')
      .order('name')
      .then(({ data }) => setDepartments(data || []));
  }, []);

  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.first_name.trim() || !form.last_name.trim()) {
      toast({ title: 'Missing details', description: 'Email, first name and last name are required.', variant: 'destructive' });
      return;
    }

    setSending(true);
    const { data, error } = await supabase.functions.invoke('invite-employee', {
      body: {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        position: form.position,
        employee_id: form.employee_id,
        department_id: form.department_id === 'none' ? null : form.department_id,
        role: form.role,
        redirect_to: `${window.location.origin}/reset-password`,
      },
    });
    setSending(false);

    const message = (data as { error?: string } | null)?.error || error?.message;
    if (message) {
      toast({ title: 'Invitation not sent', description: message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Invitation sent', description: `${form.email} can now set a password from their email.` });
    setForm({ ...emptyForm });
    onInvited();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MailPlus className="h-4 w-4" /> Invite an employee
        </CardTitle>
        <CardDescription>
          Send an email invitation, set the person's role and department, and their account starts approved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="name@ilocossur.gov.ph"
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-first">First name</Label>
            <Input id="invite-first" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-last">Last name</Label>
            <Input id="invite-last" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-position">Position</Label>
            <Input id="invite-position" value={form.position} onChange={(e) => set('position', e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-employee-id">Employee ID</Label>
            <Input id="invite-employee-id" value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} maxLength={40} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={(v) => set('department_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No department</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set('role', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="dept_head">Dept Head</SelectItem>
                {canGrantAdmin && <SelectItem value="admin">Admin</SelectItem>}
                {canGrantAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={sending} className="w-full sm:w-auto">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailPlus className="mr-2 h-4 w-4" />}
              Send invitation
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default InviteEmployee;
