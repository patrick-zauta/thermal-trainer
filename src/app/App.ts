import { defaultSettings } from "./defaults";
import { loadSettings, saveSettings } from "./storage";
import type { ModeSelection, RunSummary, Settings } from "./types";
import { createHomeScreen } from "./screens/HomeScreen";
import { createModeScreen } from "./screens/ModeScreen";
import { createSettingsScreen } from "./screens/SettingsScreen";
import { createSummaryScreen } from "./screens/SummaryScreen";
import { createPauseOverlay } from "./screens/PauseOverlay";
import type { Screen } from "./screens/types";
import { Game } from "../game/Game";
import { Map } from "../game/Map";

export class App {
    private readonly root: HTMLElement;
    private settings: Settings;
    private modeSelection: ModeSelection = { mode: "training", thermalVisibility: "visible" };
    private currentScreen: Screen | null = null;
    private game: Game | null = null;
    private pauseOverlay: ReturnType<typeof createPauseOverlay> | null = null;

    public constructor(root: HTMLElement) {
        this.root = root;
        this.settings = loadSettings();
    }

    public start(): void {
        this.showHome();
    }

    private setScreen(screen: Screen): void {
        if (this.currentScreen?.dispose) {
            this.currentScreen.dispose();
        }
        this.root.replaceChildren(screen.element);
        this.currentScreen = screen;
    }

    private showHome(): void {
        this.stopGame();
        this.setScreen(
            createHomeScreen({
                onStart: () => this.showMode(),
                onSettings: () => this.showSettings(),
            }),
        );
    }

    private showMode(): void {
        this.stopGame();
        this.setScreen(
            createModeScreen(this.modeSelection, {
                onStart: (selection) => {
                    this.modeSelection = selection;
                    this.startGame(selection);
                },
                onBack: () => this.showHome(),
            }),
        );
    }

    private showSettings(): void {
        this.stopGame();
        this.setScreen(
            createSettingsScreen(this.settings, {
                onUpdate: (next) => this.updateSettings(next),
                onBack: () => this.showHome(),
                onFullscreen: () => this.requestFullscreen(),
            }),
        );
    }

    private showSummary(summary: RunSummary): void {
        this.stopGame();
        const map = new Map();
        this.setScreen(
            createSummaryScreen(summary, map, {
                onRepeat: () => this.startGame(this.modeSelection),
                onHome: () => this.showHome(),
            }),
        );
    }

    private startGame(selection: ModeSelection): void {
        this.stopGame();
        const container = document.createElement("div");
        container.className = "screen screen-game";

        const canvas = document.createElement("canvas");
        canvas.id = "game-canvas";

        const pauseOverlay = createPauseOverlay(this.settings, {
            onResume: () => {
                this.game?.setPaused(false);
            },
            onRestart: () => {
                this.game?.reset();
                this.game?.setPaused(false);
            },
            onHome: () => this.showHome(),
            onExit: () => this.exitRun(),
            onToggleAudio: () => {
                const next = { ...this.settings, audioEnabled: !this.settings.audioEnabled };
                this.updateSettings(next);
                pauseOverlay.setAudioState(next);
                this.game?.setAudioEnabled(next.audioEnabled);
            },
        });

        container.append(canvas, pauseOverlay.element);

        this.setScreen({ element: container });

        const game = new Game(canvas, {
            mode: selection.mode,
            thermalVisibility: selection.thermalVisibility,
            keybindings: this.settings.keybindings,
            audioEnabled: this.settings.audioEnabled,
            masterVolume: this.settings.masterVolume,
            touchControls: this.settings.touchControls,
        });

        this.game = game;
        this.pauseOverlay = pauseOverlay;

        game.setPauseCallback((paused) => {
            pauseOverlay.setVisible(paused);
        });

        game.start();
    }

    private exitRun(): void {
        if (!this.game) {
            return;
        }
        const summary = this.game.getSummary();
        this.showSummary(summary);
    }

    private stopGame(): void {
        if (this.game) {
            this.game.stop();
            this.game = null;
        }
        this.pauseOverlay = null;
    }

    private updateSettings(next: Settings): void {
        this.settings = {
            ...next,
            keybindings: next.keybindings ?? defaultSettings.keybindings,
            touchControls: next.touchControls ?? defaultSettings.touchControls,
        };
        saveSettings(this.settings);
        if (this.game) {
            this.game.setKeybindings(this.settings.keybindings);
            this.game.setAudioEnabled(this.settings.audioEnabled);
            this.game.setMasterVolume(this.settings.masterVolume);
            this.game.setTouchControlsMode(this.settings.touchControls);
        }
        if (this.pauseOverlay) {
            this.pauseOverlay.setAudioState(this.settings);
        }
    }

    private requestFullscreen(): void {
        const element = document.documentElement;
        if (!element.requestFullscreen) {
            return;
        }
        void element.requestFullscreen();
    }
}
