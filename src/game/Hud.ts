import type { Telemetry } from "./Physics";

type DebugMetrics = {
    dt: number;
    fps: number;
    verticalAir: number;
    sinkPolar: number;
    brakePenalty: number;
    sinkGlider: number;
    vario: number;
    speedbarAmount: number;
    airspeedKmh: number;
    totalBrake: number;
    diffBrake: number;
    turnRate: number;
    turnInput: number;
    rTarget: number;
    yawRateRad: number;
    slipBeta: number;
    bankPhiRad: number;
};

type HudState = {
    altitudeM: number;
    telemetry: Telemetry;
    leftBrake: number;
    rightBrake: number;
    leftBrakeTarget: number;
    rightBrakeTarget: number;
    paused: boolean;
    stall: boolean;
    speedbarTarget: number;
    targetReached: boolean;
    debug: boolean;
    touchControlsVisible: boolean;
    debugMetrics: DebugMetrics;
};

const UI_FONT = "'Space Grotesk', 'Trebuchet MS', sans-serif";

export class Hud {
    public render(ctx: CanvasRenderingContext2D, width: number, height: number, state: HudState): void {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const compact = width < 720 || height < 520;
        const topBarHeight = compact ? 46 : 56;
        const bottomPanelHeight = compact ? 60 : 72;
        const sidePanelWidth = compact ? 104 : 120;
        const showSidePanels = !state.touchControlsVisible && !compact && width >= 860;

        this.drawTopBar(ctx, width, state, topBarHeight, compact);

        if (showSidePanels) {
            const panelY = topBarHeight;
            const panelHeight = Math.max(0, height - topBarHeight - bottomPanelHeight);
            this.drawSidePanel(
                ctx,
                16,
                panelY,
                panelHeight,
                sidePanelWidth,
                "Bremse links",
                state.leftBrake,
                state.leftBrakeTarget,
                compact,
            );
            this.drawSidePanel(
                ctx,
                width - sidePanelWidth - 16,
                panelY,
                panelHeight,
                sidePanelWidth,
                "Bremse rechts",
                state.rightBrake,
                state.rightBrakeTarget,
                compact,
            );
        }

        this.drawBottomPanel(ctx, width, height, state, bottomPanelHeight, compact);

        if (state.stall) {
            this.drawCenteredBanner(ctx, width, height, "STALL WARNUNG");
        } else if (state.targetReached) {
            this.drawCenteredBanner(ctx, width, height, "ZIEL ERREICHT");
        }

        if (state.debug) {
            this.drawDebugOverlay(ctx, state.debugMetrics, topBarHeight);
        }

        ctx.restore();
    }

    private drawTopBar(
        ctx: CanvasRenderingContext2D,
        width: number,
        state: HudState,
        barHeight: number,
        compact: boolean,
    ): void {
        ctx.fillStyle = "#f5f3ef";
        ctx.fillRect(0, 0, width, barHeight);
        ctx.strokeStyle = "#d3d0cb";
        ctx.strokeRect(0, 0, width, barHeight);

        const groupWidth = width / 3;
        const labelFont = `${compact ? 11 : 12}px ${UI_FONT}`;
        const valueFont = `${compact ? 16 : 18}px ${UI_FONT}`;

        ctx.fillStyle = "#4a433b";
        ctx.textBaseline = "top";

        const textOffset = compact ? 6 : 8;
        this.drawGroup(
            ctx,
            16,
            textOffset,
            groupWidth - 32,
            "Hoehe",
            `${Math.round(state.altitudeM)} m`,
            labelFont,
            valueFont,
        );

        const headingText = `${state.telemetry.headingDeg} Grad`;
        this.drawGroup(
            ctx,
            groupWidth + 16,
            textOffset,
            groupWidth - 32,
            "Kurs",
            headingText,
            labelFont,
            valueFont,
        );

        const speedbarStatus = this.speedbarStatus(state.telemetry.speedbarAmount, state.speedbarTarget);
        const speedText = `${Math.round(state.telemetry.speedKmh)} km/h  ${speedbarStatus}`;
        this.drawGroup(
            ctx,
            groupWidth * 2 + 16,
            textOffset,
            groupWidth - 32,
            "Speed",
            speedText,
            labelFont,
            valueFont,
        );
    }

    private drawGroup(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        label: string,
        value: string,
        labelFont: string,
        valueFont: string,
    ): void {
        ctx.font = labelFont;
        ctx.fillStyle = "#7a7267";
        ctx.textAlign = "left";
        ctx.fillText(label, x, y);

        ctx.font = valueFont;
        ctx.fillStyle = "#1d1b18";
        ctx.fillText(value, x, y + 16, width);
    }

    private drawSidePanel(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        panelHeight: number,
        panelWidth: number,
        label: string,
        value: number,
        target: number,
        compact: boolean,
    ): void {
        ctx.fillStyle = "#f5f3ef";
        ctx.fillRect(x, y, panelWidth, panelHeight);
        ctx.strokeStyle = "#d3d0cb";
        ctx.strokeRect(x, y, panelWidth, panelHeight);

        ctx.font = `${compact ? 12 : 13}px ${UI_FONT}`;
        ctx.fillStyle = "#2a2a2a";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, x + panelWidth / 2, y + 10);

        const barWidth = 32;
        const barX = x + (panelWidth - barWidth) / 2;
        const barY = y + 34;
        const barHeight = Math.max(0, panelHeight - 64);

        ctx.fillStyle = "#d8d5cf";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const filled = barHeight * value;
        ctx.fillStyle = "#3b3b3b";
        ctx.fillRect(barX, barY, barWidth, filled);

        const targetY = barY + barHeight * target;
        ctx.strokeStyle = "#a15d3f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(barX - 4, targetY);
        ctx.lineTo(barX + barWidth + 4, targetY);
        ctx.stroke();

        ctx.font = `${compact ? 12 : 14}px ${UI_FONT}`;
        ctx.fillStyle = "#1d1b18";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(`${Math.round(value * 100)}%`, x + panelWidth / 2, y + panelHeight - 12);
    }

    private drawBottomPanel(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        state: HudState,
        panelHeight: number,
        compact: boolean,
    ): void {
        const y = height - panelHeight;
        ctx.fillStyle = "#f5f3ef";
        ctx.fillRect(0, y, width, panelHeight);
        ctx.strokeStyle = "#d3d0cb";
        ctx.strokeRect(0, y, width, panelHeight);

        const varioColor = selectVarioColor(state.telemetry.vario);
        ctx.fillStyle = varioColor;
        ctx.font = `${compact ? 20 : 26}px ${UI_FONT}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`Vario ${formatSigned(state.telemetry.vario)} m/s`, 18, y + panelHeight / 2);

        ctx.fillStyle = "#5a554c";
        ctx.font = `${compact ? 13 : 16}px ${UI_FONT}`;
        ctx.textAlign = "right";
        ctx.fillText(
            `Int 18s ${formatSigned(state.telemetry.integratedVario)} m/s`,
            width - 18,
            y + panelHeight / 2,
        );

        this.drawVarioDot(ctx, width - 18, y + (compact ? 14 : 18), state.telemetry.vario);
    }

    private drawCenteredBanner(ctx: CanvasRenderingContext2D, width: number, height: number, text: string): void {
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

    private drawVarioDot(ctx: CanvasRenderingContext2D, x: number, y: number, vario: number): void {
        if (vario <= 0.2) {
            return;
        }
        ctx.fillStyle = "#e35b5b";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawDebugOverlay(ctx: CanvasRenderingContext2D, metrics: DebugMetrics, topBarHeight: number): void {
        const lines = [
            `dt: ${metrics.dt.toFixed(3)} s`,
            `fps: ${metrics.fps.toFixed(0)}`,
            `verticalAir: ${metrics.verticalAir.toFixed(2)}`,
            `sinkPolar: ${metrics.sinkPolar.toFixed(2)}`,
            `brakePenalty: ${metrics.brakePenalty.toFixed(2)}`,
            `sinkGlider: ${metrics.sinkGlider.toFixed(2)}`,
            `vario: ${metrics.vario.toFixed(2)}`,
            `speedbarAmount: ${metrics.speedbarAmount.toFixed(2)}`,
            `airspeedKmh: ${metrics.airspeedKmh.toFixed(1)}`,
            `totalBrake: ${metrics.totalBrake.toFixed(2)}`,
            `diffBrake: ${metrics.diffBrake.toFixed(2)}`,
            `u: ${metrics.turnInput.toFixed(2)}`,
            `rTarget: ${metrics.rTarget.toFixed(2)}`,
            `yawRate: ${metrics.yawRateRad.toFixed(2)}`,
            `slipBeta: ${metrics.slipBeta.toFixed(2)}`,
            `bankPhi: ${radToDeg(metrics.bankPhiRad).toFixed(1)} deg`,
        ];

        ctx.save();
        ctx.fillStyle = "rgba(20, 20, 20, 0.75)";
        ctx.fillRect(16, topBarHeight + 12, 220, 16 + lines.length * 16);
        ctx.fillStyle = "#f5f5f5";
        ctx.font = `12px ${UI_FONT}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        lines.forEach((line, index) => {
            ctx.fillText(line, 24, topBarHeight + 20 + index * 16);
        });
        ctx.restore();
    }

    private speedbarStatus(amount: number, target: number): string {
        const percent = Math.round(amount * 100);
        if (Math.abs(target - amount) < 0.02) {
            return `SB ${percent}%`;
        }
        if (target > amount) {
            return `SB ${percent}% auf`;
        }
        return `SB ${percent}% zu`;
    }
}

const selectVarioColor = (vario: number): string => {
    if (vario > 0.2) {
        return "#d06a32";
    }
    if (vario < -1.1) {
        return "#3568c4";
    }
    return "#4a433b";
};

const formatSigned = (value: number): string => {
    const rounded = value.toFixed(1);
    return value >= 0 ? `+${rounded}` : rounded;
};

const radToDeg = (value: number): number => {
    return (value * 180) / Math.PI;
};
