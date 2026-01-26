type GridNode = {
    height: number | null;
    inflight: boolean;
    lastFail: number;
};

type HeightRequest = {
    key: string;
    easting: number;
    northing: number;
};

const RETRY_DELAY_MS = 10000;

export class LazyGridHeightField {
    private readonly xmin: number;
    private readonly ymin: number;
    private readonly xmax: number;
    private readonly ymax: number;
    private readonly cellSize: number;
    private readonly gridX: number;
    private readonly gridY: number;
    private readonly nodes = new Map<string, GridNode>();
    private readonly queue: HeightRequest[] = [];
    private readonly queued = new Set<string>();
    private readonly maxConcurrent: number;
    private active = 0;
    private lastKnownHeight: number | null = null;

    public constructor(bbox: { xmin: number; ymin: number; xmax: number; ymax: number }, cellSize = 250, maxConcurrent = 4) {
        this.xmin = bbox.xmin;
        this.ymin = bbox.ymin;
        this.xmax = bbox.xmax;
        this.ymax = bbox.ymax;
        this.cellSize = cellSize;
        this.gridX = Math.ceil((this.xmax - this.xmin) / this.cellSize) + 1;
        this.gridY = Math.ceil((this.ymax - this.ymin) / this.cellSize) + 1;
        this.maxConcurrent = maxConcurrent;
    }

    public getHeightAt(easting: number, northing: number): number | null {
        const clamped = this.clampCoord(easting, northing);
        const i0 = clamp(Math.floor((clamped.easting - this.xmin) / this.cellSize), 0, this.gridX - 1);
        const j0 = clamp(Math.floor((clamped.northing - this.ymin) / this.cellSize), 0, this.gridY - 1);
        const i1 = clamp(i0 + 1, 0, this.gridX - 1);
        const j1 = clamp(j0 + 1, 0, this.gridY - 1);

        const x0 = this.xmin + i0 * this.cellSize;
        const x1 = this.xmin + i1 * this.cellSize;
        const y0 = this.ymin + j0 * this.cellSize;
        const y1 = this.ymin + j1 * this.cellSize;
        const fx = x1 === x0 ? 0 : (clamped.easting - x0) / (x1 - x0);
        const fy = y1 === y0 ? 0 : (clamped.northing - y0) / (y1 - y0);

        const n00 = this.ensureNode(i0, j0);
        const n10 = this.ensureNode(i1, j0);
        const n01 = this.ensureNode(i0, j1);
        const n11 = this.ensureNode(i1, j1);

        this.pumpQueue();

        if (n00.height !== null && n10.height !== null && n01.height !== null && n11.height !== null) {
            const top = lerp(n00.height, n10.height, fx);
            const bottom = lerp(n01.height, n11.height, fx);
            const value = lerp(top, bottom, fy);
            this.lastKnownHeight = value;
            return value;
        }

        const fallback = nearestAvailable(
            [
                { height: n00.height, dx: fx, dy: fy },
                { height: n10.height, dx: 1 - fx, dy: fy },
                { height: n01.height, dx: fx, dy: 1 - fy },
                { height: n11.height, dx: 1 - fx, dy: 1 - fy },
            ],
            this.lastKnownHeight,
        );
        if (fallback !== null) {
            this.lastKnownHeight = fallback;
        }
        return fallback;
    }

    private ensureNode(i: number, j: number): GridNode {
        const key = `${i}:${j}`;
        let node = this.nodes.get(key);
        if (!node) {
            node = { height: null, inflight: false, lastFail: 0 };
            this.nodes.set(key, node);
        }

        if (node.height === null && !node.inflight) {
            const now = Date.now();
            if (node.lastFail + RETRY_DELAY_MS <= now && !this.queued.has(key)) {
                const easting = this.xmin + i * this.cellSize;
                const northing = this.ymin + j * this.cellSize;
                this.queue.push({ key, easting, northing });
                this.queued.add(key);
            }
        }

        return node;
    }

    private pumpQueue(): void {
        while (this.active < this.maxConcurrent && this.queue.length > 0) {
            const request = this.queue.shift();
            if (!request) {
                return;
            }
            this.queued.delete(request.key);
            const node = this.nodes.get(request.key);
            if (!node || node.inflight) {
                continue;
            }
            node.inflight = true;
            this.active += 1;
            void fetchHeight(request.easting, request.northing)
                .then((height) => {
                    node.height = height;
                    node.lastFail = 0;
                })
                .catch(() => {
                    node.lastFail = Date.now();
                })
                .finally(() => {
                    node.inflight = false;
                    this.active -= 1;
                });
        }
    }

    private clampCoord(easting: number, northing: number): { easting: number; northing: number } {
        return {
            easting: clamp(easting, this.xmin, this.xmax),
            northing: clamp(northing, this.ymin, this.ymax),
        };
    }
}

const fetchHeight = async (easting: number, northing: number): Promise<number> => {
    const url = `https://api3.geo.admin.ch/rest/services/height?easting=${easting}&northing=${northing}&sr=2056`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Height request failed");
    }
    const data = (await response.json()) as { height?: string | number };
    const height = typeof data.height === "string" ? Number.parseFloat(data.height) : Number(data.height);
    if (!Number.isFinite(height)) {
        throw new Error("Invalid height");
    }
    return height;
};

const nearestAvailable = (
    candidates: Array<{ height: number | null; dx: number; dy: number }>,
    fallback: number | null,
): number | null => {
    let best = fallback;
    let bestDist = Infinity;
    for (const candidate of candidates) {
        if (candidate.height === null) {
            continue;
        }
        const dist = candidate.dx * candidate.dx + candidate.dy * candidate.dy;
        if (dist < bestDist) {
            bestDist = dist;
            best = candidate.height;
        }
    }
    return best ?? null;
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;
