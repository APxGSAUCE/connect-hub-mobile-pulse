
-- Add foreign key constraint for messages.sender_id to reference profiles.id
ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Ensure departments table has some default data if it's empty
INSERT INTO public.departments (name, description) 
SELECT * FROM (VALUES 
  ('Human Resources', 'HR Department'),
  ('Information Technology', 'IT Department'),
  ('Finance', 'Finance Department'),
  ('Operations', 'Operations Department'),
  ('Marketing', 'Marketing Department'),
  ('General Administration', 'General Admin')
) AS default_depts(name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.departments);
