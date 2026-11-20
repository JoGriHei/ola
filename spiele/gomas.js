// O Pandi e as gomas: Fangspiel im Heckenlabyrinth von Omas Garten (Geburtstagsfest), von oben gesehen.
// Pandi isst alle Gummibärchen auf. Ada, Leo und Pedro laufen ihm nach; wer ihn erwischt, ruft „Apanhei-te!“ (drei Leben).
// Vier Cavaquinhos von Rute liegen in jeder Runde an anderen Stellen: Wer eines holt, lässt Musik spielen und alle Kinder
// tanzen ein paar Sekunden auf der Stelle.
// Zwischendurch taucht ein gelerntes Wort als Bildkarte auf und wird gesprochen: einsammeln = +5.
// Steuern: wischen oder neben Pandi tippen (Richtung vom Pandi aus), am Rechner auch Pfeiltasten.
// Ende: alle Gummibärchen weg → Pandi sitzt satt da, daneben Pondi, und Selma ruft „Foi o Pondi!“.
// Eigenes Labyrinth, eigene Figuren; Test: _test?auto lässt Pandi selbst laufen (window.OLA_GOMAS_AUTO),
// mit &gomasfrei bleiben die Kinder stehen (window.OLA_GOMAS_FREI), so sieht man den Schluss.
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.gomas = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#3f8f3a' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  // # Hecke, . Gummibärchen, P Pandi, A Ada, L Leo, E Pedro (Startplätze, dort liegt nichts)
  const MAPA = [
    '###################',
    '#........A........#',
    '#.##.##.#.#.##.##.#',
    '#.................#',
    '#.##.#.#####.#.##.#',
    '#L...#...P...#...E#',
    '#.##.#.#####.#.##.#',
    '#.................#',
    '#.##.##.#.#.##.##.#',
    '#.................#',
    '###################',
  ];
  const RUFE = { ada: 'Apanhei-te!', leo: 'Apanhei-te, Pandi!', pedro: 'Já te apanhei!' };

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H, COLS = MAPA[0].length, ROWS = MAPA.length, T = 48;
    const OX = (W - COLS * T) / 2, OY = (H - ROWS * T) / 2, cx = c => OX + c * T + T / 2, cy = r => OY + r * T + T / 2;
    const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const wall = (c, r) => r < 0 || r >= ROWS || c < 0 || c >= COLS || MAPA[r][c] === '#';
    const FARBEN = [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x8e44ad];

    return class Gomas extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        this.load.image('pandi', B.sprite(api, 'esc-pandi')); this.load.image('pondi', B.sprite(api, 'esc-pondi'));
        ['ada', 'leo', 'pedro'].forEach(k => this.load.image(k, B.sprite(api, 'gast-' + k)));
        this.load.image('cavaquinho', B.sprite(api, 'gomas-cavaquinho'));
        this.words = Phaser.Utils.Array.Shuffle((api.words || []).filter(w => w.img)).slice(0, 10);
        B.loadWords(this, this.words);
        ['pop', 'magic', 'bonk', 'lose', 'win', 'star', 'music-pondi', 'gomas-danca'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        this.api = this.registry.get('api'); this.score = 0; this.over = false; this.frozen = true; this.dance = 0; this.safe = 0; this.cardIn = 9; this.card = null;
        B.particles(this);
        this.malen();
        // Gummibärchen und Cavaquinhos
        this.rest = 0; this.gomas = MAPA.map(() => []); this.cavas = [];
        MAPA.forEach((row, r) => [...row].forEach((ch, c) => {
          if (ch === '.') { this.gomas[r][c] = this.add.image(cx(c), cy(r), 'goma' + (c * 3 + r * 5) % 5).setScale(0.5).setDepth(2); this.rest++; }
        }));
        // vier Cavaquinhos an zufälligen Stellen: weit auseinander, nicht direkt neben Pandis Startplatz; dort liegt dann kein Gummibärchen
        const [pc, pr] = [MAPA.find(z => z.includes('P')).indexOf('P'), MAPA.findIndex(z => z.includes('P'))], kandidaten = [];
        MAPA.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '.' && Math.abs(c - pc) + Math.abs(r - pr) >= 4) kandidaten.push([c, r]); }));
        for (let abstand = 9; this.cavas.length < 4 && abstand >= 0; abstand--) for (const [c, r] of Phaser.Utils.Array.Shuffle(kandidaten.slice())) {
          if (this.cavas.length >= 4 || this.cavas.some(v => Math.abs(v.c - c) + Math.abs(v.r - r) < abstand)) continue;
          this.gomas[r][c].destroy(); this.gomas[r][c] = null; this.rest--;
          const im = this.add.image(cx(c), cy(r), 'cavaquinho').setDepth(3); im.setScale(40 / im.height).setAngle(-25);
          this.tweens.add({ targets: im, scale: im.scale * 1.18, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); this.cavas.push({ c, r, im }); }
        // Figuren als Spielsteine
        const platz = ch => { const r = MAPA.findIndex(z => z.includes(ch)); return [MAPA[r].indexOf(ch), r]; };
        const stein = (key, ch, v, farbe, hoch) => { const [c, r] = platz(ch), fuss = this.add.ellipse(0, 0, 34, 14, farbe).setStrokeStyle(2, 0xffffff), im = this.add.image(0, 0, key).setOrigin(0.5, 1);
          im.setScale(hoch / im.height); im.y = 5; const cont = this.add.container(cx(c), cy(r), [fuss, im]); fuss.y = 4;
          return { key, c, r, c0: c, r0: r, x: cx(c), y: cy(r), dir: null, last: null, want: null, v, cont, im }; };
        this.pandi = stein('pandi', 'P', 150, 0xffffff, 50);
        this.kinder = [stein('ada', 'A', 100, 0xf4b942, 58), stein('leo', 'L', 110, 0xd93a2b, 58), stein('pedro', 'E', 96, 0x2e9e4f, 58)];
        this.kinder.forEach((k, i) => { k.warte = 1.2 + i * 3; });
        this.hud = B.hud(this, 'gomaGross', 3);
        // Steuern: tippen (Richtung vom Pandi aus), wischen, Pfeiltasten
        const richtung = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
        this.input.on('pointerdown', p => { this.ab = { x: p.x, y: p.y }; const dx = p.x - this.pandi.x, dy = p.y - this.pandi.y; if (Math.hypot(dx, dy) > 20) this.pandi.want = richtung(dx, dy); });
        this.input.on('pointermove', p => { if (!p.isDown || !this.ab) return; const dx = p.x - this.ab.x, dy = p.y - this.ab.y; if (Math.hypot(dx, dy) > 22) { this.pandi.want = richtung(dx, dy); this.ab = { x: p.x, y: p.y }; } });
        this.input.keyboard && this.input.keyboard.on('keydown', e => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (d) this.pandi.want = d; });
        if (this.cache.audio.exists('music-pondi')) { this.music = this.sound.add('music-pondi', { loop: true, volume: 0.22 }); this.music.play(); }
        this.api.say('Quem comeu as gomas?');
        this.time.delayedCall(1500, () => { this.frozen = false; });
      }

      // Garten malen: Terrakottaboden, Hecken mit Blüten, Gummibärchen als Texturen
      malen() {
        const g = this.add.graphics();
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { g.fillStyle((c + r) % 2 ? 0xe2a56c : 0xd9995f).fillRect(OX + c * T, OY + r * T, T, T); }
        g.lineStyle(1, 0xc98850, 0.6); for (let c = 0; c <= COLS; c++) g.lineBetween(OX + c * T, OY, OX + c * T, OY + ROWS * T); for (let r = 0; r <= ROWS; r++) g.lineBetween(OX, OY + r * T, OX + COLS * T, OY + r * T);
        // Schatten der Hecken auf dem Boden
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (wall(c, r) && !wall(c, r + 1)) g.fillStyle(0x7a4a22, 0.22).fillRect(OX + c * T, OY + (r + 1) * T, T, 7);
        let z = 17; const zufall = () => { z = (z * 1103515245 + 12345) & 0x7fffffff; return z / 0x7fffffff; };
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (!wall(c, r)) continue; const x = OX + c * T, y = OY + r * T;
          g.fillStyle(0x2f7d32).fillRect(x, y, T, T);
          const l = wall(c - 1, r) ? 0 : 5, rr = wall(c + 1, r) ? 0 : 5, o = wall(c, r - 1) ? 0 : 5, u = wall(c, r + 1) ? 0 : 7;
          g.fillStyle(0x4caf50).fillRoundedRect(x + l, y + o, T - l - rr, T - o - u, 8);
          for (let i = 0; i < 5; i++) g.fillStyle(0x66bb6a, 0.9).fillCircle(x + 6 + zufall() * (T - 12), y + 6 + zufall() * (T - 14), 3 + zufall() * 3);
          if (zufall() < 0.4) { const fx = x + 10 + zufall() * (T - 20), fy = y + 10 + zufall() * (T - 22), f = [0xff8fb1, 0xffffff, 0xffe066][Math.floor(zufall() * 3)];
            for (let i = 0; i < 5; i++) g.fillStyle(f).fillCircle(fx + Math.cos(i * 1.257) * 4, fy + Math.sin(i * 1.257) * 4, 3); g.fillStyle(0xffc107).fillCircle(fx, fy, 2.5); } }
        // Gummibärchen: Kopf, Ohren, Bauch, Arme, Beine
        const baer = (key, farbe, s) => { const b = this.make.graphics({ add: false }), hell = Phaser.Display.Color.IntegerToColor(farbe).lighten(28).color, dunkel = Phaser.Display.Color.IntegerToColor(farbe).darken(18).color;
          b.fillStyle(dunkel); [[11, 30], [33, 30], [13, 46], [31, 46]].forEach(([x, y]) => b.fillEllipse(x * s, y * s, 11 * s, 12 * s));
          b.fillStyle(farbe).fillCircle(13 * s, 8 * s, 6 * s).fillCircle(31 * s, 8 * s, 6 * s).fillCircle(22 * s, 15 * s, 11 * s).fillEllipse(22 * s, 34 * s, 22 * s, 26 * s);
          b.fillStyle(hell, 0.85).fillEllipse(22 * s, 34 * s, 11 * s, 14 * s).fillCircle(18 * s, 11 * s, 2.6 * s);
          b.fillStyle(0x3b2412).fillCircle(18.5 * s, 15 * s, 1.5 * s).fillCircle(25.5 * s, 15 * s, 1.5 * s);
          b.generateTexture(key, 44 * s, 54 * s); b.destroy(); };
        FARBEN.forEach((f, i) => baer('goma' + i, f, 1)); baer('gomaGross', FARBEN[0], 2.4);
      }

      frei(e, d) { return !!d && !wall(e.c + d[0], e.r + d[1]); }
      // ein Stück weiterlaufen; an jeder Kachelmitte entscheidet waehle() über die nächste Richtung
      laufen(e, dist, waehle, ankunft) {
        for (let n = 0; n < 6 && dist > 0.01; n++) {
          if (!e.dir) { const d = waehle(e); if (!d) return; e.dir = d; e.last = d; }
          const tx = cx(e.c + e.dir[0]), ty = cy(e.r + e.dir[1]), rest = Math.abs(tx - e.x) + Math.abs(ty - e.y);
          if (dist < rest) { e.x += e.dir[0] * dist; e.y += e.dir[1] * dist; dist = 0; }
          else { e.x = tx; e.y = ty; e.c += e.dir[0]; e.r += e.dir[1]; dist -= rest; e.dir = null; if (ankunft) ankunft(e); }
        }
      }
      pandiWahl(e) { if (window.OLA_GOMAS_AUTO) e.want = this.auto(e) || e.want; return this.frei(e, e.want) ? e.want : this.frei(e, e.last) ? e.last : null; }
      kindWahl(k) {
        const wege = DIRS.filter(d => this.frei(k, d)), vor = wege.filter(d => !k.last || d[0] !== -k.last[0] || d[1] !== -k.last[1]), opt = vor.length ? vor : wege;
        if (!opt.length) return null;
        const p = this.pandi, laune = { ada: 0.15, leo: 0.45, pedro: 0.2 }[k.key];
        if (Math.random() < laune) return Phaser.Utils.Array.GetRandom(opt);
        const voraus = k.key === 'pedro' && p.last ? 3 : 0, zx = p.c + (p.last ? p.last[0] : 0) * voraus, zy = p.r + (p.last ? p.last[1] : 0) * voraus; // Pedro schneidet den Weg ab
        return opt.reduce((a, d) => (k.c + d[0] - zx) ** 2 + (k.r + d[1] - zy) ** 2 < (k.c + a[0] - zx) ** 2 + (k.r + a[1] - zy) ** 2 ? d : a);
      }
      // Autopilot für Tests: kürzester Weg zum nächsten Gummibärchen, Kacheln nahe bei den Kindern meiden
      auto(e) {
        const gefahr = (c, r) => !this.dance && this.kinder.some(k => Math.abs(k.c - c) + Math.abs(k.r - r) <= 2);
        for (const streng of [true, false]) { const seen = new Set([e.c + ',' + e.r]), q = [[e.c, e.r, null]];
          while (q.length) { const [c, r, erst] = q.shift(); if (erst && (this.gomas[r][c] || this.cavas.some(v => v.c === c && v.r === r))) return erst;
            for (const d of DIRS) { const nc = c + d[0], nr = r + d[1], key = nc + ',' + nr; if (wall(nc, nr) || seen.has(key) || (streng && gefahr(nc, nr))) continue; seen.add(key); q.push([nc, nr, erst || d]); } } }
        return null;
      }

      aufKachel(e) {
        const g = this.gomas[e.r][e.c];
        if (g) { this.gomas[e.r][e.c] = null; this.rest--; this.score++; this.hud.setScore(this.score); B.play(this, 'pop', { volume: 0.25, rate: 1.1 + Math.random() * 0.3 });
          this.tweens.add({ targets: g, scale: 0.9, alpha: 0, duration: 160, onComplete: () => g.destroy() }); }
        const i = this.cavas.findIndex(v => v.c === e.c && v.r === e.r);
        if (i >= 0) { this.cavas[i].im.destroy(); this.cavas.splice(i, 1); this.tanzen(); }
        if (this.card && this.card.c === e.c && this.card.r === e.r) { const k = this.card; this.card = null; this.score += 5; this.hud.setScore(this.score); B.play(this, 'star', { volume: 0.5 }); B.plus(this, e.x, e.y - 30, '+5');
          this.api.say(k.w.pt); this.tweens.add({ targets: k.cont, scale: 1.6, alpha: 0, duration: 350, onComplete: () => k.cont.destroy() }); this.cardIn = 10; }
        if (this.rest <= 0 && !this.over) this.gewonnen();
      }
      tanzen() {
        this.dance = 6.5; B.play(this, 'magic', { volume: 0.5 }); if (this.music) this.music.setVolume(0.05); B.play(this, 'gomas-danca', { volume: 0.7 });
        this.kinder.forEach(k => { k.tanz = this.tweens.add({ targets: k.im, angle: { from: -12, to: 12 }, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); });
      }
      karte(dt) {
        if (this.card) { this.card.zeit -= dt; if (this.card.zeit <= 0) { const k = this.card; this.card = null; this.tweens.add({ targets: k.cont, alpha: 0, duration: 300, onComplete: () => k.cont.destroy() }); this.cardIn = 8; } return; }
        this.cardIn -= dt; if (this.cardIn > 0 || !this.words.length) return;
        const frei = []; MAPA.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '#' && !this.cavas.some(v => v.c === c && v.r === r) && Math.abs(c - this.pandi.c) + Math.abs(r - this.pandi.r) >= 5) frei.push([c, r]); }));
        const [c, r] = Phaser.Utils.Array.GetRandom(frei), w = this.words[(this.wn = (this.wn || 0) + 1) % this.words.length];
        const cont = B.wordCard(this, w, 42).setPosition(cx(c), cy(r)).setDepth(4).setScale(0);
        this.tweens.add({ targets: cont, scale: 1, duration: 300, ease: 'Back.out' }); this.tweens.add({ targets: cont, angle: { from: -6, to: 6 }, duration: 600, yoyo: true, repeat: -1 });
        this.card = { c, r, w, cont, zeit: 10 }; this.api.say(w.pt);
      }
      erwischt(k) {
        this.frozen = true; this.hud.setLives(this.hud.lives - 1); B.play(this, 'bonk', { volume: 0.6 }); this.api.say(RUFE[k.key]); this.cameras.main.shake(180, 0.006);
        this.tweens.add({ targets: k.cont, scale: 1.25, duration: 160, yoyo: true, repeat: 1 }); this.tweens.add({ targets: this.pandi.im, angle: 360, duration: 500 });
        if (this.hud.lives <= 0) { this.over = true; if (this.music) this.music.stop(); B.play(this, 'lose', { volume: 0.5 }); this.time.delayedCall(2000, () => this.api.end({ score: `🍬 ${this.score}` })); return; }
        this.time.delayedCall(1500, () => { [this.pandi, ...this.kinder].forEach(e => { e.c = e.c0; e.r = e.r0; e.x = cx(e.c); e.y = cy(e.r); e.dir = e.last = e.want = null; }); this.pandi.im.setAngle(0);
          this.kinder.forEach((x, i) => { x.warte = 1 + i * 2; }); this.safe = 2; this.frozen = false; });
      }
      gewonnen() {
        this.over = true; this.frozen = true; if (this.music) this.music.stop(); this.sound.stopByKey && this.sound.stopByKey('gomas-danca'); B.play(this, 'win', { volume: 0.6 });
        this.add.rectangle(0, 0, W, H, 0x1b3d1a, 0.6).setOrigin(0).setDepth(200);
        const p = this.add.image(W / 2 - 110, H / 2 + 110, 'pandi').setOrigin(0.5, 1).setDepth(201); p.setScale(0); const ps = 230 / p.height;
        this.tweens.add({ targets: p, scale: ps, duration: 500, ease: 'Back.out' }); this.tweens.add({ targets: p, scaleX: ps * 1.08, duration: 700, yoyo: true, repeat: -1, delay: 600 }); // satt: der Bauch geht hin und her
        const q = this.add.image(W + 150, H / 2 + 110, 'pondi').setOrigin(0.5, 1).setDepth(201); q.setScale(210 / q.height);
        this.tweens.add({ targets: q, x: W / 2 + 130, duration: 700, delay: 900, ease: 'Cubic.out' });
        this.add.image(W / 2 + 205, H / 2 + 92, 'gomaGross').setDepth(202).setScale(0.45).setAlpha(0).setName('rest');
        this.time.delayedCall(1700, () => { this.children.getByName('rest').setAlpha(1); this.api.say('Foi o Pondi!'); });
        this.add.particles(0, 0, 'star', { x: { min: 0, max: W }, y: -10, speedY: { min: 120, max: 240 }, rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1.2 }, lifespan: 4000, frequency: 90 }).setDepth(203);
        this.time.delayedCall(5200, () => this.api.end({ score: `🍬 ${this.score}` }));
      }

      update(time, delta) {
        const dt = Math.min(0.05, delta / 1000), p = this.pandi;
        if (!this.frozen && !this.over) {
          if (this.safe > 0) this.safe -= dt;
          if (this.dance > 0) { this.dance -= dt; if (this.dance <= 0) { this.kinder.forEach(k => { if (k.tanz) { k.tanz.stop(); k.tanz = null; } k.im.setAngle(0); }); if (this.music) this.music.setVolume(0.22); } }
          // Pandi darf mitten im Gang umdrehen
          if (p.dir && p.want && p.want[0] === -p.dir[0] && p.want[1] === -p.dir[1]) { p.c += p.dir[0]; p.r += p.dir[1]; p.dir = p.want; p.last = p.want; }
          this.laufen(p, p.v * dt, e => this.pandiWahl(e), e => this.aufKachel(e));
          const schnell = this.rest < 60 ? 1.08 : 1;
          this.kinder.forEach(k => { if (k.warte > 0) { k.warte -= dt; return; } if (this.dance > 0 || window.OLA_GOMAS_FREI) return; this.laufen(k, k.v * schnell * dt, e => this.kindWahl(e)); });
          if (!this.over && this.dance <= 0 && this.safe <= 0 && !window.OLA_GOMAS_FREI) { const k = this.kinder.find(k => Math.hypot(k.x - p.x, k.y - p.y) < T * 0.6); if (k) this.erwischt(k); }
          if (!this.over) this.karte(dt);
        }
        // Steine an ihren Platz, hintere zuerst; Pandi blinkt kurz nach dem Erwischen
        [p, ...this.kinder].forEach(e => { e.cont.setPosition(e.x, e.y + 14).setDepth(10 + e.y / 1000); if (e.dir && e.dir[0]) e.im.setFlipX(e.dir[0] < 0); });
        p.cont.setAlpha(this.safe > 0 ? 0.55 + 0.45 * Math.sin(time / 60) : 1);
        if (this.dance > 0 && Math.random() < dt * 6) { const k = Phaser.Utils.Array.GetRandom(this.kinder), n = this.add.text(k.x + (Math.random() - 0.5) * 30, k.y - 40, Math.random() < 0.5 ? '♪' : '♫', { fontSize: '26px', color: '#ffffff', stroke: '#7d3fc0', strokeThickness: 4 }).setDepth(60);
          this.tweens.add({ targets: n, y: n.y - 50, alpha: 0, duration: 900, onComplete: () => n.destroy() }); }
      }
    };
  }
})();
