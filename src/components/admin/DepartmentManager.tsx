import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Loader2, Plus, Save, Users } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: string;
  name: string;
  description: string | null;
  head_user_id: string | null;
}

interface SimpleProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  department_id: string | null;
}

const NO_HEAD = 'none';

export const DepartmentManager: React.FC = () => {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<SimpleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [deptRes, profileRes] = await Promise.all([
      supabase.from('departments').select('id, name, description, head_user_id').order('name'),
      supabase.from('profiles').select('id, first_name, last_name, department_id').order('first_name'),
    ]);

    if (deptRes.error) {
      toast({ title: 'Error', description: 'Could not load departments.', variant: 'destructive' });
    } else {
      setDepartments(deptRes.data || []);
    }
    if (!profileRes.error) setProfiles(profileRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memberCount = (deptId: string) => profiles.filter((p) => p.department_id === deptId).length;
  const fullName = (p: SimpleProfile) => `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unnamed';

  const updateDepartment = async (dept: Department, changes: Partial<Department>) => {
    setSavingId(dept.id);
    const { error } = await supabase.from('departments').update(changes).eq('id', dept.id);
    setSavingId(null);

    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    setDepartments((prev) => prev.map((d) => (d.id === dept.id ? { ...d, ...changes } : d)));
    toast({ title: 'Department updated', description: `${changes.name ?? dept.name} was saved.` });
  };

  const createDepartment = async () => {
    if (!newName.trim()) {
      toast({ title: 'Name required', description: 'Enter a department name.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('departments').insert({
      name: newName.trim(),
      description: newDescription.trim() || null,
    });
    setCreating(false);

    if (error) {
      toast({ title: 'Could not create department', description: error.message, variant: 'destructive' });
      return;
    }
    setNewName('');
    setNewDescription('');
    toast({ title: 'Department created', description: 'The new department is now available.' });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-4 w-4" /> Add a department
          </CardTitle>
          <CardDescription>New departments appear in the sign-up form right away.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-dept-name">Name</Label>
            <Input
              id="new-dept-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Provincial Treasurer's Office"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-dept-desc">Description (optional)</Label>
            <Input
              id="new-dept-desc"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Handles provincial funds"
              maxLength={250}
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={createDepartment} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create department
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Accordion type="single" collapsible className="space-y-2 md:hidden">
          {departments.map((dept) => (
            <AccordionItem key={dept.id} value={dept.id} className="rounded-md border px-3">
              <AccordionTrigger className="gap-2 py-3 hover:no-underline">
                <span className="flex min-w-0 items-center gap-2 text-left">
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{dept.name}</span>
                  <Badge variant="secondary">{memberCount(dept.id)}</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <DepartmentFields dept={dept} profiles={profiles} saving={savingId === dept.id} onSave={updateDepartment} fullName={fullName} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="hidden space-y-4 md:block">
          {departments.map((dept) => (
            <DepartmentRow
              key={dept.id}
              dept={dept}
              profiles={profiles}
              members={memberCount(dept.id)}
              saving={savingId === dept.id}
              onSave={updateDepartment}
              fullName={fullName}
            />
          ))}
        </div>
        {departments.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No departments yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

interface RowProps {
  dept: Department;
  profiles: SimpleProfile[];
  members: number;
  saving: boolean;
  onSave: (dept: Department, changes: Partial<Department>) => void;
  fullName: (p: SimpleProfile) => string;
}

const DepartmentRow: React.FC<RowProps> = ({ dept, profiles, members, saving, onSave, fullName }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" />{dept.name}</CardTitle>
          <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{members} {members === 1 ? 'employee' : 'employees'}</Badge>
        </div>
      </CardHeader>
      <CardContent><DepartmentFields dept={dept} profiles={profiles} saving={saving} onSave={onSave} fullName={fullName} /></CardContent>
    </Card>
  );
};

const DepartmentFields: React.FC<Omit<RowProps, 'members'>> = ({ dept, profiles, saving, onSave, fullName }) => {
  const [name, setName] = useState(dept.name);
  const [description, setDescription] = useState(dept.description || '');
  const [head, setHead] = useState(dept.head_user_id || NO_HEAD);

  const dirty =
    name !== dept.name ||
    description !== (dept.description || '') ||
    head !== (dept.head_user_id || NO_HEAD);

  return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label>Department head</Label>
          <Select value={head} onValueChange={setHead}>
            <SelectTrigger>
              <SelectValue placeholder="Select a head" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value={NO_HEAD}>No head assigned</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {fullName(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={500}
          />
        </div>
        <div className="sm:col-span-2">
          <Button
            size="sm"
            disabled={!dirty || saving}
            onClick={() =>
              onSave(dept, {
                name: name.trim(),
                description: description.trim() || null,
                head_user_id: head === NO_HEAD ? null : head,
              })
            }
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>
  );
};

export default DepartmentManager;
