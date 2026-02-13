-- Force RLS on profiles table so even the table owner is subject to policies
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;