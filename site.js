'use strict';

// ---------- Erstbesuch dieser Session erkennen ----------
// Die Lade-Intro (Titel-Wipe, Kronen-Tropfen, Karten-Aufbau) soll nur einmal
// pro Browser-Tab laufen, nicht bei jeder Rueckkehr auf die Seite.
try {
  if (!sessionStorage.getItem('nwuVisited')) {
    document.body.classList.add('first-visit');
    sessionStorage.setItem('nwuVisited', '1');
  }
} catch (e) {
  // Privater Modus o.ae. kann sessionStorage blockieren, dann laeuft die Seite einfach ohne Intro
}

// ---------- Nachteulen-Gruss ----------
// Zwischen 22 und 5 Uhr (lokale Zeit des Besuchers) zeigt der Subtitle einen
// kleinen Nod an alle, die nachts online sind. Laeuft vor der Erfassung des
// Standard-Subtitles im Hexenmodus-Abschnitt, damit dieser Text zum neuen
// "Normalzustand" fuer diese Seite wird.
try {
  const hour = new Date().getHours();
  const isNight = hour >= 22 || hour < 5;
  if (isNight) {
    const subEl = document.getElementById('headerSub');
    if (subEl) subEl.textContent = 'Es ist Nacht. Die Richtigen sind wach.';
  }
} catch (e) {
  // Kein Datum verfuegbar o.ae., dann bleibt der normale Subtitle stehen
}

// ---------- Partikel (Gold Funken) ----------
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const hexCanvas = document.getElementById('hex-sigil-canvas');
const hexCtx = hexCanvas.getContext('2d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Zeichenflaeche in CSS-Pixeln; die Canvas-Bitmap wird fuer scharfe Kanten mit der
// Geraetepixeldichte multipliziert, der Kontext rechnet danach wieder in CSS-Pixeln.
let viewW = window.innerWidth;
let viewH = window.innerHeight;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  [canvas, hexCanvas].forEach((c) => {
    c.width = Math.round(viewW * dpr);
    c.height = Math.round(viewH * dpr);
    c.style.width = viewW + 'px';
    c.style.height = viewH + 'px';
  });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hexCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const particles = [];
const PARTICLE_COUNT = 120;

function newParticle(p) {
  p.x = Math.random() * viewW;
  p.y = Math.random() * viewH;
  p.r = p.r || Math.random() * 1.5 + 0.3;
  p.dx = (Math.random() - 0.5) * 0.08;
  p.dy = (Math.random() - 0.5) * 0.08;
  p.life = Math.random();
  p.alpha = Math.random() * 0.8 + 0.2;
  return p;
}
for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(newParticle({}));

// ---------- Hexenmodus: fliegende Mini-Pentagramme ----------
// hexModeActive wird vom Hexenmodus-Trigger weiter unten gesetzt.
let hexModeActive = false;
const sigils = [];
const SIGIL_MAX = 6;
let lastSigilSpawn = 0;
let sigilsDrawnLastFrame = false;

function pentagramPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function drawSigil(p) {
  const pts = pentagramPoints(p.x, p.y, p.r);
  const order = [0, 2, 4, 1, 3, 0];
  hexCtx.save();
  hexCtx.beginPath();
  order.forEach((idx, i) => {
    const [px, py] = pts[idx];
    if (i === 0) hexCtx.moveTo(px, py); else hexCtx.lineTo(px, py);
  });
  hexCtx.closePath();
  hexCtx.shadowColor = 'rgba(201, 168, 76, 0.85)';
  hexCtx.shadowBlur = 6;
  hexCtx.strokeStyle = `rgba(232, 201, 109, ${p.alpha})`;
  hexCtx.lineWidth = 1.1;
  hexCtx.stroke();
  hexCtx.restore();
}

function spawnSigil() {
  sigils.push({
    x: viewW * 0.15 + Math.random() * viewW * 0.7,
    y: 140 + Math.random() * 40,
    r: Math.random() * 5 + 7,
    dx: (Math.random() - 0.5) * 0.06,
    vy: Math.random() * 0.2 + 0.35,
    life: 1
  });
}

function updateSigils(now) {
  if (
    hexModeActive &&
    !reduceMotion &&
    sigils.length < SIGIL_MAX &&
    now - lastSigilSpawn > 450 + Math.random() * 300
  ) {
    spawnSigil();
    lastSigilSpawn = now;
  }
  // Im Leerlauf ist die Sigil-Ebene leer. Dann waere ein clearRect ueber die ganze
  // Flaeche reine Arbeit: es wuerde jeden Frame die Karten darueber neu komponieren.
  if (sigils.length === 0) {
    if (sigilsDrawnLastFrame) {
      hexCtx.clearRect(0, 0, viewW, viewH);
      sigilsDrawnLastFrame = false;
    }
    return;
  }
  hexCtx.clearRect(0, 0, viewW, viewH);
  sigilsDrawnLastFrame = true;
  for (let i = sigils.length - 1; i >= 0; i--) {
    const s = sigils[i];
    s.x += s.dx;
    s.y += s.vy;
    s.life -= 0.0018;
    if (s.life <= 0 || s.y > viewH + 40) { sigils.splice(i, 1); continue; }
    const alpha = Math.max(0, Math.min(0.75, Math.min(s.life, 1 - s.life) * 2.2));
    drawSigil({ x: s.x, y: s.y, r: s.r, alpha });
  }
}

function drawParticles(now) {
  ctx.clearRect(0, 0, viewW, viewH);
  particles.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201, 168, 76, ${p.alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(240, 208, 128, ${p.alpha * 0.5})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    p.x += p.dx;
    p.y += p.dy;
    p.life -= 0.004;
    p.alpha = p.life * 0.8;
    if (p.life <= 0) { newParticle(p); p.life = 1; }

    if (p.x < -p.r) p.x = viewW + p.r;
    if (p.x > viewW + p.r) p.x = -p.r;
    if (p.y < -p.r) p.y = viewH + p.r;
    if (p.y > viewH + p.r) p.y = -p.r;
  });
  updateSigils(now || performance.now());
  if (!reduceMotion) requestAnimationFrame(drawParticles);
}
drawParticles(performance.now());

// ---------- Live Status ----------
// 1. Worker /live: erkennt Twitch automatisch und beachtet zusätzlich den Sicherheits-Schalter im Admin Panel.
// 2. Ist der Worker nicht erreichbar: nur der Schalter aus dem Admin Panel (Firestore status/twitch), wie früher.
// Nur Lesezugriff, kein Schlüssel nötig.
const LIVE_URL = 'https://nwu-anmeldung.nwu-brand.workers.dev/live';
const STATUS_URL = 'https://firestore.googleapis.com/v1/projects/adminpannel-f0aab/databases/(default)/documents/status/twitch';

async function liveAbfragen() {
  try {
    const res = await fetch(LIVE_URL, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (res.ok) { const j = await res.json(); if (typeof j.live === 'boolean') return j.live; }
  } catch (e) { /* weiter mit dem Admin-Panel-Schalter */ }
  const res = await fetch(STATUS_URL, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) return null;
  const json = await res.json();
  return Boolean(json && json.fields && json.fields.isLive && json.fields.isLive.booleanValue === true);
}

async function checkLiveStatus() {
  const twitchCard = document.querySelector('a[href^="https://twitch.tv/mrnightwither"]');
  if (!twitchCard) return;
  try {
    const isLive = await liveAbfragen();
    if (isLive === null) return;

    const existing = twitchCard.querySelector('.live-badge');
    if (isLive && !existing) {
      const badge = document.createElement('div');
      badge.className = 'live-badge';
      badge.textContent = '🔴 LIVE';
      twitchCard.style.position = 'relative';
      twitchCard.appendChild(badge);
    } else if (!isLive && existing) {
      existing.remove();
    }
  } catch (e) {
    // Still bleiben, die Seite funktioniert auch ohne Live Anzeige
  }
}

checkLiveStatus();
setInterval(checkLiveStatus, 60000);

// ---------- Hexenmodus (5x Klick auf die Krone) ----------
const logoBtn = document.getElementById('logoBtn');
const hexOverlay = document.getElementById('hexOverlay');
const hexSmoke = document.getElementById('hexSmoke');
const hexStatus = document.getElementById('hexStatus');
const headerSub = document.getElementById('headerSub');
const bodyEl = document.body;

const HEX_SUBTITLE = 'Fünf Zacken, eine Unity';
const defaultSubtitle = headerSub ? headerSub.textContent : '';

let hexClickCount = 0;
let hexClickTimer = null;
let hexRunning = false;

function resetHexClicks() {
  hexClickCount = 0;
  clearTimeout(hexClickTimer);
}

let hexTimers = [];

// Krone und Titel sind waehrend des Hexenmodus nur ausgeblendet, nicht entfernt.
// Ohne inert blieben sie fokussierbar - man koennte einen unsichtbaren Button anspringen.
function setHeaderInert(on) {
  const title = document.querySelector('.header-title');
  [logoBtn, title].forEach((el) => {
    if (!el) return;
    if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
  });
}

function endHexenmodus() {
  hexTimers.forEach(clearTimeout);
  hexTimers = [];
  bodyEl.classList.remove('hex-drawing', 'hex-hold', 'hex-exit');
  hexOverlay.classList.remove('hex-active');
  hexSmoke.classList.remove('hex-smoke-active');
  setHeaderInert(false);
  if (headerSub) headerSub.textContent = defaultSubtitle;
  if (hexStatus) hexStatus.textContent = '';
  hexModeActive = false;
  hexRunning = false;
}

function triggerHexenmodus() {
  if (hexRunning || blutmondRunning || !logoBtn || !hexOverlay) return;
  // Das Overlay haengt am Viewport-Oberrand, wo im Normalfall die Krone sitzt.
  // Weit unten auf der Seite wuerde das Pentagramm sonst ueber den Karten landen.
  if (window.scrollY > 80) {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  hexRunning = true;
  if (hexStatus) hexStatus.textContent = 'Hexenmodus aktiviert';

  const drawMs = reduceMotion ? 250 : 5000;
  const holdMs = reduceMotion ? 250 : 4000;
  const exitMs = reduceMotion ? 250 : 1500;

  hexOverlay.classList.add('hex-active');
  bodyEl.classList.add('hex-drawing');
  setHeaderInert(true);
  hexModeActive = true;

  hexTimers.push(setTimeout(() => {
    bodyEl.classList.remove('hex-drawing');
    bodyEl.classList.add('hex-hold');
    if (headerSub) headerSub.textContent = HEX_SUBTITLE;
  }, drawMs));

  hexTimers.push(setTimeout(() => {
    bodyEl.classList.remove('hex-hold');
    bodyEl.classList.add('hex-exit');
    hexSmoke.classList.add('hex-smoke-active');
    setHeaderInert(false);
    hexModeActive = false;
  }, drawMs + holdMs));

  hexTimers.push(setTimeout(endHexenmodus, drawMs + holdMs + exitMs));
}

// ---------- Blutmond (Krone lange gedrueckt halten) ----------
const blutmond = document.getElementById('blutmond');
let blutmondRunning = false;
let holdTimer = null;
let holdTriggered = false;

function triggerBlutmond() {
  if (hexRunning || blutmondRunning || !blutmond) return;
  blutmondRunning = true;
  if (hexStatus) hexStatus.textContent = 'Blutmond aktiviert';
  if (headerSub) headerSub.textContent = 'Der Blutmond steigt.';

  const holdVisibleMs = reduceMotion ? 300 : 2600;
  const fadeOutMs = reduceMotion ? 200 : 1200;

  bodyEl.classList.add('blutmond-active');

  const t1 = setTimeout(() => {
    bodyEl.classList.add('blutmond-exit');
  }, holdVisibleMs);

  const t2 = setTimeout(() => {
    bodyEl.classList.remove('blutmond-active', 'blutmond-exit');
    if (headerSub) headerSub.textContent = defaultSubtitle;
    if (hexStatus) hexStatus.textContent = '';
    blutmondRunning = false;
  }, holdVisibleMs + fadeOutMs);
}

if (logoBtn) {
  const HOLD_THRESHOLD_MS = 850;

  logoBtn.addEventListener('pointerdown', () => {
    if (hexRunning || blutmondRunning) return;
    holdTriggered = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      holdTriggered = true;
      resetHexClicks();
      triggerBlutmond();
    }, HOLD_THRESHOLD_MS);
  });
  logoBtn.addEventListener('pointerup', () => clearTimeout(holdTimer));
  logoBtn.addEventListener('pointerleave', () => clearTimeout(holdTimer));
  logoBtn.addEventListener('pointercancel', () => clearTimeout(holdTimer));

  logoBtn.addEventListener('click', () => {
    if (holdTriggered) { holdTriggered = false; return; }
    if (hexRunning || blutmondRunning) return;
    hexClickCount++;
    clearTimeout(hexClickTimer);
    hexClickTimer = setTimeout(resetHexClicks, 900);
    if (hexClickCount >= 5) {
      resetHexClicks();
      triggerHexenmodus();
    }
  });
}

// ---------- Geheimnisse: zwei versteckte Rabattcodes ----------
const secretReveal = document.getElementById('secretReveal');

// Weder die Ausloeser noch die Codes stehen im Klartext im Quelltext. Der Code
// wird erst aus den Zahlen unten zusammengesetzt, wenn der richtige Ausloeser
// passt. Das haelt Zufallsfunde per "Seitenquelltext anzeigen" draussen; gegen
// gezieltes Auseinandernehmen schuetzt auf einer statischen Seite nichts.
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function decodeSecret(cipher, key) {
  return cipher.map((n, i) => String.fromCharCode(n ^ key.charCodeAt(i % key.length))).join('');
}

const SECRET_TOTAL = 2;
const FOUND_KEY = 'nwuSecretsFound';
const SECRET_WORD_HASH = 998371578;
const SECRET_WORD_LEN = 5;
const CIPHER_TYPED = [6, 11, 10, 6, 28, 1, 27, 123, 100];
const KEY_HOLD = [110, 119, 117, 78, 97, 99, 104, 116];
const CIPHER_HOLD = [61, 50, 54, 28, 36, 55, 61, 69, 88];

let secretBuffer = '';

// Globaler Schalter: dasselbe Firestore-Projekt wie der Live-Status. Steht
// status/secrets.active auf false, erscheint kein Geheimnis mehr - fuer alle
// gleichzeitig. Ist das Dokument nicht erreichbar, bleiben sie aktiv: ein
// fehlendes Dokument soll das Feature nicht stillschweigend abschalten.
const SECRETS_URL = 'https://firestore.googleapis.com/v1/projects/adminpannel-f0aab/databases/(default)/documents/status/secrets';
let secretsEnabled = true;

async function checkSecretsEnabled() {
  try {
    const res = await fetch(SECRETS_URL, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) return;
    const json = await res.json();
    const field = json && json.fields && json.fields.active;
    if (field && field.booleanValue === false) secretsEnabled = false;
  } catch (e) {
    // Kein Netz oder Dokument fehlt: Geheimnisse bleiben aktiv
  }
}
checkSecretsEnabled();

function markFound(id) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(FOUND_KEY)) || []; } catch (e) { list = []; }
  if (!list.includes(id)) list.push(id);
  try { localStorage.setItem(FOUND_KEY, JSON.stringify(list)); } catch (e) { /* privater Modus */ }
  return list.length;
}

// Code in die Zwischenablage. Die Clipboard-API gibt es nur in sicherem Kontext,
// darum als Rueckfall den Text markieren - dann reicht Strg+C bzw. Kopieren.
function copyCode(btn, code) {
  const zeigeErfolg = () => {
    const label = btn.querySelector('.secret-code-text');
    const vorher = label.textContent;
    label.textContent = 'Kopiert';
    btn.classList.add('kopiert');
    setTimeout(() => {
      label.textContent = vorher;
      btn.classList.remove('kopiert');
    }, 1400);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(zeigeErfolg, () => selectCode(btn));
  } else {
    selectCode(btn);
  }
}

function selectCode(btn) {
  const label = btn.querySelector('.secret-code-text');
  const range = document.createRange();
  range.selectNodeContents(label);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function revealSecret(code, betrag, id) {
  if (!secretsEnabled || !secretReveal || !secretReveal.hidden) return;
  const gefunden = markFound(id);
  const codeBtn = secretReveal.querySelector('.secret-code');
  codeBtn.querySelector('.secret-code-text').textContent = code;
  codeBtn.setAttribute('aria-label', 'Rabattcode ' + code + ' kopieren');
  codeBtn.onclick = () => copyCode(codeBtn, code);
  secretReveal.querySelector('.secret-note').textContent =
    betrag + ' Rabatt im Shop, ohne Mindestbestellwert. Nur einmal insgesamt einlösbar – wer zuerst kommt.';
  secretReveal.querySelector('.secret-progress').textContent =
    'Secret ' + gefunden + ' von ' + SECRET_TOTAL + ' gefunden';
  openSecret();
}

function closeSecret() {
  if (!secretReveal || secretReveal.hidden) return;
  secretReveal.classList.remove('show');
  setTimeout(() => { secretReveal.hidden = true; }, reduceMotion ? 0 : 350);
}

function openSecret() {
  // Bis hierher ist die Karte per hidden komplett aus Tastatur- und Screenreader-
  // Reichweite. Erst beim Aufdecken kommt sie in den Baum, sonst waere das
  // Geheimnis fuer Screenreader und Tab-Nutzer von Anfang an sichtbar.
  secretReveal.hidden = false;
  // Reflow erzwingen, damit der Ausgangszustand fuer die Transition registriert ist.
  // Ueber requestAnimationFrame waere das Aufdecken in einem Hintergrund-Tab nie passiert.
  void secretReveal.offsetWidth;
  secretReveal.classList.add('show');
  const closeBtn = secretReveal.querySelector('.secret-close');
  if (closeBtn) closeBtn.focus();
}

if (secretReveal) {
  // Geheimnis 1: das Wort tippen. Der getippte Text ist zugleich der Schluessel,
  // mit dem der Code entschluesselt wird - ohne Treffer entsteht er gar nicht.
  document.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    secretBuffer = (secretBuffer + e.key).slice(-SECRET_WORD_LEN).toUpperCase();
    if (hashString(secretBuffer) === SECRET_WORD_HASH) {
      revealSecret(decodeSecret(CIPHER_TYPED, secretBuffer), '20 €', 'getippt');
    }
  });

  const closeBtn = secretReveal.querySelector('.secret-close');
  if (closeBtn) closeBtn.addEventListener('click', closeSecret);
}

// Geheimnis 2: 16 Sekunden auf die Shop-Karte druecken. Erreichbar auch ohne
// Tastatur, also am Handy - dort, wo Geheimnis 1 nicht ausloesbar ist.
const shopCard = document.querySelector('.link-card.accent');
if (shopCard && secretReveal) {
  const HOLD_MS = 16000;
  const NEAR_MS = 15200;
  let holdTimer = null;
  let nearTimer = null;
  let holdActive = false;
  let holdFired = false;
  let holdOrigin = null;

  function cancelHold() {
    clearTimeout(holdTimer);
    clearTimeout(nearTimer);
    holdActive = false;
    holdOrigin = null;
    shopCard.classList.remove('secret-near');
  }

  shopCard.addEventListener('pointerdown', (e) => {
    // Nur die primaere Taste: sonst wuerde ein Rechtsklick das Kontextmenue blockieren.
    if (e.button !== 0 || !secretsEnabled) return;
    holdFired = false;
    holdActive = true;
    holdOrigin = { x: e.clientX, y: e.clientY };
    nearTimer = setTimeout(() => shopCard.classList.add('secret-near'), NEAR_MS);
    holdTimer = setTimeout(() => {
      holdFired = true;
      cancelHold();
      revealSecret(decodeSecret(CIPHER_HOLD, String.fromCharCode.apply(null, KEY_HOLD)), '16 €', 'gehalten');
    }, HOLD_MS);
  });

  shopCard.addEventListener('pointerup', cancelHold);
  shopCard.addEventListener('pointercancel', cancelHold);
  shopCard.addEventListener('pointerleave', cancelHold);
  shopCard.addEventListener('pointermove', (e) => {
    if (!holdOrigin) return;
    if (Math.abs(e.clientX - holdOrigin.x) > 12 || Math.abs(e.clientY - holdOrigin.y) > 12) cancelHold();
  });

  // Am Handy oeffnet langes Halten auf einem Link sonst die Link-Vorschau und
  // beendet damit die Geste. Nur waehrend eines laufenden Haltens unterdruecken,
  // damit der Rechtsklick am Desktop normal bleibt.
  shopCard.addEventListener('contextmenu', (e) => { if (holdActive) e.preventDefault(); });

  // Nach erfolgreichem Halten nicht zusaetzlich in den Shop navigieren.
  shopCard.addEventListener('click', (e) => {
    if (holdFired) { e.preventDefault(); holdFired = false; }
  });
}

// ---------- Ausstiege ----------
// Beide Easter Eggs uebernehmen die Seite fuer mehrere Sekunden. Ohne Ausstieg
// waere das eine Sperre statt einer Belohnung.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (hexRunning) endHexenmodus();
  closeSecret();
});

document.addEventListener('click', (e) => {
  if (!hexRunning) return;
  if (logoBtn && logoBtn.contains(e.target)) return;
  endHexenmodus();
});

// prefers-reduced-motion kann waehrend der Sitzung umgestellt werden.
// Ohne Listener bliebe die alte Entscheidung bis zum naechsten Reload stehen.
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const onMotionChange = () => { if (motionQuery.matches && hexRunning) endHexenmodus(); };
if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
