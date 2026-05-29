/* ═══════════════════════════════════════════════════════════════
   ASL — Auth Manager  (js/auth.js)
   Requires: js/config.js, js/supabase.js
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {

  // ── LOGIN FORM ───────────────────────────────────────────────
  const loginForm = document.getElementById('aslLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn   = document.getElementById('loginSubmitBtn');
      const mode  = document.getElementById('loginMode').value;
      const email = document.getElementById('loginEmail').value.trim().toLowerCase();
      const pass  = document.getElementById('loginPassword').value;

      btn.disabled   = true;
      btn.textContent = 'Signing in…';

      try {
        if (mode === 'admin') {
          // Validate admin secret key
          const secretKey = document.getElementById('loginAdminKey').value.trim();
          if (secretKey !== window.ASL_CONFIG.ADMIN_SECRET_KEY) {
            alert('Invalid Admin Secret Key. Access denied.');
            btn.disabled = false; btn.textContent = 'Sign In';
            return;
          }

          // Sign in with Supabase Auth
          const { user } = await aslSignIn(email, pass);

          // Verify this user is in the admins table
          let isAdm = await aslIsAdmin(user.id);
          if (!isAdm) {
            // Self-healing: if the admin profile is missing, attempt to recreate it
            try {
              console.warn('Admin profile row missing, auto-creating...');
              const name = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
              await aslCreateAdmin(user.id, name, email);
              isAdm = true;
            } catch (createErr) {
              console.error('Failed to auto-create admin row:', createErr);
              await aslSignOut();
              alert('This account is not registered as an Admin. If you just signed up, make sure the "admins" table RLS policy allows inserts, or check your Supabase logs.');
              btn.disabled = false; btn.textContent = 'Sign In';
              return;
            }
          }

          sessionStorage.setItem('asl_role', 'admin');
          sessionStorage.setItem('asl_user_name', user.email);
          window.location.href = 'admin-dashboard.html';

        } else {
          // Player login
          const { user } = await aslSignIn(email, pass);

          // Fetch player row
          let player;
          try {
            player = await aslGetPlayerByAuthId(user.id);
          } catch (fetchErr) {
            console.warn('Player profile missing on login, attempting to auto-create...', fetchErr);
            // Self-healing: recreate player profile
            try {
              const name = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
              const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'PL';
              const gradients = [
                'linear-gradient(135deg, #a64eff, #ff6b00)',
                'linear-gradient(135deg, #00f0ff, #0076ff)',
                'linear-gradient(135deg, #ff8c00, #ff3c00)',
                'linear-gradient(135deg, #00ff88, #0076ff)',
                'linear-gradient(135deg, #f12711, #f5af19)'
              ];
              const avatarGradient = gradients[Math.floor(Math.random() * gradients.length)];
              
              player = await aslCreatePlayer({
                authId: user.id,
                name,
                email,
                sport: 'badminton', // default fallback
                category: 'singles-men', // default fallback
                initials,
                avatarGradient
              });
            } catch (createErr) {
              console.error('Failed to auto-create player row:', createErr);
              await aslSignOut();
              alert('Login failed: Your player profile could not be found or recreated. Please contact support.');
              btn.disabled = false; btn.textContent = 'Sign In';
              return;
            }
          }

          sessionStorage.setItem('asl_role', 'player');
          sessionStorage.setItem('asl_player_id', player.id);
          sessionStorage.setItem('asl_player_email', player.email);
          sessionStorage.setItem('asl_player_name', player.name);
          window.location.href = 'player-dashboard.html';
        }

      } catch (err) {
        console.error('Login error:', err);
        let msg = err.message || 'Invalid credentials.';
        if (msg.includes('Email not confirmed')) {
          msg = 'Email not confirmed. Please check your email inbox for the confirmation link from Supabase, or disable "Confirm email" in the Supabase Dashboard under Authentication -> Providers -> Email.';
        }
        alert('Login failed: ' + msg);
        btn.disabled = false; btn.textContent = 'Sign In';
      }
    });
  }


  // ── SIGNUP FORM ──────────────────────────────────────────────
  const signupForm = document.getElementById('aslSignupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn  = document.getElementById('signupSubmitBtn');
      const mode = document.getElementById('signupMode').value;
      const name = document.getElementById('signupName').value.trim();
      const email= document.getElementById('signupEmail').value.trim().toLowerCase();
      const pass = document.getElementById('signupPassword').value;

      btn.disabled    = true;
      btn.textContent = 'Creating account…';

      try {
        if (mode === 'admin') {
          const inviteCode = document.getElementById('signupAdminCode').value.trim();
          if (inviteCode !== window.ASL_CONFIG.ADMIN_SECRET_KEY) {
            alert('Invalid Admin Invitation Code.');
            btn.disabled = false; btn.textContent = 'Create Account';
            return;
          }

          // Create Supabase Auth user
          const { user } = await aslSignUp(email, pass);

          // Insert into admins table
          await aslCreateAdmin(user.id, name, email);

          alert('Admin account created! Check your email to confirm, then sign in.');
          window.location.href = 'login.html?mode=admin';

        } else {
          // Player signup
          const sport    = document.getElementById('signupSport').value;
          const category = document.getElementById('signupCategory').value;
          const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'PL';

          const gradients = [
            'linear-gradient(135deg, #a64eff, #ff6b00)',
            'linear-gradient(135deg, #00f0ff, #0076ff)',
            'linear-gradient(135deg, #ff8c00, #ff3c00)',
            'linear-gradient(135deg, #00ff88, #0076ff)',
            'linear-gradient(135deg, #f12711, #f5af19)'
          ];
          const avatarGradient = gradients[Math.floor(Math.random() * gradients.length)];

          // Handle optional profile photo
          let photoUrl = null;
          const photoInput = document.getElementById('signupPhoto');
          
          // Create Supabase Auth user first
          const { user } = await aslSignUp(email, pass);

          // Create player profile row
          const player = await aslCreatePlayer({
            authId: user.id, name, email, sport, category, initials, avatarGradient
          });

          // Upload photo if provided
          if (photoInput && photoInput.files && photoInput.files[0]) {
            try {
              photoUrl = await aslUploadPlayerPhoto(player.id, photoInput.files[0]);
              await aslUpdatePlayerPhoto(player.id, photoUrl);
            } catch (photoErr) {
              console.warn('Photo upload failed (non-blocking):', photoErr.message);
            }
          }

          alert('Account created! Check your email to confirm, then sign in.');
          window.location.href = 'login.html?mode=player';
        }

      } catch (err) {
        console.error('Signup error:', err);
        let msg = err.message || 'Please try again.';
        if (msg.includes('security purposes') || msg.includes('after 40 seconds') || msg.includes('rate limit')) {
          msg = 'For security purposes, you can only request this after 40 seconds. \n\nNote: If email confirmation is enabled in your Supabase project, check your email inbox to confirm your account, or disable "Confirm email" in the Supabase Dashboard under Authentication -> Providers -> Email.';
        } else if (msg.includes('row-level security') || msg.includes('RLS') || msg.includes('policy')) {
          msg = 'Row-level security policy violation. Please check that the appropriate INSERT policies are enabled in your Supabase database schema for the "players" and "admins" tables.';
        }
        alert('Signup failed: ' + msg);
        btn.disabled = false; btn.textContent = 'Create Account';
      }
    });
  }
});


// ── Route Guard ──────────────────────────────────────────────────
// Call guardRoute('player') or guardRoute('admin') at top of protected pages.
function guardRoute(requiredRole) {
  const role = sessionStorage.getItem('asl_role');
  if (!role || role !== requiredRole) {
    alert('Unauthorised. Please log in first.');
    window.location.href = 'login.html';
  }
}

// ── Logout ───────────────────────────────────────────────────────
async function handleLogout() {
  try { await aslSignOut(); } catch (_) { /* ignore */ }
  sessionStorage.clear();
  window.location.href = 'login.html';
}
window.logoutUser = handleLogout;
