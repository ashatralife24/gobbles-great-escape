// Gobble's Great Escape — all sound is synthesised with WebAudio.
// No audio files are loaded, so the game stays fully offline. Every
// sound is a few oscillators shaped by hand; the gobble is a burst of
// fast pitch blips, the way a real turkey sounds when it is in a hurry.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  return {
    unlock() { ensure(); },
    setMuted(value) { muted = value; },
    get muted() { return muted; },
    gobble() {
      // Five quick "gob-gob-gob" blips, falling in pitch.
      for (let i = 0; i < 5; i += 1) tone(340 - i * 28, 0.09, 'square', 0.07, 180 - i * 12, i * 0.075);
    },
    jump() { tone(280, 0.16, 'sine', 0.1, 620); },
    corn() { tone(880, 0.1, 'triangle', 0.1); tone(1320, 0.12, 'triangle', 0.08, null, 0.06); },
    gravy() {
      // A slide-whistle fall: the farmer going down.
      tone(900, 0.5, 'sine', 0.11, 140);
      tone(220, 0.2, 'triangle', 0.08, 110, 0.35);
    },
    stumble() { tone(160, 0.25, 'sawtooth', 0.12, 70); },
    hide() { tone(520, 0.12, 'sine', 0.07, 380); },
    fanfare() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => tone(n, 0.28, 'triangle', 0.11, null, i * 0.13));
      tone(1319, 0.5, 'triangle', 0.09, null, 0.55);
    },
    caught() {
      const notes = [392, 330, 262, 196];
      notes.forEach((n, i) => tone(n, 0.3, 'sawtooth', 0.08, null, i * 0.17));
    },
  };
}
