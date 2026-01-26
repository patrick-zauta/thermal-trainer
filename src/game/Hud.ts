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
    groundspeedKmh: number;
    windSpeedMps: number;
    windDirDeg: number;
    windVecX: number;
    windVecY: number;
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
    aglM: number | null;
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
    nextTurnpoint: { name: string; distanceM: number; bearingRad: number } | null;
    turnpointProgress: { completed: number; total: number };
    debugMetrics: DebugMetrics;
    windIndicatorEnabled: boolean;
    windSpeedMps: number;
    windDirDeg: number;
};

const UI_FONT = "'Space Grotesk', 'Trebuchet MS', sans-serif";

export class Hud {
    public render(ctx: CanvasRenderingContext2D, width: number, height: number, state: HudState): void {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const dpr = window.devicePixelRatio || 1;
        const cssWidth = width / dpr;
        const cssHeight = height / dpr;
        const compact = cssWidth < 720 || cssHeight < 520;
        const mobile = state.touchControlsVisible || cssWidth < 900 || cssHeight < 600;
        const uiScale = mobile ? dpr * 1.15 : 1;
        const topBarHeight = (compact ? 52 : 64) * uiScale;
        const bottomPanelHeight = (compact ? 60 : 72) * uiScale;
        const sidePanelWidth = (compact ? 104 : 120) * uiScale;
        const showSidePanels = !state.touchControlsVisible && !compact && cssWidth >= 860;

        this.drawTopBar(ctx, width, state, topBarHeight, compact, uiScale);

        if (showSidePanels) {
            const panelY = topBarHeight;
            const panelHeight = Math.max(0, height - topBarHeight - bottomPanelHeight);
            this.drawSidePanel(
                ctx,
                16 * uiScale,
                panelY,
                panelHeight,
                sidePanelWidth,
                "Bremse links",
                state.leftBrake,
                state.leftBrakeTarget,
                compact,
                uiScale,
            );
            this.drawSidePanel(
                ctx,
                width - sidePanelWidth - 16 * uiScale,
                panelY,
                panelHeight,
                sidePanelWidth,
                "Bremse rechts",
                state.rightBrake,
                state.rightBrakeTarget,
                compact,
                uiScale,
            );
        }

        this.drawBottomPanel(ctx, width, height, state, bottomPanelHeight, compact, uiScale);

        if (state.stall) {
            this.drawCenteredBanner(ctx, width, height, "STALL WARNUNG", uiScale);
        } else if (state.targetReached) {
            this.drawCenteredBanner(ctx, width, height, "ZIEL ERREICHT", uiScale);
        }

        if (state.debug) {
            this.drawDebugOverlay(ctx, state.debugMetrics, topBarHeight, uiScale);
        }

        ctx.restore();
    }

    private drawTopBar(
        ctx: CanvasRenderingContext2D,
        width: number,
        state: HudState,
        barHeight: number,
        compact: boolean,
        uiScale: number,
    ): void {
        ctx.fillStyle = "#f5f3ef";
        ctx.fillRect(0, 0, width, barHeight);
        ctx.strokeStyle = "#d3d0cb";
        ctx.strokeRect(0, 0, width, barHeight);

        const groupWidth = width / 3;
        const labelFont = `${(compact ? 11 : 12) * uiScale}px ${UI_FONT}`;
        const valueFont = `${(compact ? 16 : 18) * uiScale}px ${UI_FONT}`;
        const smallFont = `${(compact ? 10 : 11) * uiScale}px ${UI_FONT}`;

        ctx.fillStyle = "#4a433b";
        ctx.textBaseline = "top";

        const textOffset = (compact ? 6 : 8) * uiScale;
        const lineGap = 16 * uiScale;
        this.drawGroup(
            ctx,
            16 * uiScale,
            textOffset,
            groupWidth - 32,
            "Hoehe",
            `${Math.round(state.altitudeM)} m`,
            labelFont,
            valueFont,
            lineGap,
        );

        const aglText = state.aglM === null ? "AGL n a" : `AGL ${Math.round(state.aglM)} m`;
        ctx.font = smallFont;
        ctx.fillStyle = "#7a7267";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(aglText, 16 * uiScale, textOffset + lineGap + 14 * uiScale);

        const headingText = `${state.telemetry.headingDeg} Grad`;
        this.drawGroup(
            ctx,
            groupWidth + 16 * uiScale,
            textOffset,
            groupWidth - 32,
            "Kurs",
            headingText,
            labelFont,
            valueFont,
            lineGap,
        );

        const speedbarStatus = this.speedbarStatus(state.telemetry.speedbarAmount, state.speedbarTarget);
        const speedText = `${Math.round(state.telemetry.speedKmh)} km/h  ${speedbarStatus}`;
        this.drawGroup(
            ctx,
            groupWidth * 2 + 16 * uiScale,
            textOffset,
            groupWidth - 32,
            "Speed",
            speedText,
            labelFont,
            valueFont,
            lineGap,
        );

        const glideRatio = computeGlideRatio(state.telemetry.airspeedKmh, state.telemetry.sinkGlider);
        if (glideRatio !== null) {
            ctx.font = smallFont;
            ctx.fillStyle = "#7a7267";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(
                `Gleiten ${glideRatio.toFixed(1)}:1`,
                groupWidth * 2 + 16 * uiScale,
                textOffset + lineGap + 14 * uiScale,
            );
        }

        if (state.turnpointProgress.total > 0) {
            this.drawTurnpointProgress(ctx, width, barHeight, state.turnpointProgress, compact, uiScale);
        }

        if (state.windIndicatorEnabled && state.windSpeedMps > 0) {
            this.drawWindIndicator(ctx, width, barHeight, state.windSpeedMps, state.windDirDeg, compact, uiScale);
        }
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
        lineGap: number,
    ): void {
        ctx.font = labelFont;
        ctx.fillStyle = "#7a7267";
        ctx.textAlign = "left";
        ctx.fillText(label, x, y);

        ctx.font = valueFont;
        ctx.fillStyle = "#1d1b18";
        ctx.fillText(value, x, y + lineGap, width);
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
        uiScale: number,
    ): void {
        ctx.fillStyle = "#f5f3ef";
        ctx.fillRect(x, y, panelWidth, panelHeight);
        ctx.strokeStyle = "#d3d0cb";
        ctx.strokeRect(x, y, panelWidth, panelHeight);

        ctx.font = `${(compact ? 12 : 13) * uiScale}px ${UI_FONT}`;
        ctx.fillStyle = "#2a2a2a";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, x + panelWidth / 2, y + 10 * uiScale);

        const barWidth = 32 * uiScale;
        const barX = x + (panelWidth - barWidth) / 2;
        const barY = y + 34 * uiScale;
        const barHeight = Math.max(0, panelHeight - 64 * uiScale);

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

        ctx.font = `${(compact ? 12 : 14) * uiScale}px ${UI_FONT}`;
        ctx.fillStyle = "#1d1b18";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(`${Math.round(value * 100)}%`, x + panelWidth / 2, y + panelHeight - 12 * uiScale);
    }

    private drawBottomPanel(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        state: HudState,
        panelHeight: number,
        compact: boolean,
        uiScale: number,
    ): void {
        const y = height - panelHeight;
        ctx.fillStyle = "#f5f3ef";
        ctx.fillRect(0, y, width, panelHeight);
        ctx.strokeStyle = "#d3d0cb";
        ctx.strokeRect(0, y, width, panelHeight);

        const varioColor = selectVarioColor(state.telemetry.vario);
        ctx.fillStyle = varioColor;
        ctx.font = `${(compact ? 20 : 26) * uiScale}px ${UI_FONT}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`Vario ${formatSigned(state.telemetry.vario)} m/s`, 18 * uiScale, y + panelHeight / 2);

        ctx.fillStyle = "#5a554c";
        ctx.font = `${(compact ? 13 : 16) * uiScale}px ${UI_FONT}`;
        ctx.textAlign = "right";
        ctx.fillText(
            `Int 18s ${formatSigned(state.telemetry.integratedVario)} m/s`,
            width - 18 * uiScale,
            y + panelHeight / 2,
        );

        this.drawVarioDot(
            ctx,
            width - 18 * uiScale,
            y + (compact ? 14 : 18) * uiScale,
            state.telemetry.vario,
            5 * uiScale,
        );

        if (state.nextTurnpoint) {
            this.drawTurnpointIndicator(ctx, width, y, panelHeight, state.nextTurnpoint, compact, uiScale);
        }
    }

    private drawCenteredBanner(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        text: string,
        uiScale: number,
    ): void {
        const bannerWidth = 240 * uiScale;
        const bannerHeight = 56 * uiScale;
        const x = (width - bannerWidth) / 2;
        const y = (height - bannerHeight) / 2;
        ctx.fillStyle = "rgba(30, 30, 30, 0.72)";
        ctx.fillRect(x, y, bannerWidth, bannerHeight);
        ctx.strokeStyle = "#d0d0d0";
        ctx.strokeRect(x, y, bannerWidth, bannerHeight);
        ctx.font = `${18 * uiScale}px ${UI_FONT}`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, width / 2, y + bannerHeight / 2);
    }

    private drawVarioDot(ctx: CanvasRenderingContext2D, x: number, y: number, vario: number, radius: number): void {
        if (vario <= 0.2) {
            return;
        }
        ctx.fillStyle = "#e35b5b";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawDebugOverlay(
        ctx: CanvasRenderingContext2D,
        metrics: DebugMetrics,
        topBarHeight: number,
        uiScale: number,
    ): void {
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
            `groundKmh: ${metrics.groundspeedKmh.toFixed(1)}`,
            `wind: ${metrics.windSpeedMps.toFixed(1)} m/s ${Math.round(metrics.windDirDeg)} Grad`,
            `windVec: ${metrics.windVecX.toFixed(2)} ${metrics.windVecY.toFixed(2)}`,
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
        ctx.fillRect(
            16 * uiScale,
            topBarHeight + 12 * uiScale,
            252 * uiScale,
            16 * uiScale + lines.length * 16 * uiScale,
        );
        ctx.fillStyle = "#f5f5f5";
        ctx.font = `${12 * uiScale}px ${UI_FONT}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        lines.forEach((line, index) => {
            ctx.fillText(line, 24 * uiScale, topBarHeight + 20 * uiScale + index * 16 * uiScale);
        });
        ctx.restore();
    }

    private drawWindIndicator(
        ctx: CanvasRenderingContext2D,
        width: number,
        barHeight: number,
        windSpeedMps: number,
        windDirDeg: number,
        compact: boolean,
        uiScale: number,
    ): void {
        const arrowSize = (compact ? 14 : 18) * uiScale;
        const padding = (compact ? 10 : 14) * uiScale;
        const text = `Wind ${windSpeedMps.toFixed(1)} m/s ${Math.round(windDirDeg)} Grad`;
        ctx.font = `${(compact ? 11 : 12) * uiScale}px ${UI_FONT}`;
        ctx.fillStyle = "#5a554c";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const textX = width - padding - arrowSize - 6 * uiScale;
        const centerY = barHeight / 2;
        ctx.fillText(text, textX, centerY);

        const centerX = width - padding - arrowSize / 2;
        const angle = (windDirDeg * Math.PI) / 180;
        const tailX = centerX - Math.cos(angle) * (arrowSize * 0.4);
        const tailY = centerY - Math.sin(angle) * (arrowSize * 0.4);
        const headX = centerX + Math.cos(angle) * (arrowSize * 0.6);
        const headY = centerY + Math.sin(angle) * (arrowSize * 0.6);

        ctx.strokeStyle = "#5a554c";
        ctx.lineWidth = 2 * uiScale;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        const headSize = 4 * uiScale;
        const leftAngle = angle + Math.PI * 0.75;
        const rightAngle = angle - Math.PI * 0.75;
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(headX + Math.cos(leftAngle) * headSize, headY + Math.sin(leftAngle) * headSize);
        ctx.moveTo(headX, headY);
        ctx.lineTo(headX + Math.cos(rightAngle) * headSize, headY + Math.sin(rightAngle) * headSize);
        ctx.stroke();
    }

    private drawTurnpointIndicator(
        ctx: CanvasRenderingContext2D,
        width: number,
        panelY: number,
        panelHeight: number,
        info: { name: string; distanceM: number; bearingRad: number },
        compact: boolean,
        uiScale: number,
    ): void {
        const arrowSize = (compact ? 32 : 40) * uiScale;
        const showText = true;
        const centerX = width / 2;
        const centerY = panelY + panelHeight / 2;
        const angle = info.bearingRad - Math.PI / 2;

        ctx.save();
        ctx.strokeStyle = "#2f5c8c";
        ctx.lineWidth = 2 * uiScale;
        ctx.beginPath();
        ctx.arc(centerX, centerY, arrowSize * 0.6, 0, Math.PI * 2);
        ctx.stroke();

        const tailX = centerX - Math.cos(angle) * (arrowSize * 0.35);
        const tailY = centerY - Math.sin(angle) * (arrowSize * 0.35);
        const headX = centerX + Math.cos(angle) * (arrowSize * 0.55);
        const headY = centerY + Math.sin(angle) * (arrowSize * 0.55);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        const headSize = 4 * uiScale;
        const leftAngle = angle + Math.PI * 0.75;
        const rightAngle = angle - Math.PI * 0.75;
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(headX + Math.cos(leftAngle) * headSize, headY + Math.sin(leftAngle) * headSize);
        ctx.moveTo(headX, headY);
        ctx.lineTo(headX + Math.cos(rightAngle) * headSize, headY + Math.sin(rightAngle) * headSize);
        ctx.stroke();

        if (showText) {
            const text = `${info.name} ${Math.round(info.distanceM)} m`;
            ctx.fillStyle = "#2f5c8c";
            ctx.font = `${(compact ? 12 : 14) * uiScale}px ${UI_FONT}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(text, centerX, centerY + arrowSize * 0.6 + 4 * uiScale);
        }

        ctx.restore();
    }

    private drawTurnpointProgress(
        ctx: CanvasRenderingContext2D,
        width: number,
        barHeight: number,
        progress: { completed: number; total: number },
        compact: boolean,
        uiScale: number,
    ): void {
        const text = `TP ${progress.completed}/${progress.total}`;
        ctx.save();
        ctx.fillStyle = "#5a554c";
        ctx.font = `${(compact ? 12 : 13) * uiScale}px ${UI_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(text, width / 2, barHeight - 6 * uiScale);
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

const computeGlideRatio = (airspeedKmh: number, sinkGlider: number): number | null => {
    if (sinkGlider <= 0.05) {
        return null;
    }
    const airspeedMps = airspeedKmh / 3.6;
    return airspeedMps / sinkGlider;
};
