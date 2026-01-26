import type { MapDefinition, MapId, Point, SinkZone, TargetZone, Thermal, Turnpoint } from "../data/mvpMap";
import { worldHeight, worldWidth } from "../data/mvpMap";
import type { ThermikVisibility, WindConfig } from "../app/types";

export type WorldTransform = {
    a: number;
    b: number;
    c: number;
    d: number;
    offsetX: number;
    offsetY: number;
};

type ThermalField = Thermal & {
    amp: number;
    w: number;
    phase: number;
};

type SinkField = SinkZone & {
    amp: number;
    w: number;
    phase: number;
};

const THERMAL_COLORS = ["#e35b5b", "#f4a340", "#f5d86b"];
const SINK_COLOR = "#6aa5ff";
const BACKGROUND_COLOR = "#ffffff";
const THERMAL_FADE_OUT = 40;
const DRIFT_HEIGHT_M = 1000;
const DRIFT_TIME_EQUIV_SEC = 25;

export type MapRenderOptions = {
    visibility: ThermikVisibility;
    showLabels: boolean;
    showTurnpoints: boolean;
    drawBackground: boolean;
    completedTurnpoints: boolean[];
};

export class Map {
    public readonly worldWidth = worldWidth;
    public readonly worldHeight = worldHeight;
    private readonly thermals: ThermalField[];
    private readonly sinkZones: SinkField[];
    private readonly turnpoints: Turnpoint[];
    private readonly target: TargetZone;
    private readonly id: MapId;
    private windSettings: WindConfig = {
        windEnabled: false,
        windSpeedMps: 0,
        windDirDeg: 0,
        windIndicatorEnabled: true,
        thermalDriftEnabled: false,
        thermalDriftFactor: 0.6,
    };

    public constructor(definition: MapDefinition) {
        this.id = definition.id;
        this.target = definition.target;
        this.turnpoints = definition.turnpoints;
        this.thermals = definition.thermals.map((thermal, index) => ({
            ...thermal,
            amp: index === 0 ? 0.14 : 0.18,
            w: index === 0 ? 0.35 : 0.5,
            phase: index === 0 ? 0.3 : 1.2,
        }));
        this.sinkZones = definition.sinkZones.map((zone, index) => ({
            ...zone,
            amp: 0.08,
            w: 0.42 + index * 0.1,
            phase: 2.1 + index * 0.6,
        }));
    }

    public getId(): MapId {
        return this.id;
    }

    public getTarget(): TargetZone {
        return this.target;
    }

    public getTurnpoints(): Turnpoint[] {
        return this.turnpoints;
    }

    public setWindSettings(settings: WindConfig): void {
        this.windSettings = { ...settings };
    }

    public getVerticalAir(x: number, y: number, time: number, aglM: number): number {
        const drift = this.getDriftOffset(aglM);
        for (const zone of this.sinkZones) {
            const center = this.applyDrift(zone.center, drift);
            const dist = this.distance(x, y, center);
            if (dist <= zone.radius) {
                return zone.verticalAir * dynamicFactor(time, zone.amp, zone.w, zone.phase);
            }
        }

        for (const thermal of this.thermals) {
            const center = this.applyDrift(thermal.center, drift);
            const dist = this.distance(x, y, center);
            const lift = this.getThermalVerticalAir(dist, thermal, time);
            if (lift !== null) {
                return lift;
            }
        }

        return 0;
    }

    public render(
        ctx: CanvasRenderingContext2D,
        transform: WorldTransform,
        _time: number,
        options: MapRenderOptions,
    ): void {
        ctx.save();
        ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.offsetX, transform.offsetY);

        if (options.drawBackground) {
            ctx.fillStyle = BACKGROUND_COLOR;
            ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
        }

        if (options.visibility !== "hidden") {
            const drift = this.getDriftOffset(0);
            for (const zone of this.sinkZones) {
                const center = this.applyDrift(zone.center, drift);
                const sinkAlpha = options.drawBackground ? 1 : 0.45;
                ctx.save();
                ctx.globalAlpha *= sinkAlpha;
                ctx.fillStyle = SINK_COLOR;
                ctx.beginPath();
                ctx.arc(center.x, center.y, zone.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                if (options.showLabels) {
                    ctx.fillStyle = "#1a3f85";
                    ctx.font = "16px 'Space Grotesk', 'Trebuchet MS', sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("-2 m/s", center.x, center.y);
                }
            }

            for (const thermal of this.thermals) {
                const center = this.applyDrift(thermal.center, drift);
                const rings = [...thermal.rings].sort((a, b) => b.radius - a.radius);
                const thermalAlpha = options.drawBackground ? 1 : 0.45;
                ctx.save();
                ctx.globalAlpha *= thermalAlpha;
                rings.forEach((ring, index) => {
                    const colorIndex = rings.length - 1 - index;
                    ctx.fillStyle = THERMAL_COLORS[colorIndex] ?? THERMAL_COLORS[2];
                    ctx.beginPath();
                    ctx.arc(center.x, center.y, ring.radius, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();

                if (options.showLabels) {
                    const labelOffset = 18;
                    const ringLabels = thermal.rings.map((ring) => `${ring.verticalAir.toFixed(0)} m/s`);
                    ringLabels.forEach((label, index) => {
                        ctx.fillStyle = "#5a3a00";
                        ctx.font = "16px 'Space Grotesk', 'Trebuchet MS', sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(
                            label,
                            center.x,
                            center.y + (index - 1) * labelOffset,
                        );
                    });
                }
            }
        }

        if (options.showTurnpoints) {
            this.drawTurnpoints(ctx, options.showLabels, options.completedTurnpoints);
        }

        ctx.restore();
    }

    private distance(x: number, y: number, center: Point): number {
        const dx = x - center.x;
        const dy = y - center.y;
        return Math.hypot(dx, dy);
    }

    private getThermalVerticalAir(dist: number, thermal: ThermalField, time: number): number | null {
        const sortedRings = [...thermal.rings].sort((a, b) => a.radius - b.radius);
        const outerRadius = sortedRings[sortedRings.length - 1]?.radius ?? 0;
        const fadeLimit = outerRadius + THERMAL_FADE_OUT;
        if (dist > fadeLimit) {
            return null;
        }

        let base = 0;
        if (dist <= sortedRings[0].radius) {
            base = sortedRings[0].verticalAir;
        } else if (dist <= outerRadius) {
            for (let i = 0; i < sortedRings.length - 1; i += 1) {
                const inner = sortedRings[i];
                const outer = sortedRings[i + 1];
                if (dist >= inner.radius && dist <= outer.radius) {
                    const t = (dist - inner.radius) / Math.max(outer.radius - inner.radius, 1);
                    base = lerp(inner.verticalAir, outer.verticalAir, t);
                    break;
                }
            }
        }

        const factor = dynamicFactor(time, thermal.amp, thermal.w, thermal.phase);
        let value = base * factor;

        if (dist > outerRadius) {
            const fadeT = smoothstep(outerRadius, fadeLimit, dist);
            value = lerp(value, 0, fadeT);
        }

        return value;
    }

    private drawTurnpoints(ctx: CanvasRenderingContext2D, showLabels: boolean, completed: boolean[]): void {
        for (const [index, point] of this.turnpoints.entries()) {
            const isDone = completed[index] ?? false;
            ctx.fillStyle = isDone ? "rgba(70, 160, 90, 0.25)" : "rgba(80, 140, 190, 0.2)";
            ctx.strokeStyle = isDone ? "#2f7a4d" : "#2f5c8c";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(point.center.x, point.center.y, point.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isDone ? "#2f7a4d" : "#2f5c8c";
            ctx.font = "12px 'Space Grotesk', 'Trebuchet MS', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`min ${point.minAltitudeM} m`, point.center.x, point.center.y);

            if (showLabels) {
                ctx.font = "14px 'Space Grotesk', 'Trebuchet MS', sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText(point.name, point.center.x, point.center.y - point.radius - 6);
            }
        }
    }

    private getDriftOffset(aglM: number): Point {
        if (!this.windSettings.windEnabled || !this.windSettings.thermalDriftEnabled) {
            return { x: 0, y: 0 };
        }
        if (aglM <= 0) {
            return { x: 0, y: 0 };
        }
        const heightFactor = clamp(aglM / DRIFT_HEIGHT_M, 0, 1);
        const dirRad = (this.windSettings.windDirDeg * Math.PI) / 180;
        const driftSpeed = this.windSettings.windSpeedMps * this.windSettings.thermalDriftFactor;
        return {
            x: Math.cos(dirRad) * driftSpeed * DRIFT_TIME_EQUIV_SEC * heightFactor,
            y: Math.sin(dirRad) * driftSpeed * DRIFT_TIME_EQUIV_SEC * heightFactor,
        };
    }

    private applyDrift(center: Point, drift: Point): Point {
        const x = clamp(center.x + drift.x, 0, this.worldWidth);
        const y = clamp(center.y + drift.y, 0, this.worldHeight);
        return { x, y };
    }
}

const dynamicFactor = (time: number, amp: number, w: number, phase: number): number => {
    const raw = 1 + Math.sin(time * w + phase) * amp;
    return Math.min(Math.max(raw, 0.8), 1.2);
};

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

const smoothstep = (edge0: number, edge1: number, value: number): number => {
    if (edge0 === edge1) {
        return value < edge0 ? 0 : 1;
    }
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
