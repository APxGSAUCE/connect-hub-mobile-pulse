
-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
('Human Resources', 'Manages employee relations and policies'),
('Information Technology', 'Handles technology infrastructure and support'),
('Finance', 'Manages financial operations and budgeting'),
('Marketing', 'Handles marketing and promotional activities'),
('Operations', 'Manages day-to-day business operations'),
('Sales', 'Manages customer relationships and sales activities');

-- Update profiles table to include department and status
ALTER TABLE public.profiles ADD COLUMN department_id UUID REFERENCES public.departments(id);
ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'muted', 'blocked', 'inactive'));
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee'));
ALTER TABLE public.profiles ADD COLUMN phone TEXT;
ALTER TABLE public.profiles ADD COLUMN position TEXT;

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'training', 'social', 'announcement')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event participants table
CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'maybe')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create chat groups table
CREATE TABLE public.chat_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT DEFAULT 'group' CHECK (group_type IN ('direct', 'group', 'department')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat group members table
CREATE TABLE public.chat_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  related_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments (readable by all authenticated users)
CREATE POLICY "Departments are viewable by authenticated users" ON public.departments
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for profiles (updated)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for events
CREATE POLICY "Users can view all events" ON public.events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create events" ON public.events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own events" ON public.events
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own events" ON public.events
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- RLS Policies for event participants
CREATE POLICY "Users can view event participants" ON public.event_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage event participants for their events" ON public.event_participants
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own participation status" ON public.event_participants
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for chat groups
CREATE POLICY "Users can view groups they are members of" ON public.chat_groups
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members 
      WHERE group_id = id AND user_id = auth.uid()
    ) OR created_by = auth.uid()
  );

CREATE POLICY "Users can create chat groups" ON public.chat_groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" ON public.chat_groups
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members 
      WHERE group_id = id AND user_id = auth.uid() AND role = 'admin'
    ) OR created_by = auth.uid()
  );

-- RLS Policies for chat group members
CREATE POLICY "Users can view group members for their groups" ON public.chat_group_members
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members cgm 
      WHERE cgm.group_id = group_id AND cgm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can manage members" ON public.chat_group_members
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members 
      WHERE group_id = chat_group_members.group_id AND user_id = auth.uid() AND role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM public.chat_groups 
      WHERE id = chat_group_members.group_id AND created_by = auth.uid()
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their groups" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members 
      WHERE group_id = messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their groups" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_group_members 
      WHERE group_id = messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE TO authenticated USING (auth.uid() = sender_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Update the handle_new_user function to include department
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    CASE 
      WHEN NEW.raw_user_meta_data->>'department_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'department_id')::UUID
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create direct message group
CREATE OR REPLACE FUNCTION public.create_direct_message_group(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  group_id UUID;
BEGIN
  -- Check if direct message group already exists
  SELECT cg.id INTO group_id
  FROM public.chat_groups cg
  JOIN public.chat_group_members cgm1 ON cg.id = cgm1.group_id
  JOIN public.chat_group_members cgm2 ON cg.id = cgm2.group_id
  WHERE cg.group_type = 'direct'
    AND cgm1.user_id = auth.uid()
    AND cgm2.user_id = other_user_id
    AND (SELECT COUNT(*) FROM public.chat_group_members WHERE group_id = cg.id) = 2;

  -- If not exists, create new direct message group
  IF group_id IS NULL THEN
    INSERT INTO public.chat_groups (name, group_type, created_by)
    VALUES ('Direct Message', 'direct', auth.uid())
    RETURNING id INTO group_id;

    -- Add both users to the group
    INSERT INTO public.chat_group_members (group_id, user_id, role)
    VALUES 
      (group_id, auth.uid(), 'admin'),
      (group_id, other_user_id, 'admin');
  END IF;

  RETURN group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user statistics for dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_messages', (
      SELECT COUNT(*) FROM public.messages m
      JOIN public.chat_group_members cgm ON m.group_id = cgm.group_id
      WHERE cgm.user_id = user_id
    ),
    'unread_messages', (
      SELECT COUNT(*) FROM public.messages m
      JOIN public.chat_group_members cgm ON m.group_id = cgm.group_id
      WHERE cgm.user_id = user_id 
        AND m.sender_id != user_id
        AND m.created_at > COALESCE(cgm.joined_at, '1970-01-01'::timestamp)
    ),
    'upcoming_events', (
      SELECT COUNT(*) FROM public.events e
      LEFT JOIN public.event_participants ep ON e.id = ep.event_id AND ep.user_id = user_id
      WHERE e.start_date > NOW()
        AND (ep.user_id IS NULL OR ep.status IN ('invited', 'accepted', 'maybe'))
    ),
    'total_employees', (
      SELECT COUNT(*) FROM public.profiles WHERE status = 'active'
    ),
    'unread_notifications', (
      SELECT COUNT(*) FROM public.notifications WHERE user_id = user_id AND is_read = false
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
