// Procedural sound synthesis via WebAudio API — no external audio files.

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private creakTimer: ReturnType<typeof setTimeout> | null = null;
  private stepTimer = 0;
  private heartbeatTimer = 0;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx?.state === "suspended") {
      this.ctx.resume();
    }
  }

  // ---------- Ambient sound: low hum + occasional metallic creaks ----------
  startAmbient() {
    if (!this.ctx || !this.masterGain) return;
    // Restart-safe: never stack two ambient layers on repeated start() calls
    if (this.ambientNodes.length > 0) return;

    // Low frequency hum
    const hum = this.ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 40;
    const humGain = this.ctx.createGain();
    humGain.gain.value = 0.08;
    hum.connect(humGain).connect(this.masterGain);
    hum.start();
    this.ambientNodes.push(hum, humGain);

    // Second layer: slightly detuned
    const hum2 = this.ctx.createOscillator();
    hum2.type = "triangle";
    hum2.frequency.value = 60;
    const hum2Gain = this.ctx.createGain();
    hum2Gain.gain.value = 0.04;
    hum2.connect(hum2Gain).connect(this.masterGain);
    hum2.start();
    this.ambientNodes.push(hum2, hum2Gain);

    // Random metallic creaks
    const scheduleCreak = () => {
      if (!this.ctx) return;
      this.playMetallicCreak();
      const delay = 3000 + Math.random() * 8000;
      this.creakTimer = setTimeout(scheduleCreak, delay);
    };
    this.creakTimer = setTimeout(scheduleCreak, 2000);
  }

  stopAmbient() {
    if (this.creakTimer !== null) {
      clearTimeout(this.creakTimer);
      this.creakTimer = null;
    }
    this.ambientNodes.forEach((n) => {
      try {
        if (n instanceof OscillatorNode) n.stop();
        n.disconnect();
      } catch {
        // already stopped — ignore
      }
    });
    this.ambientNodes = [];
  }

  // ---------- Footsteps ----------
  playStep(isRunning: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    const buffer = this.createNoiseBuffer(0.1);
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = isRunning ? 800 : 400;
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isRunning ? 0.3 : 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    noise.connect(filter).connect(gain).connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.1);
  }

  // ---------- Heartbeat (when monster is close) ----------
  playHeartbeat(intensity: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 50;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4 * intensity, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  // ---------- Monster growl/roar ----------
  playMonsterSound(intensity: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(filter).connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  // ---------- Pickup sound ----------
  playPickup() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // ---------- Room light switch: short click + fluorescent buzz-in ----------
  playRoomLight() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Switch click
    const click = this.ctx.createOscillator();
    click.type = "square";
    click.frequency.value = 1200;
    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.08, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    click.connect(clickGain).connect(this.masterGain);
    click.start(t);
    click.stop(t + 0.05);

    // Fluorescent buzz (a few cycles of 120Hz)
    const buzz = this.ctx.createOscillator();
    buzz.type = "sawtooth";
    buzz.frequency.value = 120;
    const buzzFilter = this.ctx.createBiquadFilter();
    buzzFilter.type = "lowpass";
    buzzFilter.frequency.value = 900;
    const buzzGain = this.ctx.createGain();
    buzzGain.gain.setValueAtTime(0.0001, t + 0.05);
    buzzGain.gain.exponentialRampToValueAtTime(0.05, t + 0.25);
    buzzGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    buzz.connect(buzzFilter).connect(buzzGain).connect(this.masterGain);
    buzz.start(t);
    buzz.stop(t + 0.5);
  }

  // ---------- Door/generator sound ----------
  playMechanical() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Rattle
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 200 + i * 100;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.08);

      osc.connect(gain).connect(this.masterGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.08);
    }
  }

  // ---------- Death sound ----------
  playDeath() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.5);
  }

  // ---------- Win sound ----------
  playWin() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    [400, 500, 600, 800].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.3, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.4);

      osc.connect(gain).connect(this.masterGain!);
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.4);
    });
  }

  // ---------- Per-frame update: footsteps + heartbeat ----------
  update(dt: number, playerMoving: boolean, playerRunning: boolean, monsterProximity: number) {
    if (!this.ctx) return;

    // Footsteps
    if (playerMoving) {
      const stepInterval = playerRunning ? 0.3 : 0.5;
      this.stepTimer += dt;
      if (this.stepTimer >= stepInterval) {
        this.stepTimer = 0;
        this.playStep(playerRunning);
      }
    } else {
      this.stepTimer = 0;
    }

    // Heartbeat when monster is close
    if (monsterProximity > 0.5) {
      this.heartbeatTimer += dt;
      const interval = 0.8 - monsterProximity * 0.4; // faster when closer
      if (this.heartbeatTimer >= interval) {
        this.heartbeatTimer = 0;
        this.playHeartbeat(monsterProximity);
      }
    }
  }

  // ---------- Helpers ----------
  private createNoiseBuffer(duration: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playMetallicCreak() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300 + Math.random() * 500, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 500;
    filter.Q.value = 10;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(filter).connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  dispose() {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
