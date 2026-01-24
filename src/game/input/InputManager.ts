import type { Keybindings, TouchControlsMode } from "../../app/types";
import { KeyboardInput } from "./KeyboardInput";
import { TouchInput } from "./TouchInput";
import type { ActionState } from "./types";
import { TouchControls } from "../ui/TouchControls";

type InputCallbacks = {
    onFirstInput: () => void;
};

export class InputManager {
    private readonly keyboard: KeyboardInput;
    private readonly touch: TouchInput;
    private readonly controls: TouchControls;
    private touchMode: TouchControlsMode;
    private actionState: ActionState = {
        leftBrakeTarget: 0,
        rightBrakeTarget: 0,
        speedbarPressed: false,
        pausePressed: false,
        debugTogglePressed: false,
    };
    private controlsVisible = false;

    public constructor(
        canvas: HTMLCanvasElement,
        keybindings: Keybindings,
        touchMode: TouchControlsMode,
        callbacks: InputCallbacks,
    ) {
        this.keyboard = new KeyboardInput(keybindings, { onFirstInput: callbacks.onFirstInput });
        this.controls = new TouchControls();
        this.touch = new TouchInput(canvas, this.controls, { onFirstInput: callbacks.onFirstInput });
        this.touchMode = touchMode;
        this.updateTouchMode();
    }

    public update(dt: number): void {
        this.keyboard.update(dt);
        const keyboardState = this.keyboard.consumeState();
        const touchState = this.touch.consumeState();

        const leftFromTouch = touchState.leftActive;
        const rightFromTouch = touchState.rightActive;

        this.actionState = {
            leftBrakeTarget: leftFromTouch ? touchState.leftBrakeTarget : keyboardState.leftBrakeTarget,
            rightBrakeTarget: rightFromTouch ? touchState.rightBrakeTarget : keyboardState.rightBrakeTarget,
            speedbarPressed: keyboardState.speedbarPressed || touchState.speedbarPressed,
            pausePressed: keyboardState.pausePressed || touchState.pausePressed,
            debugTogglePressed: keyboardState.debugTogglePressed,
        };
    }

    public getState(): ActionState {
        return this.actionState;
    }

    public prepareControls(width: number, height: number): boolean {
        this.controls.updateLayout(width, height);
        const visible = this.shouldShowControls(width, height);
        this.controls.setVisible(visible);
        this.controlsVisible = visible;
        this.touch.setEnabled(visible);
        this.touch.setAllowMouse(this.touchMode === "on" && !isTouchSupported());
        return visible;
    }

    public renderControls(
        ctx: CanvasRenderingContext2D,
        state: { leftTarget: number; rightTarget: number; speedbarPressed: boolean },
    ): void {
        this.controls.render(ctx, {
            leftTarget: state.leftTarget,
            rightTarget: state.rightTarget,
            speedbarPressed: state.speedbarPressed,
        });
    }

    public areControlsVisible(): boolean {
        return this.controlsVisible;
    }

    public setKeybindings(keybindings: Keybindings): void {
        this.keyboard.setKeybindings(keybindings);
    }

    public setTouchMode(mode: TouchControlsMode): void {
        this.touchMode = mode;
        this.updateTouchMode();
    }

    public resetTargets(): void {
        this.keyboard.resetTargets();
        this.touch.resetTargets();
    }

    public dispose(): void {
        this.keyboard.dispose();
        this.touch.dispose();
    }

    private updateTouchMode(): void {
        const enabled = this.touchMode === "on" || (this.touchMode === "auto" && isTouchSupported());
        this.touch.setEnabled(enabled);
    }

    private shouldShowControls(width: number, height: number): boolean {
        if (this.touchMode === "off") {
            return false;
        }
        if (this.touchMode === "on") {
            return true;
        }
        if (!isTouchSupported()) {
            return false;
        }
        return Math.min(width, height) < 900;
    }
}

const isTouchSupported = (): boolean => {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
        return false;
    }
    return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
};
