// A fila da festa: Polonaise auf dem Geburtstagsfest in Omas Garten, von oben gesehen.
// Rute geht mit dem Cavaquinho voran und ruft, wen sie als Nächstes abholt („Agora o Leo!“). Wer richtig abgeholt wird,
// hängt sich hinten an, die Schlange wird immer länger. Falsche Gäste bleiben stehen und Rute ruft noch einmal.
// (der falsche Gast wackelt nur und kommt nicht mit, niemand verlässt die Schlange). Stößt Rute an die Hecke oder an einen Blumentopf, kostet das
// ein Herz (danach biegt sie von selbst ab). Läuft sie in die eigene Schlange, gibt es ein Durcheinander: ein Herz weniger,
// und alle hinter der Stelle laufen zurück auf die Wiese. Damit man versteht, warum: Zwei Kacheln vor einem Hindernis blinkt
// es rot, immer auf der Wiese (vor der Hecke ein roter Balken am Wiesenrand, sonst die versperrte Kachel); beim Anstoßen
// knallt es genau dort (💥 oder 💫, 💔 bei den Herzen) und das Spiel hält kurz an. Die Schlange wird mit jedem Gast
// schneller. Ein Blumentopf steht von Anfang an auf der Wiese, ein zweiter kommt nach dem vierten Gast dazu.
// Ziel: alle zwölf Gäste in der Schlange.
// Steuern: irgendwo im Bild wischen (zählt nur die Wischrichtung, nicht die Stelle) oder kurz neben Rute tippen (Richtung von
// Rute aus, gewertet erst beim Loslassen ohne Bewegung), am Rechner auch Pfeiltasten. Bis zu zwei Richtungen werden vorgemerkt
// (schnell um zwei Ecken); ist die gewünschte Richtung gerade versperrt, gilt sie noch zwei Schritte lang.
// Eigenes Spiel mit eigenen Figuren; Test: _test?auto lässt Rute selbst laufen (window.OLA_FILA_AUTO).
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.fila = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#3f8f3a' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  // Gäste: [Bild gast-<id>, wie Rute sie ruft, Farbe des Spielsteins]
  const GAESTE = [['ada', 'a Ada', 0xf4b942], ['selma', 'a Selma', 0xff7fb0], ['ines', 'a Inês', 0xf2c230], ['pedro', 'o Pedro', 0x2e9e4f], ['leo', 'o Leo', 0xd93a2b], ['benni', 'o Benni', 0x57a8e8],
    ['nico', 'o Nico', 0x6aa84f], ['mama', 'a mãe', 0xe8dcc0], ['papa', 'o pai', 0x9bb7d4], ['avo-oma', 'a avó', 0x3b6fc4], ['avo-opa', 'o avô', 0x8a5a2b], ['pipo', 'o Pipo', 0xe03a2f]];

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H, COLS = 19, ROWS = 11, T = 48;
    const OX = (W - COLS * T) / 2, OY = (H - ROWS * T) / 2, cx = c => OX + c * T + T / 2, cy = r => OY + r * T + T / 2;
    const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const wall = (c, r) => r <= 0 || r >= ROWS - 1 || c <= 0 || c >= COLS - 1;

    return class Fila extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        this.load.image('rute', B.sprite(api, 'gast-rute'));
        GAESTE.forEach(([id]) => this.load.image(id, B.sprite(api, 'gast-' + id)));
        ['collect', 'honk', 'bonk', 'lose', 'win', 'fila-musica'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        this.api = this.registry.get('api'); this.over = false; this.frozen = true; this.t = 0; this.tempo = 3.1; this.toepfe = []; this.safe = 0; this.fehler = 0; this.seit = 0;
        B.particles(this);
        this.malen();
        const stein = (key, farbe, c, r) => { const fuss = this.add.ellipse(0, 4, 34, 14, farbe).setStrokeStyle(2, 0xffffff), im = this.add.image(0, 5, key).setOrigin(0.5, 1); im.setScale(56 / im.height * (im.width / im.height > 0.85 ? 1.2 : 1)); // breite Bilder (mit Cavaquinho, Ball) etwas größer, damit die Köpfe gleich groß wirken
          const ring = this.add.ellipse(0, 4, 46, 22).setStrokeStyle(4, 0xffe066).setVisible(false);
          return { key, cont: this.add.container(cx(c), cy(r) + 14, [ring, fuss, im]), im, ring, c, r }; };
        this.stein = stein;
        const mc = COLS >> 1, mr = ROWS >> 1;
        this.schlange = [Object.assign(stein('rute', 0x7d3fc0, mc, mr), { ac: mc, ar: mr })]; // [Rute, dann die Gäste]; ac/ar = Kachel davor (fürs Gleiten)
        this.dir = [1, 0]; this.wants = []; // vorgemerkte Richtungen: [{ d, alt }], alt = so viele Schritte wartet sie schon
        if (window.OLA_DEBUG) window.OLA_FILA_SZENE = this; // nur Testseite
        this.warten = Phaser.Utils.Array.Shuffle(GAESTE.map(([id, name, farbe]) => ({ id, name, farbe }))); // noch nicht in der Schlange
        this.stehen = []; // gerade auf der Wiese
        this.topf(); // ein Blumentopf steht von Anfang an da
        this.hud = B.hud(this, 'nota', 3);
        this.warn = this.add.rectangle(0, 0, T - 6, T - 6, 0xff3b30, 0.35).setStrokeStyle(4, 0xff3b30).setDepth(7).setVisible(false); // versperrte Kachel voraus (Topf, eigene Schlange)
        this.warnRand = this.add.rectangle(0, 0, T, 12, 0xff3b30).setDepth(7).setVisible(false); // vor der Hecke: Balken am Wiesenrand
        // Rutes Sprechblase oben in der Mitte: antippen = noch einmal hören
        const bub = this.add.graphics().setDepth(101); bub.fillStyle(0xffffff, 0.95).fillRoundedRect(W / 2 - 150, 6, 300, 36, 16).lineStyle(3, 0xc9d4ee).strokeRoundedRect(W / 2 - 150, 6, 300, 36, 16);
        this.blase = this.add.text(W / 2, 24, '🔊', { fontFamily: 'sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#1b4fa0' }).setOrigin(0.5).setDepth(102);
        this.add.zone(W / 2, 24, 300, 40).setInteractive({ useHandCursor: true }).setDepth(103).on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.rufen(); });
        const richtung = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
        // Richtung vormerken: dieselbe noch einmal zählt nicht; das Gegenteil der zuletzt gemerkten ersetzt sie (das Kind verbessert sich)
        const merken = d => { const q = this.wants, l = q.length ? q[q.length - 1].d : this.dir;
          if (d[0] === l[0] && d[1] === l[1]) return;
          if (q.length && d[0] === -l[0] && d[1] === -l[1]) q[q.length - 1] = { d, alt: 0 }; else if (q.length >= 2) q[1] = { d, alt: 0 }; else q.push({ d, alt: 0 }); };
        // Finger aufsetzen legt noch nichts fest (sonst lief Rute erst zur Stelle des Fingers und dann in die Wischrichtung)
        this.input.on('pointerdown', p => { if (p.y < 46) return; this.ab = { x: p.x, y: p.y, x0: p.x, y0: p.y, wisch: false }; });
        // Wischen: ab 24 px in eine deutliche Richtung; danach zählt von dort aus weiter (ein Zug um die Ecke = zwei Richtungen)
        this.input.on('pointermove', p => { const ab = this.ab; if (!p.isDown || !ab) return; const dx = p.x - ab.x, dy = p.y - ab.y, gross = Math.max(Math.abs(dx), Math.abs(dy)), klein = Math.min(Math.abs(dx), Math.abs(dy));
          if (gross > 24 && gross > klein * 1.3) { merken(richtung(dx, dy)); ab.x = p.x; ab.y = p.y; ab.wisch = true; } else if (gross > 70) { ab.x = p.x; ab.y = p.y; } }); // lange genau schräg: neu ansetzen
        // Loslassen: kurzer schneller Wisch (unter 24 px) zählt auch; ganz ohne Bewegung war es ein Tipp neben Rute
        this.input.on('pointerup', p => { const ab = this.ab; this.ab = null; if (!ab || ab.wisch) return; const wx = p.x - ab.x0, wy = p.y - ab.y0;
          if (Math.hypot(wx, wy) > 12) { merken(richtung(wx, wy)); return; }
          const k = this.schlange[0].cont, dx = p.x - k.x, dy = p.y - k.y; if (Math.hypot(dx, dy) > 20) merken(richtung(dx, dy)); });
        this.input.on('pointerupoutside', () => { this.ab = null; });
        this.input.keyboard && this.input.keyboard.on('keydown', e => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (d) merken(d); });
        if (this.cache.audio.exists('fila-musica')) { this.music = this.sound.add('fila-musica', { loop: true, volume: 0.22 }); this.music.play(); }
        this.api.say('Vamos dançar!');
        this.time.delayedCall(1700, () => { this.frozen = false; this.neuesZiel(); });
      }

      malen() {
        const g = this.add.graphics();
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g.fillStyle((c + r) % 2 ? 0x8fcf6a : 0x86c861).fillRect(OX + c * T, OY + r * T, T, T);
        let z = 23; const zufall = () => { z = (z * 1103515245 + 12345) & 0x7fffffff; return z / 0x7fffffff; };
        for (let i = 0; i < 40; i++) { const x = OX + T + zufall() * (COLS - 2) * T, y = OY + T + zufall() * (ROWS - 2) * T; g.fillStyle([0xffffff, 0xffe066, 0xff8fb1][i % 3], 0.9).fillCircle(x, y, 2.5); }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (!wall(c, r)) continue; const x = OX + c * T, y = OY + r * T;
          g.fillStyle(0x2f7d32).fillRect(x, y, T, T); g.fillStyle(0x4caf50).fillRoundedRect(x + (wall(c - 1, r) ? 0 : 5), y + (wall(c, r - 1) ? 0 : 5), T - (wall(c - 1, r) ? 0 : 5) - (wall(c + 1, r) ? 0 : 5), T - (wall(c, r - 1) ? 0 : 5) - (wall(c, r + 1) ? 0 : 7), 8);
          for (let i = 0; i < 5; i++) g.fillStyle(0x66bb6a, 0.9).fillCircle(x + 6 + zufall() * (T - 12), y + 6 + zufall() * (T - 14), 3 + zufall() * 3); }
        // Wimpelkette oben und unten
        const farben = [0xe03a2f, 0xf7cf2d, 0x2f6fde, 0xf58a1f, 0xffffff];
        for (const y of [OY + T - 6, OY + (ROWS - 1) * T + 6]) for (let i = 0; i < 26; i++) { const x = OX + T + i * ((COLS - 2) * T / 26) + 8; g.fillStyle(farben[i % 5]).fillTriangle(x, y, x + 20, y, x + 10, y + (y < H / 2 ? 16 : -16)); }
        // Note für die Anzeige
        const n = this.make.graphics({ add: false }); n.fillStyle(0x7d3fc0).fillEllipse(40, 92, 44, 32).fillEllipse(92, 78, 44, 32).fillRect(56, 20, 9, 74).fillRect(108, 8, 9, 72); n.fillTriangle(56, 20, 117, 6, 117, 26).fillTriangle(56, 20, 56, 40, 117, 26);
        n.generateTexture('nota', 124, 112); n.destroy();
      }

      zu(c, r) { return wall(c, r) || this.toepfe.some(t => t.c === c && t.r === r); }
      besetzt(c, r, ohneEnde) { const n = this.schlange.length - (ohneEnde ? 1 : 0); for (let i = 1; i < n; i++) if (this.schlange[i].c === c && this.schlange[i].r === r) return i; return 0; }
      rufen() { if (this.ziel && !this.over) this.api.say(`Agora ${this.ziel.name}!`); }
      freiePlaetze(fern) { const k = this.schlange[0], aus = [];
        for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) { if (this.zu(c, r) || Math.abs(c - k.c) + Math.abs(r - k.r) < fern) continue; if (this.schlange.some(s => s.c === c && s.r === r) || this.stehen.some(s => Math.abs(s.c - c) + Math.abs(s.r - r) < 3)) continue; aus.push([c, r]); }
        return aus; }
      hinstellen(gast) { const frei = this.freiePlaetze(4); if (!frei.length) return null; const [c, r] = Phaser.Utils.Array.GetRandom(frei), s = this.stein(gast.id, gast.farbe, c, r);
        s.cont.setScale(0); this.tweens.add({ targets: s.cont, scale: 1, duration: 300, ease: 'Back.out' }); Object.assign(s, gast); this.stehen.push(s); return s; }
      neuesZiel() {
        this.fehler = 0; this.seit = 0; this.stehen.forEach(s => s.ring.setVisible(false));
        if (!this.warten.length) return this.gewonnen();
        // Ziel: am liebsten jemand, der schon auf der Wiese steht (dann hat das Kind die Wahl), sonst der Nächste aus der Liste
        let z = Phaser.Utils.Array.GetRandom(this.stehen) || null;
        if (!z) z = this.hinstellen(this.warten[0]);
        this.ziel = z;
        // bis zu drei Gäste gleichzeitig auf der Wiese
        for (const g of this.warten) { if (this.stehen.length >= Math.min(3, this.warten.length)) break; if (!this.stehen.some(s => s.id === g.id)) this.hinstellen(g); }
        this.blase.setText(this.api.reader ? `🔊 Agora ${z.name}!` : '🔊'); this.rufen();
      }
      schritt() {
        const k = this.schlange[0], frei = d => d && !this.zu(k.c + d[0], k.r + d[1]), rueck = d => d[0] === -this.dir[0] && d[1] === -this.dir[1];
        if (window.OLA_FILA_AUTO) { const a = this.auto(); if (a) this.wants = [{ d: a, alt: 0 }]; }
        // vorgemerkte Richtung nehmen: rückwärts und „weiter geradeaus“ fallen weg; ist sie gerade versperrt (Hecke, Topf daneben),
        // bleibt sie noch zwei Schritte gemerkt und Rute biegt ab, sobald dort frei ist
        let d = this.dir;
        while (this.wants.length) { const w = this.wants[0];
          if (rueck(w.d) || (w.d[0] === this.dir[0] && w.d[1] === this.dir[1])) { this.wants.shift(); continue; }
          if (frei(w.d)) { d = w.d; this.wants.shift(); } else if (++w.alt > 2) { this.wants.shift(); continue; }
          break; }
        if (!frei(d)) { // angestoßen: ein Herz weniger, danach biegt Rute von selbst ab, dorthin, wo mehr Platz ist und niemand steht
          if (this.safe <= 0 && !this.over) { this.rempler(k.c + d[0], k.r + d[1]); return; } // erst zeigen, was passiert ist; abgebogen wird beim nächsten Schritt
          const seiten = [[-d[1], d[0]], [d[1], -d[0]]].filter(frei).sort((a, b) => (this.besetzt(k.c + a[0], k.r + a[1], true) ? 1 : 0) - (this.besetzt(k.c + b[0], k.r + b[1], true) ? 1 : 0) || Math.abs(k.c + a[0] - COLS / 2) + Math.abs(k.r + a[1] - ROWS / 2) - Math.abs(k.c + b[0] - COLS / 2) - Math.abs(k.r + b[1] - ROWS / 2));
          d = seiten[0] || [-d[0], -d[1]]; }
        this.dir = d;
        const nc = k.c + d[0], nr = k.r + d[1], treffer = this.besetzt(nc, nr, true); // der Letzte rückt gerade weg, seine Kachel ist frei
        if (treffer && this.safe <= 0 && !this.over) { this.knall(cx(nc), cy(nr), '💫'); this.durcheinander(treffer); }
        // alle rücken eine Kachel weiter, jeder auf den Platz seines Vordermanns
        const alt = this.schlange.map(s => [s.c, s.r]);
        this.schlange.forEach((s, i) => { s.ac = s.c; s.ar = s.r; if (i === 0) { s.c = nc; s.r = nr; } else { s.c = alt[i - 1][0]; s.r = alt[i - 1][1]; } });
        const g = this.stehen.find(s => s.c === nc && s.r === nr);
        if (g) { if (g === this.ziel) this.abholen(g); else if (!(g.sperre > this.time.now)) { g.sperre = this.time.now + 2000; this.fehler++; B.play(this, 'honk', { volume: 0.4 }); // der falsche Gast kommt einfach nicht mit, sonst passiert nichts
          const x = this.add.text(g.cont.x, g.cont.y - 62, '❌', { fontSize: '30px' }).setOrigin(0.5).setDepth(120); this.tweens.add({ targets: x, alpha: 0, y: x.y - 20, duration: 900, onComplete: () => x.destroy() });
          this.tweens.add({ targets: g.cont, angle: { from: -14, to: 14 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => g.cont.setAngle(0) }); this.time.delayedCall(500, () => this.rufen()); } }
      }
      abholen(g) {
        this.stehen = this.stehen.filter(s => s !== g); this.warten = this.warten.filter(w => w.id !== g.id); g.ring.setVisible(false);
        const ende = this.schlange[this.schlange.length - 1]; g.c = g.ac = ende.ac; g.r = g.ar = ende.ar; this.schlange.push(g); // auf die Kachel, die der bisherige Letzte gerade verlassen hat
        this.tweens.add({ targets: g.cont, x: cx(g.c), y: cy(g.r) + 14, duration: 260, ease: 'Cubic.out' });
        B.play(this, 'collect', { volume: 0.5 }); this.hud.setScore(this.schlange.length - 1); B.plus(this, cx(g.c), cy(g.r) - 30, '♪', '#7d3fc0');
        this.tempo = Math.min(4.7, 3.1 + (this.schlange.length - 1) * 0.14); if (this.schlange.length - 1 >= 4 && this.toepfe.length < 2) this.topf();
        this.time.delayedCall(500, () => { if (!this.over) this.neuesZiel(); });
      }
      durcheinander(ab) {
        const weg = this.schlange.splice(ab); this.hud.setLives(this.hud.lives - 1); this.hud.setScore(this.schlange.length - 1); B.play(this, 'bonk', { volume: 0.6 }); this.cameras.main.shake(200, 0.006); this.safe = 1.5;
        weg.forEach(s => { this.tweens.add({ targets: s.cont, angle: 360, alpha: 0, scale: 0.4, duration: 450, onComplete: () => s.cont.destroy() }); this.warten.push({ id: s.id, name: s.name, farbe: s.farbe }); });
        if (this.hud.lives <= 0) this.schluss(); else this.api.say('Ups!');
      }
      // an der Hecke knallt es am Wiesenrand, nicht auf der Hecke
      rempler(c, r) { const k = this.schlange[0], rand = wall(c, r); this.knall(rand ? cx(c) - (c - k.c) * (T / 2 + 14) : cx(c), rand ? cy(r) - (r - k.r) * (T / 2 + 14) : cy(r), '💥'); this.hud.setLives(this.hud.lives - 1); B.play(this, 'bonk', { volume: 0.6 }); this.cameras.main.shake(200, 0.006); this.safe = 1.2; if (this.hud.lives <= 0) this.schluss(); else this.api.say('Ups!'); }
      // zeigen, wo und warum ein Herz verloren geht: rotes Feld und Zeichen an der Stelle, 💔 bei den Herzen, kurze Pause
      knall(x, y, zeichen) { const q = this.add.circle(x, y, 26, 0xff3b30, 0.65).setDepth(8); this.tweens.add({ targets: q, alpha: 0, duration: 220, yoyo: true, repeat: 2, onComplete: () => q.destroy() });
        const z = this.add.text(x, y - 4, zeichen, { fontSize: '44px' }).setOrigin(0.5).setDepth(120); this.tweens.add({ targets: z, scale: 1.5, duration: 280, yoyo: true, onComplete: () => this.tweens.add({ targets: z, alpha: 0, y: y - 44, duration: 400, onComplete: () => z.destroy() }) });
        B.plus(this, 78, 74, '💔', '#e03a2f'); this.frozen = true; this.time.delayedCall(950, () => { if (!this.over) this.frozen = false; }); }
      schluss() { this.over = true; this.frozen = true; if (this.music) this.music.stop(); B.play(this, 'lose', { volume: 0.5 }); this.time.delayedCall(2000, () => this.api.end({ score: `🎶 ${this.schlange.length - 1}` })); }
      // ein Blumentopf als Hindernis: nicht am Rand, weit weg von Rute und nicht in ihrer Reihe oder Spalte
      topf() { const frei = this.freiePlaetze(5).filter(([c, r]) => c > 2 && c < COLS - 3 && r > 2 && r < ROWS - 3 && r !== this.schlange[0].r && c !== this.schlange[0].c); if (!frei.length) return; const [c, r] = Phaser.Utils.Array.GetRandom(frei), g = this.add.graphics().setDepth(5);
        g.fillStyle(0x7a4a22, 0.25).fillEllipse(0, 16, 40, 12); g.fillStyle(0xc8642d).fillRoundedRect(-15, -4, 30, 8, 3); g.fillStyle(0xb5562a); g.fillPoints([{ x: -13, y: 4 }, { x: 13, y: 4 }, { x: 9, y: 20 }, { x: -9, y: 20 }], true);
        g.fillStyle(0x3e9b3e).fillCircle(-7, -9, 8).fillCircle(7, -10, 8).fillCircle(0, -15, 9); [[-8, -12], [7, -14], [0, -19]].forEach(([x, y], i) => g.fillStyle([0xff5d8f, 0xffe066, 0xffffff][i]).fillCircle(x, y, 4));
        g.setPosition(cx(c), cy(r)).setScale(0); this.tweens.add({ targets: g, scale: 1.15, duration: 350, ease: 'Back.out' }); this.toepfe.push({ c, r }); }
      gewonnen() {
        this.over = true; this.ziel = null; this.blase.setText('🎉'); B.play(this, 'win', { volume: 0.6 }); this.api.say('Que festa!');
        this.add.particles(0, 0, 'star', { x: { min: 0, max: W }, y: -10, speedY: { min: 120, max: 240 }, rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1.2 }, lifespan: 4000, frequency: 80 }).setDepth(203);
        this.time.delayedCall(5000, () => { if (this.music) this.music.stop(); this.api.end({ score: `🎶 ${this.schlange.length - 1}` }); }); // die Schlange tanzt noch eine Runde weiter
      }
      // Autopilot für Tests: kürzester Weg zum gerufenen Gast, ohne Hecke und eigene Schlange
      auto() {
        const k = this.schlange[0], z = this.ziel; if (!z) return null;
        const seen = new Set([k.c + ',' + k.r]), q = [[k.c, k.r, null]];
        while (q.length) { const [c, r, erst] = q.shift(); if (erst && c === z.c && r === z.r) return erst;
          for (const d of DIRS) { const nc = c + d[0], nr = r + d[1], key = nc + ',' + nr; if (this.zu(nc, nr) || seen.has(key) || this.besetzt(nc, nr, false)) continue; if (!erst && d[0] === -this.dir[0] && d[1] === -this.dir[1]) continue; seen.add(key); q.push([nc, nr, erst || d]); } }
        return null;
      }

      update(time, delta) {
        const dt = Math.min(0.05, delta / 1000);
        if (!this.frozen) {
          if (this.safe > 0) this.safe -= dt;
          this.t += dt * this.tempo; while (this.t >= 1 && !this.frozen) { this.t -= 1; this.schritt(); }
          if (!this.over && this.ziel) { this.seit += dt; if (this.fehler >= 2 || this.seit > 9) this.ziel.ring.setVisible(Math.floor(time / 250) % 2 === 0); } // Hilfe: der Richtige blinkt
        }
        // gleiten von der alten zur neuen Kachel; die Schlange wippt wie beim Tanzen
        const f = this.frozen ? 1 : this.t;
        this.schlange.forEach((s, i) => { const x = cx(s.ac) + (cx(s.c) - cx(s.ac)) * f, y = cy(s.ar) + (cy(s.r) - cy(s.ar)) * f;
          if (!this.tweens.isTweening(s.cont)) s.cont.setPosition(x, y + 14 + Math.sin(time / 110 + i * 1.3) * 2.5); s.cont.setDepth(10 + y / 1000); s.im.setAngle(Math.sin(time / 160 + i) * 5);
          const dx = s.c - s.ac; if (dx) s.im.setFlipX(dx < 0); });
        this.schlange[0].cont.setAlpha(this.safe > 0 ? 0.55 + 0.45 * Math.sin(time / 60) : 1);
        // Warnung: ist eine der beiden Kacheln vor Rute versperrt (Hecke, Blumentopf, eigene Schlange), blinkt sie rot
        let w = null; const k0 = this.schlange[0]; if (!this.frozen && !this.over) for (let i = 1; i <= 2 && !w; i++) { const c = k0.c + this.dir[0] * i, r = k0.r + this.dir[1] * i; if (this.zu(c, r) || this.besetzt(c, r, true)) w = [c, r]; }
        const an = !!w && Math.floor(time / 130) % 2 === 0, rand = !!w && wall(w[0], w[1]);
        this.warn.setVisible(an && !rand); this.warnRand.setVisible(an && rand);
        if (w && !rand) this.warn.setPosition(cx(w[0]), cy(w[1]));
        if (w && rand) this.warnRand.setPosition(cx(w[0]) - this.dir[0] * (T / 2 + 6), cy(w[1]) - this.dir[1] * (T / 2 + 6)).setAngle(this.dir[0] ? 90 : 0);
        this.stehen.forEach(s => s.cont.setDepth(10 + s.cont.y / 1000));
      }
    };
  }
})();
