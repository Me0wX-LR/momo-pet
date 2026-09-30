(function () {
  const policy = window.FakerPolicy;
  const params = new URLSearchParams(location.search);
  const enabled = params.get("faker") === "1";
  const embedded = window.parent !== window;

  const COPY = {
    "zh-Hant": {
      range: "106–120 ms",
      keyParry: "空白鍵",
      hold: "按住",
      up: "鬆開",
      music: "播放 GODS",
      musicOn: "暫停 GODS",
      act: { tap: "格擋", press: "按住", release: "鬆開", begin: "開始", next: "下一關", none: "按住" },
      predict: "預判",
      whiff: "預判沒中",
      vol: "音量",
      late: (rt, w) => rt + " ms\n只有 " + w + " ms，來不及"
    },
    en: {
      range: "106–120 ms",
      keyParry: "SPACE",
      hold: "HOLD",
      up: "LET GO",
      music: "Play GODS",
      musicOn: "Pause GODS",
      act: { tap: "Parry", press: "Hold", release: "Release", begin: "Start", next: "Next", none: "Hold" },
      predict: "Read",
      whiff: "Read miss",
      vol: "Vol",
      late: (rt, w) => rt + " ms\nwindow " + w + " · late"
    },
    "zh-Hans": {
      range: "106–120 ms",
      keyParry: "空格",
      hold: "按住",
      up: "松开",
      music: "播放 GODS",
      musicOn: "暂停 GODS",
      act: { tap: "格挡", press: "按住", release: "松开", begin: "开始", next: "下一关", none: "按住" },
      predict: "预判",
      whiff: "预判没中",
      vol: "音量",
      late: (rt, w) => rt + " ms\n只有 " + w + " ms，来不及"
    }
  };

  const ui = {
    enabled,
    embedded,
    NAME: policy.NAME,
    RT_MIN: policy.RT_MIN,
    RT_MAX: policy.RT_MAX,
    mode: "parry",
    lang: "zh-Hant",
    plan: null,
    holding: false,
    cam: null,
    audio: null,
    musicOn: false,
    lastTell: 0
  };

  function copy() { return COPY[ui.lang] || COPY["zh-Hant"]; }

  ui.reaction = function () { return policy.reactionDelay(Math.random); };
  ui.decideParry = function (openAt, windowEnds) { return policy.onParryOpen(openAt, windowEnds, Math.random); };
  function asset(rel) {
    const path = location.pathname;
    const localGame = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
      && /\/(parry|pet)(\/|\/index\.html)?$/.test(path);
    if (localGame) return "/" + String(rel).replace(/^\//, "");
    return new URL(String(rel).replace(/^\//, ""), new URL("./", location.href)).href;
  }
  ui.asset = asset;
  ui.decideParryTell = function (tellAt, openAt, windowEnds, nominalCenter, focus) {
    return policy.onParryTell(tellAt, openAt, windowEnds, Math.random, nominalCenter, focus);
  };
  ui.decidePet = function (phase, holding, now, deadline, focus) {
    return policy.onPetPhase(phase, holding, now, deadline, Math.random, focus);
  };
  ui.decidePetTell = function (tellAt, dangerStart, dangerEnd, holding, focus) {
    return policy.onPetTell(tellAt, dangerStart, dangerEnd, holding, Math.random, focus);
  };

  ui.planAt = function (at, fn) { this.plan = { at, fn }; };
  ui.clearPlan = function () { this.plan = null; };
  ui.shift = function (gap) { if (this.plan && gap) this.plan.at += gap; };
  ui.poll = function (now) {
    if (!this.enabled || !this.plan || now < this.plan.at) return;
    const fn = this.plan.fn;
    this.plan = null;
    fn(now);
  };

  ui.tell = function (msg) {
    if (!this.embedded) return;
    try {
      window.parent.postMessage(Object.assign({ source: "momo-faker" }, msg), location.origin);
    } catch (err) {}
  };

  ui.syncLang = function (lang) {
    if (!COPY[lang]) return;
    this.lang = lang;
    this.paint();
  };

  ui.textFor = function (decision) {
    const s = copy();
    const rt = Math.round(decision.rt);
    if (decision.predicted) return rt + " ms · " + (decision.made ? s.predict : s.whiff);
    if (decision.made === false) return s.late(rt, Math.max(0, Math.round(decision.windowMs || 0)));
    const act = s.act[decision.action] || "";
    return act ? rt + " ms · " + act : rt + " ms";
  };

  ui.note = function (decision) {
    this.last = decision;
    if (this.cam) this.cam.dataset.late = decision.made === false && !decision.predicted ? "1" : "0";
    this.paint();
    const now = performance.now();
    const important = decision.made !== false;
    if (!important && now - this.lastTell < 120) return;
    this.lastTell = now;
    this.tell({ type: "reflex", text: this.textFor(decision), made: decision.made !== false });
  };

  ui.flashTap = function () { this.flashAttempt(true); };
  ui.flashAttempt = function (made) {
    if (!this.cam) return;
    this.cam.dataset.late = made ? "0" : "1";
    this.cam.dataset.down = "1";
    clearTimeout(this.tapTimer);
    this.tapTimer = setTimeout(() => {
      if (this.cam) this.cam.dataset.down = "0";
    }, 110);
  };

  ui.setHold = function (down) {
    this.holding = !!down;
    if (!this.cam) return;
    this.cam.dataset.down = this.holding ? "1" : "0";
    if (this.holding) this.cam.dataset.late = "0";
    this.paint();
  };

  ui.paint = function () {
    if (!this.cam) return;
    const s = copy();
    const rt = this.cam.querySelector(".faker-rt");
    const key = this.cam.querySelector(".faker-key");
    const music = this.cam.querySelector(".faker-music");
    if (rt) rt.textContent = this.last ? this.textFor(this.last) : s.range;
    if (key) {
      if (this.mode === "pet") key.textContent = this.holding ? s.hold : s.up;
      else key.textContent = s.keyParry;
    }
    if (music) music.textContent = this.musicOn ? s.musicOn : s.music;
    const volName = this.cam.querySelector(".faker-vol-name");
    const volNum = this.cam.querySelector(".faker-vol-num");
    if (volName) volName.textContent = s.vol;
    if (volNum && !volNum.textContent) volNum.textContent = String(this.readVolume());
  };

  ui.readVolume = function () {
    const n = Number(localStorage.getItem("momo-faker-volume"));
    if (!Number.isFinite(n)) return 72;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  ui.setVolume = function (next) {
    const volume = Math.max(0, Math.min(100, Math.round(Number(next))));
    localStorage.setItem("momo-faker-volume", String(volume));
    if (this.audio) this.audio.volume = volume / 100;
    const input = this.cam && this.cam.querySelector(".faker-vol");
    const read = this.cam && this.cam.querySelector(".faker-vol-num");
    if (input && Number(input.value) !== volume) input.value = String(volume);
    if (read) read.textContent = String(volume);
    return volume;
  };

  ui.mount = function (mode) {
    if (!this.enabled || this.cam) return;
    this.mode = mode === "pet" ? "pet" : "parry";
    const cam = document.createElement("aside");
    cam.className = "faker-cam";
    cam.dataset.down = "0";
    cam.dataset.late = "0";
    cam.innerHTML =
      '<img src="' + asset("media/faker.jpg") + '" alt="Faker" draggable="false">' +
      '<div class="faker-id"><strong>FAKER</strong><span>AI</span></div>' +
      '<div class="faker-rt"></div>' +
      '<div class="faker-key"></div>' +
      '<label class="faker-vol-label"><span class="faker-vol-name"></span><input class="faker-vol" type="range" min="0" max="100" step="1"><span class="faker-vol-num"></span></label>' +
      '<button type="button" class="faker-music"></button>';
    const stage = document.getElementById("stage");
    if (stage) stage.append(cam);
    else document.body.append(cam);
    this.cam = cam;
    const music = cam.querySelector(".faker-music");
    const vol = cam.querySelector(".faker-vol");
    const volLabel = cam.querySelector(".faker-vol-label");
    if (this.embedded) {
      music.hidden = true;
      volLabel.hidden = true;
    } else {
      music.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        ui.toggleMusic();
      });
      vol.value = String(this.readVolume());
      vol.addEventListener("input", (event) => {
        event.stopPropagation();
        ui.setVolume(event.target.value);
      });
      vol.addEventListener("pointerdown", (event) => event.stopPropagation());
    }
    this.paint();
    if (!this.embedded) this.primeMusic();
  };

  ui.primeMusic = function () {
    if (this.audio) return;
    const audio = new Audio(asset("media/gods.mp3"));
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = this.readVolume() / 100;
    this.audio = audio;
  };

  ui.startMusic = async function () {
    if (this.embedded || !this.enabled) return false;
    this.primeMusic();
    try {
      await this.audio.play();
      this.musicOn = true;
    } catch (err) {
      this.musicOn = false;
    }
    this.paint();
    return this.musicOn;
  };

  ui.toggleMusic = async function () {
    this.primeMusic();
    if (this.musicOn) {
      this.audio.pause();
      this.musicOn = false;
      this.paint();
      return;
    }
    await this.startMusic();
  };

  window.MomoFaker = ui;
})();
