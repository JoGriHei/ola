// Onde está o Pandi? (Phaser-Fassung): großes Suchbild aus drei Lissabonner Wimmelbildern nebeneinander
// (Platz auf dem Hügel, Promenade am Tejo, Park), an den Übergängen stehen große Jacarandás.
// Pandi schaut an 12 von 35 Stellen (keine unter den Baumkronen an den Übergängen) hinter etwas hervor (nur Ohren und Augen), jede Runde anders.
// Ziehen = durchs Bild wandern, Antippen = gefunden: Pandi springt heraus, dreht sich, Konfetti, fliegt in die Leiste.
// 💡 fährt zum nächsten versteckten Pandi.
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.esconde = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#bfe3ff' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  // Verstecke je Bild: [x, y] als Anteil von Breite/Höhe, y = Oberkante der verdeckenden Sache
  const PANELS = [
    { key: 'esconde-quadro', spots: [
      [0.48, 0.755], [0.62, 0.76], [0.88, 0.72], [0.15, 0.44], [0.27, 0.525], [0.52, 0.585],
      [0.72, 0.655], [0.40, 0.535], [0.68, 0.525], [0.21, 0.545], [0.155, 0.165], [0.61, 0.135],
      [0.34, 0.625], [0.84, 0.66], [0.03, 0.82], [0.17, 0.785], [0.765, 0.65]] },
    { key: 'esconde-quadro-2', spots: [
      [0.18, 0.785], [0.53, 0.525], [0.645, 0.745], [0.92, 0.735], [0.57, 0.585], [0.80, 0.525],
      [0.73, 0.605], [0.56, 0.405]] },
    { key: 'esconde-quadro-3', spots: [
      [0.33, 0.555], [0.33, 0.90], [0.47, 0.42], [0.69, 0.41], [0.545, 0.83], [0.815, 0.85],
      [0.88, 0.62], [0.27, 0.47], [0.92, 0.52], [0.66, 0.56]] },
  ];
  const FIND = 12, SIZE = 0.065, VISIBLE = 0.45; // Pandagröße (Anteil der Bildhöhe), sichtbarer Anteil

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H;

    return class Search extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        PANELS.forEach(p => this.load.image(p.key, B.sprite(api, p.key)));
        this.load.image('panda', B.sprite(api, 'pandi-espreita'));
        this.load.image('tree', B.sprite(api, 'arvore-jacaranda'));
        ['pandi-found', 'confetti', 'win', 'music-esconde'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        this.api = this.registry.get('api'); this.found = 0; this.over = false;
        B.particles(this);
        // drei Bilder nebeneinander, gleich hoch, etwas höher als der Bildschirm
        const PH = H * 1.25;
        let x0 = 0;
        const placed = PANELS.map(p => {
          const im = this.add.image(x0, 0, p.key).setOrigin(0);
          const s = PH / im.height; im.setScale(s);
          const r = { ...p, x0, s, w: im.displayWidth };
          x0 += im.displayWidth;
          return r;
        });
        const PW = x0;
        this.cameras.main.setBounds(0, 0, PW, PH);

        // Pandas: zufällige Verstecke aus allen drei Bildern; Unterteil wird von einem Stück desselben Bildes verdeckt
        const tex = this.textures.get('panda').getSourceImage(), size = PH * SIZE / tex.height;
        const all = placed.flatMap(p => p.spots.map(([fx, fy]) => ({ p, fx, fy })));
        this.pandas = Phaser.Utils.Array.Shuffle(all).slice(0, FIND).map(({ p, fx, fy }) => {
          const ph = tex.height * size, pw = tex.width * size, ex = p.x0 + fx * p.w, ey = fy * PH;
          const pd = this.add.image(ex, ey + ph * (1 - VISIBLE), 'panda').setOrigin(0.5, 1).setScale(size).setFlipX(Math.random() < 0.5).setDepth(1);
          this.add.image(p.x0, 0, p.key).setOrigin(0).setScale(p.s).setDepth(2)
            .setCrop((ex - p.x0 - pw) / p.s, ey / p.s, (pw * 2) / p.s, (ph * (1 - VISIBLE) + 4) / p.s);
          pd.found = false;
          this.tweens.add({ targets: pd, angle: { from: -4, to: 4 }, duration: 1400 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * 1000 });
          return pd;
        });

        // große Jacarandás über den Übergängen zwischen den Bildern
        for (const p of placed.slice(1)) {
          const t = this.add.image(p.x0, PH + 10, 'tree').setOrigin(0.5, 1).setDepth(5);
          t.setScale(PH * 0.95 / t.height);
        }

        // Leiste oben: 12 Plätze, gefundene Pandas werden bunt
        this.slots = [];
        for (let i = 0; i < FIND; i++) {
          const x = W / 2 - (FIND - 1) * 30 + i * 60;
          this.add.circle(x, 40, 26, 0xffffff, 0.85).setScrollFactor(0).setDepth(100).setStrokeStyle(3, 0xc9d4ee);
          this.slots.push(this.add.image(x, 42, 'panda').setScale(44 / tex.height).setScrollFactor(0).setDepth(101).setTint(0x999999).setAlpha(0.35));
        }
        const hint = this.add.text(W - 46, H - 46, '💡', { fontSize: '50px' }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
        hint.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.hint(); });

        this.confetti = this.add.particles(0, 0, 'star', { speed: { min: 150, max: 420 }, angle: { min: 200, max: 340 }, gravityY: 500, scale: { start: 1.2, end: 0.3 }, rotate: { min: 0, max: 360 }, lifespan: 1300, tint: [0xff5a5a, 0xffd34d, 0x4cc3ff, 0x6ad66a, 0xc77dff], emitting: false }).setDepth(50);

        // Ziehen zum Bewegen, kurzes Tippen zum Finden
        let start = null;
        this.input.on('pointerdown', p => { start = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY, moved: false }; this.tweens.killTweensOf(this.cameras.main); });
        this.input.on('pointermove', p => {
          if (!start || !p.isDown) return;
          const dx = p.x - start.x, dy = p.y - start.y;
          if (Math.abs(dx) + Math.abs(dy) > 12) start.moved = true;
          this.cameras.main.setScroll(start.sx - dx, start.sy - dy);
        });
        this.input.on('pointerup', p => { if (start && !start.moved) this.tapAt(p.worldX, p.worldY); start = null; });

        // am Anfang ein Stück durchs Bild fahren: man kann ziehen
        const cam = this.cameras.main;
        cam.setScroll(0, (PH - H) / 2);
        this.tweens.add({ targets: cam, scrollX: Math.min(PW - W, W * 1.2), duration: 2000, ease: 'Sine.inOut', yoyo: true, delay: 400 });
        if (this.cache.audio.exists('music-esconde')) { this.music = this.sound.add('music-esconde', { loop: true, volume: 0.3 }); this.music.play(); }
      }

      tapAt(x, y) {
        if (this.over) return;
        for (const p of this.pandas) {
          if (p.found) continue;
          const b = p.getBounds();
          Phaser.Geom.Rectangle.Inflate(b, 18, 14); // etwas großzügig für Kinderfinger
          b.height -= p.displayHeight * (1 - VISIBLE); // nur der sichtbare Teil zählt
          if (b.contains(x, y)) return this.foundPanda(p);
        }
      }

      foundPanda(p) {
        p.found = true; this.found++;
        this.tweens.killTweensOf(p); p.setAngle(0).setDepth(20);
        B.play(this, 'pandi-found', { volume: 0.7 }); B.play(this, 'confetti', { volume: 0.5 });
        this.confetti.explode(28, p.x, p.y - p.displayHeight / 2);
        const slot = this.slots[this.found - 1], cam = this.cameras.main;
        this.tweens.chain({ targets: p, tweens: [
          { y: p.y - 170, scale: p.scale * 2.4, angle: 360, duration: 550, ease: 'Back.out' },
          { duration: 250 },
          { x: () => cam.scrollX + slot.x, y: () => cam.scrollY + slot.y + 22, scale: slot.scale, duration: 500, ease: 'Quad.in',
            onComplete: () => { p.destroy(); slot.clearTint().setAlpha(1); this.tweens.add({ targets: slot, scale: slot.scale * 1.4, duration: 150, yoyo: true }); } },
        ] });
        if (this.found >= FIND) {
          this.over = true;
          this.time.delayedCall(1800, () => {
            if (this.music) this.music.stop();
            B.play(this, 'win', { volume: 0.6 });
            this.confetti.explode(60, this.cameras.main.scrollX + W / 2, this.cameras.main.scrollY + H / 3);
            this.time.delayedCall(1800, () => this.api.end({ score: `🐼 ${this.found}` }));
          });
        }
      }

      hint() {
        const p = this.pandas.find(q => !q.found);
        if (!p) return;
        const cam = this.cameras.main, bw = cam.getBounds().width, bh = cam.getBounds().height;
        this.tweens.add({ targets: cam, scrollX: Phaser.Math.Clamp(p.x - W / 2, 0, bw - W), scrollY: Phaser.Math.Clamp(p.y - H / 2, 0, bh - H), duration: 800, ease: 'Sine.inOut',
          onComplete: () => this.tweens.add({ targets: p, scale: p.scale * 1.5, duration: 220, yoyo: true, repeat: 2 }) });
      }
    };
  }
})();
