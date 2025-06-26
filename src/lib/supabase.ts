import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = 'https://hjaqnjjptipnxeonojip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYXFuampwdGlwbnhlb25vamlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTczNzMsImV4cCI6MjA2NTE3MzM3M30.VlY2gSvHammlUkErPoSaOzF9wExU3gGjRS_8_jIOlGw';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };
