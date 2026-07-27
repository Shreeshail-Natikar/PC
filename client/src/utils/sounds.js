const STORAGE_KEY = 'chat-sound-enabled';

let audioCtx = null;
let ringtoneInterval = null;

function getCtx() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone({ frequency = 440, duration = 0.15, type = 'sine', gain = 0.15, attack = 0.01, decay = 0.05 }) {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;

  const now = ctx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration + decay);

  osc.connect(g);
  g.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + decay + 0.02);
}

function playNoteSequence(notes, gapMs = 60) {
  notes.forEach((note, i) => {
    setTimeout(() => {
      playTone({
        frequency: note.frequency,
        duration: note.duration ?? 0.12,
        type: note.type ?? 'sine',
        gain: note.gain ?? 0.14,
      });
    }, i * gapMs);
  });
}

export const SoundManager = {
  isEnabled() {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  },

  setEnabled(enabled) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    }
    if (!enabled) {
      this.stopRingtone();
    }
  },

  toggle() {
    const next = !this.isEnabled();
    this.setEnabled(next);
    return next;
  },

  playMessageReceived() {
    if (!this.isEnabled()) return;
    playNoteSequence([
      { frequency: 1046.5, duration: 0.08, gain: 0.12 },
      { frequency: 1318.51, duration: 0.14, gain: 0.14 },
    ], 70);
  },

  playMessageSent() {
    if (!this.isEnabled()) return;
    playTone({ frequency: 880, duration: 0.06, gain: 0.08, type: 'triangle' });
  },

  playTyping() {
    if (!this.isEnabled()) return;
    playTone({ frequency: 600, duration: 0.025, gain: 0.05, type: 'square' });
  },

  startRingtone() {
    if (!this.isEnabled()) return;
    if (ringtoneInterval) return;

    const playRing = () => {
      playNoteSequence([
        { frequency: 523.25, duration: 0.22, gain: 0.16 },
        { frequency: 659.25, duration: 0.22, gain: 0.16 },
        { frequency: 783.99, duration: 0.3, gain: 0.16 },
      ], 140);
    };

    playRing();
    ringtoneInterval = setInterval(playRing, 1500);
  },

  stopRingtone() {
    if (ringtoneInterval) {
      clearInterval(ringtoneInterval);
      ringtoneInterval = null;
    }
  },

  playCallConnect() {
    if (!this.isEnabled()) return;
    playNoteSequence([
      { frequency: 440, duration: 0.1, gain: 0.12 },
      { frequency: 554.37, duration: 0.1, gain: 0.12 },
      { frequency: 659.25, duration: 0.2, gain: 0.13 },
    ], 60);
  },

  playCallEnd() {
    if (!this.isEnabled()) return;
    playNoteSequence([
      { frequency: 659.25, duration: 0.14, gain: 0.12 },
      { frequency: 440, duration: 0.22, gain: 0.11 },
    ], 90);
  },

  playError() {
    if (!this.isEnabled()) return;
    playTone({ frequency: 200, duration: 0.25, type: 'sawtooth', gain: 0.1 });
  },
};
