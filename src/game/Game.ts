import type { Keybindings, ModeId, RunSummary, ThermalVisibility, TouchControlsMode } from "../app/types";
import { AudioVario } from "./AudioVario";
import { Hud } from "./Hud";
import { InputManager } from "./input";
import { Map, WorldTransform } from "./Map";
import { Physics, Telemetry } from "./Physics";
import type { ActionState } from "./input";

const MAX_DT = 0.05;
const TARGET_RADIUS = 50;
const TARGET_CENTER = { x: 1050, y: 600 };

type GameConfig = {
    mode: ModeId;
    thermalVisibility: ThermalVisibility;
    keybindings: Keybindings;
    audioEnabled: boolean;
    masterVolume: number;
    touchControls: TouchControlsMode;
};

export class Game {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly map: Map;
    private readonly input: InputManager;
    private readonly physics: Physics;
    private readonly hud: Hud;
    private readonly audio: AudioVario;
    private telemetry: Telemetry;
    private transform: WorldTransform;
    private inputState: ActionState = {
        leftBrakeTarget: 0,
        rightBrakeTarget: 0,
        speedbarPressed: false,
        pausePressed: false,
        debugTogglePressed: false,
    };
    private readonly startX: number;
    private readonly startY: number;
    private readonly mode: ModeId;
    private readonly thermalVisibility: ThermalVisibility;
    private pauseCallback: ((paused: boolean) => void) | null = null;
    private paused = false;
    private debugEnabled = false;
    private time = 0;
    private lastTime = 0;
    private frameId: number | null = null;
    private stats = createStats();
    private pathAccumulator = 0;
    private lastStall = false;

    public constructor(canvas: HTMLCanvasElement, config: GameConfig) {
        this.canvas = canvas;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Canvas 2D context not available.");
        }
        this.ctx = context;

        this.map = new Map();
        this.startX = 200;
        this.startY = this.map.worldHeight / 2;
        this.physics = new Physics(this.startX, this.startY);
        this.hud = new Hud();
        this.audio = new AudioVario();
        this.audio.setEnabled(config.audioEnabled);
        this.audio.setMasterVolume(config.masterVolume);

        this.telemetry = this.physics.telemetry;
        this.transform = { a: 1, b: 0, c: 0, d: 1, offsetX: 0, offsetY: 0 };

        this.mode = config.mode;
        this.thermalVisibility = config.thermalVisibility;

        this.input = new InputManager(canvas, config.keybindings, config.touchControls, {
            onFirstInput: () => this.audio.ensureStarted(),
        });

        window.addEventListener("resize", this.handleResize);
        this.handleResize();
        this.resetStats();
    }

    public start(): void {
        this.frameId = requestAnimationFrame(this.loop);
    }

    public stop(): void {
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        this.input.dispose();
        window.removeEventListener("resize", this.handleResize);
        this.audio.stop();
        this.audio.dispose();
    }

    public reset(): void {
        this.paused = false;
        this.input.resetTargets();
        this.inputState = {
            leftBrakeTarget: 0,
            rightBrakeTarget: 0,
            speedbarPressed: false,
            pausePressed: false,
            debugTogglePressed: false,
        };
        this.physics.reset(this.startX, this.startY);
        this.telemetry = this.physics.telemetry;
        this.time = 0;
        this.lastTime = 0;
        this.resetStats();
    }

    public setPaused(paused: boolean): void {
        this.paused = paused;
        if (this.pauseCallback) {
            this.pauseCallback(paused);
        }
    }

    public setPauseCallback(callback: (paused: boolean) => void): void {
        this.pauseCallback = callback;
    }

    public setKeybindings(keybindings: Keybindings): void {
        this.input.setKeybindings(keybindings);
    }

    public setAudioEnabled(enabled: boolean): void {
        this.audio.setEnabled(enabled);
    }

    public setMasterVolume(volume: number): void {
        this.audio.setMasterVolume(volume);
    }

    public setTouchControlsMode(mode: TouchControlsMode): void {
        this.input.setTouchMode(mode);
    }

    public getSummary(): RunSummary {
        const endAltitude = this.physics.state.altitudeM;
        const netAltitude = endAltitude - this.stats.startAltitudeM;
        const avgClimb = this.stats.timeClimbSec > 0 ? this.stats.climbSum / this.stats.timeClimbSec : 0;
        return {
            mode: this.mode,
            durationSec: this.stats.durationSec,
            startAltitudeM: this.stats.startAltitudeM,
            endAltitudeM: endAltitude,
            maxAltitudeM: this.stats.maxAltitudeM,
            netAltitudeM: netAltitude,
            avgClimbMps: avgClimb,
            timeClimbSec: this.stats.timeClimbSec,
            timeSinkSec: this.stats.timeSinkSec,
            stallCount: this.stats.stallCount,
            targetReached: this.stats.targetReached,
            samples: this.stats.samples,
        };
    }

    private loop = (timestamp: number): void => {
        const dtRaw = (timestamp - this.lastTime) / 1000;
        const dt = this.lastTime === 0 ? 0 : Math.min(dtRaw, MAX_DT);
        this.lastTime = timestamp;
        this.input.update(dt);
        this.inputState = this.input.getState();

        if (this.inputState.pausePressed) {
            this.togglePause();
        }
        if (this.inputState.debugTogglePressed) {
            this.toggleDebug();
        }

        if (!this.paused) {
            this.time += dt;
        }

        if (!this.paused && dt > 0) {
            this.telemetry = this.physics.step(
                dt,
                {
                    leftTarget: this.inputState.leftBrakeTarget,
                    rightTarget: this.inputState.rightBrakeTarget,
                    speedbarTarget: this.inputState.speedbarPressed ? 1 : 0,
                },
                this.map,
                this.time,
            );
            this.audio.update(this.telemetry.vario, dt);
            this.updateStats(dt);
        } else {
            this.audio.update(0, dt);
        }

        this.render(dt);
        this.frameId = requestAnimationFrame(this.loop);
    };

    private render(dt: number): void {
        const { width, height } = this.canvas;
        const controlsVisible = this.input.prepareControls(width, height);
        this.transform = computeTransform(
            width,
            height,
            this.map.worldWidth,
            this.map.worldHeight,
            this.physics.state.x,
            this.physics.state.y,
            this.physics.state.headingRad,
        );

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(0, 0, width, height);

        this.map.render(this.ctx, this.transform, {
            visibility: this.thermalVisibility,
            showLabels: this.thermalVisibility === "visible",
        });
        if (this.mode === "training") {
            this.renderTarget();
        }
        this.renderGlider();

        this.hud.render(this.ctx, width, height, {
            altitudeM: this.physics.state.altitudeM,
            telemetry: this.telemetry,
            leftBrake: this.physics.state.leftBrake,
            rightBrake: this.physics.state.rightBrake,
            leftBrakeTarget: this.inputState.leftBrakeTarget,
            rightBrakeTarget: this.inputState.rightBrakeTarget,
            paused: this.paused,
            stall: this.telemetry.stall,
            speedbarTarget: this.inputState.speedbarPressed ? 1 : 0,
            targetReached: this.stats.targetReached,
            debug: this.debugEnabled,
            touchControlsVisible: controlsVisible,
            debugMetrics: {
                dt,
                fps: dt > 0 ? 1 / dt : 0,
                verticalAir: this.telemetry.verticalAir,
                sinkPolar: this.telemetry.sinkPolar,
                brakePenalty: this.telemetry.brakePenalty,
                sinkGlider: this.telemetry.sinkGlider,
                vario: this.telemetry.vario,
                speedbarAmount: this.telemetry.speedbarAmount,
                airspeedKmh: this.telemetry.airspeedKmh,
                totalBrake: this.telemetry.totalBrake,
                diffBrake: this.telemetry.diffBrake,
                turnRate: this.telemetry.turnRate,
                turnInput: this.telemetry.turnInput,
                rTarget: this.telemetry.rTarget,
                yawRateRad: this.telemetry.yawRateRad,
                slipBeta: this.telemetry.slipBeta,
                bankPhiRad: this.telemetry.bankPhiRad,
            },
        });

        this.input.renderControls(this.ctx, {
            leftTarget: this.inputState.leftBrakeTarget,
            rightTarget: this.inputState.rightBrakeTarget,
            speedbarPressed: this.inputState.speedbarPressed,
        });
    }

    private renderGlider(): void {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        const wingSpan = 52;
        const wingChord = 14;
        const halfSpan = wingSpan / 2;
        const halfChord = wingChord / 2;

        this.ctx.fillStyle = "#303030";
        this.ctx.fillRect(-halfSpan, -halfChord, wingSpan, wingChord);

        this.ctx.fillStyle = "#111111";
        this.ctx.beginPath();
        this.ctx.moveTo(0, -halfChord - 10);
        this.ctx.lineTo(6, -halfChord);
        this.ctx.lineTo(-6, -halfChord);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    private renderTarget(): void {
        const { a, b, c, d, offsetX, offsetY } = this.transform;
        const x = a * TARGET_CENTER.x + c * TARGET_CENTER.y + offsetX;
        const y = b * TARGET_CENTER.x + d * TARGET_CENTER.y + offsetY;
        const scale = Math.hypot(a, b);

        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.strokeStyle = this.stats.targetReached ? "#2a6b2a" : "#5a5a5a";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, TARGET_RADIUS * scale, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    private togglePause(): void {
        this.setPaused(!this.paused);
    }

    private toggleDebug(): void {
        this.debugEnabled = !this.debugEnabled;
    }

    private handleResize = (): void => {
        const ratio = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = Math.max(1, Math.floor(rect.width * ratio));
        this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    };

    private resetStats(): void {
        this.stats = createStats();
        this.stats.startAltitudeM = this.physics.state.altitudeM;
        this.stats.maxAltitudeM = this.physics.state.altitudeM;
        this.lastStall = false;
        this.pathAccumulator = 0;
    }

    private updateStats(dt: number): void {
        this.stats.durationSec += dt;
        const altitude = this.physics.state.altitudeM;
        if (altitude > this.stats.maxAltitudeM) {
            this.stats.maxAltitudeM = altitude;
        }

        const vario = this.telemetry.vario;
        if (vario > 0.2) {
            this.stats.timeClimbSec += dt;
            this.stats.climbSum += vario * dt;
        } else if (vario < -1.1) {
            this.stats.timeSinkSec += dt;
        }

        if (this.telemetry.stall && !this.lastStall) {
            this.stats.stallCount += 1;
        }
        this.lastStall = this.telemetry.stall;

        if (this.mode === "training" && !this.stats.targetReached) {
            const dx = this.physics.state.x - TARGET_CENTER.x;
            const dy = this.physics.state.y - TARGET_CENTER.y;
            if (Math.hypot(dx, dy) <= TARGET_RADIUS) {
                this.stats.targetReached = true;
            }
        }

        this.pathAccumulator += dt;
        while (this.pathAccumulator >= 0.2) {
            this.stats.samples.push({
                timeSec: this.stats.durationSec,
                x: this.physics.state.x,
                y: this.physics.state.y,
                vario: this.telemetry.vario,
                altitudeM: this.physics.state.altitudeM,
            });
            this.pathAccumulator -= 0.2;
        }
    }
}

const computeTransform = (
    canvasWidth: number,
    canvasHeight: number,
    worldWidth: number,
    worldHeight: number,
    focusX: number,
    focusY: number,
    headingRad: number,
): WorldTransform => {
    const scale = Math.min(canvasWidth / worldWidth, canvasHeight / worldHeight);
    const rotation = -(headingRad + Math.PI / 2);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const a = scale * cos;
    const b = scale * sin;
    const c = -scale * sin;
    const d = scale * cos;
    const offsetX = canvasWidth / 2 - (a * focusX + c * focusY);
    const offsetY = canvasHeight / 2 - (b * focusX + d * focusY);
    return { a, b, c, d, offsetX, offsetY };
};

const createStats = () => ({
    durationSec: 0,
    startAltitudeM: 0,
    maxAltitudeM: 0,
    timeClimbSec: 0,
    timeSinkSec: 0,
    climbSum: 0,
    stallCount: 0,
    targetReached: false,
    samples: [] as RunSummary["samples"],
});
