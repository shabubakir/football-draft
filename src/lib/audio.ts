/**
 * CS2 case-opening sounds generated via Web Audio API.
 * No external audio files needed — synthesized in-browser.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

/**
 * Play a short "click" sound when the spin starts.
 * Similar to the CS2 case-opening click.
 */
export function playSpinClick() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.1);
  } catch {
    // Audio not available
  }
}

/**
 * Play the "tick" sound as the wheel passes each card.
 * Short, subtle tick.
 */
export function playTick() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(2000, ac.currentTime);
    gain.gain.setValueAtTime(0.08, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.03);
  } catch {
    // Audio not available
  }
}

/**
 * Play the "reveal" sound when the result appears.
 * Different pitch based on rarity tier:
 *   0 = Mil-Spec (low, dull)
 *   1 = Restricted (medium)
 *   2 = Classified (higher)
 *   3 = Covert (high, bright)
 *   4 = Rare Special / Knife (triumphant chord)
 */
export function playReveal(tier: 0 | 1 | 2 | 3 | 4) {
  try {
    const ac = getCtx();
    const t = ac.currentTime;

    if (tier === 4) {
      // Knife/glove: triumphant 3-note chord
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t + i * 0.08);
        gain.gain.setValueAtTime(0, t + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, t + i * 0.08 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.8);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.8);
      });
      // Bass hit
      const bass = ac.createOscillator();
      const bg = ac.createGain();
      bass.type = "sine";
      bass.frequency.setValueAtTime(130.81, t); // C3
      bg.gain.setValueAtTime(0.3, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      bass.connect(bg);
      bg.connect(ac.destination);
      bass.start(t);
      bass.stop(t + 0.6);
    } else {
      // Regular: single tone that rises with rarity
      const baseFreq = 440 + tier * 110; // A4, C5, D5, E5
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.15);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.5);

      // Second harmonic for richness
      const osc2 = ac.createOscillator();
      const gain2 = ac.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(baseFreq * 2, t);
      gain2.gain.setValueAtTime(0.1, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc2.connect(gain2);
      gain2.connect(ac.destination);
      osc2.start(t);
      osc2.stop(t + 0.4);
    }
  } catch {
    // Audio not available
  }
}

/**
 * Play a "whoosh" sound for the spinning motion.
 * White noise burst with bandpass filter.
 */
export function playWhoosh() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    const duration = 0.4;
    const buffer = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(3000, t + duration);
    filter.Q.value = 2;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    source.start(t);
  } catch {
    // Audio not available
  }
}
