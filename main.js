const voiceLines = [
  {
    id: "amazing-friend",
    label: "You are a surprising friend",
    baseText: "You are surprising and good, friend.",
    category: "greeting",
    alienAudioPreset: "bright",
    humanAudioPreset: "gentle",
    durationMs: 2600,
  },
  {
    id: "science-time",
    label: "Let us do impossible science",
    baseText: "Let us do impossible science now.",
    category: "science",
    alienAudioPreset: "spark",
    humanAudioPreset: "crisp",
    durationMs: 2800,
  },
  {
    id: "happy-noise",
    label: "Excited clicking happiness",
    baseText: "This makes me click with happiness.",
    category: "emotion",
    alienAudioPreset: "trill",
    humanAudioPreset: "smile",
    durationMs: 2300,
  },
  {
    id: "bad-idea",
    label: "This plan smells dangerous",
    baseText: "This plan is dangerous and bold.",
    category: "warning",
    alienAudioPreset: "ominous",
    humanAudioPreset: "firm",
    durationMs: 2700,
  },
  {
    id: "tiny-human",
    label: "Tiny human, huge chaos",
    baseText: "Tiny human causes huge chaos.",
    category: "humor",
    alienAudioPreset: "bouncy",
    humanAudioPreset: "dry",
    durationMs: 2400,
  },
  {
    id: "trust-loop",
    label: "I trust you with the hard part",
    baseText: "I trust you with the dangerous hard part.",
    category: "emotion",
    alienAudioPreset: "warm",
    humanAudioPreset: "steady",
    durationMs: 2900,
  },
  {
    id: "math-singing",
    label: "Numbers can sing if arranged well",
    baseText: "Numbers sing when arranged correctly.",
    category: "science",
    alienAudioPreset: "harmonic",
    humanAudioPreset: "measured",
    durationMs: 3000,
  },
  {
    id: "panic-later",
    label: "First solve, then panic",
    baseText: "We solve first. Panic later.",
    category: "warning",
    alienAudioPreset: "sharp",
    humanAudioPreset: "command",
    durationMs: 2200,
  },
  {
    id: "engine-song",
    label: "The engine wants a better song",
    baseText: "The engine needs a better song.",
    category: "science",
    alienAudioPreset: "deep",
    humanAudioPreset: "calm",
    durationMs: 2500,
  },
  {
    id: "good-problem",
    label: "At last, a worthy puzzle",
    baseText: "At last, a puzzle worth solving.",
    category: "science",
    alienAudioPreset: "bright",
    humanAudioPreset: "focused",
    durationMs: 2600,
  },
  {
    id: "hungry-space",
    label: "Space is rude and hungry",
    baseText: "Space is rude and always hungry.",
    category: "humor",
    alienAudioPreset: "wobble",
    humanAudioPreset: "wry",
    durationMs: 2400,
  },
  {
    id: "careful-friend",
    label: "Careful, friend, careful",
    baseText: "Careful, friend. Careful now.",
    category: "warning",
    alienAudioPreset: "pulse",
    humanAudioPreset: "urgent",
    durationMs: 2100,
  },
  {
    id: "good-work",
    label: "Your work pleases the cosmos",
    baseText: "Your work pleases the cosmos.",
    category: "greeting",
    alienAudioPreset: "warm",
    humanAudioPreset: "gentle",
    durationMs: 2500,
  },
  {
    id: "jazz-tools",
    label: "These tools need more jazz",
    baseText: "These tools need more style and jazz.",
    category: "humor",
    alienAudioPreset: "trill",
    humanAudioPreset: "playful",
    durationMs: 2350,
  },
  {
    id: "sad-distance",
    label: "Sad beyond any translation",
    baseText: "Sad. No word reaches far enough.",
    category: "emotion",
    alienAudioPreset: "sad",
    humanAudioPreset: "mournful",
    durationMs: 3400,
  },
];

const state = {
  activeMode: "alien",
  activeTileId: null,
  activeLineLabel: null,
  audioReady: false,
  activeCategory: "all",
  searchTerm: "",
};

const elements = {
  tileGrid: document.querySelector("#tileGrid"),
  template: document.querySelector("#tileTemplate"),
  modeButtons: [...document.querySelectorAll(".mode-toggle__button")],
  modeLabel: document.querySelector("#modeLabel"),
  nowPlaying: document.querySelector("#nowPlaying"),
  filterLabel: document.querySelector("#filterLabel"),
  stopButton: document.querySelector("#stopButton"),
  filterChips: document.querySelector("#filterChips"),
  searchInput: document.querySelector("#searchInput"),
  emptyState: document.querySelector("#emptyState"),
  audioUnlock: document.querySelector("#audioUnlock"),
  unlockButton: document.querySelector("#unlockButton"),
};

const categoryOrder = ["all", "greeting", "science", "humor", "emotion", "warning"];
const categoryLabels = {
  all: "All categories",
  greeting: "Greeting",
  science: "Science",
  humor: "Humor",
  emotion: "Emotion",
  warning: "Warning",
};

// ---------------------------------------------------------------------------
// Audio Engine
// ---------------------------------------------------------------------------

class RockyAudioEngine {
  constructor() {
    this.ctx = null;
    this.reverbNode = null;
    this.currentNodes = [];
    this.currentTimeout = null;
    this.onPlaybackEnd = null;
  }

  async ensureReady() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    if (!this.reverbNode) {
      this.reverbNode = this.#createReverb();
      this.reverbNode.connect(this.ctx.destination);
    }
  }

  stopCurrent(notify = true) {
    // Cancel any ongoing speech synthesis.
    window.speechSynthesis?.cancel();

    if (this.currentTimeout) {
      window.clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    for (const node of this.currentNodes) {
      try { node.stop?.(0); } catch { /* already stopped */ }
      try { node.disconnect?.(); } catch { /* safe */ }
    }
    this.currentNodes = [];

    if (notify && typeof this.onPlaybackEnd === "function") {
      this.onPlaybackEnd();
    }
  }

  async playLine(line, mode) {
    this.stopCurrent(false);

    if (mode === "alien") {
      await this.ensureReady();
      this.#playAlien(line);
    } else {
      this.#playHumanSpeech(line);
    }
  }

  // ---- Reverb (programmatic impulse response) ----------------------------

  #createReverb() {
    const sr = this.ctx.sampleRate;
    const length = Math.floor(sr * 1.8);
    const impulse = this.ctx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Exponential decay with a gentle early reflection spike.
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.4) * 0.75;
      }
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  // ---- Alien Rocky (chord-sequence synthesis) ----------------------------
  //
  // Rocky speaks in simultaneous musical tones (chords), not a human voice.
  // Each preset defines a sequence of chord shapes expressed as frequency
  // ratios relative to a base pitch, and the timing of each chord within
  // the phrase (0–1 fraction of total duration).  Pure sine partials with a
  // bell-like percussive envelope give the "resonant xylophone" quality
  // described in the book.  A programmatic reverb adds space.

  #playAlien(line) {
    const now = this.ctx.currentTime + 0.02;
    const totalDuration = (line.durationMs ?? 2400) / 1000;

    // Presets: base frequency (Hz), chord shapes (ratio arrays), rhythm (0–1 offsets).
    const presets = {
      bright:   { base: 220, chords: [[1, 5/4, 3/2],       [3/2, 15/8, 3],    [1, 5/4, 2]],          rhythm: [0, 0.32, 0.65] },
      spark:    { base: 260, chords: [[1, 9/8, 4/3],        [4/3, 5/3, 2],     [2, 5/2, 3]],           rhythm: [0, 0.27, 0.54] },
      trill:    { base: 300, chords: [[1, 6/5, 3/2],        [6/5, 3/2, 9/5],   [1, 5/4, 9/5],  [3/2, 2, 5/2]], rhythm: [0, 0.20, 0.40, 0.62] },
      ominous:  { base: 110, chords: [[1, 7/6, 3/2],        [7/6, 7/5, 2],     [1, 7/6, 7/4]],         rhythm: [0, 0.42, 0.74] },
      bouncy:   { base: 280, chords: [[1, 5/4, 2],          [2, 5/2, 3],       [1, 3/2, 2]],           rhythm: [0, 0.28, 0.55] },
      warm:     { base: 180, chords: [[1, 5/4, 3/2, 2],     [5/4, 3/2, 2, 5/2]],                       rhythm: [0, 0.48] },
      harmonic: { base: 165, chords: [[1, 2, 3, 4],         [2, 3, 4, 5],      [3, 4, 5, 6]],          rhythm: [0, 0.35, 0.67] },
      sharp:    { base: 240, chords: [[1, 4/3, 2],          [2, 8/3, 3]],                               rhythm: [0, 0.40] },
      deep:     { base: 90,  chords: [[1, 3/2, 2, 3],       [3/2, 2, 3, 4]],                           rhythm: [0, 0.50] },
      wobble:   { base: 200, chords: [[1, 16/15, 3/2],      [3/2, 2, 7/4],     [1, 5/4, 3/2]],         rhythm: [0, 0.30, 0.60] },
      pulse:    { base: 160, chords: [[1, 5/4],             [1, 5/4],          [1, 5/4],   [1, 5/4, 3/2]], rhythm: [0, 0.22, 0.44, 0.67] },
      sad:      { base: 175, chords: [[1, 6/5, 3/2],        [6/5, 3/2, 12/7],  [1, 6/5, 7/5]],         rhythm: [0, 0.38, 0.72] },
    };

    const preset = presets[line.alienAudioPreset] ?? presets.bright;
    const { base, chords, rhythm } = preset;

    // Dry/wet split: 55 % direct, 45 % through reverb.
    const dryGain = this.ctx.createGain();
    const wetGain = this.ctx.createGain();
    dryGain.gain.value = 0.55;
    wetGain.gain.value = 0.45;
    dryGain.connect(this.ctx.destination);
    wetGain.connect(this.reverbNode);
    this.currentNodes.push(dryGain, wetGain);

    chords.forEach((ratios, chordIdx) => {
      const chordStart = now + rhythm[chordIdx] * totalDuration;
      // Last chord decays a bit longer so the phrase rings out naturally.
      const decayTime = chordIdx === chords.length - 1
        ? Math.min(1.1, totalDuration * 0.45)
        : Math.min(0.75, totalDuration * 0.30);

      ratios.forEach((ratio) => {
        const freq = base * ratio;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = freq;

        // Bell envelope: very fast attack, smooth exponential decay.
        const peak = 0.24 / ratios.length;
        oscGain.gain.setValueAtTime(0.0001, chordStart);
        oscGain.gain.linearRampToValueAtTime(peak, chordStart + 0.014);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, chordStart + decayTime);

        osc.connect(oscGain);
        oscGain.connect(dryGain);
        oscGain.connect(wetGain);
        osc.start(chordStart);
        osc.stop(chordStart + decayTime + 0.06);
        this.currentNodes.push(osc, oscGain);
      });
    });

    // Notify when the phrase has finished.
    this.currentTimeout = window.setTimeout(() => {
      this.currentNodes = [];
      this.currentTimeout = null;
      if (typeof this.onPlaybackEnd === "function") {
        this.onPlaybackEnd();
      }
    }, line.durationMs ?? 2400);
  }

  // ---- Human Rocky (Web Speech API) -------------------------------------
  //
  // Actual spoken English via the browser's built-in speech synthesis.
  // Pitch and rate are tuned per emotional preset.

  #playHumanSpeech(line) {
    const speechParams = {
      gentle:   { pitch: 1.1,  rate: 0.88 },
      crisp:    { pitch: 1.0,  rate: 1.05 },
      smile:    { pitch: 1.15, rate: 1.0  },
      firm:     { pitch: 0.9,  rate: 1.0  },
      dry:      { pitch: 0.95, rate: 1.0  },
      steady:   { pitch: 0.95, rate: 0.92 },
      measured: { pitch: 0.9,  rate: 0.88 },
      command:  { pitch: 0.85, rate: 1.05 },
      calm:     { pitch: 0.95, rate: 0.85 },
      focused:  { pitch: 1.0,  rate: 1.0  },
      wry:      { pitch: 1.05, rate: 0.93 },
      urgent:   { pitch: 1.1,  rate: 1.22 },
      playful:  { pitch: 1.2,  rate: 1.1  },
      mournful: { pitch: 0.8,  rate: 0.72 },
    };

    const params = speechParams[line.humanAudioPreset] ?? { pitch: 1.0, rate: 1.0 };
    const utterance = new SpeechSynthesisUtterance(line.baseText);
    utterance.pitch = params.pitch;
    utterance.rate = params.rate;
    utterance.volume = 1.0;
    utterance.lang = "en-US";

    const handleEnd = () => {
      if (typeof this.onPlaybackEnd === "function") this.onPlaybackEnd();
    };
    utterance.onend = handleEnd;
    utterance.onerror = handleEnd;

    const applyVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer high-quality local voices in priority order.
      const preferred =
        voices.find(v => v.name === "Samantha") ??
        voices.find(v => v.name === "Daniel") ??
        voices.find(v => v.name.includes("Karen")) ??
        voices.find(v => v.name.includes("Moira")) ??
        voices.find(v => v.lang.startsWith("en") && v.localService) ??
        voices.find(v => v.lang.startsWith("en")) ??
        null;
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    };

    // Voices may not be loaded yet on first call.
    if (window.speechSynthesis.getVoices().length > 0) {
      applyVoiceAndSpeak();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", function once() {
        window.speechSynthesis.removeEventListener("voiceschanged", once);
        applyVoiceAndSpeak();
      });
      // Safety fallback if the event never fires (some browsers).
      setTimeout(() => {
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          applyVoiceAndSpeak();
        }
      }, 350);
    }
  }
}

// ---------------------------------------------------------------------------
// App glue
// ---------------------------------------------------------------------------

const audioEngine = new RockyAudioEngine();
audioEngine.onPlaybackEnd = () => {
  state.activeTileId = null;
  state.activeLineLabel = null;
  updateStatus();
  syncTileStates();
};

async function playTile(lineId) {
  const line = voiceLines.find((item) => item.id === lineId);
  if (!line) return;

  if (state.activeMode === "alien") {
    // Alien mode needs the Web Audio API — ensure it's unlocked.
    await enableAudio();
    if (!state.audioReady) {
      try {
        await audioEngine.ensureReady();
        state.audioReady = true;
      } catch {
        console.warn("Audio still unavailable on tile tap.");
        return;
      }
    }
  } else {
    // Human mode uses speechSynthesis — no AudioContext needed.
    elements.audioUnlock.classList.add("is-hidden");
  }

  state.activeTileId = line.id;
  state.activeLineLabel = line.label;
  updateStatus();
  syncTileStates();
  await audioEngine.playLine(line, state.activeMode);
}

function updateStatus() {
  elements.modeLabel.textContent = state.activeMode === "alien" ? "Alien Rocky" : "Human Rocky";
  elements.nowPlaying.textContent = state.activeLineLabel ?? "Nothing yet";
  elements.filterLabel.textContent = categoryLabels[state.activeCategory];
}

function syncTileStates() {
  const tiles = [...document.querySelectorAll(".voice-tile")];
  tiles.forEach((tile) => {
    tile.classList.toggle("is-playing", tile.dataset.id === state.activeTileId);
  });
}

function getVisibleLines() {
  const searchNeedle = state.searchTerm.trim().toLowerCase();
  return voiceLines.filter((line) => {
    const matchesCategory = state.activeCategory === "all" || line.category === state.activeCategory;
    const haystack = `${line.label} ${line.category} ${line.baseText}`.toLowerCase();
    const matchesSearch = !searchNeedle || haystack.includes(searchNeedle);
    return matchesCategory && matchesSearch;
  });
}

function renderFilterChips() {
  const fragment = document.createDocumentFragment();
  categoryOrder.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-chip";
    button.textContent = categoryLabels[category];
    button.dataset.category = category;
    button.addEventListener("click", () => {
      state.activeCategory = category;
      renderFilterChips();
      renderTiles();
      updateStatus();
    });
    if (category === state.activeCategory) {
      button.classList.add("is-active");
      button.setAttribute("aria-pressed", "true");
    } else {
      button.setAttribute("aria-pressed", "false");
    }
    fragment.appendChild(button);
  });
  elements.filterChips.replaceChildren(fragment);
}

function setMode(mode) {
  state.activeMode = mode;
  elements.modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  updateStatus();
}

async function enableAudio() {
  // Always dismiss the overlay first so a failed init never freezes the UI.
  elements.audioUnlock.classList.add("is-hidden");
  if (state.audioReady) return;
  try {
    await audioEngine.ensureReady();
    state.audioReady = true;
  } catch (error) {
    console.warn("AudioContext init failed, will retry on tile tap:", error);
    state.audioReady = false;
  }
}

function renderTiles() {
  const fragment = document.createDocumentFragment();
  const visibleLines = getVisibleLines();

  visibleLines.forEach((line) => {
    const tile = elements.template.content.firstElementChild.cloneNode(true);
    tile.dataset.id = line.id;
    tile.setAttribute("aria-label", `${line.label}. Category: ${categoryLabels[line.category]}. Tap to play.`);
    tile.querySelector(".voice-tile__category").textContent = line.category;
    tile.querySelector(".voice-tile__label").textContent = line.label;
    tile.addEventListener("click", () => playTile(line.id));
    fragment.appendChild(tile);
  });

  elements.tileGrid.replaceChildren(fragment);
  elements.emptyState.hidden = visibleLines.length > 0;
  syncTileStates();
}

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

elements.stopButton.addEventListener("click", () => {
  audioEngine.stopCurrent();
});

elements.searchInput.addEventListener("input", (event) => {
  state.searchTerm = event.target.value;
  renderTiles();
});

elements.unlockButton.addEventListener("click", async () => {
  await enableAudio();
});

elements.audioUnlock.addEventListener("click", async (event) => {
  if (event.target === elements.audioUnlock) {
    await enableAudio();
  }
});

document.addEventListener("keydown", async (event) => {
  if (event.key === "Escape") {
    audioEngine.stopCurrent();
  }
  if (event.key.toLowerCase() === "m") {
    setMode(state.activeMode === "alien" ? "human" : "alien");
  }
  if (event.key.toLowerCase() === "r" && state.activeTileId) {
    await playTile(state.activeTileId);
  }
});

renderFilterChips();
renderTiles();
updateStatus();
