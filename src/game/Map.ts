import type { Point, SinkZone, Thermal } from "../data/mvpMap";
import { sinkZones, thermals, worldHeight, worldWidth } from "../data/mvpMap";
import type { ThermalVisibility } from "../app/types";

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
const THERMAL_EDGE_SINK = -1;
const THERMAL_FADE_OUT = 40;

export type MapRenderOptions = {
    visibility: ThermalVisibility;
    showLabels: boolean;
};

export class Map {
    public readonly worldWidth = worldWidth;
    public readonly worldHeight = worldHeight;
    private readonly thermals: ThermalField[];
    private readonly sinkZones: SinkField[];

    public constructor() {
        this.thermals = thermals.map((thermal, index) => ({
            ...thermal,
            amp: index === 0 ? 0.14 : 0.18,
            w: index === 0 ? 0.35 : 0.5,
            phase: index === 0 ? 0.3 : 1.2,
        }));
        this.sinkZones = sinkZones.map((zone, index) => ({
            ...zone,
            amp: 0.08,
            w: 0.42 + index * 0.1,
            phase: 2.1 + index * 0.6,
        }));
    }

    public getVerticalAir(x: number, y: number, time: number): number {
        for (const zone of this.sinkZones) {
            const dist = this.distance(x, y, zone.center);
            if (dist <= zone.radius) {
                return zone.verticalAir * dynamicFactor(time, zone.amp, zone.w, zone.phase);
            }
        }

        for (const thermal of this.thermals) {
            const dist = this.distance(x, y, thermal.center);
            const lift = this.getThermalVerticalAir(dist, thermal, time);
            if (lift !== null) {
                return lift;
            }
        }

        return 0;
    }

    public render(ctx: CanvasRenderingContext2D, transform: WorldTransform, options: MapRenderOptions): void {
        ctx.save();
        ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.offsetX, transform.offsetY);

        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

        if (options.visibility !== "hidden") {
            for (const zone of this.sinkZones) {
                ctx.fillStyle = SINK_COLOR;
                ctx.beginPath();
                ctx.arc(zone.center.x, zone.center.y, zone.radius, 0, Math.PI * 2);
                ctx.fill();

                if (options.showLabels) {
                    ctx.fillStyle = "#1a3f85";
                    ctx.font = "16px 'Space Grotesk', 'Trebuchet MS', sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("-2 m/s", zone.center.x, zone.center.y);
                }
            }

            for (const thermal of this.thermals) {
                const rings = [...thermal.rings].sort((a, b) => b.radius - a.radius);
                rings.forEach((ring, index) => {
                    const colorIndex = rings.length - 1 - index;
                    ctx.fillStyle = THERMAL_COLORS[colorIndex] ?? THERMAL_COLORS[2];
                    ctx.beginPath();
                    ctx.arc(thermal.center.x, thermal.center.y, ring.radius, 0, Math.PI * 2);
                    ctx.fill();
                });

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
                            thermal.center.x,
                            thermal.center.y + (index - 1) * labelOffset,
                        );
                    });
                }
            }
        }

        ctx.restore();
    }

    private distance(x: number, y: number, center: Point): number {
        const dx = x - center.x;
        const dy = y - center.y;
        return Math.hypot(dx, dy);
    }

    private getThermalVerticalAir(dist: number, thermal: ThermalField, time: number): number | null {
        const outerRadius = Math.max(...thermal.rings.map((ring) => ring.radius));
        const peak = Math.max(...thermal.rings.map((ring) => ring.verticalAir));
        const fadeLimit = outerRadius + THERMAL_FADE_OUT;
        if (dist > fadeLimit) {
            return null;
        }

        const t = clamp(dist / outerRadius, 0, 1);
        const base = lerp(peak, THERMAL_EDGE_SINK, smoothstep(0, 1, t));
        const factor = dynamicFactor(time, thermal.amp, thermal.w, thermal.phase);
        let value = base * factor;

        if (dist > outerRadius) {
            const fadeT = smoothstep(outerRadius, fadeLimit, dist);
            value = lerp(value, 0, fadeT);
        }

        return value;
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
