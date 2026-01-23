import { AudioVario } from "./AudioVario";
import { Hud } from "./Hud";
import { Input } from "./Input";
import { Map, WorldTransform } from "./Map";
import { Physics, Telemetry } from "./Physics";

const MAX_DT = 0.05;

export class Game {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly map: Map;
    private readonly input: Input;
    private readonly physics: Physics;
    private readonly hud: Hud;
    private readonly audio: AudioVario;
    private lastTime = 0;
    private time = 0;
    private paused = false;
    private telemetry: Telemetry;
    private transform: WorldTransform;
    private readonly startX: number;
    private readonly startY: number;

    public constructor(canvas: HTMLCanvasElement) {
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

        this.telemetry = this.physics.telemetry;
        this.transform = { scale: 1, offsetX: 0, offsetY: 0 };

        this.input = new Input({
            onPauseToggle: () => this.togglePause(),
            onReset: () => this.reset(),
            onFirstInput: () => this.audio.ensureStarted(),
        });

        window.addEventListener("resize", this.handleResize);
        this.handleResize();
    }

    public start(): void {
        requestAnimationFrame(this.loop);
    }

    private loop = (timestamp: number): void => {
        const dtRaw = (timestamp - this.lastTime) / 1000;
        const dt = this.lastTime === 0 ? 0 : Math.min(dtRaw, MAX_DT);
        this.lastTime = timestamp;
        this.time += dt;

        this.input.update(dt);

        if (!this.paused) {
            this.telemetry = this.physics.step(
                dt,
                {
                    leftTarget: this.input.leftTarget,
                    rightTarget: this.input.rightTarget,
                    speedbarActive: this.input.speedbarActive,
                },
                this.map,
            );
            this.audio.update(this.telemetry.vario, dt);
        } else {
            this.audio.update(0, dt);
        }

        this.render();
        requestAnimationFrame(this.loop);
    };

    private render(): void {
        const { width, height } = this.canvas;
        this.transform = computeTransform(width, height, this.map.worldWidth, this.map.worldHeight);

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = "#cfcfcf";
        this.ctx.fillRect(0, 0, width, height);

        this.map.render(this.ctx, this.transform);
        this.renderGlider();
        this.hud.render(this.ctx, width, height, this.time, {
            altitudeM: this.physics.state.altitudeM,
            telemetry: this.telemetry,
            leftBrake: this.physics.state.leftBrake,
            rightBrake: this.physics.state.rightBrake,
            paused: this.paused,
            stall: this.telemetry.stall,
            speedbarActive: this.physics.state.speedbarActive,
        });
    }

    private renderGlider(): void {
        const { scale, offsetX, offsetY } = this.transform;
        this.ctx.save();
        this.ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
        this.ctx.translate(this.physics.state.x, this.physics.state.y);
        this.ctx.rotate(this.physics.state.headingRad);

        this.ctx.fillStyle = "#303030";
        this.ctx.fillRect(-10, -5, 20, 10);

        this.ctx.fillStyle = "#111111";
        this.ctx.beginPath();
        this.ctx.moveTo(10, 0);
        this.ctx.lineTo(18, -5);
        this.ctx.lineTo(18, 5);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    private togglePause(): void {
        this.paused = !this.paused;
    }

    private reset(): void {
        this.paused = false;
        this.input.resetTargets();
        this.physics.reset(this.startX, this.startY);
        this.telemetry = this.physics.telemetry;
    }

    private handleResize = (): void => {
        const ratio = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = Math.max(1, Math.floor(rect.width * ratio));
        this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    };
}

const computeTransform = (
    canvasWidth: number,
    canvasHeight: number,
    worldWidth: number,
    worldHeight: number,
): WorldTransform => {
    const scale = Math.min(canvasWidth / worldWidth, canvasHeight / worldHeight);
    const offsetX = (canvasWidth - worldWidth * scale) / 2;
    const offsetY = (canvasHeight - worldHeight * scale) / 2;
    return { scale, offsetX, offsetY };
};
