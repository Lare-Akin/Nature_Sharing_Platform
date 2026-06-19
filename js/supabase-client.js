/**
 * supabase-client.js
 * ─────────────────────────────────────────────
 * Initialises the Supabase JS client.
 * Replace the two constants below with your
 * project's URL and anon (public) key, found in:
 *   Supabase Dashboard → Project Settings → API
 * ─────────────────────────────────────────────
 */

// ⚙️  CONFIGURE THESE — copy from your Supabase dashboard
const SUPABASE_URL  = 'https://ehhdkytpvpkrsxygemql.supabase.co';
const SUPABASE_ANON = 'sb_publishable_3H77vmbOrV3hcpzQjxz3QA_QSVf1GYP';

// Load Supabase from CDN (add this script BEFORE this file in your HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    if (typeof supabase === 'undefined') {
      console.error('Supabase JS library not loaded. Add the CDN script tag before supabase-client.js');
      return null;
    }
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return supabaseClient;
}

// Storage bucket name — create this in Supabase Storage
const STORAGE_BUCKET = 'nature-photos';

// Table names
const TABLES = {
  photos: 'photos'  // see README for schema
};
