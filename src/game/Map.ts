import type { MapDefinition, MapId, TargetZone, Turnpoint } from "../data/mvpMap";
import { worldHeight, worldWidth } from "../data/mvpMap";
import type { ThermikVisibility, WindConfig } from "../app/types";
import { ThermalField } from "./thermal/ThermalField";
import type { SinkBlob, ThermalComponent } from "./thermal/ThermalField";

export type WorldTransform = {
    a: number;
    b: number;
    c: number;
    d: number;
    offsetX: number;
    offsetY: number;
};

const BACKGROUND_COLOR = "#ffffff";

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
    private readonly thermalField: ThermalField;
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

    public constructor(definition: MapDefinition, overrideField?: { components: ThermalComponent[]; sinks: SinkBlob[] }) {
        this.id = definition.id;
        this.target = definition.target;
        this.turnpoints = definition.turnpoints;
        const fieldConfig = overrideField ?? buildThermalField(definition);
        this.thermalField = new ThermalField(
            this.worldWidth,
            this.worldHeight,
            fieldConfig.components,
            fieldConfig.sinks,
        );
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

    public update(dt: number, time: number, wind: WindConfig = this.windSettings): void {
        this.thermalField.update(dt, time, wind);
    }

    public getVerticalAir(x: number, y: number): number {
        return this.thermalField.sampleVerticalAir(x, y);
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

        this.thermalField.renderOverlay(ctx, options.visibility, {
            alphaScale: options.drawBackground ? 1 : 0.55,
        });

        if (options.showTurnpoints) {
            this.drawTurnpoints(ctx, options.showLabels, options.completedTurnpoints);
        }

        ctx.restore();
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
            if (point.minAltitudeM > 0) {
                ctx.fillText(`min ${point.minAltitudeM} m`, point.center.x, point.center.y);
            }

            if (showLabels) {
                ctx.font = "14px 'Space Grotesk', 'Trebuchet MS', sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText(point.name, point.center.x, point.center.y - point.radius - 6);
            }
        }
    }

}

const buildThermalField = (
    definition: MapDefinition,
): { components: ThermalComponent[]; sinks: SinkBlob[] } => {
    if (definition.id === "basis" || definition.id === "swisstopo") {
        return {
            components: [
                {
                    baseCenter: { x: 290, y: 520 },
                    wMax: 2.4,
                    sigmaX: 160,
                    sigmaY: 120,
                    rotationRad: 0.3,
                    driftFactor: 1.0,
                    wobbleAmp: 8,
                    wobbleFreq: 0.22,
                    phase: 0.4,
                },
                {
                    baseCenter: { x: 340, y: 500 },
                    wMax: 1.8,
                    sigmaX: 180,
                    sigmaY: 140,
                    rotationRad: -0.2,
                    driftFactor: 0.9,
                    wobbleAmp: 6,
                    wobbleFreq: 0.2,
                    phase: 1.2,
                },
                {
                    baseCenter: { x: 600, y: 160 },
                    wMax: 3.0,
                    sigmaX: 260,
                    sigmaY: 150,
                    rotationRad: 0.9,
                    driftFactor: 1.1,
                    wobbleAmp: 10,
                    wobbleFreq: 0.18,
                    phase: 2.1,
                },
                {
                    baseCenter: { x: 980, y: 320 },
                    wMax: 2.2,
                    sigmaX: 180,
                    sigmaY: 140,
                    rotationRad: 0.5,
                    driftFactor: 0.8,
                    wobbleAmp: 7,
                    wobbleFreq: 0.2,
                    phase: 2.7,
                },
            ],
            sinks: [
                {
                    baseCenter: { x: 700, y: 480 },
                    wMax: -2.1,
                    sigma: 260,
                    driftFactor: 1.0,
                    wobbleAmp: 6,
                    wobbleFreq: 0.16,
                    phase: 1.1,
                },
            ],
        };
    }

    const components: ThermalComponent[] = definition.thermals.map((thermal, index) => {
        const maxRing = thermal.rings.reduce((acc, ring) => Math.max(acc, ring.verticalAir), 1);
        const outerRadius = thermal.rings.reduce((acc, ring) => Math.max(acc, ring.radius), 120);
        return {
            baseCenter: thermal.center,
            wMax: maxRing,
            sigmaX: outerRadius * 0.7,
            sigmaY: outerRadius * 0.55,
            rotationRad: index % 2 === 0 ? 0.2 : -0.3,
            driftFactor: 1.0,
            wobbleAmp: 6,
            wobbleFreq: 0.2 + index * 0.03,
            phase: index * 1.1,
        };
    });

    const sinks: SinkBlob[] = definition.sinkZones.map((zone, index) => ({
        baseCenter: zone.center,
        wMax: zone.verticalAir,
        sigma: zone.radius * 0.8,
        driftFactor: 1.0,
        wobbleAmp: 4,
        wobbleFreq: 0.14 + index * 0.02,
        phase: 1.5 + index * 0.5,
    }));

    return { components, sinks };
};
