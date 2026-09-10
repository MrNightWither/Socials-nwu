'use strict';

// ---------- Partikel (Gold Funken) ----------
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const particles = [];
const PARTICLE_COUNT = 120;

function newParticle(p) {
  p.x = Math.random() * canvas.width;
  p.y = Math.random() * canvas.height;
  p.r = p.r || Math.random() * 1.5 + 0.3;
  p.dx = (Math.random() - 0.5) * 0.08;
  p.dy = (Math.random() - 0.5) * 0.08;
  p.life = Math.random();
  p.alpha = Math.random() * 0.8 + 0.2;
  return p;
}
for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(newParticle({}));

function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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

    if (p.x < -p.r) p.x = canvas.width + p.r;
    if (p.x > canvas.width + p.r) p.x = -p.r;
    if (p.y < -p.r) p.y = canvas.height + p.r;
    if (p.y > canvas.height + p.r) p.y = -p.r;
  });
  if (!reduceMotion) requestAnimationFrame(drawParticles);
}
drawParticles();

// ---------- Live Status ----------
// Liest den Status, den du im Admin Panel setzt (Firestore status/twitch).
// Nur Lesezugriff, kein Schlüssel nötig, die Firestore Regeln erlauben das Lesen.
const STATUS_URL = 'https://firestore.googleapis.com/v1/projects/adminpannel-f0aab/databases/(default)/documents/status/twitch';

async function checkLiveStatus() {
  const twitchCard = document.querySelector('a[href^="https://twitch.tv/mrnightwither"]');
  if (!twitchCard) return;
  try {
    const res = await fetch(STATUS_URL, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) return;
    const json = await res.json();
    const isLive = json && json.fields && json.fields.isLive && json.fields.isLive.booleanValue === true;

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
