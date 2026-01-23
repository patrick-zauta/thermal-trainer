type VarioMode = "silent" | "climb" | "sink";

export class AudioVario {
    private context: AudioContext | null = null;
    private oscillator: OscillatorNode | null = null;
    private gainNode: GainNode | null = null;
    private started = false;
    private mode: VarioMode = "silent";
    private climbTimer = 0;
    private sinkTimer = 0;
    private masterVolume = 0.6;
    private enabled = true;

    public ensureStarted(): void {
        if (this.started) {
            return;
        }

        const AudioContextClass =
            window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
            return;
        }

        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0;

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start();

        void context.resume();

        this.context = context;
        this.oscillator = oscillator;
        this.gainNode = gainNode;
        this.started = true;
    }

    public setMasterVolume(volume: number): void {
        this.masterVolume = clamp(volume, 0, 1);
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (this.gainNode && this.context) {
            this.gainNode.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
        }
    }

    public update(vario: number, dt: number): void {
        if (!this.started || !this.context || !this.oscillator || !this.gainNode) {
            return;
        }

        const nextMode = selectMode(vario);
        if (nextMode !== this.mode) {
            this.mode = nextMode;
            this.climbTimer = 0;
            this.sinkTimer = 0;
        }

        const now = this.context.currentTime;
        let targetGain = 0;
        let targetFreq = this.oscillator.frequency.value;

        if (this.mode === "climb") {
            const normalized = clamp((vario - 0.2) / (3.0 - 0.2), 0, 1);
            targetFreq = lerp(800, 1600, normalized);

            const pipHz = lerp(1.5, 8, normalized);
            const pipPeriod = 1 / pipHz;
            this.climbTimer = (this.climbTimer + dt) % pipPeriod;

            const attack = 0.01;
            const sustain = 0.05;
            const release = 0.03;
            const pipDuration = attack + sustain + release;

            if (this.climbTimer <= pipDuration) {
                targetGain = 0.18 * envelope(this.climbTimer, attack, sustain, release);
            } else {
                targetGain = 0;
            }
        } else if (this.mode === "sink") {
            const normalized = clamp((-1.1 - vario) / (3.0 - 1.1), 0, 1);
            targetFreq = lerp(250, 400, normalized);

            const period = 1.0;
            this.sinkTimer = (this.sinkTimer + dt) % period;
            const onDuration = 0.6;
            targetGain = this.sinkTimer <= onDuration ? 0.12 : 0;
        } else {
            targetGain = 0;
        }

        const volume = this.enabled ? this.masterVolume : 0;
        this.oscillator.frequency.setTargetAtTime(targetFreq, now, 0.02);
        this.gainNode.gain.setTargetAtTime(targetGain * volume, now, 0.02);
    }

    public stop(): void {
        if (!this.context || !this.oscillator || !this.gainNode) {
            return;
        }
        this.gainNode.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
    }

    public dispose(): void {
        if (this.context && this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
        }
        if (this.gainNode) {
            this.gainNode.disconnect();
        }
        if (this.context) {
            void this.context.close();
        }
        this.context = null;
        this.oscillator = null;
        this.gainNode = null;
        this.started = false;
    }
}

const selectMode = (vario: number): VarioMode => {
    if (vario > 0.2) {
        return "climb";
    }
    if (vario < -1.1) {
        return "sink";
    }
    return "silent";
};

const envelope = (time: number, attack: number, sustain: number, release: number): number => {
    if (time <= attack) {
        return time / attack;
    }
    if (time <= attack + sustain) {
        return 1;
    }
    if (time <= attack + sustain + release) {
        return 1 - (time - attack - sustain) / release;
    }
    return 0;
};

const lerp = (min: number, max: number, t: number): number => {
    return min + (max - min) * t;
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
