type InputCallbacks = {
    onPauseToggle: () => void;
    onReset: () => void;
    onFirstInput: () => void;
};

const BRAKE_TARGET_RATE = 2.0;

export class Input {
    public leftTarget = 0;
    public rightTarget = 0;
    public speedbarActive = false;

    private readonly pressed = new Set<string>();
    private readonly callbacks: InputCallbacks;
    private hasInteracted = false;

    public constructor(callbacks: InputCallbacks) {
        this.callbacks = callbacks;
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
    }

    public update(dt: number): void {
        const leftIncrease = this.isPressed("KeyA");
        const leftDecrease = this.isPressed("KeyQ");
        const rightIncrease = this.isPressed("KeyP");
        const rightDecrease = this.isPressed("KeyL");

        const leftDelta = (leftIncrease ? 1 : 0) - (leftDecrease ? 1 : 0);
        const rightDelta = (rightIncrease ? 1 : 0) - (rightDecrease ? 1 : 0);

        this.leftTarget = clamp(this.leftTarget + leftDelta * BRAKE_TARGET_RATE * dt, 0, 1);
        this.rightTarget = clamp(this.rightTarget + rightDelta * BRAKE_TARGET_RATE * dt, 0, 1);

        this.speedbarActive = this.isPressed("Space");
    }

    public resetTargets(): void {
        this.leftTarget = 0;
        this.rightTarget = 0;
        this.speedbarActive = false;
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (!this.hasInteracted) {
            this.hasInteracted = true;
            this.callbacks.onFirstInput();
        }

        this.pressed.add(event.code);

        if (event.code === "Space") {
            event.preventDefault();
        }

        if (event.repeat) {
            return;
        }

        if (event.code === "Escape") {
            this.callbacks.onPauseToggle();
        }

        if (event.code === "KeyR") {
            this.callbacks.onReset();
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
