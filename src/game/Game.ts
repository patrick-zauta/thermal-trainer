import { ThermikVisibility } from "../app/types";
import type { FlightMode, Keybindings, RunConfig, RunSummary, TouchControlsMode, WindConfig } from "../app/types";
import { AudioVario } from "./AudioVario";
import { Hud } from "./Hud";
import { InputManager } from "./input";
import { Map, WorldTransform } from "./Map";
import { Physics, Telemetry } from "./Physics";
import type { ActionState } from "./input";
import type { MapDefinition, Turnpoint } from "../data/mvpMap";
import { MapManager } from "./map/MapManager";
import { chDemoMap } from "./map/maps/ch_demo";
import { WmtsRenderer } from "./render/WmtsRenderer";
import { TerrainHeightProvider } from "./terrain/TerrainHeightProvider";
import { getScenarioById } from "./challenge/scenarios";
import type { ChallengeScenario } from "./challenge/scenarios";
import { TaskTracker } from "./challenge/TaskTracker";
import type { TaskInfo } from "./challenge/TaskTracker";

const MAX_DT = 0.05;
type GameConfig = {
    runConfig: RunConfig;
    keybindings: Keybindings;
    audioEnabled: boolean;
    masterVolume: number;
    touchControls: TouchControlsMode;
    background: {
        wmtsEnabled: boolean;
        wmtsLayer: string;
        wmtsOpacity: number;
    };
    mapDefinition: MapDefinition;
};

export class Game {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly map: Map;
    private readonly mapDefinition: MapDefinition;
    private readonly mapManager: MapManager;
    private readonly wmtsRenderer: WmtsRenderer;
    private readonly terrainProvider: TerrainHeightProvider;
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
    private readonly startAltitudeOverride: number | null;
    private readonly mode: FlightMode;
    private readonly thermalVisibility: ThermikVisibility;
    private readonly targetAreaEnabled: boolean;
    private windSettings: WindConfig;
    private activeWindSettings: WindConfig;
    private backgroundSettings: { wmtsEnabled: boolean; wmtsLayer: string; wmtsOpacity: number };
    private terrainEnabled = true;
    private terrainMsl: number | null = null;
    private aglM: number | null = null;
    private spawnAltitudePending = true;
    private pauseCallback: ((paused: boolean) => void) | null = null;
    private paused = false;
    private debugEnabled = false;
    private endState: "none" | "winner" | "gameover" = "none";
    private endCallback: ((state: "winner" | "gameover") => void) | null = null;
    private turnpoints: Turnpoint[] = [];
    private turnpointIndex = 0;
    private turnpointsReached: boolean[] = [];
    private readonly challengeScenario: ChallengeScenario | null;
    private readonly taskTracker: TaskTracker | null;
    private taskInfo: TaskInfo | null = null;
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

        this.mapDefinition = config.mapDefinition;
        this.challengeScenario = getScenarioById(config.runConfig.scenarioId);
        this.mapManager = new MapManager(this.challengeScenario?.mapConfig ?? chDemoMap);
        this.map = new Map(
            this.mapDefinition,
            this.challengeScenario ? this.challengeScenario.thermalField : undefined,
        );
        const spawnWorld = this.challengeScenario ? this.challengeScenario.spawn : this.mapManager.getSpawnWorld();
        this.startX = spawnWorld.x;
        this.startY = spawnWorld.y;
        this.startAltitudeOverride = this.challengeScenario ? this.challengeScenario.startAltitudeM : null;
        this.terrainProvider = new TerrainHeightProvider(this.mapManager);
        this.mode = config.runConfig.mode;
        this.thermalVisibility = config.runConfig.thermikVisibility;
        this.targetAreaEnabled = this.challengeScenario ? true : config.runConfig.targetAreaEnabled;
        this.terrainEnabled = config.background.wmtsEnabled;
        const initialAltitude = this.resolveSpawnAltitude();
        this.physics = new Physics(this.startX, this.startY, initialAltitude);
        this.wmtsRenderer = new WmtsRenderer(this.mapManager);
        this.hud = new Hud();
        this.audio = new AudioVario();
        this.audio.setEnabled(config.audioEnabled);
        this.audio.setMasterVolume(config.masterVolume);

        this.telemetry = this.physics.telemetry;
        this.transform = { a: 1, b: 0, c: 0, d: 1, offsetX: 0, offsetY: 0 };

        this.windSettings = { ...config.runConfig.wind };
        this.activeWindSettings = this.resolveWindSettings(this.windSettings);
        this.map.setWindSettings(this.activeWindSettings);
        this.backgroundSettings = { ...config.background };
        this.turnpoints = this.map.getTurnpoints();
        this.turnpointsReached = new Array(this.turnpoints.length).fill(false);
        this.taskTracker = this.challengeScenario ? new TaskTracker(this.challengeScenario) : null;

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
        this.endState = "none";
        this.turnpointIndex = 0;
        this.turnpointsReached = new Array(this.turnpoints.length).fill(false);
        this.spawnAltitudePending = true;
        this.taskTracker?.reset();
        this.taskInfo = null;
        this.input.resetTargets();
        this.inputState = {
            leftBrakeTarget: 0,
            rightBrakeTarget: 0,
            speedbarPressed: false,
            pausePressed: false,
            debugTogglePressed: false,
        };
        const initialAltitude = this.resolveSpawnAltitude();
        this.activeWindSettings = this.resolveWindSettings(this.windSettings);
        this.map.setWindSettings(this.activeWindSettings);
        this.physics.reset(this.startX, this.startY, initialAltitude);
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
        if (enabled) {
            this.audio.ensureStarted();
        }
    }

    public setMasterVolume(volume: number): void {
        this.audio.setMasterVolume(volume);
    }

    public ensureAudioStarted(): void {
        this.audio.ensureStarted();
    }

    public setTouchControlsMode(mode: TouchControlsMode): void {
        this.input.setTouchMode(mode);
    }

    public setWindSettings(settings: WindConfig): void {
        this.windSettings = { ...settings };
        this.activeWindSettings = this.resolveWindSettings(this.windSettings);
        this.map.setWindSettings(this.activeWindSettings);
    }

    public setBackgroundSettings(settings: { wmtsEnabled: boolean; wmtsLayer: string; wmtsOpacity: number }): void {
        this.backgroundSettings = { ...settings };
    }

    public setEndCallback(callback: (state: "winner" | "gameover") => void): void {
        this.endCallback = callback;
    }

    public getSummary(): RunSummary {
        const endAltitude = this.physics.state.altitudeM;
        const netAltitude = endAltitude - this.stats.startAltitudeM;
        const avgClimb = this.stats.timeClimbSec > 0 ? this.stats.climbSum / this.stats.timeClimbSec : 0;
        return {
            mode: this.mode,
            mapId: this.map.getId(),
            mapDefinition: this.mapDefinition,
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
            turnpointEvents: this.stats.turnpointEvents,
            wind: { ...this.activeWindSettings },
            scenarioId: this.challengeScenario?.id,
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

        if (!this.paused && this.endState === "none") {
            this.time += dt;
        }

        if (!this.paused && this.endState === "none" && dt > 0) {
            this.map.update(dt, this.time, this.activeWindSettings);
            this.telemetry = this.physics.step(
                dt,
                {
                    leftTarget: this.inputState.leftBrakeTarget,
                    rightTarget: this.inputState.rightBrakeTarget,
                    speedbarTarget: this.inputState.speedbarPressed ? 1 : 0,
                },
                this.map,
                this.activeWindSettings,
            );
            this.audio.update(this.telemetry.vario, dt);
            this.updateTerrainData();
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

        this.wmtsRenderer.draw(this.ctx, this.transform, width, {
            enabled: this.backgroundSettings.wmtsEnabled && this.terrainEnabled,
            layer: this.backgroundSettings.wmtsLayer,
            opacity: this.backgroundSettings.wmtsOpacity,
        });

        this.map.render(this.ctx, this.transform, this.time, {
            visibility: this.thermalVisibility,
            showLabels: this.challengeScenario ? true : this.thermalVisibility === ThermikVisibility.Visible,
            showTurnpoints: this.targetAreaEnabled,
            drawBackground: !this.backgroundSettings.wmtsEnabled || !this.terrainEnabled,
            completedTurnpoints: this.turnpointsReached,
        });
        if (this.targetAreaEnabled) {
            this.renderTarget();
        }
        this.renderGlider();

        this.hud.render(this.ctx, width, height, {
            dt,
            altitudeM: this.physics.state.altitudeM,
            aglM: this.terrainEnabled ? this.aglM : null,
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
            taskInfo: this.taskInfo ?? undefined,
            taskCompletedText: this.challengeScenario && this.stats.targetReached ? "TASK ABGESCHLOSSEN" : undefined,
            nextTurnpoint: this.getNextTurnpointInfo(),
            turnpointProgress: this.getTurnpointProgress(),
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
                groundspeedKmh: this.telemetry.groundSpeedKmh,
                windSpeedMps: this.telemetry.windSpeedMps,
                windDirDeg: this.telemetry.windDirDeg,
                windVecX: this.telemetry.windVecX,
                windVecY: this.telemetry.windVecY,
                totalBrake: this.telemetry.totalBrake,
                diffBrake: this.telemetry.diffBrake,
                turnRate: this.telemetry.turnRate,
                turnInput: this.telemetry.turnInput,
                rTarget: this.telemetry.rTarget,
                yawRateRad: this.telemetry.yawRateRad,
                slipBeta: this.telemetry.slipBeta,
                bankPhiRad: this.telemetry.bankPhiRad,
            },
            windIndicatorEnabled: this.windSettings.windEnabled && this.windSettings.windIndicatorEnabled,
            windSpeedMps: this.telemetry.windSpeedMps,
            windDirDeg: this.telemetry.windDirDeg,
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
        const target = this.map.getTarget();
        const { a, b, c, d, offsetX, offsetY } = this.transform;
        const x = a * target.center.x + c * target.center.y + offsetX;
        const y = b * target.center.x + d * target.center.y + offsetY;
        const scale = Math.hypot(a, b);

        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.strokeStyle = this.stats.targetReached ? "#2a6b2a" : "#5a5a5a";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, target.radius * scale, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    private togglePause(): void {
        if (this.endState !== "none") {
            return;
        }
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

        if (this.endState === "none") {
            if ((this.aglM !== null && this.aglM <= 0) || (this.aglM === null && altitude <= 0)) {
                this.endRun("gameover");
                return;
            }
            if (this.challengeScenario && this.taskTracker) {
                const update = this.taskTracker.update(
                    { x: this.physics.state.x, y: this.physics.state.y },
                    this.physics.state.altitudeM,
                );
                this.taskInfo = this.taskTracker.getTaskInfo(
                    { x: this.physics.state.x, y: this.physics.state.y },
                    this.physics.state.headingRad,
                );
                if (update.reachedTurnpointIndex !== null) {
                    const reached = this.turnpoints[update.reachedTurnpointIndex];
                    if (reached) {
                        this.turnpointsReached[update.reachedTurnpointIndex] = true;
                        this.stats.turnpointEvents.push({
                            name: reached.name,
                            timeSec: this.stats.durationSec,
                            altitudeM: this.physics.state.altitudeM,
                            minAltitudeM: reached.minAltitudeM,
                        });
                    }
                }
                if (update.completed) {
                    this.stats.targetReached = true;
                    this.endRun("winner");
                    return;
                }
            } else if (this.targetAreaEnabled) {
                this.checkTurnpointProgress();
                if (!this.stats.targetReached && this.turnpointIndex >= this.turnpoints.length) {
                    const target = this.map.getTarget();
                    const dx = this.physics.state.x - target.center.x;
                    const dy = this.physics.state.y - target.center.y;
                    if (Math.hypot(dx, dy) <= target.radius) {
                        this.stats.targetReached = true;
                        this.endRun("winner");
                        return;
                    }
                }
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

    private endRun(state: "winner" | "gameover"): void {
        if (this.endState !== "none") {
            return;
        }
        this.endState = state;
        this.paused = true;
        this.input.resetTargets();
        if (this.endCallback) {
            this.endCallback(state);
        }
    }

    private checkTurnpointProgress(): void {
        if (this.challengeScenario) {
            return;
        }
        if (!this.targetAreaEnabled) {
            return;
        }
        const next = this.turnpoints[this.turnpointIndex];
        if (!next) {
            return;
        }
        const dx = this.physics.state.x - next.center.x;
        const dy = this.physics.state.y - next.center.y;
        if (Math.hypot(dx, dy) <= next.radius && this.physics.state.altitudeM >= next.minAltitudeM) {
            this.turnpointsReached[this.turnpointIndex] = true;
            this.stats.turnpointEvents.push({
                name: next.name,
                timeSec: this.stats.durationSec,
                altitudeM: this.physics.state.altitudeM,
                minAltitudeM: next.minAltitudeM,
            });
            this.turnpointIndex += 1;
        }
    }

    private getNextTurnpointInfo(): { name: string; distanceM: number; bearingRad: number } | null {
        if (this.challengeScenario) {
            return null;
        }
        if (!this.targetAreaEnabled) {
            return null;
        }
        const next = this.turnpoints[this.turnpointIndex];
        if (!next) {
            return null;
        }
        const dx = next.center.x - this.physics.state.x;
        const dy = next.center.y - this.physics.state.y;
        const distance = Math.hypot(dx, dy);
        const bearing = Math.atan2(dy, dx);
        const relative = wrapSignedAngle(bearing - this.physics.state.headingRad);
        return {
            name: next.name,
            distanceM: distance,
            bearingRad: relative,
        };
    }

    private getTurnpointProgress(): { completed: number; total: number } {
        if (this.challengeScenario) {
            return { completed: 0, total: 0 };
        }
        if (!this.targetAreaEnabled) {
            return { completed: 0, total: 0 };
        }
        return {
            completed: this.turnpointsReached.filter(Boolean).length + (this.stats.targetReached ? 1 : 0),
            total: this.turnpoints.length + 1,
        };
    }

    private updateTerrainData(): void {
        if (!this.terrainEnabled) {
            this.terrainMsl = null;
            this.aglM = null;
            return;
        }
        if (this.spawnAltitudePending) {
            this.applySpawnAltitudeIfReady();
        }
        this.terrainMsl = this.terrainProvider.getHeightAtWorld(this.physics.state.x, this.physics.state.y);
        if (this.terrainMsl === null) {
            this.aglM = null;
        } else {
            this.aglM = this.physics.state.altitudeM - this.terrainMsl;
        }
    }

    private resolveSpawnAltitude(): number {
        if (this.startAltitudeOverride !== null) {
            this.spawnAltitudePending = false;
            return this.startAltitudeOverride;
        }
        if (!this.terrainEnabled) {
            this.spawnAltitudePending = false;
            return this.mapManager.getConfig().startAGL_m;
        }
        const spawn = this.mapManager.getConfig().spawnLv95;
        const terrain = this.terrainProvider.getHeightAtLv95(spawn.easting, spawn.northing);
        if (terrain !== null) {
            this.spawnAltitudePending = false;
            return terrain + this.mapManager.getConfig().startAGL_m;
        }
        this.spawnAltitudePending = true;
        return this.mapManager.getConfig().startAGL_m;
    }

    private applySpawnAltitudeIfReady(): void {
        if (this.startAltitudeOverride !== null) {
            this.spawnAltitudePending = false;
            return;
        }
        if (!this.terrainEnabled) {
            this.spawnAltitudePending = false;
            return;
        }
        const spawn = this.mapManager.getConfig().spawnLv95;
        const terrain = this.terrainProvider.getHeightAtLv95(spawn.easting, spawn.northing);
        if (terrain === null) {
            return;
        }
        const altitude = terrain + this.mapManager.getConfig().startAGL_m;
        this.physics.state.altitudeM = altitude;
        this.stats.startAltitudeM = altitude;
        if (altitude > this.stats.maxAltitudeM) {
            this.stats.maxAltitudeM = altitude;
        }
        this.spawnAltitudePending = false;
    }

    private resolveWindSettings(settings: WindConfig): WindConfig {
        if (!settings.windEnabled) {
            return {
                ...settings,
                windSpeedMps: 0,
                windDirDeg: 0,
            };
        }
        return { ...settings };
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
    turnpointEvents: [] as RunSummary["turnpointEvents"],
});

const wrapSignedAngle = (value: number): number => {
    const twoPi = Math.PI * 2;
    let wrapped = (value + Math.PI) % twoPi;
    if (wrapped < 0) {
        wrapped += twoPi;
    }
    return wrapped - Math.PI;
};
