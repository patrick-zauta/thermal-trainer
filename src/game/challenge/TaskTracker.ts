import type { Point } from "../../data/mvpMap";
import type { ChallengeScenario } from "./scenarios";

export type TaskInfo = {
    label: string;
    distanceM: number;
    bearingRad: number | null;
};

export type TaskUpdate = {
    reachedTurnpointIndex: number | null;
    completed: boolean;
};

type TaskState = "beforeStart" | "leg" | "completed";

export class TaskTracker {
    private readonly scenario: ChallengeScenario;
    private state: TaskState = "beforeStart";
    private legIndex = 0;

    public constructor(scenario: ChallengeScenario) {
        this.scenario = scenario;
    }

    public reset(): void {
        this.state = "beforeStart";
        this.legIndex = 0;
    }

    public update(position: Point, altitudeM: number): TaskUpdate {
        if (this.state === "completed") {
            return { reachedTurnpointIndex: null, completed: true };
        }

        if (this.state === "beforeStart") {
            const distance = this.distance(position, this.scenario.spawn);
            if (distance >= this.scenario.startExitRadius) {
                this.state = "leg";
                this.legIndex = 0;
            }
            return { reachedTurnpointIndex: null, completed: false };
        }

        const target = this.getCurrentTarget();
        if (!target) {
            return { reachedTurnpointIndex: null, completed: false };
        }
        const distance = this.distance(position, target.center);
        if (distance <= target.radius) {
            if (this.legIndex < this.scenario.turnpoints.length) {
                const reachedIndex = this.legIndex;
                this.legIndex += 1;
                return { reachedTurnpointIndex: reachedIndex, completed: false };
            }
            if (altitudeM >= this.scenario.goal.minAltitudeM) {
                this.state = "completed";
                return { reachedTurnpointIndex: null, completed: true };
            }
        }

        return { reachedTurnpointIndex: null, completed: false };
    }

    public getTaskInfo(position: Point, headingRad: number): TaskInfo {
        if (this.state === "beforeStart") {
            const distance = Math.max(0, this.scenario.startExitRadius - this.distance(position, this.scenario.spawn));
            return {
                label: "Start: rausfliegen",
                distanceM: distance,
                bearingRad: null,
            };
        }

        const target = this.getCurrentTarget();
        if (!target) {
            return {
                label: "Task abgeschlossen",
                distanceM: 0,
                bearingRad: null,
            };
        }
        const dx = target.center.x - position.x;
        const dy = target.center.y - position.y;
        const bearing = Math.atan2(dy, dx);
        const relative = wrapSignedAngle(bearing - headingRad);
        return {
            label: target.label,
            distanceM: Math.hypot(dx, dy),
            bearingRad: relative,
        };
    }

    public isCompleted(): boolean {
        return this.state === "completed";
    }

    private getCurrentTarget(): { label: string; center: Point; radius: number } | null {
        if (this.state !== "leg") {
            return null;
        }
        if (this.legIndex < this.scenario.turnpoints.length) {
            const tp = this.scenario.turnpoints[this.legIndex];
            return { label: tp.name, center: tp.center, radius: tp.radius };
        }
        return {
            label: "Goal: Landung",
            center: this.scenario.goal.center,
            radius: this.scenario.goal.radius,
        };
    }

    private distance(a: Point, b: Point): number {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }
}

const wrapSignedAngle = (value: number): number => {
    const twoPi = Math.PI * 2;
    let wrapped = (value + Math.PI) % twoPi;
    if (wrapped < 0) {
        wrapped += twoPi;
    }
    return wrapped - Math.PI;
};
