/**
 * PianoChord - app.js
 * Main application logic
 * Low-latency piano with 3 timbres, chord guide, service worker
 */

'use strict';

// ============================================================
// CONSTANTS & CONFIG
// ============================================================

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_NAMES_ES = ['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];

// 2 octaves starting at octave 3
const START_OCTAVE = 3;
const NUM_OCTAVES = 2;

// Freesound sample URLs (open license) for each timbre
// We use a minimal set of samples and pitch-shift for other notes
// grand: samples from University of Iowa Electronic Music Studios (public domain)
// cabaret: upright piano samples
// rock: electric piano / prepared piano style

const SAMPLE_SETS = {
  grand: {
    label: { es: '🎹 Grand Piano', en: '🎹 Grand Piano' },
    // Salamander Grand Piano samples (CC BY 3.0 - Alexander Holm)
    // Hosted on a reliable CDN
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/',
    notes: ['A0','C1','D#1','F#1','A1','C2','D#2','F#2','A2','C3','D#3','F#3','A3','C4','D#4','F#4','A4','C5','D#5','F#5','A5','C6','D#6','F#6','A6','C7','D#7','F#7','A7','C8'],
    ext: '.mp3',
    reverbAmount: 0.3,
    releaseTime: 2.0,
  },
  cabaret: {
    label: { es: '🎪 Dark Cabaret', en: '🎪 Dark Cabaret' },
    // Honky-tonk / upright piano sound
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/honkytonk_piano-mp3/',
    notes: ['A0','C1','D#1','F#1','A1','C2','D#2','F#2','A2','C3','D#3','F#3','A3','C4','D#4','F#4','A4','C5','D#5','F#5','A5','C6','D#6','F#6','A6','C7','D#7','F#7','A7','C8'],
    ext: '.mp3',
    reverbAmount: 0.5,
    releaseTime: 1.2,
  },
  rock: {
    label: { es: '🎸 Rock/Emo', en: '🎸 Rock/Emo' },
    // Electric grand piano — deep, dramatic (used in MCR Welcome to the Black Parade style)
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_grand_piano-mp3/',
    notes: ['A0','C1','D#1','F#1','A1','C2','D#2','F#2','A2','C3','D#3','F#3','A3','C4','D#4','F#4','A4','C5','D#5','F#5','A5','C6','D#6','F#6','A6','C7','D#7','F#7','A7','C8'],
    ext: '.mp3',
    reverbAmount: 0.4,
    releaseTime: 2.5,
  }
};

// Minimal samples to preload (only what we need for 2 octaves)
const NEEDED_NOTES = ['C3','D#3','F#3','A3','C4','D#4','F#4','A4','C5','D#5','F#5'];

// Chord database
const CHORDS = {
  major: [
    { name: 'C',  notes: [0,4,7],  label: 'Do mayor' },
    { name: 'C#', notes: [1,5,8],  label: 'Do# mayor' },
    { name: 'D',  notes: [2,6,9],  label: 'Re mayor' },
    { name: 'D#', notes: [3,7,10], label: 'Re# mayor' },
    { name: 'E',  notes: [4,8,11], label: 'Mi mayor' },
    { name: 'F',  notes: [5,9,0],  label: 'Fa mayor' },
    { name: 'F#', notes: [6,10,1], label: 'Fa# mayor' },
    { name: 'G',  notes: [7,11,2], label: 'Sol mayor' },
    { name: 'G#', notes: [8,0,3],  label: 'Sol# mayor' },
    { name: 'A',  notes: [9,1,4],  label: 'La mayor' },
    { name: 'A#', notes: [10,2,5], label: 'La# mayor' },
    { name: 'B',  notes: [11,3,6], label: 'Si mayor' },
  ],
  minor: [
    { name: 'Cm',  notes: [0,3,7],  label: 'Do menor' },
    { name: 'C#m', notes: [1,4,8],  label: 'Do# menor' },
    { name: 'Dm',  notes: [2,5,9],  label: 'Re menor' },
    { name: 'D#m', notes: [3,6,10], label: 'Re# menor' },
    { name: 'Em',  notes: [4,7,11], label: 'Mi menor' },
    { name: 'Fm',  notes: [5,8,0],  label: 'Fa menor' },
    { name: 'F#m', notes: [6,9,1],  label: 'Fa# menor' },
    { name: 'Gm',  notes: [7,10,2], label: 'Sol menor' },
    { name: 'G#m', notes: [8,11,3], label: 'Sol# menor' },
    { name: 'Am',  notes: [9,0,4],  label: 'La menor' },
    { name: 'A#m', notes: [10,1,5], label: 'La# menor' },
    { name: 'Bm',  notes: [11,2,6], label: 'Si menor' },
  ],
  seventh: [
    { name: 'C7',  notes: [0,4,7,10],  label: 'Do 7' },
    { name: 'D7',  notes: [2,6,9,0],   label: 'Re 7' },
    { name: 'E7',  notes: [4,8,11,2],  label: 'Mi 7' },
    { name: 'F7',  notes: [5,9,0,3],   label: 'Fa 7' },
    { name: 'G7',  notes: [7,11,2,5],  label: 'Sol 7' },
    { name: 'A7',  notes: [9,1,4,7],   label: 'La 7' },
    { name: 'B7',  notes: [11,3,6,9],  label: 'Si 7' },
    { name: 'Cm7', notes: [0,3,7,10],  label: 'Do m7' },
    { name: 'Dm7', notes: [2,5,9,0],   label: 'Re m7' },
    { name: 'Em7', notes: [4,7,11,2],  label: 'Mi m7' },
    { name: 'Am7', notes: [9,0,4,7],   label: 'La m7' },
    { name: 'Bm7', notes: [11,2,6,9],  label: 'Si m7' },
  ],
  sus: [
    { name: 'Csus2',  notes: [0,2,7],  label: 'Do sus2' },
    { name: 'Dsus2',  notes: [2,4,9],  label: 'Re sus2' },
    { name: 'Esus2',  notes: [4,6,11], label: 'Mi sus2' },
    { name: 'Gsus2',  notes: [7,9,2],  label: 'Sol sus2' },
    { name: 'Asus2',  notes: [9,11,4], label: 'La sus2' },
    { name: 'Csus4',  notes: [0,5,7],  label: 'Do sus4' },
    { name: 'Dsus4',  notes: [2,7,9],  label: 'Re sus4' },
    { name: 'Esus4',  notes: [4,9,11], label: 'Mi sus4' },
    { name: 'Fsus4',  notes: [5,10,0], label: 'Fa sus4' },
    { name: 'Gsus4',  notes: [7,0,2],  label: 'Sol sus4' },
    { name: 'Asus4',  notes: [9,2,4],  label: 'La sus4' },
  ]
};

// i18n strings
const I18N = {
  es: {
    timbre: 'Timbre',
    chordGuide: '🎵 Guía de Acordes',
    octave: 'Octava:',
    sustain: '🦶 Sustain',
    playing: 'Tocando: ',
    settings: 'Ajustes',
    reverb: 'Reverb',
    release: 'Release',
    showNoteNames: 'Mostrar notas',
    showChordHighlight: 'Resaltar acordes',
    cacheInfo: 'Los sonidos se guardan en caché para uso offline.',
    clearCache: '🗑️ Borrar caché',
    playChord: '▶ Tocar Acorde',
    clear: '✕ Limpiar',
    major: 'Mayor', minor: 'Menor', seventh: '7ª', sus: 'Sus',
    grand: '🎹 Grand Piano', cabaret: '🎪 Dark Cabaret', rock: '🎸 Rock/Emo',
    loadingText: 'Cargando sonidos...',
    noteNames: NOTE_NAMES_ES,
    noteNamesShort: NOTE_NAMES,
    chordNotesLabel: 'Notas: ',
    keysLabel: 'Teclas: ',
  },
  en: {
    timbre: 'Timbre',
    chordGuide: '🎵 Chord Guide',
    octave: 'Octave:',
    sustain: '🦶 Sustain',
    playing: 'Playing: ',
    settings: 'Settings',
    reverb: 'Reverb',
    release: 'Release',
    showNoteNames: 'Show note names',
    showChordHighlight: 'Highlight chords',
    cacheInfo: 'Sounds are cached for offline use.',
    clearCache: '🗑️ Clear cache',
    playChord: '▶ Play Chord',
    clear: '✕ Clear',
    major: 'Major', minor: 'Minor', seventh: '7th', sus: 'Sus',
    grand: '🎹 Grand Piano', cabaret: '🎪 Dark Cabaret', rock: '🎸 Rock/Emo',
    loadingText: 'Loading sounds...',
    noteNames: NOTE_NAMES,
    noteNamesShort: NOTE_NAMES,
    chordNotesLabel: 'Notes: ',
    keysLabel: 'Keys: ',
  }
};

// ============================================================
// APP STATE
// ============================================================

const state = {
  lang: 'es',
  timbre: 'grand',
  octave: 3,
  volume: 0.8,
  sustain: false,
  sustainedNotes: new Map(), // noteId -> gainNode
  activeNotes: new Map(),    // noteId -> { gainNode, source }
  reverbAmount: 0.3,
  releaseTime: 1.5,
  showNoteNames: true,
  showChordHighlight: true,
  selectedChord: null,
  chordCategory: 'major',
  chordPanelOpen: false,
  audioCtx: null,
  reverbNode: null,
  masterGain: null,
  buffers: {}, // { 'grand_C3': AudioBuffer, ... }
  loadedTimbres: new Set(),
  isLoading: false,
};

// ============================================================
// WEB AUDIO SETUP
// ============================================================

function initAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    alert('Tu navegador no soporta Web Audio API');
    return;
  }
  state.audioCtx = new AudioContext({ latencyHint: 'interactive', sampleRate: 44100 });

  // Master gain
  state.masterGain = state.audioCtx.createGain();
  state.masterGain.gain.value = state.volume;

  // Dry / Wet reverb chain
  state.reverbNode = state.audioCtx.createConvolver();
  state.reverbDry = state.audioCtx.createGain();
  state.reverbWet = state.audioCtx.createGain();

  state.reverbDry.gain.value = 1 - state.reverbAmount;
  state.reverbWet.gain.value = state.reverbAmount;

  // Dry path: masterGain -> dryGain -> destination
  state.masterGain.connect(state.reverbDry);
  state.reverbDry.connect(state.audioCtx.destination);

  // Wet path: masterGain -> convolver -> wetGain -> destination
  state.masterGain.connect(state.reverbNode);
  state.reverbNode.connect(state.reverbWet);
  state.reverbWet.connect(state.audioCtx.destination);

  // Create synthetic reverb impulse response
  createSyntheticReverb();
}


function createSyntheticReverb() {
  // Generate a synthetic reverb impulse response (no external file needed)
  const ctx = state.audioCtx;
  const sampleRate = ctx.sampleRate;
  const duration = 2.5;
  const decay = 2.0;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      // Exponential decay with random noise
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  state.reverbNode.buffer = impulse;
}

function updateReverbAmount(val) {
  state.reverbAmount = val;
  if (state.reverbDry) state.reverbDry.gain.setTargetAtTime(1 - val, state.audioCtx.currentTime, 0.01);
  if (state.reverbWet) state.reverbWet.gain.setTargetAtTime(val, state.audioCtx.currentTime, 0.01);
}

// ============================================================
// SAMPLE LOADING
// ============================================================

function noteNameToMidi(name) {
  // e.g. "C3" -> midi number
  const match = name.match(/^([A-G]#?)(\d+)$/);
  if (!match) return null;
  const noteIdx = NOTE_NAMES.indexOf(match[1]);
  const octave = parseInt(match[2]);
  return noteIdx + (octave + 1) * 12;
}

function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return note + octave;
}

async function loadTimbre(timbreName, onProgress) {
  if (state.loadedTimbres.has(timbreName)) {
    onProgress && onProgress(1);
    return;
  }

  const set = SAMPLE_SETS[timbreName];
  const ctx = state.audioCtx;
  const total = NEEDED_NOTES.length;
  let loaded = 0;

  const promises = NEEDED_NOTES.map(async (noteName) => {
    const key = `${timbreName}_${noteName}`;
    if (state.buffers[key]) {
      loaded++;
      onProgress && onProgress(loaded / total);
      return;
    }

    const url = `${set.baseUrl}${noteName}${set.ext}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      state.buffers[key] = audioBuffer;
    } catch (e) {
      console.warn(`Failed to load ${url}:`, e);
      // Mark as null so we can detect missing
      state.buffers[key] = null;
    }
    loaded++;
    onProgress && onProgress(loaded / total);
  });

  await Promise.all(promises);
  state.loadedTimbres.add(timbreName);
}

// Find the nearest available sample and compute pitch shift
function getNearestSample(timbreName, midiNote) {
  const set = SAMPLE_SETS[timbreName];
  const sampleMidis = set.notes.map(noteNameToMidi);
  let best = null, bestDiff = Infinity;

  for (let i = 0; i < set.notes.length; i++) {
    const key = `${timbreName}_${set.notes[i]}`;
    // Only consider pre-loaded notes
    if (!NEEDED_NOTES.includes(set.notes[i])) continue;
    if (state.buffers[key] === null) continue;
    const diff = Math.abs(sampleMidis[i] - midiNote);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = { buffer: state.buffers[key], sampleMidi: sampleMidis[i] };
    }
  }
  return best;
}

// ============================================================
// NOTE PLAYBACK
// ============================================================

function playNote(midiNote) {
  if (!state.audioCtx) return;

  // Resume context on first interaction (iOS/Android requirement)
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }

  const noteId = `note_${midiNote}`;

  // Stop existing note unless sustain
  if (state.activeNotes.has(noteId) && !state.sustain) {
    stopNote(midiNote, true);
  }

  const sample = getNearestSample(state.timbre, midiNote);
  if (!sample || !sample.buffer) {
    // Fallback: synthesize with oscillator
    playFallbackNote(midiNote);
    return;
  }

  const ctx = state.audioCtx;
  const source = ctx.createBufferSource();
  source.buffer = sample.buffer;

  // Pitch shift: semitone difference -> playback rate
  const semitones = midiNote - sample.sampleMidi;
  source.playbackRate.value = Math.pow(2, semitones / 12);

  // Gain envelope
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.005); // fast attack

  source.connect(gainNode);
  gainNode.connect(state.masterGain);
  source.start();

  state.activeNotes.set(noteId, { gainNode, source, midiNote });
}

function releaseNote(midiNote) {
  if (state.sustain) return; // sustain pedal holds note
  stopNote(midiNote, false);
}

function stopNote(midiNote, immediate = false) {
  const noteId = `note_${midiNote}`;
  const note = state.activeNotes.get(noteId);
  if (!note) return;

  const ctx = state.audioCtx;
  const { gainNode, source } = note;
  const release = immediate ? 0.02 : state.releaseTime;

  gainNode.gain.cancelScheduledValues(ctx.currentTime);
  gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + release);

  source.stop(ctx.currentTime + release + 0.1);
  state.activeNotes.delete(noteId);
}

function stopAllNotes() {
  const noteIds = [...state.activeNotes.keys()];
  for (const noteId of noteIds) {
    const midi = parseInt(noteId.replace('note_', ''));
    stopNote(midi, true);
  }
}

function playFallbackNote(midiNote) {
  // Simple oscillator fallback when samples aren't available
  const ctx = state.audioCtx;
  const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + state.releaseTime);

  osc.connect(gain);
  gain.connect(state.masterGain);
  osc.start();
  osc.stop(ctx.currentTime + state.releaseTime + 0.1);
}

// ============================================================
// PIANO KEYBOARD RENDERING
// ============================================================

function getNoteLayout(startOctave, numOctaves) {
  // Returns array of { midi, isBlack, noteIndex, octave }
  const layout = [];
  const blackPattern = [false, true, false, true, false, false, true, false, true, false, true, false];
  // C D E F G A B = indices 0,2,4,5,7,9,11
  // C# D# F# G# A# = 1,3,6,8,10

  for (let oct = startOctave; oct < startOctave + numOctaves; oct++) {
    for (let n = 0; n < 12; n++) {
      const midi = (oct + 1) * 12 + n;
      layout.push({ midi, isBlack: blackPattern[n], noteIndex: n, octave: oct });
    }
  }
  // Add final C
  const midi = (startOctave + numOctaves + 1) * 12;
  layout.push({ midi, isBlack: false, noteIndex: 0, octave: startOctave + numOctaves });
  return layout;
}

function renderPiano() {
  const piano = document.getElementById('piano');
  const wrapper = document.querySelector('.piano-wrapper');
  piano.innerHTML = '';

  const layout = getNoteLayout(state.octave, NUM_OCTAVES);
  const whiteKeys = layout.filter(n => !n.isBlack);
  const blackKeys = layout.filter(n => n.isBlack);

  // Calculate key sizes based on screen width
  const wrapperWidth = wrapper.clientWidth;
  const numWhiteKeys = whiteKeys.length;

  // Target: fill available width, min 36px per white key for finger size
  const whiteKeyWidth = Math.max(36, Math.floor(wrapperWidth / numWhiteKeys));
  const whiteKeyHeight = Math.max(120, wrapper.clientHeight);
  const blackKeyWidth = Math.floor(whiteKeyWidth * 0.6);
  const blackKeyHeight = Math.floor(whiteKeyHeight * 0.62);

  piano.style.width = `${whiteKeyWidth * numWhiteKeys}px`;
  piano.style.minWidth = `${whiteKeyWidth * numWhiteKeys}px`;

  // White keys
  whiteKeys.forEach((note, i) => {
    const key = document.createElement('div');
    key.className = 'key-white';
    key.style.width = `${whiteKeyWidth}px`;
    key.style.height = `${whiteKeyHeight}px`;
    key.dataset.midi = note.midi;

    if (state.showNoteNames) {
      const label = document.createElement('span');
      label.className = 'key-name';
      const lang = state.lang;
      const nn = lang === 'es' ? NOTE_NAMES_ES[note.noteIndex] : NOTE_NAMES[note.noteIndex];
      label.textContent = nn + (note.noteIndex === 0 ? note.octave : '');
      key.appendChild(label);
    }

    piano.appendChild(key);
  });

  // Black keys (positioned absolutely)
  // White key positions map
  const whitePositions = {};
  whiteKeys.forEach((note, i) => {
    whitePositions[note.midi] = i;
  });

  // Black key offset rules (relative to white key to the left)
  // C# -> after C (index 0), D# -> after D (2), F# -> after F (5), G# -> after G (7), A# -> after A (9)
  const blackOffsets = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }; // noteIndex -> whiteKeyOffset

  blackKeys.forEach((note) => {
    const key = document.createElement('div');
    key.className = 'key-black';
    key.style.width = `${blackKeyWidth}px`;
    key.style.height = `${blackKeyHeight}px`;
    key.dataset.midi = note.midi;

    // Black key sits between two white keys.
    // whiteKeyIndex = index of the white key to the LEFT of this black key
    const octaveOffset = (note.octave - state.octave) * 7; // 7 white keys per octave
    const whiteKeyIndex = octaveOffset + blackOffsets[note.noteIndex];
    // Center the black key over the right edge of the white key to its left
    const leftPos = (whiteKeyIndex + 1) * whiteKeyWidth - (blackKeyWidth / 2);
    key.style.left = `${leftPos}px`;
    key.style.top = '0px';

    if (state.showNoteNames) {
      const label = document.createElement('span');
      label.className = 'key-name';
      const lang = state.lang;
      const nn = lang === 'es' ? NOTE_NAMES_ES[note.noteIndex] : NOTE_NAMES[note.noteIndex];
      label.textContent = nn;
      key.appendChild(label);
    }

    piano.appendChild(key);
  });

  // Highlight chord keys if selected
  if (state.selectedChord && state.showChordHighlight) {
    highlightChordKeys();
  }
}

// ============================================================
// PIANO TOUCH/POINTER EVENTS (glissando-capable)
// ============================================================

// Maps each active pointerId -> { midi, keyEl }
const activePointers = new Map();

function getKeyAtPoint(x, y) {
  // elementFromPoint may return a child span (note label) — walk up to the key div
  let el = document.elementFromPoint(x, y);
  while (el && el !== document.body) {
    if (el.dataset && el.dataset.midi) return el;
    el = el.parentElement;
  }
  return null;
}

function setupPianoEvents() {
  const piano = document.getElementById('piano');
  if (!piano) return;

  // Remove any existing listeners by cloning (safe since we only call this once)
  piano.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    // Capture on the piano div so pointermove keeps firing even when sliding fast
    try { piano.setPointerCapture(e.pointerId); } catch (_) {}

    const keyEl = getKeyAtPoint(e.clientX, e.clientY);
    if (!keyEl) return;
    const midi = parseInt(keyEl.dataset.midi);
    if (isNaN(midi)) return;

    activePointers.set(e.pointerId, { midi, keyEl });
    keyEl.classList.add('active');
    playNote(midi);
    updateNoteIndicator(midi);
  }, { passive: false });

  piano.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    e.preventDefault();

    const keyEl = getKeyAtPoint(e.clientX, e.clientY);
    if (!keyEl) return;
    const newMidi = parseInt(keyEl.dataset.midi);
    if (isNaN(newMidi)) return;

    const prev = activePointers.get(e.pointerId);
    if (prev.midi === newMidi) return; // still on same key

    // Leave previous key
    if (!state.sustain) releaseNote(prev.midi);
    prev.keyEl.classList.remove('active');

    // Enter new key
    activePointers.set(e.pointerId, { midi: newMidi, keyEl });
    keyEl.classList.add('active');
    playNote(newMidi);
    updateNoteIndicator(newMidi);
  }, { passive: false });

  const endPointer = (e) => {
    const prev = activePointers.get(e.pointerId);
    if (!prev) return;
    releaseNote(prev.midi);
    prev.keyEl.classList.remove('active');
    activePointers.delete(e.pointerId);
  };

  piano.addEventListener('pointerup',     endPointer);
  piano.addEventListener('pointercancel', endPointer);
}


function updateNoteIndicator(midi) {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  const lang = state.lang;
  const nn = lang === 'es' ? NOTE_NAMES_ES[noteIndex] : NOTE_NAMES[noteIndex];
  const el = document.getElementById('note-indicator');
  if (el) el.textContent = nn + octave;
}

// ============================================================
// CHORD LOGIC
// ============================================================

function highlightChordKeys(chord) {
  const c = chord || state.selectedChord;
  if (!c) return;

  // Clear existing highlights
  document.querySelectorAll('.key-white.highlighted, .key-black.highlighted').forEach(k => {
    k.classList.remove('highlighted');
  });

  if (!c) return;

  // Highlight notes in the chord across the 2 visible octaves
  const startMidi = (state.octave + 1) * 12;
  const endMidi = startMidi + NUM_OCTAVES * 12 + 1;

  c.notes.forEach(noteIndex => {
    // Find all keys with this note index in the range
    for (let midi = startMidi; midi <= endMidi; midi++) {
      if (midi % 12 === noteIndex) {
        const key = document.querySelector(`[data-midi="${midi}"]`);
        if (key) key.classList.add('highlighted');
      }
    }
  });
}

function clearChordHighlights() {
  document.querySelectorAll('.highlighted').forEach(k => k.classList.remove('highlighted'));
}

function selectChord(chord) {
  state.selectedChord = chord;

  // Show chord tag in the chord bar
  const tag  = document.getElementById('chord-tag');
  const play = document.getElementById('play-chord-btn');
  const clr  = document.getElementById('clear-chord-btn');

  tag.textContent  = chord.name;
  tag.classList.remove('hidden');
  play.classList.remove('hidden');
  clr.classList.remove('hidden');

  if (state.showChordHighlight) {
    highlightChordKeys(chord);
  }

  // Deselect other chips
  document.querySelectorAll('.chord-chip.selected').forEach(c => c.classList.remove('selected'));
}

function playSelectedChord() {
  if (!state.selectedChord) return;
  const baseMidi = (state.octave + 1) * 12;
  state.selectedChord.notes.forEach((noteIndex, i) => {
    let midi = baseMidi + noteIndex;
    // Keep notes in order (ascending)
    if (i > 0) {
      const prevNote = baseMidi + state.selectedChord.notes[i-1];
      while (midi <= prevNote) midi += 12;
    }
    setTimeout(() => playNote(midi), i * 30); // slight arpeggiation
    setTimeout(() => {
      if (!state.sustain) releaseNote(midi);
    }, i * 30 + 1500);
  });
}

function renderChordList() {
  const list = document.getElementById('chord-list');
  list.innerHTML = '';
  const chords = CHORDS[state.chordCategory] || [];
  chords.forEach(chord => {
    const chip = document.createElement('button');
    chip.className = 'chord-chip';
    chip.textContent = chord.name;
    chip.dataset.chord = JSON.stringify(chord);
    if (state.selectedChord && state.selectedChord.name === chord.name && state.selectedChord.name) {
      chip.classList.add('selected');
    }
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chord-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectChord(chord);
    });
    list.appendChild(chip);
  });
}

// ============================================================
// UI UPDATES & i18n
// ============================================================

function applyI18n() {
  const t = I18N[state.lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });
  document.querySelectorAll('[data-i18n-t]').forEach(el => {
    const key = el.dataset.i18nT;
    if (t[key]) el.textContent = t[key];
  });
  document.querySelectorAll('[data-i18n-c]').forEach(el => {
    const key = el.dataset.i18nC;
    if (t[key]) el.textContent = t[key];
  });
  document.getElementById('lang-btn').textContent = state.lang.toUpperCase();

  // Update reverb/release labels
  const reverbSlider = document.getElementById('reverb-slider');
  if (reverbSlider) {
    document.getElementById('reverb-val').textContent = Math.round(reverbSlider.value * 100) + '%';
  }
}

function updateOctaveDisplay() {
  document.getElementById('oct-display').textContent = state.octave;
}

function applyTimbreTheme() {
  document.body.className = `theme-${state.timbre}`;
  // Update reverb defaults per timbre
  const set = SAMPLE_SETS[state.timbre];
  if (set) {
    updateReverbAmount(set.reverbAmount);
    state.releaseTime = set.releaseTime;
    const rel = document.getElementById('release-slider');
    if (rel) {
      rel.value = set.releaseTime;
      document.getElementById('release-val').textContent = set.releaseTime.toFixed(1) + 's';
    }
    const rev = document.getElementById('reverb-slider');
    if (rev) {
      rev.value = set.reverbAmount;
      document.getElementById('reverb-val').textContent = Math.round(set.reverbAmount * 100) + '%';
    }
  }
}

// ============================================================
// LOADING
// ============================================================

async function loadTimbreWithUI(timbreName) {
  const loadingEl = document.getElementById('loading-screen');
  const progressBar = document.getElementById('progress-bar');
  const percentEl = document.getElementById('loading-percent');
  const textEl = document.getElementById('loading-text');

  const appEl = document.getElementById('app');
  const t = I18N[state.lang];

  // Show loading if timbre not loaded yet
  if (!state.loadedTimbres.has(timbreName)) {
    appEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');
    textEl.textContent = t.loadingText + ` (${SAMPLE_SETS[timbreName].label[state.lang]})`;
    progressBar.style.width = '0%';
    percentEl.textContent = '0%';

    await loadTimbre(timbreName, (p) => {
      const pct = Math.round(p * 100);
      progressBar.style.width = pct + '%';
      percentEl.textContent = pct + '%';
    });
  }

  loadingEl.classList.add('hidden');
  appEl.classList.remove('hidden');
}

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
  // Load saved settings
  try {
    const saved = JSON.parse(localStorage.getItem('pianochord_settings') || '{}');
    if (saved.lang) state.lang = saved.lang;
    if (saved.timbre) state.timbre = saved.timbre;
    if (saved.octave) state.octave = saved.octave;
    if (saved.volume !== undefined) state.volume = saved.volume;
    if (saved.reverbAmount !== undefined) state.reverbAmount = saved.reverbAmount;
    if (saved.releaseTime !== undefined) state.releaseTime = saved.releaseTime;
    if (saved.showNoteNames !== undefined) state.showNoteNames = saved.showNoteNames;
    if (saved.showChordHighlight !== undefined) state.showChordHighlight = saved.showChordHighlight;
  } catch (e) {}

  // Init audio context
  initAudio();

  // Load initial timbre
  await loadTimbreWithUI(state.timbre);

  // Render UI
  applyI18n();
  applyTimbreTheme();
  updateOctaveDisplay();
  renderChordList();
  renderPiano();
  setupPianoEvents(); // set up glissando-capable touch handling (once, on piano div)
  bindEvents();

  // Update UI controls to match state
  document.getElementById('vol-slider').value = state.volume;
  document.getElementById('reverb-slider').value = state.reverbAmount;
  document.getElementById('release-slider').value = state.releaseTime;
  document.getElementById('show-notes-cb').checked = state.showNoteNames;
  document.getElementById('highlight-cb').checked = state.showChordHighlight;
  document.getElementById('reverb-val').textContent = Math.round(state.reverbAmount * 100) + '%';
  document.getElementById('release-val').textContent = state.releaseTime.toFixed(1) + 's';

  // Activate correct timbre tab
  document.querySelectorAll('.timbre-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.timbre === state.timbre);
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // PWA Install prompt — intercept beforeinstallprompt to show our custom banner
  let deferredInstallPrompt = null;
  const installBanner  = document.getElementById('install-banner');
  const installBtn     = document.getElementById('install-btn');
  const dismissInstall = document.getElementById('dismiss-install');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // prevent mini-infobar
    deferredInstallPrompt = e;
    installBanner.classList.remove('hidden'); // show our banner
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBanner.classList.add('hidden');
  });

  dismissInstall.addEventListener('click', () => {
    installBanner.classList.add('hidden');
  });

  // Hide banner once app is installed
  window.addEventListener('appinstalled', () => {
    installBanner.classList.add('hidden');
    deferredInstallPrompt = null;
  });

  // Handle resize
  window.addEventListener('resize', () => {
    clearTimeout(state._resizeTimer);
    state._resizeTimer = setTimeout(renderPiano, 150);
  });

  saveSettings();
}

function saveSettings() {
  try {
    localStorage.setItem('pianochord_settings', JSON.stringify({
      lang: state.lang,
      timbre: state.timbre,
      octave: state.octave,
      volume: state.volume,
      reverbAmount: state.reverbAmount,
      releaseTime: state.releaseTime,
      showNoteNames: state.showNoteNames,
      showChordHighlight: state.showChordHighlight,
    }));
  } catch (e) {}
}

// ============================================================
// EVENT BINDINGS
// ============================================================

function bindEvents() {
  // Timbre tabs
  document.querySelectorAll('.timbre-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.timbre === state.timbre) return;
      document.querySelectorAll('.timbre-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.timbre = btn.dataset.timbre;
      applyTimbreTheme();
      await loadTimbreWithUI(state.timbre);
      renderPiano(); // re-render (theme may affect labels)
      saveSettings();
    });
  });

  // Chord categories
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.chordCategory = btn.dataset.cat;
      state.selectedChord = null;
      // Hide chord tag + mini buttons
      document.getElementById('chord-tag').classList.add('hidden');
      document.getElementById('play-chord-btn').classList.add('hidden');
      document.getElementById('clear-chord-btn').classList.add('hidden');
      clearChordHighlights();
      renderChordList();
    });
  });

  // Chord panel toggle (uses CSS classes now)
  document.getElementById('chord-panel-toggle').addEventListener('click', () => {
    state.chordPanelOpen = !state.chordPanelOpen;
    const panel  = document.getElementById('chord-panel');
    const arrow  = document.querySelector('#chord-panel-toggle .toggle-arrow');
    if (state.chordPanelOpen) {
      panel.classList.remove('chord-panel-collapsed');
      panel.classList.add('chord-panel-open');
      if (arrow) arrow.textContent = '▲';
    } else {
      panel.classList.remove('chord-panel-open');
      panel.classList.add('chord-panel-collapsed');
      if (arrow) arrow.textContent = '▼';
    }
  });

  // Play chord button
  document.getElementById('play-chord-btn').addEventListener('click', playSelectedChord);

  // Clear chord
  document.getElementById('clear-chord-btn').addEventListener('click', () => {
    state.selectedChord = null;
    document.getElementById('chord-tag').classList.add('hidden');
    document.getElementById('play-chord-btn').classList.add('hidden');
    document.getElementById('clear-chord-btn').classList.add('hidden');
    clearChordHighlights();
    document.querySelectorAll('.chord-chip.selected').forEach(c => c.classList.remove('selected'));
  });

  // Octave buttons
  document.getElementById('oct-down').addEventListener('click', () => {
    if (state.octave > 1) {
      state.octave--;
      updateOctaveDisplay();
      renderPiano();
      saveSettings();
    }
  });
  document.getElementById('oct-up').addEventListener('click', () => {
    if (state.octave < 5) {
      state.octave++;
      updateOctaveDisplay();
      renderPiano();
      saveSettings();
    }
  });

  // Volume slider
  document.getElementById('vol-slider').addEventListener('input', (e) => {
    state.volume = parseFloat(e.target.value);
    if (state.masterGain) state.masterGain.gain.setTargetAtTime(state.volume, state.audioCtx.currentTime, 0.01);
    saveSettings();
  });

  // Sustain pedal
  const sustainBtn = document.getElementById('sustain-btn');
  sustainBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    state.sustain = true;
    sustainBtn.classList.add('active');
  });
  sustainBtn.addEventListener('pointerup', (e) => {
    e.preventDefault();
    state.sustain = false;
    sustainBtn.classList.remove('active');
    // Release all sustained notes
    stopAllNotes();
  });
  sustainBtn.addEventListener('pointercancel', () => {
    state.sustain = false;
    sustainBtn.classList.remove('active');
    stopAllNotes();
  });

  // Language toggle
  document.getElementById('lang-btn').addEventListener('click', () => {
    state.lang = state.lang === 'es' ? 'en' : 'es';
    applyI18n();
    renderChordList();
    renderPiano();
    saveSettings();
  });

  // Settings modal
  document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.remove('hidden');
  });
  document.getElementById('close-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });
  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settings-modal')) {
      document.getElementById('settings-modal').classList.add('hidden');
    }
  });

  // Reverb slider
  document.getElementById('reverb-slider').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    updateReverbAmount(val);
    document.getElementById('reverb-val').textContent = Math.round(val * 100) + '%';
    state.reverbAmount = val;
    saveSettings();
  });

  // Release slider
  document.getElementById('release-slider').addEventListener('input', (e) => {
    state.releaseTime = parseFloat(e.target.value);
    document.getElementById('release-val').textContent = state.releaseTime.toFixed(1) + 's';
    saveSettings();
  });

  // Show note names
  document.getElementById('show-notes-cb').addEventListener('change', (e) => {
    state.showNoteNames = e.target.checked;
    renderPiano();
    saveSettings();
  });

  // Highlight chords
  document.getElementById('highlight-cb').addEventListener('change', (e) => {
    state.showChordHighlight = e.target.checked;
    if (e.target.checked && state.selectedChord) {
      highlightChordKeys();
    } else {
      clearChordHighlights();
    }
    saveSettings();
  });

  // Clear cache
  document.getElementById('clear-cache-btn').addEventListener('click', async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    state.buffers = {};
    state.loadedTimbres.clear();
    alert(state.lang === 'es' ? 'Caché borrada. Recarga la app.' : 'Cache cleared. Reload the app.');
  });

  // Keyboard support (desktop)
  document.addEventListener('keydown', handleKeyboard);
}

// Keyboard mapping (desktop)
const KEYBOARD_MAP = {
  'a': 48, 'w': 49, 's': 50, 'e': 51, 'd': 52, 'f': 53,
  't': 54, 'g': 55, 'y': 56, 'h': 57, 'u': 58, 'j': 59,
  'k': 60, 'o': 61, 'l': 62, 'p': 63, ';': 64,
};
const pressedKeys = new Set();

function handleKeyboard(e) {
  if (e.repeat) return;
  if (e.target.tagName === 'INPUT') return;
  const key = e.key.toLowerCase();
  if (KEYBOARD_MAP[key]) {
    const baseMidi = (state.octave + 1) * 12;
    const midi = baseMidi + (KEYBOARD_MAP[key] - 48);
    pressedKeys.add(key);
    playNote(midi);
    updateNoteIndicator(midi);
    const keyEl = document.querySelector(`[data-midi="${midi}"]`);
    if (keyEl) keyEl.classList.add('active');
  }
}

document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (KEYBOARD_MAP[key]) {
    const baseMidi = (state.octave + 1) * 12;
    const midi = baseMidi + (KEYBOARD_MAP[key] - 48);
    pressedKeys.delete(key);
    releaseNote(midi);
    const keyEl = document.querySelector(`[data-midi="${midi}"]`);
    if (keyEl) keyEl.classList.remove('active');
  }
});

// ============================================================
// START
// ============================================================
window.addEventListener('DOMContentLoaded', init);
