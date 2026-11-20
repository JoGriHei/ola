// Pipo corre (Phaser-Fassung): Jump and Run durch Lissabon.
// Antippen = springen (länger halten = höher), in der Luft nochmal tippen = Doppelsprung mit Salto.
// Goldene Sardinen fangen, über Blumentöpfe und Möwen springen. 3 Leben, das Tempo steigt langsam.
// Phaser liegt lokal in vendor/phaser.min.js, Geräusche (ElevenLabs) in audio/sfx/.
(() => {
  const loadPhaser = () => window.Phaser ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'vendor/phaser.min.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });

  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.corre = {
    start(el, api) {
      let game = null, alive = true;
      // feste 16:9-Fläche, so groß wie Breite und Bildschirmhöhe es erlauben
      const h = Math.min(window.innerHeight * 0.74, el.clientWidth * 9 / 16), w = h * 16 / 9;
      el.innerHTML = `<div id="corre-game" style="width:${w}px;height:${h}px;margin:0 auto;border-radius:16px;overflow:hidden;touch-action:none"></div>`;
      loadPhaser().then(() => { if (alive) game = make(el.querySelector('#corre-game'), api); })
        .catch(() => { el.innerHTML = '<p class="ask">⚠️</p>'; });
      return () => { alive = false; if (game) game.destroy(true); };
    },
  };

  function make(parent, api) {
    const Phaser = window.Phaser;
    const W = 960, H = 540, GROUND = 460;
    const SPR = id => api.sprite(id) || `bilder/spiele/${id}.webp`;
    const SFX = ['bark', 'collect', 'jump', 'land', 'hit', 'gull', 'win', 'lose', 'music-corre'];

    class Run extends Phaser.Scene {
      preload() {
        this.load.image('bg', SPR('fundo-rua'));
        for (let i = 1; i <= 4; i++) this.load.image('pipo' + i, `bilder/spiele/pipo-corre-${i}.webp`);
        ['gaivota', 'vaso', 'sardinha'].forEach(k => this.load.image(k, SPR(k)));
        SFX.forEach(k => this.load.audio(k, `audio/sfx/${k}.mp3`));
      }

      create() {
        if (window.OLA_DEBUG) window.OLA_DEBUG('create');
        this.speed = 330; this.lives = 3; this.got = 0; this.t = 0; this.over = false; this.hurtUntil = 0; this.jumps = 0; this.holding = false; this.holdT = 0; this.wasAir = false;

        // Hintergrund nahtlos: Bild und Spiegelbild nebeneinander als eine Kachel
        const bgImg = this.textures.get('bg').getSourceImage();
        const bh = GROUND + 8, scale = bh / bgImg.height, tw = bgImg.width * 2;
        const ct = this.textures.createCanvas('bgseam', tw, bgImg.height), c = ct.getContext();
        c.drawImage(bgImg, 0, 0); c.save(); c.translate(tw, 0); c.scale(-1, 1); c.drawImage(bgImg, 0, 0); c.restore(); ct.refresh();
        this.bg = this.add.tileSprite(0, 0, W / scale, bgImg.height, 'bgseam').setOrigin(0).setScale(scale);

        // Calçada als Kachel (helle Steine, dunkle Wellen)
        const g = this.make.graphics({ add: false });
        g.fillStyle(0xefe6d2).fillRect(0, 0, 160, 90);
        g.lineStyle(7, 0x3b3b3b);
        for (const yy of [24, 58]) { g.beginPath(); for (let x = 0; x <= 160; x += 4) { const y = yy + Math.sin(x / 160 * Math.PI * 2) * 8; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokePath(); }
        g.generateTexture('calcada', 160, 90); g.destroy();
        this.ground = this.add.tileSprite(0, GROUND, W, H - GROUND, 'calcada').setOrigin(0);
        const floor = this.add.rectangle(W / 2, GROUND + 40, W * 2, 80).setVisible(false);
        this.physics.add.existing(floor, true);

        // kleine Texturen für Partikel
        const p = this.make.graphics({ add: false });
        p.fillStyle(0xffffff).fillCircle(8, 8, 8); p.generateTexture('dot', 16, 16); p.clear();
        p.fillStyle(0xffe066); p.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, a = i * Math.PI / 5 - Math.PI / 2; p.lineTo(10 + Math.cos(a) * r, 10 + Math.sin(a) * r); } p.closePath(); p.fillPath();
        p.generateTexture('star', 20, 20); p.destroy();
        this.dust = this.add.particles(0, 0, 'dot', { speed: { min: 40, max: 140 }, angle: { min: 200, max: 340 }, scale: { start: 0.9, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: 0xd9cdb4, lifespan: 450, emitting: false });
        this.sparks = this.add.particles(0, 0, 'star', { speed: { min: 80, max: 260 }, scale: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, lifespan: 600, emitting: false });

        // Pipo mit Laufzyklus (das Bild schaut nach links, also spiegeln)
        this.anims.create({ key: 'run', frames: [1, 2, 3, 4].map(i => ({ key: 'pipo' + i })), frameRate: 12, repeat: -1 });
        this.pipo = this.physics.add.sprite(210, GROUND - 70, 'pipo1').setFlipX(true).setScale(0.62).setDepth(5);
        this.pipo.body.setSize(150, 120).setOffset(60, 110);
        this.pipo.play('run');
        this.physics.add.collider(this.pipo, floor);

        this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
        this.fishes = this.physics.add.group({ allowGravity: false });
        this.physics.add.overlap(this.pipo, this.obstacles, (pp, o) => this.hit(o));
        this.physics.add.overlap(this.pipo, this.fishes, (pp, f) => this.collect(f));

        // Anzeige
        this.hearts = this.add.text(18, 14, '', { fontSize: '40px' }).setDepth(10);
        this.fishIcon = this.add.image(W - 120, 40, 'sardinha').setScale(0.3).setDepth(10);
        this.score = this.add.text(W - 22, 40, '0', { fontFamily: 'sans-serif', fontSize: '42px', fontStyle: 'bold', color: '#0f1f4d', stroke: '#ffffff', strokeThickness: 6 }).setOrigin(1, 0.5).setDepth(10);
        this.drawHearts();

        // Steuerung: Finger halten = höher springen
        this.input.on('pointerdown', () => this.jump());
        this.input.on('pointerup', () => { this.holding = false; });
        this.input.keyboard.on('keydown-SPACE', () => this.jump());
        this.input.keyboard.on('keyup-SPACE', () => { this.holding = false; });

        this.music = this.sound.add('music-corre', { loop: true, volume: 0.3 });
        this.music.play();
        this.nextObstacle = 2.6; this.nextFish = 1.0;
      }

      drawHearts() { this.hearts.setText('❤️'.repeat(Math.max(0, this.lives)) + '🤍'.repeat(Math.max(0, 3 - this.lives))); }

      jump() {
        if (this.over) return;
        const onGround = this.pipo.body.blocked.down;
        if (onGround) {
          this.pipo.setVelocityY(-760); this.jumps = 1; this.holding = true; this.holdT = 0;
          this.sound.play('jump', { volume: 0.5 });
          this.tweens.add({ targets: this.pipo, scaleX: 0.55, scaleY: 0.7, duration: 90, yoyo: true });
        } else if (this.jumps < 2) {
          this.pipo.setVelocityY(-700); this.jumps = 2; this.holding = false;
          this.sound.play('bark', { volume: 0.6 });
          this.tweens.add({ targets: this.pipo, angle: 360, duration: 450, onComplete: () => this.pipo.setAngle(0) });
        }
      }

      spawnObstacle() {
        if (Math.random() < 0.55) {
          const o = this.obstacles.create(W + 80, GROUND - 52, 'vaso').setScale(0.42).setDepth(4);
          o.body.setSize(150, 170).setOffset(53, 70);
        } else {
          const o = this.obstacles.create(W + 80, GROUND - 78, 'gaivota').setScale(0.42).setDepth(4);
          o.body.setSize(170, 90).setOffset(43, 90); o.fly = true;
          this.tweens.add({ targets: o, scaleY: 0.32, duration: 160, yoyo: true, repeat: -1 }); // Flügelschlag
          if (Math.random() < 0.6) this.sound.play('gull', { volume: 0.35 });
        }
      }

      spawnFish() {
        const n = 3 + Math.floor(Math.random() * 3), arc = Math.random() < 0.6;
        for (let i = 0; i < n; i++) {
          const y = arc ? GROUND - 110 - Math.sin(i / (n - 1) * Math.PI) * 150 : GROUND - 75;
          const f = this.fishes.create(W + 60 + i * 64, y, 'sardinha').setScale(0.24).setDepth(4);
          f.body.setCircle(70, 58, 58);
          if (f.preFX) f.preFX.addGlow(0xffd54a, 6, 0, false, 0.1, 12); // goldener Schein (WebGL)
          this.tweens.add({ targets: f, y: y - 10, duration: 500 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
      }

      collect(f) {
        if (!f.active) return;
        this.got++; this.score.setText(String(this.got));
        this.sound.play('collect', { volume: 0.45 });
        this.sparks.explode(10, f.x, f.y);
        const t = this.add.text(f.x, f.y - 20, '+1', { fontFamily: 'sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#e8a400', stroke: '#fff', strokeThickness: 5 }).setOrigin(0.5).setDepth(9);
        this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 700, onComplete: () => t.destroy() });
        this.tweens.add({ targets: this.score, scale: 1.3, duration: 100, yoyo: true });
        this.tweens.add({ targets: this.fishIcon, scale: 0.4, duration: 100, yoyo: true });
        f.destroy();
      }

      hit(o) {
        if (this.over || this.time.now < this.hurtUntil) return;
        this.lives--; this.drawHearts();
        this.hurtUntil = this.time.now + 1400;
        this.sound.play('hit', { volume: 0.6 });
        this.cameras.main.shake(220, 0.012);
        this.cameras.main.flash(180, 255, 80, 80);
        this.tweens.add({ targets: this.pipo, alpha: 0.25, duration: 100, yoyo: true, repeat: 6, onComplete: () => this.pipo.setAlpha(1) });
        this.tweens.add({ targets: o, alpha: 0, angle: 40, y: o.y - 60, duration: 400, onComplete: () => o.destroy() });
        if (this.lives <= 0) this.finish();
      }

      finish() {
        this.over = true;
        this.music.stop();
        this.sound.play(this.got >= 20 ? 'win' : 'lose', { volume: 0.6 });
        this.pipo.anims.stop();
        this.physics.pause();
        this.time.delayedCall(1600, () => api.end({ score: `🐟 ${this.got} · ${Math.round(this.t * this.speed / 100)} m` }));
      }

      update(time, delta) {
        if (this.over) return;
        const dt = Math.min(0.05, delta / 1000);
        this.t += dt;
        this.speed = Math.min(720, 330 + this.t * 7);
        this.bg.tilePositionX += this.speed * 0.25 * dt / this.bg.scaleX;
        this.ground.tilePositionX += this.speed * dt;

        // höher springen, solange der Finger bleibt (höchstens 0,22 s)
        if (this.holding && this.jumps === 1 && this.holdT < 0.22 && this.pipo.body.velocity.y < 0) { this.holdT += dt; this.pipo.body.velocity.y -= 2600 * dt; }
        const air = !this.pipo.body.blocked.down;
        if (air) { this.pipo.anims.pause(); this.pipo.setTexture(this.pipo.body.velocity.y < 0 ? 'pipo1' : 'pipo2'); }
        else {
          if (this.wasAir) { // Landung: Staub, Ton, kurz zusammendrücken
            this.dust.explode(12, this.pipo.x - 10, GROUND - 4);
            this.sound.play('land', { volume: 0.35 });
            this.tweens.add({ targets: this.pipo, scaleY: 0.52, scaleX: 0.7, duration: 80, yoyo: true });
            this.jumps = 0; this.pipo.anims.resume();
          }
          this.pipo.anims.timeScale = this.speed / 400;
        }
        this.wasAir = air;

        this.nextObstacle -= dt; this.nextFish -= dt;
        if (this.nextObstacle <= 0) { this.spawnObstacle(); this.nextObstacle = Math.max(0.85, 2.1 - this.t / 60) + Math.random() * 0.9; }
        if (this.nextFish <= 0) { this.spawnFish(); this.nextFish = 1.8 + Math.random() * 1.6; }
        // alles läuft mit dem Tempo nach links; was links raus ist, wird danach entfernt
        const gone = [];
        for (const grp of [this.obstacles, this.fishes]) grp.getChildren().forEach(o => {
          o.body.velocity.x = -this.speed * (o.fly ? 1.2 : 1);
          if (o.x < -120) gone.push(o);
        });
        gone.forEach(o => o.destroy());
      }
    }

    return new Phaser.Game({
      type: window.OLA_PHASER_CANVAS ? Phaser.CANVAS : Phaser.AUTO, // CANVAS nur für automatische Tests
      parent, backgroundColor: '#bfe3ff',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
      physics: { default: 'arcade', arcade: { gravity: { y: 2200 }, debug: false } },
      input: { activePointers: 2 },
      audio: window.OLA_PHASER_CANVAS ? { noAudio: true } : { context: window.OLA_PHASER && window.OLA_PHASER.audioCtx ? window.OLA_PHASER.audioCtx() : undefined }, // gemeinsamer AudioContext (iPad)
      scene: Run,
    });
  }
})();
