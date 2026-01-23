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
            if (dist <= zone.radius) {
                return zone.verticalAir;
            }
        }

        for (const thermal of this.thermals) {
            const dist = this.distance(x, y, thermal.center);
            for (const ring of thermal.rings) {
                if (dist <= ring.radius) {
                    return ring.verticalAir;
                }
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
}
