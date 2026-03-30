
-- Fix: Drop the department_colleagues_view since it's flagged as a potential bypass.
-- The app already uses the secure get_department_colleagues() function exclusively.
DROP VIEW IF EXISTS public.department_colleagues_view;
