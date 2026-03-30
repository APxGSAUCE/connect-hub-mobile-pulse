
-- Fix security definer view - change to security invoker
ALTER VIEW public.department_colleagues_view SET (security_invoker = on);
