// Pondi baloiça (Phaser-Fassung): Pondi schwingt von allein an einer Liane unter einem Jacarandá.
// Tippen = Pondi springt IMMER zum nächsten Baum. Der Zeitpunkt bestimmt nur den Bogen:
// leuchtet Pondi grün, fliegt er hoch durch die Bananenreihe, sonst flach darunter durch.
// Kein Herunterfallen, keine Leben; nach 20 Bäumen ist die Runde vorbei.
// Abwechslung: Bäume unterschiedlich weit auseinander; manchmal hängt ganz oben eine goldene Banane (+5),
// die nur mit perfektem Timing erreichbar ist (Pondi leuchtet dann golden); ein Papagei klaut Bananen,
// fliegt Pondi in ihn hinein, lässt er sie fallen. Am letzten Baum wartet Pandi mit dem Bananenkorb.
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.baloica = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#d6efff' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H, GROUND = 490, G = 1100, ROPE = 125, TREES = 20;
    const HAND = { x: 0.45, y: 0.06 }; // Hand von Pondi in Bild 1 (hängend)
    const ARC_HIGH = 190, ARC_LOW = 50, ARC_TOP = 270; // Bogenhöhe über der Linie zwischen zwei Haltepunkten (TOP = goldene Banane)

    return class Swing extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        this.load.image('bg', B.sprite(api, 'fundo-parque')); // Lissabonner Park mit Blick auf den Tejo
        this.load.image('tree', B.sprite(api, 'arvore-jacaranda'));
        this.load.image('banana', B.sprite(api, 'banana'));
        ['banana-dourada', 'papagaio', 'pandi-cesto', 'cesto-cheio'].forEach(k => this.load.image(k, B.sprite(api, k)));
        ['parrot', 'golden'].forEach(k => this.load.audio(k, B.sfx(k)));
        for (let i = 1; i <= 3; i++) this.load.image('pondi' + i, `bilder/spiele/pondi-${i}.webp`);
        ['whoosh', 'grab', 'pondi-happy', 'collect', 'win', 'music-baloica'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        this.api = this.registry.get('api');
        this.got = 0; this.done = 0; this.over = false; this.fly = null;
        B.particles(this);
        const img = B.seamless(this, 'bg', 'bgseam'), sc = (GROUND + 10) / img.height;
        this.bg = this.add.tileSprite(0, 0, W / sc, img.height, 'bgseam').setOrigin(0).setScale(sc).setScrollFactor(0).setAlpha(0.6);
        const g = this.make.graphics({ add: false });
        g.fillStyle(0x7cc45a).fillRect(0, 0, 64, 60); g.fillStyle(0x6cb64c);
        for (let x = 0; x < 64; x += 16) g.fillTriangle(x, 0, x + 8, 0, x + 4, 12);
        g.generateTexture('grass', 64, 60); g.destroy();
        this.grass = this.add.tileSprite(0, GROUND, W, H - GROUND, 'grass').setOrigin(0).setScrollFactor(0).setDepth(2);

        this.rope = this.add.graphics().setDepth(4);
        this.path = this.add.graphics().setDepth(4);
        this.trees = []; this.bananas = []; this.lastX = 200; this.parrots = []; this.nextParrot = 8 + Math.random() * 4;
        for (let i = 0; i <= TREES; i++) this.addTree(i === 0);
        // Pandi mit leerem Korb am Fuß des letzten Baums (spricht nicht)
        const last = this.trees[TREES];
        this.pandi = this.add.image(last.x + 220, GROUND + 18, 'pandi-cesto').setOrigin(0.5, 1).setDepth(5);
        this.pandi.setScale(170 / this.pandi.height);

        this.pondi = this.add.image(0, 0, 'pondi1').setScale(0.5).setDepth(6);
        this.P = { a: this.trees[0], th: -0.9, w: 0, x: 0, y: 0, i: 0 };
        this.place();
        this.cameras.main.scrollX = this.P.x - W * 0.3;

        this.leaves = this.add.particles(0, 0, 'leaf', { speed: { min: 60, max: 180 }, angle: { min: 200, max: 340 }, gravityY: 300, rotate: { min: 0, max: 360 }, lifespan: 900, emitting: false }).setDepth(5);
        this.sparks = this.add.particles(0, 0, 'star', { speed: { min: 80, max: 240 }, scale: { start: 1, end: 0 }, lifespan: 600, emitting: false }).setDepth(7);
        this.hud = B.hud(this, 'banana', 0);
        this.trip = this.add.text(18, 40, `🌳 0 / ${TREES}`, { fontFamily: 'sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#0f1f4d', stroke: '#fff', strokeThickness: 6 }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

        this.input.on('pointerdown', () => this.jump());
        this.input.keyboard.on('keydown-SPACE', () => this.jump());
        this.hint = this.add.text(0, 0, '👆', { fontSize: '60px' }).setOrigin(0.5).setDepth(8);
        this.tweens.add({ targets: this.hint, scale: 1.2, duration: 300, yoyo: true, repeat: -1 });

        if (this.cache.audio.exists('music-baloica')) { this.music = this.sound.add('music-baloica', { loop: true, volume: 0.35 }); this.music.play(); }
      }

      addTree(first) {
        this.lastX += first ? 0 : 330 + Math.random() * 190; // mal nah, mal weit
        const img = this.add.image(this.lastX, GROUND + 14, 'tree').setOrigin(0.5, 1).setDepth(3);
        img.setScale((470 + Math.random() * 30) / img.height); // groß, Stamm steht auf dem Rasen
        const t = { x: this.lastX, y: GROUND + 14 - img.displayHeight * 0.6, img }; // Ast in der unteren Krone
        const prev = this.trees[this.trees.length - 1];
        this.trees.push(t);
        if (prev) { // Bananen auf dem hohen Bogen zwischen den beiden Haltepunkten
          const a = this.hold(prev, 0.55), b = this.hold(t, -0.55);
          for (const s of [0.3, 0.5, 0.7]) {
            const p = this.arc(a, b, s, ARC_HIGH);
            const ban = this.add.image(p.x, p.y + 30, 'banana').setScale(0.22).setDepth(5);
            if (ban.preFX) ban.preFX.addGlow(0xffe066, 5, 0, false, 0.1, 10);
            this.tweens.add({ targets: ban, angle: { from: -10, to: 10 }, duration: 600 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            this.bananas.push(ban);
          }
          // ab und zu ganz oben eine goldene Banane, nur mit perfektem Timing erreichbar
          const n = this.trees.length - 1;
          if (n >= 2 && n % 3 === 0 && Math.random() < 0.8) {
            const p = this.arc(a, b, 0.5, ARC_TOP);
            const gold = this.add.image(p.x, p.y + 30, 'banana-dourada').setDepth(5);
            gold.setScale(70 / gold.height); gold.gold = true;
            this.tweens.add({ targets: gold, scale: gold.scale * 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            if (gold.preFX) gold.preFX.addGlow(0xffd700, 8, 0, false, 0.1, 14);
            t.golden = gold;
            this.bananas.push(gold);
          }
        }
      }

      // perfekt = mitten im grünen Bereich, und vor Pondi hängt eine goldene Banane
      perfect() {
        const P = this.P, next = this.trees[P.i + 1];
        return this.good() && next && next.golden && next.golden.active && P.th > 0.35 && P.th < 0.7;
      }

      // Papagei kommt von rechts, schnappt sich eine Banane vor Pondi und fliegt davon
      sendParrot() {
        const cam = this.cameras.main;
        const target = this.bananas.find(b => !b.gold && !b.stolen && b.x > cam.scrollX + W * 0.65 && b.x < cam.scrollX + W * 1.3);
        if (!target) return;
        target.stolen = true;
        const par = this.add.image(cam.scrollX + W + 120, target.y - 160, 'papagaio').setDepth(8);
        par.setScale(110 / par.width);
        const flap = this.tweens.add({ targets: par, scaleY: par.scaleY * 0.8, duration: 140, yoyo: true, repeat: -1 });
        B.play(this, 'parrot', { volume: 0.5 });
        const p = { im: par, carry: null, flap };
        this.parrots.push(p);
        this.tweens.add({ targets: par, x: target.x + 10, y: target.y - 40, duration: 1100, ease: 'Sine.inOut', onComplete: () => {
          if (!target.active) { this.flyAway(p); return; } // Pondi war schneller
          this.bananas = this.bananas.filter(b => b !== target);
          this.tweens.killTweensOf(target); target.setAngle(0);
          p.carry = target; B.play(this, 'parrot', { volume: 0.5 });
          this.flyAway(p);
        } });
      }

      flyAway(p) {
        this.tweens.add({ targets: p.im, x: p.im.x + 500, y: -150, duration: 1600, ease: 'Quad.in', onComplete: () => {
          p.flap.remove(); p.im.destroy(); if (p.carry) p.carry.destroy();
          this.parrots = this.parrots.filter(q => q !== p);
        } });
      }

      // Haltepunkt der Hand unter einem Baum bei Pendelwinkel th
      hold(t, th) { return { x: t.x + ROPE * Math.sin(th), y: t.y + ROPE * Math.cos(th) }; }
      // Punkt auf dem Flugbogen von a nach b (s von 0 bis 1)
      arc(a, b, s, h) { return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s - h * 4 * s * (1 - s) }; }

      place() { const P = this.P; P.x = P.a.x + ROPE * Math.sin(P.th); P.y = P.a.y + ROPE * Math.cos(P.th); }

      // grün = Pondi schwingt gerade nach vorne oben
      good() { const P = this.P; return !this.fly && P.w > 0.3 && P.th > 0.1 && P.th < 1.0; }

      jump() {
        if (this.fly || this.over) return;
        const P = this.P, next = this.trees[P.i + 1];
        if (!next) return;
        const top = this.perfect(), high = this.good(), to = this.hold(next, -0.55);
        const dur = 0.85 * Math.max(0.8, (to.x - P.x) / 420); // weitere Sprünge dauern etwas länger
        this.fly = { from: { x: P.x, y: P.y }, to, t: 0, dur, h: top ? ARC_TOP : high ? ARC_HIGH : ARC_LOW, tree: next };
        B.play(this, 'whoosh', { volume: 0.5 });
      }

      land() {
        const f = this.fly, P = this.P;
        this.fly = null; P.a = f.tree; P.i++; P.th = -0.55; P.w = 1.6; // Schwung vom Sprung mitnehmen
        this.done++; this.trip.setText(`🌳 ${this.done} / ${TREES}`);
        this.leaves.explode(8, f.tree.x, f.tree.y);
        B.play(this, 'grab', { volume: 0.5 });
        this.tweens.add({ targets: f.tree.img, scaleX: f.tree.img.scaleX * 1.03, duration: 90, yoyo: true });
        if (this.done >= TREES) this.finish();
      }

      // Ende: Kamera zeigt Pandi, die gesammelten Bananen fliegen in seinen Korb, der Korb ist dann voll
      finish() {
        this.over = true;
        if (this.music) this.music.stop();
        const cam = this.cameras.main, bx = this.pandi.x + this.pandi.displayWidth * 0.2, by = this.pandi.y - this.pandi.displayHeight * 0.3;
        this.tweens.add({ targets: cam, scrollX: this.pandi.x - W * 0.55, duration: 700, ease: 'Sine.inOut' });
        const n = Math.min(this.got, 12);
        for (let k = 0; k < n; k++) this.time.delayedCall(800 + k * 140, () => {
          const b = this.add.image(this.P.x, this.P.y, 'banana').setScale(0.16).setDepth(9);
          this.tweens.add({ targets: b, x: bx + (Math.random() - 0.5) * 30, y: by, angle: 360, duration: 600, ease: 'Quad.in', onComplete: () => {
            b.destroy(); B.play(this, 'collect', { volume: 0.25 }); this.sparks.explode(4, bx, by);
          } });
        });
        this.time.delayedCall(800 + n * 140 + 700, () => {
          if (n > 0) {
            const full = this.add.image(bx, this.pandi.y + 4, 'cesto-cheio').setOrigin(0.5, 1).setDepth(6);
            full.setScale(this.pandi.displayHeight * 0.55 / full.height);
            this.tweens.add({ targets: full, scale: { from: full.scale * 0.6, to: full.scale }, duration: 350, ease: 'Back.out' });
          }
          this.tweens.add({ targets: this.pandi, y: this.pandi.y - 30, duration: 180, yoyo: true, repeat: 2 }); // Pandi hüpft vor Freude
          this.sparks.explode(30, bx, by - 40);
          B.play(this, 'pondi-happy', { volume: 0.6 });
          B.play(this, 'win', { volume: 0.6 });
        });
        this.time.delayedCall(800 + n * 140 + 2600, () => this.api.end({ score: `🍌 ${this.got}` }));
      }

      update(time, delta) {
        const dt = Math.min(0.033, delta / 1000), P = this.P;
        if (this.fly) {
          const f = this.fly; f.t += dt / f.dur;
          const s = Math.min(1, f.t), p = this.arc(f.from, f.to, s, f.h);
          P.x = p.x; P.y = p.y;
          this.pondi.setTexture(s < 0.55 ? 'pondi2' : 'pondi3').setOrigin(0.5, 0.3).setRotation((s - 0.5) * 0.6);
          if (s >= 1) this.land();
        } else {
          // Pendel, das von selbst in Schwung bleibt (etwa ±55 Grad)
          P.w += -(G / ROPE) * Math.sin(P.th) * dt;
          if (Math.abs(P.th) < 0.95) P.w += Math.sign(P.w || 1) * 0.8 * dt;
          P.th += P.w * dt; this.place();
          this.pondi.setTexture('pondi1').setOrigin(HAND.x, HAND.y).setRotation(-P.th);
        }
        this.pondi.setPosition(P.x, P.y);

        // grün leuchten, Finger zeigen und die Flugbahn gestrichelt andeuten
        const good = this.good(), top = this.perfect(), next = this.trees[P.i + 1];
        if (top) this.pondi.setTint(0xffe27a); else if (good) this.pondi.setTint(0xb8ffb0); else this.pondi.clearTint();
        this.hint.setVisible(!this.fly && !this.over).setPosition(P.x + 50, P.y + 100).setAlpha(good ? 1 : 0.35);
        this.path.clear();
        if (good && next && !this.over) {
          this.path.fillStyle(top ? 0xffd700 : 0xffffff, 0.9);
          const to = this.hold(next, -0.55);
          for (let s = 0.08; s < 1; s += 0.08) { const p = this.arc({ x: P.x, y: P.y }, to, s, top ? ARC_TOP : ARC_HIGH); this.path.fillCircle(p.x, p.y, top ? 6 : 5); }
        }

        // Bananen einsammeln (goldene zählen 5)
        this.bananas = this.bananas.filter(b => {
          if (Math.hypot(b.x - P.x, b.y - (P.y + 30)) < (b.gold ? 70 : 60)) {
            const v = b.gold ? 5 : 1;
            this.got += v; this.hud.setScore(this.got);
            this.sparks.explode(b.gold ? 30 : 10, b.x, b.y); B.plus(this, b.x, b.y - 20, '+' + v);
            B.play(this, b.gold ? 'golden' : 'collect', { volume: b.gold ? 0.6 : 0.4 });
            if (b.gold || this.got % 5 === 0) B.play(this, 'pondi-happy', { volume: 0.6 });
            this.tweens.killTweensOf(b); b.destroy(); return false;
          }
          return true;
        });

        // Papagei: kommt ab und zu; fliegt Pondi in einen Papagei mit Banane, lässt er sie fallen (+1)
        if (!this.over) {
          this.nextParrot -= dt;
          if (this.nextParrot <= 0) { this.sendParrot(); this.nextParrot = 9 + Math.random() * 6; }
        }
        for (const p of this.parrots) {
          if (p.carry) {
            p.carry.setPosition(p.im.x, p.im.y + 40);
            if (this.fly && Math.hypot(p.im.x - P.x, p.im.y - P.y) < 80) {
              this.got++; this.hud.setScore(this.got);
              this.sparks.explode(12, p.im.x, p.im.y); B.plus(this, p.im.x, p.im.y - 20);
              B.play(this, 'parrot', { volume: 0.6 }); B.play(this, 'collect', { volume: 0.4 });
              p.carry.destroy(); p.carry = null;
            }
          }
        }

        // Liane leicht gebogen
        this.rope.clear();
        if (!this.fly) {
          this.rope.lineStyle(6, 0x3d7a2a);
          new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(P.a.x, P.a.y), new Phaser.Math.Vector2((P.a.x + P.x) / 2 + 8, (P.a.y + P.y) / 2), new Phaser.Math.Vector2(P.x, P.y)).draw(this.rope, 16);
        }

        // Kamera folgt weich, Hintergrund und Rasen mit Parallax
        const cam = this.cameras.main;
        if (!this.over) cam.scrollX += (P.x - W * 0.3 - cam.scrollX) * Math.min(1, dt * 3);
        this.bg.tilePositionX = cam.scrollX * 0.25 / this.bg.scaleX;
        this.grass.tilePositionX = cam.scrollX;
      }
    };
  }
})();
