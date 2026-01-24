import type { Keybindings } from "../../app/types";
import type { ActionState } from "./types";

type KeyboardCallbacks = {
    onFirstInput: () => void;
};

const BRAKE_TARGET_RATE = 2.0;

export class KeyboardInput {
    private keybindings: Keybindings;
    private readonly pressed = new Set<string>();
    private leftTarget = 0;
    private rightTarget = 0;
    private speedbarPressed = false;
    private pausePressed = false;
    private debugTogglePressed = false;
    private hasInteracted = false;
    private readonly callbacks: KeyboardCallbacks;

    public constructor(keybindings: Keybindings, callbacks: KeyboardCallbacks) {
        this.keybindings = keybindings;
        this.callbacks = callbacks;
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
    }

    public update(dt: number): void {
        const leftIncrease = this.isPressed(this.keybindings.LeftBrakeIncrease);
        const leftDecrease = this.isPressed(this.keybindings.LeftBrakeDecrease);
        const rightIncrease = this.isPressed(this.keybindings.RightBrakeIncrease);
        const rightDecrease = this.isPressed(this.keybindings.RightBrakeDecrease);

        const leftDelta = (leftIncrease ? 1 : 0) - (leftDecrease ? 1 : 0);
        const rightDelta = (rightIncrease ? 1 : 0) - (rightDecrease ? 1 : 0);

        this.leftTarget = clamp(this.leftTarget + leftDelta * BRAKE_TARGET_RATE * dt, 0, 1);
        this.rightTarget = clamp(this.rightTarget + rightDelta * BRAKE_TARGET_RATE * dt, 0, 1);
        this.speedbarPressed = this.isPressed(this.keybindings.Speedbar);
    }

    public consumeState(): ActionState {
        const state: ActionState = {
            leftBrakeTarget: this.leftTarget,
            rightBrakeTarget: this.rightTarget,
            speedbarPressed: this.speedbarPressed,
            pausePressed: this.pausePressed,
            debugTogglePressed: this.debugTogglePressed,
        };
        this.pausePressed = false;
        this.debugTogglePressed = false;
        return state;
    }

    public setKeybindings(keybindings: Keybindings): void {
        this.keybindings = keybindings;
    }

    public resetTargets(): void {
        this.leftTarget = 0;
        this.rightTarget = 0;
        this.speedbarPressed = false;
    }

    public dispose(): void {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (!this.hasInteracted) {
            this.hasInteracted = true;
            this.callbacks.onFirstInput();
        }

        this.pressed.add(event.code);

        if (event.code === this.keybindings.Speedbar) {
            event.preventDefault();
        }

        if (event.repeat) {
            return;
        }

        if (event.code === this.keybindings.Pause) {
            this.pausePressed = true;
        }

        if (event.code === this.keybindings.DebugToggle) {
            this.debugTogglePressed = true;
        }
    };

    private handleKeyUp = (event: KeyboardEvent): void => {
        this.pressed.delete(event.code);
    };

    private isPressed(code: string): boolean {
        return this.pressed.has(code);
    }
}

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
