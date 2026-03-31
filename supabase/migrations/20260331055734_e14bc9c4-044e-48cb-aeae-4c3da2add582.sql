-- Allow admins to manage all event participants (INSERT, UPDATE, DELETE, SELECT)
CREATE POLICY "Admins can manage all event participants"
ON event_participants
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));