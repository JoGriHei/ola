// A Lili salta: Lili, ein lila Bubble Tea, hüpft vom Trampolin von Wolke zu Wolke nach oben.
// Gehüpft wird von allein; der Finger (oder die Pfeiltasten) zeigt, wohin sie hüpft.
// Geschenke sammeln (+1), im goldenen Geschenk steckt eine Überraschung (+5, siehe surprise()).
// Regenwolken kosten ein Leben. 3 Leben als lila Tapiokaperlen.
// Ziel: bei GOAL Metern liegt eine goldene Wolke mit einem großen Geschenk; wer dort landet, gewinnt.
// Je höher, desto später am Tag: Himmel wird erst orange, dann lila, oben leuchten die Sterne.
// Ab 50 m wandern manche Wolken hin und her, ab 120 m gibt es dünne Wolken, die nur einmal tragen.
// Am Boden stehen drei Trampoline mit Abstand nebeneinander. Fällt Lili, fährt die Kamera mit bis zum Boden:
// Landet sie auf einem Trampolin, hüpft sie weiter; landet sie im Gras, geht eine Perle kaputt.
// Ein Schatten am Boden zeigt, wo sie aufkommt (grün = Trampolin, rot = Gras).
// Doppeltippen in der Luft: Extrasprung mit einem von drei Kunststücken (Salto, Pirouette, Gummi-Hüpfer).
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.lili = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#bfe3ff' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H, GROUND = 500;
    const LIVES = 3; // Leben als Tapiokaperlen oben links
    const GOAL = window.OLA_DEBUG && window.OLA_LILI_ZIEL ? 15 : 250; // Meter bis zur goldenen Zielwolke (Testseite ?ziel: 15 m)
    const G = 1500, JUMP = 960, TRAMP = 1180, PX = 40; // Schwerkraft, Sprung von der Wolke / vom Trampolin, Pixel pro Meter
    // Himmelsfarben nach Höhe (m): Tag, Nachmittag, Abendrot, Dämmerung, Nacht
    const SKY = [[0, 0xbfe3ff], [50, 0x9fd0ff], [100, 0xffc890], [150, 0xd79ad8], [195, 0x4a4a9c], [240, 0x161c45]]; // bis zum Ziel (250 m) wird es Nacht
    const mix = (a, b, t) => {
      const c = s => [(a >> s) & 255, (b >> s) & 255];
      return [16, 8, 0].reduce((v, s) => { const [x, y] = c(s); return v | (Math.round(x + (y - x) * t) << s); }, 0);
    };
    const skyAt = m => {
      for (let i = 1; i < SKY.length; i++) if (m < SKY[i][0]) return mix(SKY[i - 1][1], SKY[i][1], (m - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]));
      return SKY[SKY.length - 1][1];
    };

    return class Jump extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        ['lili', 'nuvem', 'nuvem-chuva', 'presente', 'presente-dourado', 'trampolim'].forEach(k => this.load.image(k, B.sprite(api, k)));
        ['boing', 'puff', 'gift', 'golden', 'rain', 'fall', 'magic', 'win', 'lose', 'music-nuvens', 'turbo', 'star', 'magnet', 'bubble', 'confetti', 'pop'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        this.api = this.registry.get('api');
        this.got = 0; this.lives = LIVES; this.over = false; this.hurtUntil = 0; this.best = 0;
        this.fx = null; this.lastFx = null; // laufende Überraschung { kind, until }
        this.platforms = []; this.gifts = []; this.rains = [];
        this.cam = this.cameras.main;
        B.particles(this);

        // Sterne (erscheinen erst nachts) und ferne Wolken, die langsamer mitziehen
        this.stars = this.add.graphics().setScrollFactor(0).setDepth(0).setAlpha(0);
        for (let i = 0; i < 70; i++) this.stars.fillStyle(0xffffff, 0.5 + Math.random() * 0.5).fillCircle(Math.random() * W, Math.random() * H, 0.8 + Math.random() * 1.8);
        this.far = [];
        for (let i = 0; i < 5; i++) {
          const f = this.add.image(Math.random() * W, Math.random() * H, 'nuvem').setScrollFactor(0).setDepth(0).setAlpha(0.22).setTint(0xdde8ff);
          f.setScale((70 + Math.random() * 50) / f.width);
          this.far.push(f);
        }
        this.lastScroll = 0;

        // Wiese und Trampolin
        this.add.rectangle(W / 2, GROUND + 60, W, 120, 0x7cc35a).setDepth(1);
        this.add.rectangle(W / 2, GROUND + 2, W, 6, 0x5fa844).setDepth(1);
        this.groundTramps = [W * 0.12, W * 0.5, W * 0.88].map(x => {
          const tr = this.add.image(x, GROUND + 4, 'trampolim').setOrigin(0.5, 1).setDepth(2);
          tr.setScale(200 / tr.width);
          const t = { o: tr, x, y: tr.y - tr.displayHeight * 0.82, hw: 86, kind: 'tramp' };
          this.platforms.push(t);
          return t;
        });
        const trTop = this.groundTramps[1].y;
        // Schatten am Boden unter Lili
        this.shadow = this.add.ellipse(0, GROUND - 2, 90, 18, 0x000000, 0.3).setDepth(2).setVisible(false);

        // Lili steht auf dem Trampolin (Bildmitte unten = Füße)
        this.lili = this.add.image(W / 2, trTop, 'lili').setOrigin(0.5, 1).setDepth(6);
        this.sc = 110 / this.lili.height; this.lili.setScale(this.sc);
        this.startY = trTop; this.vx = 0; this.vy = -JUMP * 0.7;

        this.pearls = this.add.particles(0, 0, 'dot', { speed: { min: 60, max: 180 }, angle: { min: 200, max: 340 }, gravityY: 500, scale: { start: 0.7, end: 0.3 }, tint: [0x5b2d8a, 0x9b6bd1], lifespan: 700, emitting: false }).setDepth(7);
        this.puffs = this.add.particles(0, 0, 'dot', { speed: { min: 30, max: 120 }, scale: { start: 1.6, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: 0xffffff, lifespan: 600, emitting: false }).setDepth(7);
        this.sparks = this.add.particles(0, 0, 'star', { speed: { min: 80, max: 260 }, scale: { start: 1.1, end: 0 }, rotate: { min: 0, max: 360 }, lifespan: 700, emitting: false }).setDepth(8);
        this.drops = this.add.particles(0, 0, 'dot', { speed: { min: 40, max: 120 }, angle: { min: 60, max: 120 }, gravityY: 600, scale: { start: 0.5, end: 0.2 }, tint: 0x5aa6ff, lifespan: 600, emitting: false }).setDepth(7);

        this.fxIcon = this.add.text(0, 0, '', { fontSize: '44px' }).setOrigin(0.5).setDepth(7).setVisible(false);
        this.nextY = trTop - 150; this.lastX = W / 2; this.lastAmp = 0; this.cloudN = 0; this.lastKind = 'cloud'; this.lastStep = 0; this.solidX = W / 2;
        this.fill();

        this.hud = B.hud(this, 'presente', 0); // ohne Herzen, Leben sind hier Tapiokaperlen
        this.bubbles = [];
        for (let i = 0; i < LIVES; i++) this.bubbles.push(this.pearl(32 + i * 40, 38).setDepth(100));
        this.freezeUntil = 0;
        this.meter = this.add.text(W / 2, 34, '0 / ' + GOAL + ' m', { fontFamily: 'sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#0f1f4d', stroke: '#ffffff', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        // Steuerung: Lili hüpft dorthin, wo der Finger ist
        this.tx = null;
        this.lastTap = 0; this.trickUsed = false; this.trickUntil = 0;
        this.input.on('pointerdown', p => { this.tap(); this.tx = p.x; });
        this.input.keyboard.on('keydown-SPACE', () => this.tap());
        this.input.on('pointermove', p => { if (p.isDown) this.tx = p.x; });
        this.input.on('pointerup', () => { this.tx = null; });
        this.cursors = this.input.keyboard.createCursorKeys();

        if (this.cache.audio.exists('music-nuvens')) { this.music = this.sound.add('music-nuvens', { loop: true, volume: 0.32 }); this.music.play(); }
      }

      // Wolken nach oben hin auffüllen
      fill() { while (!this.goalMade && this.nextY > this.cam.scrollY - 300) this.spawnCloud(); }

      // goldene Zielwolke mit großem Geschenk
      spawnGoal() {
        this.goalMade = true;
        const y = this.nextY + 60, x = W / 2; // etwas tiefer als die nächste Wolke wäre, damit ein normaler Sprung reicht
        const o = this.add.image(x, y, 'nuvem').setOrigin(0.5, 0.3).setDepth(3).setTint(0xffe28a);
        o.setScale(440 / o.width);
        const g = this.add.image(x, y - 6, 'presente-dourado').setOrigin(0.5, 1).setDepth(4);
        g.setScale(120 / g.width);
        if (g.preFX) g.preFX.addGlow(0xffd54a, 8, 0, false, 0.1, 16);
        this.tweens.add({ targets: g, angle: { from: -6, to: 6 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.add.text(x, y - 150, '🏁', { fontSize: '56px' }).setOrigin(0.5).setDepth(4);
        this.platforms.push({ o, x, y, hw: 190, kind: 'goal' });
      }

      win() {
        this.over = true;
        const L = this.lili;
        if (this.music) this.music.stop();
        B.play(this, 'win', { volume: 0.7 }); B.play(this, 'confetti', { volume: 0.6 });
        for (let i = 0; i < 4; i++) this.time.delayedCall(i * 250, () => this.sparks.explode(25, L.x + Phaser.Math.Between(-120, 120), L.y - 80));
        this.tweens.add({ targets: L, y: L.y - 70, duration: 300, yoyo: true, repeat: 2, ease: 'Sine.out' });
        const t = this.add.text(W / 2, H / 2 - 40, '🏆', { fontSize: '140px' }).setOrigin(0.5).setScrollFactor(0).setDepth(130).setScale(0);
        this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out' });
        this.meter.setText(GOAL + ' / ' + GOAL + ' m');
        this.time.delayedCall(2600, () => this.api.end({ score: `🏆 🎁 ${this.got}` }));
      }

      spawnCloud() {
        const y = this.nextY, m = (this.startY - y) / PX;
        if (m >= GOAL) return this.spawnGoal();
        // Platzwolken nie zwei hintereinander und nur nach kleinem Abstand: ist sie weg, muss die Lücke darüber mit einem einfachen Sprung schaffbar sein
        const puffOk = m > 120 && this.lastKind !== 'puff' && this.lastStep <= 190;
        const kind = puffOk && Math.random() < 0.2 ? 'puff' : m > 50 && Math.random() < 0.3 ? 'move' : 'cloud';
        // seitlicher Abstand muss schaffbar bleiben: gut 400 px gehen (Finger auf der Wolke, etwas spät reagiert),
        // wandernde Wolken pendeln ±AMP um ihren Platz, das geht vom Abstand ab (von beiden Wolken)
        const AMP = 110, amp = kind === 'move' ? AMP : 0;
        const maxDx = Math.max(140, 340 - this.lastAmp - amp);
        let x = Phaser.Math.Clamp(this.lastX + Phaser.Math.Between(-maxDx, maxDx), 110 + amp, W - 110 - amp);
        if (this.lastKind === 'puff') x = Phaser.Math.Clamp(x, this.solidX - 260 + amp, this.solidX + 260 - amp); // auch ohne die Platzwolke seitlich erreichbar
        const width = kind === 'puff' ? 140 : 190 - Math.min(50, m / 6);
        const o = this.add.image(x, y, 'nuvem').setOrigin(0.5, 0.3).setDepth(3);
        o.setScale(width / o.width);
        if (kind === 'puff') o.setAlpha(0.6);
        const pl = { o, x, y, hw: width * 0.42, kind, home: x, amp, t: Math.random() * 6.3,
          w: amp ? (60 + Math.min(60, m / 3)) / AMP : 0 }; // Pendeltempo (höchstens gut 100 px/s)
        this.platforms.push(pl);

        this.cloudN++;
        if (this.cloudN % 8 === 0) this.addGift(x, y - 150, true, null);
        else if (kind !== 'puff' && Math.random() < 0.45) this.addGift(x, y - 48, false, pl);

        if (m > 30 && Math.random() < Math.min(0.4, 0.15 + m / 900)) {
          let rx = Phaser.Math.Between(90, W - 90);
          if (Math.abs(rx - x) < 220) rx = x < W / 2 ? Math.min(W - 90, x + 280) : Math.max(90, x - 280);
          const r = this.add.image(rx, y - 70, 'nuvem-chuva').setDepth(5);
          r.setScale(120 / r.width);
          this.tweens.add({ targets: r, x: rx + Phaser.Math.Between(-70, 70), duration: 1800 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          this.rains.push(r);
        }
        let step = Phaser.Math.Between(110, 150) + Math.min(80, m / 3); // höchstens 230 px, Lili schafft gut 300
        if (kind === 'puff') step = Math.max(80, Math.min(step, 280 - this.lastStep)); // Lücke unter + über der Platzwolke zusammen höchstens 280 px
        if (kind !== 'puff') this.solidX = x;
        this.lastX = x; this.lastAmp = amp; this.lastKind = kind; this.lastStep = step;
        this.nextY -= step;
      }

      // Doppeltippen in der Luft = Extrasprung mit Kunststück (einmal pro Sprung)
      tap() {
        const now = this.time.now, quick = now - this.lastTap < 330;
        this.lastTap = now;
        if (!quick || this.trickUsed || this.over || now < this.freezeUntil) return;
        this.trickUsed = true; this.lastTap = 0;
        const L = this.lili, sc = this.sc;
        this.vy = Math.min(this.vy, -JUMP * 1.05);
        B.play(this, 'whoosh', { volume: 0.6 }); B.play(this, 'boing', { volume: 0.35 });
        this.sparks.explode(12, L.x, L.y - 55);
        this.tweens.killTweensOf(L); L.setScale(sc).setAngle(0);
        const kind = Phaser.Utils.Array.GetRandom(['salto', 'pirueta', 'mola']);
        this.trickUntil = now + 800;
        const done = () => { L.setScale(sc).setAngle(0); this.trickUntil = 0; };
        if (kind === 'salto') { // Salto in Flugrichtung
          this.tweens.add({ targets: L, angle: this.vx < 0 ? -360 : 360, duration: 650, ease: 'Cubic.out', onComplete: done });
        } else if (kind === 'pirueta') { // dreht sich um sich selbst
          this.tweens.add({ targets: L, scaleX: -sc, duration: 110, yoyo: true, repeat: 2, ease: 'Sine.inOut', onComplete: done });
        } else { // Gummi-Hüpfer: lang, breit, lang, wackeln
          this.tweens.chain({ targets: L, tweens: [
            { scaleX: sc * 0.65, scaleY: sc * 1.45, duration: 140 },
            { scaleX: sc * 1.45, scaleY: sc * 0.7, duration: 140 },
            { scaleX: sc * 0.85, scaleY: sc * 1.2, duration: 120 },
            { scaleX: sc, scaleY: sc, angle: { from: -15, to: 0 }, duration: 200, ease: 'Back.out' },
          ], onComplete: done });
        }
        const e = { salto: '🤸', pirueta: '🌀', mola: '✨' }[kind];
        const t = this.add.text(L.x, L.y - 140, e, { fontSize: '48px' }).setOrigin(0.5).setDepth(8);
        this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 800, onComplete: () => t.destroy() });
      }

      addGift(x, y, gold, pl) {
        const o = this.add.image(x, y, gold ? 'presente-dourado' : 'presente').setDepth(4);
        o.setScale((gold ? 70 : 54) / o.width);
        if (gold) {
          if (o.preFX) o.preFX.addGlow(0xffd54a, 6, 0, false, 0.1, 12);
          this.tweens.add({ targets: o, angle: { from: -8, to: 8 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
        this.gifts.push({ o, gold, pl, dx: pl ? x - pl.x : 0 });
      }

      bounce(pl) {
        if (pl.kind === 'goal') { this.lili.y = pl.y; return this.win(); }
        const strong = pl.kind === 'tramp';
        if (this.trickUntil) { this.tweens.killTweensOf(this.lili); this.lili.setScale(this.sc).setAngle(0); this.trickUntil = 0; }
        this.trickUsed = false;
        this.lili.y = pl.y; this.vy = -(strong ? TRAMP : JUMP);
        B.play(this, strong ? 'boing' : 'puff', { volume: 0.5 });
        this.tweens.add({ targets: this.lili, scaleX: this.sc * 1.2, scaleY: this.sc * 0.78, duration: 70, yoyo: true });
        this.pearls.explode(strong ? 10 : 5, this.lili.x, pl.y - 10);
        if (pl.kind === 'tramp') this.tweens.add({ targets: pl.o, scaleY: pl.o.scaleX * 0.88, duration: 80, yoyo: true });
        else this.tweens.add({ targets: pl.o, y: pl.o.y + 10, duration: 90, yoyo: true, ease: 'Sine.out' });
        if (pl.kind === 'puff') { // trägt nur einmal
          this.platforms = this.platforms.filter(p => p !== pl);
          this.puffs.explode(14, pl.x, pl.y);
          this.tweens.add({ targets: pl.o, alpha: 0, scale: pl.o.scale * 1.3, duration: 350, onComplete: () => pl.o.destroy() });
        }
      }

      collect(g) {
        this.gifts = this.gifts.filter(x => x !== g);
        this.got += g.gold ? 5 : 1; this.hud.setScore(this.got);
        B.play(this, g.gold ? 'golden' : 'gift', { volume: 0.55 });
        this.sparks.explode(g.gold ? 18 : 9, g.o.x, g.o.y);
        B.plus(this, g.o.x, g.o.y - 20, g.gold ? '+5' : '+1', g.gold ? '#e8a400' : '#e0457b');
        this.tweens.killTweensOf(g.o); g.o.destroy();
        if (g.gold) this.surprise();
      }

      // Goldenes Geschenk: eine Überraschung
      //   🎈 Ballon trägt Lili hoch · ⭐ Stern: Regenwolken zerplatzen · 🧲 Magnet zieht Geschenke an
      //   🫧 Perle = ein Leben zurück · 🎁 Geschenkregen rund um Lili
      surprise() {
        const all = ['balao', 'estrela', 'iman', 'chuva', ...(this.lives < LIVES ? ['perola', 'perola'] : [])].filter(k => k !== this.lastFx);
        const kind = Phaser.Utils.Array.GetRandom(all); this.lastFx = kind;
        const E = { balao: '🎈', estrela: '⭐', iman: '🧲', chuva: '🎁', perola: '🫧' }[kind];
        const SND = { balao: 'turbo', estrela: 'star', iman: 'magnet', chuva: 'confetti', perola: 'bubble' }[kind];
        B.play(this, SND, { volume: 0.6 });
        // großes Symbol springt kurz in die Bildmitte
        const big = this.add.text(W / 2, 170, E, { fontSize: '110px' }).setOrigin(0.5).setScrollFactor(0).setDepth(110).setScale(0);
        this.tweens.add({ targets: big, scale: 1, angle: { from: -20, to: 0 }, duration: 300, ease: 'Back.out' });
        this.tweens.add({ targets: big, alpha: 0, scale: 0.5, y: 120, delay: 1100, duration: 350, onComplete: () => big.destroy() });
        const L = this.lili;
        if (kind === 'perola') {
          const b = this.bubbles[this.lives]; this.lives++;
          if (b) this.tweens.add({ targets: b, alpha: 1, scale: { from: 1.8, to: 1 }, duration: 300, ease: 'Back.out' });
        } else if (kind === 'chuva') {
          for (let i = 0; i < 9; i++) {
            const x = Phaser.Math.Clamp(L.x + (i - 4) * 70, 50, W - 50), y = L.y - 260 - Math.random() * 120;
            this.addGift(x, y, false, null);
            const g = this.gifts[this.gifts.length - 1];
            this.tweens.add({ targets: g.o, y: L.y - 40 - Math.random() * 60, duration: 900 + i * 60, ease: 'Bounce.out' });
          }
        } else {
          if (this.fx && this.fx.kind === 'estrela') L.clearTint();
          this.fx = { kind, until: this.time.now + (kind === 'balao' ? 2600 : kind === 'estrela' ? 7000 : 8000) };
          this.fxIcon.setText(E).setVisible(true);
        }
      }

      // Tapiokaperle (Leben), fest auf dem Bildschirm
      pearl(x, y) {
        const c = this.add.container(x, y).setScrollFactor(0), g = this.add.graphics();
        g.fillStyle(0x4b2470).fillCircle(0, 0, 15).fillStyle(0x8a52c7).fillCircle(-2, -2, 11).fillStyle(0xffffff, 0.75).fillCircle(-5, -6, 4);
        g.lineStyle(2, 0xffffff, 0.9).strokeCircle(0, 0, 15);
        return c.add(g);
      }

      // Leben weg, deutlich sichtbar: „−1“ bei Lili, eine Perle fliegt von dort in die Anzeige und platzt, die Lücke blinkt
      // sx/sy: Stelle auf dem Bildschirm, an der es passiert ist
      hurt(sx, sy, soft) {
        this.lives--;
        this.hurtUntil = this.time.now + 1500;
        if (soft) this.cam.shake(150, 0.006); // Bodenlandung: nur ein kleiner Ruckler, kein roter Blitz
        else { this.cam.shake(260, 0.014); this.cam.flash(220, 255, 90, 90); }
        const minus = this.add.text(sx, sy - 30, '−1', { fontFamily: 'sans-serif', fontSize: '56px', fontStyle: 'bold', color: '#e8364f', stroke: '#ffffff', strokeThickness: 7 })
          .setOrigin(0.5).setScrollFactor(0).setDepth(120);
        this.tweens.add({ targets: minus, y: sy - 110, alpha: 0, delay: 350, duration: 700, onComplete: () => minus.destroy() });
        const b = this.bubbles[this.lives];
        if (b) {
          const fly = this.pearl(sx, sy).setDepth(121).setScale(1.6);
          this.tweens.add({ targets: fly, x: b.x, y: b.y, scale: 1, duration: 600, ease: 'Cubic.inOut', onComplete: () => {
            fly.destroy();
            this.puffs.explode(10, b.x, b.y + this.cam.scrollY);
            B.play(this, 'pop', { volume: 0.6 });
            this.tweens.add({ targets: b, alpha: 0.1, duration: 130, yoyo: true, repeat: 3, onComplete: () => b.setAlpha(0.2) });
          } });
        }
        if (this.lives <= 0) this.finish();
      }

      rained(r) {
        if (this.fx && this.fx.kind === 'estrela') { // mit Stern zerplatzt die Regenwolke einfach
          B.play(this, 'pop', { volume: 0.6 });
          this.sparks.explode(12, r.x, r.y);
          this.rains = this.rains.filter(x => x !== r);
          this.tweens.killTweensOf(r);
          this.tweens.add({ targets: r, alpha: 0, scale: r.scale * 1.6, duration: 250, onComplete: () => r.destroy() });
          return;
        }
        if (this.time.now < this.hurtUntil) return;
        B.play(this, 'rain', { volume: 0.6 });
        this.drops.explode(16, this.lili.x, this.lili.y - 80);
        this.lili.setTint(0x9db8ff);
        this.time.delayedCall(1200, () => this.lili.clearTint());
        this.rains = this.rains.filter(x => x !== r);
        this.tweens.killTweensOf(r);
        this.tweens.add({ targets: r, alpha: 0, y: r.y - 40, duration: 500, onComplete: () => r.destroy() });
        this.hurt(this.lili.x, this.lili.y - 60 - this.cam.scrollY);
      }

      // im Gras gelandet: platt gedrückt, Perle kaputt, dann hüpft Lili aufs nächste Trampolin
      crash() {
        const L = this.lili, sc = this.sc;
        L.y = GROUND; this.vy = 0; this.vx = 0; this.trickUsed = false; this.trickUntil = 0;
        this.tweens.killTweensOf(L); L.setAngle(0);
        B.play(this, 'fall', { volume: 0.5 });
        // „Upsi“ statt platt: kurz stauchen, kleiner Hopser, Kopf wackeln, Sternchen kreisen, Sprechblase „Ups!“
        this.tweens.chain({ targets: L, tweens: [
          { scaleY: sc * 0.8, scaleX: sc * 1.15, duration: 80, ease: 'Quad.out' },
          { scaleY: sc, scaleX: sc, y: GROUND - 30, duration: 160, ease: 'Sine.out' },
          { y: GROUND, duration: 160, ease: 'Sine.in' },
          { angle: { from: -12, to: 12 }, duration: 130, yoyo: true, repeat: 1, ease: 'Sine.inOut' },
          { angle: 0, duration: 80 },
        ] });
        this.puffs.explode(10, L.x, GROUND - 5);
        const head = L.y - L.displayHeight * 0.95;
        const stars = [0, 1, 2].map(i => this.add.text(L.x, head, '⭐', { fontSize: '26px' }).setOrigin(0.5).setDepth(8));
        this.tweens.addCounter({ from: 0, to: Math.PI * 4, duration: 1000, onUpdate: tw => stars.forEach((s, i) => {
          const a = tw.getValue() + i * 2.1; s.setPosition(L.x + Math.cos(a) * 46, head + Math.sin(a) * 12);
        }), onComplete: () => stars.forEach(s => s.destroy()) });
        const ups = this.add.text(L.x + 70, head - 40, 'Ups!', { fontFamily: 'sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#5b2d8a', backgroundColor: '#ffffff', padding: { x: 12, y: 6 } })
          .setOrigin(0.5).setDepth(8).setScale(0);
        this.tweens.add({ targets: ups, scale: 1, duration: 220, ease: 'Back.out', onComplete: () =>
          this.tweens.add({ targets: ups, alpha: 0, delay: 550, duration: 250, onComplete: () => ups.destroy() }) });
        this.shadow.setVisible(false);
        this.hurt(L.x, GROUND - 60 - this.cam.scrollY, true);
        this.freezeUntil = this.time.now + 1500;
        if (this.over) return;
        const t = this.groundTramps.reduce((a, b) => Math.abs(b.x - L.x) < Math.abs(a.x - L.x) ? b : a);
        this.time.delayedCall(1000, () => {
          if (this.over) return;
          L.clearTint(); L.setScale(sc);
          this.tweens.add({ targets: L, x: t.x, duration: 450, ease: 'Sine.inOut' });
          this.tweens.add({ targets: L, y: t.y - 110, duration: 225, yoyo: true, ease: 'Sine.out', onComplete: () => { L.y = t.y; this.bounce(t); } });
        });
      }

      finish() {
        this.over = true;
        if (this.music) this.music.stop();
        B.play(this, this.got >= 10 ? 'win' : 'lose', { volume: 0.6 });
        this.time.delayedCall(1600, () => this.api.end({ score: `🎁 ${this.got} · ${this.best} m` }));
      }

      update(time, delta) {
        if (this.over || time < this.freezeUntil) return; // nach dem Herunterfallen kurz Stillstand
        const dt = Math.min(0.033, delta / 1000), L = this.lili;

        // seitlich: dem Finger folgen, sanft beschleunigen
        let target = this.tx;
        if (window.OLA_DEBUG && window.OLA_LILI_AUTO) { // nur Testseite: zur nächsten Wolke über Lili steuern
          const up = this.platforms.filter(p => p.y < L.y - 20 && p.y > L.y - 330).sort((a, b) => b.y - a.y)[0];
          target = up ? up.x : W / 2;
        }
        if (window.OLA_DEBUG && window.OLA_LILI_GRAS) target = 40; // nur Testseite: absichtlich ins Gras
        if (this.cursors.left.isDown) target = L.x - 200; else if (this.cursors.right.isDown) target = L.x + 200;
        const want = target == null ? 0 : Phaser.Math.Clamp((target - L.x) * 4, -560, 560);
        this.vx += (want - this.vx) * Math.min(1, dt * 8);
        L.x = Phaser.Math.Clamp(L.x + this.vx * dt, 45, W - 45);
        if (!this.trickUntil) L.setAngle(this.vx / 40);

        // wandernde Wolken (Geschenke darauf wandern mit)
        for (const pl of this.platforms) if (pl.amp) {
          pl.t += dt * pl.w;
          pl.x = pl.home + pl.amp * Math.sin(pl.t);
          pl.o.x = pl.x;
        }
        for (const g of this.gifts) if (g.pl) g.o.x = g.pl.x + g.dx;

        // hoch und runter; landen nur von oben
        const prevY = L.y;
        this.vy += G * dt;
        // Überraschungen, die eine Weile wirken
        const fx = this.fx;
        if (fx && time > fx.until) { if (fx.kind === 'estrela') L.clearTint(); this.fx = null; this.fxIcon.setVisible(false); }
        else if (fx) {
          if (fx.kind === 'balao') this.vy = Math.min(this.vy, -650); // Ballon zieht nach oben
          if (fx.kind === 'estrela') L.setTint(Phaser.Display.Color.HSVToRGB((time / 600) % 1, 0.35, 1).color);
          if (fx.kind === 'iman') for (const g of this.gifts) {
            const dx = L.x - g.o.x, dy2 = L.y - 55 - g.o.y, d = Math.hypot(dx, dy2);
            if (d < 420 && d > 1) { g.pl = null; g.o.x += dx / d * 520 * dt; g.o.y += dy2 / d * 520 * dt; }
          }
          this.fxIcon.setPosition(L.x + 50, L.y - 125);
          this.fxIcon.setAlpha(fx.until - time < 1500 ? 0.4 + 0.6 * Math.abs(Math.sin(time / 90)) : 1); // blinkt kurz vor Schluss
        }
        this.vy = Math.min(this.vy, 1400); // tiefe Stürze schnell, aber sichtbar
        L.y += this.vy * dt;
        if (this.vy > 0) {
          const pl = this.platforms.find(p => prevY <= p.y + 4 && L.y >= p.y && Math.abs(L.x - p.x) < p.hw + 18);
          if (pl) this.bounce(pl);
          else if (L.y >= GROUND) this.crash();
        }

        // Kamera zieht nach oben mit, beim Fallen nach unten
        const ty = L.y - H * 0.42;
        if (ty < this.cam.scrollY) this.cam.scrollY += (ty - this.cam.scrollY) * Math.min(1, dt * 5);
        else if (this.vy > 0 && L.y > this.cam.scrollY + H * 0.75) this.cam.scrollY = Math.min(GROUND + 60 - H, this.cam.scrollY + (L.y - H * 0.75 - this.cam.scrollY) * Math.min(1, dt * 10));
        const dy = this.cam.scrollY - this.lastScroll; this.lastScroll = this.cam.scrollY;
        this.fill();

        // Höhe, Himmel, ferne Wolken
        const m = Math.max(0, Math.round((this.startY - L.y) / PX));
        if (m > this.best) { this.best = Math.min(m, GOAL); this.meter.setText(this.best + ' / ' + GOAL + ' m'); }
        const camM = (this.startY - this.cam.scrollY - H / 2) / PX;
        this.cam.setBackgroundColor(skyAt(camM));
        const night = Phaser.Math.Clamp((camM - 110) / 40, 0, 1);
        this.stars.setAlpha(night);
        for (const f of this.far) {
          f.y -= dy * 0.3; f.setAlpha(0.22 * (1 - night * 0.7));
          if (f.y > H + 60) { f.y -= H + 140; f.x = Math.random() * W; }
          if (f.y < -80) { f.y += H + 140; f.x = Math.random() * W; }
        }

        // Geschenke und Regenwolken berühren (Mitte von Lili)
        const cx = L.x, cy = L.y - 55;
        const g = this.gifts.find(gg => Math.hypot(gg.o.x - cx, gg.o.y - cy) < (gg.gold ? 70 : 58));
        if (g) this.collect(g);
        const r = this.rains.find(rr => Math.hypot(rr.x - cx, rr.y - cy) < 62);
        if (r) this.rained(r);
        if (this.over) return;

        // Schatten am Boden: grün über einem Trampolin, rot über dem Gras
        const dist = GROUND - L.y, onT = this.groundTramps.some(t => Math.abs(t.x - L.x) < t.hw + 18);
        const show = dist > 30 && GROUND < this.cam.scrollY + H;
        this.shadow.setVisible(show);
        if (show) {
          const k = Phaser.Math.Clamp(1 - dist / 600, 0.35, 1);
          this.shadow.setPosition(L.x, GROUND - 2).setScale(k).setFillStyle(onT ? 0x2fae4e : 0xe8364f, 0.25 + 0.45 * k);
        }
      }
    };
  }
})();
