import type { Action } from "./types";

export const actionLabels: Record<Action, string> = {
    LeftBrakeIncrease: "Bremse links ziehen",
    LeftBrakeDecrease: "Bremse links loesen",
    RightBrakeIncrease: "Bremse rechts ziehen",
    RightBrakeDecrease: "Bremse rechts loesen",
    Speedbar: "Speedbar",
    Pause: "Pause",
    DebugToggle: "Debug Anzeige",
};

export const formatKey = (code: string): string => {
    if (code === "Space") {
        return "Leertaste";
    }
    if (code === "Escape") {
        return "Esc";
    }
    if (code.startsWith("Key")) {
        return code.slice(3);
    }
    return code;
};
