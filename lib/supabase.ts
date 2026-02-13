
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unjcjkcyirklpuwwnajc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuamNqa2N5aXJrbHB1d3duYWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjY4NTgsImV4cCI6MjA4NjMwMjg1OH0.RlB1hE5eOIiQUCfwr7VEipE_vIfs241KdjM9d750qJQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
