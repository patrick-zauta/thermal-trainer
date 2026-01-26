import type { MapDefinition, Thermal, Turnpoint } from "../../data/mvpMap";
import { worldHeight, worldWidth } from "../../data/mvpMap";
import type { RandomMapSettings } from "../../app/types";

const BASE_RINGS = [
    { radius: 40, verticalAir: 3.0 },
    { radius: 90, verticalAir: 2.0 },
    { radius: 150, verticalAir: 1.0 },
];

export const createRandomMap = (settings: RandomMapSettings): MapDefinition => {
    const thermalCount = clamp(Math.round(settings.thermalCount), 1, 4);
    const turnpointCount = clamp(Math.round(settings.turnpointCount), 1, 2);
    const strength = clamp(settings.strength, 0.7, 1.4);
    const targetRadius = clamp(settings.targetRadius, 35, 80);

    const centers: Array<{ x: number; y: number }> = [];
    const minDistance = 180;
    const margin = 120;

    const thermals: Thermal[] = [];
    for (let i = 0; i < thermalCount; i += 1) {
        const center = placePoint(centers, margin, minDistance);
        centers.push(center);
        const ringScale = randomBetween(0.9, 1.15);
        thermals.push({
            name: `Thermik ${i + 1}`,
            center,
            rings: BASE_RINGS.map((ring) => ({
                radius: ring.radius * ringScale,
                verticalAir: ring.verticalAir * strength,
            })),
        });
    }

    const turnpoints: Turnpoint[] = [];
    for (let i = 0; i < turnpointCount; i += 1) {
        const center = placePoint(centers, margin, minDistance);
        centers.push(center);
        turnpoints.push({
            name: `TP${i + 1}`,
            center,
            radius: 28,
            minAltitudeM: Math.round(randomBetween(520, 740)),
        });
    }

    const targetCenter = placePoint(centers, margin, minDistance);

    return {
        id: "random",
        name: "Zufall",
        thermals,
        sinkZones: [],
        turnpoints,
        target: { center: targetCenter, radius: targetRadius },
    };
};

const placePoint = (
    existing: Array<{ x: number; y: number }>,
    margin: number,
    minDistance: number,
): { x: number; y: number } => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        const candidate = {
            x: randomBetween(margin, worldWidth - margin),
            y: randomBetween(margin, worldHeight - margin),
        };
        const ok = existing.every((point) => distance(point, candidate) >= minDistance);
        if (ok) {
            return candidate;
        }
    }
    return {
        x: randomBetween(margin, worldWidth - margin),
        y: randomBetween(margin, worldHeight - margin),
    };
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
};

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
