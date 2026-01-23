import type { Point, SinkZone, Thermal } from "../data/mvpMap";
import { sinkZones, thermals, worldHeight, worldWidth } from "../data/mvpMap";

export type WorldTransform = {
    scale: number;
    a: number;
    b: number;
    c: number;
    d: number;
    offsetX: number;
    offsetY: number;
};

const THERMAL_COLORS = ["#e35b5b", "#f4a340", "#f5d86b"];
const SINK_COLOR = "#6aa5ff";
const NULL_COLOR = "#e4e4e4";
const THERMAL_FADE_OUT = 80;
const SINK_EDGE_SOFTEN = 30;

export class Map {
    public readonly worldWidth = worldWidth;
    public readonly worldHeight = worldHeight;
    private readonly thermals: Thermal[];
    private readonly sinkZones: SinkZone[];

    public constructor() {
        this.thermals = thermals;
        this.sinkZones = sinkZones;
    }

    public getVerticalAir(x: number, y: number): number {
        for (const zone of this.sinkZones) {
            const dist = this.distance(x, y, zone.center);
            const sink = this.getSinkVerticalAir(dist, zone.radius, zone.verticalAir);
            if (sink !== null) {
                return sink;
            }
        }

        for (const thermal of this.thermals) {
            const dist = this.distance(x, y, thermal.center);
            const thermalLift = this.getThermalVerticalAir(dist, thermal.rings);
            if (thermalLift !== null) {
                return thermalLift;
            }
        }

        return 0;
    }

    public render(ctx: CanvasRenderingContext2D, transform: WorldTransform): void {
        ctx.save();
        ctx.setTransform(
            transform.a,
            transform.b,
            transform.c,
            transform.d,
            transform.offsetX,
            transform.offsetY,
        );

        ctx.fillStyle = NULL_COLOR;
        ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

        for (const zone of this.sinkZones) {
            ctx.fillStyle = SINK_COLOR;
            ctx.beginPath();
            ctx.arc(zone.center.x, zone.center.y, zone.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#1a3f85";
            ctx.font = "16px 'Space Grotesk', 'Trebuchet MS', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("-2 m/s", zone.center.x, zone.center.y);
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

        ctx.restore();
    }

    private distance(x: number, y: number, center: Point): number {
        const dx = x - center.x;
        const dy = y - center.y;
        return Math.hypot(dx, dy);
    }

    private getSinkVerticalAir(dist: number, radius: number, verticalAir: number): number | null {
        const edge = Math.max(1, SINK_EDGE_SOFTEN);
        const inner = Math.max(0, radius - edge);
        const outer = radius + edge;
        if (dist > outer) {
            return null;
        }
        if (dist <= inner) {
            return verticalAir;
        }
        const t = smoothstep(inner, outer, dist);
        return lerp(verticalAir, 0, t);
    }

    private getThermalVerticalAir(
        dist: number,
        rings: Thermal["rings"],
    ): number | null {
        const sorted = [...rings].sort((a, b) => a.radius - b.radius);
        for (let index = 0; index < sorted.length; index += 1) {
            const ring = sorted[index];
            if (dist <= ring.radius) {
                if (index === 0) {
                    return ring.verticalAir;
                }
                const inner = sorted[index - 1];
                const t = smoothstep(inner.radius, ring.radius, dist);
                return lerp(inner.verticalAir, ring.verticalAir, t);
            }
        }

        const outer = sorted[sorted.length - 1];
        const fadeLimit = outer.radius + THERMAL_FADE_OUT;
        if (dist <= fadeLimit) {
            const t = smoothstep(outer.radius, fadeLimit, dist);
            return lerp(outer.verticalAir, 0, t);
        }

        return null;
    }
}

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

const smoothstep = (edge0: number, edge1: number, value: number): number => {
    if (edge0 === edge1) {
        return value < edge0 ? 0 : 1;
    }
    const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
};
