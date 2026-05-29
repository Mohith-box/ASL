/* ═══════════════════════════════════════════════════════════════
   ASL — Config  (js/config.js)
   Keys are injected by the lite-server middleware into index meta tags.
   For plain static hosting, hardcode them here ONLY after reading .env.
   ═══════════════════════════════════════════════════════════════ */

// Read from <meta> tags injected by server (see server.js)
// Fallback to window globals if using a bundler that injects them.
function _meta(name) {
  const el = document.querySelector(`meta[name="asl-${name}"]`);
  return el ? el.getAttribute('content') : null;
}

const ASL_CONFIG = {
  SUPABASE_URL:      _meta('supabase-url')      || 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: _meta('supabase-anon-key') || 'YOUR_SUPABASE_ANON_KEY',
  RAZORPAY_KEY_ID:   _meta('razorpay-key')      || 'rzp_live_XXXXXXXXXXXXXXXX',
  ADMIN_SECRET_KEY:  _meta('admin-secret')      || 'ASLADMIN2026',
};

// Expose globally (all other scripts use window.ASL_CONFIG)
window.ASL_CONFIG = ASL_CONFIG;
