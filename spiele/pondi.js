// Apanha o Pondi (Phaser-Fassung): Ein Wort wird gesprochen. Pondi springt aus Löchern und hält Bildkarten hoch.
// Antippen, wenn er das richtige Bild hält. 15 Treffer; Pondi wird schneller, später kommen zwei gleichzeitig.
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.pondi = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#8fd16a' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H, GOAL = 15;
    const HOLES = [[200, 255], [480, 255], [760, 255], [200, 470], [480, 470], [760, 470]];

    return class Whack extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        this.pool = Phaser.Utils.Array.Shuffle(api.words.slice(0, 12)).slice(0, 8);
        B.loadWords(this, this.pool);
        this.load.image('pondi', B.sprite(api, 'pondi-cima'));
        ['pop', 'bonk', 'honk', 'pondi-tease', 'win', 'music-pondi'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        const api = this.registry.get('api');
        this.api = api; this.hits = 0; this.showMs = 1900; this.over = false;
        B.particles(this);
        // Wiese mit leichtem Verlauf und Grasbüscheln
        const g = this.add.graphics();
        g.fillGradientStyle(0x9fdc78, 0x9fdc78, 0x5fae45, 0x5fae45, 1).fillRect(0, 0, W, H);
        g.fillStyle(0x7cc45a, 0.6);
        for (let i = 0; i < 60; i++) { const x = Math.random() * W, y = 90 + Math.random() * (H - 90); g.fillTriangle(x, y, x + 6, y, x + 3, y - 12); }

        this.holes = HOLES.map(([x, y], i) => {
          this.add.ellipse(x, y, 210, 70, 0x2e1b0e);                       // Loch
          const pondi = this.add.image(x, y + 160, 'pondi').setScale(0.48);
          const card = this.add.container(x, y + 160).setDepth(3); // Karten vor allen Lochrändern
          // nur sichtbar, was über dem Loch ist
          const m = this.make.graphics({ add: false }); m.fillRect(x - 140, y - 340, 280, 362);
          const mask = m.createGeometryMask(); pondi.setMask(mask); card.setMask(mask);
          this.add.ellipse(x, y + 30, 230, 26, 0x7cc45a).setDepth(1);      // schmaler Grasrand vorne
          const hit = this.add.zone(x, y - 90, 200, 220).setInteractive().setDepth(5);
          const h = { i, x, y, pondi, card, up: false, w: null, timer: null };
          hit.on('pointerdown', () => this.tap(h));
          return h;
        });

        // Wort nochmal hören
        const say = this.add.text(70, 46, '🔊', { fontSize: '54px' }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);
        say.on('pointerdown', () => { if (this.target) this.api.say(this.target.pt); this.tweens.add({ targets: say, scale: 1.25, duration: 120, yoyo: true }); });
        this.counter = this.add.text(W - 24, 46, `0 / ${GOAL}`, { fontFamily: 'sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#0f1f4d', stroke: '#fff', strokeThickness: 6 }).setOrigin(1, 0.5).setDepth(10);
        this.sparks = this.add.particles(0, 0, 'star', { speed: { min: 100, max: 280 }, scale: { start: 1.2, end: 0 }, lifespan: 650, emitting: false }).setDepth(8);

        if (this.cache.audio.exists('music-pondi')) { this.music = this.sound.add('music-pondi', { loop: true, volume: 0.3 }); this.music.play(); }
        this.time.delayedCall(400, () => this.newTarget());
        this.time.delayedCall(1500, () => this.loop());
      }

      newTarget() { this.target = Phaser.Utils.Array.GetRandom(this.pool); this.api.say(this.target.pt); }

      popUp() {
        const free = this.holes.filter(h => !h.up);
        if (!free.length || this.over || !this.target) return;
        const h = Phaser.Utils.Array.GetRandom(free);
        // etwa jedes dritte Mal das gesuchte Bild
        h.w = Math.random() < 0.4 ? this.target : Phaser.Utils.Array.GetRandom(this.pool.filter(x => x !== this.target));
        h.card.removeAll(true); h.card.add(B.wordCard(this, h.w, 88));
        h.up = true;
        B.play(this, 'pop', { volume: 0.4 });
        this.tweens.add({ targets: h.pondi, y: h.y - 58, duration: 260, ease: 'Back.out' });
        this.tweens.add({ targets: h.card, y: h.y - 140, duration: 300, ease: 'Back.out' }); // zwischen Pondis Händen
        h.timer = this.time.delayedCall(this.showMs, () => this.down(h));
      }

      down(h, fast) {
        if (!h.up) return;
        h.up = false; if (h.timer) h.timer.remove();
        this.tweens.add({ targets: [h.pondi, h.card], y: h.y + 160, duration: fast ? 160 : 240, ease: 'Quad.in', onComplete: () => h.pondi.setAngle(0).setScale(0.48) });
      }

      loop() {
        if (this.over) return;
        this.popUp();
        if (this.hits > 5 && Math.random() < 0.5) this.time.delayedCall(350, () => this.popUp());
        this.time.delayedCall(Math.max(650, this.showMs * 0.75), () => this.loop());
      }

      tap(h) {
        if (!h.up || this.over) return;
        if (h.w === this.target) {
          this.hits++; this.counter.setText(`${this.hits} / ${GOAL}`);
          this.tweens.add({ targets: this.counter, scale: 1.25, duration: 100, yoyo: true });
          B.play(this, 'bonk', { volume: 0.6 });
          this.sparks.explode(14, h.x, h.y - 120);
          B.plus(this, h.x, h.y - 200);
          this.tweens.add({ targets: h.pondi, angle: 360, duration: 300 }); // Pondi dreht sich verdutzt
          this.time.delayedCall(250, () => this.down(h, true));
          this.showMs = Math.max(950, this.showMs - 70);
          if (this.hits >= GOAL) return this.finish();
          this.time.delayedCall(700, () => this.newTarget());
        } else {
          B.play(this, 'honk', { volume: 0.5 });
          B.play(this, 'pondi-tease', { volume: 0.5 });
          this.tweens.add({ targets: [h.pondi, h.card], x: h.x + 10, duration: 50, yoyo: true, repeat: 3, onComplete: () => { h.pondi.x = h.x; h.card.x = h.x; } });
          this.time.delayedCall(500, () => { this.down(h); this.api.say(this.target.pt); });
        }
      }

      finish() {
        this.over = true;
        if (this.music) this.music.stop();
        B.play(this, 'win', { volume: 0.6 });
        this.holes.forEach(h => this.down(h));
        this.time.delayedCall(1800, () => this.api.end({ score: `🔨 ${this.hits}` }));
      }
    };
  }
})();
