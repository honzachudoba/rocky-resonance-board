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

class RockyAudioEngine {
  constructor() {
    this.ctx = null;
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
  }

  stopCurrent(notify = true) {
    if (this.currentTimeout) {
      window.clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    for (const node of this.currentNodes) {
      try {
        node.stop?.(0);
      } catch {
        // Nodes may already be stopped.
      }
      try {
        node.disconnect?.();
      } catch {
        // Safe disconnect.
      }
    }

    this.currentNodes = [];

    if (notify && typeof this.onPlaybackEnd === "function") {
      this.onPlaybackEnd();
    }
  }

  async playLine(line, mode) {
    await this.ensureReady();
    this.stopCurrent(false);

    const now = this.ctx.currentTime + 0.02;
    const duration = (line.durationMs ?? 2400) / 1000;

    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.85, now + 0.08);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(this.ctx.destination);

    this.currentNodes.push(master);

    if (mode === "alien") {
      this.#playAlien(line, now, duration, master);
    } else {
      this.#playHuman(line, now, duration, master);
    }

    this.currentTimeout = window.setTimeout(() => {
      this.currentNodes = [];
      this.currentTimeout = null;
      if (typeof this.onPlaybackEnd === "function") {
        this.onPlaybackEnd();
      }
    }, line.durationMs ?? 2400);
  }

  #createShapedOscillator(type, frequency, start, duration, output, volume = 0.18) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(output);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    this.currentNodes.push(osc, gain);
    return { osc, gain };
  }

  #playAlien(line, start, duration, master) {
    const presetOffsets = {
      bright: [0, 7, 12],
      spark: [0, 4, 11],
      trill: [0, 3, 10],
      ominous: [0, 5, 8],
      bouncy: [0, 7, 14],
      warm: [0, 5, 12],
      harmonic: [0, 7, 9],
      sharp: [0, 2, 10],
      deep: [0, 7, 19],
      wobble: [0, 6, 12],
      pulse: [0, 5, 7],
      sad: [0, 3, 7],
    };

    const intervals = presetOffsets[line.alienAudioPreset] ?? [0, 7, 12];
    const baseFreq = 120 + line.baseText.length * 2.15;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(baseFreq * 3.2, start);
    filter.Q.setValueAtTime(5.2, start);
    filter.connect(master);
    this.currentNodes.push(filter);

    const pulseRate = Math.max(3, Math.min(8, line.baseText.split(" ").length));
    const pulse = this.ctx.createOscillator();
    const pulseGain = this.ctx.createGain();
    pulse.type = "triangle";
    pulse.frequency.setValueAtTime(pulseRate, start);
    pulseGain.gain.setValueAtTime(0.08, start);
    pulse.connect(pulseGain);
    pulseGain.connect(filter.frequency);
    pulse.start(start);
    pulse.stop(start + duration + 0.03);
    this.currentNodes.push(pulse, pulseGain);

    intervals.forEach((offset, index) => {
      const ratio = Math.pow(2, offset / 12);
      const oscType = index === 1 ? "triangle" : "sine";
      const { osc } = this.#createShapedOscillator(
        oscType,
        baseFreq * ratio,
        start + index * 0.03,
        duration - index * 0.04,
        filter,
        0.14 + index * 0.03
      );

      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibrato.type = "sine";
      vibrato.frequency.setValueAtTime(4.5 + index, start);
      vibratoGain.gain.setValueAtTime(6 + index * 2, start);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(start);
      vibrato.stop(start + duration + 0.04);
      this.currentNodes.push(vibrato, vibratoGain);
    });
  }

  #playHuman(line, start, duration, master) {
    const presetShapes = {
      gentle: { base: 160, glide: 22, wobble: 2.6 },
      crisp: { base: 185, glide: 18, wobble: 4.1 },
      smile: { base: 200, glide: 26, wobble: 3.4 },
      firm: { base: 148, glide: 10, wobble: 2.1 },
      dry: { base: 172, glide: 14, wobble: 2.7 },
      steady: { base: 154, glide: 12, wobble: 2.2 },
      measured: { base: 165, glide: 8, wobble: 1.8 },
      command: { base: 144, glide: 6, wobble: 1.5 },
      calm: { base: 158, glide: 12, wobble: 1.9 },
      focused: { base: 176, glide: 9, wobble: 2.5 },
      wry: { base: 170, glide: 20, wobble: 2.3 },
      urgent: { base: 188, glide: 30, wobble: 4.4 },
      playful: { base: 198, glide: 34, wobble: 4.8 },
      mournful: { base: 128, glide: -24, wobble: 1.2 },
    };

    const profile = presetShapes[line.humanAudioPreset] ?? presetShapes.gentle;
    const phraseLength = line.baseText.length;
    const voice = this.ctx.createOscillator();
    const voiceGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const formant = this.ctx.createBiquadFilter();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(profile.base + phraseLength * 0.45, start);
    voice.frequency.linearRampToValueAtTime(profile.base + profile.glide, start + duration * 0.35);
    voice.frequency.linearRampToValueAtTime(profile.base - 12, start + duration);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, start);
    filter.Q.setValueAtTime(0.8, start);

    formant.type = "bandpass";
    formant.frequency.setValueAtTime(900 + phraseLength * 6, start);
    formant.Q.setValueAtTime(2.4, start);

    voiceGain.gain.setValueAtTime(0.0001, start);
    voiceGain.gain.exponentialRampToValueAtTime(0.26, start + 0.06);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    lfo.type = "sine";
    lfo.frequency.setValueAtTime(profile.wobble, start);
    lfoGain.gain.setValueAtTime(22, start);

    voice.connect(filter);
    filter.connect(formant);
    formant.connect(voiceGain);
    voiceGain.connect(master);
    lfo.connect(lfoGain);
    lfoGain.connect(voice.frequency);

    const consonantNoise = this.ctx.createBufferSource();
    const noiseFilter = this.ctx.createBiquadFilter();
    const noiseGain = this.ctx.createGain();
    consonantNoise.buffer = this.#createNoiseBuffer();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(1600, start);
    noiseGain.gain.setValueAtTime(0.0001, start);
    noiseGain.gain.linearRampToValueAtTime(0.02, start + 0.03);
    noiseGain.gain.linearRampToValueAtTime(0.008, start + duration * 0.45);
    noiseGain.gain.linearRampToValueAtTime(0.0001, start + duration);
    consonantNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    voice.start(start);
    voice.stop(start + duration + 0.03);
    lfo.start(start);
    lfo.stop(start + duration + 0.03);
    consonantNoise.start(start);
    consonantNoise.stop(start + duration + 0.03);

    this.currentNodes.push(
      voice,
      voiceGain,
      filter,
      formant,
      lfo,
      lfoGain,
      consonantNoise,
      noiseFilter,
      noiseGain
    );
  }

  #createNoiseBuffer() {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * 0.18;
    }
    return buffer;
  }
}

const audioEngine = new RockyAudioEngine();
audioEngine.onPlaybackEnd = () => {
  state.activeTileId = null;
  state.activeLineLabel = null;
  updateStatus();
  syncTileStates();
};

async function playTile(lineId) {
  const line = voiceLines.find((item) => item.id === lineId);
  if (!line) {
    return;
  }

  await enableAudio();

  // If audio still not ready after the unlock attempt, try one more time
  // (the tile tap itself counts as a user gesture on mobile).
  if (!state.audioReady) {
    try {
      await audioEngine.ensureReady();
      state.audioReady = true;
    } catch {
      console.warn("Audio still unavailable on tile tap.");
      return;
    }
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
  // Always dismiss the overlay immediately so a failed init never freezes the UI.
  elements.audioUnlock.classList.add("is-hidden");

  if (state.audioReady) {
    return;
  }

  try {
    await audioEngine.ensureReady();
    state.audioReady = true;
  } catch (error) {
    // Audio init failed (common on file:// or restricted contexts).
    // Mark as ready anyway so we retry inline on the next tile tap
    // rather than showing the overlay again.
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

// Also dismiss by clicking the dark backdrop (outside the panel).
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
