/**
 * procedurally generates high-fidelity minimalist sounds
 * inspired by apple's sound design (sine waves, harmonic intervals, soft envelopes)
 */
class AudioRuntime {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (this.ctx || typeof window === 'undefined') return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    setEnabled(val) {
        this.enabled = val;
    }

    /**
     * Apple-style "Harmonic Pop"
     * Clean, soft, high-frequency dual-tone
     */
    async playSuccess() {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();

        const now = this.ctx.currentTime;
        
        // Harmonic interval (Pure 5th)
        this._ping(880, now, 0.15); // A5
        this._ping(1318.51, now + 0.05, 0.2); // E6
    }

    /**
     * Suble "System Tap" 
     * Very short, percussive sine wave
     */
    async playNotify() {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        
        const now = this.ctx.currentTime;
        this._ping(987.77, now, 0.1, 0.05); // B5, very short
    }

    /**
     * "Thinking Complete" Chime
     * Ascending triad
     */
    async playComplete() {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        
        const now = this.ctx.currentTime;
        this._ping(523.25, now, 0.1); // C5
        this._ping(659.25, now + 0.1, 0.1); // E5
        this._ping(783.99, now + 0.2, 0.2); // G5
    }

    /**
     * Apple Mouse "Click"
     * High-frequency percussive impulse
     */
    async playClick() {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        const now = this.ctx.currentTime;
        this._ping(1800, now, 0.05, 0.02); // Sharp high-frequency tick
    }

    /**
     * Soft "Tactile" Tap
     */
    async playSoftTap() {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        const now = this.ctx.currentTime;
        this._ping(400, now, 0.02, 0.05); // Lower frequency soft thud
    }

    _ping(freq, startTime, volume = 0.1, duration = 0.3) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Exponential decay envelope (The secret to the "Apple" feel)
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
    }
}

export const audioRuntime = new AudioRuntime();
