type TileEntry = {
    image: HTMLImageElement;
    lastUsed: number;
};

type TileRequest = {
    key: string;
    layer: string;
    z: number;
    col: number;
    row: number;
};

const WMTS_BASE = "https://wmts.geo.admin.ch/1.0.0";
const RETRY_DELAY_MS = 10000;

export class WmtsTileSource {
    private readonly cache = new Map<string, TileEntry>();
    private readonly inflight = new Set<string>();
    private readonly queue: TileRequest[] = [];
    private readonly queued = new Set<string>();
    private readonly failures = new Map<string, number>();
    private readonly layerExt = new Map<string, string>();
    private readonly maxTiles: number;
    private readonly maxConcurrent: number;

    public constructor(maxTiles = 256, maxConcurrent = 8) {
        this.maxTiles = maxTiles;
        this.maxConcurrent = maxConcurrent;
    }

    public requestTile(layer: string, z: number, col: number, row: number): HTMLImageElement | null {
        const preferredExt = this.layerExt.get(layer);
        const key = this.buildKey(layer, z, col, row, preferredExt ?? "jpeg");
        const cached = this.cache.get(key);
        if (cached) {
            cached.lastUsed = Date.now();
            return cached.image;
        }

        if (preferredExt && this.shouldSkip(key)) {
            return null;
        }

        if (!this.inflight.has(key) && !this.queued.has(key)) {
            this.queue.push({ key, layer, z, col, row });
            this.queued.add(key);
            this.pumpQueue();
        }

        return null;
    }

    private pumpQueue(): void {
        while (this.inflight.size < this.maxConcurrent && this.queue.length > 0) {
            const request = this.queue.shift();
            if (!request) {
                return;
            }
            this.queued.delete(request.key);
            if (this.inflight.has(request.key)) {
                continue;
            }
            this.inflight.add(request.key);
            void this.loadTile(request)
                .then((entry) => {
                    if (entry) {
                        this.cache.set(entry.key, { image: entry.image, lastUsed: Date.now() });
                        this.pruneCache();
                    }
                })
                .finally(() => {
                    this.inflight.delete(request.key);
                    this.pumpQueue();
                });
        }
    }

    private async loadTile(request: TileRequest): Promise<{ key: string; image: HTMLImageElement } | null> {
        const extCandidates = this.getExtCandidates(request.layer);
        for (const ext of extCandidates) {
            const key = this.buildKey(request.layer, request.z, request.col, request.row, ext);
            if (this.shouldSkip(key)) {
                continue;
            }
            try {
                const url = this.buildUrl(request.layer, request.z, request.col, request.row, ext);
                const image = await loadImage(url);
                this.layerExt.set(request.layer, ext);
                return { key, image };
            } catch {
                this.failures.set(key, Date.now() + RETRY_DELAY_MS);
            }
        }
        return null;
    }

    private getExtCandidates(layer: string): string[] {
        const ext = this.layerExt.get(layer);
        if (ext) {
            return [ext];
        }
        return ["jpeg", "png"];
    }

    private shouldSkip(key: string): boolean {
        const retryAt = this.failures.get(key);
        if (retryAt === undefined) {
            return false;
        }
        if (Date.now() >= retryAt) {
            this.failures.delete(key);
            return false;
        }
        return true;
    }

    private pruneCache(): void {
        if (this.cache.size <= this.maxTiles) {
            return;
        }
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    private buildUrl(layer: string, z: number, col: number, row: number, ext: string): string {
        return `${WMTS_BASE}/${layer}/default/current/2056/${z}/${col}/${row}.${ext}`;
    }

    private buildKey(layer: string, z: number, col: number, row: number, ext: string): string {
        return `${layer}:${z}:${col}:${row}:${ext}`;
    }
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Tile load failed"));
        image.src = url;
    });
};
