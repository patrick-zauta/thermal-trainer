import type { RunSummary, TurnpointEvent } from "../types";
import { FlightMode, ThermikVisibility } from "../types";
import type { Map as GameMap, WorldTransform } from "../../game/Map";
import type { Screen } from "./types";

type SummaryCallbacks = {
    onRepeat: () => void;
    onHome: () => void;
};

type ViewState = {
    zoom: number;
    panX: number;
    panY: number;
    baseScale: number;
    baseOffsetX: number;
    baseOffsetY: number;
};

export const createSummaryScreen = (summary: RunSummary, map: GameMap, callbacks: SummaryCallbacks): Screen => {
    const screen = document.createElement("div");
    screen.className = "screen screen-summary";

    const card = document.createElement("div");
    card.className = "panel card";

    const title = document.createElement("h1");
    title.textContent = "Zusammenfassung";

    const distanceM = computeDistance(summary.samples);

    const summarySection = createStatsSection("Uebersicht", [
        statRow("Flugzeit", formatDuration(summary.durationSec)),
        statRow("Start Hoehe", `${Math.round(summary.startAltitudeM)} m`),
        statRow("Lande Hoehe", `${Math.round(summary.endAltitudeM)} m`),
        statRow("Strecke", formatDistance(distanceM)),
        statRow("Max Hoehe", `${Math.round(summary.maxAltitudeM)} m`),
        statRow("Netto Hoehengewinn", `${formatSigned(summary.netAltitudeM)} m`),
    ]);

    const performanceSection = createStatsSection("Leistung", [
        statRow("Avg Steigen", summary.timeClimbSec > 0 ? `${summary.avgClimbMps.toFixed(2)} m/s` : "-"),
        statRow("Zeit im Steigen", formatDuration(summary.timeClimbSec)),
        statRow("Zeit im Sinken", formatDuration(summary.timeSinkSec)),
        statRow("Stall Warnungen", summary.stallCount.toString()),
    ]);

    const windSection = summary.wind.windEnabled
        ? createStatsSection("Wind", [
              statRow("Wind", `${summary.wind.windSpeedMps.toFixed(1)} m/s ${Math.round(summary.wind.windDirDeg)} Grad`),
              statRow(
                  "Thermik Drift",
                  summary.wind.thermalDriftEnabled ? `ja ${summary.wind.thermalDriftFactor.toFixed(2)}` : "nein",
              ),
          ])
        : null;

    const targetSection =
        summary.mode !== FlightMode.FreeFlight
            ? createStatsSection("Ziel", [statRow("Ziel erreicht", summary.targetReached ? "ja" : "nein")])
            : null;

    const mapHeader = document.createElement("div");
    mapHeader.className = "summary-header";

    const mapTitle = document.createElement("h2");
    mapTitle.textContent = "Karte";

    const mapHeaderActions = document.createElement("div");
    mapHeaderActions.className = "summary-header-actions";

    const enlargeButton = createButton("Vergroessern", () => openMapOverlay(), "secondary");
    enlargeButton.classList.add("small");

    mapHeaderActions.append(enlargeButton);
    mapHeader.append(mapTitle, mapHeaderActions);

    const mapControls = document.createElement("div");
    mapControls.className = "summary-controls";
    const thermalsToggle = createToggleRow("Thermik anzeigen", true);
    mapControls.append(thermalsToggle.row);

    const mapWrap = document.createElement("div");
    mapWrap.className = "summary-map";

    const canvas = document.createElement("canvas");
    canvas.className = "summary-canvas";
    mapWrap.appendChild(canvas);

    mapWrap.addEventListener("click", () => {
        openMapOverlay();
    });

    const graphWrap = createDetailsSection("Hoehenprofil", true);
    const graphCanvas = document.createElement("canvas");
    graphCanvas.className = "graph-canvas";
    graphWrap.content.append(graphCanvas);

    const logWrap = createDetailsSection("Fluglog", false);
    const logList = document.createElement("div");
    logList.className = "log-list";
    logWrap.content.append(logList);

    const mapOverlay = createMapOverlay(() => closeMapOverlay());
    const overlayCanvas = mapOverlay.canvas;

    const buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    const repeatButton = createButton("Wiederholen", callbacks.onRepeat);
    const homeButton = createButton("Home", callbacks.onHome, "secondary");
    buttonRow.append(repeatButton, homeButton);

    card.append(title, summarySection, performanceSection);
    if (windSection) {
        card.append(windSection);
    }
    if (targetSection) {
        card.append(targetSection);
    }
    card.append(mapHeader, mapControls, mapWrap, graphWrap.element, logWrap.element, buttonRow);
    screen.append(card, mapOverlay.element);

    const viewState: ViewState = {
        zoom: 1,
        panX: 0,
        panY: 0,
        baseScale: 1,
        baseOffsetX: 0,
        baseOffsetY: 0,
    };
    const overlayViewState: ViewState = { ...viewState };

    const renderAll = (): void => {
        drawSummary(canvas, map, summary, viewState, thermalsToggle.toggle.checked);
        if (!mapOverlay.element.classList.contains("hidden")) {
            drawSummary(overlayCanvas, map, summary, overlayViewState, thermalsToggle.toggle.checked);
        }
        drawAltitudeGraph(graphCanvas, summary);
        renderFlightLog(logList, summary);
    };

    const resizeObserver = new ResizeObserver(() => {
        renderAll();
    });
    resizeObserver.observe(mapWrap);
    resizeObserver.observe(graphWrap.element);

    const disposeInteractions = attachMapInteractions(canvas, viewState, renderAll);
    const disposeOverlayInteractions = attachMapInteractions(overlayCanvas, overlayViewState, renderAll);

    thermalsToggle.toggle.addEventListener("change", () => {
        renderAll();
    });

    renderAll();

    return {
        element: screen,
        dispose: () => {
            resizeObserver.disconnect();
            disposeInteractions();
            disposeOverlayInteractions();
        },
    };

    function openMapOverlay(): void {
        overlayViewState.zoom = viewState.zoom;
        overlayViewState.panX = viewState.panX;
        overlayViewState.panY = viewState.panY;
        mapOverlay.element.classList.remove("hidden");
        renderAll();
    }

    function closeMapOverlay(): void {
        mapOverlay.element.classList.add("hidden");
    }
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

const createStatsSection = (title: string, rows: HTMLElement[]): HTMLElement => {
    const section = document.createElement("div");
    section.className = "summary-section";

    const heading = document.createElement("h2");
    heading.textContent = title;

    const grid = document.createElement("div");
    grid.className = "stats-grid";
    rows.forEach((row) => grid.append(row));

    section.append(heading, grid);
    return section;
};

const drawSummary = (
    canvas: HTMLCanvasElement,
    map: GameMap,
    summary: RunSummary,
    view: ViewState,
    showThermals: boolean,
): void => {
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

    const base = createFitTransform(canvas.width, canvas.height, map.worldWidth, map.worldHeight);
    view.baseScale = base.a;
    view.baseOffsetX = base.offsetX;
    view.baseOffsetY = base.offsetY;

    const scale = base.a * view.zoom;
    const transform = {
        a: scale,
        b: 0,
        c: 0,
        d: scale,
        offsetX: base.offsetX + view.panX,
        offsetY: base.offsetY + view.panY,
    };

    map.setWindSettings(summary.wind);
    map.render(ctx, transform, summary.durationSec, {
        visibility: showThermals ? ThermikVisibility.Visible : ThermikVisibility.Hidden,
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

const renderFlightLog = (container: HTMLElement, summary: RunSummary): void => {
    container.replaceChildren();

    const events: TurnpointEvent[] = summary.turnpointEvents;
    const entries: Array<{ label: string; timeSec: number; altitudeM: number; detail?: string }> = [
        {
            label: "Start",
            timeSec: 0,
            altitudeM: summary.startAltitudeM,
        },
        ...events.map((event) => ({
            label: event.name,
            timeSec: event.timeSec,
            altitudeM: event.altitudeM,
            detail: `min ${Math.round(event.minAltitudeM)} m`,
        })),
        {
            label: "Landung",
            timeSec: summary.durationSec,
            altitudeM: summary.endAltitudeM,
        },
    ];

    entries.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "log-item";

        const label = document.createElement("span");
        label.textContent = entry.label;

        const time = document.createElement("span");
        time.textContent = formatDuration(entry.timeSec);
        time.className = "muted";

        const altitude = document.createElement("span");
        altitude.textContent = `${Math.round(entry.altitudeM)} m${entry.detail ? ` (${entry.detail})` : ""}`;

        row.append(label, time, altitude);
        container.append(row);
    });
};

const drawAltitudeGraph = (canvas: HTMLCanvasElement, summary: RunSummary): void => {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#fffdfa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#d9d3c9";
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    if (summary.samples.length < 2) {
        ctx.fillStyle = "#7a7267";
        ctx.font = "12px 'Space Grotesk', 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Keine Hoehendaten", canvas.width / 2, canvas.height / 2);
        return;
    }

    const padding = 18 * ratio;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    const times = summary.samples.map((sample) => sample.timeSec);
    const altitudes = summary.samples.map((sample) => sample.altitudeM);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const minAlt = Math.min(...altitudes);
    const maxAlt = Math.max(...altitudes);

    const timeSpan = Math.max(maxTime - minTime, 1);
    const altSpan = Math.max(maxAlt - minAlt, 1);

    ctx.strokeStyle = "#2f5c8c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    summary.samples.forEach((sample, index) => {
        const x = padding + ((sample.timeSec - minTime) / timeSpan) * width;
        const y = padding + height - ((sample.altitudeM - minAlt) / altSpan) * height;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    ctx.fillStyle = "#7a7267";
    ctx.font = "11px 'Space Grotesk', 'Trebuchet MS', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${Math.round(maxAlt)} m`, padding, padding - 14 * ratio);
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${Math.round(minAlt)} m`, padding, padding + height + 12 * ratio);
};

const createDetailsSection = (title: string, open: boolean) => {
    const details = document.createElement("details");
    details.className = "summary-details";
    details.open = open;

    const summaryEl = document.createElement("summary");
    summaryEl.textContent = title;

    const content = document.createElement("div");
    content.className = "details-content";

    details.append(summaryEl, content);

    return { element: details, content };
};

const createMapOverlay = (onClose: () => void) => {
    const overlay = document.createElement("div");
    overlay.className = "overlay summary-map-modal hidden";

    const panel = document.createElement("div");
    panel.className = "panel summary-map-panel";

    const header = document.createElement("div");
    header.className = "summary-header";

    const title = document.createElement("h2");
    title.textContent = "Karte";

    const closeButton = createButton("Schliessen", onClose, "secondary");
    closeButton.classList.add("small");

    header.append(title, closeButton);

    const canvas = document.createElement("canvas");
    canvas.className = "summary-canvas summary-canvas-large";

    panel.append(header, canvas);
    overlay.append(panel);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            onClose();
        }
    });

    return { element: overlay, canvas };
};

const attachMapInteractions = (
    canvas: HTMLCanvasElement,
    view: ViewState,
    onChange: () => void,
): (() => void) => {
    const pointers = new Map<number, { x: number; y: number }>();
    let dragStart: { x: number; y: number } | null = null;
    let dragOrigin: { x: number; y: number } | null = null;
    let pinchStart: { distance: number; zoom: number; center: { x: number; y: number } } | null = null;

    const getPoint = (event: PointerEvent): { x: number; y: number } => {
        const rect = canvas.getBoundingClientRect();
        const ratio = canvas.width / Math.max(rect.width, 1);
        return {
            x: (event.clientX - rect.left) * ratio,
            y: (event.clientY - rect.top) * ratio,
        };
    };

    const updatePinchStart = (): void => {
        const points = [...pointers.values()];
        if (points.length < 2) {
            pinchStart = null;
            return;
        }
        const [p1, p2] = points;
        const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        pinchStart = {
            distance: Math.hypot(p2.x - p1.x, p2.y - p1.y),
            zoom: view.zoom,
            center,
        };
    };

    const onPointerDown = (event: PointerEvent): void => {
        event.preventDefault();
        const point = getPoint(event);
        pointers.set(event.pointerId, point);
        canvas.setPointerCapture(event.pointerId);
        canvas.classList.add("dragging");

        if (pointers.size === 1) {
            dragStart = point;
            dragOrigin = { x: view.panX, y: view.panY };
        } else if (pointers.size === 2) {
            updatePinchStart();
        }
    };

    const onPointerMove = (event: PointerEvent): void => {
        if (!pointers.has(event.pointerId)) {
            return;
        }
        const point = getPoint(event);
        pointers.set(event.pointerId, point);

        if (pointers.size === 1 && dragStart && dragOrigin) {
            view.panX = dragOrigin.x + (point.x - dragStart.x);
            view.panY = dragOrigin.y + (point.y - dragStart.y);
            onChange();
            return;
        }

        if (pointers.size === 2 && pinchStart) {
            const points = [...pointers.values()];
            const [p1, p2] = points;
            const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const nextZoom = clamp(pinchStart.zoom * (distance / Math.max(pinchStart.distance, 1)), 0.5, 5);
            zoomAround(view, center, nextZoom);
            onChange();
        }
    };

    const onPointerEnd = (event: PointerEvent): void => {
        pointers.delete(event.pointerId);
        if (pointers.size === 0) {
            dragStart = null;
            dragOrigin = null;
            pinchStart = null;
            canvas.classList.remove("dragging");
        } else if (pointers.size === 1) {
            const [remaining] = pointers.values();
            dragStart = remaining;
            dragOrigin = { x: view.panX, y: view.panY };
            pinchStart = null;
        } else {
            updatePinchStart();
        }
    };

    const onWheel = (event: WheelEvent): void => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const ratio = canvas.width / Math.max(rect.width, 1);
        const point = {
            x: (event.clientX - rect.left) * ratio,
            y: (event.clientY - rect.top) * ratio,
        };
        const factor = event.deltaY < 0 ? 1.1 : 0.9;
        const nextZoom = clamp(view.zoom * factor, 0.5, 5);
        zoomAround(view, point, nextZoom);
        onChange();
    };

    const onContextMenu = (event: Event): void => {
        event.preventDefault();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerEnd);
    canvas.addEventListener("pointercancel", onPointerEnd);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);

    return () => {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerEnd);
        canvas.removeEventListener("pointercancel", onPointerEnd);
        canvas.removeEventListener("wheel", onWheel);
        canvas.removeEventListener("contextmenu", onContextMenu);
    };
};

const zoomAround = (view: ViewState, point: { x: number; y: number }, nextZoom: number): void => {
    const worldX = (point.x - view.baseOffsetX - view.panX) / (view.baseScale * view.zoom);
    const worldY = (point.y - view.baseOffsetY - view.panY) / (view.baseScale * view.zoom);
    view.zoom = nextZoom;
    view.panX = point.x - view.baseOffsetX - worldX * view.baseScale * view.zoom;
    view.panY = point.y - view.baseOffsetY - worldY * view.baseScale * view.zoom;
};

const computeDistance = (samples: RunSummary["samples"]): number => {
    let distance = 0;
    for (let i = 1; i < samples.length; i += 1) {
        const prev = samples[i - 1];
        const curr = samples[i];
        distance += Math.hypot(curr.x - prev.x, curr.y - prev.y);
    }
    return distance;
};

const formatDistance = (distanceM: number): string => {
    if (distanceM >= 1000) {
        return `${(distanceM / 1000).toFixed(1)} km`;
    }
    return `${Math.round(distanceM)} m`;
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

const createToggleRow = (label: string, value: boolean) => {
    const row = document.createElement("div");
    row.className = "row";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = value;

    row.append(labelEl, toggle);
    return { row, toggle };
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
