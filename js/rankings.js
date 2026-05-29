/* ═══════════════════════════════════════════════════════════════
   ASL — Rankings Page Handler  (js/rankings.js)
   Requires: js/config.js, js/supabase.js
   ═══════════════════════════════════════════════════════════════ */

// ── Global State ─────────────────────────────────────────────────
let PLAYERS_DATABASE = [];    // loaded from Supabase
let filteredPlayers  = [];
let currentSport     = 'all';
let currentCategory  = 'all';
let searchQuery      = '';
let currentPage      = 1;
const rowsPerPage    = 10;

// Three.js vars (modal background)
let threeScene, threeCamera, threeRenderer;
let threeCard, threeParticles, threeAnimationId;
let threeMouseListener, threeResizeListener;
let targetRotX = 0, targetRotY = 0;


document.addEventListener('DOMContentLoaded', async () => {
  await loadRankingsData();
  attachFilterListeners();
});


// ── Load data from Supabase ───────────────────────────────────────
async function loadRankingsData() {
  const tbody = document.getElementById('rankings-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px;">
        Loading rankings…
      </td></tr>`;
  }

  try {
    PLAYERS_DATABASE = await aslGetAllPlayers();

    // Assign computed rank based on index (already sorted by points desc from DB)
    PLAYERS_DATABASE.forEach((p, i) => { p.rank = p.rank || (i + 1); });

    filteredPlayers = [...PLAYERS_DATABASE];
    renderLeaderboard();
  } catch (err) {
    console.error('Failed to load rankings:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="8" style="text-align:center;color:var(--red);padding:40px;">
          Failed to load rankings. Check your Supabase configuration.
        </td></tr>`;
    }
  }
}


// ── Filter listeners ──────────────────────────────────────────────
function attachFilterListeners() {
  const tabs             = document.querySelectorAll('.sport-filter-btn');
  const mobileSportFilter= document.getElementById('mobileSportFilter');
  const catFilter        = document.getElementById('categoryFilter');
  const searchInput      = document.getElementById('searchPlayer');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSport = tab.dataset.sport;
      if (mobileSportFilter) mobileSportFilter.value = currentSport;
      currentPage = 1; applyFilters();
    });
  });

  if (mobileSportFilter) {
    mobileSportFilter.addEventListener('change', (e) => {
      currentSport = e.target.value;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.sport === currentSport));
      currentPage = 1; applyFilters();
    });
  }

  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      currentPage = 1; applyFilters();
    });
  }

  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = e.target.value.toLowerCase().trim();
        currentPage = 1; applyFilters();
      }, 250);
    });
  }
}

function applyFilters() {
  filteredPlayers = PLAYERS_DATABASE.filter(p => {
    const sportMatch    = currentSport    === 'all' || p.sport    === currentSport;
    const categoryMatch = currentCategory === 'all' || p.category === currentCategory;
    const searchMatch   = !searchQuery || p.name.toLowerCase().includes(searchQuery);
    return sportMatch && categoryMatch && searchMatch;
  });
  renderLeaderboard();
}


// ── Render leaderboard table ──────────────────────────────────────
function renderLeaderboard() {
  const tbody     = document.getElementById('rankings-tbody');
  const pagination= document.getElementById('rankingsPagination');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (filteredPlayers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px;">No players match the selected filters.</td></tr>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  const startIdx = (currentPage - 1) * rowsPerPage;
  const pageItems= filteredPlayers.slice(startIdx, startIdx + rowsPerPage);

  pageItems.forEach(player => {
    const rankClass = player.rank === 1 ? 'rank-badge rank-1'
                    : player.rank === 2 ? 'rank-badge rank-2'
                    : player.rank === 3 ? 'rank-badge rank-3'
                    : 'rank-badge rank-other';

    const winRate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;

    const categoryName = player.category
      .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).reverse().join(' ');

    const avatarContent = player.photo_url
      ? `<img src="${player.photo_url}" alt="${player.name}" style="width:100%;height:100%;object-fit:cover;">`
      : player.initials;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="${rankClass}">${player.rank}</span></td>
      <td>
        <div class="rank-player-col">
          <div class="player-avatar" style="background:${player.avatar_gradient};overflow:hidden;">${avatarContent}</div>
          <a class="player-name-link" onclick="openRankingsPlayerModal('${player.id}')">${player.name}</a>
        </div>
      </td>
      <td style="text-transform:capitalize;">${player.sport}</td>
      <td>${categoryName}</td>
      <td class="points-cell">${player.points.toLocaleString()}</td>
      <td>${player.matches}</td>
      <td>${player.wins}</td>
      <td>${winRate}%</td>`;
    tbody.appendChild(row);
  });

  // Pagination
  if (pagination) renderPagination(pagination);
}

function renderPagination(container) {
  const totalPages = Math.ceil(filteredPlayers.length / rowsPerPage);
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const mkBtn = (label, page, active = false, disabled = false) => {
    const b = document.createElement('button');
    b.className  = 'pagination-btn' + (active ? ' active' : '');
    b.textContent= label;
    b.disabled   = disabled;
    if (!disabled) b.addEventListener('click', () => { currentPage = page; renderLeaderboard(); });
    return b;
  };

  container.appendChild(mkBtn('←', currentPage - 1, false, currentPage === 1));
  for (let p = 1; p <= totalPages; p++) {
    container.appendChild(mkBtn(String(p), p, p === currentPage));
  }
  container.appendChild(mkBtn('→', currentPage + 1, false, currentPage === totalPages));
}


// ── Player Profile Modal ──────────────────────────────────────────
async function openRankingsPlayerModal(playerId) {
  const modal = document.getElementById('playerModal');
  const body  = document.getElementById('playerModalBody');
  if (!modal || !body) return;

  body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);">Loading…</div>';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    // Fetch from Supabase including match history
    let player = PLAYERS_DATABASE.find(p => p.id === playerId);
    const history = await aslGetPlayerHistory(playerId);

    if (!player) {
      body.innerHTML = '<p style="padding:40px;color:var(--red);">Player not found.</p>';
      return;
    }

    const winRate  = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;
    const catName  = player.category.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).reverse().join(' ');
    const avatarHTML = player.photo_url
      ? `<img src="${player.photo_url}" alt="${player.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : player.initials;

    const historyHTML = history.length === 0
      ? '<p style="color:var(--text-muted);font-size:.9rem;">No match history yet.</p>'
      : history.map(m => `
          <div class="history-item">
            <span class="history-opp">${m.opponent}</span>
            <span class="history-score">${m.score}</span>
            <span class="history-result ${m.result === 'W' ? 'win' : 'loss'}">${m.result}</span>
          </div>`).join('');

    body.innerHTML = `
      <div class="player-modal-header">
        <div class="player-modal-avatar" style="background:${player.avatar_gradient};overflow:hidden;">${avatarHTML}</div>
        <div class="player-modal-info">
          <h2 class="player-modal-name title-font">${player.name}</h2>
          <div class="player-modal-meta">
            <span class="player-badge" style="text-transform:capitalize;">🏸 ${player.sport}</span>
            <span class="player-badge">${catName}</span>
          </div>
        </div>
        <div class="player-modal-rank">#${player.rank}</div>
      </div>
      <div class="player-modal-stats">
        <div class="modal-stat"><div class="modal-stat-num" style="color:var(--accent);">${player.points.toLocaleString()}</div><div class="modal-stat-label">Points</div></div>
        <div class="modal-stat"><div class="modal-stat-num">${player.matches}</div><div class="modal-stat-label">Matches</div></div>
        <div class="modal-stat"><div class="modal-stat-num" style="color:var(--green);">${player.wins}</div><div class="modal-stat-label">Wins</div></div>
        <div class="modal-stat"><div class="modal-stat-num">${winRate}%</div><div class="modal-stat-label">Win Rate</div></div>
      </div>
      <div class="player-modal-history">
        <h4 class="title-font" style="margin-bottom:12px;font-size:1rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Recent Matches</h4>
        ${historyHTML}
      </div>`;

    // Three.js background
    initThreeModalBg(player);

  } catch (err) {
    console.error('Modal load error:', err);
    body.innerHTML = `<p style="padding:40px;color:var(--red);">Failed to load player data.</p>`;
  }
}


// ── Three.js Modal Background ─────────────────────────────────────
function hexToRgbaStr(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function applyCoverAspect(texture, w, h) {
  const imageAspect = texture.image ? (texture.image.width / texture.image.height) : 1;
  const screenAspect = w / h;
  if (screenAspect > imageAspect) { texture.repeat.set(1, imageAspect / screenAspect); texture.offset.set(0, (1 - texture.repeat.y) / 2); }
  else { texture.repeat.set(screenAspect / imageAspect, 1); texture.offset.set((1 - texture.repeat.x) / 2, 0); }
}

function initThreeModalBg(player) {
  if (typeof THREE === 'undefined') return;
  const container = document.getElementById('threeModalBg');
  if (!container) return;

  const width = container.clientWidth || 600;
  const height= container.clientHeight || 500;

  threeScene    = new THREE.Scene();
  threeCamera   = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  threeCamera.position.z = 5;
  threeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  threeRenderer.setSize(width, height);
  threeRenderer.setClearColor(0x000000, 0);
  container.appendChild(threeRenderer.domElement);

  let themeColorHex = '#ff6b00';
  if (player.avatar_gradient) {
    const matches = player.avatar_gradient.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g);
    if (matches && matches.length > 0) themeColorHex = matches[0];
  }

  // Background canvas texture
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#09090e'); grad.addColorStop(1, '#07070d');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
  const rg = ctx.createRadialGradient(256, 256, 10, 256, 256, 250);
  rg.addColorStop(0, hexToRgbaStr(themeColorHex, 0.18)); rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 1;
  for (let i = 0; i < 512; i += 32) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,512); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(512,i); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.font = 'bold 240px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(player.initials, 256, 256);

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const frontTexture = player.photo_url
    ? loader.load(player.photo_url, tex => { applyCoverAspect(tex, width, height); tex.needsUpdate = true; })
    : new THREE.CanvasTexture(canvas);

  const geo  = new THREE.PlaneGeometry(1, 1);
  const mat  = new THREE.MeshBasicMaterial({ map: frontTexture, transparent: true, opacity: 0.35, color: 0x999999 });
  threeCard  = new THREE.Mesh(geo, mat);

  const vFov = (threeCamera.fov * Math.PI) / 180;
  const D    = 5;
  const visH = 2 * Math.tan(vFov / 2) * D;
  const visW = visH * (width / height);
  threeCard.scale.set(visW * 1.25, visH * 1.25, 1);
  threeScene.add(threeCard);

  // Particles
  const pGeo  = new THREE.BufferGeometry();
  const pArr  = new Float32Array(45 * 3);
  for (let i = 0; i < 45 * 3; i += 3) { pArr[i]=(Math.random()-.5)*6; pArr[i+1]=(Math.random()-.5)*6; pArr[i+2]=Math.random()*2+1; }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
  const pCvs = document.createElement('canvas'); pCvs.width = 16; pCvs.height = 16;
  const pCtx = pCvs.getContext('2d');
  const pGrd = pCtx.createRadialGradient(8,8,0,8,8,8);
  pGrd.addColorStop(0,'rgba(255,255,255,1)'); pGrd.addColorStop(.3,hexToRgbaStr(themeColorHex,.8)); pGrd.addColorStop(1,'rgba(0,0,0,0)');
  pCtx.fillStyle = pGrd; pCtx.fillRect(0,0,16,16);
  const pMat = new THREE.PointsMaterial({ size:.16, map:new THREE.CanvasTexture(pCvs), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  threeParticles = new THREE.Points(pGeo, pMat);
  threeScene.add(threeParticles);

  targetRotX = 0; targetRotY = 0;
  threeMouseListener = (e) => {
    targetRotY = ((e.clientX / window.innerWidth) * 2 - 1) * 0.12;
    targetRotX = -(((e.clientY / window.innerHeight) * 2 - 1)) * 0.12;
  };
  window.addEventListener('mousemove', threeMouseListener);

  const animate = () => {
    if (!threeScene || !threeRenderer) return;
    threeAnimationId = requestAnimationFrame(animate);
    if (threeCard) { threeCard.rotation.x += (targetRotX - threeCard.rotation.x) * .05; threeCard.rotation.y += (targetRotY - threeCard.rotation.y) * .05; }
    if (threeParticles) { const pos = pGeo.attributes.position.array; for (let i=1;i<pos.length;i+=3){pos[i]+=.003; if(pos[i]>3)pos[i]=-3;} pGeo.attributes.position.needsUpdate=true; }
    threeRenderer.render(threeScene, threeCamera);
  };
  animate();
}

function destroyThreeBg() {
  if (threeAnimationId) { cancelAnimationFrame(threeAnimationId); threeAnimationId = null; }
  if (threeMouseListener) { window.removeEventListener('mousemove', threeMouseListener); threeMouseListener = null; }
  if (threeScene) { threeScene.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m?.dispose()); } }); threeScene = null; }
  if (threeRenderer) { threeRenderer.domElement?.parentNode?.removeChild(threeRenderer.domElement); threeRenderer.dispose(); threeRenderer = null; }
  threeCamera = null; threeCard = null; threeParticles = null;
  const c = document.getElementById('threeModalBg'); if (c) c.innerHTML = '';
}
window.destroyThreeBg = destroyThreeBg;
