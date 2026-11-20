// Fotosafari com o Papa (Phaser-Fassung): Meerestiere schwimmen am großen Fenster des Oceanário vorbei.
// Papa nennt ein Tier (eigene Stimme, audio/spiele/papa-<tier>.mp3). Das richtige Tier antippen = Foto:
// Klick, Blitz, das Foto fliegt als Polaroid in Papas Album oben. 8 Fotos, dann ist die Runde vorbei.
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.safari = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#1d5fa8' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  const ANIMALS = [
    ['peixe', 'o peixe'], ['tubarao', 'o tubarão'], ['baleia', 'a baleia'], ['golfinho', 'o golfinho'], ['polvo', 'o polvo'], ['foca', 'a foca'],
    ['lontra', 'a lontra'], ['pinguim', 'o pinguim'], ['caranguejo', 'o caranguejo'], ['lagosta', 'a lagosta'], ['camarao', 'o camarão'], ['lula', 'a lula'], ['peixe-lua', 'o peixe-lua'],
    ['peixe-palhaco', 'o peixe-palhaço'], ['cavalo-marinho', 'o cavalo-marinho'], ['alforreca', 'a alforreca'], ['estrela-do-mar', 'a estrela-do-mar'], ['tartaruga', 'a tartaruga'], ['raia', 'a raia'], ['ourico-do-mar', 'o ouriço-do-mar'], ['moreia', 'a moreia'], ['peixe-balao', 'o peixe-balão'], ['sardinha', 'a sardinha'],
  ];
  const BIG = ['baleia', 'tubarao', 'peixe-lua', 'raia', 'tartaruga'], GOAL = 8;

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H, TOP = 120, BOTTOM = H - 20;

    return class Safari extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        this.load.image('bg', B.sprite(api, 'fundo-oceano'));
        this.load.image('papa', B.sprite(api, 'papa-foto'));
        ANIMALS.forEach(([id]) => this.load.image(id, B.sprite(api, 'mar-' + id)));
        ['shutter', 'wrong-fish', 'win', 'music-oceano'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        this.api = this.registry.get('api'); this.photos = 0; this.over = false; this.swimmers = []; this.next = 0.3;
        B.particles(this);
        const img = B.seamless(this, 'bg', 'bgseam'), sc = H / img.height;
        this.bg = this.add.tileSprite(0, 0, W / sc, img.height, 'bgseam').setOrigin(0).setScale(sc);
        this.add.rectangle(0, 0, W, H, 0x14468f, 0.4).setOrigin(0); // Schleier: Spieltiere heben sich ab
        // Fensterrahmen des Beckens, oben Papas Bereich
        this.add.rectangle(0, 0, W, TOP - 14, 0xe8f1ff).setOrigin(0).setDepth(29);
        this.add.graphics().setDepth(30).lineStyle(14, 0x2b2b2b).strokeRoundedRect(7, TOP - 14, W - 14, H - TOP + 7, 24);

        // Papa mit Sprechblase oben links
        this.papa = this.add.image(62, 60, 'papa').setDepth(31);
        this.papa.setScale(100 / this.papa.height);
        const bub = this.add.graphics().setDepth(31);
        bub.fillStyle(0xffffff).fillRoundedRect(122, 20, 230, 80, 22).lineStyle(4, 0xc9d4ee).strokeRoundedRect(122, 20, 230, 80, 22);
        this.bubText = this.add.text(237, 60, '🔊', { fontFamily: 'sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#1b4fa0' }).setOrigin(0.5).setDepth(32);
        this.add.zone(237, 60, 230, 80).setInteractive({ useHandCursor: true }).setDepth(33).on('pointerdown', () => this.say());

        // Papas Album: 8 Polaroid-Plätze
        this.slots = [];
        for (let i = 0; i < GOAL; i++) {
          const x = 410 + i * 68, y = 58;
          this.add.rectangle(x, y, 56, 64, 0xffffff).setStrokeStyle(2, 0xc9d4ee).setDepth(31).setAngle(i % 2 ? 4 : -4);
          this.slots.push({ x, y });
        }
        this.flash = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setDepth(40);
        this.add.particles(0, 0, 'bubble', { x: { min: 0, max: W }, y: H + 10, speedY: { min: -80, max: -40 }, speedX: { min: -10, max: 10 }, scale: { start: 0.6, end: 1.2 }, alpha: { start: 0.7, end: 0 }, lifespan: 6000, frequency: 260 }).setDepth(1);

        if (this.cache.audio.exists('music-oceano')) { this.music = this.sound.add('music-oceano', { loop: true, volume: 0.3 }); this.music.play(); }
        this.time.delayedCall(600, () => this.newTarget());
      }

      speak(id, word) { this.api.sayFile ? this.api.sayFile(`audio/spiele/papa-${id}.mp3`, word) : this.api.say(word); }
      say() { if (this.target) this.speak(this.target[0], this.target[1]); }

      newTarget() {
        this.target = Phaser.Utils.Array.GetRandom(ANIMALS);
        this.bubText.setText(this.api.reader ? `🔊 ${this.target[1]}` : '🔊');
        this.tweens.add({ targets: this.papa, y: 50, duration: 120, yoyo: true });
        this.say();
        if (!this.swimmers.some(s => s.id === this.target[0] && !s.taken)) this.time.delayedCall(900, () => this.spawn(this.target));
      }

      spawn(forced) {
        const a = forced || Phaser.Utils.Array.GetRandom(ANIMALS);
        const dir = Math.random() < 0.5 ? 1 : -1, big = BIG.includes(a[0]);
        const size = big ? 200 : 130, y = TOP + 30 + size / 2 + Math.random() * (BOTTOM - TOP - size - 40);
        const im = this.add.image(dir > 0 ? -size : W + size, y, a[0]).setDepth(5);
        im.setScale(size / Math.max(im.width, im.height)).setFlipX(dir > 0); // Bilder schauen nach links
        const s = { id: a[0], word: a[1], im, dir, v: (60 + Math.random() * 60) * dir, ph: Math.random() * 6, y0: y, size };
        im.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tap(s));
        this.swimmers.push(s);
      }

      tap(s) {
        if (this.over || !this.target || s.taken) return;
        if (s.id === this.target[0]) {
          s.taken = true; this.photos++;
          B.play(this, 'shutter', { volume: 0.7 });
          this.flash.setAlpha(0.85); this.tweens.add({ targets: this.flash, alpha: 0, duration: 350 });
          // Polaroid fliegt in Papas Album
          const slot = this.slots[this.photos - 1];
          const pol = this.add.container(s.im.x, s.im.y).setDepth(35);
          pol.add(this.add.rectangle(0, 0, 150, 170, 0xffffff).setStrokeStyle(3, 0xdddddd));
          const pic = this.add.image(0, -12, s.id); pic.setScale(120 / Math.max(pic.width, pic.height)).setFlipX(s.dir > 0); pol.add(pic);
          this.tweens.add({ targets: pol, x: slot.x, y: slot.y, scale: 0.37, angle: this.photos % 2 ? -4 : 4, duration: 700, ease: 'Cubic.inOut', delay: 250 });
          this.tweens.add({ targets: s.im, alpha: 0, duration: 300, onComplete: () => s.im.destroy() });
          this.swimmers = this.swimmers.filter(x => x !== s);
          this.tweens.add({ targets: this.papa, angle: { from: -8, to: 8 }, duration: 120, yoyo: true, repeat: 2, onComplete: () => this.papa.setAngle(0) });
          this.time.delayedCall(450, () => this.speak(s.id, s.word));
          if (this.photos >= GOAL) {
            this.over = true;
            this.time.delayedCall(1600, () => { if (this.music) this.music.stop(); B.play(this, 'win', { volume: 0.6 }); this.time.delayedCall(1600, () => this.api.end({ score: `📸 ${this.photos}` })); });
          } else this.time.delayedCall(1800, () => this.newTarget());
        } else {
          B.play(this, 'wrong-fish', { volume: 0.5 });
          this.tweens.add({ targets: s.im, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => s.im.setAngle(0) });
          this.time.delayedCall(500, () => this.say());
        }
      }

      update(time, delta) {
        const dt = Math.min(0.05, delta / 1000);
        this.bg.tilePositionX += 6 * dt / this.bg.scaleX;
        if (!this.over) {
          this.next -= dt;
          if (this.next <= 0 && this.swimmers.length < 6) { this.spawn(); this.next = 1.1 + Math.random() * 1.4; }
        }
        this.swimmers = this.swimmers.filter(s => {
          s.im.x += s.v * dt; s.ph += dt * 2; s.im.y = s.y0 + Math.sin(s.ph) * 10;
          const out = s.im.x < -s.size - 40 || s.im.x > W + s.size + 40;
          if (out) s.im.destroy();
          return !out;
        });
      }
    };
  }
})();
