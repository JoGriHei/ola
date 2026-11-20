// A lontra mergulha (Phaser-Fassung): Ein Seeotter taucht durchs große Becken des Oceanário.
// Der Otter folgt dem Finger. Muscheln und Seesterne sammeln, Quallen ausweichen.
// Die Luftanzeige sinkt unter Wasser; an der Wasseroberfläche füllt sie sich wieder. 3 Leben.
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.lontra = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#1d5fa8' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H, SURF = 70, FLOOR = H - 40;

    return class Dive extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        this.load.image('bg', B.sprite(api, 'fundo-oceano'));
        ['medusa', 'concha', 'estrela'].forEach(k => this.load.image(k, B.sprite(api, k)));
        for (let i = 1; i <= 3; i++) this.load.image('otter' + i, `bilder/spiele/lontra-${i}.webp`);
        ['bubble', 'splash', 'breath', 'zap', 'win', 'lose', 'music-oceano'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        this.api = this.registry.get('api');
        this.got = 0; this.lives = 3; this.air = 1; this.t = 0; this.over = false; this.hurtUntil = 0; this.wasUp = false;
        this.speed = 130; this.nextBad = 1.8; this.nextGood = 0.6;
        B.particles(this);
        const img = B.seamless(this, 'bg', 'bgseam'), sc = H / img.height;
        this.bg = this.add.tileSprite(0, 0, W / sc, img.height, 'bgseam').setOrigin(0).setScale(sc);
        // Luft über dem Wasser und Wellenlinie
        this.sky = this.add.rectangle(0, 0, W, SURF - 8, 0xdcf0ff).setOrigin(0).setDepth(2);
        this.wave = this.add.graphics().setDepth(3);

        this.anims.create({ key: 'swim', frames: [1, 2, 3, 2].map(i => ({ key: 'otter' + i })), frameRate: 8, repeat: -1 });
        this.otter = this.add.sprite(W * 0.25, 220, 'otter1').setScale(0.5).setDepth(6).play('swim');
        this.ty = 220;
        this.trail = this.add.particles(0, 0, 'bubble', { speed: { min: 20, max: 60 }, angle: { min: 240, max: 300 }, scale: { start: 0.8, end: 0.2 }, alpha: { start: 0.9, end: 0 }, lifespan: 1400, frequency: 220, follow: this.otter, followOffset: { x: 50, y: -10 } }).setDepth(5);
        this.pops = this.add.particles(0, 0, 'bubble', { speed: { min: 60, max: 200 }, scale: { start: 1.4, end: 0 }, lifespan: 600, emitting: false }).setDepth(7);
        this.sparks = this.add.particles(0, 0, 'star', { speed: { min: 80, max: 220 }, scale: { start: 1, end: 0 }, lifespan: 600, emitting: false }).setDepth(7);

        this.things = [];
        this.hud = B.hud(this, 'concha', 3);
        // Luftanzeige
        this.airBg = this.add.rectangle(W / 2 - 110, 30, 220, 18, 0x0f1f4d, 0.25).setOrigin(0, 0.5).setDepth(100);
        this.airBar = this.add.rectangle(W / 2 - 110, 30, 220, 18, 0x3fb6ff).setOrigin(0, 0.5).setDepth(100);
        this.add.text(W / 2 + 118, 30, '🫧', { fontSize: '28px' }).setOrigin(0, 0.5).setDepth(100);
        this.up = this.add.text(0, 0, '⬆️', { fontSize: '48px' }).setOrigin(0.5).setDepth(8).setVisible(false);
        this.tweens.add({ targets: this.up, alpha: 0.3, duration: 300, yoyo: true, repeat: -1 });

        const aim = p => { this.ty = Phaser.Math.Clamp(p.y, SURF - 30, FLOOR - 20); };
        this.input.on('pointerdown', aim);
        this.input.on('pointermove', p => { if (p.isDown || p.wasTouch) aim(p); });
        this.cursors = this.input.keyboard.createCursorKeys();

        if (this.cache.audio.exists('music-oceano')) { this.music = this.sound.add('music-oceano', { loop: true, volume: 0.35 }); this.music.play(); }
      }

      spawnBad() {
        const y = SURF + 60 + Math.random() * (FLOOR - SURF - 100);
        const m = this.add.image(W + 60, y, 'medusa').setScale(0.36).setDepth(4);
        this.tweens.add({ targets: m, scaleY: 0.3, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); // pulsieren
        this.tweens.add({ targets: m, y: y - 30, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.things.push({ o: m, bad: true, r: 40 });
      }

      spawnGood() {
        const k = Math.random() < 0.5 ? 'concha' : 'estrela', y0 = SURF + 50 + Math.random() * (FLOOR - SURF - 90), n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const o = this.add.image(W + 40 + i * 62, y0 + Math.sin(i) * 20, k).setScale(0.22).setDepth(4);
          if (o.preFX) o.preFX.addGlow(0xfff2a8, 5, 0, false, 0.1, 10);
          if (k === 'estrela') this.tweens.add({ targets: o, angle: 360, duration: 3000, repeat: -1 });
          this.things.push({ o, bad: false, r: 34 });
        }
      }

      hit() {
        if (this.time.now < this.hurtUntil || this.over) return;
        this.lives--; this.hud.setLives(this.lives); this.hurtUntil = this.time.now + 1500;
        B.play(this, 'zap', { volume: 0.6 });
        this.cameras.main.shake(200, 0.01); this.cameras.main.flash(150, 255, 150, 200);
        this.tweens.add({ targets: this.otter, alpha: 0.3, duration: 100, yoyo: true, repeat: 6, onComplete: () => this.otter.setAlpha(1) });
        if (this.lives <= 0) this.finish();
      }

      finish() {
        this.over = true;
        if (this.music) this.music.stop();
        B.play(this, this.got >= 20 ? 'win' : 'lose', { volume: 0.6 });
        this.otter.anims.stop(); this.trail.stop();
        this.time.delayedCall(1600, () => this.api.end({ score: `🐚 ${this.got}` }));
      }

      update(time, delta) {
        if (this.over) return;
        const dt = Math.min(0.05, delta / 1000);
        this.t += dt; this.speed = Math.min(280, 130 + this.t * 2.5);
        if (this.cursors.up.isDown) this.ty = Math.max(SURF - 30, this.ty - 300 * dt);
        if (this.cursors.down.isDown) this.ty = Math.min(FLOOR - 20, this.ty + 300 * dt);
        const o = this.otter, prevY = o.y;
        o.y += (this.ty - o.y) * Math.min(1, dt * 5);
        o.setRotation(Phaser.Math.Clamp((o.y - prevY) / (dt * 600), -0.5, 0.5));
        this.bg.tilePositionX += this.speed * 0.4 * dt / this.bg.scaleX;

        // Luft: oben auffüllen, unten langsam verbrauchen
        const isUp = o.y < SURF + 4;
        if (isUp && !this.wasUp) { B.play(this, 'splash', { volume: 0.5 }); if (this.air < 0.7) B.play(this, 'breath', { volume: 0.5 }); this.pops.explode(10, o.x, SURF - 6); }
        this.wasUp = isUp;
        this.air = isUp ? Math.min(1, this.air + dt * 0.8) : this.air - dt / 16;
        if (this.air <= 0) { this.air = 1; this.hit(); }
        this.airBar.width = 220 * Math.max(0, this.air);
        this.airBar.fillColor = this.air < 0.3 ? 0xe84a4a : 0x3fb6ff;
        this.up.setVisible(this.air < 0.3).setPosition(o.x, o.y - 80);

        this.nextBad -= dt; this.nextGood -= dt;
        if (this.nextBad <= 0) { this.spawnBad(); this.nextBad = Math.max(0.9, 2.2 - this.t / 80) + Math.random(); }
        if (this.nextGood <= 0) { this.spawnGood(); this.nextGood = 1.5 + Math.random() * 1.4; }
        this.things = this.things.filter(th => {
          th.o.x -= this.speed * dt * (th.bad ? 1.1 : 1);
          if (Math.hypot(th.o.x - o.x, th.o.y - o.y) < th.r + 36) {
            if (th.bad) { this.hit(); this.tweens.add({ targets: th.o, alpha: 0, scale: 0.5, duration: 300, onComplete: () => th.o.destroy() }); return false; }
            this.got++; this.hud.setScore(this.got); B.play(this, 'bubble', { volume: 0.5 });
            this.sparks.explode(8, th.o.x, th.o.y); B.plus(this, th.o.x, th.o.y - 20, '+1', '#ffd34d');
            th.o.destroy(); return false;
          }
          if (th.o.x < -80) { th.o.destroy(); return false; }
          return true;
        });

        // Wellen an der Oberfläche
        this.wave.clear().lineStyle(5, 0xffffff, 1).beginPath();
        for (let x = 0; x <= W; x += 8) { const y = SURF - 8 + Math.sin((x + this.t * 120) / 32) * 5; x ? this.wave.lineTo(x, y) : this.wave.moveTo(x, y); }
        this.wave.strokePath();
      }
    };
  }
})();
