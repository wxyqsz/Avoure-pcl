import { createClient } from "@supabase/supabase-js";

// Load environment variables
const supabaseUrl = "https://wyexzrxpavsgkmzcliqy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZXh6cnhwYXZzZ2ttemNsaXF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODU5NzU0NywiZXhwIjoyMDU0MTczNTQ3fQ.1AgjNoMiC3Y34tbYhAjr1d20sJBPnG0hD6bMPgICWR0"
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials are missing!");
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);



