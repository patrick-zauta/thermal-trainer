import { Map } from "./Map";
import type { WindSettings } from "../app/types";

export type FlightState = {
    x: number;
    y: number;
    headingRad: number;
    speedMps: number;
    altitudeM: number;
    leftBrake: number;
    rightBrake: number;
    speedbarAmount: number;
    yawRateRad: number;
    slipBeta: number;
    bankPhiRad: number;
};

export type Telemetry = {
    vario: number;
    integratedVario: number;
    verticalAir: number;
    speedKmh: number;
    groundSpeedKmh: number;
    airspeedKmh: number;
    baseAirspeedKmh: number;
    headingDeg: number;
    totalBrake: number;
    diffBrake: number;
    turnInput: number;
    rTarget: number;
    yawRateRad: number;
    slipBeta: number;
    bankPhiRad: number;
    sinkPolar: number;
    brakePenalty: number;
    sinkGlider: number;
    turnRate: number;
    stall: boolean;
    speedbarAmount: number;
    windSpeedMps: number;
    windDirDeg: number;
    windVecX: number;
    windVecY: number;
};

const BRAKE_RAMP_RATE = 2.0;
const SPEEDBAR_RAMP_RATE = 0.4;
const BASE_TURN_RATE = (Math.PI * 2) / 13;
const VREF_MPS = 36 / 3.6;
const TAU_R = 0.35;
const TAU_BETA = 0.7;
const TAU_PHI = 0.9;
const K_BETA = 1.8;
const K_PHI = 1.0;
const YAW_RATE_LIMIT = 0.9;
const BETA_LIMIT = 1.0;
const PHI_LIMIT = 1.2;
const BANK_SINK = 0.25;

const MIN_SPEED_KMH = 18;
const MAX_SPEED_KMH = 50;
const STALL_SINK = 0.8;

const VARIO_WINDOW_SEC = 18;

const POLAR_TABLE: Array<{ speed: number; sink: number }> = [
    { speed: 24, sink: 1.15 },
    { speed: 28, sink: 0.95 },
    { speed: 30, sink: 0.9 },
    { speed: 33, sink: 0.95 },
    { speed: 36, sink: 1.0 },
    { speed: 40, sink: 1.12 },
    { speed: 45, sink: 1.25 },
];

export class Physics {
    public state: FlightState;
    public telemetry: Telemetry;
    private varioHistory: Array<{ dt: number; vario: number }> = [];
    private varioHistoryTime = 0;

    public constructor(startX: number, startY: number) {
        this.state = {
            x: startX,
            y: startY,
            headingRad: 0,
            speedMps: 36 / 3.6,
            altitudeM: 500,
            leftBrake: 0,
            rightBrake: 0,
            speedbarAmount: 0,
            yawRateRad: 0,
            slipBeta: 0,
            bankPhiRad: 0,
        };

        this.telemetry = {
            vario: -1,
            integratedVario: -1,
            verticalAir: 0,
            speedKmh: 36,
            groundSpeedKmh: 36,
            airspeedKmh: 36,
            baseAirspeedKmh: 36,
            headingDeg: 0,
            totalBrake: 0,
            diffBrake: 0,
            turnInput: 0,
            rTarget: 0,
            yawRateRad: 0,
            slipBeta: 0,
            bankPhiRad: 0,
            sinkPolar: 1.0,
            brakePenalty: 0,
            sinkGlider: 1.0,
            turnRate: 0,
            stall: false,
            speedbarAmount: 0,
            windSpeedMps: 0,
            windDirDeg: 0,
            windVecX: 0,
            windVecY: 0,
        };
    }

    public reset(startX: number, startY: number): void {
        this.state.x = startX;
        this.state.y = startY;
        this.state.headingRad = 0;
        this.state.speedMps = 36 / 3.6;
        this.state.altitudeM = 500;
        this.state.leftBrake = 0;
        this.state.rightBrake = 0;
        this.state.speedbarAmount = 0;
        this.state.yawRateRad = 0;
        this.state.slipBeta = 0;
        this.state.bankPhiRad = 0;
        this.varioHistory = [];
        this.varioHistoryTime = 0;
    }

    public step(
        dt: number,
        targets: { leftTarget: number; rightTarget: number; speedbarTarget: number },
        map: Map,
        time: number,
        wind: WindSettings,
    ): Telemetry {
        this.state.leftBrake = moveTowards(this.state.leftBrake, targets.leftTarget, BRAKE_RAMP_RATE * dt);
        this.state.rightBrake = moveTowards(this.state.rightBrake, targets.rightTarget, BRAKE_RAMP_RATE * dt);
        this.state.speedbarAmount = moveTowards(this.state.speedbarAmount, targets.speedbarTarget, SPEEDBAR_RAMP_RATE * dt);

        const totalBrake = (this.state.leftBrake + this.state.rightBrake) / 2;
        const diffBrake = this.state.rightBrake - this.state.leftBrake;
        const turnInput = clamp(diffBrake, -1, 1);

        const baseAirspeedKmh = lerp(36, 45, this.state.speedbarAmount);
        const brakeSpeedLossKmh = totalBrake * 14;
        const airspeedKmh = clamp(baseAirspeedKmh - brakeSpeedLossKmh, MIN_SPEED_KMH, MAX_SPEED_KMH);
        const speedMps = airspeedKmh / 3.6;

        const speedScale = clamp(VREF_MPS / Math.max(speedMps, 0.1), 0.7, 1.4);
        const rTarget = turnInput * BASE_TURN_RATE * speedScale;
        const rDot = (rTarget - this.state.yawRateRad) / TAU_R;
        this.state.yawRateRad = clamp(this.state.yawRateRad + rDot * dt, -YAW_RATE_LIMIT, YAW_RATE_LIMIT);

        const betaTarget = K_BETA * this.state.yawRateRad;
        const betaDot = (betaTarget - this.state.slipBeta) / TAU_BETA;
        this.state.slipBeta = clamp(this.state.slipBeta + betaDot * dt, -BETA_LIMIT, BETA_LIMIT);

        const phiTarget = K_PHI * this.state.slipBeta;
        const phiDot = (phiTarget - this.state.bankPhiRad) / TAU_PHI;
        this.state.bankPhiRad = clamp(this.state.bankPhiRad + phiDot * dt, -PHI_LIMIT, PHI_LIMIT);

        const sinkPolar = interpolatePolar(airspeedKmh);
        const brakePenalty = totalBrake > 0.25 ? (totalBrake - 0.25) * 1.8 : 0;
        const stall = airspeedKmh < 24 || totalBrake > 0.8;

        const sinkGlider =
            sinkPolar +
            brakePenalty +
            (stall ? STALL_SINK : 0) +
            (Math.abs(this.state.bankPhiRad) / PHI_LIMIT) * BANK_SINK;

        const verticalAir = map.getVerticalAir(this.state.x, this.state.y, time);
        const vario = verticalAir - sinkGlider;
        const integratedVario = this.updateIntegratedVario(vario, dt);

        this.state.headingRad = wrapAngle(this.state.headingRad + this.state.yawRateRad * dt);
        this.state.speedMps = speedMps;

        const windVector = getWindVector(wind);
        const airVecX = Math.cos(this.state.headingRad) * speedMps;
        const airVecY = Math.sin(this.state.headingRad) * speedMps;
        const groundVecX = airVecX + windVector.x;
        const groundVecY = airVecY + windVector.y;

        this.state.x += groundVecX * dt;
        this.state.y += groundVecY * dt;

        this.state.x = clamp(this.state.x, 0, map.worldWidth);
        this.state.y = clamp(this.state.y, 0, map.worldHeight);

        this.state.altitudeM = Math.max(0, this.state.altitudeM + vario * dt);

        const groundSpeedKmh = Math.hypot(groundVecX, groundVecY) * 3.6;

        this.telemetry = {
            vario,
            integratedVario,
            verticalAir,
            speedKmh: groundSpeedKmh,
            groundSpeedKmh,
            airspeedKmh,
            baseAirspeedKmh,
            headingDeg: toHeadingDeg(this.state.headingRad),
            totalBrake,
            diffBrake,
            turnInput,
            rTarget,
            yawRateRad: this.state.yawRateRad,
            slipBeta: this.state.slipBeta,
            bankPhiRad: this.state.bankPhiRad,
            sinkPolar,
            brakePenalty,
            sinkGlider,
            turnRate: this.state.yawRateRad,
            stall,
            speedbarAmount: this.state.speedbarAmount,
            windSpeedMps: wind.windEnabled ? wind.windSpeedMps : 0,
            windDirDeg: wind.windEnabled ? wind.windDirDeg : 0,
            windVecX: windVector.x,
            windVecY: windVector.y,
        };

        return this.telemetry;
    }

    private updateIntegratedVario(vario: number, dt: number): number {
        if (dt <= 0) {
            return this.computeIntegratedVario();
        }

        this.varioHistory.push({ dt, vario });
        this.varioHistoryTime += dt;

        while (this.varioHistoryTime > VARIO_WINDOW_SEC && this.varioHistory.length > 0) {
            const excess = this.varioHistoryTime - VARIO_WINDOW_SEC;
            const first = this.varioHistory[0];
            if (first.dt <= excess) {
                this.varioHistory.shift();
                this.varioHistoryTime -= first.dt;
            } else {
                first.dt -= excess;
                this.varioHistoryTime -= excess;
                break;
            }
        }

        return this.computeIntegratedVario();
    }

    private computeIntegratedVario(): number {
        if (this.varioHistoryTime <= 0) {
            return 0;
        }

        let total = 0;
        for (const sample of this.varioHistory) {
            total += sample.vario * sample.dt;
        }
        return total / this.varioHistoryTime;
    }
}

const interpolatePolar = (speedKmh: number): number => {
    if (speedKmh <= POLAR_TABLE[0].speed) {
        return POLAR_TABLE[0].sink;
    }
    if (speedKmh >= POLAR_TABLE[POLAR_TABLE.length - 1].speed) {
        return POLAR_TABLE[POLAR_TABLE.length - 1].sink;
    }

    for (let i = 0; i < POLAR_TABLE.length - 1; i += 1) {
        const current = POLAR_TABLE[i];
        const next = POLAR_TABLE[i + 1];
        if (speedKmh >= current.speed && speedKmh <= next.speed) {
            const t = (speedKmh - current.speed) / (next.speed - current.speed);
            return lerp(current.sink, next.sink, t);
        }
    }

    return POLAR_TABLE[POLAR_TABLE.length - 1].sink;
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

const moveTowards = (current: number, target: number, maxDelta: number): number => {
    const delta = target - current;
    if (Math.abs(delta) <= maxDelta) {
        return target;
    }
    return current + Math.sign(delta) * maxDelta;
};

const lerp = (min: number, max: number, t: number): number => {
    return min + (max - min) * t;
};

const wrapAngle = (value: number): number => {
    const twoPi = Math.PI * 2;
    let wrapped = value % twoPi;
    if (wrapped < 0) {
        wrapped += twoPi;
    }
    return wrapped;
};

const toHeadingDeg = (headingRad: number): number => {
    const deg = (headingRad * 180) / Math.PI;
    return Math.round((deg + 360) % 360);
};

const getWindVector = (wind: WindSettings): { x: number; y: number } => {
    if (!wind.windEnabled || wind.windSpeedMps <= 0) {
        return { x: 0, y: 0 };
    }
    const dirRad = (wind.windDirDeg * Math.PI) / 180;
    return {
        x: Math.cos(dirRad) * wind.windSpeedMps,
        y: Math.sin(dirRad) * wind.windSpeedMps,
    };
};
