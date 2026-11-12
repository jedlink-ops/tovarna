'use strict';
// =====================================================================
//  ART – předrenderované sprity (stromy, skály, budovy, ikony)
//  Vše se kreslí kódem do canvasů o rozlišení S× a pak se jen blituje.
// =====================================================================
(() => {
  const T = 48, S = 3, TAU = Math.PI * 2;
  let G;
  const OUT = 'rgba(46,30,20,.62)';

  function mk(w, h, ax, ay, fn) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * S); c.height = Math.round(h * S);
    const g = c.getContext('2d');
    g.scale(S, S); g.translate(ax, ay);
    const prev = G; G = g; fn(); G = prev;
    return { c, ax, ay, w, h };
  }
  const blit = (ctx, s, x, y, k) => { k = k || 1; ctx.drawImage(s.c, x - s.ax * k, y - s.ay * k, s.w * k, s.h * k); };

  // ---------- kreslicí pomůcky ----------
  function pathPts(p) { G.beginPath(); for (let i = 0; i < p.length; i++) { if (i) G.lineTo(p[i][0], p[i][1]); else G.moveTo(p[i][0], p[i][1]); } G.closePath(); }
  function paint(fill, stroke, lw) {
    if (fill) { G.fillStyle = fill; G.fill(); }
    if (stroke) { G.strokeStyle = stroke; G.lineWidth = lw || 1.2; G.lineJoin = 'round'; G.stroke(); }
  }
  function poly(p, fill, stroke, lw) { pathPts(p); paint(fill, stroke, lw); }
  function ell(x, y, rx, ry, fill, stroke, lw) { G.beginPath(); G.ellipse(x, y, rx, ry, 0, 0, TAU); paint(fill, stroke, lw); }
  function circ(x, y, r, fill, stroke, lw) { G.beginPath(); G.arc(x, y, r, 0, TAU); paint(fill, stroke, lw); }
  function box(x, y, w, h, fill, stroke, r, lw) {
    G.beginPath();
    if (r && G.roundRect) G.roundRect(x, y, w, h, r); else G.rect(x, y, w, h);
    paint(fill, stroke, lw);
  }
  function line(x0, y0, x1, y1, col, lw) { G.beginPath(); G.moveTo(x0, y0); G.lineTo(x1, y1); G.strokeStyle = col; G.lineWidth = lw; G.lineCap = 'round'; G.stroke(); }
  function lg(x0, y0, x1, y1, stops) { const g = G.createLinearGradient(x0, y0, x1, y1); for (const s of stops) g.addColorStop(s[0], s[1]); return g; }
  function rg(x, y, r0, r1, stops) { const g = G.createRadialGradient(x, y, r0, x, y, r1); for (const s of stops) g.addColorStop(s[0], s[1]); return g; }
  function shadow(rx, ry, y, a) {
    G.save(); G.translate(0, y); G.scale(1, ry / rx);
    G.fillStyle = rg(0, 0, rx * 0.15, rx, [[0, 'rgba(18,28,14,' + a + ')'], [1, 'rgba(18,28,14,0)']]);
    G.beginPath(); G.arc(0, 0, rx, 0, TAU); G.fill(); G.restore();
  }

  // ---------- stromy ----------
  function pine(v) {
    const s = [1, 0.88, 1.1][v];
    shadow(17 * s, 6 * s, 1, 0.3);
    box(-3, -11, 6, 11, lg(-3, 0, 3, 0, [[0, '#8a6038'], [1, '#5c3e22']]), OUT, 1, 1);
    const tiers = [[20, -8, 24], [16, -22, 23], [11, -36, 22]];
    for (let i = 0; i < 3; i++) {
      const w = tiers[i][0] * s, by = tiers[i][1] * s, h = tiers[i][2] * s;
      poly([[-w, by], [w, by], [0, by - h]], lg(-w, 0, w, 0, [[0, '#4aa15c'], [0.55, '#2f7d46'], [1, '#215c36']]), OUT, 1.3);
      poly([[-w + 2, by - 1], [-1, by - h + 3], [-1, by - 1]], 'rgba(255,255,255,.14)');
      for (let k = 0; k < 3; k++) line(-w * 0.55 + k * w * 0.5, by - 3, -w * 0.4 + k * w * 0.45, by - 9, 'rgba(20,60,35,.35)', 1);
    }
  }
  function round(v) {
    const s = [1, 0.9, 1.1][v];
    shadow(19 * s, 7 * s, 1, 0.3);
    poly([[-3.5, 0], [3.5, 0], [2.5, -20 * s], [-2.5, -20 * s]], lg(-4, 0, 4, 0, [[0, '#8a6038'], [1, '#5c3e22']]), OUT, 1);
    const cs = [[-9 * s, -30 * s, 12 * s], [9 * s, -28 * s, 12 * s], [0, -42 * s, 14 * s]];
    for (const c of cs) circ(c[0], c[1], c[2], rg(c[0] - 4, c[1] - 5, 2, c[2], [[0, '#92d56e'], [0.5, '#4ea852'], [1, '#2d7a39']]), 'rgba(24,70,34,.7)', 1.1);
    circ(-5 * s, -48 * s, 4 * s, 'rgba(210,255,170,.35)');
    for (let k = 0; k < 5; k++) circ(-10 + k * 5.5, -26 * s - (k % 2) * 8, 1.3, 'rgba(25,80,40,.35)');
    if (v === 1) { circ(8, -34, 2, '#f1d65a'); circ(-6, -22, 2, '#f1d65a'); }
  }

  // ---------- skály, ruda, zlato ----------
  function rock(kind, v) {
    shadow(19, 6, 2, 0.32);
    const j = [[0, 0, 0, 0, 0, 0, 0], [2, -2, 1, 2, -1, 1, 0], [-2, 1, -2, 0, 2, -1, 1]][v];
    const pts = [[-14 + j[0], -1], [-17, -11 + j[1]], [-9, -22 + j[2]], [4 + j[3], -28], [14, -21 + j[4]], [18, -9 + j[5]], [11, 0 + j[6]]];
    const cols = kind === 'rock' ? ['#cdd2d7', '#7f8890'] : kind === 'ore' ? ['#bdaea8', '#675a60'] : ['#dcca94', '#85763f'];
    poly(pts, lg(-14, -28, 14, 0, [[0, cols[0]], [1, cols[1]]]), OUT, 1.5);
    poly([pts[2], pts[3], pts[4], [3, -14]], 'rgba(255,255,255,.28)');
    poly([[3, -14], pts[4], pts[5], pts[6], [3, -4]], 'rgba(0,0,0,.14)');
    line(-9, -12, -2, -9, 'rgba(0,0,0,.18)', 1.2);
    if (kind === 'ore') {
      poly([[-7, -17], [-3, -20], [0, -16], [-4, -13]], '#e0793c', 'rgba(90,40,15,.6)', 1);
      poly([[6, -10], [10, -13], [13, -9], [9, -6]], '#e8883f', 'rgba(90,40,15,.6)', 1);
      circ(-1, -8, 2, '#f0a05a'); circ(2, -21, 1.6, '#f0a05a');
    } else if (kind === 'gold') {
      poly([[-7, -17], [-3, -21], [1, -16], [-4, -13]], '#ffd44a', 'rgba(110,80,0,.7)', 1);
      poly([[6, -10], [10, -14], [14, -9], [9, -6]], '#ffd44a', 'rgba(110,80,0,.7)', 1);
      circ(-4, -17, 1.6, '#fff4b0'); circ(10, -11, 1.4, '#fff4b0');
    }
  }

  // ---------- ikony surovin (32×32, střed 0,0) ----------
  const ICON = {
    wood() {
      box(-11, -6, 22, 12, lg(0, -6, 0, 6, [[0, '#bb844b'], [1, '#7d5430']]), OUT, 3, 1.4);
      ell(-11, 0, 4, 6, '#e6c28f', OUT, 1.2); ell(-11, 0, 2, 3.2, '#c99a62');
      line(-5, -2, 8, -2, 'rgba(60,35,15,.4)', 1); line(-6, 2, 7, 2, 'rgba(60,35,15,.4)', 1);
    },
    stone() {
      poly([[-12, 5], [-13, -4], [-5, -11], [5, -11], [13, -3], [11, 6]], lg(-10, -11, 10, 6, [[0, '#d6dbe0'], [1, '#858d95']]), OUT, 1.4);
      poly([[-5, -11], [5, -11], [8, -6], [-3, -4]], 'rgba(255,255,255,.35)');
    },
    plank() {
      for (let i = 0; i < 3; i++) {
        box(-12, -10 + i * 7, 24, 6, lg(0, -10 + i * 7, 0, -4 + i * 7, [[0, '#efc07a'], [1, '#c68b45']]), OUT, 1.5, 1.2);
        line(-8, -7 + i * 7, 3, -7 + i * 7, 'rgba(120,70,20,.35)', 0.8);
      }
    },
    wheat() {
      for (let i = -1; i <= 1; i++) {
        line(i * 4.5, 12, i * 4.5 + i * 2.5, -8, '#b88a2c', 1.6);
        for (let j = 0; j < 4; j++) {
          ell(i * 4.5 + i * 2.5 - 2.2, -9 + j * 3.6, 2.6, 1.7, '#f4c94a', 'rgba(120,80,0,.5)', 0.7);
          ell(i * 4.5 + i * 2.5 + 2.2, -7 + j * 3.6, 2.6, 1.7, '#f4c94a', 'rgba(120,80,0,.5)', 0.7);
        }
      }
    },
    bread() {
      ell(0, 2, 13, 8.5, lg(0, -6, 0, 11, [[0, '#f0bd6c'], [1, '#bf7b33']]), OUT, 1.4);
      for (let i = -1; i <= 1; i++) { G.beginPath(); G.arc(i * 5, -1, 3, 3.6, 5.8); G.strokeStyle = '#f9e0a6'; G.lineWidth = 1.5; G.stroke(); }
    },
    fish() {
      ell(-2, 0, 11, 7, lg(0, -7, 0, 7, [[0, '#93d3f4'], [1, '#3f8fcf']]), OUT, 1.3);
      poly([[8, 0], [15, -7], [15, 7]], '#3f8fcf', OUT, 1.2);
      circ(-7, -1.5, 1.8, '#fff'); circ(-7.3, -1.5, 0.9, '#123');
      G.beginPath(); G.arc(-2, 0, 5, -0.7, 0.7); G.strokeStyle = 'rgba(255,255,255,.5)'; G.lineWidth = 1; G.stroke();
    },
    ironOre() {
      poly([[-12, 5], [-13, -4], [-5, -11], [6, -11], [13, -3], [11, 6]], lg(-10, -11, 10, 6, [[0, '#a79ea4'], [1, '#5b4f55']]), OUT, 1.4);
      poly([[-6, -4], [-2, -8], [2, -4], [-2, -1]], '#e0793c'); poly([[4, 0], [8, -3], [10, 1], [6, 3]], '#e8883f');
    },
    iron() {
      poly([[-13, 6], [-8, -6], [9, -6], [14, 6]], lg(0, -6, 0, 6, [[0, '#e9eef3'], [1, '#98a2ad']]), OUT, 1.4);
      poly([[-8, -6], [9, -6], [7, -2], [-6, -2]], 'rgba(255,255,255,.55)');
    },
    tool() {
      G.save(); G.rotate(-0.75);
      box(-1.8, -13, 3.6, 27, lg(-2, 0, 2, 0, [[0, '#c18a4c'], [1, '#855a2c']]), OUT, 1, 1);
      box(-8.5, -14, 17, 8, lg(0, -14, 0, -6, [[0, '#d6dde4'], [1, '#8c97a3']]), OUT, 1.5, 1.2);
      G.restore();
    },
    gold() {
      circ(0, 0, 11, lg(-8, -8, 8, 8, [[0, '#ffe26a'], [1, '#e8a400']]), 'rgba(120,80,0,.8)', 1.5);
      circ(0, 0, 7, null, 'rgba(160,100,0,.7)', 1.3);
      G.beginPath(); G.arc(0, 0, 8.5, 3.6, 4.9); G.strokeStyle = 'rgba(255,255,255,.7)'; G.lineWidth = 1.6; G.stroke();
    },
    jewel() {
      poly([[-12, -3], [-6, -10], [6, -10], [12, -3], [0, 12]], lg(-10, -10, 10, 12, [[0, '#e2b9ff'], [1, '#8a4fd0']]), 'rgba(50,20,90,.8)', 1.4);
      poly([[-12, -3], [12, -3], [0, 12]], 'rgba(255,255,255,.12)');
      line(-12, -3, 12, -3, 'rgba(255,255,255,.5)', 1); line(-6, -10, -3, -3, 'rgba(255,255,255,.5)', 1); line(6, -10, 3, -3, 'rgba(255,255,255,.5)', 1);
      line(-3, -3, 0, 12, 'rgba(255,255,255,.35)', 1); line(3, -3, 0, 12, 'rgba(255,255,255,.35)', 1);
    },
  };

  // ---------- budovy ----------
  function chimneyAndSmoke() { /* jen pro přehlednost */ }

  function cottage(o) {
    shadow(26, 7, 1, 0.32);
    box(-17, -7, 34, 7, lg(0, -7, 0, 0, [[0, '#a79d92'], [1, '#7f766c']]), OUT, 1.5, 1.2);
    box(-14, -31, 28, 25, lg(0, -31, 0, -6, [[0, o.wall], [1, o.wall2]]), OUT, 1, 1.4);
    line(-14, -31, -14, -7, o.beam || '#7a5230', 2.2); line(14, -31, 14, -7, o.beam || '#7a5230', 2.2); line(-14, -19, 14, -19, o.beam || '#7a5230', 1.6);
    if (o.chimney) { box(5, -58, 8, 20, lg(5, 0, 13, 0, [[0, '#a09890'], [1, '#6f675f']]), OUT, 1, 1.2); box(4, -60, 10, 4, '#6a625a', OUT, 1, 1); }
    poly([[-22, -26], [22, -26], [11, -52], [-11, -52]], lg(0, -52, 0, -26, [[0, o.roof], [1, o.roof2]]), OUT, 1.8);
    for (let i = 1; i < 5; i++) {
      const y = -26 - i * 5.2, k = (1 - i / 5) * 0.5 + 0.5;
      line(-22 + (26 + y) * 0 + i * 2.2, y, 22 - i * 2.2, y, 'rgba(0,0,0,.2)', 1);
    }
    poly([[-22, -26], [-11, -52], [-8, -52], [-19, -26]], 'rgba(255,255,255,.16)');
    line(-11, -52, 11, -52, 'rgba(255,255,255,.35)', 1.6);
    box(-14, -26, 28, 4, 'rgba(0,0,0,.22)');
    box(-5, -21, 10, 14, '#5a3b22', OUT, 1, 1.2);
    G.beginPath(); G.arc(0, -21, 5, Math.PI, 0); G.fillStyle = '#5a3b22'; G.fill(); G.strokeStyle = OUT; G.lineWidth = 1.2; G.stroke();
    circ(3, -14, 0.9, '#f1c75a');
    for (const wx of [-12.5, 6.5]) {
      box(wx, -23, 6, 7, '#ffe7a3', OUT, 0.5, 1); line(wx + 3, -23, wx + 3, -16, '#7a5230', 1); line(wx, -19.5, wx + 6, -19.5, '#7a5230', 1);
    }
  }
  function logStack(x, y) {
    for (const [dx, dy] of [[0, 0], [8, 0], [-8, 0], [4, -6], [-4, -6], [0, -12]]) {
      if (Math.abs(dx) > 4 && dy === 0 && x < 0) { /* nic */ }
      box(x + dx - 6, y + dy - 3, 12, 6, lg(0, y + dy - 3, 0, y + dy + 3, [[0, '#b98550'], [1, '#7d5430']]), OUT, 2, 1);
      ell(x + dx + 6, y + dy, 2.2, 3, '#e6c28f', OUT, 0.8);
    }
  }
  function plankStack(x, y) {
    for (let i = 0; i < 4; i++) box(x - 9, y - 4 - i * 4, 18, 3.6, lg(0, y - 4 - i * 4, 0, y - 0.4 - i * 4, [[0, '#f0c27c'], [1, '#c68b45']]), OUT, 1, 1);
  }
  function gearShape(x, y, r, fill, stroke) {
    G.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      G.lineTo(x + Math.cos(a - 0.17) * r, y + Math.sin(a - 0.17) * r); G.lineTo(x + Math.cos(a - 0.12) * (r + 3), y + Math.sin(a - 0.12) * (r + 3));
      G.lineTo(x + Math.cos(a + 0.12) * (r + 3), y + Math.sin(a + 0.12) * (r + 3)); G.lineTo(x + Math.cos(a + 0.17) * r, y + Math.sin(a + 0.17) * r);
    }
    G.closePath(); paint(fill, stroke, 1.2);
    circ(x, y, r * 0.38, 'rgba(0,0,0,.35)');
  }
  function fishRack(x, y) {
    line(x - 9, y, x - 9, y - 22, '#7a5230', 2); line(x + 9, y, x + 9, y - 22, '#7a5230', 2); line(x - 10, y - 20, x + 10, y - 20, '#7a5230', 2);
    for (const dx of [-5, 1, 6]) { ell(x + dx, y - 14, 2.4, 5.5, '#8fd0f2', OUT, 0.8); poly([[x + dx, y - 9], [x + dx - 2.4, y - 6], [x + dx + 2.4, y - 6]], '#3f8fcf'); }
  }

  const BLD = {
    house() {
      cottage({ wall: '#f8ead0', wall2: '#e4cfa6', roof: '#d2603f', roof2: '#a63e29', chimney: true });
      for (const wx of [-12.5, 6.5]) { box(wx - 0.5, -15.5, 7, 3, '#7a5230', OUT, 0.5, 0.8); for (let k = 0; k < 3; k++) circ(wx + 1 + k * 2.4, -16.5, 1.3, ['#ff8fb1', '#ffd95e', '#ff6f6f'][k]); }
    },
    lumber() {
      cottage({ wall: '#c79862', wall2: '#a4733f', roof: '#7a5632', roof2: '#563a20', chimney: false });
      logStack(19, -4);
      ell(-20, -3, 5, 3, '#d9b07a', OUT, 1.2); box(-25, -7, 10, 4, '#a9773f', OUT, 1, 1);
      line(-20, -4, -20, -17, '#8a5a30', 2); poly([[-24, -17], [-16, -17], [-18, -12], [-22, -12]], '#b8c1ca', OUT, 1);
    },
    sawmill() {
      cottage({ wall: '#d3ac72', wall2: '#b08648', roof: '#9a6a3c', roof2: '#6a4424', chimney: false });
      plankStack(-20, 0); plankStack(-20, -17);
      box(10, -10, 14, 5, '#8a5a30', OUT, 1, 1); line(12, -5, 11, 0, '#6a4424', 2); line(22, -5, 23, 0, '#6a4424', 2);
      ell(17, -13, 6, 3, '#c89a60', OUT, 1);
    },
    bakery() {
      cottage({ wall: '#f6e2c2', wall2: '#e2c496', roof: '#e8943e', roof2: '#bd6a1f', chimney: true });
      line(-20, 0, -20, -26, '#7a5230', 2); box(-26, -30, 12, 9, '#f6e2c2', OUT, 1.5, 1.2);
      ell(-20, -25.5, 4, 2.6, '#d99a4e', OUT, 0.8);
      box(15, -9, 10, 8, '#c79a64', OUT, 2, 1); ell(20, -9, 4, 1.5, '#f0bd6c', OUT, 0.8);
    },
    fisher() {
      cottage({ wall: '#b7d8e6', wall2: '#8fbdd2', roof: '#4a89b3', roof2: '#2f5f80', chimney: false });
      fishRack(-19, 0);
      box(14, -12, 9, 12, '#a9773f', OUT, 2, 1.2); line(14, -8, 23, -8, '#5a3b22', 1.2); line(14, -4, 23, -4, '#5a3b22', 1.2);
    },
    forge() {
      cottage({ wall: '#9ea1a8', wall2: '#777a82', roof: '#575a63', roof2: '#383b43', chimney: true, beam: '#4a4d55' });
      box(-5, -21, 10, 14, '#2a1a14', OUT, 1, 1.2);
      G.beginPath(); G.arc(0, -21, 5, Math.PI, 0); G.fillStyle = '#2a1a14'; G.fill();
      G.fillStyle = rg(0, -14, 1, 9, [[0, 'rgba(255,170,60,.9)'], [1, 'rgba(255,90,20,0)']]); G.fillRect(-6, -22, 12, 16);
      poly([[16, -3], [24, -3], [23, -7], [25, -10], [14, -10], [16, -7]], '#4a4f57', OUT, 1.2); box(15, -2, 10, 2, '#33363c');
    },
    workshop() {
      cottage({ wall: '#dcc08f', wall2: '#bf9c65', roof: '#3a8d7f', roof2: '#256057', chimney: false });
      gearShape(-20, -22, 5.5, '#c3cad2', OUT);
      box(14, -12, 12, 4, '#8a5a30', OUT, 1, 1); line(15, -8, 15, 0, '#6a4424', 2); line(25, -8, 25, 0, '#6a4424', 2);
      G.save(); G.translate(20, -14); G.rotate(-0.5); box(-1, -7, 2, 9, '#a9773f'); box(-4, -8.5, 8, 3.5, '#aeb7c2', OUT, 1, 0.8); G.restore();
    },
    jeweler() {
      cottage({ wall: '#efe8f6', wall2: '#cdc0df', roof: '#8a5bb8', roof2: '#5c3a82', chimney: false });
      line(-20, 0, -20, -24, '#7a5230', 2);
      poly([[-25, -30], [-15, -30], [-20, -22]], lg(-25, -30, -15, -22, [[0, '#e8c4ff'], [1, '#8a4fd0']]), 'rgba(50,20,90,.8)', 1.2);
      circ(19, -3, 3.2, '#ffd23f', 'rgba(120,80,0,.8)', 1); circ(23, -3, 3.2, '#ffd23f', 'rgba(120,80,0,.8)', 1); circ(21, -7, 3.2, '#ffd23f', 'rgba(120,80,0,.8)', 1);
    },
    warehouse() {
      shadow(30, 8, 1, 0.32);
      box(-22, -28, 44, 27, lg(0, -28, 0, -1, [[0, '#cd925b'], [1, '#9a6538']]), OUT, 1, 1.5);
      for (let x = -17; x < 22; x += 8) line(x, -28, x, -1, 'rgba(60,30,10,.25)', 1);
      poly([[-27, -26], [27, -26], [20, -43], [10, -54], [-10, -54], [-20, -43]], lg(0, -54, 0, -26, [[0, '#c24b3a'], [1, '#8f2f25']]), OUT, 1.8);
      for (let i = 1; i < 4; i++) line(-24 + i * 3, -26 - i * 7, 24 - i * 3, -26 - i * 7, 'rgba(0,0,0,.2)', 1);
      line(-10, -54, 10, -54, 'rgba(255,255,255,.35)', 1.6);
      box(-9, -22, 18, 21, '#6b4528', OUT, 1, 1.3); line(0, -22, 0, -1, OUT, 1.2); line(-9, -22, 9, -1, '#d9b27c', 1.3); line(9, -22, -9, -1, '#d9b27c', 1.3);
      box(-4, -43, 8, 8, '#3b2a1c', OUT, 0.5, 1);
      box(15, -9, 10, 9, '#c79a64', OUT, 1, 1.2); line(15, -4.5, 25, -4.5, '#8a5a30', 1); box(-26, -7, 8, 7, '#b88550', OUT, 1, 1.2);
    },
    hall() {
      shadow(64, 12, 2, 0.34);
      box(-46, -10, 92, 10, lg(0, -10, 0, 0, [[0, '#aaa095'], [1, '#7f766c']]), OUT, 1.5, 1.2);
      box(-42, -58, 84, 50, lg(0, -58, 0, -8, [[0, '#f3e4c4'], [1, '#d6bf93']]), OUT, 1, 1.5);
      for (const x of [-42, -21, 0, 21, 42]) line(x, -58, x, -9, '#7a5230', 2.2); line(-42, -33, 42, -33, '#7a5230', 1.8);
      for (const wx of [-36, -30 + 0, 24, 30]) { /* okna dole */ }
      for (const wx of [-35, 25]) { box(wx, -52, 10, 11, '#ffe7a3', OUT, 0.8, 1.2); line(wx + 5, -52, wx + 5, -41, '#7a5230', 1.2); line(wx, -46.5, wx + 10, -46.5, '#7a5230', 1.2); }
      for (const wx of [-35, 25]) { box(wx, -30, 10, 11, '#ffe7a3', OUT, 0.8, 1.2); line(wx + 5, -30, wx + 5, -19, '#7a5230', 1.2); line(wx, -24.5, wx + 10, -24.5, '#7a5230', 1.2); }
      box(-10, -36, 20, 27, '#6b4528', OUT, 1, 1.4); G.beginPath(); G.arc(0, -36, 10, Math.PI, 0); G.fillStyle = '#6b4528'; G.fill(); G.strokeStyle = OUT; G.lineWidth = 1.4; G.stroke();
      line(0, -46, 0, -9, OUT, 1.2); circ(-3.5, -22, 1.1, '#f1c75a'); circ(3.5, -22, 1.1, '#f1c75a');
      poly([[-52, -54], [52, -54], [32, -88], [-32, -88]], lg(0, -88, 0, -54, [[0, '#c7513a'], [1, '#8d2f22']]), OUT, 2);
      for (let i = 1; i < 6; i++) line(-50 + i * 3.4, -54 - i * 5.6, 50 - i * 3.4, -54 - i * 5.6, 'rgba(0,0,0,.2)', 1);
      poly([[-52, -54], [-32, -88], [-27, -88], [-46, -54]], 'rgba(255,255,255,.16)');
      line(-32, -88, 32, -88, 'rgba(255,255,255,.35)', 2);
      box(-13, -104, 26, 24, lg(-13, 0, 13, 0, [[0, '#f1e3c3'], [1, '#d3bd92']]), OUT, 1, 1.5);
      poly([[-17, -102], [17, -102], [0, -128]], lg(0, -128, 0, -102, [[0, '#4d83c4'], [1, '#2f5a94']]), OUT, 1.6);
      circ(0, -93, 6.5, '#fff8e0', OUT, 1.4); line(0, -93, 0, -98, '#333', 1.2); line(0, -93, 3.5, -92, '#333', 1.2);
      line(0, -128, 0, -140, '#6a4424', 1.6);
      box(-26, -10, 8, 7, '#c79a64', OUT, 1, 1.2); box(19, -10, 8, 7, '#c79a64', OUT, 1, 1.2);
    },
    splitter() {
      shadow(24, 7, 2, 0.3);
      ell(0, -9, 22, 14, '#7f776d', OUT, 1.5); ell(0, -13, 22, 14, lg(0, -27, 0, 1, [[0, '#c9c2b6'], [1, '#9b9388']]), OUT, 1.6);
      ell(0, -13, 15, 9, 'rgba(0,0,0,.14)');
      G.fillStyle = '#5b4330';
      poly([[0, -26], [5, -19], [-5, -19]], '#e8c46a', OUT, 1); poly([[0, 0], [5, -7], [-5, -7]], '#e8c46a', OUT, 1);
      poly([[-21, -13], [-14, -18], [-14, -8]], '#e8c46a', OUT, 1); poly([[21, -13], [14, -18], [14, -8]], '#e8c46a', OUT, 1);
      circ(0, -13, 4.5, '#7a5230', OUT, 1.2);
    },
    monument() {
      shadow(40, 10, 2, 0.34);
      box(-30, -8, 60, 8, '#cfc6b6', OUT, 1.5, 1.3); box(-26, -16, 52, 8, '#e1d8c8', OUT, 1.5, 1.3);
      box(-15, -74, 30, 60, lg(-15, 0, 15, 0, [[0, '#f8f1e2'], [1, '#d6caB4'.toLowerCase()]]), OUT, 1, 1.5);
      for (const sx of [-1, 1]) {
        box(sx > 0 ? 15 : -25, -56, 10, 42, '#ebe0cb', OUT, 1, 1.3);
        poly([[sx > 0 ? 13 : -27, -56], [sx > 0 ? 27 : -13, -56], [sx > 0 ? 20 : -20, -78]], lg(0, -78, 0, -56, [[0, '#4d83c4'], [1, '#2f5a94']]), OUT, 1.4);
        box(sx > 0 ? 18 : -22, -46, 4, 8, '#3b2a1c');
      }
      poly([[-18, -72], [18, -72], [0, -116]], lg(0, -116, 0, -72, [[0, '#5a90d2'], [1, '#2f5a94']]), OUT, 1.6);
      line(0, -116, 0, -132, '#f5bd4f', 2.2); line(-5, -127, 5, -127, '#f5bd4f', 2.2);
      circ(0, -56, 9, rg(0, -56, 1, 9, [[0, '#fff3b8'], [1, '#e8a400']]), OUT, 1.4);
      for (let k = 0; k < 8; k++) line(0, -56, Math.cos(k * TAU / 8) * 9, -56 + Math.sin(k * TAU / 8) * 9, 'rgba(110,70,0,.5)', 0.8);
      box(-6, -32, 12, 18, '#4a2f1c', OUT, 1, 1.2); G.beginPath(); G.arc(0, -32, 6, Math.PI, 0); G.fillStyle = '#4a2f1c'; G.fill(); G.strokeStyle = OUT; G.stroke();
    },
    farm() {
      shadow(27, 8, 0, 0.18);
      box(-23, -45, 46, 43, lg(0, -45, 0, -2, [[0, '#9a6a41'], [1, '#7a4f2e']]), OUT, 5, 1.5);
      for (let i = 0; i < 6; i++) line(-19, -39 + i * 6.8, 19, -39 + i * 6.8, 'rgba(60,35,15,.45)', 1.6);
      for (let x = -22; x <= 22; x += 11) { line(x, -45, x, -37, '#b98550', 2.2); line(x, -4, x, 2, '#b98550', 2.2); }
      line(-22, -42, 22, -42, '#b98550', 1.4); line(-22, -1, 22, -1, '#b98550', 1.4);
      line(-20, -30, -20, -10, 'rgba(0,0,0,0)', 1);
      box(-25, -32, 3, 22, '#b98550', OUT, 1, 0.8);
    },
    quarry() {
      shadow(28, 8, 2, 0.32);
      poly([[-23, -2], [-25, -14], [-17, -27], [-4, -33], [11, -29], [21, -19], [24, -6], [17, 0]], lg(-20, -33, 20, 0, [[0, '#d1d5da'], [1, '#79828a']]), OUT, 1.7);
      poly([[-4, -33], [11, -29], [13, -21], [-2, -23]], 'rgba(255,255,255,.3)');
      poly([[-2, -23], [13, -21], [24, -6], [17, 0], [2, -4]], 'rgba(0,0,0,.14)');
      box(-22, -12, 12, 8, '#dde1e4', OUT, 1, 1.4); box(-11, -12, 12, 8, '#c4c9ce', OUT, 1, 1.4); box(-16, -20, 12, 8, '#e6e9eb', OUT, 1, 1.4);
      line(11, 0, 17, -35, '#7a5230', 2.6); line(23, 0, 17, -35, '#7a5230', 2.6); line(17, -35, 4, -31, '#7a5230', 2.2);
      line(4, -31, 4, -17, '#eadcb8', 1.2); box(2, -17, 4, 4, '#444', OUT, 0.5, 0.8);
    },
    mine() {
      shadow(28, 8, 2, 0.32);
      poly([[-25, 0], [-23, -16], [-12, -30], [2, -35], [16, -29], [24, -14], [26, 0]], lg(-22, -35, 22, 0, [[0, '#a19ba3'], [1, '#5a5058']]), OUT, 1.7);
      poly([[2, -35], [16, -29], [12, -22], [-2, -25]], 'rgba(255,255,255,.2)');
      box(-10, -22, 20, 22, '#150e10', OUT, 1, 1.3); G.beginPath(); G.arc(0, -22, 10, Math.PI, 0); G.fillStyle = '#150e10'; G.fill();
      line(-11, 0, -11, -23, '#9a6a3a', 3); line(11, 0, 11, -23, '#9a6a3a', 3); line(-12, -24, 12, -24, '#9a6a3a', 3);
      line(-6, 0, -3, -14, '#6a6a72', 1.6); line(6, 0, 3, -14, '#6a6a72', 1.6);
      box(14, -9, 10, 8, '#5a4a40', OUT, 1.5, 1.2); circ(17, -1, 2, '#222'); circ(22, -1, 2, '#222');
      poly([[15, -9], [18, -13], [21, -10], [23, -9]], '#e0793c', 'rgba(90,40,15,.7)', 1);
    },
    goldmine() {
      shadow(28, 8, 2, 0.32);
      poly([[-25, 0], [-23, -16], [-12, -30], [2, -35], [16, -29], [24, -14], [26, 0]], lg(-22, -35, 22, 0, [[0, '#d9c488'], [1, '#85703a']]), OUT, 1.7);
      poly([[2, -35], [16, -29], [12, -22], [-2, -25]], 'rgba(255,255,255,.3)');
      box(-10, -22, 20, 22, '#150e10', OUT, 1, 1.3); G.beginPath(); G.arc(0, -22, 10, Math.PI, 0); G.fillStyle = '#150e10'; G.fill();
      line(-11, 0, -11, -23, '#9a6a3a', 3); line(11, 0, 11, -23, '#9a6a3a', 3); line(-12, -24, 12, -24, '#9a6a3a', 3);
      box(14, -9, 10, 8, '#5a4a40', OUT, 1.5, 1.2); circ(17, -1, 2, '#222'); circ(22, -1, 2, '#222');
      for (const [x, y] of [[16, -11], [20, -12], [23, -10]]) poly([[x - 2.5, y + 2], [x, y - 2.5], [x + 3, y + 2]], '#ffd44a', 'rgba(110,80,0,.7)', 0.9);
      for (const [x, y] of [[-17, -10], [-8, -26], [13, -22]]) poly([[x - 3, y + 2], [x, y - 3], [x + 3, y + 2]], '#ffd44a', 'rgba(110,80,0,.7)', 0.9);
    },
  };

  const ART = { T, S, blit, icon: {}, iconURL: {}, rock: { rock: [], ore: [], gold: [] }, tree: [], bld: {}, thumbs: {} };

  ART.build = function () {
    for (let v = 0; v < 3; v++) {
      ART.tree.push(mk(64, 84, 32, 76, () => pine(v)));
      ART.tree.push(mk(64, 84, 32, 76, () => round(v)));
      for (const k of ['rock', 'ore', 'gold']) ART.rock[k].push(mk(52, 46, 26, 40, () => rock(k, v)));
    }
    for (const k of Object.keys(ICON)) {
      const s = mk(32, 32, 16, 16, ICON[k]);
      ART.icon[k] = s; ART.iconURL[k] = s.c.toDataURL();
    }
    const big = { hall: [160, 190, 80, 168], monument: [100, 160, 50, 140], farm: [64, 60, 32, 52], splitter: [64, 52, 32, 44] };
    for (const k of Object.keys(BLD)) {
      const d = big[k] || [100, 124, 50, 106];
      ART.bld[k] = mk(d[0], d[1], d[2], d[3], BLD[k]);
    }
    // náhledy do palety
    for (const k of Object.keys(BLD)) {
      const s = ART.bld[k], c = document.createElement('canvas'); c.width = c.height = 72;
      const g = c.getContext('2d');
      const fit = Math.min(66 / s.h, 66 / s.w) * 1.0, w = s.w * fit, h = s.h * fit;
      g.drawImage(s.c, (72 - w) / 2, (72 - h) / 2 + 1, w, h);
      ART.thumbs[k] = c.toDataURL();
    }
    // náhled dopravníku a bourání
    {
      const c = document.createElement('canvas'); c.width = c.height = 72; const g = c.getContext('2d');
      g.lineCap = 'butt'; g.lineJoin = 'round';
      const p = () => { g.beginPath(); g.moveTo(6, 52); g.lineTo(36, 52); g.lineTo(36, 20); g.lineTo(66, 20); };
      p(); g.strokeStyle = '#4a3523'; g.lineWidth = 24; g.stroke();
      p(); g.strokeStyle = '#a77a47'; g.lineWidth = 20; g.stroke();
      p(); g.strokeStyle = '#6a4f35'; g.lineWidth = 12; g.stroke();
      p(); g.strokeStyle = 'rgba(255,225,160,.55)'; g.lineWidth = 12; g.setLineDash([4, 8]); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.moveTo(66, 20); g.lineTo(54, 12); g.lineTo(54, 28); g.fill();
      ART.thumbs.conveyor = c.toDataURL();
    }
    {
      const c = document.createElement('canvas'); c.width = c.height = 72; const g = c.getContext('2d');
      g.fillStyle = '#d9584a'; g.beginPath(); g.arc(36, 38, 22, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(27, 29); g.lineTo(45, 47); g.moveTo(45, 29); g.lineTo(27, 47); g.stroke();
      ART.thumbs.erase = c.toDataURL();
    }
  };

  // ---------- animované doplňky budov (kreslí se přes sprite) ----------
  // ax, ay = kotva (střed spodní hrany dlaždice)
  ART.overlay = function (ctx, type, ax, ay, o) {
    ctx.save(); ctx.translate(ax, ay);
    const t = o.time;
    if (type === 'sawmill') {
      ctx.save(); ctx.translate(17, -16); ctx.rotate(o.working ? t * 9 : 0);
      ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5); ctx.lineTo(Math.cos(a + 0.26) * 6.4, Math.sin(a + 0.26) * 6.4); }
      ctx.closePath(); ctx.fillStyle = '#d3d9e0'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fillStyle = '#555'; ctx.fill(); ctx.restore();
    } else if (type === 'forge' && o.working) {
      const f = 0.55 + 0.25 * Math.sin(t * 11) + 0.1 * Math.sin(t * 23);
      const g = ctx.createRadialGradient(0, -14, 1, 0, -14, 22); g.addColorStop(0, `rgba(255,190,70,${f})`); g.addColorStop(1, 'rgba(255,110,20,0)');
      ctx.fillStyle = g; ctx.fillRect(-26, -40, 52, 46);
    } else if (type === 'hall') {
      const w = Math.sin(t * 2.2) * 2.5;
      ctx.beginPath(); ctx.moveTo(0, -140); ctx.quadraticCurveTo(8, -139 + w, 15, -135); ctx.quadraticCurveTo(8, -134 - w, 0, -131); ctx.closePath();
      ctx.fillStyle = '#e8584a'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
    } else if (type === 'goldmine') {
      for (let i = 0; i < 3; i++) {
        const a = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 2.1), x = [-17, 9, 21][i], y = [-10, -27, -11][i];
        ctx.globalAlpha = a; ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x - 4 * a, y); ctx.lineTo(x + 4 * a, y); ctx.moveTo(x, y - 4 * a); ctx.lineTo(x, y + 4 * a); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (type === 'farm') {
      const p = o.progress || 0;
      for (let r = 0; r < 6; r++) {
        const y = -37 + r * 6.8;
        for (let x = -18; x <= 18; x += 4.6) {
          const h = 2 + p * 9, sway = Math.sin(t * 1.6 + x * 0.4 + r) * 0.9 * p;
          ctx.strokeStyle = p > 0.85 ? '#f0c24a' : '#6fbb4a'; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + sway, y + 2 - h); ctx.stroke();
          if (p > 0.85) { ctx.fillStyle = '#f7d65a'; ctx.beginPath(); ctx.arc(x + sway, y - h + 1.5, 1.3, 0, TAU); ctx.fill(); }
        }
      }
    }
    ctx.restore();
  };

  window.ART = ART;
})();
