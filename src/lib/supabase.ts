import { createClient } from '@supabase/supabase-js';

// Initialize with empty values until proper setup
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'http://placeholder-url',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
);