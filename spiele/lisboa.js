// Lisboa é nossa!: offene Stadt, schräg von oben. Ada und Selma laufen frei durch ein kleines Lissabon, steigen auf Skate,
// Tuk-Tuk, Auto, Boot und Elétrico um und erledigen Aufträge, die ihnen die Figuren auf Portugiesisch geben (Einkaufen, Foto,
// Wettrennen, Pipo suchen, Taxi, Insel, vertauschte Schilder). Wer Unfug macht (mit dem Fahrzeug durch Blumenbeete, Tauben
// aufscheuchen, Autos anrempeln), dem läuft die Polizistin nach; erwischt heißt nur „Desculpa!“. Ein Spieltag dauert rund
// sieben Minuten (Abendlicht, Mama ruft zum Essen). Belohnung: Sterne für Aufträge und blaue Kacheln (Azulejos) zum Sammeln.
// Steuern: Finger halten = die Figur läuft oder fährt dorthin; kurz tippen = sie sucht sich den Weg; Knopf unten rechts =
// ein- und aussteigen; oben links die Schwester antippen = umschalten. Am Rechner Pfeiltasten, Leertaste, Tab.
// Stadtplan: Kachelraster (80 × 48, 48 px), in bauen() aus Rechtecken zusammengesetzt; Gebäude und Dinge in DINGE,
// Orte für Aufträge in ORTE, Aufträge in AUFTRAEGE. Grafiken: lx-* (node tools/generate-images.mjs alle spiele, Streifen mit
// tools/frames.py zerlegt), Figuren lx-fig-* (freigestellte Referenzbilder). Sätze: saetze-extra.json (lisboa).
// Eigenes Spiel mit eigener Stadt und eigenen Figuren. Test: window.OLA_LISBOA_AUTO spielt von selbst (Testseite ?auto),
// die Szene steht dann in window.OLA_LISBOA_SZENE.
(() => {
  const base = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  window.OLA_SPIELE = window.OLA_SPIELE || {};
  window.OLA_SPIELE.lisboa = {
    start(el, api) {
      let stop = null, alive = true;
      base().then(() => { if (alive) stop = window.OLA_PHASER.run(el, api, makeScene, { bg: '#7cc0e8' }); });
      return () => { alive = false; if (stop) stop(); };
    },
  };

  // Kachelarten
  const GR = 0, RD = 1, PV = 2, WA = 3, SA = 4, SO = 5, FL = 6, DK = 7, BR = 8, PT = 9;
  const T = 48, COLS = 80, ROWS = 48, WW = COLS * T, WH = ROWS * T, TAG = window.OLA_LISBOA_TAG || 420; // Länge eines Spieltags in Sekunden
  // Orte (Kachelkoordinaten des Punktes, an dem man „da“ ist) und das Bild, das den Ort zeigt
  const ORTE = {
    casa: [15.5, 17.4, 'lx-casa-nossa'], avo: [5.5, 16.6, 'lx-casa-avo'], castelo: [20.5, 6.3, 'lx-castelo'], igreja: [38, 6.3, 'lx-igreja'],
    escola: [56, 6.3, 'lx-escola'], campo: [70.5, 7.2], praca: [38, 17.6, 'lx-fonte'], mercado: [53, 17.3, 'lx-mercado'], pastelaria: [60, 17.3, 'lx-pastelaria'],
    parque: [71.5, 21.4], coreto: [73.5, 26.8, 'lx-coreto'], garagem: [4, 28.3, 'lx-garagem'], geladaria: [24, 29, 'lx-geladaria'], oceanario: [38, 29, 'lx-oceanario'],
    cais: [39.3, 36.8], ponte: [26.6, 36.6], ilha: [58.5, 41.4], praia: [46, 45.4], praia2: [51, 45.6], farol: [7, 46.6, 'lx-farol'],
    quiosque: [33.9, 12.4, 'lx-quiosque'], fonte: [40.7, 15.3, 'lx-fonte'], atrasGaragem: [3, 23.5, 'lx-garagem'], ladoIgreja: [33.6, 4.2, 'lx-igreja'],
  };
  // Gebäude und Dinge: [Bild, Kachel x, y, Breite, Höhe der Standfläche, Breite im Bild in px]; Standfläche 0 = man kann durchlaufen
  const DINGE = [
    ['lx-castelo', 16, 1, 9, 4, 440], ['lx-igreja', 35, 1, 6, 4, 300], ['lx-escola', 52, 1, 8, 4, 390], ['lx-escorrega', 61, 4, 2, 1, 100],
    ['lx-casa-avo', 2, 12, 5, 3, 270], ['lx-casa-nossa', 14, 12, 3, 4, 150], ['lx-casa-1', 17, 12, 3, 4, 150], ['lx-casa-2', 20, 12, 3, 4, 150], ['lx-casa-3', 23, 12, 3, 4, 150],
    ['lx-fonte', 37, 14, 3, 2, 150], ['lx-quiosque', 33, 13, 2, 1, 104], ['lx-mercado', 50, 12, 6, 4, 300], ['lx-pastelaria', 58, 12, 5, 4, 245],
    ['lx-coreto', 72, 24, 3, 2, 160], ['lx-escorrega', 69, 28, 2, 1, 100], ['lx-garagem', 1, 24, 5, 3, 250],
    ['lx-casa-4', 14, 24, 3, 4, 150], ['lx-casa-5', 17, 24, 3, 4, 150], ['lx-geladaria', 22, 24, 5, 4, 245], ['lx-oceanario', 34, 24, 8, 4, 390],
    ['lx-casa-2', 50, 24, 3, 4, 150], ['lx-casa-1', 53, 24, 3, 4, 150], ['lx-casa-5', 58, 24, 3, 4, 150], ['lx-farol', 3, 45, 2, 1, 120],
    ['lx-paragem', 40, 7, 0, 0, 86], ['lx-paragem', 67, 23, 0, 0, 86], ['lx-paragem', 40, 35, 0, 0, 86], ['lx-paragem', 9, 23, 0, 0, 86],
    ...[[0, 1], [4, 1], [8, 1], [9, 5], [14, 1], [26, 1], [8, 13], [8, 24]].map(([x, y]) => ['lx-pinheiro', x, y, 1, 1, 150]),
    ...[[32, 2], [44, 2], [50, 2], [62, 2], [32, 12], [44, 12], [32, 18], [44, 18], [26, 17], [57, 17], [68, 12], [78, 12], [68, 19], [78, 19], [69, 24], [77, 24], [68, 30], [78, 30], [20, 25], [56, 29]].map(([x, y]) => ['lx-jacaranda', x, y, 1, 1, 150]),
    ...[[3, 35], [9, 35], [15, 35], [21, 35], [34, 35], [45, 35], [51, 35], [57, 35], [63, 35], [69, 35], [75, 35], [32, 25], [43, 25], [33, 46], [66, 45], [57, 40]].map(([x, y]) => ['lx-palmeira', x, y, 1, 1, 120]),
    ...[[14, 5], [26, 5], [20, 17], [23, 17], [70, 12], [76, 20], [70, 26], [76, 28], [72, 29], [20, 29]].map(([x, y]) => ['lx-arbusto', x, y, 1, 1, 60]),
    ...[[35, 17], [41, 13], [6, 35], [18, 35], [48, 35], [60, 35], [72, 35], [72, 19], [75, 22], [4, 4]].map(([x, y]) => ['lx-banco', x, y, 1, 1, 62]),
    ...[[36, 45], [42, 46.4], [55, 46.4], [61, 45], [70, 46.4]].map(([x, y]) => ['lx-guarda-sol', x, y, 0, 0, 96]),
  ];
  const BEETE = [[1, 16, 3, 2], [7, 16, 2, 2], [56, 13, 2, 2], [69, 21, 2, 1], [76, 21, 2, 1], [61, 25, 2, 2], [22, 29, 2, 1]]; // Blumenbeete (Kacheln)
  const AZULEJOS = [[4.5, 5.5], [1, 3], [14.5, 6.5], [26.5, 3], [33, 5], [43.5, 4.5], [50.5, 5.5], [62.5, 5.5], [78.5, 6.5], [68.5, 1.5], [1.5, 19], [8.5, 18.5], [26.5, 18.5], [19, 16.5],
    [33.5, 16.5], [43.5, 14.5], [49.5, 18.5], [63, 18.5], [78.5, 14.5], [69.5, 16], [78, 27], [70.5, 30.5], [8.5, 30.5], [1.5, 30], [20.5, 30.5], [27, 26], [31.5, 30.5], [45, 30.5],
    [56, 26.5], [62.5, 30.5], [1.5, 36.5], [31.5, 36.5], [78, 36.5], [41, 39], [60.5, 40.5], [55.5, 41.4], [12, 46.5], [24, 45.5], [40, 47], [76, 45.5]];
  // Aufträge. p = Auftraggeber (Figur) an Ort o; var = Auswahl (eine wird ausgelost). Schritte siehe starte().
  const AUFTRAEGE = [
    { id: 'pao', p: 'mama', o: [14.2, 16.7], art: 'compras', loja: 'pastelaria', ir: 'Vai à pastelaria, por favor!', fim: 'Obrigada! Que bom!',
      var: [['o pão', 'Preciso de pão!'], ['o pastel de nata', 'Quero um pastel de nata!'], ['o croissant', 'Quero um croissant!']], outras: ['o bolo', 'o queijo', 'a torrada', 'o gelado'] },
    { id: 'avo', p: 'avo-oma', o: [5.6, 15.9], art: 'compras', loja: 'mercado', ir: 'Vai ao mercado, por favor!', fim: 'Obrigada, querida!',
      var: [['o limão', 'Preciso de limões!'], ['a laranja', 'Preciso de laranjas!'], ['o tomate', 'Preciso de tomates!'], ['a cenoura', 'Preciso de cenouras!']], outras: ['a banana', 'a maçã', 'a pera', 'as uvas', 'o melão'] },
    { id: 'gelado', p: 'elli', o: [49, 45.3], art: 'compras', loja: 'geladaria', ir: 'O Nico quer um gelado! Vai à geladaria, por favor!', fim: 'Obrigada! Que simpática!',
      var: [['o gelado', null]], outras: ['o bolo', 'o pão', 'a água', 'o sumo'] },
    { id: 'foto', p: 'papa', o: [40.6, 17.9], art: 'foto', fim: 'Que linda fotografia!',
      var: [['castelo', 'Tira uma fotografia do castelo!'], ['igreja', 'Tira uma fotografia da igreja!'], ['ponte', 'Tira uma fotografia da ponte!'], ['farol', 'Tira uma fotografia do farol!']] },
    { id: 'corrida', p: 'leo', o: [70.5, 6.6], art: 'corrida', ir: 'Quem chega primeiro à praia?', vai: 'Um, dois, três, vamos!', ganhou: 'Ganhaste! Parabéns!', perdeu: 'Ganhei! Outra vez?' },
    { id: 'pipo', p: 'ines', o: [71.5, 20.8], art: 'pipo', ir: 'O Pipo fugiu! Ajuda-me!', fim: 'Pipo! Obrigada!',
      var: [['quiosque', 'O Pipo está atrás do quiosque!'], ['fonte', 'O Pipo está ao lado da fonte!'], ['atrasGaragem', 'O Pipo está atrás da garagem!'], ['ladoIgreja', 'O Pipo está ao lado da igreja!']] },
    { id: 'taxi', p: 'rute', o: [73.5, 26.3], art: 'taxi', fim: 'Obrigada! Até logo!',
      var: [['escola', 'Leva-me à escola, por favor!'], ['castelo', 'Leva-me ao castelo, por favor!'], ['praia', 'Leva-me à praia, por favor!'], ['oceanario', 'Leva-me ao oceanário, por favor!']] },
    { id: 'ilha', p: 'avo-opa', o: [39.2, 36.4], art: 'ilha', ir: 'O Pandi está na ilha! Vai de barco!', fim: 'Muito bem! Obrigado!' },
    { id: 'placas', p: 'pedro', o: [35.4, 15.6], art: 'placas', ir: 'O Pondi trocou as placas! Ajuda-me!', fim: 'Foi o Pondi!',
      var: [['pastelaria', 'Onde é a pastelaria?'], ['mercado', 'Onde é o mercado?'], ['geladaria', 'Onde é a geladaria?'], ['escola', 'Onde é a escola?'], ['igreja', 'Onde é a igreja?'], ['castelo', 'Onde é o castelo?'], ['oceanario', 'Onde é o oceanário?']] },
  ];
  const WORTBILDER = [...new Set(AUFTRAEGE.flatMap(a => a.art === 'compras' ? [...a.var.map(v => v[0]), ...a.outras] : []))];
  const FAHR = { // Fahrzeuge: Bildname, Größe im Bild, Tempo, wie träge es lenkt; motor = hupt, hat Radio, zählt beim Unfug; fechado = Figur darin nicht zu sehen
    skate: { k: 'lx-skate', s: 70, v: 310, a: 9, e: '🛹' }, tuk: { k: 'lx-tuktuk', s: 150, v: 410, a: 4.5, motor: true, e: '🛺' },
    carro: { k: 'lx-carro', s: 136, v: 440, a: 3.8, motor: true, fechado: true, e: '🚗' }, carrinha: { k: 'lx-carrinha', s: 150, v: 390, a: 3.4, motor: true, fechado: true, e: '🚐' },
    barco: { k: 'lx-barco', s: 170, v: 270, a: 2.6, e: '⛵' },
  };
  // Bildsätze, deren Seitenansicht nach links schaut (das Bildmodell hält sich nicht immer an „nach rechts“): dort wird andersherum gespiegelt
  const ESQ = new Set(['lx-tuktuk', 'lx-tuktuk-ada', 'lx-tuktuk-selma']);
  const motor = v => !!(v && FAHR[v.tipo] && FAHR[v.tipo].motor);
  // wo Fahrzeuge stehen: [Art, Kachel x, y]
  const PARQUE = [['skate', 17.4, 17.9], ['skate', 18.6, 17.9], ['skate', 74.6, 22.4], ['skate', 50.8, 6.5], ['skate', 40, 45.5],
    ['tuk', 7.4, 28.8], ['tuk', 43.2, 16.2], ['tuk', 25.6, 6.6], ['tuk', 31.6, 46.6], ['tuk', 62.4, 18.4],
    ['carro', 20.5, 19.5], ['carro', 44.2, 30.6], ['carro', 60.5, 7.5], ['carrinha', 51.5, 19.5], ['carrinha', 3.2, 29.8],
    ['barco', 42.6, 39.4], ['barco', 42.6, 41.2], ['barco', 54.2, 40.6], ['barco', 20.5, 43.2], ['barco', 71.6, 15.6]];

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H;
    const ZF = 1.22, px = v => v * T, rnd = Phaser.Math.Between, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    return class Lisboa extends Phaser.Scene {
      preload() {
        const api = this.api = this.registry.get('api'), im = id => this.load.image(id, B.sprite(api, id));
        [...new Set(DINGE.map(d => d[0]))].forEach(im); ['lx-canteiro', 'lx-skate', 'pombo', 'tram-pombos', 'gast-ada', 'gast-selma'].forEach(im);
        ['ada', 'selma'].forEach(f => [1, 2, 3, 4, 5].forEach(n => im(`lx-${f}-${n}`))); [1, 2, 3, 4].forEach(n => im('lx-policia-' + n));
        ['tuktuk', 'carro', 'carrinha', 'eletrico', 'barco', 'tuktuk-ada', 'tuktuk-selma', 'barco-ada', 'barco-selma', 'skate-ada', 'skate-selma', 'eletrico-ada', 'eletrico-selma'].forEach(f => [1, 2, 3].forEach(n => im(`lx-${f}-${n}`)));
        ['ada', 'selma', 'mama', 'papa', 'avo-oma', 'avo-opa', 'leo', 'benni', 'nico', 'ines', 'pedro', 'rute', 'elli', 'michi', 'pipo', 'pondi', 'pandi', 'professora', 'educadora', 'rita'].forEach(f => im('lx-fig-' + f));
        im('tram-policia'); im('eletrico'); im('tram-carro'); im('gast-pipo'); AUFTRAEGE.forEach(a => im('gast-' + a.p));
        WORTBILDER.forEach((w, i) => { const u = api.pic && api.pic(w); if (u) this.load.image('wp-' + w, u); });
        ['collect', 'honk', 'bonk', 'win', 'lose', 'motor', 'splash', 'apito', 'shutter', 'bark', 'sino-eletrico', 'pop', 'star', 'go', 'countdown', 'pondi-happy', 'pandi-found', 'gull', 'whoosh', 'music-corrida', 'music-eletrico', 'fila-musica'].forEach(k => this.load.audio(k, B.sfx(k)));
      }

      create() {
        const api = this.api; if (window.OLA_DEBUG) window.OLA_LISBOA_SZENE = this;
        B.particles(this);
        this.zeit = 0; this.pronto = false; this.over = false; this.sterne = 0; this.azul = 0; this.apitos = 0; this.feito = {}; this.m = null; this.ents = [];
        this.salvo = (api.store && api.store.get()) || { st: 0, az: 0, m: {} };
        this.bauen(); this.boden(); this.dinge(); this.figuren(); this.fahrzeuge(); this.verkehr(); this.anzeige(); this.eingabe();
        this.cameras.main.setBounds(0, 0, WW, WH);
        this.radio = null; this.sender = 0; this.motor = this.cache.audio.exists('motor') ? this.sound.add('motor', { loop: true, volume: 0 }) : null; if (this.motor) this.motor.play();
        this.escolher();
      }

      /* ---------- Stadtplan ---------- */
      bauen() {
        const g = this.g = new Uint8Array(COLS * ROWS), set = (t, x, y, w, h) => { for (let r = Math.max(0, y); r < Math.min(ROWS, y + h); r++) for (let c = Math.max(0, x); c < Math.min(COLS, x + w); c++) g[r * COLS + c] = t; };
        this.em = (c, r) => c < 0 || r < 0 || c >= COLS || r >= ROWS ? SO : g[r * COLS + c];
        [8, 32].forEach(y => set(RD, 0, y, COLS, 3)); set(RD, 0, 20, 67, 3); [10, 28, 46, 64].forEach(x => set(RD, x, 0, 3, 35));
        set(PV, 0, 35, COLS, 3); set(WA, 0, 38, COLS, 6); set(SA, 0, 44, COLS, 4);
        set(RD, 28, 35, 3, 3); set(BR, 28, 38, 3, 6); set(RD, 28, 44, 3, 2); set(PV, 26, 46, 7, 1);
        // Gehwege rund um die Straßen
        const alt = g.slice(); for (let r = 0; r < 35; r++) for (let c = 0; c < COLS; c++) if (alt[r * COLS + c] === GR) { let n = false; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const cc = c + b, rr = r + a; if (cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS && alt[rr * COLS + cc] === RD) n = true; } if (n) g[r * COLS + c] = PV; }
        set(PV, 31, 11, 15, 9); set(PV, 2, 3, 6, 4); set(PV, 32, 5, 13, 2); set(PV, 67, 20, 13, 3); set(PV, 73, 11, 1, 21); // Platz, Aussichtspunkt, Kirchplatz, Parkwege
        set(PT, 68, 1, 11, 6); // Fußballplatz
        for (let r = 14; r <= 17; r++) for (let c = 70; c <= 76; c++) if (!((r === 14 || r === 17) && (c === 70 || c === 76)) && c !== 73) g[r * COLS + c] = WA; // Teich (mit Steg in der Mitte)
        set(DK, 73, 14, 1, 4); set(DK, 40, 38, 2, 3); set(SA, 55, 40, 7, 2); // Stege, Insel
        BEETE.forEach(([x, y, w, h]) => set(FL, x, y, w, h));
        this.g0 = g.slice(); // der Boden, bevor etwas daraufsteht (zum Malen)
        DINGE.forEach(([k, x, y, w, h]) => { if (w && h) set(SO, Math.floor(x), Math.floor(y), w, h); });
      }
      // darf man hier sein? wie = 'pe' (zu Fuß, Skate), 'tuk', 'barco'
      pode(x, y, wie) { const t = this.em(Math.floor(x / T), Math.floor(y / T)); return wie === 'barco' ? t === WA || t === BR : wie === 'tuk' ? t !== WA && t !== SO && t !== DK : t !== WA && t !== SO; }
      livre(x, y, wie, r = 12) { return this.pode(x - r, y - r * 0.5, wie) && this.pode(x + r, y - r * 0.5, wie) && this.pode(x - r, y + r * 0.5, wie) && this.pode(x + r, y + r * 0.5, wie); }
      // kürzester Weg über die Kacheln (Breitensuche), Ergebnis: Liste von Punkten; null, wenn es keinen gibt
      caminho(x0, y0, x1, y1, wie = 'pe') {
        const c0 = Math.floor(x0 / T), r0 = Math.floor(y0 / T); let c1 = Math.floor(x1 / T), r1 = Math.floor(y1 / T);
        const ok = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && this.pode(c * T + 24, r * T + 24, wie);
        if (!ok(c1, r1)) { let best = null; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (ok(c1 + b, r1 + a)) { const d = a * a + b * b; if (!best || d < best[0]) best = [d, c1 + b, r1 + a]; } if (!best) return null; c1 = best[1]; r1 = best[2]; x1 = c1 * T + 24; y1 = r1 * T + 24; }
        const von = new Int32Array(COLS * ROWS).fill(-1), q = [r0 * COLS + c0]; von[q[0]] = q[0];
        for (let i = 0; i < q.length; i++) { const k = q[i], c = k % COLS, r = (k - c) / COLS; if (c === c1 && r === r1) break;
          for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const cc = c + a, rr = r + b, kk = rr * COLS + cc; if (!ok(cc, rr) || von[kk] >= 0) continue; if (a && b && (!ok(c + a, r) || !ok(c, r + b))) continue; von[kk] = k; q.push(kk); } }
        let k = r1 * COLS + c1; if (von[k] < 0) return null; const p = [[x1, y1]];
        while (k !== von[k]) { k = von[k]; p.push([(k % COLS) * T + 24, Math.floor(k / COLS) * T + 24]); }
        if (p.length > 1) p.pop(); return p.reverse();
      }

      /* ---------- Boden malen (in Stücken, damit die Texturen klein bleiben) ---------- */
      boden() {
        let z = 7; const zf = () => { z = (z * 1103515245 + 12345) & 0x7fffffff; return z / 0x7fffffff; };
        const CW = 20, CH = 12;
        for (let cy = 0; cy < ROWS / CH; cy++) for (let cx = 0; cx < COLS / CW; cx++) {
          const key = `chao${cx}_${cy}`, ct = this.textures.createCanvas(key, CW * T, CH * T), c = ct.getContext();
          for (let r = 0; r < CH; r++) for (let q = 0; q < CW; q++) { const C = cx * CW + q, R = cy * CH + r, t = this.g0[R * COLS + C], x = q * T, y = r * T, n = (dc, dr) => this.em(C + dc, R + dr);
            if (t === GR || t === SO || t === FL) { c.fillStyle = (C + R) % 2 ? '#8fd16b' : '#87ca63'; c.fillRect(x, y, T, T); for (let i = 0; i < 3; i++) { c.fillStyle = ['#7abf58', '#a5dd80', '#fff6a8'][i]; c.fillRect(x + zf() * 44, y + zf() * 44, 3, 6); } }
            else if (t === PT) { c.fillStyle = C % 2 ? '#5fb85a' : '#55ad50'; c.fillRect(x, y, T, T); }
            else if (t === RD || t === BR) { c.fillStyle = t === BR ? '#8a8f9c' : '#787d8a'; c.fillRect(x, y, T, T); c.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 4; i++) c.fillRect(x + zf() * 44, y + zf() * 44, 4, 2);
              if (t === BR) { c.fillStyle = '#c9a36b'; if (n(-1, 0) === WA) c.fillRect(x, y, 6, T); if (n(1, 0) === WA) c.fillRect(x + T - 6, y, 6, T); } }
            else if (t === PV) { c.fillStyle = '#f1e6cc'; c.fillRect(x, y, T, T); c.fillStyle = '#e4d6b6'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j + C + R) % 2) c.fillRect(x + i * 12 + 1, y + j * 12 + 1, 10, 10);
              c.fillStyle = '#b9ad90'; if (n(0, 1) === RD) c.fillRect(x, y + T - 4, T, 4); if (n(0, -1) === RD) c.fillRect(x, y, T, 4); if (n(1, 0) === RD) c.fillRect(x + T - 4, y, 4, T); if (n(-1, 0) === RD) c.fillRect(x, y, 4, T); }
            else if (t === WA) { c.fillStyle = (C + R) % 2 ? '#4aa8e0' : '#46a2dc'; c.fillRect(x, y, T, T); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); const wx = x + zf() * 20, wy = y + 10 + zf() * 26; c.moveTo(wx, wy); c.quadraticCurveTo(wx + 7, wy - 5, wx + 14, wy); c.quadraticCurveTo(wx + 21, wy + 5, wx + 28, wy); c.stroke();
              c.fillStyle = 'rgba(255,255,255,.55)'; if (n(0, -1) !== WA && n(0, -1) !== BR && n(0, -1) !== DK) c.fillRect(x, y, T, 5); if (n(0, 1) !== WA && n(0, 1) !== BR && n(0, 1) !== DK) c.fillRect(x, y + T - 5, T, 5); if (n(-1, 0) !== WA && n(-1, 0) !== BR && n(-1, 0) !== DK) c.fillRect(x, y, 5, T); if (n(1, 0) !== WA && n(1, 0) !== BR && n(1, 0) !== DK) c.fillRect(x + T - 5, y, 5, T); }
            else if (t === SA) { c.fillStyle = '#f6e3a4'; c.fillRect(x, y, T, T); c.fillStyle = '#e9d18a'; for (let i = 0; i < 5; i++) c.fillRect(x + zf() * 44, y + zf() * 44, 3, 3); }
            else if (t === DK) { c.fillStyle = '#b98a54'; c.fillRect(x, y, T, T); c.fillStyle = '#9c7040'; for (let i = 0; i < 4; i++) c.fillRect(x, y + i * 12, T, 2); }
          }
          // Mittellinien, Schienen, Fußballplatz: in Weltkoordinaten, auf dieses Stück verschoben
          c.save(); c.translate(-cx * CW * T, -cy * CH * T);
          c.fillStyle = 'rgba(255,255,255,.75)';
          [[9, 0, COLS], [21, 0, 67], [33, 0, COLS]].forEach(([r, a, b]) => { for (let q = a; q < b; q++) if (this.em(q, r) === RD && ![10, 11, 12, 28, 29, 30, 46, 47, 48, 64, 65, 66].includes(q)) c.fillRect(q * T + 12, r * T + 21, 24, 5); });
          [11, 29, 47, 65].forEach(q => { for (let r = 0; r < 46; r++) if ((this.em(q, r) === RD || this.em(q, r) === BR) && ![8, 9, 10, 20, 21, 22, 32, 33, 34].includes(r)) c.fillRect(q * T + 21, r * T + 12, 5, 24); });
          c.strokeStyle = '#4b4f5a'; c.lineWidth = 3; [-7, 7].forEach(o => { c.strokeRect(11.5 * T + o, 9.5 * T + o, 54 * T - 2 * o, 24 * T - 2 * o); }); // Schienen des Elétrico
          c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 4; c.strokeRect(68.4 * T, 1.3 * T, 10.2 * T, 5.4 * T); c.beginPath(); c.moveTo(73.5 * T, 1.3 * T); c.lineTo(73.5 * T, 6.7 * T); c.stroke(); c.beginPath(); c.arc(73.5 * T, 4 * T, 40, 0, 7); c.stroke();
          c.strokeRect(68.4 * T, 3 * T, 36, 2 * T); c.strokeRect(78.6 * T - 36, 3 * T, 36, 2 * T);
          c.restore(); ct.refresh();
          this.add.image(cx * CW * T, cy * CH * T, key).setOrigin(0).setDepth(0);
        }
        // Wasser glitzert: zwei wandernde helle Streifenflächen über dem Fluss
        const wg = this.make.graphics({ add: false }); wg.fillStyle(0xffffff, 0.5); for (let i = 0; i < 14; i++) wg.fillRoundedRect(rnd(0, 230), rnd(0, 120), rnd(12, 26), 3, 1.5); wg.generateTexture('glitzer', 256, 128); wg.destroy();
        this.glitzer = this.add.tileSprite(0, 38 * T, WW, 6 * T, 'glitzer').setOrigin(0).setDepth(1).setAlpha(0.6);
        // Karte für die Ecke: 2 px je Kachel
        const mk = this.textures.createCanvas('karte', COLS * 2, ROWS * 2), m = mk.getContext(), cor = { [GR]: '#8fd16b', [RD]: '#787d8a', [BR]: '#8a8f9c', [PV]: '#f1e6cc', [WA]: '#4aa8e0', [SA]: '#f6e3a4', [SO]: '#c9623a', [FL]: '#e86fa0', [DK]: '#b98a54', [PT]: '#55ad50' };
        for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) { m.fillStyle = cor[this.em(q, r)]; m.fillRect(q * 2, r * 2, 2, 2); } mk.refresh();
      }
      // Bild oder, wenn es (noch) fehlt, ein Platzhalter
      tx(k) { if (this.textures.exists(k)) return k; const p = 'ph-' + k; if (!this.textures.exists(p)) { const g = this.make.graphics({ add: false }); g.fillStyle(0xd9895b).fillRoundedRect(0, 0, 96, 96, 12).lineStyle(4, 0x7a3e22).strokeRoundedRect(2, 2, 92, 92, 12); g.generateTexture(p, 96, 96); g.destroy(); } return p; }
      dinge() {
        this.beete = BEETE.map(([x, y, w, h]) => { const ims = []; for (let r = 0; r < h; r++) { const im = this.add.image(px(x + w / 2), px(y + r + 1) - 1, this.tx('lx-canteiro')).setOrigin(0.5, 1); im.setDisplaySize(w * T + 6, (w * T + 6) * im.height / im.width).setDepth(2 + r * 0.01); ims.push(im); } return { x: px(x + w / 2), y: px(y + h / 2), w: w * T, h: h * T, ims, platt: 0 }; });
        DINGE.forEach(([k, x, y, w, h, dw]) => { const im = this.add.image(px(x + (w || 1) / 2), px(y + (h || 1)) - 3, this.tx(k)).setOrigin(0.5, 1); im.setDisplaySize(dw, dw * im.height / im.width).setDepth(1000 + px(y + (h || 1)) - 3); });
        // Kacheln zum Sammeln
        const g = this.make.graphics({ add: false }); g.fillStyle(0xffffff).fillRoundedRect(0, 0, 30, 30, 5).lineStyle(3, 0x1f5fbf).strokeRoundedRect(1.5, 1.5, 27, 27, 5); g.fillStyle(0x2f7be0).fillCircle(15, 15, 6).fillTriangle(15, 3, 11, 9, 19, 9).fillTriangle(15, 27, 11, 21, 19, 21).fillTriangle(3, 15, 9, 11, 9, 19).fillTriangle(27, 15, 21, 11, 21, 19); g.generateTexture('azulejo', 30, 30);
        g.clear(); g.fillStyle(0xffe066, 0.35).fillEllipse(40, 20, 80, 40).lineStyle(5, 0xffc400).strokeEllipse(40, 20, 72, 32); g.generateTexture('anel', 80, 40);
        g.clear(); g.fillStyle(0x000000, 0.22).fillEllipse(24, 8, 48, 16); g.generateTexture('sombra', 48, 16); g.destroy();
        this.azulejos = AZULEJOS.filter(([x, y]) => this.pode(px(x), px(y), 'pe')).map(([x, y], i) => { const im = this.add.image(px(x), px(y), 'azulejo').setDepth(900); this.tweens.add({ targets: im, y: im.y - 7, angle: 8, duration: 700 + i * 13, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); return { x: px(x), y: px(y), im }; });
        // Tauben auf dem Platz
        this.pombos = [[36.4, 17.4], [39.6, 16.9]].map(([x, y]) => ({ x: px(x), y: px(y), im: this.add.image(px(x), px(y), this.tx('tram-pombos')).setOrigin(0.5, 1).setDisplaySize(84, 32).setDepth(1000 + px(y)), weg: 0 }));
      }

      /* ---------- Figuren ---------- */
      // k = Bildname ohne Nummer (lx-ada → lx-ada-1 … 5, sonst das eine Bild lx-fig-…), alt = Höhe im Bild
      fig(id, k, x, y, alt, einzel) {
        const fases = !einzel && this.textures.exists(k + '-1') && this.textures.exists(k + '-3');
        const f = { id, q: id === 'policia' ? [1, 1, 2, 3, 4] : [1, 2, 3, 4, 5], k: fases ? k : einzel || k, fases, x: px(x), y: px(y), dir: 'd', mov: false, t: rnd(0, 9), alt: alt * ZF, veh: null, vx: 0, vy: 0, vis: true };
        f.sh = this.add.image(f.x, f.y, 'sombra').setDepth(999); f.im = this.add.image(f.x, f.y, this.tx(fases ? k + '-1' : f.k)).setOrigin(0.5, 1); this.ents.push(f); return f;
      }
      figuren() {
        this.irmas = { ada: this.fig('ada', 'lx-ada', 15.2, 17.7, 78, 'lx-fig-ada'), selma: this.fig('selma', 'lx-selma', 16.5, 17.9, 66, 'lx-fig-selma') };
        // die Laufbilder gibt es erst nach dem Zerlegen der Streifen; bis dahin das eine Standbild
        ['ada', 'selma'].forEach(n => { const f = this.irmas[n]; if (this.textures.exists(`lx-${n}-1`) && this.textures.exists(`lx-${n}-3`)) { f.fases = true; f.k = 'lx-' + n; } });
        this.eu = this.irmas.ada;
        const N = (id, x, y, alt) => this.fig(id, 'lx-fig-' + id, x, y, alt, 'lx-fig-' + id);
        this.np = {}; AUFTRAEGE.forEach(a => { this.np[a.p] = N(a.p, a.o[0], a.o[1], /leo|ines|pedro/.test(a.p) ? 70 : 90); });
        this.np.nico = N('nico', 50.3, 45.9, 54); this.np.benni = N('benni', 75, 3.6, 62); this.np.michi = N('michi', 6.9, 27.3, 92);
        this.pipo = N('pipo', 71, 22.4, 44); this.pandi = N('pandi', 58.6, 41.2, 46); this.pandi.vis = false; this.pondi = N('pondi', 0, 0, 56); this.pondi.vis = false;
        this.pol = this.fig('policia', 'lx-policia', 0, 0, 96, 'tram-policia'); this.pol.vis = false; this.pol.on = false;
        // Auftragsmarken: gelber Ring vor der Figur und ein Ausrufezeichen darüber
        AUFTRAEGE.forEach(a => { const f = this.np[a.p]; a.x = f.x; a.y = f.y + 46; a.anel = this.add.image(a.x, a.y, 'anel').setDepth(3); a.sinal = this.add.text(f.x, f.y - f.alt - 30, '❗', { fontSize: '40px' }).setOrigin(0.5).setDepth(5000);
          this.tweens.add({ targets: a.sinal, y: a.sinal.y - 8, duration: 500, yoyo: true, repeat: -1 }); this.tweens.add({ targets: a.anel, scale: 1.12, alpha: 0.7, duration: 600, yoyo: true, repeat: -1 }); });
        // Spaziergänger
        this.gente = ['professora', 'educadora', 'rita'].map((id, i) => { const f = N(id, [20, 50, 60][i], [19.4, 19.4, 36][i], 88); f.ziel = null; f.warte = i * 2; return f; });
      }
      // Bild und Lage einer Figur für dieses Bild; passageiro = sitzt in einem Fahrzeug
      malFig(f, time) {
        const im = f.im; im.setVisible(f.vis && !f.dentro && !f.oculto); f.sh.setVisible(f.vis && !f.veh && !f.dentro); if (!f.vis || f.dentro || f.oculto) return;
        const passo = f.mov && !f.veh ? Math.floor(f.t * 7) % 2 : 0; let k = f.k, flip = f.dir === 'l', hop = f.mov && !f.veh ? Math.abs(Math.sin(f.t * 11)) * 4 : 0;
        if (f.fases) { const q = f.q; if (f.dir === 'u') { k += '-' + q[4]; flip = passo === 1; } else if (f.dir === 'd') { k += '-' + (f.mov && !f.veh ? q[1] : q[0]); flip = passo === 1; } else k += '-' + (passo ? q[3] : q[2]); if (f.veh && (f.dir === 'l' || f.dir === 'r')) k = f.k + '-' + q[0]; }
        else if (f.dir === 'r' || f.dir === 'l') flip = f.dir === 'l';
        if (im.texture.key !== k) im.setTexture(this.tx(k));
        const s = f.alt / (f.fases ? 244 : im.height) * (f.escala || 1); im.setScale(s).setFlipX(flip).setPosition(f.x, f.y - hop + (f.dy || 0)).setDepth(1000 + f.y + (f.dz || 0));
        if (!f.mov && !f.veh) im.setScale(s, s * (1 + Math.sin(time / 420 + f.t) * 0.012));
        f.sh.setPosition(f.x, f.y).setScale(f.alt / 90);
      }
      // gehen mit Anstoßen: erst seitlich, dann hoch/runter (so rutscht man an Mauern entlang)
      mover(f, dx, dy, wie, r) { let ok = false; if (dx && this.livre(f.x + dx, f.y, wie, r)) { f.x += dx; ok = true; } if (dy && this.livre(f.x, f.y + dy, wie, r)) { f.y += dy; ok = true; } f.x = Phaser.Math.Clamp(f.x, 14, WW - 14); f.y = Phaser.Math.Clamp(f.y, 20, WH - 8); return ok; }
      olhar(f, dx, dy) { if (Math.abs(dx) + Math.abs(dy) < 0.01) return; f.dir = Math.abs(dx) > Math.abs(dy) * 0.9 ? (dx < 0 ? 'l' : 'r') : dy < 0 ? 'u' : 'd'; }
      // eine Figur läuft zu einem Punkt (über den Weg, wenn nötig); gibt true zurück, wenn sie da ist
      andar(f, x, y, v, dt, perto = 10) {
        if (Math.hypot(x - f.x, y - f.y) < perto) { f.mov = false; f.rota = null; return true; }
        if (!f.rota || f.rotaZ !== x + ',' + y || (f.rotaT -= dt) < 0) { f.rota = this.caminho(f.x, f.y, x, y, 'pe'); if (!f.rota || !f.rota.length) f.rota = [[x, y]]; f.rotaZ = x + ',' + y; f.rotaT = 1.2; }
        while (f.rota.length > 1 && Math.hypot(f.rota[0][0] - f.x, f.rota[0][1] - f.y) < 16) f.rota.shift();
        const [tx, ty] = f.rota[0], d = Math.hypot(tx - f.x, ty - f.y) || 1, s = Math.min(v * dt, d); f.x += (tx - f.x) / d * s; f.y += (ty - f.y) / d * s; f.mov = true; f.t += dt; this.olhar(f, tx - f.x, ty - f.y); return false;
      }

      /* ---------- Fahrzeuge ---------- */
      veic(tipo, x, y) { const d = FAHR[tipo], v = { tipo, x: px(x), y: px(y), dir: 'r', quem: null, casa: [px(x), px(y)] }; v.im = this.add.image(v.x, v.y, this.tx(tipo === 'skate' ? d.k : d.k + '-1')).setOrigin(0.5, 1); this.veics.push(v); return v; }
      fahrzeuge() { this.veics = []; PARQUE.forEach(([t, x, y]) => this.veic(t, x, y)); }
      malVeic(v) {
        const d = FAHR[v.tipo], im = v.im, n = v.dir === 'd' ? 2 : v.dir === 'u' ? 3 : 1, q = v.quem;
        let base = d.k, com = false; if (q && this.textures.exists(`${d.k}-${q.id}-1`)) { base = `${d.k}-${q.id}`; com = true; }
        if (q) q.oculto = com || !!d.fechado;
        if (v.tipo === 'skate' && !com) { im.setTexture(this.tx(d.k)).setFlipX(v.dir === 'l'); const s = d.s / im.width; im.setScale(v.dir === 'u' || v.dir === 'd' ? s * 0.5 : s, s).setPosition(v.x, v.y + 3).setDepth(1000 + v.y - 1); return; }
        const k = this.tx(`${base}-${n}`); if (im.texture.key !== k) im.setTexture(k); im.setScale(com && v.tipo === 'skate' ? q.alt * 1.5 / 250 : d.s / 256 * (com ? (d.cs || 1) : 1)).setFlipX(ESQ.has(base) ? v.dir === 'r' : v.dir === 'l').setPosition(v.x, v.y + (v.tipo === 'barco' ? 10 + Math.sin(this.time.now / 500 + v.x) * 2 : 6)).setDepth(1000 + v.y + 1);
      }
      entrar(f, v) { if (v.quem) return; v.quem = f; f.veh = v; f.x = v.x; f.y = v.y; f.vx = f.vy = 0; f.rota = null; this.destino = null; B.play(this, 'pop', { volume: 0.5 }); if (v.tipo !== 'skate') this.tocarRadio(true); }
      // aussteigen: neben dem Fahrzeug, wo man stehen kann (beim Boot am Ufer oder Steg)
      saida(f) { const v = f.veh; if (!v) return null; if (v.tram) { if (v.parado <= 0) return null; let frei = null; for (const r of [96, 130, 170]) for (let a = 0; a < 8; a++) { const x = v.x + Math.round(Math.cos(a * Math.PI / 4)) * r, y = v.y + Math.round(Math.sin(a * Math.PI / 4)) * r; if (!this.livre(x, y, 'pe', 10)) continue; if (this.em(Math.floor(x / T), Math.floor(y / T)) === PV) return [x, y]; frei = frei || [x, y]; } return frei; }
        const R = v.tipo === 'barco' ? [70, 100, 130] : motor(v) ? [60, 84, 110] : [44, 64]; for (const r of R) for (let a = 0; a < 8; a++) { const x = v.x + Math.cos(a * Math.PI / 4 + 1.57) * r, y = v.y + Math.sin(a * Math.PI / 4 + 1.57) * r * 0.8; if (this.livre(x, y, 'pe', 10) && this.em(Math.floor(x / T), Math.floor(y / T)) !== BR || (v.tipo !== 'barco' && this.livre(x, y, 'pe', 10))) return [x, y]; } return null; }
      sair(f) { const v = f.veh, p = this.saida(f); if (!v || !p) return; if (v.tram) v.gente = v.gente.filter(x => x !== f); else v.quem = null; f.veh = null; f.dentro = false; f.oculto = false; f.x = p[0]; f.y = p[1]; f.dy = 0; f.dz = 0; f.escala = 1; f.vx = f.vy = 0; B.play(this, 'pop', { volume: 0.5 }); this.tocarRadio(false); }
      tocarRadio(an) { if (this.radio) { this.radio.stop(); this.radio = null; } if (!an || !this.sender) return; const k = ['', 'music-corrida', 'fila-musica', 'music-eletrico'][this.sender]; if (this.cache.audio.exists(k)) { this.radio = this.sound.add(k, { loop: true, volume: 0.2 }); this.radio.play(); } }

      /* ---------- Verkehr: Elétrico, Autos ---------- */
      verkehr() {
        const laço = (p, v, k, s, paragens) => { const o = { tram: !!paragens, p: p.map(([x, y]) => [px(x), px(y)]), i: 0, x: px(p[0][0]), y: px(p[0][1]), v, k, s, dir: 'r', parado: 0, paragens: (paragens || []).map(([x, y]) => [px(x), px(y)]), gente: [], buzina: 0 }; o.im = this.add.image(o.x, o.y, this.tx(k + '-1')).setOrigin(0.5, 1); this.carros.push(o); return o; };
        this.carros = [];
        this.tram = laço([[11.5, 9.5], [65.5, 9.5], [65.5, 33.5], [11.5, 33.5]], 150, 'lx-eletrico', 270, [[38.5, 9.5], [65.5, 21.5], [38.5, 33.5], [11.5, 21.5]]);
        laço([[12.5, 10.5], [46.5, 10.5], [46.5, 20.5], [12.5, 20.5]], 135, 'lx-carro', 136);
        laço([[66.5, 20.5], [28.5, 20.5], [28.5, 34.5], [66.5, 34.5]], 120, 'lx-carrinha', 150); // gegen den Uhrzeigersinn: äußere Spuren
        laço([[48.5, 22.5], [64.5, 22.5], [64.5, 32.5], [48.5, 32.5]], 128, 'lx-carro', 136);
      }
      andaCarro(o, dt) {
        if (o.bum > 0) { o.bum -= dt; return; } // nach einem Zusammenstoß bleibt das Auto kurz stehen
        if (o.parado > 0) { o.parado -= dt; if (o.parado <= 0 && o.tram) B.play(this, 'sino-eletrico', { volume: this.perto(o) }); return; }
        const [tx, ty] = o.p[(o.i + 1) % o.p.length], d = Math.hypot(tx - o.x, ty - o.y), ux = (tx - o.x) / (d || 1), uy = (ty - o.y) / (d || 1); o.dir = Math.abs(ux) > Math.abs(uy) ? (ux < 0 ? 'l' : 'r') : uy < 0 ? 'u' : 'd';
        // warten, wenn jemand im Weg ist (Figur, Fahrzeug, anderes Auto)
        const vorn = { x: o.x + ux * 70, y: o.y + uy * 70 - 10 }, weg = [this.irmas.ada, this.irmas.selma, ...this.carros.filter(c => c !== o)].some(e => Math.hypot(e.x - vorn.x, e.y - vorn.y) < 46);
        if (weg && !o.tram) { o.buzina -= dt; if (o.buzina <= 0 && dist(this.eu, o) < 130) { o.buzina = 2.5; B.play(this, 'honk', { volume: 0.35 }); } return; }
        if (weg && o.tram && dist(this.eu, vorn) < 46 && !this.eu.veh?.tram) return;
        const s = Math.min(o.v * dt, d); o.x += ux * s; o.y += uy * s; if (d - s < 1) o.i = (o.i + 1) % o.p.length;
        if (o.tram) { for (const [hx, hy] of o.paragens) if (Math.hypot(hx - o.x, hy - o.y) < o.v * dt * 0.6 + 0.5) { o.x = hx; o.y = hy; o.parado = 4.5; } o.gente.forEach(f => { f.x = o.x; f.y = o.y; }); }
      }
      perto(o) { return Phaser.Math.Clamp(1 - dist(o, this.eu) / 700, 0, 1) * 0.5; }

      /* ---------- Anzeige ---------- */
      anzeige() {
        const hud = o => o.setScrollFactor(0), txt = (x, y, s, size = 26, cor = '#0f1f4d') => hud(this.add.text(x, y, s, { fontFamily: 'sans-serif', fontSize: size + 'px', fontStyle: 'bold', color: cor, stroke: '#ffffff', strokeThickness: 5 }).setDepth(9000));
        // Abendlicht über allem
        this.luz = hud(this.add.rectangle(0, 0, W, H, 0xff9a3c, 0).setOrigin(0).setDepth(8000));
        // die beiden Schwestern oben links: antippen = umschalten
        this.retratos = ['ada', 'selma'].map((n, i) => { const x = 48 + i * 74, c = hud(this.add.circle(x, 46, 31, 0xffffff).setStrokeStyle(5, 0xc9d4ee).setDepth(9000)), im = hud(this.add.image(x, 52, this.tx('gast-' + n)).setDepth(9001)); im.setScale(64 / im.width);
          const mk = this.make.graphics({ add: false }); mk.fillCircle(x, 46, 28); mk.setScrollFactor(0); im.setMask(mk.createGeometryMask()); c.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.trocar(n)); return { n, c, im }; });
        this.tApitos = txt(18, 84, '', 26); this.tSterne = txt(W - 18, 14, '⭐ 0', 30).setOrigin(1, 0); this.tAzul = txt(W - 18, 52, '', 22).setOrigin(1, 0); this.tSol = txt(W - 18, 82, '☀️', 22).setOrigin(1, 0);
        this.barra = hud(this.add.rectangle(W - 60, 96, 0, 8, 0xffb300).setOrigin(1, 0.5).setDepth(9000));
        // Auftragskarte oben in der Mitte: Bild des Ziels, 🔊 = noch einmal hören
        const kb = hud(this.add.graphics().setDepth(9000)); kb.fillStyle(0xffffff, 0.96).fillRoundedRect(W / 2 - 150, 8, 300, 70, 18).lineStyle(4, 0xc9d4ee).strokeRoundedRect(W / 2 - 150, 8, 300, 70, 18);
        this.cartao = { kb, pic: hud(this.add.image(W / 2 - 110, 43, 'azulejo').setDepth(9001)), quem: hud(this.add.image(W / 2 + 112, 46, 'azulejo').setDepth(9001)), t: txt(W / 2, 43, '🔊', 20).setOrigin(0.5).setDepth(9001),
          z: hud(this.add.zone(W / 2, 43, 300, 70).setDepth(9002)).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.falarDeNovo()) };
        this.cartao.t.setWordWrapWidth(150).setAlign('center'); this.mostraCartao(null);
        // Pfeil zum Ziel und Marke über dem Ziel
        const g = this.make.graphics({ add: false }); g.fillStyle(0xff3b30).fillTriangle(36, 18, 4, 2, 4, 34).lineStyle(4, 0xffffff).strokeTriangle(36, 18, 4, 2, 4, 34); g.generateTexture('seta', 40, 36); g.destroy();
        this.seta = hud(this.add.image(0, 0, 'seta').setDepth(8500).setVisible(false)); this.alvo = this.add.text(0, 0, '⬇️', { fontSize: '34px' }).setOrigin(0.5, 1).setDepth(5001).setVisible(false);
        // Knöpfe unten rechts
        const knopf = (x, y, r, cor, fn) => { const c = hud(this.add.circle(x, y, r, cor).setStrokeStyle(5, 0xffffff).setDepth(9000)), t = hud(this.add.text(x, y, '', { fontSize: Math.round(r * 0.95) + 'px' }).setOrigin(0.5).setDepth(9001)); c.setInteractive({ useHandCursor: true }).on('pointerdown', fn); return { c, t, mostra(s) { c.setVisible(!!s); t.setVisible(!!s); if (s) t.setText(s); } }; };
        this.kAcao = knopf(W - 66, H - 66, 48, 0x2f9e4f, () => this.acao()); this.kBuzina = knopf(W - 66, H - 176, 36, 0xf2b01e, () => this.buzinar()); this.kRadio = knopf(W - 160, H - 50, 30, 0x7d3fc0, () => { this.sender = (this.sender + 1) % 4; this.tocarRadio(true); B.play(this, 'pop', { volume: 0.4 }); });
        // kleine Karte unten links
        hud(this.add.rectangle(14, H - 14, COLS * 2 + 8, ROWS * 2 + 8, 0xffffff).setOrigin(0, 1).setDepth(9000)); hud(this.add.image(18, H - 18, 'karte').setOrigin(0, 1).setDepth(9001)); this.pontos = hud(this.add.graphics().setDepth(9002));
        this.carga = this.add.container(0, 0).setDepth(5600).setVisible(false); this.cargaIm = this.add.image(0, 0, 'azulejo'); this.carga.add([this.add.circle(0, 0, 27, 0xffffff).setStrokeStyle(4, 0xffc400), this.cargaIm]);
        // Sprechblase (in der Welt, über der Figur)
        this.balao = this.add.container(0, 0).setDepth(6000).setVisible(false); const bg = this.add.graphics(); this.balaoT = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#1b2440', align: 'center', wordWrap: { width: 230 } }).setOrigin(0.5); this.balao.add([bg, this.balaoT]); this.balaoBg = bg;
      }
      mostraCartao(pic, quem, texto) { const c = this.cartao, an = !!(pic || texto); [c.kb, c.pic, c.quem, c.t].forEach(o => o.setVisible(an)); c.z.input.enabled = an; if (!an) return;
        const put = (im, k, s) => { im.setVisible(!!k); if (k) { im.setTexture(this.tx(k)); im.setScale(s / Math.max(im.width, im.height)); } }; put(c.pic, pic, 60); put(c.quem, quem, 60); c.t.setText(this.api.reader && texto ? texto : '🔊').setFontSize(this.api.reader && texto ? 15 : 26); }
      // jemand sagt etwas: Ton, Sprechblase über der Figur, danach weiter
      falar(f, texto, depois) {
        const antes = this.falaFim; this.falaFim = null; if (antes) antes(); // wer gerade sprach, ist damit fertig: sein Ablauf geht weiter
        this.ultimo = [f, texto]; const b = this.balao, t = this.api.reader ? texto : '💬'; this.balaoT.setText(t).setFontSize(this.api.reader ? 19 : 30); const w = this.balaoT.width + 26, h = this.balaoT.height + 18;
        this.balaoBg.clear().fillStyle(0xffffff, 0.97).fillRoundedRect(-w / 2, -h / 2, w, h, 14).lineStyle(3, 0xc9d4ee).strokeRoundedRect(-w / 2, -h / 2, w, h, 14).fillStyle(0xffffff).fillTriangle(-8, h / 2 - 1, 8, h / 2 - 1, 0, h / 2 + 12);
        this.balaoDe = f; b.setVisible(true); let fim = false; const next = () => { if (fim) return; fim = true; if (this.falaFim === next) { this.falaFim = null; b.setVisible(false); } if (depois) depois(); }; this.falaFim = next;
        this.api.say(texto, { onend: () => this.time.delayedCall(250, next) }); this.time.delayedCall(Math.max(2600, texto.length * 95), next);
      }
      falarDeNovo() { if (this.m && this.m.frase) this.falar(this.np[this.m.def.p] || this.eu, this.m.frase); }

      /* ---------- Eingabe ---------- */
      eingabe() {
        this.dedo = null; this.destino = null;
        this.input.on('pointerdown', (p, sobre) => { if (sobre.length || !this.pronto || this.preso) return; this.dedo = { id: p.id, x0: p.x, y0: p.y, t0: this.time.now }; this.destino = null; });
        this.input.on('pointerup', p => { const d = this.dedo; if (!d || d.id !== p.id) return; this.dedo = null; if (this.time.now - d.t0 < 260 && Math.hypot(p.x - d.x0, p.y - d.y0) < 16) { const w = this.cameras.main.getWorldPoint(p.x, p.y), f = this.eu, wie = this.modo(f); const r = this.caminho(f.x, f.y, w.x, w.y, wie); if (r) this.destino = r; } });
        this.input.on('pointerupoutside', () => { this.dedo = null; });
        const k = this.input.keyboard; if (k) { this.teclas = k.createCursorKeys(); k.on('keydown-SPACE', () => this.acao()); k.on('keydown-TAB', e => { e.preventDefault(); this.trocar(this.eu.id === 'ada' ? 'selma' : 'ada'); }); k.on('keydown-H', () => this.buzinar()); }
      }
      modo(f) { return !f.veh ? 'pe' : motor(f.veh) ? 'tuk' : f.veh.tipo === 'barco' ? 'barco' : 'pe'; }
      trocar(n) { if (!this.pronto || this.preso || this.eu.id === n) return; this.eu.mov = false; this.eu = this.irmas[n]; this.dedo = null; this.destino = null; B.play(this, 'whoosh', { volume: 0.4 }); this.tocarRadio(!!this.eu.veh && this.eu.veh.tipo !== 'skate'); }
      // was der grüne Knopf gerade tut: aussteigen, einsteigen (nächstes freies Fahrzeug) oder nichts
      oQue() { const f = this.eu; if (f.veh) return this.saida(f) ? ['🚪', () => this.sair(f)] : null;
        if (this.tram.parado > 0 && dist(f, this.tram) < 110) return ['🚋', () => { const v = this.tram; v.gente.push(f); f.veh = v; f.dentro = true; this.destino = null; B.play(this, 'pop', { volume: 0.5 }); }];
        let best = null; for (const v of this.veics) if (!v.quem) { const d = dist(f, v); if (d < (v.tipo === 'barco' ? 120 : motor(v) ? 90 : 70) && (!best || d < best[0])) best = [d, v]; }
        return best ? [FAHR[best[1].tipo].e, () => this.entrar(f, best[1])] : null; }
      acao() { if (!this.pronto || this.preso) return; const a = this.oQue(); if (a) a[1](); }
      buzinar() { const f = this.eu; if (!motor(f.veh)) return; B.play(this, 'honk', { volume: 0.6 }); this.pombos.forEach(p => { if (dist(p, f) < 260) this.voar(p, false); }); this.gente.forEach(g => { if (dist(g, f) < 150) g.warte = 1.2; }); }

      fixo(o) { o.setScrollFactor(0); if (o.list) o.list.forEach(x => this.fixo(x)); return o; }

      /* ---------- Start: wer bist du? ---------- */
      escolher() {
        const cam = this.cameras.main; cam.centerOn(this.eu.x, this.eu.y - 60);
        const o = this.add.container(0, 0).setScrollFactor(0).setDepth(9500), bg = this.add.rectangle(0, 0, W, H, 0x0f1f4d, 0.55).setOrigin(0).setInteractive(); o.add(bg);
        o.add(this.add.text(W / 2, 92, 'Lisboa é nossa!', { fontFamily: 'sans-serif', fontSize: '54px', fontStyle: 'bold', color: '#ffffff', stroke: '#1b4fa0', strokeThickness: 10 }).setOrigin(0.5));
        const vai = n => { if (this.pronto) return; this.eu = this.irmas[n]; o.destroy(); this.pronto = true; B.play(this, 'go', { volume: 0.5 }); this.falar(this.np.mama, 'Bom dia! Divirtam-se!'); };
        ['ada', 'selma'].forEach((n, i) => { const x = W / 2 + (i ? 150 : -150), c = this.add.circle(x, 300, 112, 0xffffff).setStrokeStyle(8, i ? 0xff7fb0 : 0x2fb8c8), im = this.add.image(x, 320, this.tx('gast-' + n)); im.setScale(215 / im.width);
          const mk = this.make.graphics({ add: false }); mk.fillCircle(x, 300, 106); mk.setScrollFactor(0); im.setMask(mk.createGeometryMask()); c.setInteractive({ useHandCursor: true }).on('pointerdown', () => vai(n)); o.add([c, im]); this.tweens.add({ targets: c, scale: 1.05, duration: 650, yoyo: true, repeat: -1, delay: i * 300 }); });
        this.fixo(o); if (window.OLA_LISBOA_AUTO) this.time.delayedCall(400, () => vai('ada'));
      }

      /* ---------- Aufträge ---------- */
      // Schritte: { ort | x,y (Ziel), raio, pic (Bild auf der Karte), frase, em: was dort passiert }
      comeca(a) {
        const v = a.var ? Phaser.Utils.Array.GetRandom(a.var) : null, dono = this.np[a.p], m = this.m = { def: a, v, passos: [], i: -1, frase: null }, ort = n => ({ x: px(ORTE[n][0]), y: px(ORTE[n][1]), pic: ORTE[n][2] || null });
        a.anel.setVisible(false); a.sinal.setVisible(false); B.play(this, 'star', { volume: 0.4 });
        const volta = { x: a.x, y: a.y, pic: 'gast-' + a.p, em: () => this.acaba(a.fim) };
        if (a.art === 'compras') { const frase = v[1] || a.ir, dito = v[1] ? [a.ir, v[1]] : [a.ir];
          m.passos = [{ ...ort(a.loja), pic: this.textures.exists('wp-' + v[0]) ? 'wp-' + v[0] : ort(a.loja).pic, frase, em: next => this.escolha(dono, frase, v[0], a.outras, next) }, { ...volta, levar: 'wp-' + v[0] }]; this.diz(dono, dito, () => this.passo()); }
        else if (a.art === 'foto') { m.passos = [{ ...ort(v[0]), frase: v[1], em: () => { this.flash(); this.time.delayedCall(700, () => this.acaba(a.fim)); } }]; this.diz(dono, [v[1]], () => this.passo()); }
        else if (a.art === 'taxi') { this.segue = dono; m.passos = [{ ...ort(v[0]), frase: v[1], em: () => this.acaba(a.fim) }]; this.diz(dono, [v[1]], () => this.passo()); }
        else if (a.art === 'pipo') { const p = ort(v[0]); this.pipo.x = p.x; this.pipo.y = p.y; this.pipo.vis = true; m.passos = [{ ...p, raio: 60, frase: v[1], em: next => { B.play(this, 'bark', { volume: 0.7 }); this.segue = this.pipo; this.falar(this.eu, 'Encontrei-te, Pipo!', next); } }, volta]; this.diz(dono, [a.ir, v[1]], () => this.passo()); }
        else if (a.art === 'ilha') { this.pandi.vis = true; m.passos = [{ ...ort('ilha'), pic: 'lx-fig-pandi', frase: a.ir, em: next => { B.play(this, 'pandi-found', { volume: 0.6 }); this.segue = this.pandi; this.falar(this.eu, 'Olha, o Pandi!', next); } }, volta]; this.diz(dono, [a.ir], () => this.passo()); }
        else if (a.art === 'placas') { const tres = Phaser.Utils.Array.Shuffle(a.var.slice()).slice(0, 3); m.passos = tres.map(([n, frase], i) => ({ ...ort(n), pic: null, semSeta: true, frase, em: next => { B.play(this, 'collect', { volume: 0.6 }); B.plus(this, this.eu.x, this.eu.y - 90, '✨', '#ffb300'); if (i < 2) next(); else { this.pondi.x = this.eu.x + 60; this.pondi.y = this.eu.y + 10; this.pondi.vis = true; B.play(this, 'pondi-happy', { volume: 0.6 }); this.acaba(a.fim, this.eu); this.time.delayedCall(5000, () => { this.pondi.vis = false; }); } } })); this.diz(dono, [a.ir], () => this.passo()); }
        else if (a.art === 'corrida') { const z = ort('praia'); m.passos = [{ ...z, raio: 90, frase: a.ir, em: () => { if (m.fim) return; m.fim = true; this.rival = null; this.acaba(a.ganhou); } }]; const leo = dono; leo.casa = [leo.x, leo.y];
          this.diz(dono, [a.ir, a.vai], () => { B.play(this, 'go', { volume: 0.6 }); this.passo(); this.rival = { f: leo, x: z.x + 60, y: z.y, v: 262 }; }); }
      }
      diz(f, frases, depois) { const [a, ...resto] = frases; this.falar(f, a, () => resto.length ? this.diz(f, resto, depois) : depois && depois()); }
      passo() { const m = this.m; if (!m) return; m.i++; const p = m.passos[m.i]; if (!p) return; m.frase = p.frase || m.frase; this.levo = p.levar && this.textures.exists(p.levar) ? p.levar : null; this.mostraCartao(this.levo || p.pic, 'gast-' + m.def.p, m.frase); if (p.frase && m.i > 0 && m.def.art === 'placas') this.falar(this.np[m.def.p], p.frase); }
      chegou() { const m = this.m, p = m.passos[m.i]; if (!p || p.ocupado) return; p.ocupado = true; p.em(() => { p.ocupado = false; this.passo(); }); }
      acaba(frase, quem) {
        const m = this.m, a = m.def; this.m = null; this.mostraCartao(null); this.feito[a.id] = true;
        // die Sache, die man dabeihat, wandert zum Auftraggeber
        if (this.levo) { const d = this.np[a.p], b = this.add.image(this.carga.x, this.carga.y, this.levo).setDepth(5600); b.setScale(44 / Math.max(b.width, b.height)); this.tweens.add({ targets: b, x: d.x, y: d.y - d.alt * 0.6, scale: b.scale * 0.5, duration: 500, onComplete: () => b.destroy() }); this.levo = null; }
        this.sterne++; this.salvo.st++; this.salvo.m[a.id] = (this.salvo.m[a.id] || 0) + 1; if (this.api.store) this.api.store.set(this.salvo);
        B.play(this, 'win', { volume: 0.5 }); B.plus(this, this.eu.x, this.eu.y - 100, '⭐', '#ffb300'); this.tSterne.setText('⭐ ' + this.sterne); this.tweens.add({ targets: this.tSterne, scale: 1.4, duration: 160, yoyo: true });
        this.add.particles(this.eu.x, this.eu.y - 60, 'star', { speed: { min: 80, max: 220 }, lifespan: 900, quantity: 14, scale: { start: 1, end: 0 }, emitting: false }).setDepth(5500).explode(14);
        const seg = this.segue; this.segue = null; if (seg && seg !== this.np[a.p]) { this.time.delayedCall(2500, () => { seg.vis = seg === this.pipo; if (seg === this.pipo) { seg.x = this.np.ines.x - 40; seg.y = this.np.ines.y + 20; } }); }
        if (a.art === 'taxi') { const r = this.np.rute; this.time.delayedCall(4000, () => { r.x = a.o[0] * T; r.y = a.o[1] * T; r.dentro = false; }); }
        this.falar(quem || this.np[a.p], frase);
        // alle erledigt: es geht von vorn los
        this.time.delayedCall(6000, () => { if (AUFTRAEGE.every(x => this.feito[x.id])) this.feito = {}; });
      }
      // drei Bildkarten: welche ist gemeint?
      escolha(dono, frase, certo, outras, next) {
        this.preso = true; this.dedo = null; this.destino = null; const o = this.add.container(0, 0).setScrollFactor(0).setDepth(9500); o.add(this.add.rectangle(0, 0, W, H, 0x0f1f4d, 0.5).setOrigin(0).setInteractive());
        const op = Phaser.Utils.Array.Shuffle([certo, ...Phaser.Utils.Array.Shuffle(outras.filter(w => this.textures.exists('wp-' + w))).slice(0, 2)]);
        const quem = this.add.image(W / 2 - 60, 96, this.tx('gast-' + dono.id)), qs = quem.setScale(120 / Math.max(quem.width, quem.height)), som = this.add.text(W / 2 + 30, 92, this.api.reader ? frase : '🔊', { fontFamily: 'sans-serif', fontSize: this.api.reader ? '26px' : '50px', fontStyle: 'bold', color: '#ffffff', stroke: '#1b4fa0', strokeThickness: 6 }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.api.say(frase)); o.add([quem, som]);
        op.forEach((w, i) => { const c = this.add.container(W / 2 + (i - (op.length - 1) / 2) * 220, 320), g = this.add.graphics(); g.fillStyle(0xffffff).fillRoundedRect(-92, -92, 184, 184, 22).lineStyle(6, 0xc9d4ee).strokeRoundedRect(-92, -92, 184, 184, 22); const im = this.add.image(0, 0, this.tx('wp-' + w)); im.setScale(150 / Math.max(im.width, im.height)); c.add([g, im]); c.setSize(184, 184).setInteractive({ useHandCursor: true }).setData('w', w);
          c.on('pointerdown', () => { if (w === certo) { B.play(this, 'collect', { volume: 0.6 }); this.tweens.add({ targets: c, scale: 1.2, duration: 200, yoyo: true, onComplete: () => { o.destroy(); this.preso = false; this.eu.levar = 'wp-' + certo; next(); } }); } else { B.play(this, 'honk', { volume: 0.4 }); this.tweens.add({ targets: c, x: c.x + 10, duration: 60, yoyo: true, repeat: 3 }); this.api.say(frase); } }); o.add(c); if (window.OLA_LISBOA_AUTO && w === certo) this.time.delayedCall(900, () => c.emit('pointerdown')); });
        this.fixo(o); this.api.say(frase);
      }
      flash() { B.play(this, 'shutter', { volume: 0.7 }); const r = this.add.rectangle(0, 0, W, H, 0xffffff, 0.95).setOrigin(0).setScrollFactor(0).setDepth(9400); this.tweens.add({ targets: r, alpha: 0, duration: 500, onComplete: () => r.destroy() }); }

      /* ---------- Unfug und Polizistin ---------- */
      unfug(x, y) { if (this.semCulpa > 0 || this.preso) return; this.semCulpa = 1.5; this.apitos = Math.min(3, this.apitos + 1); B.play(this, 'apito', { volume: 0.5 }); B.plus(this, x, y - 40, '🚨', '#e03a2f');
        const p = this.pol; if (!p.on) { const f = this.eu; let best = null; for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, x1 = f.x + Math.cos(a) * 620, y1 = f.y + Math.sin(a) * 420; if (x1 > 40 && y1 > 40 && x1 < WW - 40 && y1 < WH - 40 && this.livre(x1, y1, 'pe') && this.caminho(x1, y1, f.x, f.y, 'pe')) { best = [x1, y1]; break; } } if (!best) return; p.x = best[0]; p.y = best[1]; p.on = true; p.vis = true; p.longe = 0; p.tempo = 0; p.rota = null; } }
      policia(dt) {
        const p = this.pol, f = this.eu; if (!p.on || this.preso) return; const d = dist(p, f); p.tempo += dt; p.longe = d > 600 ? p.longe + dt : 0;
        if (p.longe > 5 || p.tempo > 40 || (f.veh && f.veh.tipo === 'barco' && p.tempo > 8)) { p.on = false; this.apitos = 0; B.plus(this, p.x, p.y - 110, '❓', '#1b3fa0'); this.time.delayedCall(2200, () => { if (!p.on) p.vis = false; }); return; }
        if (d < 50 && !(f.veh && f.veh.tram)) return this.apanhada();
        this.andar(p, f.x, f.y, 205 + this.apitos * 12, dt, 30);
      }
      apanhada() {
        const p = this.pol, f = this.eu; this.preso = true; this.dedo = null; this.destino = null; f.mov = false; p.mov = false; f.vx = f.vy = 0; B.play(this, 'apito', { volume: 0.7 });
        this.falar(p, 'Alto! Isso não se faz!'); const b = this.add.container(W / 2, H - 120).setScrollFactor(0).setDepth(9500), c = this.add.circle(0, 0, 62, 0xffffff).setStrokeStyle(8, 0x2f9e4f), t = this.add.text(0, 0, '🙏', { fontSize: '62px' }).setOrigin(0.5); b.add([c, t]); this.fixo(b); this.tweens.add({ targets: b, scale: 1.12, duration: 420, yoyo: true, repeat: -1 });
        const pede = () => { if (!b.active) return; b.destroy(); this.falar(f, 'Desculpa!', () => this.falar(p, 'Está bem! Mas cuidado!', () => { this.preso = false; this.apitos = 0; p.on = false; this.semCulpa = 3; this.time.delayedCall(1500, () => { if (!p.on) p.vis = false; });
          const v = f.veh; if (motor(v)) { this.sair(f); v.x = v.casa[0]; v.y = v.casa[1]; v.dir = 'r'; } })); };
        c.setInteractive({ useHandCursor: true }).on('pointerdown', pede); if (window.OLA_LISBOA_AUTO) this.time.delayedCall(1800, pede);
      }
      pum(c, x, y) { B.play(this, 'bonk', { volume: 0.6 }); this.cameras.main.shake(160, 0.006); B.plus(this, x, y - 20, '💥', '#e03a2f');
        this.add.particles(x, y, 'star', { speed: { min: 90, max: 240 }, lifespan: 700, scale: { start: 1.1, end: 0 }, emitting: false }).setDepth(5500).explode(10);
        this.tweens.add({ targets: c.im, angle: { from: -9, to: 9 }, duration: 70, yoyo: true, repeat: 4, onComplete: () => c.im.setAngle(0) }); this.time.delayedCall(350, () => B.play(this, 'honk', { volume: 0.45 })); }
      voar(p, culpa) { if (p.weg > 0) return; p.weg = 14; p.im.setVisible(false); B.play(this, 'gull', { volume: 0.25 }); for (let i = 0; i < 3; i++) { const b = this.add.image(p.x - 30 + i * 30, p.y - 20, this.tx('pombo')).setScale(0.22).setDepth(5200); this.tweens.add({ targets: b, x: b.x - rnd(200, 420), y: b.y - rnd(260, 420), duration: rnd(1100, 1600), onComplete: () => b.destroy() }); } if (culpa) this.unfug(p.x, p.y); }

      /* ---------- Ablauf ---------- */
      update(time, delta) {
        const dt = Math.min(0.05, delta / 1000), cam = this.cameras.main, f = this.eu; this.glitzer.tilePositionX += dt * 14;
        if (this.pronto && !this.over) { this.zeit += dt; if (this.semCulpa > 0) this.semCulpa -= dt; this.controla(f, dt); this.outros(dt); this.policia(dt); this.missao(dt); this.dia(); }
        // alles zeichnen
        const o = this.irmas; [o.ada, o.selma].forEach(s => { const v = s.veh; s.dy = 0; s.dz = 0; s.escala = 1; if (v && !v.tram) { s.x = v.x; s.y = v.y; s.dir = v.dir; if (v.tipo === 'skate') { s.dy = -6; s.dz = 1; } else if (v.tipo === 'tuk') { s.dy = -36; s.dz = -1; s.escala = 0.6; } else if (v.tipo === 'barco') { s.dy = -26; s.dz = -2; s.escala = 0.9; } } });
        this.veics.forEach(v => this.malVeic(v)); this.ents.forEach(e => this.malFig(e, time));
        this.carros.forEach(c => { const n = c.dir === 'd' ? 2 : c.dir === 'u' ? 3 : 1, q = c.tram && c.gente[0], base = q && this.textures.exists(`${c.k}-${q.id}-1`) ? `${c.k}-${q.id}` : c.k, k = this.tx(`${base}-${n}`); if (c.im.texture.key !== k) c.im.setTexture(this.textures.exists(`${base}-${n}`) ? k : this.tx(c.tram ? 'eletrico' : 'tram-carro')); c.im.setScale(c.s / Math.max(c.im.width, 1) * (c.im.width === 256 ? 1 : 0.9)).setFlipX(c.dir === 'l').setPosition(c.x, c.y + 14).setDepth(1000 + c.y + 14); });
        if (this.balao.visible && this.balaoDe) this.balao.setPosition(Phaser.Math.Clamp(this.balaoDe.x, cam.scrollX + 130, cam.scrollX + W - 130), Math.max(cam.scrollY + 110, this.balaoDe.y - (this.balaoDe.alt || 80) - 46));
        // Kamera folgt weich
        const tx = Phaser.Math.Clamp(f.x - W / 2, 0, WW - W), ty = Phaser.Math.Clamp(f.y - H / 2 - 20, 0, WH - H), k = this.pronto ? Math.min(1, dt * 6) : 1; cam.scrollX += (tx - cam.scrollX) * k; cam.scrollY += (ty - cam.scrollY) * k;
        const sg = this.segue, kc = this.levo || (sg && sg.dentro ? (this.textures.exists('gast-' + sg.id) ? 'gast-' + sg.id : 'lx-fig-' + sg.id) : null); this.carga.setVisible(!!kc && this.pronto);
        if (kc) { if (this.cargaIm.texture.key !== kc) { this.cargaIm.setTexture(this.tx(kc)); this.cargaIm.setScale(40 / Math.max(this.cargaIm.width, this.cargaIm.height)); } const v = f.veh; this.carga.setPosition(f.x, f.y - (v ? (v.tram ? 150 : v.tipo === 'skate' ? f.alt + 60 : 130) : f.alt + 36) + Math.sin(time / 200) * 4); }
        this.hud(time);
      }
      controla(f, dt) {
        if (this.preso) { f.mov = false; return; } const v = f.veh; if (v && v.tram) return;
        const wie = this.modo(f), d = v ? FAHR[v.tipo] : null, chao = this.em(Math.floor(f.x / T), Math.floor(f.y / T)); let vmax = v ? d.v : 195; if (v && v.tipo !== 'barco' && (chao === GR || chao === SA || chao === FL || chao === PT)) vmax *= 0.55; else if (motor(v) && chao === PV) vmax *= 0.8;
        let ax = 0, ay = 0; const cam = this.cameras.main, t = this.teclas;
        if (t && (t.left.isDown || t.right.isDown || t.up.isDown || t.down.isDown)) { ax = (t.right.isDown ? 1 : 0) - (t.left.isDown ? 1 : 0); ay = (t.down.isDown ? 1 : 0) - (t.up.isDown ? 1 : 0); this.destino = null; }
        else if (this.dedo) { const p = this.input.manager.pointers.find(q => q.id === this.dedo.id) || this.input.activePointer, w = cam.getWorldPoint(p.x, p.y), dx = w.x - f.x, dy = w.y - (f.y - 24), dd = Math.hypot(dx, dy); if (dd > 18 && this.time.now - this.dedo.t0 > 90) { ax = dx / dd; ay = dy / dd; if (dd < 60) { ax *= dd / 60; ay *= dd / 60; } } }
        else if (this.destino && this.destino.length) { while (this.destino.length > 1 && Math.hypot(this.destino[0][0] - f.x, this.destino[0][1] - f.y) < 20) this.destino.shift(); const [zx, zy] = this.destino[0], dd = Math.hypot(zx - f.x, zy - f.y), fim = this.destino.length === 1; if (dd < (v ? 26 : 10)) { if (fim) { this.destino = null; if (v) { f.vx *= 0.4; f.vy *= 0.4; } } else this.destino.shift(); } else { const k = fim && v ? Phaser.Math.Clamp(dd / 110, 0.3, 1) : 1; ax = (zx - f.x) / dd * k; ay = (zy - f.y) / dd * k; } }
        const n = Math.hypot(ax, ay); if (n > 1) { ax /= n; ay /= n; }
        const a = v ? d.a : 12, kx = Math.min(1, a * dt); f.vx += (ax * vmax - f.vx) * kx; f.vy += (ay * vmax - f.vy) * kx; const vel = Math.hypot(f.vx, f.vy);
        const alvo = v || f, ant = [alvo.x, alvo.y]; if (vel > 6) { const andou = this.mover(alvo, f.vx * dt, f.vy * dt, wie, v && v.tipo !== 'skate' ? 20 : 11); if (!andou) { f.vx *= 0.3; f.vy *= 0.3; this.destino = null; } if (n > 0.1) this.olhar(alvo, ax, ay); }
        f.mov = vel > 20; if (f.mov) f.t += dt * (vel / 195); if (v) { f.x = v.x; f.y = v.y; }
        if (this.motor) this.motor.setVolume(motor(v) ? 0.05 + Math.min(0.2, vel / 1800) : 0);
        // Staub hinter dem Tuk-Tuk, Kielwasser hinter dem Boot
        if (v && vel > 150 && (this.poT = (this.poT || 0) - dt) < 0) { this.poT = 0.07; const p = this.add.image(v.x - f.vx * 0.05 + rnd(-8, 8), v.y - 4 + rnd(-4, 4), v.tipo === 'barco' ? 'bubble' : 'dot').setDepth(990).setAlpha(v.tipo === 'barco' ? 0.9 : 0.45).setScale(0.6); this.tweens.add({ targets: p, alpha: 0, scale: 1.6, duration: 450, onComplete: () => p.destroy() }); }
        // Unfug: mit Fahrzeug durchs Beet, Tauben, Auto anrempeln
        if (v && v.tipo !== 'barco' && vel > 80) { this.beete.forEach(b => { if (b.platt <= 0 && Math.abs(v.x - b.x) < b.w / 2 && Math.abs(v.y - b.y) < b.h / 2 + 8) { b.platt = 25; b.ims.forEach(im => im.setScale(im.scaleX, im.scaleY * 0.45).setTint(0x9a8a6a)); B.play(this, 'bonk', { volume: 0.35 }); this.unfug(b.x, b.y); } });
          this.carros.forEach(c => { if (!c.tram && motor(v) && Math.hypot(c.x - v.x, c.y - 10 - v.y) < 56 && !(c.bum > 0)) { c.bum = 1.2; v.x = ant[0]; v.y = ant[1]; f.vx *= -0.6; f.vy *= -0.6; this.pum(c, (c.x + v.x) / 2, (c.y + v.y) / 2 - 30); this.unfug(c.x, c.y); } }); }
        this.pombos.forEach(p => { if (p.weg <= 0 && dist(p, alvo) < (v ? 120 : 70)) this.voar(p, motor(v)); });
        // Kacheln einsammeln
        this.azulejos = this.azulejos.filter(z => { if (Math.hypot(z.x - alvo.x, z.y - alvo.y + 10) > 40) return true; this.tweens.killTweensOf(z.im); this.tweens.add({ targets: z.im, y: z.y - 80, alpha: 0, scale: 2, duration: 400, onComplete: () => z.im.destroy() }); B.play(this, 'collect', { volume: 0.45 }); this.azul++; this.salvo.az++; return false; });
      }
      // alle anderen: Autos, Elétrico, Spaziergänger, Begleiter, Wettlauf, Beete wachsen nach
      outros(dt) {
        this.carros.forEach(c => this.andaCarro(c, dt));
        this.gente.forEach(g => { if ((g.warte -= dt) > 0) { g.mov = false; return; } if (!g.ziel) { const n = Phaser.Utils.Array.GetRandom(['praca', 'mercado', 'pastelaria', 'casa', 'geladaria', 'oceanario', 'cais', 'igreja', 'escola', 'ponte']); g.ziel = [px(ORTE[n][0]) + rnd(-40, 40), px(ORTE[n][1]) + rnd(0, 30)]; } if (this.andar(g, g.ziel[0], g.ziel[1], 62, dt, 30)) { g.ziel = null; g.warte = rnd(2, 6); } });
        const s = this.segue, f = this.eu; if (s) { if (f.veh) { s.dentro = f.veh.tipo !== 'skate'; if (s.dentro) { s.x = f.x; s.y = f.y; } else this.andar(s, f.x, f.y + 4, 320, dt, 60); } else { if (s.dentro) { s.dentro = false; s.x = f.x - 30; s.y = f.y + 6; if (!this.livre(s.x, s.y, 'pe')) s.x = f.x + 30; } if (dist(s, f) > 400) { s.x = f.x - 40; s.y = f.y; } this.andar(s, f.x, f.y + 4, 215, dt, 58); } }
        const r = this.rival; if (r && this.m && !this.m.fim) { if (this.andar(r.f, r.x, r.y, r.v, dt, 40)) { this.m.fim = true; this.rival = null; const a = this.m.def; this.m = null; this.levo = null; this.mostraCartao(null); B.play(this, 'lose', { volume: 0.4 }); this.falar(r.f, a.perdeu); this.time.delayedCall(5000, () => { r.f.x = r.f.casa[0]; r.f.y = r.f.casa[1]; r.f.dir = 'd'; }); } }
        else if (this.np.leo.casa && !this.rival && !this.m && dist(this.np.leo, { x: this.np.leo.casa[0], y: this.np.leo.casa[1] }) > 60 && !this.leoVolta) { this.leoVolta = true; this.time.delayedCall(4000, () => { const l = this.np.leo; l.x = l.casa[0]; l.y = l.casa[1]; l.dir = 'd'; l.mov = false; this.leoVolta = false; }); }
        this.beete.forEach(b => { if (b.platt > 0 && (b.platt -= dt) <= 0) { b.ims.forEach(im => { im.clearTint(); im.setDisplaySize(b.w + 6, (b.w + 6) * im.height / im.width); }); } });
        this.pombos.forEach(p => { if (p.weg > 0 && (p.weg -= dt) <= 0) p.im.setVisible(true); });
      }
      missao(dt) {
        const f = this.eu; if (this.preso) return;
        if (!this.m) { for (const a of AUFTRAEGE) { const frei = !this.feito[a.id]; a.anel.setVisible(frei); a.sinal.setVisible(frei); if (frei && Math.hypot(a.x - f.x, a.y - f.y) < 44) { this.comeca(a); break; } } if (!this.m && window.OLA_LISBOA_AUTO) this.auto(dt); return; }
        AUFTRAEGE.forEach(a => { a.anel.setVisible(false); a.sinal.setVisible(false); });
        const p = this.m.passos[this.m.i]; if (!p) return; if (Math.hypot(p.x - f.x, p.y - f.y) < (p.raio || 74)) this.chegou(); else if (window.OLA_LISBOA_AUTO) this.auto(dt);
      }
      // Testfahrt: läuft von selbst zum nächsten Auftrag bzw. zum Ziel (zur Insel mit dem Boot)
      auto(dt) { const f = this.eu; let z = null; if (this.m) { const p = this.m.passos[this.m.i]; if (p && !p.ocupado) z = p; } else { let best = null; for (const a of AUFTRAEGE) if (!this.feito[a.id]) { const d = Math.hypot(a.x - f.x, a.y - f.y); if (!best || d < best[0]) best = [d, a]; } z = best && best[1]; }
        if (!z || this.destino) return; const insel = this.m && this.m.def.art === 'ilha', naInsel = this.em(Math.floor(f.x / T), Math.floor(f.y / T)) === SA && f.y < 44 * T && f.y > 38 * T;
        if (insel && !f.veh && (this.m.i === 0) !== naInsel) { const b = this.veics.find(v => v.tipo === 'barco' && !v.quem && dist(v, f) < 130); if (b) return this.entrar(f, b); const b2 = this.veics.filter(v => v.tipo === 'barco' && !v.quem).sort((a, c) => dist(a, f) - dist(c, f))[0]; this.destino = this.caminho(f.x, f.y, b2.x - 60, b2.y, 'pe'); return; }
        if (f.veh && f.veh.tipo === 'barco') { const perto = this.m.i === 0 ? [z.x, z.y - 60] : [40.5 * T, 41.6 * T]; if (Math.hypot(perto[0] - f.x, perto[1] - f.y) < 70 && this.saida(f)) return this.sair(f); this.destino = this.caminho(f.x, f.y, perto[0], perto[1], 'barco'); return; }
        this.destino = this.caminho(f.x, f.y, z.x, z.y, this.modo(f)); }
      // Tageszeit: gegen Abend wird das Licht warm, dann ruft Mama; am Ende ist die Runde vorbei
      dia() { const t = this.zeit / TAG; this.luz.setFillStyle(t > 0.9 ? 0x23306e : 0xff9a3c, t < 0.7 ? 0 : t < 0.9 ? (t - 0.7) * 1.1 : 0.22 + (t - 0.9) * 2);
        if (t > 0.88 && !this.chamou) { this.chamou = true; this.falar(this.eu, 'O jantar está pronto! Venham para casa!'); }
        if (t >= 1 && !this.over) { this.over = true; this.pronto = false; if (this.radio) this.radio.stop(); if (this.motor) this.motor.stop(); if (this.api.store) this.api.store.set(this.salvo); this.cameras.main.fadeOut(900, 20, 30, 80); this.time.delayedCall(1000, () => this.api.end({ score: `⭐ ${this.sterne}  🟦 ${this.azul}` })); } }
      hud(time) {
        const f = this.eu, cam = this.cameras.main; this.retratos.forEach(r => { const eu = r.n === f.id; r.c.setStrokeStyle(eu ? 7 : 4, eu ? 0xffc400 : 0xc9d4ee).setScale(eu ? 1 : 0.82); r.im.setAlpha(eu ? 1 : 0.75); });
        this.tApitos.setText('🚨'.repeat(this.apitos)); this.tAzul.setText('🟦 ' + this.azul); this.tSol.setText(this.zeit / TAG > 0.85 ? '🌙' : this.zeit / TAG > 0.65 ? '🌇' : '☀️'); this.barra.width = 110 * Math.max(0, 1 - this.zeit / TAG);
        const a = this.pronto && !this.preso ? this.oQue() : null; this.kAcao.mostra(a && a[0]); const tuk = this.pronto && motor(f.veh); this.kBuzina.mostra(tuk ? '📣' : null); this.kRadio.mostra(this.pronto && f.veh && f.veh.tipo !== 'skate' && !f.veh.tram ? ['🔇', '🎵', '🎶', '🎸'][this.sender] : null);
        // Pfeil am Bildrand zum Ziel
        const p = this.m && this.m.passos[this.m.i], z = p && !p.semSeta ? p : null; this.seta.setVisible(false); this.alvo.setVisible(false);
        if (z) { const sx = z.x - cam.scrollX, sy = z.y - cam.scrollY; if (sx > 30 && sx < W - 30 && sy > 100 && sy < H - 20) this.alvo.setVisible(true).setPosition(z.x, z.y - 86 + Math.sin(time / 180) * 8); else { const ang = Math.atan2(sy - H / 2, sx - W / 2); this.seta.setVisible(true).setRotation(ang).setPosition(Phaser.Math.Clamp(W / 2 + Math.cos(ang) * 400, 40, W - 40), Phaser.Math.Clamp(H / 2 + Math.sin(ang) * 220, 110, H - 40)); } }
        // Punkte auf der kleinen Karte
        const g = this.pontos, mx = x => 18 + x / T * 2, my = y => H - 18 - ROWS * 2 + y / T * 2; g.clear();
        if (!this.m) AUFTRAEGE.forEach(q => { if (!this.feito[q.id]) g.fillStyle(0xffc400).fillCircle(mx(q.x), my(q.y), 3.2).lineStyle(1, 0x000000).strokeCircle(mx(q.x), my(q.y), 3.2); });
        if (z && Math.floor(time / 300) % 2) g.fillStyle(0xff3b30).fillCircle(mx(z.x), my(z.y), 4.5);
        this.veics.forEach(v => { if (!v.quem) g.fillStyle(v.tipo === 'barco' ? 0x0b3f8f : v.tipo === 'skate' ? 0x12b8b0 : 0x333333).fillRect(mx(v.x) - 1.5, my(v.y) - 1.5, 3, 3); });
        g.fillStyle(0xf2c230).fillRect(mx(this.tram.x) - 3, my(this.tram.y) - 2, 6, 4); if (this.pol.on) g.fillStyle(0x1b3fa0).fillCircle(mx(this.pol.x), my(this.pol.y), 3.5);
        [this.irmas.ada, this.irmas.selma].forEach(s => g.fillStyle(s === f ? 0xffffff : 0xdddddd).fillCircle(mx(s.x), my(s.y), s === f ? 4.5 : 3).lineStyle(2, s.id === 'ada' ? 0x2fb8c8 : 0xff5fa0).strokeCircle(mx(s.x), my(s.y), s === f ? 4.5 : 3));
      }
    };
  }
})();
