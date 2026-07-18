// 0n1x shared auth — REAL accounts via the SAME Supabase project as Rhinogent.
// Signing in here IS signing into the shared 0n1x/Rhino identity (one user, both surfaces) —
// not a second silo. The anon key is public by design (RLS guards data); safe on a static site.
// Exposes window.OnyxAuth for non-module scripts (the news wall, the profile page) to call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ikduwkmlnswyrjqjllxa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_x1Jvj5y_rLpx-A9ffpqYkQ_mlAI-SnL";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Redirect back to whatever 0n1x page you signed in from.
// ⚠ OPERATOR: https://0n1xagntc.com/** must be in Supabase → Auth → URL Configuration → Redirect URLs,
// or Google/magic-link silently bounces to the project Site URL (rhinogent.com).
function here() {
  return (location.origin && location.origin.indexOf("http") === 0)
    ? location.origin + location.pathname
    : "https://0n1xagntc.com/";
}

const listeners = [];
function emit(session) { listeners.forEach((fn) => { try { fn(session); } catch (e) {} }); }

const OnyxAuth = {
  supabase,
  async getSession() { const { data } = await supabase.auth.getSession(); return data.session || null; },
  async getUser() { const s = await OnyxAuth.getSession(); return s ? s.user : null; },
  onChange(fn) { listeners.push(fn); OnyxAuth.getSession().then(fn); },
  // Any Supabase-enabled OAuth provider. ⚠ OPERATOR: each provider must be turned ON in
  // Supabase → Auth → Providers (Google is on; enable github/etc + add their OAuth app creds).
  async signInOAuth(provider) {
    return supabase.auth.signInWithOAuth({ provider, options: { redirectTo: here() } });
  },
  async signInGoogle() { return OnyxAuth.signInOAuth("google"); },
  async signInGithub() { return OnyxAuth.signInOAuth("github"); },
  async signInEmail(email) {
    // magic link — no password; same accounts as Rhinogent
    return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: here() } });
  },
  async signOut() { await supabase.auth.signOut(); emit(null); },
};

supabase.auth.onAuthStateChange((_e, session) => emit(session));

window.OnyxAuth = OnyxAuth;
window.dispatchEvent(new Event("onyxauth:ready"));
