// Memória com Pipo (Phaser-Fassung): Paare aus Bild und gesprochenem Wort finden.
// 12 Karten (6 Bilder, 6 🔊-Karten, die beim Aufdecken das Wort sprechen). Bei Lesekindern steht das Wort auf der Karte.
// Schwache Wörter kommen bevorzugt vor (die Wortliste ist nach Stufe sortiert).
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.memoria = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#e8f1ff' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H, CW = 132, CH = 132, COLS = 4, ROWS = 3, GX = 160, GY = 150;

    return class Memory extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        this.words = Phaser.Utils.Array.Shuffle(api.words.slice(0, 12)).slice(0, 6);
        B.loadWords(this, this.words);
        this.load.image('pipo', 'bilder/spiele/pipo-corre-1.webp'); // freigestellt
        ['flip', 'match', 'nomatch', 'bark', 'win', 'music-memoria'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        const api = this.registry.get('api');
        this.api = api; this.found = 0; this.moves = 0; this.open = []; this.busy = false;
        B.particles(this);
        // Rückseite: blaue Karte mit Azulejo-Muster
        const g = this.make.graphics({ add: false });
        g.fillStyle(0x1b4fa0).fillRoundedRect(0, 0, CW, CH, 18);
        g.lineStyle(4, 0xffffff, 0.8).strokeRoundedRect(8, 8, CW - 16, CH - 16, 12);
        // Azulejo-Blume: vier Blütenblätter, Mitte, Ecken als Viertelkreise
        const cx = CW / 2, cy = CH / 2;
        g.fillStyle(0xffffff, 0.9);
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.fillEllipse(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, k % 2 ? 22 : 34, k % 2 ? 34 : 22); }
        g.fillStyle(0xf2c230).fillCircle(cx, cy, 10);
        g.fillStyle(0x7fb2ff, 0.9);
        for (const [x, y, a] of [[8, 8, 0], [CW - 8, 8, 0.5], [CW - 8, CH - 8, 1], [8, CH - 8, 1.5]]) g.slice(x, y, 22, a * Math.PI, (a + 0.5) * Math.PI, false).fillPath();
        g.generateTexture('back', CW, CH); g.destroy();

        this.pipo = this.add.image(W - 90, H - 90, 'pipo').setScale(0.7).setFlipX(true).setDepth(5);
        this.counter = this.add.text(W - 90, 60, `0 / 6`, { fontFamily: 'sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#0f1f4d', stroke: '#fff', strokeThickness: 6 }).setOrigin(0.5).setDepth(5);
        this.sparks = this.add.particles(0, 0, 'star', { speed: { min: 80, max: 260 }, scale: { start: 1.1, end: 0 }, lifespan: 650, emitting: false }).setDepth(10);

        const cards = Phaser.Utils.Array.Shuffle(this.words.flatMap((w, i) => [{ i, kind: 'pic', w }, { i, kind: 'word', w }]));
        this.cards = cards.map((c, k) => {
          const x = GX + (k % COLS) * (CW + 22), y = GY + Math.floor(k / COLS) * (CH + 22);
          const front = this.add.container(x, y);
          if (c.kind === 'pic') front.add(B.wordCard(this, c.w, CW));
          else {
            const bg = this.add.graphics(); bg.fillStyle(0xffffff).fillRoundedRect(-CW / 2, -CH / 2, CW, CH, 18); bg.lineStyle(4, 0xc9d4ee).strokeRoundedRect(-CW / 2, -CH / 2, CW, CH, 18);
            front.add(bg); front.add(this.add.text(0, api.reader ? -14 : 0, '🔊', { fontSize: '56px' }).setOrigin(0.5));
            if (api.reader) front.add(this.add.text(0, 40, c.w.pt, { fontFamily: 'sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#1b4fa0' }).setOrigin(0.5));
          }
          front.setScale(0, 1);
          const back = this.add.image(x, y, 'back').setInteractive({ useHandCursor: true });
          // Karten kommen nacheinander ins Bild
          back.setScale(0); this.tweens.add({ targets: back, scale: 1, duration: 300, delay: k * 40, ease: 'Back.out' });
          const card = { ...c, k, front, back, x, y, up: false, done: false };
          back.on('pointerdown', () => this.tap(card));
          front.setSize(CW, CH).setInteractive().on('pointerdown', () => this.tap(card));
          return card;
        });
        if (this.cache.audio.exists('music-memoria')) { this.music = this.sound.add('music-memoria', { loop: true, volume: 0.25 }); this.music.play(); }
      }

      // Karte umdrehen: Rückseite schmal machen, dann Vorderseite breit
      flip(card, up) {
        card.up = up;
        const from = up ? card.back : card.front, to = up ? card.front : card.back;
        B.play(this, 'flip', { volume: 0.4 });
        this.tweens.add({ targets: from, scaleX: 0, duration: 120, onComplete: () => this.tweens.add({ targets: to, scaleX: 1, duration: 120 }) });
      }

      tap(card) {
        if (this.busy || card.done) return;
        if (card.up) { if (card.kind === 'word') this.api.say(card.w.pt); return; }
        this.flip(card, true);
        if (card.kind === 'word') this.time.delayedCall(150, () => this.api.say(card.w.pt));
        this.open.push(card);
        if (this.open.length < 2) return;
        this.moves++;
        const [a, b] = this.open; this.open = [];
        if (a.i === b.i && a.kind !== b.kind) {
          a.done = b.done = true; this.found++;
          this.counter.setText(`${this.found} / 6`);
          this.time.delayedCall(300, () => {
            B.play(this, 'match', { volume: 0.6 });
            for (const c of [a, b]) { this.sparks.explode(10, c.x, c.y); this.tweens.add({ targets: c.front, scale: 1.12, duration: 140, yoyo: true }); }
            this.api.say(a.w.pt);
            // Pipo freut sich
            B.play(this, 'bark', { volume: 0.4 });
            this.tweens.add({ targets: this.pipo, y: this.pipo.y - 40, angle: { from: -10, to: 10 }, duration: 160, yoyo: true, repeat: 1, onComplete: () => this.pipo.setAngle(0) });
          });
          if (this.found === 6) this.time.delayedCall(1600, () => { if (this.music) this.music.stop(); B.play(this, 'win', { volume: 0.6 }); this.time.delayedCall(1400, () => this.api.end({ score: `🃏 ${this.moves}` })); });
        } else {
          this.busy = true;
          this.time.delayedCall(1000, () => {
            B.play(this, 'nomatch', { volume: 0.4 });
            for (const c of [a, b]) this.tweens.add({ targets: c.front, x: c.x + 8, duration: 50, yoyo: true, repeat: 2, onComplete: () => { c.front.x = c.x; } });
            this.time.delayedCall(350, () => { this.flip(a, false); this.flip(b, false); this.busy = false; });
          });
        }
      }
    };
  }
})();
