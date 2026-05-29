/* ═══════════════════════════════════════════════════════════════
   ASL — Supabase Client & Data Helpers  (js/supabase.js)
   Requires:  js/config.js loaded first  (provides window.ASL_CONFIG)
   CDN:       https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
   ═══════════════════════════════════════════════════════════════ */

// Initialise the Supabase client once the config is ready
const _supa = window.supabase.createClient(
  window.ASL_CONFIG.SUPABASE_URL,
  window.ASL_CONFIG.SUPABASE_ANON_KEY
);

// ── AUTH ─────────────────────────────────────────────────────────

/** Sign up a new user with Supabase Auth */
async function aslSignUp(email, password) {
  const { data, error } = await _supa.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

/** Sign in an existing user */
async function aslSignIn(email, password) {
  const { data, error } = await _supa.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;           // { session, user }
}

/** Sign out */
async function aslSignOut() {
  const { error } = await _supa.auth.signOut();
  if (error) throw error;
}

/** Get the currently logged-in Supabase user */
async function aslGetCurrentUser() {
  const { data: { user } } = await _supa.auth.getUser();
  return user;           // null if not logged in
}

/** Get current session */
async function aslGetSession() {
  const { data: { session } } = await _supa.auth.getSession();
  return session;
}


// ── PLAYERS ──────────────────────────────────────────────────────

/**
 * Insert a new player profile row.
 * Called right after aslSignUp succeeds.
 */
async function aslCreatePlayer({ authId, name, email, sport, category, initials, avatarGradient }) {
  const { data, error } = await _supa
    .from('players')
    .insert({
      auth_id:         authId,
      name,
      email,
      sport,
      category,
      initials,
      avatar_gradient: avatarGradient,
      points:          1000,
      matches:         0,
      wins:            0
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch a player row by their Supabase auth UID.
 * Returns the full player object including rank and history.
 */
async function aslGetPlayerByAuthId(authId) {
  const { data, error } = await _supa
    .from('players')
    .select('*, match_history(*)')
    .eq('auth_id', authId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch a player row by the players table UUID.
 */
async function aslGetPlayerById(playerId) {
  const { data, error } = await _supa
    .from('players')
    .select('*, match_history(*)')
    .eq('id', playerId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch all players for the rankings leaderboard.
 * Sorted by points descending.
 */
async function aslGetAllPlayers() {
  const { data, error } = await _supa
    .from('players')
    .select('*')
    .order('points', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Update a player's photo_url after uploading to Storage.
 */
async function aslUpdatePlayerPhoto(playerId, photoUrl) {
  const { error } = await _supa
    .from('players')
    .update({ photo_url: photoUrl })
    .eq('id', playerId);
  if (error) throw error;
}


// ── MATCH HISTORY ────────────────────────────────────────────────

/**
 * Fetch match history for a single player (latest 10).
 */
async function aslGetPlayerHistory(playerId) {
  const { data, error } = await _supa
    .from('match_history')
    .select('*')
    .eq('player_id', playerId)
    .order('played_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

/**
 * Admin: record a match result.
 * The DB trigger automatically updates player points, matches, wins.
 * @param {string} playerId  - players.id UUID
 * @param {string} opponent  - display name of opponent
 * @param {string} score     - score string e.g. "21-18, 21-15"
 * @param {'W'|'L'|'D'} result
 * @param {number} pointsDelta - positive or negative integer
 * @param {string} sport
 */
async function aslRecordMatch(playerId, opponent, score, result, pointsDelta, sport) {
  const { data, error } = await _supa
    .from('match_history')
    .insert({
      player_id:    playerId,
      opponent,
      score,
      result,
      points_delta: pointsDelta,
      sport
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}


// ── REGISTRATIONS ────────────────────────────────────────────────

/**
 * Save a registration entry.
 * photoFile: optional File object for player photo upload.
 */
async function aslSaveRegistration(regData, photoFile) {
  let photoUrl = null;

  // Upload photo to Supabase Storage if provided
  if (photoFile) {
    const ext      = photoFile.name.split('.').pop();
    const fileName = `reg_${regData.registration_id}_${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadError } = await _supa.storage
      .from('player-photos')
      .upload(fileName, photoFile, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      console.error('Photo upload error:', uploadError.message);
    } else {
      const { data: urlData } = _supa.storage
        .from('player-photos')
        .getPublicUrl(uploadData.path);
      photoUrl = urlData.publicUrl;
    }
  }

  const payload = { ...regData, photo_url: photoUrl };

  const { data, error } = await _supa
    .from('registrations')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch all registrations (admin view).
 */
async function aslGetAllRegistrations() {
  const { data, error } = await _supa
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Fetch registrations for a specific player email.
 */
async function aslGetPlayerRegistrations(email) {
  const { data, error } = await _supa
    .from('registrations')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}


// ── ADMINS ───────────────────────────────────────────────────────

/**
 * Check if a user's auth UID exists in the admins table.
 */
async function aslIsAdmin(authId) {
  const { data, error } = await _supa
    .from('admins')
    .select('id')
    .eq('id', authId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/**
 * Insert new admin row (called after Auth signup for admin).
 */
async function aslCreateAdmin(authId, name, email) {
  const { error } = await _supa
    .from('admins')
    .insert({ id: authId, name, email });
  if (error) throw error;
}


// ── STORAGE ──────────────────────────────────────────────────────

/**
 * Upload a player profile photo.
 * Returns the public URL string.
 */
async function aslUploadPlayerPhoto(playerId, file) {
  const ext      = file.name.split('.').pop();
  const fileName = `player_${playerId}_${Date.now()}.${ext}`;
  const { data, error } = await _supa.storage
    .from('player-photos')
    .upload(fileName, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;

  const { data: urlData } = _supa.storage
    .from('player-photos')
    .getPublicUrl(data.path);
  return urlData.publicUrl;
}


// Expose client for advanced use cases
window._supa = _supa;
