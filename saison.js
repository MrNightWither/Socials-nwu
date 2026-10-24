/* ══════════════════════════════════════════════════════════════════════
   NWU · Saison-Themen für nightwither.de (24.10.2026)
   Gleiche Saisons und Farben wie die Overlays (Overlays/basis-saison.js):
   Die Saison kommt vom Discord-Bot (Worker /overlay/discord → "saison").
   Ist er nicht erreichbar, wird sie nach denselben Kalenderdaten berechnet.
     Testen:  https://nightwither.de/?saison=halloween
              (weihnachten, silvester, valentinstag, ostern, freitag-der-13,
               nwu-geburtstag, server-geburtstag, standard)
   Wirkung: Gold → Saisonfarbe, kleiner Saison-Hinweis unter der Überschrift,
   dezenter Effekt im Hintergrund. Muss VOR site.js geladen werden
   (site.js liest window.NWU_SAISON für die Farbe der Funken).
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var WORKER = 'https://nwu-anmeldung.nwu-brand.workers.dev/overlay/discord';
  var SPEICHER = 'nwu_saison_bot';
  var GUELTIG_MS = 6 * 3600000;

  var THEMEN = {
    halloween:          { titel: '🎃 Halloween in der NWU',       gold: '#ff7a1a', goldHi: '#ffb15c', effekt: 'fledermaus' },
    weihnachten:        { titel: '🎄 Weihnachten im Schattenhof',  gold: '#8fd8ff', goldHi: '#d4f1ff', effekt: 'schnee' },
    silvester:          { titel: '🎆 Rutscht gut rein, Schatten!', gold: '#ffd166', goldHi: '#fff0b8', effekt: 'feuerwerk' },
    valentinstag:       { titel: '💘 Valentinstag',                gold: '#ff5c8a', goldHi: '#ffa3c0', effekt: 'herzen' },
    ostern:             { titel: '🐣 Frohe Ostern',                gold: '#9be37a', goldHi: '#cff5b8', effekt: 'eier' },
    'freitag-der-13':   { titel: '👾 Freitag der 13.',             gold: '#39ff14', goldHi: '#a6ff8f', effekt: 'glitch' },
    'nwu-geburtstag':   { titel: '🩸 MrNightwither hat Geburtstag', gold: '#e0143c', goldHi: '#ff6b85', effekt: 'konfetti' },
    'server-geburtstag':{ titel: '🎂 Die NWU hat Geburtstag',      gold: '#a77bff', goldHi: '#d2bcff', effekt: 'konfetti' }
  };

  /* ── Saison nach Kalender (gleiche Regeln wie Discord-Bot und Overlays) ── */
  function osterSonntag(j) {
    var a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(j, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }
  function tag(j, mo, t) { return new Date(j, mo - 1, t).getTime(); }
  function zwischen(heute, j, von, bis) {
    var v = tag(j, von[0], von[1]), e = tag(j, bis[0], bis[1]);
    return e < v ? (heute >= v || heute <= e) : (heute >= v && heute <= e);
  }
  function berechnen(d) {
    var j = d.getFullYear(), heute = tag(j, d.getMonth() + 1, d.getDate());
    if (d.getDate() === 13 && d.getDay() === 5) return 'freitag-der-13';
    if (zwischen(heute, j, [7, 26], [7, 26])) return 'nwu-geburtstag';
    if (zwischen(heute, j, [2, 13], [2, 13])) return 'server-geburtstag';
    if (zwischen(heute, j, [2, 14], [2, 14])) return 'valentinstag';
    if (zwischen(heute, j, [12, 29], [1, 2])) return 'silvester';
    var o = osterSonntag(j).getTime();
    if (heute >= o - 2 * 86400000 && heute <= o + 86400000) return 'ostern';
    if (zwischen(heute, j, [10, 24], [11, 1])) return 'halloween';
    if (zwischen(heute, j, [12, 1], [12, 28])) return 'weihnachten';
    return 'standard';
  }

  function lesen() { try { return JSON.parse(localStorage.getItem(SPEICHER) || 'null'); } catch (e) { return null; } }
  function merken(name) { try { localStorage.setItem(SPEICHER, JSON.stringify({ name: name, zeit: Date.now() })); } catch (e) { /* privat/gesperrt: dann Kalender */ } }
  function testParam() { try { return new URLSearchParams(location.search).get('saison'); } catch (e) { return null; } }

  /* Welche Saison? Test-Parameter > Discord-Bot (frisch) > Kalender */
  function bestimmen() {
    var url = testParam();
    if (url) return THEMEN[url] ? url : 'standard';
    var bot = lesen();
    if (bot && Date.now() - bot.zeit < GUELTIG_MS) return THEMEN[bot.name] ? bot.name : 'standard';
    return berechnen(new Date());
  }

  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255); }

  var name = bestimmen();
  var thema = THEMEN[name] || null;
  /* Für site.js (Funken, Pentagramme): "r, g, b" */
  window.NWU_SAISON = { name: name, rgb: thema ? rgb(thema.gold) : '201, 168, 76', rgbHi: thema ? rgb(thema.goldHi) : '232, 201, 109' };

  if (thema) {
    var wurzel = document.documentElement;
    wurzel.style.setProperty('--gold', thema.gold);
    wurzel.style.setProperty('--gold-hi', thema.goldHi);
    wurzel.classList.add('saison', 'saison-' + name);
  }

  /* ── Fest eingebautes Gold (rgba(201,168,76,…) / 232,201,109) in Stil-Regeln und style-Attributen umfärben ── */
  function goldUmfaerben() {
    var G = window.NWU_SAISON.rgb, H = window.NWU_SAISON.rgbHi;
    var GOLD = /201,\s*168,\s*76/g, HELL = /232,\s*201,\s*109/g, TEST = /201,\s*168,\s*76|232,\s*201,\s*109/;
    function tausch(v) { return v.replace(GOLD, G).replace(HELL, H); }
    function regeln(liste) {
      for (var i = 0; i < liste.length; i++) {
        var r = liste[i];
        if (r.cssRules) regeln(r.cssRules);
        var st = r.style;
        if (!st) continue;
        for (var k = 0; k < st.length; k++) {
          var p = st[k], v = st.getPropertyValue(p);
          if (TEST.test(v)) st.setProperty(p, tausch(v), st.getPropertyPriority(p));
        }
      }
    }
    for (var s = 0; s < document.styleSheets.length; s++) {
      try { regeln(document.styleSheets[s].cssRules); } catch (e) { /* fremdes Stylesheet: bleibt gold */ }
    }
    [].forEach.call(document.querySelectorAll('[style]'), function (el) {
      var v = el.getAttribute('style');
      if (TEST.test(v)) el.setAttribute('style', tausch(v));
    });
    [].forEach.call(document.querySelectorAll('svg [fill]'), function (el) {
      var v = el.getAttribute('fill');
      if (TEST.test(v)) el.setAttribute('fill', tausch(v));
    });
  }

  /* ── Kleiner Saison-Hinweis unter „Die NightWither Unity Kanäle“ ── */
  function hinweisEinbauen() {
    var kopf = document.getElementById('header');
    if (!kopf || document.getElementById('saisonHinweis')) return;
    var css = document.createElement('style');
    css.textContent =
      '.saison-hinweis { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px;' +
      '  border: 1px solid var(--gold); color: var(--gold-hi); background: rgba(0,0,0,0.45);' +
      '  font-family: Rajdhani, "Arial Narrow", system-ui, sans-serif; font-weight: 700; font-size: 0.78rem;' +
      '  letter-spacing: 0.12em; text-transform: uppercase; box-shadow: 0 0 18px -6px var(--gold); }';
    document.head.appendChild(css);
    var p = document.createElement('p');
    p.id = 'saisonHinweis';
    p.className = 'saison-hinweis';
    p.textContent = thema.titel;
    kopf.appendChild(p);
  }

  /* ── Dezenter Effekt im Hintergrund (über den Funken, unter den Karten) ── */
  function effektStarten() {
    if (!thema.effekt || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d'), W = 0, H = 0;
    function groesse() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    groesse();
    window.addEventListener('resize', groesse);

    var art = thema.effekt, farbe = thema.gold;
    var KONFETTI = ['#c9a84c', '#e0143c', '#a77bff', '#39c0ff', '#9be37a', '#ffd166'];
    var ANZAHL = { schnee: 70, fledermaus: 6, herzen: 14, eier: 12, konfetti: 30, feuerwerk: 0, glitch: 0 };
    var teile = [], raketen = [], funken = [];
    function neu(oben) {
      return { x: Math.random() * W, y: oben ? -20 : Math.random() * H, v: 0.3 + Math.random() * 1.1, r: 2 + Math.random() * 4,
               w: Math.random() * Math.PI * 2, dw: (Math.random() - 0.5) * 0.04, f: Math.random() };
    }
    for (var i = 0; i < (ANZAHL[art] || 0); i++) teile.push(neu(false));

    function herz(x, y, g) {
      ctx.beginPath(); ctx.moveTo(x, y + g * .3);
      ctx.bezierCurveTo(x, y, x - g * .5, y, x - g * .5, y + g * .3); ctx.bezierCurveTo(x - g * .5, y + g * .6, x, y + g * .8, x, y + g);
      ctx.bezierCurveTo(x, y + g * .8, x + g * .5, y + g * .6, x + g * .5, y + g * .3); ctx.bezierCurveTo(x + g * .5, y, x, y, x, y + g * .3); ctx.fill();
    }
    function fledermaus(x, y, g, flap) {
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - g * .5, y - g * flap, x - g, y + g * .1); ctx.quadraticCurveTo(x - g * .6, y + g * .05, x - g * .45, y + g * .3);
      ctx.quadraticCurveTo(x - g * .2, y + g * .1, x, y + g * .35); ctx.quadraticCurveTo(x + g * .2, y + g * .1, x + g * .45, y + g * .3);
      ctx.quadraticCurveTo(x + g * .6, y + g * .05, x + g, y + g * .1); ctx.quadraticCurveTo(x + g * .5, y - g * flap, x, y); ctx.fill();
    }

    function bild() {
      ctx.clearRect(0, 0, W, H);
      teile.forEach(function (p) {
        p.w += p.dw;
        if (art === 'schnee') {
          p.y += p.v * 0.7; p.x += Math.sin(p.w) * 0.5;
          ctx.globalAlpha = 0.45 + p.f * 0.4; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.55, 0, 7); ctx.fill();
        } else if (art === 'herzen') {
          p.y -= p.v * 0.5; p.x += Math.sin(p.w) * 0.4;
          ctx.globalAlpha = 0.25 + p.f * 0.3; ctx.fillStyle = p.f > 0.5 ? farbe : '#e0143c'; herz(p.x, p.y, 6 + p.r * 2.5);
        } else if (art === 'fledermaus') {
          p.x += p.v * 1.1; p.y += Math.sin(p.w * 3) * 0.6;
          ctx.globalAlpha = 0.8; ctx.fillStyle = '#0a0a0d'; ctx.strokeStyle = farbe; ctx.lineWidth = 1;
          fledermaus(p.x, p.y, 12 + p.r * 3, 0.3 + Math.abs(Math.sin(Date.now() / 90 + p.f * 10)) * 0.6); ctx.stroke();
          if (p.x > W + 60) { p.x = -60; p.y = Math.random() * H * 0.7; }
          return;
        } else if (art === 'eier') {
          p.y += p.v * 0.5;
          ctx.globalAlpha = 0.45; ctx.fillStyle = KONFETTI[Math.floor(p.f * KONFETTI.length)];
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.w) * 0.4); ctx.beginPath(); ctx.ellipse(0, 0, 5 + p.r, 7 + p.r * 1.2, 0, 0, 7); ctx.fill(); ctx.restore();
        } else if (art === 'konfetti') {
          p.y += p.v; p.x += Math.sin(p.w) * 0.6;
          ctx.globalAlpha = 0.6; ctx.fillStyle = KONFETTI[Math.floor(p.f * KONFETTI.length)];
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.w * 3); ctx.fillRect(-3, -1.5, 6 + p.r, 3); ctx.restore();
        }
        if (p.y > H + 30 || p.y < -40) { var n = neu(true); if (art === 'herzen') n.y = H + 20; Object.assign(p, n); }
      });
      if (art === 'glitch' && Math.random() < 0.006) { ctx.globalAlpha = 0.12; ctx.fillStyle = farbe; ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 20); }
      if (art === 'feuerwerk') {
        if (Math.random() < 0.012) raketen.push({ x: W * (0.1 + Math.random() * 0.8), y: H, vy: -(6 + Math.random() * 3), ziel: H * (0.1 + Math.random() * 0.3),
                                                c: KONFETTI[Math.floor(Math.random() * KONFETTI.length)] });
        raketen = raketen.filter(function (r) {
          r.y += r.vy; ctx.globalAlpha = 0.9; ctx.fillStyle = r.c; ctx.fillRect(r.x - 1, r.y, 2, 7);
          if (r.y <= r.ziel) { for (var k = 0; k < 32; k++) { var w = Math.random() * 7, v = 1 + Math.random() * 2.5; funken.push({ x: r.x, y: r.y, vx: Math.cos(w) * v, vy: Math.sin(w) * v, a: 1, c: r.c }); } return false; }
          return true;
        });
        funken = funken.filter(function (f) {
          f.x += f.vx; f.y += f.vy; f.vy += 0.04; f.a -= 0.014;
          ctx.globalAlpha = Math.max(0, f.a * 0.8); ctx.fillStyle = f.c; ctx.fillRect(f.x, f.y, 2, 2);
          return f.a > 0;
        });
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(bild);
    }
    requestAnimationFrame(bild);
  }

  /* ── Discord-Stand nachladen: gilt ab dem nächsten Besuch, direkt nach dem Laden einmal sofort ── */
  function holen() {
    if (testParam() || !window.fetch) return;
    fetch(WORKER, { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.saison) return;
        var neu = String(d.saison);
        merken(neu);
        var schonNeu = false;
        try { schonNeu = sessionStorage.getItem('nwu_saison_neu') === neu; sessionStorage.setItem('nwu_saison_neu', neu); } catch (e) { schonNeu = true; }
        if (neu !== name && !schonNeu && performance.now() < 8000) location.reload();
      })
      .catch(function () { /* Worker nicht erreichbar: Kalender bleibt */ });
  }

  function start() {
    if (thema) { goldUmfaerben(); hinweisEinbauen(); effektStarten(); }
    setTimeout(holen, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
