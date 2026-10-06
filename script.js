/**
 * SANDS OF TIME — script.js
 * Core logic for scroll, interactive maps, audio synthesis, and era-specific modules.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. CONFIG & DATA ---
  
  // High-res Unsplash IDs that generally map to the themes (using robust IDs)
  const IMAGES = {
    night: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?q=80&w=1600',
    dunes: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?q=80&w=1600',
    petra: 'https://images.unsplash.com/photo-1579606032821-4e6161c81bd3?q=80&w=800',
    kaaba: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1600',
    arches: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1600',
    mosque: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?q=80&w=800', // Using beautiful archway/mosque
    desert: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?q=80&w=1600',
    riyadh: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=1600' // Night sky/city alternative
  };

  const BASE_MAP = `
    <svg class="map-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <!-- Stylized Arabian Peninsula Base -->
      <path class="land land-shadow" d="M120,40 L180,30 L260,80 L350,150 L360,220 L310,260 L280,330 L150,350 L80,260 L60,150 Z" />
      <path class="land" d="M120,40 L180,30 L260,80 L350,150 L360,220 L310,260 L280,330 L150,350 L80,260 L60,150 Z" />
      <text class="sea-label" x="40" y="220" transform="rotate(-65 40 220)">Red Sea</text>
      <text class="sea-label" x="310" y="100" transform="rotate(45 310 100)">Arabian Gulf</text>
      <text class="sea-label" x="220" y="370">Arabian Sea</text>
      <!-- Era-specific mount point -->
      <g class="era-layer"></g>
    </svg>
  `;

  // --- 2. CORE SYSTEMS ---

  // Preload Images
  document.querySelectorAll('.bg-img[data-bg]').forEach(el => {
    const key = el.dataset.bg;
    if (IMAGES[key]) {
      const img = new Image();
      img.onload = () => {
        el.style.backgroundImage = `url(${IMAGES[key]})`;
        el.classList.add('loaded');
        if (el.classList.contains('unif-ph')) el.classList.add('show');
      };
      img.src = IMAGES[key];
    }
  });

  // Text Splitter for Titles
  document.querySelectorAll('[data-split]').forEach(el => {
    const text = el.textContent;
    el.textContent = '';
    text.split(/(\s+)/).forEach(word => {
      if (word.trim() === '') {
        el.appendChild(document.createTextNode(word));
        return;
      }
      const wrap = document.createElement('span');
      wrap.className = 'word';
      word.split('').forEach((char, i) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.style.setProperty('--i', i);
        span.innerHTML = char === ' ' ? '&nbsp;' : char;
        wrap.appendChild(span);
      });
      el.appendChild(wrap);
    });
  });

  // Scroll Observer (Reveals & Era Tracking)
  const progress = document.getElementById('progress-bar');
  const header = document.getElementById('site-header');
  const chronoYear = document.getElementById('chrono-year');
  const chronoEra = document.getElementById('chrono-era');
  const chrono = document.getElementById('chrono');
  const railBtns = document.querySelectorAll('#era-rail button');
  const navLinks = document.querySelectorAll('.nav-link');
  let currentEra = 0;

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        if (entry.target.classList.contains('map-mount') && !entry.target.dataset.init) {
          initMap(entry.target);
          entry.target.dataset.init = 'true';
        }
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-zoom, [data-split], .map-mount, .counter, .unif-facts > div')
    .forEach(el => revealObserver.observe(el));

  // Parallax & Progress loop
  let lastScrollY = window.scrollY;
  let ticking = false;

  const updateScroll = () => {
    const st = window.scrollY;
    const wh = window.innerHeight;
    const dh = document.body.scrollHeight - wh;
    
    // Progress bar & Header
    progress.style.transform = `scaleX(${Math.min(st / dh, 1)})`;
    header.classList.toggle('scrolled', st > 50);
    chrono.classList.toggle('show', st > wh * 0.5);

    // Parallax elements
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const speed = parseFloat(el.dataset.parallax);
      const rect = el.getBoundingClientRect();
      if (rect.top < wh && rect.bottom > 0) {
        const yPos = (rect.top - wh/2) * speed;
        el.style.transform = `translate3d(0, ${yPos}px, 0)`;
      }
    });

    // Era tracking
    let activeEraEl = document.querySelector('.hero');
    document.querySelectorAll('.era').forEach(era => {
      const rect = era.getBoundingClientRect();
      if (rect.top < wh * 0.45 && rect.bottom > wh * 0.45) {
        activeEraEl = era;
      }
    });

    const newEra = parseInt(activeEraEl.dataset.era || '0');
    if (newEra !== currentEra) {
      currentEra = newEra;
      document.body.dataset.era = currentEra;
      
      // Update Nav & Rail
      railBtns.forEach(b => b.classList.toggle('active', b.dataset.target === activeEraEl.id));
      navLinks.forEach(l => l.classList.toggle('active', parseInt(l.dataset.nav) === currentEra));
      
      // Update Chrono
      chronoEra.textContent = activeEraEl.dataset.name || 'Prologue';
      const from = activeEraEl.dataset.from;
      if (from) chronoYear.textContent = from < 0 ? Math.abs(from) + ' BC' : from;
      else chronoYear.textContent = '∞';

      // Update Audio Scene
      if (audio.ctx) audio.setScene(activeEraEl.dataset.sound);
    }

    lastScrollY = st;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(updateScroll); ticking = true; }
  }, { passive: true });

  // Navigation click handlers
  railBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.target).scrollIntoView({ behavior: 'smooth' });
    });
  });
  
  // Mobile menu
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  menuToggle.addEventListener('click', () => {
    const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', !isExpanded);
    mobileMenu.classList.toggle('open');
  });
  mobileMenu.addEventListener('click', (e) => {
    if (e.target.tagName.closest && e.target.closest('a')) {
      menuToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('open');
    }
  });


  // --- 3. AMBIENT AUDIO SYNTHESIZER ---
  const audio = {
    ctx: null, nodes: [], master: null,
    
    init() {
      if (this.ctx) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
      document.getElementById('audio-toggle').setAttribute('aria-pressed', 'true');
      document.getElementById('audio-label').textContent = 'Sound on';
      this.setScene(document.body.dataset.era > 0 ? document.querySelector(`.era[data-era="${document.body.dataset.era}"]`).dataset.sound : 'wind');
    },
    
    toggle() {
      if (!this.ctx) { this.init(); return true; }
      if (this.ctx.state === 'running') {
        this.ctx.suspend();
        document.getElementById('audio-toggle').setAttribute('aria-pressed', 'false');
        document.getElementById('audio-label').textContent = 'Sound off';
        return false;
      } else {
        this.ctx.resume();
        document.getElementById('audio-toggle').setAttribute('aria-pressed', 'true');
        document.getElementById('audio-label').textContent = 'Sound on';
        return true;
      }
    },

    setVolume(v) { if (this.master) this.master.gain.setTargetAtTime(v / 100, this.ctx.currentTime, 0.1); },

    clear() {
      this.nodes.forEach(n => { try { n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} });
      this.nodes = [];
    },

    setScene(scene) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      this.clear();
      
      const makeNoise = (type = 'white') => {
        const size = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer; noise.loop = true;
        return noise;
      };

      if (scene === 'wind' || scene === 'caravan' || scene === 'desert') {
        // Wind generator
        const noise = makeNoise();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 400;
        
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.2;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 300;
        lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
        
        const gain = this.ctx.createGain();
        gain.gain.value = 0.3;
        
        noise.connect(filter); filter.connect(gain); gain.connect(this.master);
        noise.start(); lfo.start();
        this.nodes.push(noise, lfo, gain, filter);
        
        if (scene === 'caravan') {
          // Occasional low bell/thud
          setInterval(() => {
            if (this.ctx.state !== 'running') return;
            const osc = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            osc.frequency.value = 200 + Math.random() * 100;
            bGain.gain.setValueAtTime(0, this.ctx.currentTime);
            bGain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.05);
            bGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5);
            osc.connect(bGain); bGain.connect(this.master);
            osc.start(); osc.stop(this.ctx.currentTime + 1.5);
          }, 3000);
        }
      } 
      else if (scene === 'sacred') {
        // Ethereal drone
        [110, 165, 220].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine'; osc.frequency.value = freq;
          const gain = this.ctx.createGain();
          gain.gain.value = 0.05;
          const lfo = this.ctx.createOscillator();
          lfo.frequency.value = 0.1 + (i * 0.05);
          const lfoGain = this.ctx.createGain();
          lfoGain.gain.value = 0.03;
          lfo.connect(lfoGain); lfoGain.connect(gain.gain);
          osc.connect(gain); gain.connect(this.master);
          osc.start(); lfo.start();
          this.nodes.push(osc, lfo, gain);
        });
      }
      else if (scene === 'souq') {
        // Bustle simulation (bandpass noise + random pops)
        const noise = makeNoise();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 1;
        const gain = this.ctx.createGain(); gain.gain.value = 0.15;
        noise.connect(filter); filter.connect(gain); gain.connect(this.master);
        noise.start(); this.nodes.push(noise, filter, gain);
      }
      else if (scene === 'oasis' || scene === 'archive' || scene === 'city') {
        // Generic ambient pad for others to save code space
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle'; osc.frequency.value = scene === 'city' ? 60 : 150;
        const gain = this.ctx.createGain(); gain.gain.value = 0.08;
        osc.connect(gain); gain.connect(this.master);
        osc.start(); this.nodes.push(osc, gain);
      }
    }
  };

  document.getElementById('audio-toggle').addEventListener('click', () => {
    const isPlaying = audio.toggle();
    const toast = document.getElementById('sound-toast');
    toast.textContent = isPlaying ? 'Ambient sound enabled.' : 'Sound paused.';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  });
  
  document.getElementById('start-sound').addEventListener('click', (e) => {
    audio.init();
    document.getElementById('era-1').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('audio-volume').addEventListener('input', (e) => audio.setVolume(e.target.value));

  // --- 4. MAP & MODULE INITS ---
  const updateMapInfo = (mapId, title, desc, customClass = '') => {
    const container = document.querySelector(`[data-map-info="${mapId}"]`);
    if (!container) return;
    container.classList.remove('flash');
    void container.offsetWidth; // trigger reflow
    container.innerHTML = `<h4>${title} ${customClass ? `<small>${customClass}</small>` : ''}</h4><p>${desc}</p>`;
    container.classList.add('flash');
  };

  const drawPoint = (x, y, label = '') => `
    <g class="marker" transform="translate(${x},${y})">
      <circle class="ring" cx="0" cy="0" r="14" stroke="currentColor" />
      <circle class="pulse" cx="0" cy="0" r="10" fill="currentColor" />
      <circle class="core" cx="0" cy="0" r="4" fill="currentColor" />
      ${label ? `<text x="12" y="4" fill="currentColor">${label}</text>` : ''}
      <circle class="hit" cx="0" cy="0" r="20" />
    </g>`;

  function initMap(el) {
    const era = el.dataset.map;
    el.innerHTML = BASE_MAP;
    const layer = el.querySelector('.era-layer');
    
    if (era === 'pre') {
      layer.innerHTML = `
        <path class="route" d="M120,330 L160,280 L140,200 L110,120 L80,80" style="--len: 400" />
        <path class="route-dash" d="M120,330 L160,280 L140,200 L110,120 L80,80" />
        ${drawPoint(120, 330, 'Qana')}
        ${drawPoint(160, 280, 'Qaryat al-Faw')}
        ${drawPoint(140, 200, 'Yathrib')}
        ${drawPoint(110, 120, 'Hegra')}
        ${drawPoint(80, 80, 'Petra')}
      `;
      const points = layer.querySelectorAll('.marker');
      const data = [
        { t: "Qana (Yemen)", d: "A major port for frankincense trade on the Arabian Sea." },
        { t: "Qaryat al-Faw", d: "Capital of the Kindah kingdom, a prosperous oasis city controlling trade routes." },
        { t: "Yathrib", d: "A lush agricultural oasis that would later become Medina." },
        { t: "Hegra (Mada'in Salih)", d: "The second city of the Nabataeans, famous for monumental rock-cut tombs." },
        { t: "Petra", d: "The rose-red capital of the Nabataean kingdom." }
      ];
      points.forEach((p, i) => {
        p.style.setProperty('--md', `${i * 0.2 + 0.5}s`);
        p.addEventListener('click', () => {
          points.forEach(x => x.classList.remove('selected'));
          p.classList.add('selected');
          updateMapInfo('pre', data[i].t, data[i].d);
        });
      });
      el.classList.add('active'); // Start animation immediately
    }
    
    else if (era === 'dawn') {
      layer.innerHTML = `
        <circle class="reach glow-core" cx="130" cy="220" r="0" fill="currentColor" opacity="0" filter="url(#glow)"/>
        ${drawPoint(130, 220, 'Mecca')}
        ${drawPoint(135, 190, 'Medina')}
      `;
      initDawnSlider(layer);
    }
    
    else if (era === 'empire') {
      initEmpireMap(layer);
    }
    
    else if (era === 'mud') {
      layer.innerHTML = `
        <path class="territory" id="terr-saudi" d="M120,150 L260,100 L320,200 L250,300 L100,280 Z" fill="currentColor" opacity="0.3" />
        ${drawPoint(220, 180, 'Diriyah')}
        ${drawPoint(225, 195, 'Riyadh')}
      `;
      el.classList.add('active');
    }
    
    else if (era === 'unif') {
      initUnifMap(layer);
    }
    
    else if (era === 'modern') {
      layer.innerHTML = `
        <!-- High Speed Rail -->
        <path class="route" d="M115,220 L125,180" style="--len:50" stroke="currentColor" />
        <!-- Neom -->
        <g class="marker" transform="translate(100,70)" style="--md: 0.2s"><rect x="-6" y="-6" width="12" height="12" fill="currentColor"/><text x="12" y="4" fill="currentColor">NEOM</text><rect class="hit" x="-15" y="-15" width="30" height="30" fill="transparent"/></g>
        <!-- Riyadh -->
        <g class="marker" transform="translate(230,190)" style="--md: 0.4s"><polygon points="0,-8 7,4 -7,4" fill="currentColor"/><text x="12" y="4" fill="currentColor">Riyadh</text><rect class="hit" x="-15" y="-15" width="30" height="30" fill="transparent"/></g>
        <!-- AlUla -->
        <g class="marker" transform="translate(130,120)" style="--md: 0.6s"><circle cx="0" cy="0" r="5" fill="currentColor"/><text x="12" y="4" fill="currentColor">AlUla</text><circle class="hit" cx="0" cy="0" r="20" fill="transparent"/></g>
      `;
      el.classList.add('active');
      const data = [
        { id: 'neom', n: 'NEOM', t: 'Giga-Project', d: 'A futuristic region being built from the ground up, including THE LINE, a cognitive city.' },
        { id: 'riyadh', n: 'King Salman Park', t: 'Riyadh', d: 'Spanning over 16 sq km, envisioned as the largest urban park in the world.' },
        { id: 'alula', n: 'AlUla', t: 'Heritage', d: 'Transforming a region of extraordinary natural and human heritage into a living museum.' }
      ];
      const list = document.getElementById('project-list');
      data.forEach((item, i) => {
        const btn = document.createElement('button');
        btn.className = 'project';
        btn.innerHTML = `<div class="dot"></div><div><b>${item.n}</b><small>${item.t}</small></div><div class="arr">→</div>`;
        btn.onclick = () => {
          document.querySelectorAll('.project').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          updateMapInfo('modern', item.n, item.d, item.t);
        };
        list.appendChild(btn);
      });
      // Click first
      list.firstChild.click();
    }
  }

  // ERA II: Dawn Slider
  function initDawnSlider(layer) {
    const range = document.getElementById('spread-range');
    const text = document.getElementById('spread-text');
    const title = document.getElementById('spread-title');
    const year = document.getElementById('spread-year');
    const playBtn = document.getElementById('spread-play');
    const reach = layer.querySelector('.reach');
    
    const steps = [
      { y: 610, t: 'The First Revelation', d: 'In the cave of Hira, Muhammad receives the first verses of the Qur\'an.', r: 5 },
      { y: 622, t: 'The Hijrah', d: 'The migration from Mecca to Yathrib (Medina), marking year 1 of the Islamic calendar.', r: 15 },
      { y: 630, t: 'Return to Mecca', d: 'The peaceful return to Mecca. The Kaaba is dedicated to monotheism.', r: 25 },
      { y: 632, t: 'Abu Bakr', d: 'Consolidation of the peninsula under the first Caliph.', r: 60 },
      { y: 644, t: 'Umar', d: 'Expansion reaching Egypt, the Levant, and Persia.', r: 140 },
      { y: 661, t: 'Ali & Transition', d: 'The end of the Rashidun era. The reach of Islam spans three continents.', r: 250 }
    ];
    
    // Scale slider max
    range.max = steps.length - 1;
    let playing = null;

    const updateSpread = (val) => {
      const s = steps[val];
      year.textContent = s.y;
      title.textContent = s.t;
      text.textContent = s.d;
      reach.setAttribute('r', s.r);
      reach.setAttribute('opacity', val === 0 ? '0' : '0.4');
      range.style.setProperty('--p', `${(val / range.max) * 100}%`);
    };

    range.addEventListener('input', e => {
      clearInterval(playing);
      playBtn.setAttribute('aria-pressed', 'false');
      playBtn.textContent = '▶ Play';
      updateSpread(parseInt(e.target.value));
    });
    
    playBtn.addEventListener('click', () => {
      if (playing) {
        clearInterval(playing);
        playing = null;
        playBtn.setAttribute('aria-pressed', 'false');
        playBtn.textContent = '▶ Play';
      } else {
        playBtn.setAttribute('aria-pressed', 'true');
        playBtn.textContent = '❚❚ Pause';
        if (range.value == range.max) range.value = 0;
        playing = setInterval(() => {
          let v = parseInt(range.value) + 1;
          if (v > range.max) {
            clearInterval(playing);
            playing = null;
            playBtn.setAttribute('aria-pressed', 'false');
            playBtn.textContent = '▶ Play';
            return;
          }
          range.value = v;
          updateSpread(v);
        }, 1500);
        updateSpread(range.value);
      }
    });
    updateSpread(0);
    layer.parentNode.classList.add('active'); // Show markers
  }

  // ERA III: Empire Tabs & Timeline
  function initEmpireMap(layer) {
    const dynBtns = document.querySelectorAll('.era-empire .seg-btn');
    const mapInfo = document.querySelector('[data-map-info="empire"]');
    
    const drawEmpire = (dynasty) => {
      if (dynasty === 'umayyad') {
        layer.innerHTML = `
          <path class="territory on" d="M20,20 L380,20 L380,180 L200,200 L40,150 Z" fill="currentColor" opacity="0.2" />
          ${drawPoint(120, 60, 'Damascus')}
          ${drawPoint(135, 190, 'Medina')}
          <path class="route" d="M120,60 L135,190" style="--len: 150" stroke="currentColor" />
        `;
        document.getElementById('dynasty-card').innerHTML = `
          <h4>The Umayyad Caliphate</h4>
          <div class="meta">661 – 750 CE</div>
          <p>Ruling from Damascus, the Umayyads built the first great Islamic monuments, including the Dome of the Rock. Medina remained the spiritual and academic centre of the peninsula.</p>
        `;
      } else {
        layer.innerHTML = `
          <path class="territory on" d="M20,20 L380,20 L380,180 L200,200 L40,150 Z" fill="currentColor" opacity="0.2" />
          ${drawPoint(220, 80, 'Baghdad')}
          ${drawPoint(130, 220, 'Mecca')}
          <path class="route" d="M220,80 L180,130 L130,220" style="--len: 200" stroke="currentColor" />
        `;
        document.getElementById('dynasty-card').innerHTML = `
          <h4>The Abbasid Caliphate</h4>
          <div class="meta">750 – 1258 CE</div>
          <p>With the capital shifted to Baghdad, the Islamic world entered a golden age of science and philosophy. Zubaydah, wife of Harun al-Rashid, engineered the famous Darb Zubaydah pilgrim road to Mecca.</p>
        `;
      }
      setTimeout(() => layer.parentNode.classList.add('active'), 50);
    };

    dynBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dynBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        drawEmpire(btn.dataset.dynasty);
        mapInfo.innerHTML = '<p class="map-hint">✦ Capital and pilgrim road updated.</p>';
      });
    });
    drawEmpire('umayyad');
    
    // Golden Age Interactive Timeline
    const track = document.getElementById('golden-track');
    const detail = document.getElementById('golden-detail');
    const gData = [
      { y: '780', c: 'Mathematics', n: 'Al-Khwarizmi', d: 'The father of algebra. His seminal text, <i>Al-Jabr</i>, revolutionised mathematics.' },
      { y: '859', c: 'Education', n: 'Fatima al-Fihriya', d: 'Founded the University of al-Qarawiyyin, the oldest continuously operating university in the world.' },
      { y: '965', c: 'Optics', n: 'Ibn al-Haytham', d: 'Proved that vision occurs when light bounces off objects into the eyes, inventing the camera obscura.' },
      { y: '1154', c: 'Geography', n: 'Al-Idrisi', d: 'Created the <i>Tabula Rogeriana</i>, the most accurate map of the world for the next three centuries.' }
    ];
    
    gData.forEach((item, i) => {
      const node = document.createElement('button');
      node.className = 'g-node' + (i === 0 ? ' active' : '');
      node.innerHTML = `<span class="cat">${item.c}</span><div class="gem"></div><span class="yr">${item.y}</span><span class="lbl">${item.n}</span>`;
      node.onclick = () => setGolden(i);
      track.appendChild(node);
    });

    let gIdx = 0;
    const setGolden = (idx) => {
      gIdx = idx;
      document.querySelectorAll('.g-node').forEach((n, i) => n.classList.toggle('active', i === idx));
      const item = gData[idx];
      detail.classList.remove('swap');
      void detail.offsetWidth;
      detail.innerHTML = `
        <div class="glyph"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2"><circle cx="50" cy="50" r="40"/><path d="M50 10 L50 90 M10 50 L90 50 M22 22 L78 78 M22 78 L78 22"/></svg></div>
        <div>
          <h4>${item.n}</h4>
          <div class="meta">${item.c} · c. ${item.y}</div>
          <p>${item.d}</p>
        </div>
      `;
      detail.classList.add('swap');
    };
    
    document.getElementById('golden-prev').onclick = () => setGolden(Math.max(0, gIdx - 1));
    document.getElementById('golden-next').onclick = () => setGolden(Math.min(gData.length - 1, gIdx + 1));
    setGolden(0);
  }

  // ERA IV: Brick Wall logic
  const brickData = [
    { y: '1727', t: 'Foundation', d: 'Imam Muhammad bin Saud establishes the First Saudi State in Diriyah, bringing stability to the region.', s: 1 },
    { y: '1765', t: 'Expansion', d: 'Under Imam Abdulaziz, the state\'s authority expands across Najd and beyond.', s: 1 },
    { y: '1818', t: 'The Fall', d: 'After fierce resistance, Diriyah falls to invading Ottoman-Egyptian forces. The First State ends.', s: 1 },
    { y: '1824', t: 'The Restoration', d: 'Imam Turki bin Abdullah re-establishes the Saudi State (the Second), making Riyadh the new capital.', s: 2 },
    { y: '1891', t: 'Exile', d: 'Internal strife weakens the Second State. The House of Saud departs Riyadh for Kuwait.', s: 2 }
  ];
  
  const bWall = document.getElementById('brick-wall');
  const bDetail = document.getElementById('brick-detail');
  let currentBrick = 0;
  
  const setBrick = (idx) => {
    currentBrick = idx;
    document.querySelectorAll('.brick').forEach((b, i) => b.classList.toggle('active', i === idx));
    const item = brickData[idx];
    bDetail.classList.remove('swap');
    void bDetail.offsetWidth;
    bDetail.innerHTML = `<div class="yr">${item.y}</div><h4>${item.t}</h4><p>${item.d}</p>`;
    bDetail.classList.add('swap');
    
    // Switch state tab if needed
    document.querySelector(`.era-mud .seg-btn[data-state="${item.s}"]`).click();
  };

  // Setup wall observer
  const wallObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      document.querySelectorAll('.brick').forEach((b, i) => {
        setTimeout(() => b.classList.add('laid'), i * 200);
      });
      wallObserver.disconnect();
    }
  });

  brickData.reverse().forEach((b, i) => {
    const realIdx = brickData.length - 1 - i;
    const btn = document.createElement('button');
    btn.className = 'brick w-full';
    btn.innerHTML = `<b>${b.y}</b> <span>${b.t}</span>`;
    btn.onclick = () => setBrick(realIdx);
    bWall.appendChild(btn);
  });
  wallObserver.observe(bWall);
  
  // State map toggles
  document.querySelectorAll('.era-mud .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.era-mud .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const terr = document.getElementById('terr-saudi');
      if (terr) {
        terr.classList.remove('new');
        void terr.offsetWidth;
        terr.setAttribute('d', btn.dataset.state === '1' ? 'M100,120 L280,80 L340,220 L220,320 L80,250 Z' : 'M140,160 L260,130 L300,240 L200,280 L120,220 Z');
        terr.classList.add('new');
      }
    });
  });
  // Init first brick details (which is index 0 in the original array, foundation)
  setTimeout(() => setBrick(0), 100);

  // ERA V: The Great Unification (Focal Module)
  function initUnifMap(layer) {
    const uData = [
      { y: 1902, t: 'The Recapture of Riyadh', dt: '15 Jan 1902', d: 'Abdulaziz and a small group of loyal men scale the walls of Masmak Fort at dawn, reclaiming the ancestral capital and sparking the Third Saudi State.', cx: 225, cy: 195, lbl: 'Riyadh' },
      { y: 1913, t: 'Al-Ahsa & the East', dt: 'May 1913', d: 'Abdulaziz leads his forces east to secure Al-Ahsa, ending Ottoman presence and gaining access to the Arabian Gulf.', cx: 270, cy: 170, lbl: 'Al-Ahsa' },
      { y: 1921, t: 'Consolidation of Najd', dt: '1921', d: 'With the fall of Ha\'il, the vast interior of the peninsula is unified under Riyadh\'s rule.', cx: 180, cy: 120, lbl: "Ha'il" },
      { y: 1925, t: 'The Hejaz', dt: 'Dec 1925', d: 'The western region, including the holy cities of Mecca and Medina, peacefully enters the new state.', cx: 130, cy: 220, lbl: 'Jeddah/Mecca' },
      { y: 1927, t: 'Treaty of Jeddah', dt: 'May 1927', d: 'Great Britain officially recognises Abdulaziz as the King of Hejaz and Najd, securing absolute independence.', cx: 225, cy: 195 },
      { y: 1932, t: 'Kingdom of Saudi Arabia', dt: '23 Sep 1932', d: 'The unified regions are officially named the Kingdom of Saudi Arabia by royal decree.', cx: 225, cy: 195 },
      { y: 1933, t: 'The Concession', dt: 'May 1933', d: 'Standard Oil of California (SoCal) signs a concession agreement to explore for oil in the eastern deserts.', cx: 280, cy: 160 },
      { y: 1938, t: 'Dammam No. 7', dt: 'Mar 1938', d: 'After years of dry holes, the "Prosperity Well" strikes commercial quantities of oil, transforming the Kingdom\'s future.', cx: 290, cy: 155, lbl: 'Dammam' }
    ];

    const range = document.getElementById('unif-range');
    const uMod = document.getElementById('unif-module');
    const stTitle = document.getElementById('unif-title');
    const stText = document.getElementById('unif-text');
    const stDate = document.getElementById('unif-date');
    const reel = document.getElementById('unif-reel');
    const mTitle = document.getElementById('unif-map-title');
    const storyWrap = document.querySelector('.unif-story');
    const playBtn = document.getElementById('unif-play');
    
    range.max = uData.length - 1;
    document.getElementById('unif-total').textContent = uData.length < 10 ? '0'+uData.length : uData.length;
    
    // Draw map elements
    layer.innerHTML = `
      <path class="territory on" id="unif-terr" d="M200,180 L250,180 L250,220 L200,220 Z" fill="currentColor" opacity="0.3" />
      <g id="unif-markers"></g>
    `;
    const terr = document.getElementById('unif-terr');
    const markers = document.getElementById('unif-markers');
    
    let uPlay = null;

    const setUnif = (val) => {
      const d = uData[val];
      const sepia = 1 - (val / range.max); // 1 to 0
      uMod.style.setProperty('--sepia', sepia);
      range.style.setProperty('--p', `${(val / range.max) * 100}%`);
      
      storyWrap.classList.remove('swap');
      void storyWrap.offsetWidth;
      stTitle.textContent = d.t;
      stText.textContent = d.d;
      stDate.textContent = d.dt;
      reel.textContent = (val + 1 < 10) ? '0'+(val+1) : (val+1);
      mTitle.textContent = `Territory · ${d.y}`;
      storyWrap.classList.add('swap');
      
      // Update territory shape roughly
      const rad = 20 + (val * 18);
      terr.setAttribute('d', `M${225-rad},${195-rad*0.5} L${225+rad},${195-rad*0.7} L${225+rad*0.8},${195+rad} L${225-rad*0.5},${195+rad} Z`);
      
      if (d.lbl && !document.getElementById(`um-${val}`)) {
        markers.innerHTML += `<g id="um-${val}" class="marker" transform="translate(${d.cx},${d.cy})" style="opacity:1;transform:scale(1)"><circle cx="0" cy="0" r="4" fill="currentColor" /><text x="10" y="4" fill="currentColor">${d.lbl}</text></g>`;
      }
    };

    range.addEventListener('input', e => {
      clearInterval(uPlay); playBtn.setAttribute('aria-pressed', 'false');
      setUnif(parseInt(e.target.value));
    });
    
    document.getElementById('unif-prev').onclick = () => { let v = Math.max(0, parseInt(range.value)-1); range.value = v; setUnif(v); };
    document.getElementById('unif-next').onclick = () => { let v = Math.min(range.max, parseInt(range.value)+1); range.value = v; setUnif(v); };
    
    playBtn.addEventListener('click', () => {
      if (uPlay) { clearInterval(uPlay); uPlay = null; playBtn.setAttribute('aria-pressed', 'false'); }
      else {
        playBtn.setAttribute('aria-pressed', 'true');
        if (range.value == range.max) { range.value = 0; markers.innerHTML = ''; }
        uPlay = setInterval(() => {
          let v = parseInt(range.value) + 1;
          if (v > range.max) { clearInterval(uPlay); uPlay = null; playBtn.setAttribute('aria-pressed', 'false'); return; }
          range.value = v; setUnif(v);
        }, 3000);
        setUnif(range.value);
      }
    });

    // Keyboard nav
    document.addEventListener('keydown', e => {
      if (document.body.dataset.era === '5') {
        if (e.key === 'ArrowLeft') document.getElementById('unif-prev').click();
        if (e.key === 'ArrowRight') document.getElementById('unif-next').click();
      }
    });

    setUnif(0);
    layer.parentNode.classList.add('active');
  }

  // Number Counter Animation
  document.querySelectorAll('[data-count]').forEach(el => {
    let fired = false;
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || '';
    
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !fired) {
        fired = true;
        let start = 0;
        const dur = 2000;
        const stTime = performance.now();
        const tick = (now) => {
          const p = Math.min((now - stTime) / dur, 1);
          // ease out quart
          const ease = 1 - Math.pow(1 - p, 4);
          el.textContent = (start + (target - start) * ease).toFixed(decimals) + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target + suffix; // exact final value
        };
        requestAnimationFrame(tick);
      }
    });
    obs.observe(el);
  });

});
