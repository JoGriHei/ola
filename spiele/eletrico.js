// O elétrico 28: Die gelbe Straßenbahn fährt durch Lissabon, Pipo ist der Fahrer. Ein Fahrgast sagt, wohin er will
// („Quero ir ao castelo!“). Rechter Hebel = Gas, linker = Bremse (steht die Bahn, fährt sie mit der Bremse sofort zurück;
// wer aus der Fahrt heraus bremst und weiter hält, fährt nach kurzem Halt zurück).
// An den Haltestellen stehen Schilder mit Bildern (Burg, Strand, Markt, …). Hält die Bahn am richtigen Schild, steigt der
// Fahrgast aus, bedankt sich und der nächste steigt ein; dafür gibt es einen Stempel auf Pipos Fahrkarte. Zu spät gebremst
// ist nicht schlimm: „Ups! Passámos a paragem!“ und zurückfahren; wer einfach weiterfährt, bekommt das Ziel nach vier bis acht Haltestellen wieder. Falsches Schild: „Não é aqui!“. 6 Fahrgäste = Runde vorbei.
// Unterwegs: Tauben oder ein Auto auf den Schienen (Glocke 🔔 läuten, sonst bremst die Bahn von selbst und hält mit Abstand davor;
// die Tauben fliegen flatternd auf, das Auto fährt mit
// Motorgeräusch zur Seite weg), Ampeln (rot, bis die Bahn davor gewartet hat; wer bei Rot durchfährt, wird von der
// Polizistin angehalten und muss sich entschuldigen: Sprechblase 🙏 „Desculpa!“ antippen).
// Alles, was unterwegs kommt, entsteht weit vor der Bahn (nie mitten im Bild); am rechten Rand kündigt ein kleines Zeichen
// an, was als Nächstes kommt. Die Abstände der Haltestellen sind gemischt (2200 bis 5000 px, meist mittel); das Ziel ist die
// erste, zweite oder selten die dritte Haltestelle.
// Hintergrund: die Bilder kommen nacheinander von rechts wie auf einer Fahrt (nie gespiegelt), mit weichem Übergang,
// vor dem ein großer Baum steht.
// Bilder: bilder/spiele/eletrico, destino-*, gast-* (Fahrgast im Fenster), gast-pipo (Fahrer), fundo-rua/-colinas/-rio,
// tram-pombos, tram-carro, tram-policia. Sätze: saetze-extra.json (jogo-eletrico).
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.eletrico = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#bfe3ff' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  // Ziel, Fahrgast (Brustbild gast-*), Wunsch und Dank (jeder Satz mit der Stimme der Figur)
  const TRIPS = [
    { d: 'castelo', g: 'leo', ask: 'Quero ir ao castelo!', thanks: 'Cheguei ao castelo! Obrigado, Pipo!' },
    { d: 'praia', g: 'ines', ask: 'Quero ir à praia!', thanks: 'Cheguei à praia! Obrigada, Pipo!' },
    { d: 'mercado', g: 'avo-oma', ask: 'Quero ir ao mercado!', thanks: 'Cheguei ao mercado! Obrigada, Pipo!' },
    { d: 'escola', g: 'ada', ask: 'Quero ir à escola!', thanks: 'Cheguei à escola! Obrigada, Pipo!' },
    { d: 'igreja', g: 'avo-opa', ask: 'Quero ir à igreja!', thanks: 'Cheguei à igreja! Obrigado, Pipo!' },
    { d: 'parque', g: 'benni', ask: 'Quero ir ao parque!', thanks: 'Cheguei ao parque! Obrigado, Pipo!' },
    { d: 'rio', g: 'rute', ask: 'Quero ir ao rio!', thanks: 'Cheguei ao rio! Obrigada, Pipo!' },
  ];
  const DEST = TRIPS.map(t => t.d), GOAL = 6;
  // Tempo: in der Ebene bis MAXV, bergab bis 30 % schneller, bergauf bis 20 % langsamer
  const MAXV = 760, ACC = 340, BRAKE = 1100, ROLL = 30, BACKV = -190, ZONE = 70, GRAV = 520;
  // Hintergrund: Reihenfolge der Bilder, Breite des weichen Übergangs (Bildpunkte des Bildes), Tempo gegenüber der Strecke
  const BGS = ['fundo-rua', 'fundo-colinas', 'fundo-rio'], SEQ = ['fundo-rua', 'fundo-colinas', 'fundo-rua', 'fundo-rio'], FEATHER = 200, PAR = 0.35;
  const AHEAD = 6500; // so weit voraus wird die Strecke gebaut: alles Neue entsteht weit rechts außerhalb des Bildes

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H, TX = 240, RAIL = 452;
    // Hügel: Höhe der Schiene an der Stelle x (sanfte Wellen wie in Lissabon); größer = tiefer im Bild
    const hill = x => 34 * Math.sin(x / 520) + 18 * Math.sin(x / 233 + 1.3) + 22 * Math.sin(x / 1900 + 0.4);
    const slope = x => (hill(x + 4) - hill(x - 4)) / 8; // > 0: es geht bergab

    return class Eletrico extends Phaser.Scene {
      preload() {
        const api = this.registry.get('api');
        BGS.forEach(k => this.load.image(k, B.sprite(api, k)));
        this.load.image('arv0', B.sprite(api, 'arvore')); this.load.image('arv1', B.sprite(api, 'arvore-jacaranda'));
        this.load.image('pombos', B.sprite(api, 'tram-pombos')); this.load.image('pombo', B.sprite(api, 'pombo'));
        this.load.image('carro', B.sprite(api, 'tram-carro'));
        this.load.image('policia', B.sprite(api, 'tram-policia'));
        this.load.image('tram', B.sprite(api, 'eletrico'));
        this.load.image('pipo', B.sprite(api, 'gast-pipo'));
        DEST.forEach(d => this.load.image('d-' + d, B.sprite(api, 'destino-' + d)));
        TRIPS.forEach(t => this.load.image('g-' + t.g, B.sprite(api, 'gast-' + t.g)));
        ['sino-eletrico', 'travao', 'portas', 'win', 'collect', 'music-eletrico', 'honk', 'whoosh', 'motor', 'apito'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        this.api = this.registry.get('api');
        this.x = 0; this.v = 0; this.done = 0; this.over = false; this.busy = false; this.brakeHold = 0;
        B.particles(this);
        // Hintergrund wie auf einer Fahrt: die Bilder kommen nacheinander von rechts (nie gespiegelt);
        // der linke Rand jedes Bildes ist weich ausgeblendet und läuft so in das vorige Bild über
        BGS.forEach(k => {
          if (this.textures.exists(k + '-weich')) return;
          const img = this.textures.get(k).getSourceImage(), ct = this.textures.createCanvas(k + '-weich', img.width, img.height), c = ct.getContext();
          c.drawImage(img, 0, 0); c.globalCompositeOperation = 'destination-in';
          const gr = c.createLinearGradient(0, 0, FEATHER, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
          c.fillStyle = gr; c.fillRect(0, 0, img.width, img.height); c.globalCompositeOperation = 'source-over'; ct.refresh();
        });
        const src = this.textures.get(BGS[0]).getSourceImage();
        this.bgSc = (RAIL + 90) / src.height; // bis unter die Schienen, damit bei Senken kein Himmel durchscheint
        this.bgStep = (src.width - FEATHER) * this.bgSc;
        this.bgPool = [0, 1, 2].map(() => this.add.image(0, 0, BGS[0] + '-weich').setOrigin(0).setScale(this.bgSc));
        // vor jedem Übergang steht ein großer Baum (verdeckt die Stelle, an der zwei Bilder ineinanderlaufen)
        this.bgTrees = [0, 1, 2].map(() => this.add.image(0, RAIL + 80, 'arv0').setOrigin(0.5, 1));
        this.events = []; this.lastStopX = 0;
        // Boden und Schienen (jedes Bild neu gezeichnet, folgen den Hügeln)
        this.ground = this.add.graphics().setDepth(2);
        this.stopsG = this.add.container(0, 0).setDepth(3);
        this.stops = []; this.nextStopX = 2200; this.trip = null; this.needTarget = false;
        // Straßenbahn mit Pipo vorn und Fahrgast im Fenster
        const t = this.add.image(0, 0, 'tram'); const ts = 330 / t.width; t.setScale(ts).setOrigin(0.5, 1);
        this.tramW = t.displayWidth; this.tramH = t.displayHeight;
        this.pipo = this.add.image(this.tramW * 0.36, -this.tramH * 0.52, 'pipo').setOrigin(0.5, 0.5);
        this.pipo.setScale((this.tramH * 0.26) / this.pipo.height);
        this.guest = this.add.image(-this.tramW * 0.12, -this.tramH * 0.5, 'g-leo').setOrigin(0.5, 0.5);
        this.tram = this.add.container(TX, RAIL, [t, this.pipo, this.guest]).setDepth(5); // Pipo und Fahrgast vor den Fenstern
        // Fahrkarte mit Stempeln oben rechts
        this.stamps = [];
        const card = this.add.graphics().setDepth(20).setScrollFactor(0);
        card.fillStyle(0xfff6d6).fillRoundedRect(W - 330, 14, 316, 64, 12).lineStyle(3, 0xd9b44a).strokeRoundedRect(W - 330, 14, 316, 64, 12);
        this.add.text(W - 318, 46, '🎫', { fontSize: '30px' }).setOrigin(0, 0.5).setDepth(21);
        for (let i = 0; i < GOAL; i++) {
          const c = this.add.circle(W - 262 + i * 42, 46, 16, 0xffffff).setStrokeStyle(2, 0xd9b44a).setDepth(21);
          this.stamps.push(c);
        }
        // Sprechblase des Fahrgasts oben links (antippen = noch einmal hören)
        this.bub = this.add.graphics().setDepth(20);
        this.bubIcon = this.add.image(0, 0, 'd-castelo').setDepth(21);
        this.bubText = this.add.text(0, 0, '🔊', { fontFamily: 'sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#1b4fa0' }).setOrigin(0, 0.5).setDepth(21);
        this.add.zone(160, 50, 300, 80).setInteractive({ useHandCursor: true }).setDepth(22).on('pointerdown', () => this.sayTrip());
        // Vorschau am rechten Rand: was als Nächstes kommt (Schild der Haltestelle, Ampel, Auto, Tauben)
        this.hintIcon = this.add.image(0, 0, 'd-castelo');
        this.hintTxt = this.add.text(0, 0, '', { fontSize: '34px' }).setOrigin(0.5);
        this.hint = this.add.container(W - 48, 190, [
          this.add.circle(0, 0, 34, 0xffffff, 0.94).setStrokeStyle(4, 0x2b3a55),
          this.hintIcon, this.hintTxt,
          this.add.triangle(0, 50, 0, 0, 18, 7, 0, 14, 0x2b3a55),
        ]).setDepth(19).setAlpha(0);
        // Hebel: links Bremse, rechts Gas (gedrückt halten); Pfeiltasten gehen auch
        this.gas = false; this.brake = false;
        const lever = (x, label, key) => {
          const g = this.add.circle(x, H - 62, 52, key === 'gas' ? 0x2fae5f : 0xe0574f).setStrokeStyle(6, 0xffffff).setDepth(30).setInteractive();
          this.add.text(x, H - 62, label, { fontSize: '46px' }).setOrigin(0.5).setDepth(31);
          g.on('pointerdown', () => { this[key] = true; g.setScale(0.92); }).on('pointerup', () => { this[key] = false; g.setScale(1); }).on('pointerout', () => { this[key] = false; g.setScale(1); });
          return g;
        };
        this.gasBtn = lever(W - 80, '▶️', 'gas'); this.brakeBtn = lever(80, '✋', 'brake');
        // Glocke: verscheucht Tauben und Autos auf den Schienen
        const bell = this.add.circle(W / 2, H - 52, 40, 0xffd34d).setStrokeStyle(5, 0xffffff).setDepth(30).setInteractive();
        this.add.text(W / 2, H - 52, '🔔', { fontSize: '38px' }).setOrigin(0.5).setDepth(31);
        bell.on('pointerdown', () => { bell.setScale(0.9); this.ringBell(); }).on('pointerup', () => bell.setScale(1)).on('pointerout', () => bell.setScale(1));
        this.input.keyboard.on('keydown-SPACE', () => this.ringBell());
        this.keys = this.input.keyboard.createCursorKeys();
        if (this.cache.audio.exists('music-eletrico')) { this.music = this.sound.add('music-eletrico', { loop: true, volume: 0.28 }); this.music.play(); }
        this.trips = Phaser.Utils.Array.Shuffle(TRIPS.slice());
        while (this.nextStopX < this.x + AHEAD) this.addStop(); // die ersten Haltestellen stehen schon, bevor jemand einsteigt
        this.newTrip(true);
      }

      // nächster Fahrgast steigt ein
      newTrip(first) {
        this.trip = this.trips[this.done % this.trips.length];
        this.guest.setTexture('g-' + this.trip.g); this.guest.setScale((this.tramH * 0.42) / this.guest.height);
        this.guest.setAlpha(0); this.tweens.add({ targets: this.guest, alpha: 1, duration: 400 });
        this.missedAt = null; this.wrongAt = null; this.tripX = this.x; this.targetIn = 0;
        // die Haltestelle, an der die Bahn gerade steht, zählt erst wieder, wenn sie weggefahren ist
        this.ignore = this.stops.find(s => Math.abs(s.x - this.x) < ZONE) || null;
        // Ziel: eine der nächsten drei Haltestellen, die noch nicht zu sehen sind (mal die erste, mal eine spätere);
        // nur dort wird das Schild getauscht, nie an einer sichtbaren Haltestelle
        const ahead = this.stops.filter(s => s.x > this.x + ZONE);
        if (!ahead.some(s => s.d === this.trip.d)) {
          const far = ahead.filter(s => s.x > this.x + 900 && s.x < this.x + 9500).slice(0, 3); // nie weiter als etwa 12 Sekunden Fahrt
          if (far.length) { const r = Math.random(), s = far[Math.min(far.length - 1, r < 0.5 ? 0 : r < 0.88 ? 1 : 2)]; this.setDest(s, this.trip.d); }
          else this.needTarget = true;
        }
        this.drawBubble();
        this.time.delayedCall(first ? 400 : 200, () => { B.play(this, 'sino-eletrico', { volume: 0.5 }); this.time.delayedCall(500, () => this.sayTrip()); });
      }
      setDest(s, d) { s.d = d; s.icon.setTexture('d-' + d); s.icon.setScale(78 / s.icon.width); }
      // die Haltestelle, zu der der Fahrgast will (die nächste mit seinem Schild, von der Einstiegsstelle aus gesehen)
      target() { return this.trip ? this.stops.find(s => s.d === this.trip.d && s !== this.ignore && s.x > this.tripX + ZONE) : null; }
      sayTrip() { if (this.trip) this.api.say(this.trip.ask); }
      drawBubble() {
        const reader = this.api.reader, w = reader ? 330 : 170;
        this.bub.clear().fillStyle(0xffffff).fillRoundedRect(14, 12, w, 76, 22).lineStyle(4, 0xc9d4ee).strokeRoundedRect(14, 12, w, 76, 22);
        this.bubIcon.setTexture('d-' + this.trip.d).setPosition(58, 50); this.bubIcon.setScale(60 / this.bubIcon.width);
        this.bubText.setPosition(96, 50).setText(reader ? '🔊 ' + this.trip.ask : '🔊');
        this.bubText.setFontSize(reader ? 20 : 28);
      }

      // Abstand zur nächsten Haltestelle: gemischt kurz, mittel und lang
      gap() { const r = Math.random(); return r < 0.25 ? Phaser.Math.Between(2200, 2800) : r < 0.75 ? Phaser.Math.Between(3000, 3900) : Phaser.Math.Between(4200, 5000); }
      addStop() {
        const x = this.nextStopX; this.nextStopX += this.gap();
        // zwischen der letzten und dieser Haltestelle: auf kurzen Strecken nichts, sonst ein oder zwei Dinge unterwegs
        const gap = x - this.lastStopX, kinds = Phaser.Utils.Array.Shuffle(['pombos', 'carro', 'semaforo']);
        const n = gap < 2900 ? (Math.random() < 0.5 ? 1 : 0) : gap > 4000 && Math.random() < 0.6 ? 2 : 1;
        if (window.OLA_DEBUG && window.OLA_TRAM_ROT) kinds.unshift('semaforo'); // nur Testseite (_test?tramrot): immer zuerst eine Ampel
        for (let i = 0; i < n; i++) this.addEvent(this.lastStopX + gap * (n === 1 ? Phaser.Math.FloatBetween(0.4, 0.6) : i ? 0.68 : 0.34), kinds[i]);
        this.lastStopX = x;
        let d;
        if (this.trip && this.needTarget) { d = this.trip.d; this.needTarget = false; }
        else if (this.trip && this.targetIn > 0 && --this.targetIn === 0) d = this.trip.d; // verpasstes Ziel kommt wieder
        else { const last = this.stops[this.stops.length - 1]; d = Phaser.Utils.Array.GetRandom(DEST.filter(z => z !== (this.trip && this.trip.d) && z !== (last && last.d))); }
        const pole = this.add.rectangle(0, 0, 8, 236, 0x2b3a55).setOrigin(0.5, 1);
        const disk = this.add.circle(0, -262, 44, 0xffffff).setStrokeStyle(5, 0x2b3a55);
        const icon = this.add.image(0, -262, 'd-' + d); icon.setScale(78 / icon.width);
        const mark = this.add.rectangle(0, 6, ZONE * 2, 10, 0xffd34d, 0.75).setOrigin(0.5, 0);
        const c = this.add.container(0, 0, [mark, pole, disk, icon]).setVisible(false);
        this.stopsG.add(c);
        this.stops.push({ x, d, c, icon, mark });
      }

      // Dinge unterwegs: Tauben und Auto blockieren die Schienen, bis die Glocke läutet; die Ampel ist rot, bis die Bahn davor gewartet hat
      addEvent(x, kind) {
        if (x < 600 || x < this.x + 900) return; // nie im Bild oder kurz davor entstehen lassen
        const c = this.add.container(0, 0).setDepth(4).setVisible(false), e = { x, kind, c, active: true, said: false, state: 'idle', wait: 0 };
        if (kind === 'pombos') { const o = this.add.image(0, 2, 'pombos').setOrigin(0.5, 1); o.setScale(120 / o.width); c.add(o); e.o = o; }
        else if (kind === 'carro') { const o = this.add.image(0, 4, 'carro').setOrigin(0.5, 1); o.setScale(170 / o.width); c.add(o); e.o = o; e.x += 40; }
        else {
          const pole = this.add.rectangle(0, 0, 8, 200, 0x2b3a55).setOrigin(0.5, 1);
          const box = this.add.rectangle(0, -228, 40, 92, 0x1f2633).setStrokeStyle(3, 0x2b3a55);
          e.red = this.add.circle(0, -254, 13, 0x5a2222); e.yel = this.add.circle(0, -228, 13, 0x5a4a1e); e.grn = this.add.circle(0, -202, 13, 0x1f6b3a);
          c.add([pole, box, e.red, e.yel, e.grn]); e.active = false;
          this.light(e, 'red'); // schon rot, wenn sie ins Bild kommt
        }
        this.events.push(e);
      }
      light(e, st) {
        e.state = st;
        e.red.setFillStyle(st === 'red' ? 0xff3b30 : 0x5a2222); e.grn.setFillStyle(st === 'green' ? 0x34d058 : 0x1f6b3a);
      }
      ringBell() {
        if (this.over) return;
        B.play(this, 'sino-eletrico', { volume: 0.55 });
        for (const e of this.events) {
          const d = e.x - this.x;
          if (!e.active || e.rung || d < -40 || d > 900) continue;
          e.rung = true;
          if (e.kind === 'pombos') { // fliegen davon
            e.active = false;
            B.play(this, 'whoosh', { volume: 0.5 });
            e.o.setVisible(false);
            [[-40, -150, -330], [0, 30, -380], [40, 210, -300]].forEach(([x0, dx, dy], i) => {
              const b = this.add.image(x0, -34, 'pombo').setOrigin(0.5), sc = 80 / b.width;
              b.setScale(dx > 100 ? -sc : sc, sc); e.c.add(b); // das Bild schaut nach links; die rechte Taube fliegt nach rechts
              this.tweens.add({ targets: b, scaleY: sc * 0.55, duration: 85, yoyo: true, repeat: -1 }); // Flügelschlag
              this.tweens.add({ targets: b, x: x0 + dx, y: -34 + dy, duration: 1100 + i * 120, ease: 'Sine.easeIn' });
              this.tweens.add({ targets: b, alpha: 0, duration: 350, delay: 800 + i * 120, onComplete: () => { this.tweens.killTweensOf(b); b.destroy(); } });
            });
            const f = this.add.particles(e.c.x, e.c.y - 30, 'dot', { speed: { min: 40, max: 130 }, angle: { min: 200, max: 340 }, gravityY: 160, lifespan: 700, scale: { start: 0.5, end: 0 }, tint: 0xc9ced6, emitting: false }).setDepth(4);
            f.explode(10); this.time.delayedCall(900, () => f.destroy()); // ein paar Federn
          } else if (e.kind === 'carro') { // fährt mit Motorgeräusch zur Seite weg und löst sich dabei auf
            this.time.delayedCall(250, () => { B.play(this, 'motor', { volume: 0.5 });
              this.tweens.add({ targets: e.o, x: e.o.x + 110, y: e.o.y - 30, scaleX: e.o.scaleX * 0.7, scaleY: e.o.scaleY * 0.7, alpha: 0, duration: 1100, ease: 'Sine.easeIn' }); });
            this.time.delayedCall(800, () => { e.active = false; }); // die Schienen sind frei, sobald es zur Seite gerollt ist
          }
        }
      }
      trackEvents(dt) {
        const front = this.tramW * 0.5;
        for (const e of this.events) {
          const sx = e.x - this.x + TX; e.c.setPosition(sx, RAIL + hill(e.x)); e.c.setVisible(sx > -300 && sx < W + 300);
          const d = e.x - this.x - front; // Abstand vor der Bahnspitze
          if (e.kind === 'semaforo') {
            if (e.state === 'red') {
              if (!e.said && d < 640 && d > 0 && this.v > 60) { e.said = true; this.api.say('Está vermelho! Temos de parar!'); }
              // vor der roten Ampel stehen bleiben: nach kurzem Warten wird sie grün; bei Rot durchfahren: Polizei
              if (Math.abs(this.v) < 3 && d > -30 && d < 420) { e.wait += dt; if (e.wait > 1.3) { this.light(e, 'green'); this.api.say('Verde! Vamos!'); } }
              else if (d < -30 && this.v > 0 && !this.busy) this.police(e);
            }
            continue;
          }
          if (!e.active) continue;
          if (!e.said && d < 640) { e.said = true; this.api.say(e.kind === 'pombos' ? 'Cuidado, pombos! Toca a campainha!' : 'Um carro nos carris! Toca a campainha!'); }
          // davor stehen bleiben: die Bahn bremst von selbst kräftig ab und hält mit Abstand vor dem Hindernis (nie hineinfahren)
          const halt = e.o.displayWidth / 2 + 34, frei = d - halt;
          if (this.v > 0) {
            const vmaxHier = Math.sqrt(2 * 1500 * Math.max(0, frei));
            if (this.v > vmaxHier) { if (!e.braked && this.v > 150) { e.braked = true; B.play(this, 'travao', { volume: 0.35 }); } this.v = vmaxHier; }
            if (frei <= 0) { this.v = 0; this.x = Math.min(this.x, e.x - front - halt); }
          }
        }
        this.events = this.events.filter(e => { if (e.x < this.x - 1400) { e.c.destroy(); return false; } return true; });
      }

      // Bei Rot durchgefahren: Pfiff, die Polizistin hält die Bahn an. Weiter geht es erst, wenn das Kind sich entschuldigt
      // (Sprechblase 🙏 antippen = „Desculpa!“); dann sagt sie „Está bem! Mas cuidado!“, geht zur Seite und die Ampel wird grün.
      police(e) {
        e.state = 'police'; this.busy = true; this.v = 0;
        B.play(this, 'apito', { volume: 0.5 });
        const o = this.textures.exists('policia') ? this.add.image(0, 6, 'policia').setOrigin(0.5, 1) : this.add.text(0, 6, '👮', { fontSize: '120px' }).setOrigin(0.5, 1);
        if (this.textures.exists('policia')) o.setScale(200 / o.height);
        e.c.add(o); o.x = 190; o.alpha = 0;
        this.tweens.add({ targets: o, x: 100, alpha: 1, duration: 450, ease: 'Quad.out' });
        this.time.delayedCall(500, () => this.api.say('Alto! O semáforo está vermelho!'));
        this.time.delayedCall(2300, () => this.askSorry(e, o));
      }
      askSorry(e, o) {
        if (this.over) return;
        const reader = this.api.reader, w = reader ? 270 : 130, x = Math.max(TX + this.tramW * 0.36 - 40, e.x - this.x + TX + 34), y = 126; // neben der Ampel, Zipfel zu Pipo
        const g = this.add.graphics().setDepth(40);
        g.fillStyle(0xffffff).fillRoundedRect(x, y, w, 88, 26).fillTriangle(x + 34, y + 84, x + 70, y + 84, x + 40, y + 120);
        g.lineStyle(5, 0xffb300).strokeRoundedRect(x, y, w, 88, 26);
        const t = this.add.text(x + w / 2, y + 44, reader ? '🙏 Desculpa!' : '🙏', { fontFamily: 'sans-serif', fontSize: reader ? '32px' : '50px', fontStyle: 'bold', color: '#1b4fa0' }).setOrigin(0.5).setDepth(41);
        const pulse = this.tweens.add({ targets: t, scale: 1.14, duration: 420, yoyo: true, repeat: -1 });
        const z = this.add.zone(x + w / 2, y + 50, w + 40, 140).setInteractive({ useHandCursor: true }).setDepth(42);
        let said = false;
        const sorry = () => {
          if (said) return; said = true; z.destroy(); pulse.stop(); t.setScale(1);
          this.api.say('desculpa');
          this.time.delayedCall(1200, () => {
            g.destroy(); t.destroy(); this.api.say('Está bem! Mas cuidado!');
            this.tweens.add({ targets: o, x: o.x + 130, alpha: 0, duration: 800, delay: 1300, onComplete: () => o.destroy() });
            this.time.delayedCall(1700, () => { this.light(e, 'green'); this.busy = false; });
          });
        };
        z.on('pointerdown', sorry);
        if (window.OLA_DEBUG && window.OLA_TRAM_ROT) this.time.delayedCall(1500, sorry); // nur Testseite
      }

      update(time, delta) {
        if (this.over) return;
        const dt = Math.min(0.033, delta / 1000);
        let gas = this.gas || this.keys.right.isDown, brake = this.brake || this.keys.left.isDown;
        // nur Testseite (_test?auto): Autopilot fährt zum Ziel, beim ersten Fahrgast absichtlich vorbei und zurück
        if (window.OLA_DEBUG && window.OLA_TRAM_AUTO) {
          const tgt = this.target(), d = tgt ? tgt.x - this.x : 9999, over = this.done === 0 && !this.wentBack;
          if (over && d < -ZONE - 90) this.wentBack = true;
          let aim = over && !this.wentBack ? d + 400 : d;
          for (const e of this.events) { const de = e.x - this.x - this.tramW * 0.5; if (e.active && !e.rung && de > 0 && de < 500 && !this.autoBell && !window.OLA_TRAM_STUMM) { this.autoBell = true; this.ringBell(); this.time.delayedCall(1500, () => { this.autoBell = false; }); }
            if (e.kind === 'semaforo' && e.state === 'red' && de > -30 && !window.OLA_TRAM_ROT) aim = Math.min(aim, de - 30); }
          gas = aim > 0 && aim > this.v * this.v / (2 * (BRAKE - 80)) + 40; brake = !gas && (aim < 30 || this.v > 5);
          if (this.wentBack && d < -10) { gas = false; brake = true; } // rückwärts zum Schild
          if (this.wentBack && d >= -10 && d < ZONE) { gas = false; brake = this.v > 2; }
        }
        // Fahren: Gas, Bremse, Hügel (bergab schiebt und macht schneller, bergauf bremst), Rollwiderstand
        if (brake && !this.wasBrake) this.brakeFromStop = this.v <= 1; // Bremse neu gedrückt: stand die Bahn schon?
        this.wasBrake = brake;
        if (!this.busy) {
          const sl = slope(this.x), vmax = MAXV * (1 + Phaser.Math.Clamp(sl * 2.2, -0.2, 0.3));
          if (this.v > 0) this.v = Math.max(0, this.v + sl * GRAV * dt);
          if (gas && this.v < vmax) this.v = Math.min(vmax, this.v + ACC * dt);
          if (brake) {
            if (this.v > 0) { // bremst bis zum Stillstand und bleibt dann stehen (auch am Hang)
              if (this.v > 40 && !this.braking) B.play(this, 'travao', { volume: 0.35 });
              this.braking = true; this.brakeHold = 0; this.v = Math.max(0, this.v - BRAKE * dt);
            } else { // steht: rückwärts. Neu gedrückt = sofort; aus der Fahrt heraus gebremst = erst nach kurzem Halten (damit das Halten an der Haltestelle zählt)
              this.brakeHold += dt; if (this.brakeHold > (this.brakeFromStop ? 0.1 : 0.7)) this.v = Math.max(BACKV, this.v - 420 * dt);
            }
          } else { this.braking = false; this.brakeHold = 0; if (this.v < 0) this.v = Math.min(0, this.v + 600 * dt); } // losgelassen: steht fast sofort
          if (!gas && !brake && this.v > 0) this.v = Math.max(0, this.v - ROLL * dt);
          if (this.v > vmax) this.v = Math.max(vmax, this.v - 340 * dt); // nach der Abfahrt langsam zurück aufs normale Tempo
        } else this.v = 0;
        this.x += this.v * dt;
        if (this.x < 0) { this.x = 0; this.v = Math.max(0, this.v); }
        if (window.OLA_DEBUG) window.OLA_TRAM_SZENE = this; // nur Testseite
        if (window.OLA_DEBUG) window.OLA_TRAM = { x: Math.round(this.x), v: Math.round(this.v), done: this.done, stops: this.stops.filter(s => s.x > this.x - ZONE).map(s => [Math.round(s.x), s.d, s.d === this.trip.d]).slice(0, 4),
          events: this.events.map(e => [Math.round(e.x), e.kind, e.state]), gas, brake, busy: this.busy };
        while (this.nextStopX < this.x + AHEAD) this.addStop();

        // Bild: Hintergrund, Schienen, Haltestellen, Bahn
        const off = this.x * PAR, i0 = Math.floor(off / this.bgStep);
        for (let j = 0; j < 3; j++) {
          const i = i0 + j, im = this.bgPool[i % 3];
          if (im.idx !== i) { im.idx = i; im.setTexture(SEQ[i % SEQ.length] + '-weich').setDepth(-1000 + i); } // das spätere Bild liegt über dem früheren
          im.x = i * this.bgStep - FEATHER * this.bgSc - off;
          const tr = this.bgTrees[i % 3];
          if (tr.idx !== i) { tr.idx = i; tr.setTexture('arv' + (i % 2)).setDepth(-1000 + i + 0.5).setVisible(i > 0); tr.setScale(420 / tr.height); }
          tr.x = im.x + FEATHER * this.bgSc * 0.5;
        }
        const g = this.ground.clear();
        g.fillStyle(0xc9b28a); g.beginPath(); g.moveTo(0, H);
        for (let sx = 0; sx <= W; sx += 16) g.lineTo(sx, RAIL + hill(this.x - TX + sx) + 6);
        g.lineTo(W, H); g.closePath(); g.fillPath();
        g.lineStyle(5, 0x6d6d78); g.beginPath();
        for (let sx = 0; sx <= W; sx += 16) { const y = RAIL + hill(this.x - TX + sx); sx ? g.lineTo(sx, y) : g.moveTo(sx, y); }
        g.strokePath();
        g.fillStyle(0x8a6a44);
        for (let wx = Math.floor((this.x - TX) / 40) * 40; wx < this.x - TX + W; wx += 40) { const sx = wx - (this.x - TX); g.fillRect(sx - 3, RAIL + hill(wx) + 2, 6, 10); }
        for (const s of this.stops) { const sx = s.x - this.x + TX; s.c.setPosition(sx, RAIL + hill(s.x)); s.c.setVisible(sx > -200 && sx < W + 200); }
        this.tram.setPosition(TX, RAIL + hill(this.x) + 4).setRotation(Math.atan(slope(this.x)) * 0.9);
        this.tram.y += Math.sin(time / 90) * (Math.abs(this.v) > 20 ? 0.8 : 0); // leichtes Ruckeln beim Fahren
        this.stops = this.stops.filter(s => { if (s.x < this.x - 1200) { s.c.destroy(); return false; } return true; });
        this.trackEvents(dt);
        this.showHint(dt);

        if (this.busy) return;
        // Halten an einer Haltestelle: steht die Bahn im gelben Bereich?
        const here = this.stops.find(s => Math.abs(s.x - this.x) < ZONE);
        if (!here) this.ignore = null;
        if (here && here !== this.ignore && Math.abs(this.v) < 3) {
          this.stillT = (this.stillT || 0) + dt;
          if (this.stillT > 0.4) { this.stillT = 0; this.arrive(here); }
        } else this.stillT = 0;
        // am Ziel vorbeigerauscht: freundlicher Hinweis, zurückfahren
        const tgt = this.target();
        if (tgt && this.x - tgt.x > ZONE + 60 && this.missedAt !== tgt) {
          this.missedAt = tgt; this.api.say('Ups! Passámos a paragem!');
          this.tweens.add({ targets: tgt.mark, alpha: 0.2, duration: 300, yoyo: true, repeat: 5 });
        }
        // weit am Ziel vorbei und immer weiter gefahren: das Ziel kommt wieder, aber nicht gleich, sondern als vierte bis achte
        // Haltestelle voraus (sonst käme es nie mehr: neue Haltestellen meiden das Ziel der laufenden Fahrt)
        if (tgt && this.x - tgt.x > 900 && !tgt.denovo) {
          tgt.denovo = true;
          const voraus = this.stops.filter(s => s.x > this.x + ZONE);
          if (!voraus.some(s => s.d === this.trip.d) && !this.targetIn) {
            const k = Phaser.Math.Between(4, 8);
            if (voraus.length >= k) this.setDest(voraus[k - 1], this.trip.d); else this.targetIn = k - voraus.length; // so viele neue Haltestellen bis zum Ziel
          }
        }
      }

      // Vorschau am rechten Rand: das Nächste, das noch nicht zu sehen ist (höchstens 2000 px voraus)
      showHint(dt) {
        const edge = this.x + (W - TX) + 50;
        let next = null;
        for (const s of this.stops) if (s.x > edge && (!next || s.x < next.x)) next = { x: s.x, tex: 'd-' + s.d, y: -262 };
        for (const e of this.events) if ((e.active || e.state === 'red') && e.x > edge && (!next || e.x < next.x)) next = { x: e.x, emo: e.kind === 'semaforo' ? '🚦' : e.kind === 'carro' ? '🚗' : '🐦', y: -228 };
        const on = !!next && next.x - this.x < 3200;
        this.hint.alpha += ((on ? 1 : 0) - this.hint.alpha) * Math.min(1, dt * 6);
        if (!on) return;
        this.hint.y = Phaser.Math.Clamp(RAIL + hill(next.x) + next.y, 130, 300);
        if (next.tex) { if (this.hintIcon.texture.key !== next.tex) this.hintIcon.setTexture(next.tex); this.hintIcon.setScale(54 / this.hintIcon.width).setVisible(true); this.hintTxt.setVisible(false); }
        else { this.hintIcon.setVisible(false); this.hintTxt.setText(next.emo).setVisible(true); }
      }

      arrive(s) {
        if (s.d === this.trip.d) {
          this.busy = true; this.done++;
          B.play(this, 'portas', { volume: 0.5 });
          const st = this.stamps[this.done - 1];
          this.time.delayedCall(300, () => { B.play(this, 'collect', { volume: 0.6 }); st.setFillStyle(0xe0574f); this.sparkle(st.x, st.y); });
          this.api.say(this.trip.thanks);
          this.tweens.add({ targets: this.guest, alpha: 0, y: this.guest.y - 30, duration: 700, delay: 1600, onComplete: () => { this.guest.y += 30; } });
          this.time.delayedCall(3400, () => {
            if (this.done >= GOAL) return this.finish();
            this.busy = false; this.newTrip(false);
          });
        } else if (this.wrongAt !== s) {
          this.wrongAt = s; B.play(this, 'honk', { volume: 0.4 });
          this.api.say('Não é aqui!');
          this.tweens.add({ targets: this.guest, x: this.guest.x + 6, duration: 60, yoyo: true, repeat: 5 });
        }
      }

      sparkle(x, y) {
        const p = this.add.particles(x, y, 'star', { speed: { min: 60, max: 160 }, lifespan: 600, scale: { start: 1, end: 0 }, emitting: false }).setDepth(25);
        p.explode(14);
        this.time.delayedCall(800, () => p.destroy());
      }

      finish() {
        this.over = true;
        if (this.music) this.music.stop();
        B.play(this, 'win', { volume: 0.7 });
        this.api.say('Fim da viagem! Obrigado a todos!');
        for (const st of this.stamps) this.sparkle(st.x, st.y);
        this.time.delayedCall(2600, () => this.api.end({ score: `🎫 ${this.done}` }));
      }
    };
  }
})();
