// Lisboa é nossa!: offene Stadt, schräg von oben. Ada und Selma laufen frei durch Lissabon, steigen auf Skate, Moped, Tuk-Tuk, Auto,
// Boot und Elétrico um und erledigen Aufträge, die ihnen die Figuren auf Portugiesisch geben (Einkaufen, Foto, Wettrennen,
// etwas suchen oder bringen, Taxi, Tiere einfangen, vertauschte Schilder). Wer Unfug macht (mit dem Fahrzeug durch Blumenbeete,
// Tauben aufscheuchen, Autos anrempeln), dem läuft die Polizistin nach; erwischt heißt nur „Desculpa!“. Ein Spieltag dauert rund
// sieben Minuten (Abendlicht, Mama ruft zum Essen). Belohnung: Sterne für Aufträge und blaue Kacheln (Azulejos) zum Sammeln.
// Steuern: Finger halten = die Figur läuft oder fährt dorthin; kurz tippen = sie sucht sich den Weg; Knopf unten rechts =
// ein- und aussteigen; oben links die Schwester antippen = umschalten. Am Rechner Pfeiltasten, Leertaste, Tab.
// Viertel (BAIRROS): Campo dos Mártires da Pátria (Zuhause, dort beginnt der Tag), Baixa, Alfama, dazu die Ausflüge Cascais (Strand)
// und Sintra (Wald und Paläste). Jeder Ort ist eine eigene Karte; gewechselt wird im Elétrico 28 (Baixa ↔ Alfama), in der
// Standseilbahn Lavra (Baixa ↔ Campo) und im Zug (Estação do Rossio ↔ Sintra, Cais do Sodré ↔ Cascais): einsteigen und unten
// das Bild des Ziels antippen. Beim Wechsel beginnt die Szene neu (scene.restart), Tageszeit, Sterne, Kacheln und erledigte
// Aufträge reisen mit; ein laufender Auftrag verfällt. Neues Viertel: Eintrag in BAIRROS und Ziel in `para` einer Linie.
// Je Viertel: chao() setzt das Kachelraster (80 Spalten, 48 px) aus Rechtecken zusammen, pinta() malt Linien und Schienen,
// dinge = Gebäude und Dinge, orte = Orte für Aufträge, auftraege, parque = Fahrzeuge, lacos = Verkehr, bichos = Tiere.
// Hohe Bilder verdecken, was nördlich von ihnen liegt: Häuser haben deshalb eine sechs Kacheln tiefe Standfläche, und was
// vor der Figur steht, wird durchscheinend. Am oberen Kartenrand so viele Zeilen frei lassen, wie das Bild hoch ist.
// Grafiken: lx-* (node tools/generate-images.mjs alle spiele, Streifen mit tools/frames.py zerlegt), Figuren lx-fig-*
// (freigestellte Referenzbilder), Tiere lx-bicho-* (freigestellte Vokabelbilder). Sätze: saetze-extra.json (lisboa).
// Eigenes Spiel mit eigener Stadt und eigenen Figuren. Test: window.OLA_LISBOA_AUTO spielt von selbst, OLA_LISBOA_BAIRRO =
// Viertel am Anfang, OLA_LISBOA_VIAGEM = dorthin fährt der Autopilot; die Szene steht in window.OLA_LISBOA_SZENE.
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

  // Kachelarten: Gras, Straße, Gehweg, Wasser, Sand, fest (Gebäude), Blumenbeet, Steg, Brücke, Fußballplatz,
  // Wellenpflaster (calçada), Treppe (nicht für Autos und Tuk-Tuks), Erdweg, Mauer, Aussicht (Dächer in der Ferne), Gleisbett
  const GR = 0, RD = 1, PV = 2, WA = 3, SA = 4, SO = 5, FL = 6, DK = 7, BR = 8, PT = 9, CL = 10, ES = 11, TE = 12, MU = 13, VI = 14, TR = 15;
  const T = 48, COLS = 80, TAG = window.OLA_LISBOA_TAG || 420; // Länge eines Spieltags in Sekunden
  let ROWS = 48, WW = COLS * T, WH = ROWS * T; // je Viertel (init)
  // Häuser: [Bild, Kachel x, y, Breite, Tiefe der Standfläche, Breite im Bild]; die Unterkante des Bildes liegt bei y + Tiefe
  const C = (n, x, y, h = 6) => ['lx-casa-' + n, x, y, 3, h, 150], PR = (n, x, y, h = 6) => ['lx-predio-' + n, x, y, 4, h, 180], AL = (n, x, y, h = 6) => ['lx-alfama-' + n, x, y, 3, h, 150];
  const varios = (k, dw, pts, w = 1) => pts.map(([x, y]) => [k, x, y, w, w, dw]);
  const ALT = { leo: 70, ines: 70, pedro: 70, benni: 62, nico: 54, galinha: 34, galo: 38, pato: 31, ganso: 40, gato: 36, pavao: 54, caranguejo: 24 };

  // Die Viertel. orte: Name → [x, y, Bild für die Auftragskarte]; dinge: [Bild, x, y, Breite, Tiefe, Breite im Bild] (Tiefe 0 = man
  // kann durchlaufen); auftraege: p = Auftraggeber an Ort o, var = Auswahl (eine wird ausgelost), Schritte siehe comeca().
  const BAIRROS = {
    /* ---------- Campo dos Mártires da Pátria: Zuhause ---------- */
    campo: {
      nome: 'Campo dos Mártires da Pátria', pic: 'lx-casa-nossa', chegamos: 'Chegámos ao Campo dos Mártires da Pátria!', rows: 48,
      inicio: [32.6, 7.5], chega: { lavra: [11.6, 41.6] }, pipo: [42.8, 25.6], agua: [[45, 14, 8, 6]],
      chao({ set, passeio }) {
        set(RD, 0, 9, 80, 3); set(RD, 0, 36, 80, 3); set(RD, 20, 9, 3, 30); set(RD, 59, 9, 3, 30); set(RD, 72, 0, 6, 48); // Ring um den Garten, Almirante Reis
        passeio(); set(PV, 0, 7, 72, 2); set(PV, 78, 0, 2, 48);
        set(TE, 39, 12, 3, 24); set(TE, 23, 22, 36, 2); set(PV, 26, 14, 9, 5); set(PV, 37, 30, 7, 5); set(SA, 25, 26, 10, 7); // Wege, Terrasse am Kiosk, Statue, Spielplatz
        set(WA, 45, 14, 8, 6); [[45, 14], [52, 14], [45, 19], [52, 19]].forEach(([x, y]) => set(GR, x, y)); // Teich
        set(PT, 62, 1, 9, 6); // Fußballplatz
        set(PV, 4, 17, 13, 14); set(MU, 3, 16, 1, 16); set(MU, 3, 31, 14, 1); set(VI, 0, 15, 3, 18); set(PV, 17, 22, 3, 3); // Jardim do Torel mit Aussicht
        set(PV, 3, 39, 14, 9); set(TR, 8, 41, 2, 7); // obere Station der Standseilbahn
      },
      pinta(h) { h.faixaH(10); h.faixaH(37); h.faixaV(21, 9, 39); h.faixaV(60, 9, 39); h.linhaV(75); h.campo(62, 1, 9, 6); h.trilhos([[9, 41.4], [9, 49]], true); },
      orte: {
        casa: [32.5, 7.6, 'lx-casa-nossa'], avo: [5.5, 7.8, 'lx-casa-avo'], escola: [67, 21.7, 'lx-escola'], creche: [65.5, 28.6, 'lx-creche'], mercado: [66, 35.5, 'lx-mercado'],
        quiosque: [29, 15.7, 'lx-quiosque'], lago: [48.5, 20.8, 'wp-o lago'], estatua: [40.5, 33.8, 'lx-estatua-medico'], miradouro: [9.5, 22.4, 'lx-miradouro'], galinheiro: [51.5, 29.8, 'lx-galinheiro'],
        atrasQuiosque: [29, 13.5, 'lx-quiosque'], ladoLago: [53.8, 17, 'wp-o lago'], debaixoEscorrega: [29.5, 28.9, 'lx-escorrega'], atrasEstatua: [40.5, 31.4, 'lx-estatua-medico'], ladoEscola: [62.3, 20.6, 'lx-escola'],
        bBanco: [45.5, 24.8, 'lx-banco'], bArvore: [36.5, 19.6, 'lx-jacaranda'], bQuiosque: [30.7, 14.8, 'lx-quiosque'], bBaloico: [33.6, 29.8, 'lx-baloico'],
      },
      dinge: [
        ['lx-casa-avo', 3, 4, 5, 3, 270], C(2, 10, 1), C(5, 13, 1), C(4, 16, 1), C(1, 24, 1), C(2, 27, 1), ['lx-casa-nossa', 31, 1, 3, 6, 150], C(3, 34, 1), PR(1, 37, 1), C(4, 41, 1), C(5, 44, 1), PR(2, 47, 1), C(1, 51, 1), C(3, 54, 1),
        ['lx-escola', 63, 17, 8, 4, 380], ['lx-creche', 63, 25, 5, 3, 230], ['lx-mercado', 63, 31, 6, 4, 290],
        ['lx-quiosque', 28, 14, 2, 1, 104], ['lx-galinheiro', 50, 27, 3, 2, 130], ['lx-estatua-medico', 39.5, 32, 2, 1, 120], ['lx-escorrega', 27, 28, 2, 1, 100], ['lx-baloico', 31, 29, 2, 1, 120],
        ['lx-miradouro', 5, 19, 4, 2, 220], ['lx-paragem', 12, 40, 0, 0, 86],
        PR(3, 18, 40), C(2, 22, 40), C(3, 25, 40), C(5, 28, 40), C(1, 31, 40), PR(1, 34, 40), C(4, 38, 40), C(2, 41, 40), PR(2, 44, 40), C(5, 48, 40), C(3, 51, 40), C(1, 54, 40), C(4, 57, 40),
        ['lx-mercearia', 62, 41, 5, 5, 245], ['lx-metro', 69, 44, 2, 1, 100],
        ...varios('lx-jacaranda', 150, [[24, 12], [57, 12], [35, 20], [56, 21], [24, 24], [36, 25], [57, 26], [44, 34], [35, 34], [47, 12], [30, 21], [23, 6], [58, 6]]),
        ...varios('lx-pinheiro', 150, [[6, 26], [14, 27], [1, 12], [8, 11], [15, 13], [1, 34], [16, 33], [0, 44], [18, 5]]),
        ...varios('lx-palmeira', 120, [[74.5, 5], [74.5, 14], [74.5, 23], [74.5, 32], [74.5, 43], [79, 8], [79, 28], [79, 40]]),
        ...varios('lx-arbusto', 60, [[26, 20], [34, 12], [54, 24], [43, 13], [26, 33], [55, 30], [10, 34], [5, 15]]),
        ...varios('lx-banco', 62, [[44, 24], [34, 24], [37, 29], [43, 29], [12, 20], [15, 25], [26, 19], [5, 41]]),
      ],
      beete: [[24, 34, 3, 1], [53, 34, 3, 1], [24, 15, 1, 3], [56, 16, 2, 2], [1, 5, 2, 2], [8, 5, 2, 2]],
      azulejos: [[2, 8], [15, 8.4], [45, 8], [70.5, 8], [78.6, 12], [25, 13], [57.5, 14.5], [40.5, 14], [43, 22.8], [30, 23], [57, 23], [26.5, 33], [56, 33], [40.5, 28], [10, 25], [6, 29], [14, 18.5], [11, 37], [5, 45], [15, 46], [30, 39.4], [55, 39.4], [71, 30], [62.5, 23], [78.6, 40], [66, 4], [18.5, 30], [49, 22.5]],
      pombos: [[38.6, 34.5], [31, 17.5]],
      bichos: [['galinha', 47, 26, [43, 24, 14, 10]], ['galinha', 53, 31, [43, 24, 14, 10]], ['galo', 49, 31.5, [43, 24, 14, 10]], ['pato', 48, 20.6, [43, 20, 12, 3]], ['pato', 53.6, 20.4, [43, 20, 12, 3]], ['ganso', 44, 21, [42, 20, 12, 4]]],
      extras: [['professora', 66, 21.8], ['educadora', 64.4, 28.8], ['elli', 26.6, 27.6], ['nico', 27.8, 28.4], ['michi', 28.6, 16.8], ['pedro', 68, 3.6], ['rute', 13, 41.4]],
      gente: [['rita', 30, 23]], passeio: ['quiosque', 'lago', 'estatua', 'casa', 'mercado', 'escola', 'miradouro'],
      lacos: [
        { k: 'lx-carro', v: 130, s: 136, p: [[21.5, 10.5], [60.5, 10.5], [60.5, 37.5], [21.5, 37.5]], em: [0] },
        { k: 'lx-carrinha', v: 120, s: 150, p: [[73.5, -3], [76.5, -3], [76.5, 51], [73.5, 51]], em: [1] }, { k: 'lx-carro', v: 135, s: 136, p: [[73.5, -3], [76.5, -3], [76.5, 51], [73.5, 51]], em: [3] },
      ],
      fixas: [{ id: 'lavra', k: 'lx-lavra', e: '🚠', x: 9, y: 43, dir: 'd', fim: [9, 52], para: 'baixa' }],
      parque: [['skate', 35.6, 7.9], ['skate', 36.8, 7.9], ['skate', 64, 8.2], ['skate', 42.6, 34.4], ['skate', 12, 24], ['bici', 38.4, 34.6], ['bici', 15, 23.4], ['mota', 29.6, 8.2], ['mota', 62.4, 30], ['mota', 17.6, 23.6], ['tuk', 26, 8.2], ['tuk', 57.6, 35.2], ['tuk', 15, 41], ['tuk', 70.6, 24], ['carro', 18.4, 8.2], ['carro', 50, 39.4], ['carrinha', 8.5, 8.3]],
      auftraege: [
        { id: 'escola', p: 'mama', o: [34.3, 7.1], art: 'levar', para: 'escola', r: 'professora', fim: 'Obrigada! Que simpática!',
          var: [['a mochila', 'Leva a mochila à escola, por favor!'], ['o estojo', 'Leva o estojo à escola, por favor!'], ['o caderno', 'Leva o caderno à escola, por favor!'], ['o livro', 'Leva o livro à escola, por favor!']], outras: ['o lápis', 'a régua', 'a tesoura', 'a cola', 'a borracha'] },
        { id: 'avo', p: 'avo-oma', o: [6.9, 7.1], art: 'compras', loja: 'mercado', ir: 'Vai ao mercado, por favor!', fim: 'Obrigada, querida!',
          var: [['o limão', 'Preciso de limões!'], ['a laranja', 'Preciso de laranjas!'], ['o tomate', 'Preciso de tomates!'], ['a cenoura', 'Preciso de cenouras!']], outras: ['a banana', 'a maçã', 'a pera', 'as uvas', 'o melão'] },
        { id: 'bichos', p: 'avo-opa', o: [48.6, 30.2], art: 'juntar', figs: ['galinha', 'galo', 'pato'], nomes: ['a galinha', 'o galo', 'o pato'], ir: 'Os animais fugiram! Ajuda-me!', fim: 'Muito bem! Obrigado!',
          onde: [[13, 13.6], [27, 7.7], [56, 7.7], [62.4, 23], [46, 39.4], [18.4, 30], [30, 39.4], [57, 34.3]] },
        { id: 'pipo', p: 'ines', o: [41.6, 25], art: 'buscar', fig: 'pipo', som: 'bark', ir: 'O Pipo fugiu! Ajuda-me!', achei: 'Encontrei-te, Pipo!', fim: 'Pipo! Obrigada!',
          var: [['atrasQuiosque', 'O Pipo está atrás do quiosque!'], ['ladoLago', 'O Pipo está ao lado do lago!'], ['debaixoEscorrega', 'O Pipo está debaixo do escorrega!'], ['atrasEstatua', 'O Pipo está atrás da estátua!'], ['ladoEscola', 'O Pipo está ao lado da escola!']] },
        { id: 'bola', p: 'benni', o: [30, 31.3], art: 'buscar', coisa: 'wp-a bola', ir: 'Onde está a minha bola? Ajuda-me!', achei: 'Encontrei a bola!', fim: 'A minha bola! Obrigado!',
          var: [['bBanco', 'A bola está debaixo do banco!'], ['bArvore', 'A bola está atrás da árvore!'], ['bQuiosque', 'A bola está ao lado do quiosque!'], ['bBaloico', 'A bola está ao lado do baloiço!']] },
        { id: 'foto', p: 'papa', o: [32, 16.5], art: 'foto', fim: 'Que linda fotografia!',
          var: [['miradouro', 'Tira uma fotografia do miradouro!'], ['estatua', 'Tira uma fotografia da estátua!'], ['lago', 'Tira uma fotografia do lago!'], ['quiosque', 'Tira uma fotografia do quiosque!']] },
        { id: 'corrida', p: 'leo', o: [66, 6.9], art: 'corrida', meta: 'miradouro', ir: 'Quem chega primeiro ao miradouro?', vai: 'Um, dois, três, vamos!', ganhou: 'Ganhaste! Parabéns!', perdeu: 'Ganhei! Outra vez?' },
      ],
    },

    /* ---------- Baixa: Rossio, Rua Augusta, Praça do Comércio, Tejo ---------- */
    baixa: {
      nome: 'Baixa', pic: 'lx-arco', chegamos: 'Chegámos à Baixa!', rows: 52,
      inicio: [40, 13], chega: { eletrico: [43.5, 29.7], lavra: [8.6, 11.2], sintra: [24.8, 10.8], cascais: [11.6, 41.6] }, agua: [[0, 44, 80, 6]], ferry: 48.3,
      chao({ set }) {
        set(PV, 0, 0, 80, 44); set(GR, 0, 0, 9, 8); set(GR, 0, 37, 26, 6); set(GR, 54, 37, 26, 6); // Pflaster, Hang zum Campo, Gärten am Fluss
        set(WA, 0, 44, 80, 8); set(SA, 26, 50, 28, 2); // Tejo und das andere Ufer
        set(RD, 0, 15, 80, 3); set(RD, 0, 25, 80, 4); set(RD, 18, 15, 3, 14); set(RD, 59, 15, 3, 14); // Rossio-Straße, Rua da Conceição (Elétrico), Rua do Ouro, Rua da Prata
        set(CL, 27, 7, 26, 8); set(CL, 38, 18, 4, 7); set(CL, 38, 29, 4, 7); // Rossio, Rua Augusta bis durch den Bogen
        set(PV, 0, 43, 80, 1); set(DK, 38, 44, 4, 1); set(DK, 12, 44, 2, 3); set(DK, 66, 44, 2, 3); set(DK, 39, 49, 2, 1); // Kai, Cais das Colunas, Stege
        set(TR, 5, 0, 2, 10); set(TR, 22, 0, 2, 10); // Standseilbahn den Hang hinauf, Gleis der Estação do Rossio (Zug nach Sintra)
        set(PV, 0, 37, 12, 6); set(TR, 0, 41, 10, 2); // Cais do Sodré (Bahn nach Cascais)
      },
      pinta(h) { h.faixaH(16); h.faixaV(19, 15, 29); h.faixaV(60, 15, 29); h.trilhos([[-1, 26.5], [81, 26.5]]); h.trilhos([[-1, 27.5], [81, 27.5]]); h.trilhos([[6, -1], [6, 10]], true); h.trilhos([[23, -1], [23, 10]], true); h.trilhos([[-1, 42], [10, 42]], true); },
      fest: [[37, 32, 1, 4], [42, 32, 1, 4]], // die Pfeiler des Bogens
      orte: {
        pastelaria: [31.5, 24.6, 'lx-pastelaria'], geladaria: [47.5, 24.6, 'lx-geladaria'], elevador: [23, 24.6, 'lx-santa-justa'], arco: [40, 37.3, 'lx-arco'], estatua: [40, 41, 'lx-estatua'],
        fonte: [32.5, 12.7, 'lx-fonte'], rio: [40, 43.4, 'lx-coluna-cais'], margem: [40, 50.6, 'lx-fig-pandi'], teatro: [40, 7.8, 'lx-teatro'],
      },
      dinge: [
        ['lx-teatro', 37, 3, 6, 4, 300], C(3, 9, 1), ['lx-estacao-rossio', 12.5, 3, 8, 4, 370], PR(1, 27, 1), C(1, 31, 1), C(5, 44, 1), PR(3, 47, 1), PR(3, 54, 1), C(2, 58, 1), C(1, 61, 1), PR(1, 64, 1), C(3, 68, 1), C(5, 71, 1), C(4, 74, 1),
        ['lx-fonte', 31, 10, 3, 2, 150], ['lx-fonte', 46, 10, 3, 2, 150], ['lx-coluna', 39.5, 10, 1, 1, 90], ['lx-quiosque', 28, 13, 2, 1, 104],
        C(2, 1, 18), C(5, 4, 18), PR(1, 7, 18), C(1, 11, 18), C(3, 14, 18), ['lx-santa-justa', 22, 22, 2, 2, 110], PR(2, 25, 18), ['lx-pastelaria', 29, 18, 5, 6, 245], C(4, 34, 18),
        C(5, 42, 18), ['lx-geladaria', 45, 18, 5, 6, 245], PR(3, 50, 18), C(1, 54, 18), C(3, 63, 18), PR(1, 66, 18), C(2, 70, 18), C(4, 73, 18), C(5, 76, 18),
        ['lx-estacao', 1, 37, 6, 3, 280], C(3, 8, 31), C(5, 11, 31), C(1, 14, 31), C(4, 64, 31), PR(3, 67, 31), C(2, 71, 31), C(1, 74, 31),
        ['lx-arcadas', 27, 32, 10, 4, 480], ['lx-arcadas', 43, 32, 10, 4, 480], ['lx-arco', 39.5, 35, 0, 0, 250], ['lx-estatua', 39, 39, 2, 1, 130],
        ['lx-coluna-cais', 36.6, 43, 0, 0, 34], ['lx-coluna-cais', 42.4, 43, 0, 0, 34], ['lx-cristo', 47, 50, 1, 1, 80],
        ['lx-paragem', 43, 29, 0, 0, 86], ['lx-paragem', 9, 29, 0, 0, 86], ['lx-paragem', 36, 24, 0, 0, 86], ['lx-paragem', 70, 24, 0, 0, 86], ['lx-paragem', 9, 10, 0, 0, 86],
        ...varios('lx-jacaranda', 150, [[16, 30], [23, 30], [30, 30], [47, 30], [54, 30], [61, 30], [28, 8], [51, 8], [51, 13], [21, 12], [56, 12]]),
        ...varios('lx-palmeira', 120, [[15, 41], [21, 41], [57, 41], [63, 41], [70, 41], [76, 41], [30, 50], [36, 50], [52, 50]]),
        ...varios('lx-pinheiro', 150, [[1, 2], [2, 6], [8, 4]]), ...varios('lx-arbusto', 60, [[18, 38], [56, 38], [68, 38], [78, 38], [3, 12]]),
        ...varios('lx-banco', 62, [[34, 13], [45, 13], [19, 40], [60, 40], [30, 42], [49, 42], [12, 12]]),
      ],
      beete: [[20, 38, 3, 2], [61, 38, 3, 2], [72, 38, 3, 2], [29, 12, 2, 1], [49, 12, 2, 1]],
      azulejos: [[3, 13], [14, 10], [24, 13], [40, 13.6], [53.5, 12.5], [66, 10], [77, 13], [1.5, 24.5], [40, 21], [78, 24.5], [10, 30.6], [70, 30.6], [29, 38], [51, 38], [40, 42.5], [5, 43.5], [75, 43.5], [20, 33.5], [58, 33.5], [33, 50.6], [49, 50.6], [7.5, 9], [23.5, 20], [57, 20]],
      pombos: [[36.5, 12.8], [43.6, 12.4], [32, 41.6], [47, 38]],
      extras: [['nico', 17.8, 40], ['benni', 50.8, 13.6], ['michi', 47.6, 41.6], ['ines', 41.3, 30.4]],
      gente: [['professora', 30, 14], ['educadora', 50, 30.5], ['rita', 20, 43.4]], passeio: ['fonte', 'pastelaria', 'geladaria', 'arco', 'estatua', 'rio', 'teatro', 'elevador'],
      lacos: [
        { tram: true, k: 'lx-eletrico', v: 150, s: 270, p: [[43.5, 27.5], [-3, 27.5], [-3, 26.5], [83, 26.5], [83, 27.5]], paragens: [[43.5, 27.5], [9.5, 27.5], [36.5, 26.5], [70.5, 26.5]], para: ['alfama'], em: [0, 3] },
        { k: 'lx-carro', v: 135, s: 136, p: [[19.5, 16.5], [60.5, 16.5], [60.5, 25.5], [19.5, 25.5]], em: [0] }, { k: 'lx-carrinha', v: 120, s: 150, p: [[19.5, 16.5], [60.5, 16.5], [60.5, 25.5], [19.5, 25.5]], em: [2] },
      ],
      fixas: [{ id: 'lavra', k: 'lx-lavra', e: '🚠', x: 6, y: 9.6, dir: 'u', fim: [6, -3], para: 'campo' },
        { id: 'sintra', k: 'lx-comboio', s: 300, raio: 200, e: '🚆', x: 23, y: 9.2, dir: 'u', fim: [23, -4], para: 'sintra' }, { id: 'cascais', k: 'lx-comboio', s: 300, raio: 200, e: '🚆', x: 5.5, y: 42.3, dir: 'l', fim: [-8, 42.3], para: 'cascais' }],
      parque: [['skate', 36.6, 13.6], ['skate', 37.8, 13.6], ['skate', 41.2, 31], ['skate', 20, 40.5], ['skate', 60.6, 40.5], ['mota', 42.6, 13.6], ['mota', 36, 30.6], ['mota', 55, 41.4], ['tuk', 24, 13.6], ['tuk', 52, 30.6], ['tuk', 30, 41], ['tuk', 56, 13.6], ['tuk', 12.5, 30.6],
        ['carro', 22.6, 29.8], ['carro', 57.5, 29.8], ['carrinha', 62.6, 30.4], ['barco', 14.8, 45.5], ['barco', 64.8, 45.5], ['barco', 43.4, 45.4], ['barco', 35.8, 45.6]],
      auftraege: [
        { id: 'pao', p: 'mama', o: [35, 9.3], art: 'compras', loja: 'pastelaria', ir: 'Vai à pastelaria, por favor!', fim: 'Obrigada! Que bom!',
          var: [['o pão', 'Preciso de pão!'], ['o pastel de nata', 'Quero um pastel de nata!'], ['o croissant', 'Quero um croissant!']], outras: ['o bolo', 'o queijo', 'a torrada', 'o gelado'] },
        { id: 'gelado', p: 'elli', o: [16.5, 39.6], art: 'compras', loja: 'geladaria', ir: 'O Nico quer um gelado! Vai à geladaria, por favor!', fim: 'Obrigada! Que simpática!',
          var: [['o gelado', null]], outras: ['o bolo', 'o pão', 'a água', 'o sumo'] },
        { id: 'foto', p: 'papa', o: [33, 38.6], art: 'foto', fim: 'Que linda fotografia!',
          var: [['arco', 'Tira uma fotografia do arco!'], ['elevador', 'Tira uma fotografia do elevador!'], ['estatua', 'Tira uma fotografia da estátua!'], ['fonte', 'Tira uma fotografia da fonte!']] },
        { id: 'corrida', p: 'leo', o: [49.5, 13.3], art: 'corrida', meta: 'rio', ir: 'Quem chega primeiro ao rio?', vai: 'Um, dois, três, vamos!', ganhou: 'Ganhaste! Parabéns!', perdeu: 'Ganhei! Outra vez?' },
        { id: 'taxi', p: 'rute', o: [44.6, 8.4], art: 'taxi', fim: 'Obrigada! Até logo!',
          var: [['arco', 'Leva-me ao arco, por favor!'], ['elevador', 'Leva-me ao elevador, por favor!'], ['rio', 'Leva-me ao rio, por favor!'], ['geladaria', 'Leva-me à geladaria, por favor!']] },
        { id: 'pandi', p: 'avo-opa', o: [45, 42.3], art: 'buscar', fig: 'pandi', som: 'pandi-found', ir: 'O Pandi está na outra margem! Vai de barco!', achei: 'Olha, o Pandi!', fim: 'Muito bem! Obrigado!', var: [['margem', null]] },
        { id: 'placas', p: 'pedro', o: [39.5, 30.2], art: 'placas', ir: 'O Pondi trocou as placas! Ajuda-me!', fim: 'Foi o Pondi!',
          var: [['pastelaria', 'Onde é a pastelaria?'], ['geladaria', 'Onde é a geladaria?'], ['arco', 'Onde é o arco?'], ['elevador', 'Onde é o elevador?'], ['estatua', 'Onde é a estátua?'], ['fonte', 'Onde é a fonte?']] },
      ],
    },

    /* ---------- Alfama: Sé, Miradouro de Santa Luzia, Burg, Feira da Ladra, Gassen und Treppen ---------- */
    alfama: {
      nome: 'Alfama', pic: 'lx-se', chegamos: 'Chegámos a Alfama!', rows: 48,
      inicio: [19.5, 29.3], chega: { eletrico: [19.5, 29.4] }, agua: [[0, 43, 80, 5]], ferry: 46.6,
      chao({ set }) {
        set(PV, 0, 0, 80, 43); set(GR, 0, 0, 30, 13); set(WA, 0, 43, 80, 5);
        set(RD, 0, 40, 80, 3); set(RD, 0, 30, 47, 3); set(RD, 44, 0, 3, 33); set(RD, 26, 13, 3, 17); set(RD, 8, 13, 72, 3); // Uferstraße, Linie 28, hoch zur Burg, hinüber zur Feira
        set(TE, 5, 1, 20, 11); set(MU, 4, 0, 1, 13); set(MU, 25, 0, 1, 13); set(MU, 4, 12, 22, 1); set(TE, 13, 12, 3, 1); // Burghof, Mauern, Tor
        set(CL, 8, 27, 15, 3); set(CL, 48, 16, 12, 5); set(MU, 48, 21, 12, 1); // Largo da Sé, Miradouro mit Brüstung
        set(ES, 54, 21, 2, 19); set(ES, 63, 22, 2, 18); set(ES, 72, 22, 2, 18); set(ES, 14, 33, 2, 7); set(ES, 25, 33, 2, 7); // Treppen
        set(TE, 56, 9, 23, 4); set(DK, 20, 43, 2, 3); set(DK, 60, 43, 2, 3); // Feira da Ladra, Stege
      },
      pinta(h) { h.faixaH(14, 8); h.faixaH(41); h.faixaV(27, 13, 30); h.trilhos([[-1, 31.5], [45.5, 31.5], [45.5, -1]]); h.trilhos([[44.5, -1], [44.5, 30.5], [-1, 30.5]]); },
      orte: {
        igreja: [15, 28.3, 'lx-se'], castelo: [14.5, 9.7, 'lx-castelo'], miradouro: [54.5, 20.3, 'lx-santa-luzia'], feira: [64.6, 12.4, 'lx-banca-feira'], panteao: [71.5, 9.8, 'lx-panteao'],
        fado: [58.5, 38.8, 'lx-fado'], fonte: [68.5, 37.8, 'lx-fonte'], largo: [36, 27.5, 'lx-sardinhas'],
        gMuro: [51.6, 20.6, 'lx-santa-luzia'], gBanco: [57.3, 19.6, 'lx-banco'], gFonte: [68.5, 34.5, 'lx-fonte'], gIgreja: [19.7, 26.5, 'lx-se'],
        vMiradouro: [58.4, 17.4, 'lx-santa-luzia'], vFeira: [60.5, 12.3, 'lx-banca-feira'], vIgreja: [9.6, 26.4, 'lx-se'], vCastelo: [19.5, 10.4, 'lx-castelo'],
        pMuro: [8, 11.2, 'lx-castelo'], pArvore: [22.5, 8.5, 'lx-pinheiro'], pCastelo: [20.4, 7.4, 'lx-castelo'],
      },
      dinge: [
        ['lx-castelo', 10, 4, 9, 4, 440], ['lx-panteao', 68, 5, 7, 4, 300], ['lx-se', 11, 23, 8, 4, 370], ['lx-santa-luzia', 49, 17, 4, 2, 220], ['lx-fado', 56, 33, 5, 5, 220], ['lx-fonte', 67, 35, 3, 2, 150],
        ...varios('lx-banca-feira', 110, [[58, 10], [62, 11], [66, 10], [72, 11], [76, 10]], 2).map(d => (d[4] = 1, d)), ['lx-sardinhas', 34, 26, 1, 1, 80],
        AL(2, 1, 21), C(1, 4, 21), C(3, 20, 21), AL(1, 23, 21), AL(3, 31, 1), C(4, 34, 1), AL(1, 37, 1), C(2, 40, 1), C(5, 48, 1), AL(2, 51, 1), AL(3, 54, 1), C(1, 57, 1), AL(1, 60, 1), C(3, 63, 1),
        AL(1, 30, 17), C(5, 33, 17), AL(2, 36, 17), C(3, 39, 17),
        AL(3, 1, 33), C(5, 4, 33), AL(1, 7, 33), C(2, 10, 33), AL(2, 17, 33), C(4, 20, 33), C(1, 28, 33), AL(3, 31, 33), AL(2, 34, 33), C(3, 37, 33), AL(1, 40, 33),
        AL(1, 47, 24), AL(2, 50, 24), AL(3, 56, 24), C(2, 59, 24), AL(2, 65, 24), AL(1, 68, 24), AL(3, 74, 24), C(5, 77, 24), C(3, 47, 32), AL(3, 50, 32), AL(2, 74, 32), AL(1, 77, 32),
        ['lx-estendal', 54.5, 25, 0, 0, 100], ['lx-estendal', 63.5, 28, 0, 0, 100], ['lx-estendal', 72.5, 26, 0, 0, 100], ['lx-estendal', 54.5, 35, 0, 0, 100], ['lx-estendal', 72.5, 36, 0, 0, 100], ['lx-estendal', 14.5, 36, 0, 0, 100],
        ['lx-paragem', 19, 29, 0, 0, 86], ['lx-paragem', 47, 18, 0, 0, 86], ['lx-paragem', 42.3, 9, 0, 0, 86], ['lx-paragem', 30, 29, 0, 0, 86],
        ...varios('lx-pinheiro', 150, [[6, 9], [22, 9], [1, 3], [2, 9], [27, 3], [28, 8], [1, 11]]), ...varios('lx-jacaranda', 150, [[31, 25], [41, 25], [8, 24], [21, 28], [78, 12], [42, 12], [31, 11], [52, 9]]),
        ...varios('lx-banco', 62, [[56, 19], [33, 28], [39, 28], [66, 37], [17, 28]]), ...varios('lx-arbusto', 60, [[48, 20], [59, 20], [70, 37], [43, 28], [30, 28]]),
      ],
      beete: [[36, 24, 3, 1], [9, 16, 3, 1], [20, 16, 3, 1]],
      azulejos: [[2, 6], [27.5, 6], [14.5, 11], [8, 9.6], [23, 10.5], [36, 10], [50, 10], [60, 9.6], [70, 12.4], [78.5, 16.5], [35.5, 28.5], [42, 24.6], [10, 28.4], [22, 27.6], [52, 18], [58.5, 19.5], [57.5, 23], [70, 23], [78, 22.6], [60, 31], [76, 30.6], [66, 34], [52, 38.6], [78, 38.6], [14.6, 36], [25.6, 36], [5, 39.4], [36, 39.4], [21, 44.5], [61, 44.5]],
      pombos: [[14, 28.7], [66, 12.6]],
      bichos: [['gato', 71.4, 36.7, [65, 32, 7, 6]], ['pavao', 9, 9.6, [6, 8, 18, 4]], ['pavao', 18.5, 10.6, [6, 8, 18, 4]]],
      extras: [['nico', 18, 10.9], ['leo', 52.4, 19.8], ['benni', 35, 28.6], ['michi', 9, 28.6], ['ines', 21.5, 28.8]],
      gente: [['rita', 36, 28.5], ['professora', 64, 12.5], ['educadora', 50, 30.5]], passeio: ['igreja', 'largo', 'miradouro', 'feira', 'fado', 'fonte'],
      lacos: [
        { tram: true, k: 'lx-eletrico', v: 150, s: 270, p: [[19.5, 31.5], [45.5, 31.5], [45.5, -3], [44.5, -3], [44.5, 30.5], [-3, 30.5], [-3, 31.5]], paragens: [[19.5, 31.5], [45.5, 18.5], [44.5, 9.5], [30.5, 30.5]], para: ['baixa'], em: [0, 3] },
        { k: 'lx-carro', v: 135, s: 136, p: [[-3, 40.5], [83, 40.5], [83, 41.5], [-3, 41.5]], em: [0] }, { k: 'lx-carrinha', v: 120, s: 150, p: [[-3, 40.5], [83, 40.5], [83, 41.5], [-3, 41.5]], em: [2] },
      ],
      parque: [['skate', 16.5, 28.6], ['skate', 52, 19.8], ['skate', 58.5, 31], ['skate', 68, 38.6], ['mota', 23.6, 28.4], ['mota', 47.6, 22.6], ['mota', 61, 12.4], ['tuk', 29.8, 16.6], ['tuk', 40, 28.8], ['tuk', 42.6, 24.6], ['tuk', 10, 39.4], ['tuk', 57.4, 12.4],
        ['carro', 33, 39.4], ['carrinha', 70, 39.3], ['barco', 22.7, 44.6], ['barco', 62.7, 44.6], ['barco', 40, 44.2]],
      auftraege: [
        { id: 'roupa', p: 'mama', o: [59.5, 30.4], art: 'juntar', n: 4, itens: ['a camisola', 'as meias', 'o vestido', 'as calças', 'a t-shirt', 'o cachecol', 'o pijama', 'os calções'], ir: 'O vento levou a roupa! Ajuda-me!', fim: 'Obrigada! Que bom!',
          onde: [[57.5, 22.8], [66.5, 23], [76, 22.6], [49.5, 30.6], [69.5, 30.6], [77, 30.8], [53, 38.6], [75.5, 38.6], [54.8, 27], [63.8, 35]] },
        { id: 'guitarra', p: 'rute', o: [62, 38.4], art: 'buscar', coisa: 'wp-a guitarra', som: 'instr-guitarra', ir: 'Onde está a minha guitarra? Ajuda-me!', achei: 'Encontrei a guitarra!', fim: 'A minha guitarra! Obrigada!',
          var: [['vMiradouro', 'A guitarra está no miradouro!'], ['vFeira', 'A guitarra está na feira!'], ['vIgreja', 'A guitarra está ao lado da igreja!'], ['vCastelo', 'A guitarra está no castelo!']] },
        { id: 'taxi', p: 'avo-opa', o: [38, 27.4], art: 'taxi', fim: 'Muito bem! Obrigado!',
          var: [['castelo', 'Leva-me ao castelo, por favor!'], ['igreja', 'Leva-me à igreja, por favor!'], ['miradouro', 'Leva-me ao miradouro, por favor!'], ['feira', 'Leva-me à feira, por favor!']] },
        { id: 'gato', p: 'pedro', o: [70.4, 35.9], art: 'buscar', fig: 'gato', som: 'animal-gato', ir: 'Onde está o gato? Ajuda-me!', achei: 'Olha, o gato!', fim: 'Obrigado! Que bom!',
          var: [['gMuro', 'O gato está em cima do muro!'], ['gBanco', 'O gato está debaixo do banco!'], ['gFonte', 'O gato está atrás da fonte!'], ['gIgreja', 'O gato está ao lado da igreja!']] },
        { id: 'foto', p: 'papa', o: [55.6, 17.6], art: 'foto', fim: 'Que linda fotografia!',
          var: [['igreja', 'Tira uma fotografia da igreja!'], ['castelo', 'Tira uma fotografia do castelo!'], ['feira', 'Tira uma fotografia da feira!'], ['fonte', 'Tira uma fotografia da fonte!']] },
        { id: 'pavao', p: 'elli', o: [16.8, 10.3], art: 'buscar', fig: 'pavao', ir: 'O Nico quer ver o pavão! Ajuda-me!', achei: 'Olha, o pavão!', fim: 'Obrigada! Que simpática!',
          var: [['pMuro', 'O pavão está ao lado do muro!'], ['pArvore', 'O pavão está atrás da árvore!'], ['pCastelo', 'O pavão está ao lado do castelo!']] },
        { id: 'feira', p: 'avo-oma', o: [60.4, 11.2], art: 'compras', loja: 'feira', ir: 'Vai à feira, por favor!', fim: 'Obrigada, querida!',
          var: [['o chapéu', 'Quero um chapéu!'], ['o livro', 'Quero um livro!'], ['a boneca', 'Quero uma boneca!'], ['o cachecol', 'Quero um cachecol!']], outras: ['o boné', 'as luvas', 'o relógio', 'o puzzle', 'o candeeiro', 'as botas'] },
      ],
    },
    /* ---------- Cascais: mit der Bahn an den Strand ---------- */
    cascais: {
      nome: 'Cascais', pic: 'lx-farol-azul', chegamos: 'Chegámos a Cascais!', rows: 48,
      inicio: [66, 10.3], chega: { cascais: [66, 10.3] }, agua: [[0, 38, 80, 10]],
      chao({ set }) {
        set(PV, 0, 0, 80, 31); set(SA, 0, 31, 80, 7); set(WA, 0, 38, 80, 10); // Ort, Strand, Meer
        set(RD, 0, 12, 80, 3); set(RD, 0, 25, 80, 3); set(RD, 9, 12, 3, 16); set(RD, 56, 12, 3, 16);
        set(CL, 24, 15, 21, 10); // Platz mit Wellenpflaster
        set(GR, 0, 28, 10, 12); set(TE, 3, 31, 6, 6); // Landzunge mit dem Leuchtturm
        set(DK, 14, 38, 2, 6); set(DK, 60, 38, 2, 4); set(TR, 63, 7, 17, 2); // Stege, Gleis zum Bahnhof
      },
      pinta(h) { h.faixaH(13); h.faixaH(26); h.faixaV(10, 12, 28); h.faixaV(57, 12, 28); h.trilhos([[63.4, 8], [81, 8]], true); },
      orte: {
        quiosque: [31, 30.4, 'lx-quiosque'], bolas: [44.5, 33.6, 'lx-bolas'], farol: [5.5, 36, 'lx-farol-azul'], praia: [38, 35.2, 'lx-guarda-sol'], barco: [24.5, 36.2, 'lx-barco-1'], comboio: [68, 10.3, 'lx-comboio-1'],
        fonte: [34.5, 21.7, 'lx-fonte'], mar: [40, 43, 'wp-a bola de praia'],
        cBarco: [24.5, 33.4, 'lx-barco-1'], cFarol: [7.6, 35.5, 'lx-farol-azul'], cBanco: [51.5, 30.3, 'lx-banco'], cSol: [56.6, 34.8, 'lx-guarda-sol'],
      },
      dinge: [
        C(2, 1, 1), PR(1, 4, 1), C(4, 8, 1), C(1, 11, 1), PR(3, 14, 1), C(5, 18, 1), C(3, 21, 1), PR(2, 24, 1), C(2, 28, 1), C(1, 31, 1), C(4, 34, 1), PR(1, 37, 1), C(5, 41, 1), C(3, 44, 1), PR(3, 47, 1), C(2, 51, 1), ['lx-estacao', 57, 3, 6, 4, 290],
        ['lx-geladaria', 13, 16, 5, 6, 245], C(3, 18, 16), C(1, 21, 16), ['lx-fonte', 33, 19, 3, 2, 150], C(4, 45, 16), ['lx-pastelaria', 48, 16, 5, 6, 245], C(5, 53, 16),
        C(2, 60, 16), PR(1, 63, 16), C(3, 67, 16), C(1, 70, 16), PR(3, 73, 16), C(5, 77, 16), C(4, 1, 16), C(2, 4, 16),
        ['lx-quiosque', 30, 29, 2, 1, 104], ['lx-bolas', 44, 32, 1, 1, 90], ['lx-barco-1', 23, 34, 3, 1, 150], ['lx-castelo-areia', 32, 35, 0, 0, 70], ['lx-farol-azul', 3, 33, 3, 2, 170],
        ...[[35, 32.5], [40, 34], [55, 34], [62, 32.6], [70, 34], [28, 32.4], [48, 35]].map(([x, y]) => ['lx-guarda-sol', x, y, 0, 0, 96]), ...varios('lx-barraca', 90, [[16, 32], [19, 32], [74, 32], [77, 32]]), ...varios('lx-rocha', 70, [[9, 37], [1, 39], [8, 30]]),
        ...varios('lx-palmeira', 120, [[13, 29], [22, 29], [36, 29], [46, 29], [54, 29], [64, 29], [72, 29], [78, 29]]), ...varios('lx-banco', 62, [[50, 29], [18, 30], [60, 30], [40, 30], [28, 22], [41, 22]]),
        ...varios('lx-jacaranda', 150, [[25, 16], [43, 16], [8, 9], [30, 9], [50, 9]]), ...varios('lx-pinheiro', 150, [[1, 31]]),
      ],
      beete: [[27, 10, 3, 1], [45, 10, 3, 1], [62, 22, 2, 2]],
      azulejos: [[3, 9], [20, 9.5], [40, 9], [55, 9.5], [74, 10.6], [78.5, 11], [6, 23], [20, 23.5], [34.5, 17], [34.5, 23.6], [50, 23.5], [68, 23.5], [78, 23], [12, 29.5], [26, 29.5], [57, 29.5], [75, 29.5], [13, 34], [30, 36.5], [45, 36], [58, 33], [66, 36.5], [76, 36], [5.5, 32], [2, 37.5], [14.6, 42.6], [60.6, 40.6]],
      pombos: [[38, 22.6], [52, 30.6]],
      bichos: [['caranguejo', 12, 35.5, [10, 33, 12, 4]]],
      extras: [['nico', 37.4, 33.3], ['benni', 67.6, 32.4], ['avo-oma', 49.3, 30.4], ['rute', 40.5, 23], ['mama', 39.4, 34.8]],
      gente: [['rita', 20, 29.5], ['professora', 60, 23.5]], passeio: ['quiosque', 'fonte', 'comboio', 'praia', 'bolas'],
      lacos: [{ k: 'lx-carro', v: 135, s: 136, p: [[10.5, 13.5], [57.5, 13.5], [57.5, 26.5], [10.5, 26.5]], em: [0] }, { k: 'lx-carrinha', v: 120, s: 150, p: [[10.5, 13.5], [57.5, 13.5], [57.5, 26.5], [10.5, 26.5]], em: [2] }],
      fixas: [{ id: 'cascais', k: 'lx-comboio', s: 300, raio: 200, e: '🚆', x: 70, y: 8.3, dir: 'r', fim: [88, 8.3], para: 'baixa' }],
      parque: [['bici', 20, 29.7], ['bici', 42, 29.7], ['bici', 61.4, 29.6], ['bici', 63.5, 10.8], ['skate', 34, 23.6], ['skate', 68, 29.6], ['mota', 47, 23.4], ['mota', 6, 10], ['tuk', 23, 10.4], ['tuk', 52, 23.6], ['carro', 30, 11],
        ['barco', 16.7, 40], ['barco', 16.7, 42.4], ['barco', 62.7, 39.8], ['barco', 12.6, 41.4]],
      auftraege: [
        { id: 'toalha', p: 'elli', o: [36.6, 33], art: 'compras', loja: 'quiosque', ir: 'Vai ao quiosque, por favor!', fim: 'Obrigada! Que simpática!',
          var: [['a toalha', 'Falta a toalha!'], ['o protetor solar', 'Falta o protetor solar!'], ['as braçadeiras', 'Faltam as braçadeiras!'], ['o chapéu de sol', 'Falta o chapéu de sol!']], outras: ['a boia', 'a bola de praia', 'a geleira', 'os calções de banho'] },
        { id: 'conchas', p: 'ines', o: [28, 35], art: 'juntar', n: 4, itens: ['a concha', 'a concha', 'a concha', 'a estrela-do-mar'], ir: 'Vamos apanhar conchas! Ajuda-me!', fim: 'Que lindas! Obrigada!',
          onde: [[20, 36.4], [30, 36.6], [34, 33.2], [47, 36.4], [53, 36.2], [62, 35.2], [70, 36.6], [66, 33.4], [26, 32.6], [58, 36.8]] },
        { id: 'bola', p: 'michi', o: [42.4, 36.2], art: 'buscar', coisa: 'wp-a bola de praia', ir: 'A bola de praia está no mar! Vai de barco!', achei: 'Encontrei a bola!', fim: 'Muito bem! Obrigado!', var: [['mar', null]] },
        { id: 'berlim', p: 'avo-opa', o: [48, 29.9], art: 'compras', loja: 'bolas', ir: 'Tenho fome! Quero uma bola de Berlim!', fim: 'Muito bem! Obrigado!', var: [['a bola de Berlim', null]], outras: ['o gelado', 'o pão', 'o bolo', 'a bolacha'] },
        { id: 'foto', p: 'papa', o: [36.5, 22.7], art: 'foto', fim: 'Que linda fotografia!',
          var: [['farol', 'Tira uma fotografia do farol!'], ['barco', 'Tira uma fotografia do barco!'], ['praia', 'Tira uma fotografia da praia!'], ['comboio', 'Tira uma fotografia do comboio!']] },
        { id: 'corrida', p: 'leo', o: [66, 31.4], art: 'corrida', meta: 'farol', ir: 'Quem chega primeiro ao farol?', vai: 'Um, dois, três, vamos!', ganhou: 'Ganhaste! Parabéns!', perdeu: 'Ganhei! Outra vez?' },
        { id: 'caranguejo', p: 'pedro', o: [12.6, 33.2], art: 'buscar', fig: 'caranguejo', ir: 'Onde está o caranguejo? Ajuda-me!', achei: 'Olha, o caranguejo!', fim: 'Obrigado! Que bom!',
          var: [['cBarco', 'O caranguejo está atrás do barco!'], ['cFarol', 'O caranguejo está ao lado do farol!'], ['cBanco', 'O caranguejo está debaixo do banco!'], ['cSol', 'O caranguejo está ao lado do chapéu de sol!']] },
      ],
    },

    /* ---------- Sintra: mit dem Zug in den Wald und zu den Palästen ---------- */
    sintra: {
      nome: 'Sintra', pic: 'lx-pena', chegamos: 'Chegámos a Sintra!', rows: 48,
      inicio: [64.2, 41.2], chega: { sintra: [64.2, 41.2] }, pipo: [62.3, 34.6], nevoa: [[44, 12, 36, 18], [13, 14, 15, 8]],
      chao({ set, passeio }) {
        set(RD, 0, 36, 80, 3); set(RD, 10, 22, 3, 14); set(RD, 3, 22, 10, 3); set(RD, 3, 11, 3, 14); set(RD, 3, 11, 26, 3); // Hauptstraße und die Straße den Berg hinauf zum Palast
        passeio();
        set(PV, 14, 26, 49, 10); set(CL, 26, 27, 21, 6); // der Ort mit seinem Platz
        set(TE, 28, 10, 19, 5); set(MU, 28, 15, 19, 1); set(ES, 41, 15, 2, 11); // Terrasse vor dem Palast, Brüstung, Treppe hinunter in den Ort
        set(TE, 56, 9, 21, 4); set(MU, 55, 8, 8, 1); set(MU, 68, 8, 10, 1); set(TE, 60, 13, 2, 13); // Maurenburg und der Weg dorthin
        set(PV, 54, 39, 20, 9); set(TR, 66, 40, 2, 8); // Bahnhof
      },
      pinta(h) { h.faixaH(37); h.faixaV(11, 25, 36); h.faixaH(23, 6, 10); h.faixaV(4, 14, 22); h.faixaH(12, 6, 28); h.trilhos([[67, 40.4], [67, 49]], true); },
      orte: {
        pastelaria: [50.5, 33.6, 'lx-pastelaria'], palacio: [37, 11.6, 'lx-pena'], castelo: [65.5, 10.2, 'lx-torre-mouros'], estacao: [60, 46.6, 'lx-estacao'], fonte: [41.5, 31.7, 'lx-fonte'], comboio: [64.4, 43.6, 'lx-comboio-2'], vila: [34.5, 26.8, 'lx-palacio-vila'],
        kFonte: [41.5, 28.5, 'lx-fonte'], kPalacio: [44, 11.7, 'lx-pena'], kBanco: [29.6, 30.8, 'lx-banco'], kPedra: [52.5, 16.5, 'lx-rocha'],
        oArvore: [20.5, 15.5, 'lx-arvore'], oPedra: [70.5, 22.5, 'lx-rocha'], oTorre: [69.6, 10.4, 'lx-torre-mouros'],
        iFonte: [43.8, 30.6, 'lx-fonte'], iPalacio: [28.6, 26.6, 'lx-palacio-vila'], iBanco: [44.6, 31, 'lx-banco'], iComboio: [69.6, 44, 'lx-comboio-2'],
      },
      dinge: [
        ['lx-pena', 33, 6, 8, 4, 400], ['lx-palacio-vila', 30.5, 22, 8, 4, 360], ['lx-torre-mouros', 63, 5, 5, 3, 260], ['lx-fonte', 40, 29, 3, 2, 150], ['lx-pastelaria', 48, 27, 5, 6, 245], ['lx-estacao', 57, 42, 6, 4, 290], ['lx-quiosque', 22, 31, 2, 1, 104],
        AL(1, 15, 27), C(2, 18, 27), C(4, 54, 27), AL(2, 57, 27),
        C(1, 3, 40), AL(2, 6, 40), C(3, 9, 40), PR(1, 13, 40), C(5, 17, 40), AL(1, 20, 40), C(2, 24, 40), PR(3, 27, 40), AL(3, 31, 40), C(4, 34, 40), C(1, 38, 40), AL(2, 41, 40), PR(2, 44, 40), C(5, 48, 40),
        ...varios('lx-arvore', 170, [[15, 15], [19, 18], [23, 15], [26, 18], [17, 20], [20, 16], [48, 16], [53, 20], [47, 22], [56, 17], [64, 16], [69, 19], [74, 16], [78, 20], [66, 24], [73, 24], [77, 28], [64, 30], [70, 31], [75, 33], [50, 14],
          [8, 3], [13, 5], [18, 2], [23, 6], [27, 3], [9, 7], [50, 3], [55, 5], [72, 3], [77, 5], [48, 6], [0, 14], [1, 20], [0, 28], [1, 33], [7, 15], [8, 19], [76, 42], [78, 46], [72, 45]]),
        ...varios('lx-pinheiro', 150, [[14, 18], [25, 16], [51, 24], [57, 22], [67, 21], [72, 28], [63, 27], [79, 14], [46, 18], [15, 1], [21, 3], [60, 3], [68, 2]]),
        ...varios('lx-rocha', 80, [[52, 17], [70, 23], [76, 25], [16, 16], [49, 20], [65, 33], [24, 17]]), ...varios('lx-arbusto', 60, [[29, 14], [45, 14], [58, 12], [74, 12], [24, 34], [52, 34]]),
        ...varios('lx-banco', 62, [[29, 30], [44, 30], [35, 33], [31, 13], [45, 12]]),
      ],
      beete: [[27, 26, 2, 1], [45, 26, 2, 1], [55, 40, 2, 1]],
      azulejos: [[16, 34.5], [36, 34.6], [50, 35], [60, 30.5], [34, 28.5], [45.5, 28.5], [41.6, 22], [42, 17], [30, 11], [45.5, 11.5], [37, 13.8], [58, 10.5], [73, 10.5], [60.6, 18], [60.6, 24], [4, 17], [11.6, 29], [7, 23.5], [20, 12], [66.6, 47], [72, 41], [56, 45.5], [20.5, 18.6], [52, 22.6], [74, 22], [68, 28]],
      pombos: [[37, 31.5]],
      extras: [['leo', 40.6, 13.4], ['nico', 23.3, 34.9], ['elli', 24.5, 34.2], ['michi', 58, 40.6]],
      gente: [['rita', 33, 34], ['professora', 45, 34.6]], passeio: ['fonte', 'pastelaria', 'vila', 'estacao'],
      lacos: [{ k: 'lx-carro', v: 135, s: 136, p: [[-3, 36.5], [83, 36.5], [83, 37.5], [-3, 37.5]], em: [0] }, { k: 'lx-carrinha', v: 120, s: 150, p: [[-3, 36.5], [83, 36.5], [83, 37.5], [-3, 37.5]], em: [2] }],
      fixas: [{ id: 'sintra', k: 'lx-comboio', s: 300, raio: 200, e: '🚆', x: 67, y: 43.6, dir: 'd', fim: [67, 54], para: 'baixa' }],
      parque: [['tuk', 26.4, 35.2], ['tuk', 52.6, 35.2], ['tuk', 62.6, 40.6], ['tuk', 31, 13.9], ['mota', 18, 35], ['mota', 47.6, 26.5], ['skate', 34, 34.4], ['skate', 56, 40.5], ['carro', 40, 39.3], ['carrinha', 8, 39.2]],
      auftraege: [
        { id: 'queque', p: 'avo-oma', o: [46.6, 30.4], art: 'compras', loja: 'pastelaria', ir: 'Vai à pastelaria, por favor!', fim: 'Obrigada, querida!',
          var: [['o queque', 'Quero um queque!'], ['o bolo de arroz', 'Quero um bolo de arroz!'], ['a torrada', 'Quero uma torrada!'], ['o pão de ló', 'Quero um pão de ló!']], outras: ['o pastel de nata', 'o croissant', 'o pão', 'o gelado'] },
        { id: 'taxi', p: 'rute', o: [30, 33.6], art: 'taxi', fim: 'Obrigada! Até logo!',
          var: [['palacio', 'Leva-me ao palácio, por favor!'], ['castelo', 'Leva-me ao castelo, por favor!'], ['estacao', 'Leva-me à estação, por favor!'], ['fonte', 'Leva-me à fonte, por favor!']] },
        { id: 'foto', p: 'papa', o: [36, 29.4], art: 'foto', fim: 'Que linda fotografia!',
          var: [['palacio', 'Tira uma fotografia do palácio!'], ['castelo', 'Tira uma fotografia do castelo!'], ['fonte', 'Tira uma fotografia da fonte!'], ['comboio', 'Tira uma fotografia do comboio!']] },
        { id: 'floresta', p: 'mama', o: [56, 34.2], art: 'juntar', n: 4, itens: ['a folha', 'o cogumelo', 'a castanha', 'a flor'], ir: 'Preciso de coisas da floresta! Ajuda-me!', fim: 'Obrigada! Que bom!',
          onde: [[16.5, 16.5], [22.5, 18.6], [25, 15.5], [48.5, 13.6], [54, 21.5], [50, 24.5], [66, 18.5], [72, 26.5], [76, 21.5], [70, 30]] },
        { id: 'coroa', p: 'pedro', o: [38, 13], art: 'buscar', coisa: 'wp-a coroa', ir: 'O rei perdeu a coroa! Ajuda-me!', achei: 'Encontrei a coroa!', fim: 'Obrigado! Que bom!',
          var: [['kFonte', 'A coroa está atrás da fonte!'], ['kPalacio', 'A coroa está ao lado do palácio!'], ['kBanco', 'A coroa está debaixo do banco!'], ['kPedra', 'A coroa está atrás da pedra!']] },
        { id: 'pondi', p: 'benni', o: [22, 34.2], art: 'buscar', fig: 'pondi', som: 'pondi-happy', ir: 'O Pondi escondeu-se na floresta! Ajuda-me!', achei: 'Encontrei-te, Pondi!', fim: 'Pondi! Obrigado!',
          var: [['oArvore', 'O Pondi está atrás da árvore!'], ['oPedra', 'O Pondi está atrás da pedra!'], ['oTorre', 'O Pondi está ao lado da torre!']] },
        { id: 'pipo', p: 'ines', o: [61, 34.3], art: 'buscar', fig: 'pipo', som: 'bark', ir: 'O Pipo fugiu! Ajuda-me!', achei: 'Encontrei-te, Pipo!', fim: 'Pipo! Obrigada!',
          var: [['iFonte', 'O Pipo está ao lado da fonte!'], ['iPalacio', 'O Pipo está ao lado do palácio!'], ['iBanco', 'O Pipo está debaixo do banco!'], ['iComboio', 'O Pipo está ao lado do comboio!']] },
      ],
    },
  };
  const WORTBILDER = [...new Set(Object.values(BAIRROS).flatMap(b => [
    ...b.auftraege.flatMap(a => [...(a.art === 'compras' || a.art === 'levar' ? [...a.var.map(v => v[0]), ...a.outras] : []), ...(a.itens || []), ...(a.coisa ? [a.coisa.slice(3)] : [])]),
    ...Object.values(b.orte).map(o => o[2]).filter(k => k && k.startsWith('wp-')).map(k => k.slice(3))]))];
  let ORTE, DINGE, BEETE, AZULEJOS, AUFTRAEGE, PARQUE; // die des Viertels, in dem man gerade ist (init)
  const FAHR = { // Fahrzeuge: Bildname, Größe im Bild, Tempo, wie träge es lenkt; motor = hupt, hat Radio, zählt beim Unfug; fechado = Figur darin nicht zu sehen
    skate: { k: 'lx-skate', s: 70, v: 310, a: 9, e: '🛹' }, bici: { k: 'lx-bici', s: 92, cs: 1.05, v: 300, a: 8, e: '🚲' }, mota: { k: 'lx-mota', s: 105, cs: 1.1, v: 400, a: 7, motor: true, e: '🛵' }, tuk: { k: 'lx-tuktuk', s: 150, v: 410, a: 4.5, motor: true, e: '🛺' },
    carro: { k: 'lx-carro', s: 136, v: 440, a: 3.8, motor: true, fechado: true, e: '🚗' }, carrinha: { k: 'lx-carrinha', s: 150, v: 390, a: 3.4, motor: true, fechado: true, e: '🚐' },
    barco: { k: 'lx-barco', s: 170, v: 270, a: 2.6, e: '⛵' },
  };
  // Bildsätze, deren Seitenansicht nach links schaut (das Bildmodell hält sich nicht immer an „nach rechts“): dort wird andersherum gespiegelt
  const ESQ = new Set(['lx-tuktuk', 'lx-tuktuk-ada', 'lx-tuktuk-selma']);
  const motor = v => !!(v && FAHR[v.tipo] && FAHR[v.tipo].motor), semRadio = v => !v || v.tipo === 'skate' || v.tipo === 'bici'; // Skate und Fahrrad: kein Radio, wer mitläuft, bleibt zu Fuß
  // Leos Tempo beim Wettrennen: langsamer als Ada und Selma zu Fuß (195), damit man auch ohne Skate gewinnt, wenn man gleich losläuft
  const LEO = 160; // gemessen: zu Fuß gewinnt man in der Baixa mit gut 2 s, am Campo mit gut 3 s Vorsprung; bei 170 verlor, wer 1,5 s zu spät loslief

  function makeScene(Phaser) {
    const B = window.OLA_PHASER, W = B.W, H = B.H;
    const ZF = 1.22, px = v => v * T, rnd = Phaser.Math.Between, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), baralha = a => Phaser.Utils.Array.Shuffle(a.slice());

    return class Lisboa extends Phaser.Scene {
      // d = { b: Viertel, via: Linie, mit der man ankommt, st: was mitreist }; beim ersten Start leer
      init(d) {
        this.d = d && d.b ? d : {}; this.bid = this.d.b || (BAIRROS[window.OLA_LISBOA_BAIRRO] ? window.OLA_LISBOA_BAIRRO : 'campo'); const b = this.b = BAIRROS[this.bid];
        ROWS = b.rows || 48; WW = COLS * T; WH = ROWS * T; ORTE = b.orte; DINGE = b.dinge; BEETE = b.beete || []; AZULEJOS = b.azulejos || []; AUFTRAEGE = b.auftraege; PARQUE = b.parque || [];
        AUFTRAEGE.forEach(a => { a.chave = this.bid + ':' + a.id; });
      }
      preload() {
        const api = this.api = this.registry.get('api'), im = id => { if (!this.textures.exists(id)) this.load.image(id, B.sprite(api, id)); };
        [...new Set(DINGE.map(d => d[0]))].forEach(im); ['lx-canteiro', 'lx-skate', 'pombo', 'tram-pombos', 'gast-ada', 'gast-selma', 'lx-cacilheiro'].forEach(im);
        Object.values(BAIRROS).forEach(b => im(b.pic)); Object.values(ORTE).forEach(o => { if (o[2] && !o[2].startsWith('wp-')) im(o[2]); });
        ['ada', 'selma'].forEach(f => [1, 2, 3, 4, 5].forEach(n => im(`lx-${f}-${n}`))); [1, 2, 3, 4].forEach(n => im('lx-policia-' + n));
        ['tuktuk', 'carro', 'carrinha', 'eletrico', 'barco', 'lavra', 'comboio', 'bici', 'bici-ada', 'bici-selma', 'mota', 'mota-ada', 'mota-selma', 'tuktuk-ada', 'tuktuk-selma', 'barco-ada', 'barco-selma', 'skate-ada', 'skate-selma', 'eletrico-ada', 'eletrico-selma'].forEach(f => [1, 2, 3].forEach(n => im(`lx-${f}-${n}`)));
        ['ada', 'selma', 'mama', 'papa', 'avo-oma', 'avo-opa', 'leo', 'benni', 'nico', 'ines', 'pedro', 'rute', 'elli', 'michi', 'pipo', 'pondi', 'pandi', 'professora', 'educadora', 'rita'].forEach(f => im('lx-fig-' + f));
        ['galinha', 'galo', 'pato', 'ganso', 'gato', 'pavao', 'caranguejo'].forEach(f => im('lx-bicho-' + f));
        im('tram-policia'); im('eletrico'); im('tram-carro'); im('gast-pipo'); AUFTRAEGE.forEach(a => im('gast-' + a.p));
        WORTBILDER.forEach(w => { const u = api.pic && api.pic(w); if (u && !this.textures.exists('wp-' + w)) this.load.image('wp-' + w, u); });
        ['collect', 'honk', 'bonk', 'win', 'lose', 'motor', 'splash', 'apito', 'shutter', 'bark', 'sino-eletrico', 'pop', 'star', 'go', 'countdown', 'pondi-happy', 'pandi-found', 'gull', 'whoosh', 'music-corrida', 'music-eletrico', 'fila-musica',
          'animal-galinha', 'animal-galo', 'animal-pato', 'animal-gato', 'instr-guitarra'].forEach(k => { if (!this.cache.audio.exists(k)) this.load.audio(k, B.sfx(k)); });
      }

      create() {
        const api = this.api, st = this.d.st || {}; if (window.OLA_DEBUG) window.OLA_LISBOA_SZENE = this;
        B.particles(this);
        // die Szene wird bei jedem Wechsel des Viertels neu gestartet: alles zurücksetzen, was nicht mitreist
        this.ger = (this.ger || 0) + 1; this.zeit = st.zeit || 0; this.sterne = st.sterne || 0; this.azul = st.azul || 0; this.feito = st.feito || {}; this.colh = st.colh || {}; this.chamou = !!st.chamou; this.sender = st.sender || 0;
        this.pronto = false; this.over = false; this.preso = false; this.viajando = false; this.apitos = 0; this.semCulpa = 0; this.m = null; this.ents = []; this.segue = null; this.rival = null; this.levo = null; this.bando = []; this.falaFim = null; this.ultimo = null; this.leoVolta = false; this.poT = 0; this.teclas = null;
        this.salvo = (api.store && api.store.get()) || { st: 0, az: 0, m: {} };
        this.bauen(); this.boden(); this.dinge(); this.figuren(); this.fahrzeuge(); this.verkehr(); this.anzeige(); this.eingabe();
        this.cameras.main.setBounds(0, 0, WW, WH);
        ['motor', 'music-corrida', 'fila-musica', 'music-eletrico'].forEach(k => this.sound.removeByKey(k));
        this.radio = null; this.motor = this.cache.audio.exists('motor') ? this.sound.add('motor', { loop: true, volume: 0 }) : null; if (this.motor) this.motor.play();
        if (this.d.via) this.chegar(); else this.escolher();
      }

      /* ---------- Stadtplan ---------- */
      bauen() {
        const b = this.b, g = this.g = new Uint8Array(COLS * ROWS), set = (t, x, y, w = 1, h = 1) => { for (let r = Math.max(0, y); r < Math.min(ROWS, y + h); r++) for (let c = Math.max(0, x); c < Math.min(COLS, x + w); c++) g[r * COLS + c] = t; };
        this.em = (c, r) => c < 0 || r < 0 || c >= COLS || r >= ROWS ? SO : g[r * COLS + c];
        // Gehwege rund um die Straßen (wo noch Gras ist)
        const passeio = () => { const alt = g.slice(); for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (alt[r * COLS + c] === GR) { let n = false; for (let a = -1; a <= 1; a++) for (let d = -1; d <= 1; d++) { const cc = c + d, rr = r + a; if (cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS && alt[rr * COLS + cc] === RD) n = true; } if (n) g[r * COLS + c] = PV; } };
        b.chao({ set, passeio });
        BEETE.forEach(([x, y, w, h]) => set(FL, x, y, w, h));
        this.g0 = g.slice(); // der Boden, bevor etwas daraufsteht (zum Malen)
        DINGE.forEach(([k, x, y, w, h]) => { if (w && h) set(SO, Math.floor(x), Math.floor(y), w, h); });
        (b.fest || []).forEach(([x, y, w, h]) => set(SO, x, y, w, h));
      }
      // darf man hier sein? wie = 'pe' (zu Fuß, Skate), 'tuk', 'barco'
      pode(x, y, wie) { const t = this.em(Math.floor(x / T), Math.floor(y / T)); return wie === 'barco' ? t === WA || t === BR : t !== WA && t !== SO && t !== MU && t !== VI && (wie !== 'tuk' || (t !== DK && t !== ES)); }
      livre(x, y, wie, r = 12) { return this.pode(x - r, y - r * 0.5, wie) && this.pode(x + r, y - r * 0.5, wie) && this.pode(x - r, y + r * 0.5, wie) && this.pode(x + r, y + r * 0.5, wie); }
      // kürzester Weg über die Kacheln (Breitensuche), Ergebnis: Liste von Punkten; null, wenn es keinen gibt
      caminho(x0, y0, x1, y1, wie = 'pe') {
        const c0 = Math.floor(x0 / T), r0 = Math.floor(y0 / T); let c1 = Math.floor(x1 / T), r1 = Math.floor(y1 / T);
        const ok = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && this.pode(c * T + 24, r * T + 24, wie);
        if (!ok(c1, r1)) { let best = null; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (ok(c1 + b, r1 + a)) { const d = a * a + b * b; if (!best || d < best[0]) best = [d, c1 + b, r1 + a]; } if (!best) return null; c1 = best[1]; r1 = best[2]; x1 = c1 * T + 24; y1 = r1 * T + 24; }
        if (c0 < 0 || r0 < 0 || c0 >= COLS || r0 >= ROWS) return null;
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
        const CW = 20, CH = 12, tela = (key, w, h) => { if (this.textures.exists(key)) this.textures.remove(key); return this.textures.createCanvas(key, w, h); };
        for (let i = 0; i < 40; i++) if (this.textures.exists('chao' + i)) this.textures.remove('chao' + i); // Stücke des vorigen Viertels
        let nr = 0;
        for (let cy = 0; cy < Math.ceil(ROWS / CH); cy++) for (let cx = 0; cx < COLS / CW; cx++) {
          const key = 'chao' + nr++, ct = tela(key, CW * T, CH * T), c = ct.getContext();
          for (let r = 0; r < CH; r++) for (let q = 0; q < CW; q++) { const C = cx * CW + q, R = cy * CH + r; if (R >= ROWS) continue; const t = this.g0[R * COLS + C], x = q * T, y = r * T, n = (dc, dr) => this.em(C + dc, R + dr);
            if (t === GR || t === SO || t === FL) { c.fillStyle = (C + R) % 2 ? '#8fd16b' : '#87ca63'; c.fillRect(x, y, T, T); for (let i = 0; i < 3; i++) { c.fillStyle = ['#7abf58', '#a5dd80', '#fff6a8'][i]; c.fillRect(x + zf() * 44, y + zf() * 44, 3, 6); } }
            else if (t === PT) { c.fillStyle = C % 2 ? '#5fb85a' : '#55ad50'; c.fillRect(x, y, T, T); }
            else if (t === RD || t === BR) { c.fillStyle = t === BR ? '#8a8f9c' : '#787d8a'; c.fillRect(x, y, T, T); c.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 4; i++) c.fillRect(x + zf() * 44, y + zf() * 44, 4, 2);
              if (t === BR) { c.fillStyle = '#c9a36b'; if (n(-1, 0) === WA) c.fillRect(x, y, 6, T); if (n(1, 0) === WA) c.fillRect(x + T - 6, y, 6, T); } }
            else if (t === PV) { c.fillStyle = '#f1e6cc'; c.fillRect(x, y, T, T); c.fillStyle = '#e4d6b6'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j + C + R) % 2) c.fillRect(x + i * 12 + 1, y + j * 12 + 1, 10, 10);
              c.fillStyle = '#b9ad90'; if (n(0, 1) === RD) c.fillRect(x, y + T - 4, T, 4); if (n(0, -1) === RD) c.fillRect(x, y, T, 4); if (n(1, 0) === RD) c.fillRect(x + T - 4, y, 4, T); if (n(-1, 0) === RD) c.fillRect(x, y, 4, T); }
            else if (t === CL) { // Wellenpflaster: helle Steine mit dunklen Wellenbändern, über die Kachelgrenzen hinweg durchlaufend
              c.fillStyle = '#f5eedb'; c.fillRect(x, y, T, T); c.save(); c.beginPath(); c.rect(x, y, T, T); c.clip(); c.strokeStyle = '#7b8494'; c.lineWidth = 7;
              for (const o of [12, 36]) { c.beginPath(); for (let i = -6; i <= T + 6; i += 6) { const yy = y + o + Math.sin((C * T + i) / T * Math.PI) * 6; if (i === -6) c.moveTo(x + i, yy); else c.lineTo(x + i, yy); } c.stroke(); } c.restore(); }
            else if (t === ES) { c.fillStyle = '#ece2c8'; c.fillRect(x, y, T, T); for (let i = 0; i < 4; i++) { c.fillStyle = '#b3a37c'; c.fillRect(x, y + i * 12 + 9, T, 3); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x, y + i * 12, T, 2); }
              c.fillStyle = '#9c8d68'; if (n(-1, 0) !== ES) c.fillRect(x, y, 3, T); if (n(1, 0) !== ES) c.fillRect(x + T - 3, y, 3, T); }
            else if (t === TE || t === TR) { c.fillStyle = t === TR ? '#cdbf9f' : '#e8d2a2'; c.fillRect(x, y, T, T); c.fillStyle = t === TR ? '#b8a987' : '#d8bd85'; for (let i = 0; i < 6; i++) c.fillRect(x + zf() * 44, y + zf() * 44, 4, 3); }
            else if (t === MU) { const frente = n(0, 1) !== MU; c.fillStyle = '#e0d6c0'; c.fillRect(x, y, T, T); if (frente) { c.fillStyle = '#ab9c82'; c.fillRect(x, y + 28, T, 20); c.fillStyle = '#93856c'; c.fillRect(x + 23, y + 28, 2, 20); c.fillRect(x, y + 37, T, 2); }
              c.strokeStyle = '#8f8169'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, T - 2, (frente ? 28 : T) - 2); c.fillStyle = '#cfc4ab'; c.fillRect(x + 8, y + 7, 12, 8); c.fillRect(x + 28, y + 7, 12, 8); }
            else if (t === VI) { c.fillStyle = '#bcdcee'; c.fillRect(x, y, T, T); for (let i = 0; i < 3; i++) { const hx = x + zf() * 30, hy = y + 4 + zf() * 28; c.fillStyle = '#f7efe2'; c.fillRect(hx, hy + 6, 14, 8); c.fillStyle = '#e58a55'; c.beginPath(); c.moveTo(hx - 2, hy + 6); c.lineTo(hx + 7, hy); c.lineTo(hx + 16, hy + 6); c.fill(); } c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x, y, T, T); }
            else if (t === WA) { c.fillStyle = (C + R) % 2 ? '#4aa8e0' : '#46a2dc'; c.fillRect(x, y, T, T); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); const wx = x + zf() * 20, wy = y + 10 + zf() * 26; c.moveTo(wx, wy); c.quadraticCurveTo(wx + 7, wy - 5, wx + 14, wy); c.quadraticCurveTo(wx + 21, wy + 5, wx + 28, wy); c.stroke();
              const agua = v => v === WA || v === BR || v === DK; c.fillStyle = 'rgba(255,255,255,.55)'; if (R > 0 && !agua(n(0, -1))) c.fillRect(x, y, T, 5); if (R < ROWS - 1 && !agua(n(0, 1))) c.fillRect(x, y + T - 5, T, 5); if (C > 0 && !agua(n(-1, 0))) c.fillRect(x, y, 5, T); if (C < COLS - 1 && !agua(n(1, 0))) c.fillRect(x + T - 5, y, 5, T); }
            else if (t === SA) { c.fillStyle = '#f6e3a4'; c.fillRect(x, y, T, T); c.fillStyle = '#e9d18a'; for (let i = 0; i < 5; i++) c.fillRect(x + zf() * 44, y + zf() * 44, 3, 3); }
            else if (t === DK) { c.fillStyle = '#b98a54'; c.fillRect(x, y, T, T); c.fillStyle = '#9c7040'; for (let i = 0; i < 4; i++) c.fillRect(x, y + i * 12, T, 2); }
          }
          // Mittellinien, Schienen, Fußballplatz: in Weltkoordinaten, auf dieses Stück verschoben
          c.save(); c.translate(-cx * CW * T, -cy * CH * T);
          const rua = (q, r) => { const t = this.em(q, r); return t === RD || t === BR; };
          if (this.b.pinta) this.b.pinta({
            faixaH: (r, a = 0, b = COLS) => { c.fillStyle = 'rgba(255,255,255,.75)'; for (let q = a; q < b; q++) if (rua(q, r) && !rua(q, r - 2) && !rua(q, r + 2)) c.fillRect(q * T + 12, r * T + 21, 24, 5); },
            faixaV: (q, a = 0, b = ROWS) => { c.fillStyle = 'rgba(255,255,255,.75)'; for (let r = a; r < b; r++) if (rua(q, r) && !rua(q - 2, r) && !rua(q + 2, r)) c.fillRect(q * T + 21, r * T + 12, 5, 24); },
            linhaV: (q, a = 0, b = ROWS) => { c.fillStyle = 'rgba(255,255,255,.8)'; for (let r = a; r < b; r++) if (rua(q, r) && rua(q - 1, r) && !(rua(q - 4, r) && rua(q + 3, r))) { c.fillRect(q * T - 5, r * T, 3, T); c.fillRect(q * T + 2, r * T, 3, T); } },
            trilhos: (pts, dorm) => { for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], d = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / d, uy = (y2 - y1) / d;
              if (dorm) { c.strokeStyle = '#8a6a45'; c.lineWidth = 5; for (let s = 0.2; s < d; s += 0.4) { c.beginPath(); c.moveTo((x1 + ux * s) * T - uy * 13, (y1 + uy * s) * T + ux * 13); c.lineTo((x1 + ux * s) * T + uy * 13, (y1 + uy * s) * T - ux * 13); c.stroke(); } }
              c.strokeStyle = '#4b4f5a'; c.lineWidth = 3; for (const s of [-7, 7]) { c.beginPath(); c.moveTo(x1 * T - uy * s - ux * (i ? 7 : 0), y1 * T + ux * s - uy * (i ? 7 : 0)); c.lineTo(x2 * T - uy * s + ux * 7, y2 * T + ux * s + uy * 7); c.stroke(); } } },
            campo: (x, y, w, h) => { c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 4; c.strokeRect((x + 0.4) * T, (y + 0.3) * T, (w - 0.8) * T, (h - 0.6) * T); c.beginPath(); c.moveTo((x + w / 2) * T, (y + 0.3) * T); c.lineTo((x + w / 2) * T, (y + h - 0.3) * T); c.stroke(); c.beginPath(); c.arc((x + w / 2) * T, (y + h / 2) * T, 40, 0, 7); c.stroke();
              c.strokeRect((x + 0.4) * T, (y + h / 2 - 1) * T, 36, 2 * T); c.strokeRect((x + w - 0.4) * T - 36, (y + h / 2 - 1) * T, 36, 2 * T); },
          });
          c.restore(); ct.refresh();
          this.add.image(cx * CW * T, cy * CH * T, key).setOrigin(0).setDepth(0);
        }
        // Wasser glitzert: wandernde helle Streifen über Fluss und Teich
        if (!this.textures.exists('glitzer')) { const wg = this.make.graphics({ add: false }); wg.fillStyle(0xffffff, 0.5); for (let i = 0; i < 14; i++) wg.fillRoundedRect(rnd(0, 230), rnd(0, 120), rnd(12, 26), 3, 1.5); wg.generateTexture('glitzer', 256, 128); wg.destroy(); }
        this.aguas = (this.b.agua || []).map(([x, y, w, h]) => this.add.tileSprite(px(x), px(y), px(w), px(h), 'glitzer').setOrigin(0).setDepth(1).setAlpha(0.6));
        // Karte für die Ecke: 2 px je Kachel
        const mk = tela('karte', COLS * 2, ROWS * 2), m = mk.getContext(), cor = { [GR]: '#8fd16b', [RD]: '#787d8a', [BR]: '#8a8f9c', [PV]: '#f1e6cc', [WA]: '#4aa8e0', [SA]: '#f6e3a4', [SO]: '#c9623a', [FL]: '#e86fa0', [DK]: '#b98a54', [PT]: '#55ad50', [CL]: '#e3dccb', [ES]: '#cdbf9c', [TE]: '#e8d2a2', [MU]: '#9a8c74', [VI]: '#bcdcee', [TR]: '#cdbf9f' };
        for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) { m.fillStyle = cor[this.em(q, r)]; m.fillRect(q * 2, r * 2, 2, 2); } mk.refresh();
      }
      // Bild oder, wenn es (noch) fehlt, ein Platzhalter
      tx(k) { if (this.textures.exists(k)) return k; const p = 'ph-' + k; if (!this.textures.exists(p)) { const g = this.make.graphics({ add: false }); g.fillStyle(0xd9895b).fillRoundedRect(0, 0, 96, 96, 12).lineStyle(4, 0x7a3e22).strokeRoundedRect(2, 2, 92, 92, 12); g.generateTexture(p, 96, 96); g.destroy(); } return p; }
      dinge() {
        this.beete = BEETE.map(([x, y, w, h]) => { const ims = []; for (let r = 0; r < h; r++) { const im = this.add.image(px(x + w / 2), px(y + r + 1) - 1, this.tx('lx-canteiro')).setOrigin(0.5, 1); im.setDisplaySize(w * T + 6, (w * T + 6) * im.height / im.width).setDepth(2 + r * 0.01); ims.push(im); } return { x: px(x + w / 2), y: px(y + h / 2), w: w * T, h: h * T, ims, platt: 0 }; });
        // hohe Dinge merken: steht die Figur dahinter, werden sie durchscheinend
        this.altos = [];
        DINGE.forEach(([k, x, y, w, h, dw]) => { const im = this.add.image(px(x + (w || 1) / 2), px(y + (h || 1)) - 3, this.tx(k)).setOrigin(0.5, 1), dh = dw * im.height / im.width; im.setDisplaySize(dw, dh).setDepth(1000 + px(y + (h || 1)) - 3);
          if (dh > 120) this.altos.push({ im, x0: im.x - dw / 2 + 6, x1: im.x + dw / 2 - 6, y0: im.y - dh + 20, y1: im.y - 6 }); });
        // Kacheln zum Sammeln, Ring für Aufträge, Schatten
        const g = this.make.graphics({ add: false });
        if (!this.textures.exists('azulejo')) { g.fillStyle(0xffffff).fillRoundedRect(0, 0, 30, 30, 5).lineStyle(3, 0x1f5fbf).strokeRoundedRect(1.5, 1.5, 27, 27, 5); g.fillStyle(0x2f7be0).fillCircle(15, 15, 6).fillTriangle(15, 3, 11, 9, 19, 9).fillTriangle(15, 27, 11, 21, 19, 21).fillTriangle(3, 15, 9, 11, 9, 19).fillTriangle(27, 15, 21, 11, 21, 19); g.generateTexture('azulejo', 30, 30);
          g.clear(); g.fillStyle(0xffe066, 0.35).fillEllipse(40, 20, 80, 40).lineStyle(5, 0xffc400).strokeEllipse(40, 20, 72, 32); g.generateTexture('anel', 80, 40);
          g.clear(); g.fillStyle(0x000000, 0.22).fillEllipse(24, 8, 48, 16); g.generateTexture('sombra', 48, 16); } g.destroy();
        const ja = new Set(this.colh[this.bid] || []);
        this.azulejos = AZULEJOS.map(([x, y], i) => ({ x: px(x), y: px(y), i })).filter(z => !ja.has(z.i) && this.pode(z.x, z.y, 'pe')).map(z => { z.im = this.add.image(z.x, z.y, 'azulejo').setDepth(900); this.tweens.add({ targets: z.im, y: z.y - 7, angle: 8, duration: 700 + z.i * 13, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); return z; });
        // Nebel im Wald (Sintra): weiche weiße Schwaden ziehen langsam über das Bild
        if (this.b.nevoa && !this.textures.exists('nevoa')) { const ct = this.textures.createCanvas('nevoa', 256, 256), c = ct.getContext(); for (const [x, y, r] of [[60, 70, 80], [190, 60, 70], [128, 180, 90], [20, 200, 60], [236, 200, 60]]) for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); } ct.refresh(); }
        this.nevoas = (this.b.nevoa || []).map(([x, y, w, h]) => this.add.tileSprite(px(x), px(y), px(w), px(h), 'nevoa').setOrigin(0).setDepth(5300).setAlpha(0.45).setTileScale(2.5));
        // Tauben
        this.pombos = (this.b.pombos || []).map(([x, y]) => ({ x: px(x), y: px(y), im: this.add.image(px(x), px(y), this.tx('tram-pombos')).setOrigin(0.5, 1).setDisplaySize(84, 32).setDepth(1000 + px(y)), weg: 0 }));
        // die Fähre zieht über den Fluss
        if (this.b.ferry) { const fe = this.add.image(-260, px(this.b.ferry), this.tx('lx-cacilheiro')).setOrigin(0.5, 1).setDepth(1000 + px(this.b.ferry)); fe.setDisplaySize(230, 230 * fe.height / fe.width);
          this.tweens.add({ targets: fe, x: WW + 260, duration: 75000, yoyo: true, repeat: -1, hold: 3000, repeatDelay: 3000, onYoyo: () => fe.setFlipX(true), onRepeat: () => fe.setFlipX(false) }); }
      }
      // Schild über einer Haltestelle: Bild des Viertels, in das man von hier fährt (sieht aus wie die Zielkarte, die man im Wagen antippt)
      placa(x, y, pic) { const c = this.add.container(x, y).setDepth(5100), g = this.add.graphics(), im = this.add.image(0, 0, this.tx(pic)); g.fillStyle(0xffc400).fillTriangle(-10, 30, 10, 30, 0, 44).fillStyle(0xffffff, 0.97).fillRoundedRect(-32, -32, 64, 64, 13).lineStyle(5, 0xffc400).strokeRoundedRect(-32, -32, 64, 64, 13);
        im.setScale(50 / Math.max(im.width, im.height)); c.add([g, im]); this.tweens.add({ targets: c, y: y - 7, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); return c; }
      // Ding, das in der Welt liegt und geholt werden will: weißer Kreis mit Bild, wippt
      marca(x, y, pic) { const c = this.add.container(x, y).setDepth(5200), im = this.add.image(0, 0, this.tx(pic)); im.setScale(44 / Math.max(im.width, im.height)); c.add([this.add.circle(0, 0, 29, 0xffffff).setStrokeStyle(4, 0xffc400), im]); this.tweens.add({ targets: c, y: y - 8, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); return c; }

      /* ---------- Figuren ---------- */
      // k = Bildname ohne Nummer (lx-ada → lx-ada-1 … 5, sonst das eine Bild lx-fig-…), alt = Höhe im Bild
      fig(id, k, x, y, alt, einzel) {
        const fases = !einzel && this.textures.exists(k + '-1') && this.textures.exists(k + '-3');
        const f = { id, q: id === 'policia' ? [1, 1, 2, 3, 4] : [1, 2, 3, 4, 5], k: fases ? k : einzel || k, fases, x: px(x), y: px(y), dir: 'd', mov: false, t: rnd(0, 9), alt: alt * ZF, veh: null, vx: 0, vy: 0, vis: true };
        f.sh = this.add.image(f.x, f.y, 'sombra').setDepth(999); f.im = this.add.image(f.x, f.y, this.tx(fases ? k + '-1' : f.k)).setOrigin(0.5, 1); this.ents.push(f); return f;
      }
      figuren() {
        const b = this.b, p0 = this.d.via ? b.chega[this.d.via] || b.inicio : b.inicio;
        this.irmas = { ada: this.fig('ada', 'lx-ada', p0[0] - 0.6, p0[1], 78, 'lx-fig-ada'), selma: this.fig('selma', 'lx-selma', p0[0] + 0.6, p0[1] + 0.2, 66, 'lx-fig-selma') };
        // die Laufbilder gibt es erst nach dem Zerlegen der Streifen; bis dahin das eine Standbild
        ['ada', 'selma'].forEach(n => { const f = this.irmas[n]; if (this.textures.exists(`lx-${n}-1`) && this.textures.exists(`lx-${n}-3`)) { f.fases = true; f.k = 'lx-' + n; } });
        this.eu = this.irmas[(this.d.st && this.d.st.eu) || 'ada'];
        const N = (id, x, y, alt) => this.fig(id, 'lx-fig-' + id, x, y, alt || ALT[id] || 90, 'lx-fig-' + id);
        this.np = {}; AUFTRAEGE.forEach(a => { this.np[a.p] = N(a.p, a.o[0], a.o[1]); });
        (b.extras || []).forEach(([id, x, y]) => { if (!this.np[id]) this.np[id] = N(id, x, y); });
        this.pipo = N('pipo', ...(b.pipo || [0, 0]), 44); this.pipo.vis = !!b.pipo; if (b.pipo) this.pipo.casa = [this.pipo.x, this.pipo.y];
        this.pandi = N('pandi', 0, 0, 46); this.pandi.vis = false; this.pondi = N('pondi', 0, 0, 56); this.pondi.vis = false;
        // Tiere: laufen in ihrem Revier umher (area), die Bilder schauen nach links
        this.bichos = (b.bichos || []).map(([tipo, x, y, area]) => { const f = this.fig(tipo, 'lx-bicho-' + tipo, x, y, ALT[tipo] || 36, 'lx-bicho-' + tipo); f.tipo = tipo; f.area = area; f.esq = true; f.casa = [f.x, f.y]; f.warte = rnd(0, 40) / 10; f.ziel = null; return f; });
        this.pol = this.fig('policia', 'lx-policia', 0, 0, 96, 'tram-policia'); this.pol.vis = false; this.pol.on = false;
        // Auftragsmarken: gelber Ring vor der Figur und ein Ausrufezeichen darüber
        AUFTRAEGE.forEach(a => { const f = this.np[a.p]; a.x = f.x; a.y = f.y + 46; a.anel = this.add.image(a.x, a.y, 'anel').setDepth(3); a.sinal = this.add.text(f.x, f.y - f.alt - 30, '❗', { fontSize: '40px' }).setOrigin(0.5).setDepth(5000);
          this.tweens.add({ targets: a.sinal, y: a.sinal.y - 8, duration: 500, yoyo: true, repeat: -1 }); this.tweens.add({ targets: a.anel, scale: 1.12, alpha: 0.7, duration: 600, yoyo: true, repeat: -1 }); });
        // Spaziergänger
        this.gente = (b.gente || []).map(([id, x, y], i) => { const f = N(id, x, y, 88); f.ziel = null; f.warte = i * 2; return f; });
      }
      // das Tier oder Kuscheltier, das in einem Auftrag gesucht wird
      bichoDe(tipo) { return tipo === 'pipo' ? this.pipo : tipo === 'pandi' ? this.pandi : tipo === 'pondi' ? this.pondi : this.bichos.find(x => x.tipo === tipo && !x.preso) || this.bichos.find(x => x.tipo === tipo); }
      // Bild und Lage einer Figur für dieses Bild; passageiro = sitzt in einem Fahrzeug
      malFig(f, time) {
        const im = f.im; im.setVisible(f.vis && !f.dentro && !f.oculto); f.sh.setVisible(f.vis && !f.veh && !f.dentro); if (!f.vis || f.dentro || f.oculto) return;
        const passo = f.mov && !f.veh ? Math.floor(f.t * 7) % 2 : 0; let k = f.k, flip = f.dir === 'l', hop = f.mov && !f.veh ? Math.abs(Math.sin(f.t * 11)) * 4 : 0;
        if (f.fases) { const q = f.q; if (f.dir === 'u') { k += '-' + q[4]; flip = passo === 1; } else if (f.dir === 'd') { k += '-' + (f.mov && !f.veh ? q[1] : q[0]); flip = passo === 1; } else k += '-' + (passo ? q[3] : q[2]); if (f.veh && (f.dir === 'l' || f.dir === 'r')) k = f.k + '-' + q[0]; }
        else if (f.esq) { if (f.dir === 'r') f.viraR = true; else if (f.dir === 'l') f.viraR = false; flip = !!f.viraR; }
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
      entrar(f, v) { if (v.quem) return; v.quem = f; f.veh = v; f.x = v.x; f.y = v.y; f.vx = f.vy = 0; f.rota = null; this.destino = null; B.play(this, 'pop', { volume: 0.5 }); if (!semRadio(v)) this.tocarRadio(true); }
      // in Elétrico oder Standseilbahn einsteigen (als Fahrgast): unten erscheinen die Bilder der Viertel, in die die Linie fährt
      embarcar(f, v) { v.gente.push(f); f.veh = v; f.dentro = true; f.x = v.x; f.y = v.y; f.mov = false; this.destino = null; B.play(this, 'pop', { volume: 0.5 }); if (v.para.length && !this.viajando) this.falar(v, 'Para onde vamos?'); }
      // aussteigen: neben dem Fahrzeug, wo man stehen kann (beim Boot am Ufer oder Steg)
      saida(f) { const v = f.veh; if (!v) return null; if (v.tram) { if (v.parado <= 0) return null; let frei = null; for (const r of [96, 130, 170]) for (let a = 0; a < 8; a++) { const x = v.x + Math.round(Math.cos(a * Math.PI / 4)) * r, y = v.y + Math.round(Math.sin(a * Math.PI / 4)) * r; if (!this.livre(x, y, 'pe', 10)) continue; const t = this.em(Math.floor(x / T), Math.floor(y / T)); if (t === PV || t === CL) return [x, y]; frei = frei || [x, y]; } return frei; }
        const R = v.tipo === 'barco' ? [70, 100, 130] : motor(v) ? [60, 84, 110] : [44, 64]; for (const r of R) for (let a = 0; a < 8; a++) { const x = v.x + Math.cos(a * Math.PI / 4 + 1.57) * r, y = v.y + Math.sin(a * Math.PI / 4 + 1.57) * r * 0.8; if (this.livre(x, y, 'pe', 10) && this.em(Math.floor(x / T), Math.floor(y / T)) !== BR || (v.tipo !== 'barco' && this.livre(x, y, 'pe', 10))) return [x, y]; } return null; }
      sair(f) { const v = f.veh, p = this.saida(f); if (!v || !p) return; if (v.tram) v.gente = v.gente.filter(x => x !== f); else v.quem = null; f.veh = null; f.dentro = false; f.oculto = false; f.x = p[0]; f.y = p[1]; f.dy = 0; f.dz = 0; f.escala = 1; f.vx = f.vy = 0; B.play(this, 'pop', { volume: 0.5 }); this.tocarRadio(false); }
      tocarRadio(an) { if (this.radio) { this.radio.stop(); this.radio = null; } if (!an || !this.sender) return; const k = ['', 'music-corrida', 'fila-musica', 'music-eletrico'][this.sender]; if (this.cache.audio.exists(k)) { this.radio = this.sound.add(k, { loop: true, volume: 0.2 }); this.radio.play(); } }

      /* ---------- Verkehr: Elétrico, Standseilbahn, Autos ---------- */
      verkehr() {
        // em = an welchen Eckpunkten des Wegs ein Fahrzeug startet; tram = man kann mitfahren; para = Viertel, in die die Linie fährt
        const laço = (def, i0) => { const p = def.p.map(([x, y]) => [px(x), px(y)]), o = { tram: !!def.tram, p, i: i0, x: p[i0][0], y: p[i0][1], v: def.v, k: def.k, s: def.s, dir: 'r', parado: 0, paragens: (def.paragens || []).map(([x, y]) => [px(x), px(y)]), gente: [], buzina: 0, para: def.para || [] };
          o.im = this.add.image(o.x, o.y, this.tx(def.k + '-1')).setOrigin(0.5, 1); this.carros.push(o); return o; };
        this.carros = []; (this.b.lacos || []).forEach(def => (def.em || [0]).forEach(i0 => laço(def, i0)));
        // feste Linien (fixas: Standseilbahn, Züge) stehen an ihrer Station und fahren erst los, wenn jemand das Ziel antippt; id = Name der Linie,
        // unter dem das Zielviertel den Ankunftsort führt (chega), raio = wie nah man zum Einsteigen sein muss, e = Zeichen auf dem grünen Knopf
        (this.b.fixas || []).forEach(lv => { const o = laço({ tram: true, p: [[lv.x, lv.y]], v: 0, k: lv.k, s: lv.s || 150, para: [lv.para] }, 0); o.funi = true; o.fixa = lv; o.parado = Infinity; o.dir = lv.dir; o.fim = [px(lv.fim[0]), px(lv.fim[1])]; });
        this.transit = this.carros.filter(c => c.tram);
        // Linien in andere Viertel: wo man einsteigt (Haltestellen bzw. Station der Standseilbahn). Dort schwebt ein Schild mit dem
        // Bild des Ziels, auf der kleinen Karte ist die Stelle gelb, und ein gelber Pfeil am Bildrand zeigt hin (anzeige, hud)
        this.linhas = (this.b.lacos || []).filter(def => def.tram && def.para && def.para.length).map(def => ({ para: def.para[0], pontos: def.paragens.map(([x, y]) => [px(x), px(y)]) }));
        (this.b.fixas || []).forEach(lv => this.linhas.push({ para: lv.para, pontos: [[px(lv.x), px(lv.y)]] }));
        this.linhas.forEach(l => l.pontos.forEach(([x, y]) => this.placa(x, y - 150, BAIRROS[l.para].pic)));
        if (this.d.via === 'eletrico') { const t = this.transit.find(c => !c.funi); if (t) t.parado = 3.5; } // der Elétrico, mit dem man kam, steht noch kurz an der Haltestelle
      }
      andaCarro(o, dt) {
        if (o.bum > 0) { o.bum -= dt; return; } // nach einem Zusammenstoß bleibt das Auto kurz stehen
        if (o.parado > 0) { o.parado -= dt; if (o.parado <= 0 && o.tram) B.play(this, 'sino-eletrico', { volume: this.perto(o) }); return; }
        if (o.p.length < 2) return;
        const [tx, ty] = o.p[(o.i + 1) % o.p.length], d = Math.hypot(tx - o.x, ty - o.y), ux = (tx - o.x) / (d || 1), uy = (ty - o.y) / (d || 1); o.dir = Math.abs(ux) > Math.abs(uy) ? (ux < 0 ? 'l' : 'r') : uy < 0 ? 'u' : 'd';
        // warten, wenn jemand im Weg ist (Figur, Fahrzeug, anderes Auto)
        const vorn = { x: o.x + ux * 70, y: o.y + uy * 70 - 10 }, weg = [this.irmas.ada, this.irmas.selma, ...this.carros.filter(c => c !== o)].some(e => Math.hypot(e.x - vorn.x, e.y - vorn.y) < 46);
        if (weg && !o.tram) { o.buzina -= dt; if (o.buzina <= 0 && dist(this.eu, o) < 130) { o.buzina = 2.5; B.play(this, 'honk', { volume: 0.35 }); } return; }
        if (weg && o.tram && dist(this.eu, vorn) < 46 && !(this.eu.veh && this.eu.veh.tram)) return;
        const s = Math.min(o.v * dt, d); o.x += ux * s; o.y += uy * s; if (d - s < 1) o.i = (o.i + 1) % o.p.length;
        if (o.tram && !this.viajando) for (const [hx, hy] of o.paragens) if (Math.hypot(hx - o.x, hy - o.y) < o.v * dt * 0.6 + 0.5) { o.x = hx; o.y = hy; o.parado = 4.5; }
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
        this.tApitos = txt(18, 84, '', 26); this.tSterne = txt(W - 18, 14, '⭐ ' + this.sterne, 30).setOrigin(1, 0); this.tAzul = txt(W - 18, 52, '', 22).setOrigin(1, 0);
        // Tageslauf oben rechts: die Sonne wandert über den Balken (Morgen, Mittag, Abend) zum Mond; ist sie dort, ist der Tag vorbei
        if (!this.textures.exists('tagbalken')) { const ct = this.textures.createCanvas('tagbalken', 172, 22), c = ct.getContext(), gr = c.createLinearGradient(0, 0, 172, 0), rr = (x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
          [[0, '#ffd2a0'], [0.14, '#8fd3ff'], [0.5, '#8fd3ff'], [0.74, '#ffc04d'], [0.88, '#f0764f'], [1, '#2b3a80']].forEach(([p, f]) => gr.addColorStop(p, f)); c.fillStyle = gr; rr(0, 0, 172, 22, 11); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 4; rr(2, 2, 168, 18, 9); c.stroke(); ct.refresh(); }
        hud(this.add.image(W - 206, 104, 'tagbalken').setOrigin(0, 0.5).setDepth(9000)); this.tLua = hud(this.add.text(W - 22, 104, '🌙', { fontSize: '30px' }).setOrigin(0.5).setDepth(9001)); this.tSol = hud(this.add.text(W - 196, 104, '☀️', { fontSize: '34px' }).setOrigin(0.5).setDepth(9002));
        // Auftragskarte oben in der Mitte: Bild des Ziels, 🔊 = noch einmal hören
        const kb = hud(this.add.graphics().setDepth(9000)); kb.fillStyle(0xffffff, 0.96).fillRoundedRect(W / 2 - 150, 8, 300, 70, 18).lineStyle(4, 0xc9d4ee).strokeRoundedRect(W / 2 - 150, 8, 300, 70, 18);
        this.cartao = { kb, pic: hud(this.add.image(W / 2 - 110, 43, 'azulejo').setDepth(9001)), quem: hud(this.add.image(W / 2 + 112, 46, 'azulejo').setDepth(9001)), t: txt(W / 2, 43, '🔊', 20).setOrigin(0.5).setDepth(9001),
          z: hud(this.add.zone(W / 2, 43, 300, 70).setDepth(9002)).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.falarDeNovo()) };
        this.cartao.t.setWordWrapWidth(150).setAlign('center'); this.mostraCartao(null);
        // Pfeil zum Ziel und Marke über dem Ziel
        if (!this.textures.exists('seta')) { const g = this.make.graphics({ add: false }); g.fillStyle(0xff3b30).fillTriangle(36, 18, 4, 2, 4, 34).lineStyle(4, 0xffffff).strokeTriangle(36, 18, 4, 2, 4, 34); g.generateTexture('seta', 40, 36); g.destroy(); }
        this.seta = hud(this.add.image(0, 0, 'seta').setDepth(8500).setVisible(false)); this.alvo = this.add.text(0, 0, '⬇️', { fontSize: '34px' }).setOrigin(0.5, 1).setDepth(5001).setVisible(false);
        // Knöpfe unten rechts
        const knopf = (x, y, r, cor, fn) => { const c = hud(this.add.circle(x, y, r, cor).setStrokeStyle(5, 0xffffff).setDepth(9000)), t = hud(this.add.text(x, y, '', { fontSize: Math.round(r * 0.95) + 'px' }).setOrigin(0.5).setDepth(9001)); c.setInteractive({ useHandCursor: true }).on('pointerdown', fn); return { c, t, mostra(s) { c.setVisible(!!s); t.setVisible(!!s); if (s) t.setText(s); } }; };
        this.kAcao = knopf(W - 66, H - 66, 48, 0x2f9e4f, () => this.acao()); this.kBuzina = knopf(W - 66, H - 176, 36, 0xf2b01e, () => this.buzinar()); this.kRadio = knopf(W - 160, H - 50, 30, 0x7d3fc0, () => { this.sender = (this.sender + 1) % 4; this.tocarRadio(true); B.play(this, 'pop', { volume: 0.4 }); });
        // Ziele der Linie, in der man sitzt: Bild des Viertels antippen = dorthin fahren
        this.cartas = [0, 1, 2].map(() => { const c = this.add.container(W / 2, H - 80).setDepth(9100), g = this.add.graphics(), im = this.add.image(0, -8, 'azulejo'), t = this.add.text(0, 46, '', { fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#1b2440', align: 'center', wordWrap: { width: 124 } }).setOrigin(0.5), s = this.add.text(52, -56, '▶️', { fontSize: '24px' }).setOrigin(0.5);
          g.fillStyle(0xffffff, 0.97).fillRoundedRect(-66, -66, 132, 132, 20).lineStyle(6, 0xffc400).strokeRoundedRect(-66, -66, 132, 132, 20); c.add([g, im, t, s]); c.setSize(132, 132).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.viajar(c.b)); this.fixo(c); c.setVisible(false); c.im = im; c.t = t; c.b = null;
          this.tweens.add({ targets: c, scale: 1.06, duration: 520, yoyo: true, repeat: -1 }); return c; });
        // gelber Pfeil am Bildrand zur nächsten Haltestelle in ein anderes Viertel, mit dem Bild des Ziels (nur ohne laufenden Auftrag)
        if (!this.textures.exists('setaV')) { const g = this.make.graphics({ add: false }); g.fillStyle(0xffc400).fillTriangle(36, 18, 4, 2, 4, 34).lineStyle(4, 0xffffff).strokeTriangle(36, 18, 4, 2, 4, 34); g.generateTexture('setaV', 40, 36); g.destroy(); }
        this.guias = this.linhas.map(l => { const c = this.add.container(0, 0).setDepth(8400), s = this.add.image(0, 0, 'setaV'), g = this.add.graphics(), im = this.add.image(0, 0, this.tx(BAIRROS[l.para].pic)); g.fillStyle(0xffffff, 0.96).fillRoundedRect(-24, -24, 48, 48, 10).lineStyle(4, 0xffc400).strokeRoundedRect(-24, -24, 48, 48, 10);
          im.setScale(38 / Math.max(im.width, im.height)); const cx = this.add.container(0, 0, [g, im]); c.add([cx, s]); this.fixo(c); c.setVisible(false); return { l, c, s, cx }; });
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
        this.ultimo = [f, texto]; const b = this.balao, t = this.api.reader ? texto : '💬', ger = this.ger; this.balaoT.setText(t).setFontSize(this.api.reader ? 19 : 30); const w = this.balaoT.width + 26, h = this.balaoT.height + 18;
        this.balaoBg.clear().fillStyle(0xffffff, 0.97).fillRoundedRect(-w / 2, -h / 2, w, h, 14).lineStyle(3, 0xc9d4ee).strokeRoundedRect(-w / 2, -h / 2, w, h, 14).fillStyle(0xffffff).fillTriangle(-8, h / 2 - 1, 8, h / 2 - 1, 0, h / 2 + 12);
        // ger: nach dem Wechsel des Viertels gilt nichts mehr, was im alten noch gesprochen wurde
        this.balaoDe = f; b.setVisible(true); let fim = false; const next = () => { if (fim || ger !== this.ger) return; fim = true; if (this.falaFim === next) { this.falaFim = null; b.setVisible(false); } if (depois) depois(); }; this.falaFim = next;
        this.api.say(texto, { onend: () => { if (ger === this.ger) this.time.delayedCall(250, next); } }); this.time.delayedCall(Math.max(2600, texto.length * 95), next);
      }
      falarDeNovo() { if (this.m && this.m.frase) this.falar(this.np[this.m.def.p] || this.eu, this.m.frase); }

      /* ---------- Eingabe ---------- */
      eingabe() {
        this.dedo = null; this.destino = null;
        this.input.on('pointerdown', (p, sobre) => { if (sobre.length || !this.pronto || this.preso) return; this.dedo = { id: p.id, x0: p.x, y0: p.y, t0: this.time.now }; this.destino = null; });
        this.input.on('pointerup', p => { const d = this.dedo; if (!d || d.id !== p.id) return; this.dedo = null; if (this.time.now - d.t0 < 260 && Math.hypot(p.x - d.x0, p.y - d.y0) < 16) { const w = this.cameras.main.getWorldPoint(p.x, p.y), f = this.eu, wie = this.modo(f); if (f.veh && f.veh.tram) return; const r = this.caminho(f.x, f.y, w.x, w.y, wie); if (r) this.destino = r; } });
        this.input.on('pointerupoutside', () => { this.dedo = null; });
        const k = this.input.keyboard; if (k) { this.teclas = k.createCursorKeys(); k.on('keydown-SPACE', () => this.acao()); k.on('keydown-TAB', e => { e.preventDefault(); this.trocar(this.eu.id === 'ada' ? 'selma' : 'ada'); }); k.on('keydown-H', () => this.buzinar()); }
      }
      modo(f) { return !f.veh ? 'pe' : motor(f.veh) ? 'tuk' : f.veh.tipo === 'barco' ? 'barco' : 'pe'; }
      trocar(n) { if (!this.pronto || this.preso || this.eu.id === n) return; this.eu.mov = false; this.eu = this.irmas[n]; this.dedo = null; this.destino = null; B.play(this, 'whoosh', { volume: 0.4 }); this.tocarRadio(!!this.eu.veh && !this.eu.veh.tram && !semRadio(this.eu.veh)); }
      // was der grüne Knopf gerade tut: aussteigen, einsteigen (nächstes freies Fahrzeug) oder nichts
      oQue() { const f = this.eu; if (f.veh) return this.saida(f) ? ['🚪', () => this.sair(f)] : null;
        for (const v of this.transit) if (v.parado > 0 && dist(f, v) < (v.fixa && v.fixa.raio || 125)) return [v.funi ? v.fixa.e : '🚋', () => this.embarcar(f, v)];
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
        const vai = n => { if (this.pronto) return; this.eu = this.irmas[n]; o.destroy(); this.pronto = true; B.play(this, 'go', { volume: 0.5 }); this.falar(this.np.mama || this.eu, 'Bom dia! Divirtam-se!'); };
        ['ada', 'selma'].forEach((n, i) => { const x = W / 2 + (i ? 150 : -150), c = this.add.circle(x, 300, 112, 0xffffff).setStrokeStyle(8, i ? 0xff7fb0 : 0x2fb8c8), im = this.add.image(x, 320, this.tx('gast-' + n)); im.setScale(215 / im.width);
          const mk = this.make.graphics({ add: false }); mk.fillCircle(x, 300, 106); mk.setScrollFactor(0); im.setMask(mk.createGeometryMask()); c.setInteractive({ useHandCursor: true }).on('pointerdown', () => vai(n)); o.add([c, im]); this.tweens.add({ targets: c, scale: 1.05, duration: 650, yoyo: true, repeat: -1, delay: i * 300 }); });
        this.fixo(o); if (window.OLA_LISBOA_AUTO) this.time.delayedCall(400, () => vai('ada'));
      }

      /* ---------- von Viertel zu Viertel ---------- */
      // losfahren: das Fahrzeug fährt davon, das Bild wird dunkel, dann beginnt die Szene im anderen Viertel neu
      viajar(bid) {
        const f = this.eu, v = f.veh; if (this.viajando || this.over || !v || !v.tram || !BAIRROS[bid] || !v.para.includes(bid)) return;
        this.viajando = true; this.preso = true; this.dedo = null; this.destino = null; this.m = null; this.segue = null; this.levo = null; this.rival = null; this.mostraCartao(null);
        const outra = this.irmas[f.id === 'ada' ? 'selma' : 'ada']; outra.vis = false; // die Schwester fährt mit
        B.play(this, 'sino-eletrico', { volume: 0.5 }); this.falar(v, v.funi && v.fixa.id === 'lavra' ? (v.dir === 'u' ? 'Vamos subir!' : 'Vamos descer!') : `Próxima paragem: ${BAIRROS[bid].nome}!`);
        if (v.funi) this.tweens.add({ targets: v, x: v.fim[0], y: v.fim[1], duration: 2600, ease: 'Sine.in' }); else v.parado = 0;
        this.time.delayedCall(1500, () => this.cameras.main.fadeOut(800, 20, 30, 80));
        this.time.delayedCall(2400, () => { if (this.radio) this.radio.stop(); if (this.motor) this.motor.stop(); if (this.api.store) this.api.store.set(this.salvo);
          this.scene.restart({ b: bid, via: v.funi ? v.fixa.id : 'eletrico', st: { zeit: this.zeit, sterne: this.sterne, azul: this.azul, feito: this.feito, colh: this.colh, chamou: this.chamou, sender: this.sender, eu: f.id } }); });
      }
      chegar() { const cam = this.cameras.main, f = this.eu; cam.centerOn(f.x, f.y - 20); cam.fadeIn(600, 20, 30, 80); this.pronto = true; this.time.delayedCall(500, () => this.falar(this.eu, this.b.chegamos)); }

      /* ---------- Aufträge ---------- */
      // Schritte: { x,y (Ziel), raio, pic (Bild auf der Karte), frase, em: was dort passiert } oder { itens: mehrere Dinge in beliebiger Reihenfolge }
      comeca(a) {
        const v = a.var ? Phaser.Utils.Array.GetRandom(a.var) : null, dono = this.np[a.p], m = this.m = { def: a, v, passos: [], i: -1, frase: null }, ort = n => ({ x: px(ORTE[n][0]), y: px(ORTE[n][1]), pic: ORTE[n][2] || null });
        a.anel.setVisible(false); a.sinal.setVisible(false); B.play(this, 'star', { volume: 0.4 });
        const volta = { x: a.x, y: a.y, pic: 'gast-' + a.p, em: () => this.acaba(a.fim) };
        if (a.art === 'compras') { const frase = v[1] || a.ir, dito = v[1] ? [a.ir, v[1]] : [a.ir];
          m.passos = [{ ...ort(a.loja), pic: this.textures.exists('wp-' + v[0]) ? 'wp-' + v[0] : ort(a.loja).pic, frase, em: next => this.escolha(dono, frase, v[0], a.outras, next) }, { ...volta, levar: 'wp-' + v[0] }]; this.diz(dono, dito, () => this.passo()); }
        // etwas mitnehmen und hinbringen: erst das richtige Bild wählen, dann zum Ort (r = wer sich dort bedankt)
        else if (a.art === 'levar') { m.passos = [{ ...ort(a.para), frase: v[1], levar: 'wp-' + v[0], em: () => this.acaba(a.fim, this.np[a.r]) }]; this.diz(dono, [v[1]], () => this.escolha(dono, v[1], v[0], a.outras, () => this.passo())); }
        else if (a.art === 'foto') { m.passos = [{ ...ort(v[0]), frase: v[1], em: () => { this.flash(); this.time.delayedCall(700, () => this.acaba(a.fim)); } }]; this.diz(dono, [v[1]], () => this.passo()); }
        else if (a.art === 'taxi') { this.segue = dono; m.passos = [{ ...ort(v[0]), frase: v[1], em: () => this.acaba(a.fim) }]; this.diz(dono, [v[1]], () => this.passo()); }
        // suchen und zurückbringen: ein Tier (fig, läuft danach mit) oder ein Ding (coisa, liegt als Marke am Ort)
        else if (a.art === 'buscar') { const p = ort(v[0]), frase = v[1] || a.ir, achou = next => { if (a.som) B.play(this, a.som, { volume: 0.7 }); this.falar(this.eu, a.achei, next); };
          if (a.fig) { const bf = this.bichoDe(a.fig); bf.preso = true; bf.ziel = null; bf.mov = false; bf.rota = null; bf.x = p.x; bf.y = p.y; bf.vis = true; m.passos = [{ ...p, pic: p.pic || bf.k, raio: 62, frase, em: next => { this.segue = bf; achou(next); } }, volta]; }
          else { const mc = m.marca = this.marca(p.x, p.y - 22, a.coisa); m.passos = [{ ...p, pic: p.pic || a.coisa, raio: 62, frase, em: next => { mc.destroy(); B.play(this, 'collect', { volume: 0.6 }); achou(next); } }, { ...volta, levar: a.coisa }]; }
          this.diz(dono, v[1] ? [a.ir, v[1]] : [a.ir], () => this.passo()); }
        // mehrere Dinge einsammeln (Wäsche) oder Tiere einfangen (figs): Reihenfolge egal, der Pfeil zeigt zum nächsten
        else if (a.art === 'juntar') { const sitios = baralha(a.onde); let itens;
          if (a.figs) itens = a.figs.map((tipo, i) => { const f = this.bichos.find(x => x.tipo === tipo && !x.preso); if (!f) return null; f.preso = true; f.ziel = null; f.mov = false; f.rota = null; f.x = px(sitios[i][0]); f.y = px(sitios[i][1]); return { x: f.x, y: f.y, pic: f.k, w: a.nomes[i], som: 'animal-' + tipo, f }; }).filter(Boolean);
          else itens = baralha(a.itens.filter(w => this.textures.exists('wp-' + w))).slice(0, a.n).map((w, i) => { const x = px(sitios[i][0]), y = px(sitios[i][1]); return { x, y, pic: 'wp-' + w, w, marca: this.marca(x, y - 22, 'wp-' + w) }; });
          m.passos = [{ itens, frase: a.ir, raio: 56 }, { ...volta, levar: a.figs || !itens.length ? null : itens[0].pic }]; this.diz(dono, [a.ir], () => this.passo()); }
        else if (a.art === 'placas') { const tres = baralha(a.var).slice(0, 3); m.passos = tres.map(([n, frase], i) => ({ ...ort(n), pic: null, semSeta: true, frase, em: next => { B.play(this, 'collect', { volume: 0.6 }); B.plus(this, this.eu.x, this.eu.y - 90, '✨', '#ffb300'); if (i < 2) next(); else { this.pondi.x = this.eu.x + 60; this.pondi.y = this.eu.y + 10; this.pondi.vis = true; B.play(this, 'pondi-happy', { volume: 0.6 }); this.acaba(a.fim, this.eu); this.time.delayedCall(5000, () => { this.pondi.vis = false; }); } } })); this.diz(dono, [a.ir], () => this.passo()); }
        else if (a.art === 'corrida') { const z = ort(a.meta); m.passos = [{ ...z, raio: 90, frase: a.ir, em: () => { if (m.fim) return; m.fim = true; this.rival = null; this.acaba(a.ganhou); } }]; const leo = dono; leo.casa = [leo.x, leo.y];
          this.diz(dono, [a.ir, a.vai], () => { B.play(this, 'go', { volume: 0.6 }); this.passo(); this.rival = { f: leo, x: z.x + 60, y: z.y, v: LEO }; }); }
      }
      diz(f, frases, depois) { const [a, ...resto] = frases; this.falar(f, a, () => resto.length ? this.diz(f, resto, depois) : depois && depois()); }
      // wohin es in diesem Schritt geht: der Ort oder, bei mehreren Dingen, das nächste, das noch fehlt
      alvoDe(p) { if (!p || !p.itens) return p; let best = null; for (const it of p.itens) if (!it.ok) { const d = Math.hypot(it.x - this.eu.x, it.y - this.eu.y); if (!best || d < best[0]) best = [d, it]; } return best ? best[1] : null; }
      passo() { const m = this.m; if (!m) return; m.i++; const p = m.passos[m.i]; if (!p) return; m.frase = p.frase || m.frase; this.levo = p.levar && this.textures.exists(p.levar) ? p.levar : null; const z = this.alvoDe(p); this.mostraCartao(this.levo || (z && z.pic), 'gast-' + m.def.p, m.frase); if (p.frase && m.i > 0 && m.def.art === 'placas') this.falar(this.np[m.def.p], p.frase); }
      chegou() { const m = this.m, p = m.passos[m.i]; if (!p || p.ocupado) return; p.ocupado = true; p.em(() => { p.ocupado = false; this.passo(); }); }
      // eines von mehreren Dingen ist erreicht: es wird genannt; Tiere laufen von da an hinterher
      apanha(p, it) { it.ok = true; if (it.marca) it.marca.destroy(); if (it.f) { this.bando.push(it.f); B.play(this, it.som, { volume: 0.7 }); } B.play(this, 'collect', { volume: 0.6 }); B.plus(this, it.x, it.y - 70, '✨', '#ffb300'); this.api.say(it.w);
        const z = this.alvoDe(p); if (!it.f) this.levo = it.pic; if (z) this.mostraCartao(z.pic, 'gast-' + this.m.def.p, this.m.frase); else { p.ocupado = true; this.time.delayedCall(900, () => { if (this.m && this.m.passos[this.m.i] === p) this.passo(); }); } }
      acaba(frase, quem) {
        const m = this.m, a = m.def; this.m = null; this.mostraCartao(null); this.feito[a.chave] = true;
        // die Sache, die man dabeihat, wandert zum Auftraggeber
        if (this.levo) { const d = quem && quem !== this.eu ? quem : this.np[a.p], b = this.add.image(this.carga.x, this.carga.y, this.levo).setDepth(5600); b.setScale(44 / Math.max(b.width, b.height)); this.tweens.add({ targets: b, x: d.x, y: d.y - d.alt * 0.6, scale: b.scale * 0.5, duration: 500, onComplete: () => b.destroy() }); this.levo = null; }
        this.sterne++; this.salvo.st++; this.salvo.m[a.chave] = (this.salvo.m[a.chave] || 0) + 1; if (this.api.store) this.api.store.set(this.salvo);
        B.play(this, 'win', { volume: 0.5 }); B.plus(this, this.eu.x, this.eu.y - 100, '⭐', '#ffb300'); this.tSterne.setText('⭐ ' + this.sterne); this.tweens.add({ targets: this.tSterne, scale: 1.4, duration: 160, yoyo: true });
        this.add.particles(this.eu.x, this.eu.y - 60, 'star', { speed: { min: 80, max: 220 }, lifespan: 900, quantity: 14, scale: { start: 1, end: 0 }, emitting: false }).setDepth(5500).explode(14);
        // wer mitlief, geht wieder an seinen Platz
        const seg = this.segue; this.segue = null; if (seg && seg !== this.np[a.p]) this.time.delayedCall(2500, () => { seg.preso = false; seg.dentro = false; if (seg.casa) { seg.x = seg.casa[0]; seg.y = seg.casa[1]; seg.vis = true; } else seg.vis = false; });
        this.bando.forEach(t => { t.preso = false; t.dentro = false; t.ziel = [t.casa[0], t.casa[1]]; t.warte = 0; }); this.bando = [];
        if (a.art === 'taxi') { const r = this.np[a.p]; this.time.delayedCall(4000, () => { r.x = a.o[0] * T; r.y = a.o[1] * T; r.dentro = false; }); }
        this.falar(quem || this.np[a.p], frase);
        // alle im Viertel erledigt: dort geht es von vorn los
        this.time.delayedCall(6000, () => { if (AUFTRAEGE.every(x => this.feito[x.chave])) AUFTRAEGE.forEach(x => { delete this.feito[x.chave]; }); });
      }
      // drei Bildkarten: welche ist gemeint?
      escolha(dono, frase, certo, outras, next) {
        this.preso = true; this.dedo = null; this.destino = null; const o = this.add.container(0, 0).setScrollFactor(0).setDepth(9500); o.add(this.add.rectangle(0, 0, W, H, 0x0f1f4d, 0.5).setOrigin(0).setInteractive());
        const op = Phaser.Utils.Array.Shuffle([certo, ...Phaser.Utils.Array.Shuffle(outras.filter(w => this.textures.exists('wp-' + w))).slice(0, 2)]);
        const quem = this.add.image(W / 2 - 60, 96, this.tx('gast-' + dono.id)), qs = quem.setScale(120 / Math.max(quem.width, quem.height)), som = this.add.text(W / 2 + 30, 92, this.api.reader ? frase : '🔊', { fontFamily: 'sans-serif', fontSize: this.api.reader ? '26px' : '50px', fontStyle: 'bold', color: '#ffffff', stroke: '#1b4fa0', strokeThickness: 6 }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.api.say(frase)); o.add([quem, som]);
        op.forEach((w, i) => { const c = this.add.container(W / 2 + (i - (op.length - 1) / 2) * 220, 320), g = this.add.graphics(); g.fillStyle(0xffffff).fillRoundedRect(-92, -92, 184, 184, 22).lineStyle(6, 0xc9d4ee).strokeRoundedRect(-92, -92, 184, 184, 22); const im = this.add.image(0, 0, this.tx('wp-' + w)); im.setScale(150 / Math.max(im.width, im.height)); c.add([g, im]); c.setSize(184, 184).setInteractive({ useHandCursor: true }).setData('w', w);
          c.on('pointerdown', () => { if (w === certo) { B.play(this, 'collect', { volume: 0.6 }); this.tweens.add({ targets: c, scale: 1.2, duration: 200, yoyo: true, onComplete: () => { o.destroy(); this.preso = false; next(); } }); } else { B.play(this, 'honk', { volume: 0.4 }); this.tweens.add({ targets: c, x: c.x + 10, duration: 60, yoyo: true, repeat: 3 }); this.api.say(frase); } }); o.add(c); if (window.OLA_LISBOA_AUTO && w === certo) this.time.delayedCall(900, () => c.emit('pointerdown')); });
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
        const dt = Math.min(0.05, delta / 1000), cam = this.cameras.main, f = this.eu; this.aguas.forEach(a => { a.tilePositionX += dt * 14; }); this.nevoas.forEach(a => { a.tilePositionX += dt * 5; a.tilePositionY += dt * 1.2; });
        if (this.pronto && !this.over) { this.zeit += dt; if (this.semCulpa > 0) this.semCulpa -= dt; this.controla(f, dt); this.outros(dt); this.policia(dt); this.missao(dt); this.dia(); }
        // alles zeichnen
        const o = this.irmas; [o.ada, o.selma].forEach(s => { const v = s.veh; s.dy = 0; s.dz = 0; s.escala = 1; if (v && !v.tram) { s.x = v.x; s.y = v.y; s.dir = v.dir; if (v.tipo === 'skate') { s.dy = -6; s.dz = 1; } else if (v.tipo === 'tuk') { s.dy = -36; s.dz = -1; s.escala = 0.6; } else if (v.tipo === 'mota') { s.dy = -24; s.dz = 1; s.escala = 0.8; } else if (v.tipo === 'bici') { s.dy = -20; s.dz = 1; s.escala = 0.85; } else if (v.tipo === 'barco') { s.dy = -26; s.dz = -2; s.escala = 0.9; } } });
        this.transit.forEach(c => c.gente.forEach(g => { g.x = c.x; g.y = c.y; }));
        this.veics.forEach(v => this.malVeic(v)); this.ents.forEach(e => this.malFig(e, time));
        this.carros.forEach(c => { const n = c.dir === 'd' ? 2 : c.dir === 'u' ? 3 : 1, q = c.tram && c.gente[0], base = q && this.textures.exists(`${c.k}-${q.id}-1`) ? `${c.k}-${q.id}` : c.k, k = this.tx(`${base}-${n}`); if (c.im.texture.key !== k) c.im.setTexture(this.textures.exists(`${base}-${n}`) ? k : this.tx(c.tram ? 'eletrico' : 'tram-carro')); c.im.setScale(c.s / Math.max(c.im.width, 1) * (c.im.width === 256 ? 1 : 0.9)).setFlipX(c.dir === 'l').setPosition(c.x, c.y + 14).setDepth(1000 + c.y + 14); });
        // was vor der Figur steht (Haus, Baum, Bogen), wird durchscheinend
        const fx = f.x, fy = f.y - 30, sicht = !f.dentro; this.altos.forEach(a => { const z = sicht && fx > a.x0 && fx < a.x1 && fy > a.y0 && f.y < a.y1 ? 0.4 : 1; if (a.im.alpha !== z) a.im.setAlpha(a.im.alpha + (z - a.im.alpha) * Math.min(1, dt * 10) || z); if (Math.abs(a.im.alpha - z) < 0.03) a.im.setAlpha(z); });
        if (this.balao.visible && this.balaoDe) this.balao.setPosition(Phaser.Math.Clamp(this.balaoDe.x, cam.scrollX + 130, cam.scrollX + W - 130), Math.max(cam.scrollY + 110, this.balaoDe.y - (this.balaoDe.alt || 80) - 46));
        // Kamera folgt weich
        const tx = Phaser.Math.Clamp(f.x - W / 2, 0, WW - W), ty = Phaser.Math.Clamp(f.y - H / 2 - 20, 0, WH - H), k = this.pronto ? Math.min(1, dt * 6) : 1; cam.scrollX += (tx - cam.scrollX) * k; cam.scrollY += (ty - cam.scrollY) * k;
        const sg = this.segue, kc = this.levo || (sg && sg.dentro ? (this.textures.exists('gast-' + sg.id) ? 'gast-' + sg.id : sg.k) : null); this.carga.setVisible(!!kc && this.pronto);
        if (kc) { if (this.cargaIm.texture.key !== kc) { this.cargaIm.setTexture(this.tx(kc)); this.cargaIm.setScale(40 / Math.max(this.cargaIm.width, this.cargaIm.height)); } const v = f.veh; this.carga.setPosition(f.x, f.y - (v ? (v.tram ? 150 : v.tipo === 'skate' ? f.alt + 60 : 130) : f.alt + 36) + Math.sin(time / 200) * 4); }
        this.hud(time);
      }
      controla(f, dt) {
        if (this.preso) { f.mov = false; return; } const v = f.veh; if (v && v.tram) return;
        const wie = this.modo(f), d = v ? FAHR[v.tipo] : null, chao = this.em(Math.floor(f.x / T), Math.floor(f.y / T)); let vmax = v ? d.v : 195; if (v && v.tipo !== 'barco' && (chao === GR || chao === SA || chao === FL || chao === PT || chao === ES)) vmax *= 0.55; else if (motor(v) && (chao === PV || chao === CL || chao === TE)) vmax *= 0.8;
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
        // Kacheln einsammeln (was man hat, bleibt für den Rest des Tages weg, auch wenn man wiederkommt)
        this.azulejos = this.azulejos.filter(z => { if (Math.hypot(z.x - alvo.x, z.y - alvo.y + 10) > 40) return true; this.tweens.killTweensOf(z.im); this.tweens.add({ targets: z.im, y: z.y - 80, alpha: 0, scale: 2, duration: 400, onComplete: () => z.im.destroy() }); B.play(this, 'collect', { volume: 0.45 }); this.azul++; this.salvo.az++; (this.colh[this.bid] = this.colh[this.bid] || []).push(z.i); return false; });
      }
      // alle anderen: Autos, Elétrico, Spaziergänger, Tiere, Begleiter, Wettlauf, Beete wachsen nach
      outros(dt) {
        this.carros.forEach(c => this.andaCarro(c, dt));
        const orte = this.b.passeio || [];
        this.gente.forEach(g => { if ((g.warte -= dt) > 0) { g.mov = false; return; } if (!g.ziel) { const n = Phaser.Utils.Array.GetRandom(orte); if (!n) { g.warte = 5; return; } g.ziel = [px(ORTE[n][0]) + rnd(-40, 40), px(ORTE[n][1]) + rnd(0, 30)]; } if (this.andar(g, g.ziel[0], g.ziel[1], 62, dt, 30)) { g.ziel = null; g.warte = rnd(2, 6); } });
        // Tiere: im Revier umherlaufen; wer zu einem Auftrag gehört (preso), wartet oder läuft in der Reihe hinterher
        this.bichos.forEach(a => { if (a.preso) return; if ((a.warte -= dt) > 0) { a.mov = false; return; } if (!a.ziel) { const [x, y, w, h] = a.area; for (let i = 0; i < 6 && !a.ziel; i++) { const zx = px(x + Math.random() * w), zy = px(y + Math.random() * h); if (this.livre(zx, zy, 'pe')) a.ziel = [zx, zy]; } if (!a.ziel) { a.warte = 2; return; } } if (this.andar(a, a.ziel[0], a.ziel[1], 50, dt, 16)) { a.ziel = null; a.warte = rnd(1, 5); } });
        const s = this.segue, f = this.eu;
        this.bando.forEach((a, i) => { const alvo = i ? this.bando[i - 1] : f; if (dist(a, alvo) > 520) { a.x = alvo.x - 30; a.y = alvo.y + 6; a.rota = null; } this.andar(a, alvo.x, alvo.y + 4, f.veh ? 420 : 230, dt, 50); });
        if (s) { if (f.veh) { s.dentro = !!f.veh.tram || !semRadio(f.veh); if (s.dentro) { s.x = f.x; s.y = f.y; } else this.andar(s, f.x, f.y + 4, 320, dt, 60); } else { if (s.dentro) { s.dentro = false; s.x = f.x - 30; s.y = f.y + 6; if (!this.livre(s.x, s.y, 'pe')) s.x = f.x + 30; } if (dist(s, f) > 400) { s.x = f.x - 40; s.y = f.y; } this.andar(s, f.x, f.y + 4, 215, dt, 58); } }
        const r = this.rival; if (r && this.m && !this.m.fim) { if (this.andar(r.f, r.x, r.y, r.v, dt, 40)) { this.m.fim = true; this.rival = null; const a = this.m.def; this.m = null; this.levo = null; this.mostraCartao(null); B.play(this, 'lose', { volume: 0.4 }); this.falar(r.f, a.perdeu); this.time.delayedCall(5000, () => { r.f.x = r.f.casa[0]; r.f.y = r.f.casa[1]; r.f.dir = 'd'; }); } }
        else if (this.np.leo && this.np.leo.casa && !this.rival && !this.m && dist(this.np.leo, { x: this.np.leo.casa[0], y: this.np.leo.casa[1] }) > 60 && !this.leoVolta) { this.leoVolta = true; this.time.delayedCall(4000, () => { const l = this.np.leo; l.x = l.casa[0]; l.y = l.casa[1]; l.dir = 'd'; l.mov = false; this.leoVolta = false; }); }
        this.beete.forEach(b => { if (b.platt > 0 && (b.platt -= dt) <= 0) { b.ims.forEach(im => { im.clearTint(); im.setDisplaySize(b.w + 6, (b.w + 6) * im.height / im.width); }); } });
        this.pombos.forEach(p => { if (p.weg > 0 && (p.weg -= dt) <= 0) p.im.setVisible(true); });
      }
      missao(dt) {
        const f = this.eu; if (this.preso) return; const auto = window.OLA_LISBOA_AUTO;
        if (!this.m) { if (!(f.veh && f.veh.tram)) for (const a of AUFTRAEGE) { const frei = !this.feito[a.chave]; a.anel.setVisible(frei); a.sinal.setVisible(frei); if (frei && Math.hypot(a.x - f.x, a.y - f.y) < 44) { this.comeca(a); break; } } if (!this.m && auto) this.auto(dt); return; }
        AUFTRAEGE.forEach(a => { a.anel.setVisible(false); a.sinal.setVisible(false); });
        const p = this.m.passos[this.m.i]; if (!p) return;
        if (p.itens) { if (!p.ocupado) for (const it of p.itens) if (!it.ok && Math.hypot(it.x - f.x, it.y - f.y) < (p.raio || 56)) { this.apanha(p, it); break; } if (auto && !p.ocupado) this.auto(dt); return; }
        if (Math.hypot(p.x - f.x, p.y - f.y) < (p.raio || 74)) this.chegou(); else if (auto) this.auto(dt);
      }
      // Testfahrt: läuft von selbst zum nächsten Auftrag bzw. zum Ziel; übers Wasser mit dem Boot; OLA_LISBOA_VIAGEM = in dieses Viertel fahren
      auto(dt) {
        const f = this.eu, quer = window.OLA_LISBOA_VIAGEM; let z = null;
        if (quer && quer !== this.bid && !this.m) { const t = this.transit.find(c => c.para.includes(quer)); if (t) { if (f.veh && f.veh.tram && f.veh.para.includes(quer)) { if (!this.viajando) this.viajar(quer); return; } if (f.veh) { if (this.saida(f)) this.sair(f); return; }
          const cg = t.funi ? this.b.chega[t.fixa.id].map(px) : null, dg = cg ? Math.hypot(cg[0] - t.x, cg[1] - t.y) || 1 : 1, rg = cg ? Math.min(dg, (t.fixa.raio || 125) - 45) : 0, par = t.funi ? [t.x + (cg[0] - t.x) / dg * rg, t.y + (cg[1] - t.y) / dg * rg] : t.paragens.map(([x, y]) => [x, y + 84]).sort((a, c) => Math.hypot(a[0] - f.x, a[1] - f.y) - Math.hypot(c[0] - f.x, c[1] - f.y))[0];
          const perto = this.transit.find(c => c.para.includes(quer) && c.parado > 0 && dist(f, c) < (c.fixa && c.fixa.raio || 125)); if (perto) return this.embarcar(f, perto); if (!this.destino && Math.hypot(par[0] - f.x, par[1] - f.y) > 30) this.destino = this.caminho(f.x, f.y, par[0], par[1], 'pe'); return; } }
        if (this.m) { const p = this.m.passos[this.m.i]; if (p && !p.ocupado) z = this.alvoDe(p); } else { let best = null; for (const a of AUFTRAEGE) if (!this.feito[a.chave]) { const d = Math.hypot(a.x - f.x, a.y - f.y); if (!best || d < best[0]) best = [d, a]; } z = best && best[1]; }
        if (!z || this.destino) return;
        if (f.veh && f.veh.tram) { if (this.saida(f)) this.sair(f); return; }
        if (f.veh && f.veh.tipo === 'barco') { if (Math.hypot(z.x - f.x, z.y - f.y) < 190 && this.saida(f)) return this.sair(f); const v = f.veh; let r = this.caminho(f.x, f.y, z.x, z.y, 'barco'); if (!r) { if (Math.hypot(v.casa[0] - f.x, v.casa[1] - f.y) < 50 && this.saida(f)) return this.sair(f); r = this.caminho(f.x, f.y, v.casa[0], v.casa[1], 'barco'); } this.destino = r; return; }
        const r = this.caminho(f.x, f.y, z.x, z.y, this.modo(f)), la = r && r.length ? r[r.length - 1] : [f.x, f.y];
        if (!r || Math.hypot(la[0] - z.x, la[1] - z.y) > 110) { if (f.veh) { if (this.saida(f)) this.sair(f); return; } const bo = this.veics.filter(v => v.tipo === 'barco' && !v.quem).sort((a, c) => dist(a, f) - dist(c, f)).find(v => dist(v, f) < 120 || this.caminho(f.x, f.y, v.x, v.y, 'pe')); if (!bo) return; if (dist(bo, f) < 120) return this.entrar(f, bo); this.destino = this.caminho(f.x, f.y, bo.x, bo.y, 'pe'); return; }
        this.destino = r;
      }
      // Tageszeit: gegen Abend wird das Licht warm, dann ruft Mama; am Ende ist die Runde vorbei
      dia() { const t = Math.min(1, this.zeit / TAG);
        // Licht über den Tag: [Zeit, Rot, Grün, Blau, Deckkraft], dazwischen fließend: Morgenrot, heller Mittag, ab der Tagesmitte wärmer, Abendrot, Dämmerung
        const L = [[0, 255, 196, 150, 0.2], [0.1, 255, 196, 150, 0], [0.45, 255, 160, 60, 0], [0.75, 255, 150, 50, 0.24], [0.88, 235, 110, 70, 0.3], [1, 35, 48, 110, 0.48]]; let i = 0; while (i < L.length - 2 && t > L[i + 1][0]) i++;
        const a = L[i], b = L[i + 1], k = Phaser.Math.Clamp((t - a[0]) / (b[0] - a[0]), 0, 1), mix = n => a[n] + (b[n] - a[n]) * k; this.luz.setFillStyle((Math.round(mix(1)) << 16) | (Math.round(mix(2)) << 8) | Math.round(mix(3)), mix(4));
        if (t > 0.88 && !this.chamou && !this.viajando) { this.chamou = true; this.falar(this.eu, 'O jantar está pronto! Venham para casa!'); }
        if (t >= 1 && !this.over && !this.viajando) { this.over = true; this.pronto = false; if (this.radio) this.radio.stop(); if (this.motor) this.motor.stop(); if (this.api.store) this.api.store.set(this.salvo); this.cameras.main.fadeOut(900, 20, 30, 80); this.time.delayedCall(1000, () => this.api.end({ score: `⭐ ${this.sterne}  🟦 ${this.azul}` })); } }
      hud(time) {
        const f = this.eu, cam = this.cameras.main; this.retratos.forEach(r => { const eu = r.n === f.id; r.c.setStrokeStyle(eu ? 7 : 4, eu ? 0xffc400 : 0xc9d4ee).setScale(eu ? 1 : 0.82); r.im.setAlpha(eu ? 1 : 0.75); });
        this.tApitos.setText('🚨'.repeat(this.apitos)); this.tAzul.setText('🟦 ' + this.azul); const tg = Math.min(1, this.zeit / TAG); this.tSol.setPosition(W - 196 + tg * 150, 104 - Math.sin(tg * Math.PI) * 5); this.tLua.setScale(tg > 0.86 ? 1.15 + Math.sin(time / 160) * 0.2 : 1); // gegen Abend wackelt der Mond: gleich ist Schluss
        const a = this.pronto && !this.preso ? this.oQue() : null; this.kAcao.mostra(a && a[0]); const tuk = this.pronto && motor(f.veh); this.kBuzina.mostra(tuk ? '📣' : null); this.kRadio.mostra(this.pronto && f.veh && !semRadio(f.veh) && !f.veh.tram ? ['🔇', '🎵', '🎶', '🎸'][this.sender] : null);
        // wer in Elétrico oder Standseilbahn sitzt, sieht unten die Viertel, in die die Linie fährt
        const linha = this.pronto && !this.viajando && !this.preso && f.veh && f.veh.tram ? f.veh.para : [];
        this.cartas.forEach((c, i) => { const bid = linha[i]; c.setVisible(!!bid); if (!bid) return; if (c.b !== bid) { c.b = bid; const bb = BAIRROS[bid]; c.im.setTexture(this.tx(bb.pic)); c.im.setScale((this.api.reader ? 84 : 104) / Math.max(c.im.width, c.im.height)); c.im.y = this.api.reader ? -14 : 0; c.t.setText(this.api.reader ? bb.nome : ''); } c.x = W / 2 + (i - (linha.length - 1) / 2) * 150; });
        // Pfeil am Bildrand zum Ziel
        const p = this.m && this.m.passos[this.m.i], z = p && !p.semSeta ? this.alvoDe(p) : null; this.seta.setVisible(false); this.alvo.setVisible(false);
        if (z) { const sx = z.x - cam.scrollX, sy = z.y - cam.scrollY; if (sx > 30 && sx < W - 30 && sy > 100 && sy < H - 20) this.alvo.setVisible(true).setPosition(z.x, z.y - 86 + Math.sin(time / 180) * 8); else { const ang = Math.atan2(sy - H / 2, sx - W / 2); this.seta.setVisible(true).setRotation(ang).setPosition(Phaser.Math.Clamp(W / 2 + Math.cos(ang) * 400, 40, W - 40), Phaser.Math.Clamp(H / 2 + Math.sin(ang) * 220, 110, H - 40)); } }
        // Wegweiser in die anderen Viertel: gelber Pfeil zur nächsten Haltestelle der Linie, solange sie nicht im Bild ist
        this.guias.forEach(gu => { let best = null; for (const [x, y] of gu.l.pontos) { const d = Math.hypot(x - f.x, y - f.y); if (!best || d < best[0]) best = [d, x, y]; }
          const sx = best[1] - cam.scrollX, sy = best[2] - cam.scrollY, an = this.pronto && !this.m && !this.preso && !(f.veh && f.veh.tram) && (sx < 30 || sx > W - 30 || sy < 150 || sy > H - 10); gu.c.setVisible(an); if (!an) return;
          const ang = Math.atan2(sy - H / 2, sx - W / 2); let gx = Phaser.Math.Clamp(W / 2 + Math.cos(ang) * 410, 64, W - 64), gy = Phaser.Math.Clamp(H / 2 + Math.sin(ang) * 215, 160, H - 64); if (gx < 215 && gy > H - 150) gy = H - 150; if (gx > W - 215 && gy > H - 230) gx = W - 215; // nicht über Karte und Knöpfe
          gu.c.setPosition(gx, gy); gu.s.setRotation(ang).setScale(1 + Math.sin(time / 220) * 0.08); gu.cx.setPosition(-Math.cos(ang) * 44, -Math.sin(ang) * 44); });
        // Punkte auf der kleinen Karte
        const g = this.pontos, mx = x => 18 + x / T * 2, my = y => H - 18 - ROWS * 2 + y / T * 2; g.clear();
        this.linhas.forEach(l => l.pontos.forEach(([x, y]) => g.fillStyle(0xffc400).fillRect(mx(x) - 3.5, my(y) - 3.5, 7, 7).lineStyle(1.5, 0x5a4300).strokeRect(mx(x) - 3.5, my(y) - 3.5, 7, 7)));
        if (!this.m) AUFTRAEGE.forEach(q => { if (!this.feito[q.chave]) g.fillStyle(0xffc400).fillCircle(mx(q.x), my(q.y), 3.2).lineStyle(1, 0x000000).strokeCircle(mx(q.x), my(q.y), 3.2); });
        if (z && Math.floor(time / 300) % 2) g.fillStyle(0xff3b30).fillCircle(mx(z.x), my(z.y), 4.5);
        this.veics.forEach(v => { if (!v.quem) g.fillStyle(v.tipo === 'barco' ? 0x0b3f8f : semRadio(v) ? 0x12b8b0 : 0x333333).fillRect(mx(v.x) - 1.5, my(v.y) - 1.5, 3, 3); });
        this.transit.forEach(t => { if (t.x > 0 && t.x < WW && t.y > 0 && t.y < WH) g.fillStyle(0xf2c230).fillRect(mx(t.x) - 3, my(t.y) - 2, 6, 4).lineStyle(1, 0x7a5b00).strokeRect(mx(t.x) - 3, my(t.y) - 2, 6, 4); }); if (this.pol.on) g.fillStyle(0x1b3fa0).fillCircle(mx(this.pol.x), my(this.pol.y), 3.5);
        [this.irmas.ada, this.irmas.selma].forEach(s => g.fillStyle(s === f ? 0xffffff : 0xdddddd).fillCircle(mx(s.x), my(s.y), s === f ? 4.5 : 3).lineStyle(2, s.id === 'ada' ? 0x2fb8c8 : 0xff5fa0).strokeCircle(mx(s.x), my(s.y), s === f ? 4.5 : 3));
      }
    };
  }
})();
