'use strict';

/* NightWither Hauptseite – Laufband und Desktop-Auftritt (15.11.2026)
   Läuft nach site.js. Liest nur öffentliche Daten (Streamplan aus dem Admin Panel), schreibt nichts.
   Zurücksetzen: in index.html die zwei Zeilen mit „auftritt“ entfernen. */
(() => {
  const STREAMPLAN_URL = 'https://firestore.googleapis.com/v1/projects/adminpannel-f0aab/databases/(default)/documents/streamingplan?pageSize=300';
  const PLAN_NEU_LADEN_MS = 10 * 60000;
  const WIEDERHOLUNGEN = 6;   // so oft steht der Text hintereinander im Band (zwei Hälften für die Endlos-Schleife)
  const PLATTFORM_NAMEN = { twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube', tiktok: 'TikTok' };
  const STANDARD_TEXT = ['NightWither Unity', 'Alle Kanäle an einem Ort', 'Streams · Community · Streetwear'];

  const band = document.getElementById('band');
  const spur = document.getElementById('bandTrack');
  const ansage = document.getElementById('bandText');
  if (!band || !spur) return;

  let livePlattformen = [];
  let naechster = null;
  let gezeigt = '';

  function kurz(text, max) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  function wann(ms) {
    return new Date(ms).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  }

  function bandText() {
    if (livePlattformen.length) return ['Jetzt live', 'auf ' + livePlattformen.join(' + '), 'Komm rein'];
    if (naechster) return ['Nächster Stream', wann(naechster.start), naechster.titel, naechster.plattform].filter(Boolean);
    return STANDARD_TEXT;
  }

  function zeichnen() {
    const teile = bandText();
    const schluessel = teile.join('|');
    if (schluessel === gezeigt) return;
    gezeigt = schluessel;
    const stuecke = [];
    for (let runde = 0; runde < WIEDERHOLUNGEN; runde++) {
      teile.forEach((t) => {
        const sp = document.createElement('span');
        sp.textContent = t;
        const krone = document.createElement('img');
        krone.src = 'crown.webp';
        krone.alt = '';
        sp.append(krone);
        stuecke.push(sp);
      });
    }
    spur.replaceChildren(...stuecke);
    band.classList.toggle('ist-live', livePlattformen.length > 0);
    if (ansage) ansage.textContent = teile.join(' · ');
  }

  // Firestore liefert Zeiten je nach Eintrag als Text oder als Zeitstempel
  function feld(f, name) {
    const v = f && f[name];
    if (!v) return '';
    return v.stringValue ?? v.timestampValue ?? '';
  }

  async function planLaden() {
    try {
      const res = await fetch(STREAMPLAN_URL, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!res.ok) return;
      const jetzt = Date.now();
      const kommende = ((await res.json()).documents || [])
        .map((d) => ({ start: Date.parse(feld(d.fields, 'streamDate')), titel: kurz(feld(d.fields, 'game') || 'Stream', 40), plattform: kurz(feld(d.fields, 'platform'), 24) }))
        .filter((s) => !isNaN(s.start) && s.start > jetzt)
        .sort((a, b) => a.start - b.start);
      naechster = kommende[0] || null;
      zeichnen();
    } catch (e) {
      // Ohne Streamplan bleibt der Standardtext stehen
    }
  }

  // site.js meldet den Live-Stand (alle 60 Sekunden)
  document.addEventListener('nwu-live', (e) => {
    const stand = (e && e.detail) || {};
    livePlattformen = Object.keys(PLATTFORM_NAMEN).filter((p) => stand[p] === true).map((p) => PLATTFORM_NAMEN[p]);
    zeichnen();
  });

  /* Hexenmodus am Desktop: Das Pentagramm soll über der Krone erscheinen, die jetzt links steht */
  const logo = document.getElementById('logoBtn');
  function kronePosition() {
    if (!logo) return;
    const r = logo.getBoundingClientRect();
    document.documentElement.style.setProperty('--hex-x', `${Math.round(r.left + r.width / 2)}px`);
    document.documentElement.style.setProperty('--hex-y', `${Math.round(r.top + r.height / 2)}px`);
  }
  if (logo) logo.addEventListener('pointerdown', kronePosition);
  window.addEventListener('resize', kronePosition);

  zeichnen();
  kronePosition();
  planLaden();
  setInterval(planLaden, PLAN_NEU_LADEN_MS);
})();
