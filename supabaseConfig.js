// config.js - Supabase Configuration
const SUPABASE_URL = "https://qwooizfkemiozeptwcbx.supabase.co";  // Replace with your Supabase URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b29pemZrZW1pb3plcHR3Y2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwNjkxNjIsImV4cCI6MjA1NjY0NTE2Mn0.rf5FHgcaXfBeFPU96e77pEn4gbXt1nIGuRJMleIBSrs";  // Replace with your Supabase Anon Key

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
