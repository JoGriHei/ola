// Gemeinsame Grundlage für die Phaser-Spiele (Phaser liegt lokal in vendor/phaser.min.js).
// OLA_PHASER.run(el, api, makeScene, { gravity, bg }) baut eine 16:9-Fläche, lädt Phaser und startet die Szene.
// makeScene(Phaser) liefert die Szenen-Klasse (erst nach dem Laden von Phaser verfügbar).
// Die Szene bekommt api über this.registry.get('api'). Rückgabe: Funktion zum Beenden.
(() => {
  if (window.OLA_PHASER) return; // nie doppelt laden (schneller Tipp auf eine Figur): sonst verliert das Wecken den Ton-Kontext
  const load = () => window.Phaser ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'vendor/phaser.min.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });

  // Ton aufs iPad: Web Audio folgt sonst dem Lautlos-Schalter (HTML-Audio nicht), "playback" spielt trotzdem (Safari 16.4+).
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  // Ein gemeinsamer AudioContext für alle Spiele; jede Berührung weckt ihn, falls Safari ihn angehalten hat.
  const wake = () => { const c = window.OLA_PHASER && window.OLA_PHASER._ctx; if (c && c.state !== 'running' && c.state !== 'closed') c.resume().catch(() => {}); };
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, wake, true));
  // Auch ohne Berührung wecken (Lenken durch Neigen): nach einer Systemabfrage oder wenn die App wieder nach vorn kommt
  window.addEventListener('focus', wake); window.addEventListener('pageshow', wake);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });

  const B = window.OLA_PHASER = {
    W: 960, H: 540,
    audioCtx() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return undefined;
      if (!B._ctx || B._ctx.state === 'closed') B._ctx = new AC();
      wake();
      return B._ctx;
    },
    sprite: (api, id) => api.sprite(id) || `bilder/spiele/${id}.webp`,
    sfx: id => `audio/sfx/${id}.mp3`,

    run(el, api, makeScene, opt = {}) {
      let game = null, alive = true;
      const h = Math.min(window.innerHeight * 0.74, el.clientWidth * 9 / 16), w = h * 16 / 9;
      el.innerHTML = `<div class="ph-game" style="width:${w}px;height:${h}px;margin:0 auto;border-radius:16px;overflow:hidden;touch-action:none"></div>`;
      load().then(() => {
        if (!alive) return;
        const P = window.Phaser;
        game = new P.Game({
          type: window.OLA_PHASER_CANVAS ? P.CANVAS : P.AUTO, // CANVAS nur für automatische Tests
          parent: el.querySelector('.ph-game'), backgroundColor: opt.bg || '#bfe3ff',
          scale: { mode: P.Scale.FIT, autoCenter: P.Scale.CENTER_BOTH, width: B.W, height: B.H },
          physics: { default: 'arcade', arcade: { gravity: { y: opt.gravity || 0 }, debug: false } },
          input: { activePointers: 3 },
          audio: window.OLA_PHASER_CANVAS ? { noAudio: true } : { context: B.audioCtx() }, // Tests ohne Ton; sonst gemeinsamer AudioContext
          fps: { forceSetTimeOut: !!window.OLA_PHASER_CANVAS, target: 60 }, // Tests: Zeitschleife ohne requestAnimationFrame
          scene: makeScene(P),
        });
        game.registry.set('api', api);
      }).catch(() => { el.innerHTML = '<p class="ask">⚠️</p>'; });
      // solange ein Spiel läuft, jede Sekunde nachsehen, ob der Ton angehalten wurde
      const guard = setInterval(() => { if (document.visibilityState === 'visible') wake(); }, 1000);
      return () => { alive = false; clearInterval(guard); if (game) game.destroy(true); };
    },

    // Hintergrund ohne Kante: Bild und Spiegelbild nebeneinander als eine Kachel
    seamless(scene, key, newKey) {
      const img = scene.textures.get(key).getSourceImage(), tw = img.width * 2;
      const ct = scene.textures.createCanvas(newKey, tw, img.height), c = ct.getContext();
      c.drawImage(img, 0, 0); c.save(); c.translate(tw, 0); c.scale(-1, 1); c.drawImage(img, 0, 0); c.restore(); ct.refresh();
      return img;
    },

    // kleine Partikel-Texturen: dot (Staub), star (Funkeln), leaf (Blatt), bubble (Blase)
    particles(scene) {
      if (scene.textures.exists('dot')) return;
      const g = scene.make.graphics({ add: false });
      g.fillStyle(0xffffff).fillCircle(8, 8, 8); g.generateTexture('dot', 16, 16); g.clear();
      g.fillStyle(0xffe066); g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(10 + Math.cos(a) * r, 10 + Math.sin(a) * r); }
      g.closePath(); g.fillPath(); g.generateTexture('star', 20, 20); g.clear();
      g.fillStyle(0x6cbf4a).fillEllipse(8, 5, 16, 9); g.generateTexture('leaf', 16, 10); g.clear();
      g.lineStyle(2, 0xffffff, 0.9).strokeCircle(8, 8, 6); g.generateTexture('bubble', 16, 16);
      g.destroy();
    },

    // Anzeige oben: Herzen links, Zähler mit Bild rechts
    hud(scene, iconKey, lives = 3) {
      const W = B.W;
      const hearts = scene.add.text(18, 14, '', { fontSize: '40px' }).setDepth(100).setScrollFactor(0);
      const icon = scene.add.image(W - 120, 40, iconKey).setScale(0.3).setDepth(100).setScrollFactor(0);
      const num = scene.add.text(W - 22, 40, '0', { fontFamily: 'sans-serif', fontSize: '42px', fontStyle: 'bold', color: '#0f1f4d', stroke: '#ffffff', strokeThickness: 6 }).setOrigin(1, 0.5).setDepth(100).setScrollFactor(0);
      const h = {
        lives,
        setLives(n) { h.lives = n; if (lives) hearts.setText('❤️'.repeat(Math.max(0, n)) + '🤍'.repeat(Math.max(0, lives - n))); },
        setScore(n) {
          num.setText(String(n));
          scene.tweens.add({ targets: num, scale: 1.3, duration: 100, yoyo: true });
          scene.tweens.add({ targets: icon, scale: 0.4, duration: 100, yoyo: true });
        },
      };
      h.setLives(lives);
      return h;
    },

    // „+1“ steigt auf und verblasst
    plus(scene, x, y, text = '+1', color = '#e8a400') {
      const t = scene.add.text(x, y, text, { fontFamily: 'sans-serif', fontSize: '34px', fontStyle: 'bold', color, stroke: '#fff', strokeThickness: 5 }).setOrigin(0.5).setDepth(90);
      scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 700, onComplete: () => t.destroy() });
    },

    // Wortbilder laden: jedes Wort bekommt den Schlüssel w.tex (nur wenn es ein Bild gibt)
    loadWords(scene, words) { words.forEach((w, i) => { w.tex = 'w' + i; if (w.img) scene.load.image(w.tex, w.img); }); },

    // Karte mit Bild (sonst Farbklecks, Zahl oder Emoji), Mittelpunkt bei 0/0
    wordCard(scene, w, size = 110) {
      const c = scene.add.container(0, 0), g = scene.add.graphics();
      g.fillStyle(0xffffff).fillRoundedRect(-size / 2, -size / 2, size, size, 16);
      g.lineStyle(4, 0xc9d4ee).strokeRoundedRect(-size / 2, -size / 2, size, size, 16);
      c.add(g);
      if (w.img && scene.textures.exists(w.tex)) {
        const im = scene.add.image(0, 0, w.tex), k = size * 0.86 / Math.max(im.width, im.height);
        c.add(im.setScale(k));
      } else if (w.color) {
        const b = scene.add.graphics(); b.fillStyle(parseInt(w.color.slice(1), 16)).fillCircle(0, 0, size * 0.34); b.lineStyle(4, 0x0f1f4d).strokeCircle(0, 0, size * 0.34); c.add(b);
      } else {
        c.add(scene.add.text(0, 0, String(w.n != null ? w.n : w.e || w.pt), { fontFamily: 'sans-serif', fontSize: (w.n != null || w.e ? size * 0.55 : size * 0.2) + 'px', fontStyle: 'bold', color: '#1b4fa0' }).setOrigin(0.5));
      }
      c.setSize(size, size);
      return c;
    },

    // Ton nur abspielen, wenn er geladen ist (in Tests ohne Ton fehlt er)
    play(scene, key, cfg) { if (scene.cache.audio.exists(key)) scene.sound.play(key, cfg); },
  };
})();

// Spiele laden diese Datei mit OLA_PHASER_BASE() nach
window.OLA_PHASER_BASE = () => window.OLA_PHASER ? Promise.resolve() : new Promise((ok, fail) => {
  const s = document.createElement('script'); s.src = 'spiele/phaser-basis.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
});
