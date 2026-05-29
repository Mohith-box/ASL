/* ═══════════════════════════════════════════════════════════════
   ASL — Abstream Sports League · Main Application JS
   ═══════════════════════════════════════════════════════════════ */

// ── Scroll-triggered Fade-in Animations ──
document.addEventListener('DOMContentLoaded', () => {
  const fadeEls = document.querySelectorAll('.fade-in');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    fadeEls.forEach(el => obs.observe(el));
  } else {
    fadeEls.forEach(el => el.classList.add('visible'));
  }

  // ── Active nav link highlighting on scroll ──
  highlightNavOnScroll();

  // ── Animate counters ──
  animateCounters();

  // ── Particles ──
  initParticles();

  // ── Update nav links & auto-fill forms based on active session ──
  updateNavForSession();

  // ── Interactive Donut Chart ──
  initDonutChart();

  // ── Auto-tab selector for schedule redirects ──
  const params = new URLSearchParams(window.location.search);
  const regType = params.get('regType');
  if (regType) {
    const tabBtn = document.getElementById('btnTab' + regType.charAt(0).toUpperCase() + regType.slice(1));
    if (tabBtn) switchTab(regType, tabBtn);
  }
});

// ── Mobile Nav Toggle ──
function toggleMobileNav() {
  const nav = document.getElementById('mobileNav');
  if (nav) nav.classList.toggle('open');
}
function closeMobileNav() {
  const nav = document.getElementById('mobileNav');
  if (nav) nav.classList.remove('open');
}

// ── Schedule Tab Switching ──
function switchTab(tabId, btn) {
  // Deactivate all panes
  document.querySelectorAll('.schedule-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  // Activate selected
  const pane = document.getElementById('tab-' + tabId);
  if (pane) pane.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ── Open Tournament Sport Filter Switching ──
function filterOpenSport(sportId, btn) {
  // Deactivate all sport filter buttons
  document.querySelectorAll('.sport-filter-btn').forEach(b => b.classList.remove('active'));
  // Hide all open sport sub-panes
  document.querySelectorAll('.open-sport-pane').forEach(p => p.classList.remove('active'));
  
  // Activate selected
  if (btn) btn.classList.add('active');
  const pane = document.getElementById('open-sport-' + sportId);
  if (pane) pane.classList.add('active');
}

// ── Corporate Tournament Sport Filter Switching ──
function filterCorpSport(sportId, btn) {
  // Deactivate all corporate sport filter buttons
  document.querySelectorAll('.sport-filter-btn-corp').forEach(b => b.classList.remove('active'));
  // Hide all corporate sport sub-panes
  document.querySelectorAll('.corp-sport-pane').forEach(p => p.classList.remove('active'));
  
  // Activate selected
  if (btn) btn.classList.add('active');
  const pane = document.getElementById('corp-sport-' + sportId);
  if (pane) pane.classList.add('active');
}

// ── Registration Redirect / Scroll Handler ──
function openModal(type) {
  const scheduleSection = document.getElementById('schedule');
  if (scheduleSection) {
    scheduleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Switch to active tab based on selected register button context
    if (type === 'corp') {
      const corpBtn = document.getElementById('btnTabCorp');
      if (corpBtn) switchTab('corp', corpBtn);
    } else {
      const openBtn = document.getElementById('btnTabOpen');
      if (openBtn) switchTab('open', openBtn);
    }
  } else {
    // If not on homepage, redirect with regType parameters to auto-scroll & auto-select tab
    window.location.href = 'index.html?regType=' + type + '#schedule';
  }
}

function closeModal() {
  const overlay = document.getElementById('regModal');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ── Player Profile Modal ──
function openPlayerModal(playerId) {
  const modal = document.getElementById('playerModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}
function closePlayerModal() {
  const modal = document.getElementById('playerModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
  // Clean up Three.js dynamic background if exists
  if (typeof window.destroyThreeBg === 'function') {
    window.destroyThreeBg();
  }
}

// ── Gallery Lightbox ──
let currentLightboxIndex = 0;
let lightboxItems = [];

function openLightbox(index) {
  currentLightboxIndex = index;
  const modal = document.getElementById('lightboxModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    updateLightbox();
  }
}
function closeLightbox() {
  const modal = document.getElementById('lightboxModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}
function nextLightbox() {
  currentLightboxIndex = (currentLightboxIndex + 1) % lightboxItems.length;
  updateLightbox();
}
function prevLightbox() {
  currentLightboxIndex = (currentLightboxIndex - 1 + lightboxItems.length) % lightboxItems.length;
  updateLightbox();
}
function updateLightbox() {
  const container = document.getElementById('lightboxContent');
  if (!container || !lightboxItems[currentLightboxIndex]) return;
  const item = lightboxItems[currentLightboxIndex];
  container.innerHTML = item.html;
  const caption = document.getElementById('lightboxCaption');
  if (caption) caption.textContent = item.caption || '';
}

// ── Close modals with Escape key ──
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closePlayerModal();
    closeLightbox();
    closeCategoriesModal();
  }
  if (e.key === 'ArrowRight') nextLightbox();
  if (e.key === 'ArrowLeft') prevLightbox();
});

// ── Close modals on overlay click ──
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('open')) {
    if (e.target.id === 'playerModal') {
      closePlayerModal();
    } else if (e.target.id === 'lightboxModal') {
      closeLightbox();
    } else if (e.target.id === 'scheduleCategoryModal') {
      closeCategoriesModal();
    } else {
      closeModal();
    }
  }
});

// ── Highlight nav links based on scroll position ──
function highlightNavOnScroll() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 100;
      if (scrollY >= top) current = sec.getAttribute('id');
    });
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) link.classList.add('active');
    });
  });
}

// ── Animate Counters ──
function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 60));
        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = current;
        }, 20);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => obs.observe(c));
}

// ── Smooth scroll for anchor links ──
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (link) {
    const targetId = link.getAttribute('href');
    if (targetId && targetId.length > 1) {
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeMobileNav();
      }
    }
  }
});

// ── Particle Background ──
function initParticles() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0.3;';
  canvas.width = hero.offsetWidth;
  canvas.height = hero.offsetHeight;
  hero.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const particles = [];
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      o: Math.random() * 0.5 + 0.1
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,107,0,${p.o})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    requestAnimationFrame(drawParticles);
  }
  drawParticles();

  window.addEventListener('resize', () => {
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
  });
}

// ── Nav background on scroll ──
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (nav) {
    if (window.scrollY > 50) {
      nav.style.background = 'rgba(10,10,15,0.98)';
      nav.style.boxShadow = '0 4px 30px rgba(0,0,0,0.5)';
    } else {
      nav.style.background = 'rgba(10,10,15,0.92)';
      nav.style.boxShadow = 'none';
    }
  }
});

// ── Form helpers ──
function togglePartnerFields() {
  const doublesChecked = document.querySelectorAll('.cat-checkbox:checked');
  let showPartner = false;
  doublesChecked.forEach(cb => {
    const val = cb.value;
    if (val && (val.includes('doubles') || val.includes('mixed'))) showPartner = true;
  });
  const partnerSection = document.getElementById('partnerSection');
  if (partnerSection) partnerSection.style.display = showPartner ? 'block' : 'none';
}

// ── Session Nav Modifier & Form Autofill ──
function updateNavForSession() {
  const role = sessionStorage.getItem('asl_role');
  if (!role) return;

  const dashboardUrl = role === 'admin' ? 'admin-dashboard.html' : 'player-dashboard.html';

  // 1. Auto-redirect if trying to access login or signup pages when already authenticated
  const path = window.location.pathname;
  if (path.includes('login.html') || path.includes('signup.html')) {
    window.location.href = dashboardUrl;
    return;
  }

  // 2. Rewrite "Login" links to "Profile" pointing to their portal/dashboard
  const loginLinks = document.querySelectorAll('a[href^="login.html"], a[href*="login.html"]');
  loginLinks.forEach(link => {
    link.innerHTML = '👤 Profile';
    link.href = dashboardUrl;
  });

  // 3. Auto-fill registration form with session profile info if on register.html
  if (path.includes('register.html') || document.getElementById('aslRegistrationForm')) {
    const emailInput = document.getElementById('regEmail');
    const nameInput = document.getElementById('regFullName');
    
    if (emailInput && !emailInput.value) {
      const email = role === 'player' 
        ? sessionStorage.getItem('asl_player_email') 
        : sessionStorage.getItem('asl_user_name');
      if (email) emailInput.value = email;
    }
    
    if (nameInput && !nameInput.value && role === 'player') {
      const name = sessionStorage.getItem('asl_player_name');
      if (name) nameInput.value = name;
    }
  }
}

// ── Schedule Category Pop-up Modal Interaction ──
const categoriesData = {
  open: {
    badminton: [
      { id: "singles-men", name: "👨 Men Singles", venue: "📍 ASL Arena, Koramangala", status: "Registering", featured: true },
      { id: "doubles-men", name: "👨‍👨‍ Men Doubles", venue: "📍 ASL Arena, Koramangala", status: "Registering" },
      { id: "singles-women", name: "👩 Women Singles", venue: "📍 ASL Arena, Koramangala", status: "Registering" },
      { id: "doubles-women", name: "👩‍👩‍ Women Doubles", venue: "📍 ASL Arena, Koramangala", status: "Registering" },
      { id: "mixed-doubles", name: "👫 Mixed Doubles", venue: "📍 ASL Arena, Koramangala", status: "Registering" }
    ],
    cricket: [
      { id: "singles-men", name: "🏏 Men's Championship", venue: "📍 Cricket Turf, HSR Layout", status: "Coming Soon" },
      { id: "corporate-teams", name: "🏢 Corporate Mixed Teams", venue: "📍 Cricket Turf, HSR Layout", status: "Coming Soon" }
    ],
    pickleball: [
      { id: "doubles-men", name: "👨‍👨‍ Men's Doubles", venue: "📍 ASL Arena, Koramangala", status: "Coming Soon" },
      { id: "mixed-doubles", name: "👫 Mixed Doubles", venue: "📍 ASL Arena, Koramangala", status: "Coming Soon" }
    ],
    soccer: [
      { id: "singles-men", name: "⚽ 5-a-side Open", venue: "📍 Soccer Ground, HSR Layout", status: "Coming Soon" },
      { id: "corporate-teams", name: "🏢 5-a-side Corporate", venue: "📍 Soccer Ground, HSR Layout", status: "Coming Soon" }
    ]
  },
  corp: {
    badminton: [
      { id: "singles-men", name: "👨 Men Singles", venue: "📍 ASL Arena, Koramangala", status: "Registering", featured: true },
      { id: "doubles-men", name: "👨‍👨‍ Men Doubles", venue: "📍 ASL Arena, Koramangala", status: "Registering" },
      { id: "singles-women", name: "👩 Women Singles", venue: "📍 ASL Arena, Koramangala", status: "Registering" },
      { id: "doubles-women", name: "👩‍👩‍ Women Doubles", venue: "📍 ASL Arena, Koramangala", status: "Registering" },
      { id: "mixed-doubles", name: "👫 Mixed Doubles", venue: "📍 ASL Arena, Koramangala", status: "Registering" },
      { id: "team-badminton", name: "👥 Badminton Team <span style=\"font-size:0.85rem; opacity:0.6; font-weight:normal; margin-left: 5px;\">(3-5 persons)</span>", venue: "📍 ASL Arena, Koramangala", status: "Registering" }
    ],
    cricket: [
      { id: "singles-men", name: "🏏 6-a-side Corporate Cup", venue: "📍 Cricket Turf, HSR Layout", status: "Coming Soon" }
    ],
    esports: [
      { id: "fifa-corp", name: "🎮 FIFA 26 Corporate", venue: "📍 Gaming Hub, Indiranagar", status: "Coming Soon" },
      { id: "val-corp", name: "🎮 Valorant Corporate", venue: "📍 Gaming Hub, Indiranagar", status: "Coming Soon" }
    ],
    soccer: [
      { id: "soccer-corp", name: "⚽ 5-a-side Corporate Shield", venue: "📍 Soccer Ground, HSR Layout", status: "Coming Soon" }
    ]
  }
};
window.categoriesData = categoriesData;

let currentModalType = 'open';
let currentModalDate = '';
let currentModalSport = 'badminton';

function openCategoriesModal(type, dateStr) {
  currentModalType = type;
  currentModalDate = dateStr;
  currentModalSport = 'badminton';
  
  const dateObj = new Date(dateStr);
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const prettyDate = dateObj.toLocaleDateString('en-US', options);
  
  const modal = document.getElementById('scheduleCategoryModal');
  if (!modal) return;
  
  const content = modal.querySelector('.modal-content');
  if (content) {
    content.className = 'modal-content category-modal-content theme-' + type;
  }
  
  const titleEl = document.getElementById('catModalTitle');
  const dateEl = document.getElementById('catModalDate');
  const badgeEl = document.getElementById('catModalBadge');
  
  if (titleEl) {
    titleEl.textContent = type === 'corp' ? 'Corporate Cup Categories' : 'Open Tournament Categories';
  }
  if (dateEl) {
    dateEl.textContent = '📅 ' + prettyDate;
  }
  if (badgeEl) {
    badgeEl.className = 'category-modal-type-badge ' + type;
    badgeEl.textContent = type === 'corp' ? 'Corporate Cup' : 'Open League';
  }
  
  const sportRow = document.getElementById('catModalSportRow');
  if (sportRow) {
    const sports = type === 'corp' 
      ? [
          { id: 'badminton', label: '🏸 Badminton' },
          { id: 'cricket', label: '🏏 Box Cricket' },
          { id: 'esports', label: '🎮 eSports' },
          { id: 'soccer', label: '⚽ Soccer' }
        ]
      : [
          { id: 'badminton', label: '🏸 Badminton' },
          { id: 'cricket', label: '🏏 Box Cricket' },
          { id: 'pickleball', label: '<img src="assets/pickleball.png" class="inline-sport-icon"> Pickleball' },
          { id: 'soccer', label: '⚽ Soccer' }
        ];
        
    sportRow.innerHTML = sports.map(s => {
      const activeClass = s.id === currentModalSport ? 'active' : '';
      const btnClass = type === 'corp' ? 'sport-filter-btn-corp' : 'sport-filter-btn';
      return `<button class="${btnClass} ${activeClass}" onclick="filterModalSport('${s.id}')">${s.label}</button>`;
    }).join('');
  }
  
  renderModalCategories();
  
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCategoriesModal() {
  const modal = document.getElementById('scheduleCategoryModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function filterModalSport(sportId) {
  currentModalSport = sportId;
  
  const sportRow = document.getElementById('catModalSportRow');
  if (sportRow) {
    sportRow.querySelectorAll('button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('onclick').includes(sportId)) {
        btn.classList.add('active');
      }
    });
  }
  
  renderModalCategories();
}

function renderModalCategories() {
  const grid = document.getElementById('catModalCategoryGrid');
  if (!grid) return;
  
  const categories = categoriesData[currentModalType][currentModalSport] || [];
  if (categories.length === 0) {
    grid.innerHTML = '<div class="no-events" style="text-align:center; padding: 30px; color: var(--text-muted);">No categories available for this sport.</div>';
    return;
  }
  
  const dateObj = new Date(currentModalDate);
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const formattedDate = dateObj.toLocaleDateString('en-US', options);
  
  grid.innerHTML = categories.map(cat => {
    const featuredClass = cat.featured ? 'featured' : '';
    const badgeClass = cat.status === 'Registering' ? 'status-open' : 'status-soon';
    const btnDisabled = cat.status === 'Registering' ? '' : 'disabled';
    const joinHandler = `window.location.href='register.html?type=${currentModalType}&sport=${currentModalSport}&category=${cat.id}'`;
    
    return `
      <div class="schedule-row ${featuredClass}">
        <div class="schedule-row-sport">${cat.name}</div>
        <div class="schedule-row-date">${formattedDate}</div>
        <div class="schedule-row-venue">${cat.venue}</div>
        <span class="status-badge ${badgeClass}">${cat.status}</span>
        <button class="btn btn-outline ${currentModalType === 'corp' ? 'btn-corp' : 'btn-open'} title-font" ${btnDisabled} onclick="${joinHandler}">Join</button>
      </div>
    `;
  }).join('');
}

// ── Interactive Donut Chart Engine ──
function initDonutChart() {
  const segments = document.querySelectorAll('.donut-segment');
  const labels = document.querySelectorAll('.donut-sport-label');
  const centerNum = document.getElementById('donut-num');
  const centerLabel = document.getElementById('donut-label');
  if (!segments.length || !centerNum) return;

  const sportData = {
    badminton: { num: '🏸', label: 'Badminton', color: 'var(--open-cyan)', level: 'Open & Corporate Leagues' },
    cricket: { num: '🏏', label: 'Box Cricket', color: 'var(--green)', level: 'Launching Soon' },
    esports: { num: '🎮', label: 'eSports', color: 'var(--purple)', level: 'Launching Soon' },
    pickleball: { num: '<img src="assets/pickleball.png" class="donut-sport-icon-img">', label: 'Pickleball', color: 'var(--accent)', level: 'Launching Soon' },
    soccer: { num: '⚽', label: 'Soccer', color: 'var(--red)', level: 'Launching Soon' }
  };

  const defaultData = { num: '5', label: 'Major Sports', color: 'var(--accent)' };

  function highlight(sportId) {
    const data = sportData[sportId];
    if (!data) return;

    // Update center content dynamically
    centerNum.innerHTML = data.num;
    centerNum.style.color = data.color;
    centerNum.style.fontSize = '3.2rem';
    
    centerLabel.innerHTML = `<span style="color:${data.color}; font-weight:700; font-size:0.95rem; display:block; margin-bottom: 2px;">${data.label}</span><span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">${data.level}</span>`;

    // Highlight the active SVG segment ring
    segments.forEach(seg => {
      if (seg.dataset.sport === sportId) {
        seg.style.strokeWidth = '16';
        seg.style.opacity = '1';
        seg.style.filter = `drop-shadow(0 0 6px ${data.color})`;
      } else {
        seg.style.opacity = '0.25';
        seg.style.strokeWidth = '12';
        seg.style.filter = 'none';
      }
    });

    // Highlight the corresponding absolute badge label
    labels.forEach(lbl => {
      if (lbl.dataset.sport === sportId) {
        lbl.classList.add('active');
        lbl.style.borderColor = data.color;
        lbl.style.color = '#ffffff';
        lbl.style.background = 'rgba(255,255,255,0.05)';
        lbl.style.transform = 'scale(1.08)';
        lbl.style.boxShadow = `0 4px 15px rgba(0, 0, 0, 0.45), 0 0 10px ${data.color}33`;
      } else {
        lbl.classList.remove('active');
        lbl.style.borderColor = '';
        lbl.style.color = '';
        lbl.style.background = '';
        lbl.style.transform = '';
        lbl.style.boxShadow = '';
        lbl.style.opacity = '0.3';
      }
    });
  }

  function reset() {
    // Reset center contents
    centerNum.textContent = defaultData.num;
    centerNum.style.color = defaultData.color;
    centerNum.style.fontSize = '2.5rem';
    centerLabel.innerHTML = defaultData.label;

    // Reset SVG segment rings
    segments.forEach(seg => {
      seg.style.strokeWidth = '12';
      seg.style.filter = 'none';
      seg.style.opacity = '1';
    });

    // Reset HTML labels
    labels.forEach(lbl => {
      lbl.classList.remove('active');
      lbl.style.borderColor = '';
      lbl.style.color = '';
      lbl.style.background = '';
      lbl.style.transform = '';
      lbl.style.boxShadow = '';
      lbl.style.opacity = '1';
    });
  }

  // Bind bidirectional event listeners (SVG hover -> Badge / Badge hover -> SVG)
  segments.forEach(seg => {
    const sportId = seg.dataset.sport;
    seg.addEventListener('mouseenter', () => highlight(sportId));
    seg.addEventListener('mouseleave', reset);
  });

  labels.forEach(lbl => {
    const sportId = lbl.dataset.sport;
    lbl.addEventListener('mouseenter', () => highlight(sportId));
    lbl.addEventListener('mouseleave', reset);
  });
}

console.log('%c🏸 ASL — Abstream Sports League', 'color:#ff6b00;font-size:18px;font-weight:bold;');
console.log('%cElevate The Game', 'color:#ffd700;font-size:12px;');
