export type Point = {
    x: number;
    y: number;
};

export type ThermalRing = {
    radius: number;
    verticalAir: number;
};

export type Thermal = {
    name: string;
    center: Point;
    rings: ThermalRing[];
};

export type SinkZone = {
    name: string;
    center: Point;
    radius: number;
    verticalAir: number;
};

export const worldWidth = 1200;
export const worldHeight = 700;

export const thermals: Thermal[] = [
    {
        name: "Thermal A",
        center: { x: 400, y: 220 },
        rings: [
            { radius: 40, verticalAir: 3.0 },
            { radius: 90, verticalAir: 2.0 },
            { radius: 150, verticalAir: 1.0 },
        ],
    },
    {
        name: "Thermal B",
        center: { x: 900, y: 200 },
        rings: [
            { radius: 60, verticalAir: 3.0 },
            { radius: 140, verticalAir: 2.0 },
            { radius: 240, verticalAir: 1.0 },
        ],
    },
];

export const sinkZones: SinkZone[] = [
    {
        name: "Sink",
        center: { x: 650, y: 520 },
        radius: 140,
        verticalAir: -2.0,
    },
];
