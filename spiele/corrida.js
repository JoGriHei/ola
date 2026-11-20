// Corrida dos carrinhos (Phaser-Fassung): Seifenkistenrennen (carrinhos de rolamentos) bergab durch einen Park in Lissabon.
// Ansicht hinter der eigenen Kiste, Straße mit Kurven und Kuppen (klassische Pseudo-3D-Technik, mit Phaser-Grafik gezeichnet).
// Steuern: linke/rechte Bildschirmhälfte gedrückt halten (Finger darf rüberwischen), Pfeiltasten, oder iPad neigen (📱).
// Pastéis de Nata sammeln, blaue Streifen = Turbo, Bälle bremsen, neben dem Weg wird man langsam.
// Zauberwolken geben eine Fähigkeit: 🚀 Turbo, 🧲 Magnet (Natas fliegen herbei), 🫧 Schutzblase, ⭐ Stern (unbesiegbar und schnell).
// Alte Canvas-Fassung: alt-spiele/corrida-canvas-2026-11-14.js (im Projektordner).
(() => {
  const FIGS = [['ada', 'Ada'], ['ines', 'Inês'], ['pedro', 'Pedro'], ['selma', 'Selma'], ['pondi', 'Pondi'], ['pandi', 'Pandi'], ['pipo', 'Pipo']];
  const COLORS = { ada: 0xe0463a, ines: 0x2cb5b0, pedro: 0x3a9c46, selma: 0xf2c230, pondi: 0xef8a2c, pipo: 0x3a6fd8 };
  const css = `
  .cr-pick{text-align:center}
  .cr-pick .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;max-width:680px;margin:16px auto}
  .cr-pick button{background:var(--surface);border:3px solid var(--line);border-radius:18px;padding:10px}
  .cr-pick img{width:100%;aspect-ratio:1;object-fit:contain;display:block}
  .cr-pick img.kart{width:55%;margin:-18% auto 0}
  .cr-tilt{position:absolute;right:10px;bottom:10px;width:56px;height:56px;border-radius:50%;border:2px solid var(--line);background:rgba(255,255,255,.85);font-size:1.6rem;z-index:2}
  .cr-tilt.on{background:var(--sun)}
  .cr-hint{position:absolute;left:10px;right:76px;bottom:10px;background:rgba(255,255,255,.95);border:2px solid var(--line);border-radius:12px;padding:.5em .8em;font-size:.95rem;line-height:1.3;z-index:2}`;

  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });

  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.corrida = {
    start(el, api) {
      let stop = null, alive = true;
      const ctl = { tilt: null, tiltOn: false, zero: null, lat: 0 };
      // Lenken über die Richtung der Schwerkraft auf dem Bildschirm (seitlicher Anteil, -1 … 1).
      // Aus beta/gamma berechnet; der Vektor bleibt stetig, auch wenn iOS die Winkel beim aufrecht
      // gehaltenen iPad umspringen lässt. Die Haltung beim Einschalten gilt als „geradeaus“.
      const onTilt = e => {
        if (e.beta == null || e.gamma == null) return;
        const r = Math.PI / 180, b = e.beta * r, g = e.gamma * r;
        const gx = Math.cos(b) * Math.sin(g), gy = -Math.sin(b); // Schwerkraft im Gerät (x rechts, y oben)
        // Wie herum das iPad gehalten wird, sagt die Schwerkraft selbst (welche Kante unten ist), zusammen mit der
        // Form des Bildschirms. Auf screen.orientation.angle ist am iPad kein Verlass (meldet quer teils 0).
        const land = innerWidth > innerHeight;
        if (ctl.land !== land) { ctl.land = land; ctl.side = 0; ctl.zero = null; }
        let lat; // Anteil der Schwerkraft nach rechts auf dem Bildschirm
        if (land) {
          if (Math.abs(gx) > 0.25) ctl.side = gx < 0 ? 1 : -1; // lange Kante unten: Geräte-x zeigt nach oben (1) oder unten (-1)
          else if (!ctl.side) { const w = Number(window.orientation), a = screen.orientation ? screen.orientation.angle : NaN; ctl.side = w === -90 || a === 270 ? -1 : 1; } // liegt flach: Angabe des Geräts
          lat = -gy * ctl.side;
        } else {
          if (Math.abs(gy) > 0.25) ctl.side = gy < 0 ? 1 : -1;
          else if (!ctl.side) ctl.side = 1;
          lat = gx * ctl.side;
        }
        lat /= Math.max(0.6, Math.hypot(gx, gy)); // halb flach gehalten (auf dem Schoß) kommt weniger Schwerkraft seitlich an: ausgleichen
        if (ctl.zero == null) { ctl.zero = Math.max(-0.35, Math.min(0.35, lat)); ctl.lat = lat; } // schräg gehalten beim Einschalten: nur bis ~20° ausgleichen
        ctl.lat += (lat - ctl.lat) * 0.35; // glätten gegen Zittern
        let v = ctl.lat - ctl.zero;
        v = Math.abs(v) < 0.04 ? 0 : v - Math.sign(v) * 0.04; // Totzone ~2°
        ctl.tilt = Math.max(-1, Math.min(1, v / 0.26)); // ~17° Neigung = voll einlenken
        if (ctl.btn) ctl.btn.style.transform = `rotate(${(ctl.tilt * 30).toFixed(1)}deg)`; // 📱 dreht sich mit: man sieht, dass die Neigung ankommt
      };
      el.innerHTML = `<style>${css}</style><div class="cr-pick"><p class="ask">🏎️ ❓</p><div class="grid">${FIGS.map(([id, n]) =>
        `<button data-f="${id}" aria-label="${n}"><img src="${api.figure(id)}" alt="" style="border-radius:50%"><img class="kart" src="${api.sprite('carrinho-' + id) || ''}" alt=""></button>`).join('')}</div></div>`;
      const pick = e => {
        const b = e.target.closest('[data-f]');
        if (!b) return;
        el.removeEventListener('click', pick);
        const me = b.dataset.f;
        if (window.OLA_PHASER) window.OLA_PHASER.audioCtx(); // im Tipp selbst, sonst bleibt Safari stumm
        base().then(() => {
          if (!alive) return;
          stop = window.OLA_PHASER.run(el, api, P => makeScene(P, me, ctl), { bg: '#7cc0f5' });
          // Knopf zum Neigen-Lenken über der Spielfläche
          const host = el.querySelector('.ph-game');
          if (!host) return;
          host.style.position = 'relative';
          host.insertAdjacentHTML('beforeend', `<style>${css}</style><button class="cr-tilt" aria-label="Neigen zum Lenken">📱</button>`);
          const btn = host.querySelector('.cr-tilt'); ctl.btn = btn;
          // Hinweis für Eltern, wenn Neigen nicht klappt (sonst passiert still nichts)
          let hintT = 0;
          const hint = txt => {
            let h = host.querySelector('.cr-hint');
            if (!h) { h = document.createElement('div'); h.className = 'cr-hint'; h.addEventListener('click', () => h.remove()); host.appendChild(h); }
            h.textContent = txt; clearTimeout(hintT); hintT = setTimeout(() => h.remove(), 9000);
          };
          btn.addEventListener('click', async () => {
            if (ctl.tiltOn) { ctl.tiltOn = false; btn.classList.remove('on'); btn.style.transform = ''; window.removeEventListener('deviceorientation', onTilt); return; }
            try {
              if (!window.DeviceOrientationEvent) { hint('📱 Dieses Gerät meldet keine Neigung.'); return; }
              if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                const r = await DeviceOrientationEvent.requestPermission();
                if (window.OLA_PHASER) window.OLA_PHASER.audioCtx(); // die Abfrage von iOS hält den Ton an: gleich wieder wecken
                if (r !== 'granted') { hint('📱 Neigen ist für diese App gesperrt (iOS: „' + r + '“). App ganz schließen (in der App-Übersicht wegwischen), neu öffnen und beim Tippen auf 📱 „Erlauben“ wählen.'); return; }
              }
              let got = false;
              const first = () => { got = true; window.removeEventListener('deviceorientation', first); };
              window.addEventListener('deviceorientation', first);
              ctl.zero = null; ctl.tilt = null; ctl.side = 0; ctl.land = null;
              window.addEventListener('deviceorientation', onTilt); ctl.tiltOn = true; btn.classList.add('on');
              setTimeout(() => { if (!got && ctl.tiltOn) { window.removeEventListener('deviceorientation', first); hint('📱 Erlaubt, aber das iPad schickt keine Neigungsdaten. Unter Einstellungen → Safari → „Bewegung und Ausrichtung“ prüfen.'); } }, 1500);
            } catch (err) { hint('📱 Neigen geht nicht: ' + (err && err.message || err)); }
          });
        });
      };
      el.addEventListener('click', pick);
      base().catch(() => {}); // schon laden, damit der Ton beim Tipp auf die Figur freigeschaltet werden kann
      return () => { alive = false; el.removeEventListener('click', pick); window.removeEventListener('deviceorientation', onTilt); if (stop) stop(); };
    },
  };

  function makeScene(Phaser, me, ctl) {
    const B = window.OLA_PHASER, W = B.W, H = B.H;
    // ---------- Strecke ----------
    const SEG = 200, ROAD = 2000, CAM_H = 1000, DEPTH = 1 / Math.tan(50 * Math.PI / 180), DRAW = 160, PLAYER_Z = CAM_H * DEPTH;
    const MAX = SEG * 55, ACCEL = MAX / 4, OFF_MAX = MAX / 2.4;
    // Lenkung: STEER = seitlich pro Sekunde bei vollem Einschlag, CENTRI = Drift nach außen pro Kurvenstärke.
    // Stärkste Kurve (6) drückt mit 6 * 0.15 = 0,9 nach außen, Lenken schafft 2,0: man kommt immer gegen die Kurve an.
    const STEER = 2.0, CENTRI = 0.15, HOME = 0.5; // HOME: rollt ohne Lenken von der Wiese langsam zurück zum Weg
    const POWERS = { turbo: '🚀', magnet: '🧲', shield: '🫧', star: '⭐' };
    const CONF = [0xff5a5a, 0xffd34d, 0x4cc3ff, 0x6ad66a, 0xc77dff];
    const SND = ['nata', 'magic', 'turbo', 'magnet', 'shield', 'star', 'ball-bump', 'countdown', 'go', 'win', 'lose', 'music-corrida'];

    return class Corrida extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        const im = (k, id = k) => this.load.image(k, B.sprite(api, id));
        im('sky', 'fundo-relva'); im('nata'); im('ball', 'bola'); im('cloud', 'nuvem-magica'); im('lamp', 'candeeiro');
        im('tree0', 'arvore'); im('tree1', 'arvore-jacaranda'); im('small0', 'arbusto'); im('small1', 'banco'); im('small2', 'laranjeira');
        FIGS.forEach(([id]) => im('cart-' + id, 'carrinho-' + id));
        SND.forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        this.api = this.registry.get('api');
        B.particles(this);
        this.buildTrack();

        // Himmel als Verlauf, darüber die Parkhügel (nahtlos, verschieben sich in Kurven)
        const sg = this.textures.createCanvas('skygrad', 4, H), sc = sg.getContext(), gr = sc.createLinearGradient(0, 0, 0, H * 0.6);
        gr.addColorStop(0, '#7cc0f5'); gr.addColorStop(1, '#d6efff'); sc.fillStyle = gr; sc.fillRect(0, 0, 4, H); sg.refresh();
        this.add.image(0, 0, 'skygrad').setOrigin(0).setDisplaySize(W, H).setDepth(0);
        if (this.textures.exists('sky')) {
          const img = B.seamless(this, 'sky', 'skyseam'), s = H * 0.62 / img.height;
          this.skyW = img.width;
          this.hills = this.add.tileSprite(0, 0, W / s, img.height, 'skyseam').setOrigin(0).setScale(s).setDepth(0.5);
        }
        this.road = this.add.graphics().setDepth(1);

        // Vorrat an Bildern für alles am Wegrand (wird jedes Bild neu verteilt)
        this.pool = [];
        for (let i = 0; i < 320; i++) this.pool.push(this.add.image(0, 0, 'nata').setOrigin(0.5, 1).setVisible(false));

        // eigene Kiste
        this.cart = this.add.image(W / 2, H, 'cart-' + me).setOrigin(0.5, 1).setDepth(40);
        const cw = W * 0.26; this.cart.setScale(cw / this.cart.width); this.cartW = cw;
        this.fx = this.add.graphics().setDepth(45);     // Schutzblase, Tempostreifen
        this.tintFx = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setDepth(46);
        this.magnetIcon = this.add.text(W / 2, H - cw * 0.75, '🧲', { fontSize: '60px' }).setOrigin(0.5, 1).setDepth(47).setVisible(false);

        // Partikel
        const P = (key, cfg) => this.add.particles(0, 0, key, { emitting: false, ...cfg });
        this.dustRoad = P('dot', { speed: { min: 40, max: 120 }, angle: { min: 220, max: 320 }, gravityY: 200, lifespan: 500, scale: { start: 1.1, end: 0.2 }, alpha: { start: 0.8, end: 0 }, tint: [0xe7d7b4, 0xd4b98c] }).setDepth(39);
        this.dustGrass = P('leaf', { speed: { min: 60, max: 160 }, angle: { min: 220, max: 320 }, gravityY: 300, lifespan: 550, rotate: { min: 0, max: 360 }, scale: { start: 1.2, end: 0.4 }, alpha: { start: 1, end: 0 } }).setDepth(39);
        this.sparks = P('star', { speed: { min: 120, max: 380 }, angle: { min: 200, max: 340 }, gravityY: 500, lifespan: 700, rotate: { min: 0, max: 360 }, scale: { start: 1.3, end: 0 } }).setDepth(60);
        this.confetti = P('star', { speed: { min: 150, max: 520 }, gravityY: 400, lifespan: 1600, rotate: { min: 0, max: 360 }, scale: { start: 1.4, end: 0.3 }, tint: CONF }).setDepth(60);
        this.bonk = P('dot', { speed: { min: 150, max: 400 }, angle: { min: 200, max: 340 }, gravityY: 700, lifespan: 600, scale: { start: 1, end: 0 }, tint: [0xffffff, 0xe84a4a] }).setDepth(60);

        // Anzeige
        const font = (size, extra = {}) => ({ fontFamily: 'sans-serif', fontSize: size + 'px', fontStyle: 'bold', color: '#0f1f4d', stroke: '#ffffff', strokeThickness: 6, ...extra });
        this.placeText = this.add.text(18, 36, '', font(40, { fontSize: '40px' })).setOrigin(0, 0.5).setDepth(100);
        this.nataIcon = this.add.image(W - 110, 38, 'nata').setDepth(100); this.nataIcon.setScale(48 / this.nataIcon.width);
        this.nataText = this.add.text(W - 20, 38, '0', font(40)).setOrigin(1, 0.5).setDepth(100);
        this.hud = this.add.graphics().setDepth(100);
        this.add.text(W * 0.7 + 8, 25, '🏁', { fontSize: '30px' }).setOrigin(0, 0.5).setDepth(100);
        this.powerIcon = this.add.text(W / 2, 48, '', { fontSize: '44px' }).setOrigin(0.5, 0).setDepth(100);
        this.announce = this.add.text(W / 2, H * 0.34, '', { fontSize: '150px' }).setOrigin(0.5).setDepth(110).setAlpha(0);
        this.countText = this.add.text(W / 2, H * 0.4, '3', font(120, { color: '#ffffff', stroke: '#0f1f4d', strokeThickness: 10 })).setOrigin(0.5).setDepth(110);

        // Steuerung: jeder Finger zählt links (-1) oder rechts (+1), auch beim Rüberwischen
        this.touches = new Map();
        const side = p => (p.x < W / 2 ? -1 : 1);
        this.input.on('pointerdown', p => this.touches.set(p.id, side(p)));
        this.input.on('pointermove', p => { if (p.isDown) this.touches.set(p.id, side(p)); });
        const up = p => this.touches.delete(p.id);
        this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
        this.input.on('gameout', () => this.touches.clear());
        this.keys = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;

        // Zustand
        this.P = { z: 0, x: 0, speed: 0, steer: 0, bump: 0, got: 0, boost: 0, magnet: 0, shield: 0, star: 0, power: null, powerT: 0, powerMax: 1 };
        this.skyOff = 0; this.state = 'count'; this.count = 3.5; this.lastCount = 4; this.time0 = 0; this.place = 1; this.finished = false;
        this.music = this.cache.audio.exists('music-corrida') ? this.sound.add('music-corrida', { loop: true, volume: 0.3 }) : null;
      }

      buildTrack() {
        const segs = this.segs = [];
        const lastY = () => segs.length ? segs[segs.length - 1].p2.world.y : 0;
        const addSeg = (curve, y) => {
          const n = segs.length;
          segs.push({ i: n, curve, sprites: [], dark: Math.floor(n / 3) % 2, p1: { world: { y: lastY(), z: n * SEG }, cam: {}, scr: {} }, p2: { world: { y, z: (n + 1) * SEG }, cam: {}, scr: {} } });
        };
        const ease = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);
        const addRoad = (enter, hold, leave, curve, hill) => {
          const y0 = lastY(), y1 = y0 + hill * SEG, total = enter + hold + leave;
          for (let n = 0; n < enter; n++) addSeg(ease(0, curve, n / enter), ease(y0, y1, n / total));
          for (let n = 0; n < hold; n++) addSeg(curve, ease(y0, y1, (enter + n) / total));
          for (let n = 0; n < leave; n++) addSeg(ease(curve, 0, n / leave), ease(y0, y1, (enter + hold + n) / total));
        };
        addRoad(30, 30, 30, 0, 0);
        const plan = [[3, -20], [-4, -30], [0, 15], [5, -40], [-2, -10], [-5, -35], [0, 20], [4, -25], [-6, -40], [2, 10], [0, -30], [5, -20], [-3, -45], [0, 25], [6, -30], [-4, -20], [0, -50], [3, 15], [-5, -30], [0, -20]];
        for (const [c, h] of plan) addRoad(40, 60 + Math.floor(Math.random() * 60), 40, c, h);
        this.FINISH = segs.length;
        addRoad(40, 220, 40, 0, 0); // Auslauf nach dem Ziel
        this.TRACK = segs.length * SEG;
        const FINISH = this.FINISH, rnd = n => Math.floor(Math.random() * n);

        // Park: Bäume weiter weg, Büsche, Bänke und Orangenbäumchen nah am Weg
        for (let n = 20; n < segs.length; n += 8) {
          const side = (n / 8) % 2 ? 1 : -1;
          segs[n].sprites.push({ k: 'tree', key: 'tree' + rnd(2), off: side * (1.8 + Math.random() * 1.2), w: 1500 });
          if (n % 3 === 0) segs[n].sprites.push({ k: 'tree', key: 'tree' + rnd(2), off: -side * (2 + Math.random()), w: 1500 });
          if (n % 2 && segs[n + 4]) segs[n + 4].sprites.push({ k: 'small', key: 'small' + rnd(3), off: (Math.random() < 0.5 ? -1 : 1) * (1.45 + Math.random() * 0.3), w: 650 });
        }
        for (let n = 25; n < segs.length; n += 40) { segs[n].sprites.push({ k: 'lamp', key: 'lamp', off: -1.25, w: 450 }); if (segs[n + 20]) segs[n + 20].sprites.push({ k: 'lamp', key: 'lamp', off: 1.25, w: 450 }); }
        for (let n = 120; n < FINISH - 20; n += 45 + rnd(40)) { // Reihen von Pastéis de Nata
          const o = Math.random() * 1.4 - 0.7;
          for (let k = 0; k < 5; k++) segs[n + k * 4].sprites.push({ k: 'nata', key: 'nata', off: o, w: 420, item: true });
        }
        for (let n = 200; n < FINISH - 20; n += 70 + rnd(60)) segs[n].sprites.push({ k: 'ball', key: 'ball', off: Math.random() * 1.4 - 0.7, w: 460, item: true });
        for (let n = 140; n < FINISH - 40; n += 150 + rnd(70)) { // Zauberwolken, gern zwei nebeneinander
          const o = Math.random() * 1.0 - 0.5;
          segs[n].sprites.push({ k: 'cloud', key: 'cloud', off: o, w: 950, item: true, float: 420 });
          if (Math.random() < 0.5) segs[n].sprites.push({ k: 'cloud', key: 'cloud', off: o > 0 ? o - 0.9 : o + 0.9, w: 950, item: true, float: 420 });
        }
        for (let n = 160; n < FINISH - 20; n += 110 + rnd(60)) { const o = Math.random() * 1.2 - 0.6; for (let k = 0; k < 4; k++) segs[n + k].boost = o; }

        // Gegner
        const others = FIGS.map(f => f[0]).filter(f => f !== me).sort(() => Math.random() - 0.5).slice(0, 4);
        this.cars = others.map((id, i) => ({ id, z: (12 + i * 10) * SEG, x: [-0.5, 0.5, -0.2, 0.3][i], speed: 0, top: MAX * (0.78 + i * 0.045 + Math.random() * 0.04) }));
      }

      findSeg(z) { return this.segs[Math.min(this.segs.length - 1, Math.max(0, Math.floor(z / SEG)))]; }

      sfx(k, volume = 0.6) { B.play(this, k, { volume }); }

      givePower() {
        const P = this.P, k = ['turbo', 'magnet', 'shield', 'star'][Math.floor(Math.random() * 4)];
        this.sfx('magic', 0.6); this.time.delayedCall(350, () => this.sfx(k, 0.6));
        P.power = k;
        const dur = { turbo: 2.6, magnet: 6, shield: 7, star: 5 }[k];
        if (k === 'turbo') P.boost = dur; else P[k] = dur;
        P.powerT = P.powerMax = dur;
        // keine Einblendung mitten im Bild (stört beim Fahren); nur das kleine Symbol oben hüpft kurz
        this.tweens.killTweensOf(this.powerIcon);
        this.powerIcon.setScale(1.6);
        this.tweens.add({ targets: this.powerIcon, scale: 1, duration: 400, ease: 'Back.out' });
      }

      // ein Bild fliegt quer über den Bildschirm (Ball weg, Nata zur Kiste)
      flyer(key, x, y, w, to, done) {
        if (!this.textures.exists(key)) return null;
        const im = this.add.image(x, y, key).setDepth(55); im.setScale(w / im.width);
        this.tweens.add({ targets: im, ...to, onComplete: () => { im.destroy(); if (done) done(); } });
        return im;
      }

      // Ball getroffen: Kiste dreht sich einmal, Ball fliegt weg; mit Schutz prallt er nur ab
      hitBall(protectedHit) {
        const P = this.P, dir = Math.random() < 0.5 ? -1 : 1;
        this.flyer('ball', W / 2, H * 0.6, 120, { x: W / 2 + dir * 600, y: -80, angle: dir * 540, duration: 800, ease: 'Quad.out' });
        if (protectedHit) {
          this.sfx('ball-bump', 0.5);
          if (P.shield > 0) this.tweens.add({ targets: this, shieldPulse: 1, duration: 120, yoyo: true, onStart: () => { this.shieldPulse = 0; } });
          return;
        }
        P.speed *= 0.45; P.bump = 0.6; this.sfx('ball-bump', 0.7);
        this.cameras.main.shake(300, 0.012); this.cameras.main.flash(150, 255, 120, 120);
        this.bonk.explode(10, W / 2, H * 0.72);
        const boom = this.add.text(W / 2, H * 0.55, '💥', { fontSize: '110px' }).setOrigin(0.5).setDepth(56);
        this.tweens.add({ targets: boom, scale: 1.6, alpha: 0, duration: 700, onComplete: () => boom.destroy() });
        this.tweens.addCounter({ from: 0, to: Math.PI * 2, duration: 650, ease: 'Quad.out', onUpdate: tw => { P.spin = tw.getValue(); }, onComplete: () => { P.spin = 0; } });
      }

      update(now, delta) {
        const dt = Math.min(0.05, delta / 1000), P = this.P, segs = this.segs;
        const pSeg = this.findSeg(P.z + PLAYER_Z), pct = P.speed / MAX;

        if (this.state === 'count') {
          this.count -= dt;
          const c = Math.ceil(this.count - 0.5);
          if (c !== this.lastCount && c > 0) { this.lastCount = c; this.countText.setText(String(c)).setScale(1.4); this.tweens.add({ targets: this.countText, scale: 1, duration: 300 }); this.sfx('countdown', 0.6); }
          if (this.count <= 0.5 && this.countText.text !== '🏁') this.countText.setText('🏁');
          if (this.count <= 0) {
            this.state = 'race'; this.sfx('go', 0.7); if (this.music) this.music.play();
            this.tweens.add({ targets: this.countText, alpha: 0, scale: 2, duration: 400 });
          }
        }

        if (this.state === 'race' || this.state === 'done') {
          this.time0 += dt;
          let steer = 0;
          this.touches.forEach(v => { steer += v; });
          steer = Math.max(-1, Math.min(1, steer));
          if (this.keys) { if (this.keys.left.isDown) steer = -1; else if (this.keys.right.isDown) steer = 1; }
          if (ctl.tiltOn && ctl.tilt != null) steer = ctl.tilt;
          P.steer += (steer - P.steer) * Math.min(1, dt * 12);
          const off = Math.abs(P.x) > 1;
          // Lenken wirkt auch langsam (auf der Wiese) noch kräftig
          P.x += dt * STEER * (0.6 + 0.4 * pct) * P.steer;
          P.x -= dt * pct * pSeg.curve * CENTRI;
          if (off && Math.abs(steer) < 0.1) P.x -= Math.sign(P.x) * HOME * dt; // Lenkhilfe zurück zum Weg
          if (this.state === 'done') P.speed = Math.max(0, P.speed - ACCEL * dt);
          else P.speed += ACCEL * dt;
          if (P.boost > 0) { P.boost -= dt; P.speed += ACCEL * 1.5 * dt; }
          if (off && P.speed > OFF_MAX) P.speed -= ACCEL * 2 * dt; // neben dem Weg langsamer
          if (P.bump > 0) P.bump -= dt;
          for (const k of ['magnet', 'shield', 'star']) if (P[k] > 0) P[k] -= dt;
          if (P.powerT > 0) { P.powerT -= dt; if (P.powerT <= 0) P.power = null; }
          if (P.star > 0) P.speed += ACCEL * 1.2 * dt;
          P.x = Math.max(-1.8, Math.min(1.8, P.x));
          P.speed = Math.max(0, Math.min(P.boost > 0 || P.star > 0 ? MAX * 1.3 : MAX, P.speed));

          // Turbo-Streifen, Natas, Bälle, Zauberwolken
          if (pSeg.boost != null && Math.abs(P.x - pSeg.boost) < 0.28 && P.boost <= 0) { P.boost = 1.6; this.sfx('turbo', 0.5); }
          for (const sp of pSeg.sprites) {
            if (!sp.item || sp.gone || Math.abs(P.x - sp.off) > (sp.k === 'cloud' ? 0.42 : 0.3)) continue;
            sp.gone = true;
            if (sp.k === 'nata') this.gotNata(W / 2 + (Math.random() - 0.5) * 80, H * 0.62, 0.5);
            else if (sp.k === 'cloud') { this.givePower(); this.confetti.explode(40, W / 2, H * 0.5); }
            else this.hitBall(P.shield > 0 || P.star > 0);
          }
          // Magnet: Natas aus den nächsten Abschnitten fliegen herbei
          if (P.magnet > 0) for (let n = 1; n < 10; n++) {
            const s2 = segs[pSeg.i + n]; if (!s2) break;
            for (const sp of s2.sprites) if (sp.k === 'nata' && !sp.gone && Math.abs(P.x - sp.off) < 1.4) {
              sp.gone = true;
              const sx = W / 2 + (sp.off - P.x) * 260, sy = H * 0.42;
              this.flyer('nata', sx, sy, 70, { x: W / 2, y: H * 0.75, duration: 450, ease: 'Quad.in' }, () => this.gotNata(W / 2, H * 0.62, 0.35));
            }
          }
          // Gegner: fahren ihre Spur, weichen dem Spieler aus, rempeln
          for (const c of this.cars) {
            const cSeg = this.findSeg(c.z);
            c.speed = Math.min(c.top, c.speed + ACCEL * 0.9 * dt);
            if (c.z > this.FINISH * SEG) c.speed = Math.max(0, c.speed - ACCEL * 2 * dt);
            c.x -= dt * 0.6 * cSeg.curve * 0.08;
            c.x = Math.max(-0.8, Math.min(0.8, c.x));
            c.z = Math.min(this.TRACK - SEG, c.z + c.speed * dt);
            const gap = c.z - (P.z + PLAYER_Z);
            if (gap > 0 && gap < SEG * 1.5 && Math.abs(c.x - P.x) < 0.35 && P.speed > c.speed) {
              if (P.star > 0 || P.shield > 0) { c.speed *= 0.6; c.x += (c.x > P.x ? 1 : -1) * 0.5; this.sfx('ball-bump', 0.4); } // weggeschubst
              else { P.speed = c.speed * 0.85; P.bump = 0.3; this.sfx('ball-bump', 0.4); }
            }
            if (gap > -SEG * 6 && gap < SEG * 10 && Math.abs(c.x - P.x) < 0.4) c.x += (c.x > P.x ? 1 : -1) * dt * 0.5; // ausweichen
          }
          P.z = Math.min(this.TRACK - SEG * 2, P.z + P.speed * dt);
          this.skyOff += dt * pct * pSeg.curve * 0.004;
          this.place = 1 + this.cars.filter(c => c.z > P.z + PLAYER_Z).length;
          if (!this.finished && P.z + PLAYER_Z >= this.FINISH * SEG) this.finish();
        }
        this.draw(now, dt);
      }

      gotNata(x, y, vol) {
        this.P.got++; this.sfx('nata', vol);
        this.sparks.explode(10, x, y);
        B.plus(this, x, y);
        this.nataText.setText(String(this.P.got));
        this.nataIcon.setX(this.nataText.x - this.nataText.width - 32); // Symbol rückt bei großen Zahlen nach links
        this.tweens.add({ targets: this.nataText, scale: 1.3, duration: 100, yoyo: true });
      }

      finish() {
        this.finished = true; this.state = 'done';
        if (this.music) this.music.stop();
        for (let k = 0; k < 4; k++) this.confetti.explode(40, W * (0.2 + k * 0.2), H * 0.2);
        this.sfx(this.place <= 3 ? 'win' : 'lose', 0.7);
        const medal = ['🥇', '🥈', '🥉'][this.place - 1] || `${this.place}.`;
        this.announce.setText(medal).setAlpha(1).setScale(0.5);
        this.tweens.add({ targets: this.announce, scale: 1.2, duration: 500, ease: 'Back.out' });
        this.time.delayedCall(2500, () => this.api.end({ score: `${medal} · 🥧 ${this.P.got} · ${Math.round(this.time0)} s` }));
      }

      // ---------- Zeichnen ----------
      project(p, cx, cy, cz) {
        p.cam.x = (p.world.x || 0) - cx; p.cam.y = p.world.y - cy; p.cam.z = p.world.z - cz;
        const s = DEPTH / p.cam.z;
        p.scr.scale = s; p.scr.x = Math.round(W / 2 + s * p.cam.x * W / 2); p.scr.y = Math.round(H / 2 - s * p.cam.y * H / 2); p.scr.w = Math.round(s * ROAD * W / 2);
      }

      quad(color, alpha, x1, y1, w1, x2, y2, w2) {
        const g = this.road;
        g.fillStyle(color, alpha); g.beginPath();
        g.moveTo(x1 - w1, y1 + 1); g.lineTo(x2 - w2, y2 - 1); g.lineTo(x2 + w2, y2 - 1); g.lineTo(x1 + w1, y1 + 1);
        g.closePath(); g.fillPath();
      }

      drawSegment(s) {
        const g = this.road, a = s.p1.scr, b = s.p2.scr, d = s.dark;
        g.fillStyle(d ? 0x7cc45a : 0x86cd63).fillRect(0, b.y - 1, W, a.y - b.y + 2); // Rasen
        const r1 = a.w / 6, r2 = b.w / 6;
        this.quad(d ? 0xd9c9a3 : 0xf2ead6, 1, a.x, a.y, a.w + r1 * 0.35, b.x, b.y, b.w + r2 * 0.35); // Wegrand
        this.quad(d ? 0xc9ad7f : 0xd4b98c, 1, a.x, a.y, a.w, b.x, b.y, b.w); // Parkweg
        if (s.boost != null) this.quad(0x2f7de1, 1, a.x + s.boost * a.w, a.y, a.w * 0.16, b.x + s.boost * b.w, b.y, b.w * 0.16);
        if (!d) for (const k of [-1 / 3, 1 / 3]) this.quad(0xffffff, 0.7, a.x + k * a.w, a.y, a.w / 40, b.x + k * b.w, b.y, b.w / 40);
        if (s.i === this.FINISH || s.i === this.FINISH + 1) { // Ziellinie kariert
          const n = 10;
          for (let k = 0; k < n; k++) {
            const f1 = -1 + 2 * k / n, f2 = -1 + 2 * (k + 1) / n;
            g.fillStyle((k + s.i) % 2 ? 0x111111 : 0xffffff); g.beginPath();
            g.moveTo(a.x + f1 * a.w, a.y); g.lineTo(b.x + f1 * b.w, b.y); g.lineTo(b.x + f2 * b.w, b.y); g.lineTo(a.x + f2 * a.w, a.y);
            g.closePath(); g.fillPath();
          }
        }
      }

      // ein Bild am Wegrand: Fußpunkt x/y, Breite in Weltmaß; was hinter einer Kuppe liegt, wird unten abgeschnitten
      putSprite(key, scale, x, y, worldW, clipY) {
        if (!this.textures.exists(key) || this.used >= this.pool.length) return;
        const im = this.pool[this.used];
        if (im.texture.key !== key) im.setTexture(key);
        const fw = im.frame.width, fh = im.frame.height, dw = worldW * scale * W / 2, dh = dw * fh / fw;
        const clipH = clipY ? Math.max(0, y - clipY) : 0;
        if (clipH >= dh || dw < 1 || y - dh > H || x + dw / 2 < 0 || x - dw / 2 > W) return;
        this.used++;
        im.setVisible(true).setPosition(x, y).setDisplaySize(dw, dh).setDepth(2 + this.used * 0.001);
        if (clipH > 0) im.setCrop(0, 0, fw, fh * (1 - clipH / dh)); else if (im.isCropped) im.setCrop();
      }

      draw(now, dt) {
        const P = this.P, segs = this.segs, g = this.road;
        if (this.hills) this.hills.tilePositionX = this.skyOff * this.skyW;
        g.clear();
        const base = this.findSeg(P.z), bp = (P.z % SEG) / SEG, pSeg = this.findSeg(P.z + PLAYER_Z);
        const playerY = pSeg.p1.world.y + (pSeg.p2.world.y - pSeg.p1.world.y) * (((P.z + PLAYER_Z) % SEG) / SEG);
        let maxy = H, x = 0, dx = -(base.curve * bp);
        for (let n = 0; n < DRAW; n++) {
          const s = segs[base.i + n];
          if (!s) break;
          this.project(s.p1, P.x * ROAD - x, playerY + CAM_H, P.z);
          this.project(s.p2, P.x * ROAD - x - dx, playerY + CAM_H, P.z);
          x += dx; dx += s.curve;
          s.clip = maxy;
          if (s.p1.cam.z <= DEPTH || s.p2.scr.y >= s.p1.scr.y || s.p2.scr.y >= maxy) continue;
          this.drawSegment(s);
          maxy = s.p1.scr.y;
        }
        // Bilder von hinten nach vorne
        this.pool.forEach(im => im.setVisible(false));
        this.used = 0;
        for (let n = DRAW - 1; n > 0; n--) {
          const s = segs[base.i + n];
          if (!s || s.p1.cam.z <= DEPTH) continue;
          for (const sp of s.sprites) {
            if (sp.gone) continue;
            const sx = s.p1.scr.x + s.p1.scr.scale * sp.off * ROAD * W / 2;
            const bob = sp.k === 'nata' ? Math.sin(now / 200 + s.i) * s.p1.scr.scale * 120 * H / 2 : sp.float ? (sp.float + Math.sin(now / 300 + s.i) * 60) * s.p1.scr.scale * H / 2 : 0;
            this.putSprite(sp.key, s.p1.scr.scale, sx, s.p1.scr.y - bob, sp.w, s.clip);
          }
          for (const c of this.cars) {
            if (this.findSeg(c.z) !== s) continue;
            const pp = (c.z % SEG) / SEG, sc = s.p1.scr.scale + (s.p2.scr.scale - s.p1.scr.scale) * pp;
            const cx = s.p1.scr.x + (s.p2.scr.x - s.p1.scr.x) * pp + sc * c.x * ROAD * W / 2, cy = s.p1.scr.y + (s.p2.scr.y - s.p1.scr.y) * pp;
            this.putSprite('cart-' + c.id, sc, cx, cy, 900, s.clip);
          }
        }

        // eigene Kiste: wackelt beim Fahren, neigt sich in die Kurve
        const bob = (P.speed > 0 ? Math.sin(now / 60) * 2 : 0) + (P.bump > 0 ? Math.sin(now / 25) * 6 : 0);
        this.cart.setPosition(W / 2, H - H * 0.02 + bob).setRotation(P.steer * 0.12 - pSeg.curve * 0.015 + (P.spin || 0));

        // Staub hinter den Rädern (auf der Wiese grüne Blätter), Tempo bestimmt die Menge
        if (this.state !== 'count' && P.speed > MAX * 0.2 && Math.random() < P.speed / MAX) {
          const em = Math.abs(P.x) > 1 ? this.dustGrass : this.dustRoad;
          em.explode(1, W / 2 - W * 0.09, H * 0.97); em.explode(1, W / 2 + W * 0.09, H * 0.97);
        }

        // Effekte: Tempostreifen, Schutzblase, Farbschleier, Magnet
        const fx = this.fx; fx.clear();
        if (P.boost > 0 || P.star > 0) {
          fx.lineStyle(3, 0xffffff, 0.7);
          for (let k = 0; k < 10; k++) {
            const a = Math.random() * Math.PI * 2, r1 = H * (0.45 + Math.random() * 0.2), r2 = r1 + 80;
            fx.lineBetween(W / 2 + Math.cos(a) * r1, H * 0.45 + Math.sin(a) * r1, W / 2 + Math.cos(a) * r2, H * 0.45 + Math.sin(a) * r2);
          }
        }
        if (P.shield > 0) {
          const r = this.cartW * 0.62 * (1 + Math.sin(now / 150) * 0.03 + (this.shieldPulse || 0) * 0.15), gx = W / 2, gy = H - this.cartW * 0.42;
          fx.fillStyle(0xa0dcff, 0.25).fillCircle(gx, gy, r);
          fx.lineStyle(5, 0xffffff, 0.8).strokeCircle(gx, gy, r);
          fx.fillStyle(0xffffff, 0.6).fillCircle(gx - r * 0.45, gy - r * 0.5, r * 0.1);
        }
        if (P.star > 0) this.tintFx.setFillStyle(Phaser.Display.Color.HSVToRGB(((now / 4) % 360) / 360, 0.7, 1).color, 0.18);
        else if (P.boost > 0) this.tintFx.setFillStyle(0x2f7de1, 0.18);
        else this.tintFx.setFillStyle(0xffffff, 0);
        this.magnetIcon.setVisible(P.magnet > 0).setY(H - this.cartW * 0.75 + Math.sin(now / 150) * 6);

        // Anzeige: Platz, Fortschritt bis zum Ziel, Fähigkeit mit Restzeit
        this.placeText.setText(['🥇', '🥈', '🥉'][this.place - 1] || this.place + '.');
        const h = this.hud; h.clear();
        const prog = Math.min(1, (P.z + PLAYER_Z) / (this.FINISH * SEG));
        h.fillStyle(0x0f1f4d, 0.25).fillRoundedRect(W * 0.3, 20, W * 0.4, 12, 6);
        h.fillStyle(0xffd34d).fillRoundedRect(W * 0.3, 20, Math.max(12, W * 0.4 * prog), 12, 6);
        if (P.power && P.powerT > 0) {
          this.powerIcon.setText(POWERS[P.power]);
          h.fillStyle(0x0f1f4d, 0.25).fillRect(W / 2 - 40, 100, 80, 8);
          h.fillStyle(0xffd34d).fillRect(W / 2 - 40, 100, 80 * P.powerT / (P.powerMax || 1), 8);
        } else this.powerIcon.setText('');
      }
    };
  }
})();
