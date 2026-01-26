import type { RunSummary } from "../types";
import type { Map, WorldTransform } from "../../game/Map";
import type { Screen } from "./types";

type SummaryCallbacks = {
    onRepeat: () => void;
    onHome: () => void;
};

export const createSummaryScreen = (summary: RunSummary, map: Map, callbacks: SummaryCallbacks): Screen => {
    const screen = document.createElement("div");
    screen.className = "screen screen-summary";

    const card = document.createElement("div");
    card.className = "panel card";

    const title = document.createElement("h1");
    title.textContent = "Zusammenfassung";

    const statsGrid = document.createElement("div");
    statsGrid.className = "stats-grid";
    statsGrid.append(
        statRow("Flugzeit", formatDuration(summary.durationSec)),
        statRow("Max Hoehe", `${Math.round(summary.maxAltitudeM)} m`),
        statRow("Netto Hoehengewinn", `${formatSigned(summary.netAltitudeM)} m`),
        statRow("Avg Steigen", summary.timeClimbSec > 0 ? `${summary.avgClimbMps.toFixed(2)} m/s` : "-"),
        statRow("Zeit im Steigen", formatDuration(summary.timeClimbSec)),
        statRow("Zeit im Sinken", formatDuration(summary.timeSinkSec)),
        statRow("Stall Warnungen", summary.stallCount.toString()),
        ...(summary.wind.windEnabled
            ? [
                  statRow(
                      "Wind",
                      `${summary.wind.windSpeedMps.toFixed(1)} m/s ${Math.round(summary.wind.windDirDeg)} Grad`,
                  ),
                  statRow("Zufallswind", summary.wind.windRandomEnabled ? "ja" : "nein"),
                  statRow(
                      "Thermik Drift",
                      summary.wind.thermalDriftEnabled
                          ? `ja ${summary.wind.thermalDriftFactor.toFixed(2)}`
                          : "nein",
                  ),
              ]
            : []),
        ...(summary.mode === "training" || summary.mode === "random"
            ? [statRow("Ziel erreicht", summary.targetReached ? "ja" : "nein")]
            : []),
    );

    const mapWrap = document.createElement("div");
    mapWrap.className = "summary-map";

    const canvas = document.createElement("canvas");
    canvas.className = "summary-canvas";
    mapWrap.appendChild(canvas);

    const buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    const repeatButton = createButton("Wiederholen", callbacks.onRepeat);
    const homeButton = createButton("Home", callbacks.onHome, "secondary");
    buttonRow.append(repeatButton, homeButton);

    card.append(title, statsGrid, mapWrap, buttonRow);
    screen.append(card);

    const resizeObserver = new ResizeObserver(() => {
        drawSummary(canvas, map, summary);
    });
    resizeObserver.observe(mapWrap);

    drawSummary(canvas, map, summary);

    return {
        element: screen,
        dispose: () => {
            resizeObserver.disconnect();
        },
    };
};

const statRow = (label: string, value: string): HTMLElement => {
    const row = document.createElement("div");
    row.className = "stat-row";
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    const valueEl = document.createElement("span");
    valueEl.textContent = value;
    row.append(labelEl, valueEl);
    return row;
};

const drawSummary = (canvas: HTMLCanvasElement, map: Map, summary: RunSummary): void => {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const transform = createFitTransform(canvas.width, canvas.height, map.worldWidth, map.worldHeight);
    map.setWindSettings(summary.wind);
    map.render(ctx, transform, summary.durationSec, {
        visibility: "visible",
        showLabels: false,
        showTurnpoints: true,
        drawBackground: true,
        completedTurnpoints: [],
    });

    drawTrack(ctx, transform, summary);

    if (summary.wind.windEnabled && summary.wind.windIndicatorEnabled) {
        drawWindArrow(ctx, canvas.width, canvas.height, summary.wind.windSpeedMps, summary.wind.windDirDeg);
    }
};

const drawTrack = (ctx: CanvasRenderingContext2D, transform: WorldTransform, summary: RunSummary): void => {
    if (summary.samples.length < 2) {
        return;
    }

    for (let i = 1; i < summary.samples.length; i += 1) {
        const prev = summary.samples[i - 1];
        const curr = summary.samples[i];
        const color = varioColor(curr.vario);

        const x1 = transform.a * prev.x + transform.c * prev.y + transform.offsetX;
        const y1 = transform.b * prev.x + transform.d * prev.y + transform.offsetY;
        const x2 = transform.a * curr.x + transform.c * curr.y + transform.offsetX;
        const y2 = transform.b * curr.x + transform.d * curr.y + transform.offsetY;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
};

const createFitTransform = (canvasWidth: number, canvasHeight: number, worldWidth: number, worldHeight: number) => {
    const scale = Math.min(canvasWidth / worldWidth, canvasHeight / worldHeight);
    const offsetX = (canvasWidth - worldWidth * scale) / 2;
    const offsetY = (canvasHeight - worldHeight * scale) / 2;
    return { a: scale, b: 0, c: 0, d: scale, offsetX, offsetY };
};

const drawWindArrow = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    windSpeedMps: number,
    windDirDeg: number,
): void => {
    const padding = 16;
    const arrowSize = 18;
    const label = `Wind ${windSpeedMps.toFixed(1)} m/s ${Math.round(windDirDeg)} Grad`;
    ctx.save();
    ctx.font = "12px 'Space Grotesk', 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#4a433b";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const textX = width - padding - arrowSize - 6;
    const textY = height - padding;
    ctx.fillText(label, textX, textY);

    const centerX = width - padding - arrowSize / 2;
    const centerY = height - padding - 10;
    const angle = (windDirDeg * Math.PI) / 180;
    const tailX = centerX - Math.cos(angle) * (arrowSize * 0.4);
    const tailY = centerY - Math.sin(angle) * (arrowSize * 0.4);
    const headX = centerX + Math.cos(angle) * (arrowSize * 0.6);
    const headY = centerY + Math.sin(angle) * (arrowSize * 0.6);

    ctx.strokeStyle = "#4a433b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    const headSize = 4;
    const leftAngle = angle + Math.PI * 0.75;
    const rightAngle = angle - Math.PI * 0.75;
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(headX + Math.cos(leftAngle) * headSize, headY + Math.sin(leftAngle) * headSize);
    ctx.moveTo(headX, headY);
    ctx.lineTo(headX + Math.cos(rightAngle) * headSize, headY + Math.sin(rightAngle) * headSize);
    ctx.stroke();
    ctx.restore();
};

const varioColor = (vario: number): string => {
    if (vario > 0.2) {
        return "#e35b5b";
    }
    if (vario < -1.1) {
        return "#4a7bd8";
    }
    return "#8c8c8c";
};

const formatSigned = (value: number): string => {
    const rounded = Math.round(value);
    return value >= 0 ? `+${rounded}` : `${rounded}`;
};

const formatDuration = (seconds: number): string => {
    const rounded = Math.round(seconds);
    const mins = Math.floor(rounded / 60);
    const secs = rounded % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const createButton = (label: string, onClick: () => void, variant?: "secondary"): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = variant ? `btn ${variant}` : "btn";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
};
