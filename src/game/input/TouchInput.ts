import type { ActionState } from "./types";
import type { TouchControls } from "../ui/TouchControls";

type TouchCallbacks = {
    onFirstInput: () => void;
};

export class TouchInput {
    private readonly canvas: HTMLCanvasElement;
    private readonly controls: TouchControls;
    private readonly callbacks: TouchCallbacks;
    private enabled = false;
    private allowMouse = false;
    private leftPointerId: number | null = null;
    private rightPointerId: number | null = null;
    private speedbarPointerId: number | null = null;
    private pausePointerId: number | null = null;
    private leftTarget = 0;
    private rightTarget = 0;
    private speedbarPressed = false;
    private pausePressed = false;
    private hasInteracted = false;

    public constructor(canvas: HTMLCanvasElement, controls: TouchControls, callbacks: TouchCallbacks) {
        this.canvas = canvas;
        this.controls = controls;
        this.callbacks = callbacks;
        this.canvas.addEventListener("pointerdown", this.handlePointerDown, { passive: false });
        this.canvas.addEventListener("pointermove", this.handlePointerMove, { passive: false });
        this.canvas.addEventListener("pointerup", this.handlePointerUp, { passive: false });
        this.canvas.addEventListener("pointercancel", this.handlePointerUp, { passive: false });
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.releaseAll();
        }
    }

    public setAllowMouse(allowMouse: boolean): void {
        this.allowMouse = allowMouse;
    }

    public consumeState(): ActionState & { leftActive: boolean; rightActive: boolean } {
        const state = {
            leftBrakeTarget: this.leftTarget,
            rightBrakeTarget: this.rightTarget,
            speedbarPressed: this.speedbarPressed,
            pausePressed: this.pausePressed,
            debugTogglePressed: false,
            leftActive: this.leftPointerId !== null,
            rightActive: this.rightPointerId !== null,
        };
        this.pausePressed = false;
        return state;
    }

    public resetTargets(): void {
        this.releaseAll();
    }

    public dispose(): void {
        this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
        this.canvas.removeEventListener("pointermove", this.handlePointerMove);
        this.canvas.removeEventListener("pointerup", this.handlePointerUp);
        this.canvas.removeEventListener("pointercancel", this.handlePointerUp);
    }

    private handlePointerDown = (event: PointerEvent): void => {
        if (!this.enabled) {
            return;
        }
        if (!this.allowMouse && event.pointerType === "mouse") {
            return;
        }
        event.preventDefault();
        if (!this.hasInteracted) {
            this.hasInteracted = true;
            this.callbacks.onFirstInput();
        }
        const point = this.getPoint(event);
        const layout = this.controls.getLayout();

        if (this.leftPointerId === null && pointInRect(point.x, point.y, layout.leftSlider)) {
            this.leftPointerId = event.pointerId;
            this.leftTarget = this.valueFromSlider(point.y, layout.leftSlider);
        } else if (this.rightPointerId === null && pointInRect(point.x, point.y, layout.rightSlider)) {
            this.rightPointerId = event.pointerId;
            this.rightTarget = this.valueFromSlider(point.y, layout.rightSlider);
        } else if (this.speedbarPointerId === null && pointInRect(point.x, point.y, layout.speedbarButton)) {
            this.speedbarPointerId = event.pointerId;
            this.speedbarPressed = true;
        } else if (this.pausePointerId === null && pointInRect(point.x, point.y, layout.pauseButton)) {
            this.pausePointerId = event.pointerId;
            this.pausePressed = true;
        } else {
            return;
        }

        this.canvas.setPointerCapture(event.pointerId);
    };

    private handlePointerMove = (event: PointerEvent): void => {
        if (!this.enabled) {
            return;
        }
        if (!this.allowMouse && event.pointerType === "mouse") {
            return;
        }
        if (event.pointerId !== this.leftPointerId && event.pointerId !== this.rightPointerId) {
            return;
        }
        event.preventDefault();
        const point = this.getPoint(event);
        const layout = this.controls.getLayout();

        if (event.pointerId === this.leftPointerId) {
            this.leftTarget = this.valueFromSlider(point.y, layout.leftSlider);
        } else if (event.pointerId === this.rightPointerId) {
            this.rightTarget = this.valueFromSlider(point.y, layout.rightSlider);
        }
    };

    private handlePointerUp = (event: PointerEvent): void => {
        if (!this.enabled) {
            return;
        }
        if (!this.allowMouse && event.pointerType === "mouse") {
            return;
        }
        event.preventDefault();
        if (event.pointerId === this.leftPointerId) {
            this.leftPointerId = null;
            this.leftTarget = 0;
        }
        if (event.pointerId === this.rightPointerId) {
            this.rightPointerId = null;
            this.rightTarget = 0;
        }
        if (event.pointerId === this.speedbarPointerId) {
            this.speedbarPointerId = null;
            this.speedbarPressed = false;
        }
        if (event.pointerId === this.pausePointerId) {
            this.pausePointerId = null;
        }
        try {
            this.canvas.releasePointerCapture(event.pointerId);
        } catch {
            // Ignore release errors.
        }
    };

    private releaseAll(): void {
        this.leftPointerId = null;
        this.rightPointerId = null;
        this.speedbarPointerId = null;
        this.pausePointerId = null;
        this.leftTarget = 0;
        this.rightTarget = 0;
        this.speedbarPressed = false;
        this.pausePressed = false;
    }

    private valueFromSlider(y: number, rect: { y: number; height: number }): number {
        const t = clamp((y - rect.y) / rect.height, 0, 1);
        return t;
    }

    private getPoint(event: PointerEvent): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY,
        };
    }
}

const pointInRect = (x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean => {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
