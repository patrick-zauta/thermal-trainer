import type { Telemetry } from "./Physics";

type HudState = {
    altitudeM: number;
    telemetry: Telemetry;
    leftBrake: number;
    rightBrake: number;
    paused: boolean;
    stall: boolean;
    speedbarActive: boolean;
};

const UI_FONT = "'Space Grotesk', 'Trebuchet MS', sans-serif";
const TOP_BAR_HEIGHT = 48;
const BOTTOM_BAR_HEIGHT = 34;
const SIDE_PANEL_WIDTH = 120;

export class Hud {
    public render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, state: HudState): void {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        this.drawTopBar(ctx, width, state, time);
        const panelY = TOP_BAR_HEIGHT;
        const panelHeight = Math.max(0, height - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT);
        this.drawSidePanel(ctx, 16, panelY, panelHeight, "Left Brake", state.leftBrake);
        this.drawSidePanel(ctx, width - SIDE_PANEL_WIDTH - 16, panelY, panelHeight, "Right Brake", state.rightBrake);
        this.drawBottomBar(ctx, width, height, state);

        if (state.paused) {
            this.drawCenteredBanner(ctx, width, height, "PAUSED");
        } else if (state.stall) {
            this.drawCenteredBanner(ctx, width, height, "STALL WARNING");
        }

        ctx.restore();
    }

    private drawTopBar(
        ctx: CanvasRenderingContext2D,
        width: number,
        state: HudState,
        time: number,
    ): void {
        const barHeight = TOP_BAR_HEIGHT;
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, 0, width, barHeight);
        ctx.strokeStyle = "#c7c7c7";
        ctx.strokeRect(0, 0, width, barHeight);

        ctx.font = `16px ${UI_FONT}`;
        ctx.fillStyle = "#1b1b1b";
        ctx.textBaseline = "middle";

        const climbText = `Climb: ${formatSigned(state.telemetry.vario)} m/s`;
        const integratedText = `Int 18s: ${formatSigned(state.telemetry.integratedVario)} m/s`;
        ctx.textAlign = "left";
        ctx.fillText(`${climbText}  ${integratedText}`, 16, barHeight / 2);

        const altitudeText = `Altitude: ${Math.round(state.altitudeM)} m`;
        ctx.textAlign = "center";
        ctx.fillText(altitudeText, width / 2, barHeight / 2);

        const headingText = `Heading: ${state.telemetry.headingDeg}°`;
        const speedText = `Speed: ${Math.round(state.telemetry.speedKmh)} km/h`;
        ctx.textAlign = "right";
        ctx.fillText(`${headingText}  ${speedText}`, width - 120, barHeight / 2);

        ctx.fillText("Vario", width - 64, barHeight / 2);
        this.drawVarioDot(ctx, width - 24, barHeight / 2, state.telemetry.vario, time);
    }

    private drawSidePanel(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        panelHeight: number,
        label: string,
        value: number,
    ): void {
        const panelWidth = SIDE_PANEL_WIDTH;
        ctx.fillStyle = "#f3f3f3";
        ctx.fillRect(x, y, panelWidth, panelHeight);
        ctx.strokeStyle = "#c7c7c7";
        ctx.strokeRect(x, y, panelWidth, panelHeight);

        ctx.font = `14px ${UI_FONT}`;
        ctx.fillStyle = "#1b1b1b";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, x + panelWidth / 2, y + 10);

        const barWidth = 32;
        const barX = x + (panelWidth - barWidth) / 2;
        const barY = y + 36;
        const barHeight = Math.max(0, panelHeight - 72);

        ctx.fillStyle = "#d6d6d6";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const filled = barHeight * value;
        ctx.fillStyle = "#4a4a4a";
        ctx.fillRect(barX, barY, barWidth, filled);

        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#2a2a2a";
        ctx.fillText(`${Math.round(value * 100)}%`, x + panelWidth / 2, y + panelHeight - 12);
    }

    private drawBottomBar(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        state: HudState,
    ): void {
        const barHeight = BOTTOM_BAR_HEIGHT;
        const y = height - barHeight;
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, y, width, barHeight);
        ctx.strokeStyle = "#c7c7c7";
        ctx.strokeRect(0, y, width, barHeight);

        ctx.font = `14px ${UI_FONT}`;
        ctx.fillStyle = "#1b1b1b";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText("Hold SPACE for Speedbar", 16, y + barHeight / 2);

        if (state.speedbarActive) {
            ctx.textAlign = "right";
            ctx.fillText("Speedbar ACTIVE", width - 16, y + barHeight / 2);
        }
    }

    private drawCenteredBanner(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        text: string,
    ): void {
        const bannerWidth = 240;
        const bannerHeight = 56;
        const x = (width - bannerWidth) / 2;
        const y = (height - bannerHeight) / 2;
        ctx.fillStyle = "rgba(30, 30, 30, 0.72)";
        ctx.fillRect(x, y, bannerWidth, bannerHeight);
        ctx.strokeStyle = "#d0d0d0";
        ctx.strokeRect(x, y, bannerWidth, bannerHeight);
        ctx.font = `18px ${UI_FONT}`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, width / 2, y + bannerHeight / 2);
    }

    private drawVarioDot(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        vario: number,
        time: number,
    ): void {
        if (vario <= 0.2) {
            return;
        }

        const blinkHz = clamp(1 + vario * 2, 1, 10);
        const on = Math.sin(time * Math.PI * 2 * blinkHz) > 0;
        if (!on) {
            return;
        }

        ctx.fillStyle = "#e35b5b";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}

const formatSigned = (value: number): string => {
    const rounded = value.toFixed(1);
    return value >= 0 ? `+${rounded}` : rounded;
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
