// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lfhfmsguftzlzurunxzg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmaGZtc2d1ZnR6bHp1cnVueHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjEyMjIsImV4cCI6MjA2NjgzNzIyMn0.yHMSUht8I8JJKxEZxx7X68cs-wLHlzC5JmUBdIrsGvU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});