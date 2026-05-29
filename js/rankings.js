/* ═══════════════════════════════════════════════════════════════
   ASL — Rankings Page Handler  (js/rankings.js)
   Requires: js/config.js, js/supabase.js
   ═══════════════════════════════════════════════════════════════ */

// ── Existing Categories Mappings ──
const SPORT_CATEGORIES = {
  soccer: [
    { id: "singles-men", name: "5-a-side Open" },
    { id: "corporate-teams", name: "5-a-side Corporate" },
    { id: "soccer-corp", name: "Corporate Shield" }
  ],
  badminton: [
    { id: "singles-men", name: "Men Singles" },
    { id: "doubles-men", name: "Men Doubles" },
    { id: "singles-women", name: "Women Singles" },
    { id: "doubles-women", name: "Women Doubles" },
    { id: "mixed-doubles", name: "Mixed Doubles" },
    { id: "team-badminton", name: "Badminton Team" }
  ],
  cricket: [
    { id: "singles-men", name: "Men's Championship" },
    { id: "corporate-teams", name: "Corporate Mixed Teams" }
  ],
  esports: [
    { id: "fifa-corp", name: "FIFA 26 Corporate" },
    { id: "val-corp", name: "Valorant Corporate" }
  ],
  pickleball: [
    { id: "doubles-men", name: "Men's Doubles" },
    { id: "mixed-doubles", name: "Mixed Doubles" }
  ]
};

// ── Global State ─────────────────────────────────────────────────
let PLAYERS_DATABASE = [];    // loaded from Supabase & enriched with mock data
let filteredPlayers  = [];
let currentLocation  = 'All India';
let currentSport     = 'soccer';
let currentCategory  = 'singles-men';
let searchQuery      = '';
let currentPage      = 1;
const rowsPerPage    = 10;

// Sorting configuration
let currentSortField = 'points';
let currentSortOrder = 'desc';

// Three.js vars (modal background)
let threeScene, threeCamera, threeRenderer;
let threeCard, threeParticles, threeAnimationId;
let threeMouseListener, threeResizeListener;
let targetRotX = 0, targetRotY = 0;


document.addEventListener('DOMContentLoaded', async () => {
  await loadRankingsData();
  buildCategoryPills();
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

    // Enrich database players and add mock players for Chennai, Pune, Hyderabad, Delhi
    enrichPlayersDatabase();

    applyFilters();
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


// ── Procedural Mock Data Generator for City-based leaderboards ──
function enrichPlayersDatabase() {
  // 1. Ensure existing players have locations and teams
  PLAYERS_DATABASE.forEach(p => {
    p.location = p.location || 'Bengaluru';
    p.team = p.team || (p.sport === 'soccer' ? 'Bengaluru Titans' : 'Koramangala Club');
  });

  // 2. Generate players for Chennai, Pune, Hyderabad, and Delhi
  const cities = ['Chennai', 'Pune', 'Hyderabad', 'Delhi'];
  const firstNames = ['Arvind', 'Sanjay', 'Karan', 'Deepak', 'Vijay', 'Amit', 'Neha', 'Pooja', 'Kavita', 'Ritu', 'Manish', 'Rajesh', 'Sunil', 'Kiran', 'Meera', 'Rohan', 'Sneha', 'Abhishek', 'Shruti', 'Divya'];
  const lastNames = ['Iyer', 'Joshi', 'Kapoor', 'Verma', 'Gill', 'Sen', 'Rao', 'Reddy', 'Choudhury', 'Nair', 'Bose', 'Das', 'Roy', 'Prasad', 'Mishra', 'Trivedi', 'Mehta', 'Bhatt', 'Dubey', 'Patel'];
  const teamNouns = ['Warriors', 'Titans', 'Strikers', 'Riders', 'Superstars', 'Kings', 'Panthers', 'United', 'Dynamo', 'Royals'];

  let idCounter = 1;
  cities.forEach(city => {
    Object.keys(SPORT_CATEGORIES).forEach(sport => {
      SPORT_CATEGORIES[sport].forEach(cat => {
        // Deterministic generation: 4 players per category-sport combo per city
        for (let i = 0; i < 4; i++) {
          const fIdx = (idCounter * 7 + i * 3) % firstNames.length;
          const lIdx = (idCounter * 11 + i * 5) % lastNames.length;
          const tIdx = (idCounter * 13 + i * 2) % teamNouns.length;
          
          const fName = firstNames[fIdx];
          const lName = lastNames[lIdx];
          const name = `${fName} ${lName}`;
          const initials = fName[0] + lName[0];
          const team = `${city} ${teamNouns[tIdx]}`;
          
          const matches = 6 + (idCounter % 8);
          const wins = Math.floor(matches * (0.4 + (idCounter % 5) * 0.1));
          const points = 1000 + (wins * 80) + (matches * 10) - ((matches - wins) * 30);
          
          PLAYERS_DATABASE.push({
            id: `ASL-PLR-${100000 + idCounter}`,
            name,
            email: `${fName.toLowerCase()}.${lName.toLowerCase()}@abstreamsl.com`,
            sport,
            category: cat.id,
            initials,
            avatar_gradient: getRandomGradient(idCounter),
            photo_url: null,
            points,
            matches,
            wins,
            location: city,
            team: team
          });
          idCounter++;
        }
      });
    });
  });
}

function getRandomGradient(index) {
  const gradients = [
    'linear-gradient(135deg, #ff8c00, #ff3c00)',
    'linear-gradient(135deg, #00f0ff, #0076ff)',
    'linear-gradient(135deg, #a64eff, #ff3860)',
    'linear-gradient(135deg, #00ff88, #0076ff)',
    'linear-gradient(135deg, #e0a300, #ff8c00)',
    'linear-gradient(135deg, #11998e, #38ef7d)',
    'linear-gradient(135deg, #f12711, #f5af19)',
    'linear-gradient(135deg, #f857a6, #ff5858)',
    'linear-gradient(135deg, #8e2de2, #4a00e0)'
  ];
  return gradients[index % gradients.length];
}


// ── Filter listeners ──────────────────────────────────────────────
function attachFilterListeners() {
  // Location tabs (Level 1)
  const locationTabs = document.querySelectorAll('.location-tab');
  locationTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      locationTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentLocation = tab.dataset.location;
      currentPage = 1;
      applyFilters();
    });
  });

  // Sport Selection Cards (Level 2)
  const sportCards = document.querySelectorAll('.premium-sport-card');
  sportCards.forEach(card => {
    card.addEventListener('click', () => {
      sportCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentSport = card.dataset.sport;
      
      // Dynamic Category pills (Level 3)
      buildCategoryPills();
      
      currentPage = 1;
      applyFilters();
    });
  });

  // Upgraded Search Input (Search Player / Team / ID)
  const searchInput = document.getElementById('searchPlayer');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = e.target.value.toLowerCase().trim();
        currentPage = 1;
        applyFilters();
      }, 250);
    });
  }

  // Table Sort Headers Click Handler
  const headers = document.querySelectorAll('.rankings-table th.sortable');
  headers.forEach(h => {
    h.addEventListener('click', () => {
      const field = h.dataset.sort;
      if (currentSortField === field) {
        currentSortOrder = currentSortOrder === 'desc' ? 'asc' : 'desc';
      } else {
        currentSortField = field;
        currentSortOrder = 'desc'; // Default desc
      }

      // Update active header classes and arrow symbols
      headers.forEach(header => {
        header.classList.remove('active-sort');
        const indicator = header.querySelector('.sort-indicator');
        if (indicator) {
          indicator.textContent = '▼';
        }
      });
      
      h.classList.add('active-sort');
      const indicator = h.querySelector('.sort-indicator');
      if (indicator) {
        indicator.textContent = currentSortOrder === 'desc' ? '▼' : '▲';
      }

      currentPage = 1;
      applyFilters();
    });
  });
}

// ── Dynamic category pills generation (Level 3) ──
function buildCategoryPills() {
  const container = document.getElementById('categoryPillsContainer');
  if (!container) return;

  const cats = SPORT_CATEGORIES[currentSport] || [];
  
  if (cats.length > 0) {
    currentCategory = cats[0].id;
  } else {
    currentCategory = 'all';
  }

  container.innerHTML = cats.map(cat => {
    const activeClass = cat.id === currentCategory ? 'active' : '';
    return `<button class="category-pill ${activeClass}" data-cat="${cat.id}">${cat.name}</button>`;
  }).join('');

  // Attach event listeners to the pills
  const pills = container.querySelectorAll('.category-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.dataset.cat;
      currentPage = 1;
      applyFilters();
    });
  });
}


// ── Filter, Search, and Sort rankings records ──
function applyFilters() {
  // 1. Location Filter
  let locFiltered = PLAYERS_DATABASE;
  if (currentLocation !== 'All India') {
    locFiltered = PLAYERS_DATABASE.filter(p => p.location === currentLocation);
  }

  // 2. Sport Filter
  const sportFiltered = locFiltered.filter(p => p.sport === currentSport);

  // 3. Category Filter
  const catFiltered = sportFiltered.filter(p => p.category === currentCategory);

  // 4. Upgraded Search (Player / Team / ID)
  if (searchQuery) {
    filteredPlayers = catFiltered.filter(p => 
      p.name.toLowerCase().includes(searchQuery) ||
      p.team.toLowerCase().includes(searchQuery) ||
      p.id.toLowerCase().includes(searchQuery)
    );
  } else {
    filteredPlayers = [...catFiltered];
  }

  // 5. Sorting Handler
  sortFilteredPlayers();

  // 6. Compute subset ranks dynamically (to keep rankings separated and non-mixed)
  filteredPlayers.forEach((p, idx) => {
    p.rank = idx + 1;
  });

  renderLeaderboard();
}

function sortFilteredPlayers() {
  filteredPlayers.sort((a, b) => {
    let valA, valB;
    
    if (currentSortField === 'points') {
      valA = a.points; valB = b.points;
    } else if (currentSortField === 'wins') {
      valA = a.wins; valB = b.wins;
    } else if (currentSortField === 'matches') {
      valA = a.matches; valB = b.matches;
    } else if (currentSortField === 'winrate') {
      valA = a.matches > 0 ? (a.wins / a.matches) : 0;
      valB = b.matches > 0 ? (b.wins / b.matches) : 0;
    } else if (currentSortField === 'rank') {
      valA = a.points; valB = b.points;
      if (currentSortOrder === 'asc') {
        return valA - valB;
      }
      return valB - valA;
    }

    if (currentSortOrder === 'desc') {
      return valB - valA;
    } else {
      return valA - valB;
    }
  });
}


// ── Render leaderboard table (Level 4) ──
function renderLeaderboard() {
  const tbody     = document.getElementById('rankings-tbody');
  const pagination= document.getElementById('rankingsPagination');
  if (!tbody) return;

  tbody.innerHTML = '';

  // Show/Hide City header column
  const cityHeader = document.getElementById('cityHeaderCol');
  if (cityHeader) {
    cityHeader.style.display = currentLocation === 'All India' ? 'table-cell' : 'none';
  }

  if (filteredPlayers.length === 0) {
    const colSpan = currentLocation === 'All India' ? 9 : 8;
    tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;color:var(--text-muted);padding:40px;">No players match the selected filters.</td></tr>`;
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

    const avatarContent = player.photo_url
      ? `<img src="${player.photo_url}" alt="${player.name}" style="width:100%;height:100%;object-fit:cover;">`
      : player.initials;

    const cityCell = currentLocation === 'All India' ? `<td><span class="location-sport-tag" style="background: rgba(255, 107, 0, 0.08); border: 1px solid rgba(255, 107, 0, 0.2); color: var(--accent); padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">📍 ${player.location}</span></td>` : '';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="${rankClass}">${player.rank}</span></td>
      <td>
        <div class="rank-player-col">
          <div class="player-avatar" style="background:${player.avatar_gradient};overflow:hidden;">${avatarContent}</div>
          <a class="player-name-link" onclick="openRankingsPlayerModal('${player.id}')">${player.name}</a>
        </div>
      </td>
      <td>${player.team}</td>
      ${cityCell}
      <td>${player.matches}</td>
      <td>${player.wins}</td>
      <td class="points-cell">${player.points.toLocaleString()}</td>
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
            <span class="player-badge" style="background: rgba(255, 107, 0, 0.12); color: var(--accent); border-color: rgba(255, 107, 0, 0.2);">📍 ${player.location}</span>
            <span class="player-badge" style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted);">${player.team}</span>
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
