import { Map } from "./Map";

export type FlightState = {
    x: number;
    y: number;
    headingRad: number;
    speedMps: number;
    altitudeM: number;
    leftBrake: number;
    rightBrake: number;
    speedbarActive: boolean;
};

export type Telemetry = {
    vario: number;
    verticalAir: number;
    speedKmh: number;
    headingDeg: number;
    totalBrake: number;
    diffBrake: number;
    integratedVario: number;
    stall: boolean;
};

const RAMP_RATE = 2.0;
const TURN_RATE = 1.6;
const BASE_SINK = 1.0;
const SPEEDBAR_SINK = 0.3;
const BRAKE_SINK = 1.2;
const STALL_SINK = 0.8;
const TURN_SINK = 0.9;
const BRAKE_RESPONSE_EXP = 1.6;
const TURN_RESPONSE_EXP = 1.4;

const MIN_SPEED_KMH = 18;
const MAX_SPEED_KMH = 45;
const MIN_TURN_RADIUS_M = 15;
const VARIO_WINDOW_SEC = 18;

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
            speedbarActive: false,
        };

        this.telemetry = {
            vario: -1,
            verticalAir: 0,
            speedKmh: 36,
            headingDeg: 0,
            totalBrake: 0,
            diffBrake: 0,
            integratedVario: -1,
            stall: false,
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
        this.state.speedbarActive = false;
        this.varioHistory = [];
        this.varioHistoryTime = 0;
    }

    public step(
        dt: number,
        targets: { leftTarget: number; rightTarget: number; speedbarActive: boolean },
        map: Map,
    ): Telemetry {
        this.state.leftBrake = moveTowards(this.state.leftBrake, targets.leftTarget, RAMP_RATE * dt);
        this.state.rightBrake = moveTowards(this.state.rightBrake, targets.rightTarget, RAMP_RATE * dt);
        this.state.speedbarActive = targets.speedbarActive;

        const totalBrake = (this.state.leftBrake + this.state.rightBrake) / 2;
        const diffBrake = this.state.rightBrake - this.state.leftBrake;
        const totalBrakeResponse = Math.pow(totalBrake, BRAKE_RESPONSE_EXP);
        const diffBrakeResponse = applyCurve(diffBrake, TURN_RESPONSE_EXP);

        const targetSpeedKmh = this.state.speedbarActive ? 40 : 36;
        const brakeSpeedLossKmh = totalBrakeResponse * 14;
        const speedKmh = clamp(targetSpeedKmh - brakeSpeedLossKmh, MIN_SPEED_KMH, MAX_SPEED_KMH);
        const speedMps = speedKmh / 3.6;

        const stall = speedKmh < 24 || totalBrake > 0.8;
        const maxTurnRate = speedMps / MIN_TURN_RADIUS_M;
        const turnRateRaw = TURN_RATE * diffBrakeResponse;
        const turnRate = clamp(turnRateRaw, -maxTurnRate, maxTurnRate);
        const bankFactor = maxTurnRate > 0 ? Math.abs(turnRate) / maxTurnRate : 0;
        const sinkGlider =
            BASE_SINK +
            totalBrakeResponse * BRAKE_SINK +
            (this.state.speedbarActive ? SPEEDBAR_SINK : 0) +
            (stall ? STALL_SINK : 0) +
            bankFactor * bankFactor * TURN_SINK;

        const verticalAir = map.getVerticalAir(this.state.x, this.state.y);
        const vario = verticalAir - sinkGlider;
        const integratedVario = this.updateIntegratedVario(vario, dt);

        this.state.headingRad = wrapAngle(this.state.headingRad + turnRate * dt);
        this.state.speedMps = speedMps;

        this.state.x += Math.cos(this.state.headingRad) * speedMps * dt;
        this.state.y += Math.sin(this.state.headingRad) * speedMps * dt;

        this.state.x = clamp(this.state.x, 0, map.worldWidth);
        this.state.y = clamp(this.state.y, 0, map.worldHeight);

        this.state.altitudeM = Math.max(0, this.state.altitudeM + vario * dt);

        this.telemetry = {
            vario,
            verticalAir,
            speedKmh,
            headingDeg: toHeadingDeg(this.state.headingRad),
            totalBrake,
            diffBrake,
            integratedVario,
            stall,
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

const applyCurve = (value: number, exponent: number): number => {
    const sign = Math.sign(value);
    return sign * Math.pow(Math.abs(value), exponent);
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
