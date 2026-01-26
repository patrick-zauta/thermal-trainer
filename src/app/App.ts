import { defaultSettings } from "./defaults";
import {
    loadLastChallengeSetup,
    loadLastRunSetup,
    loadSettings,
    saveLastChallengeSetup,
    saveLastRunSetup,
    saveSettings,
} from "./storage";
import type { RunConfig, RunSummary, Settings } from "./types";
import { FlightMode } from "./types";
import { createHomeScreen } from "./screens/HomeScreen";
import { createModeScreen } from "./screens/ModeScreen";
import { createChallengesScreen } from "./screens/ChallengesScreen";
import { createSettingsScreen } from "./screens/SettingsScreen";
import { createSummaryScreen } from "./screens/SummaryScreen";
import { createPauseOverlay } from "./screens/PauseOverlay";
import { createEndOverlay } from "./screens/EndOverlay";
import type { Screen } from "./screens/types";
import { Game } from "../game/Game";
import { Map } from "../game/Map";
import { getMapDefinition } from "../data/mvpMap";
import { createAttributionOverlay } from "../game/ui/AttributionOverlay";
import { createIndividualMap } from "../game/map/RandomMapFactory";
import { getScenarioById } from "../game/challenge/scenarios";

export class App {
    private readonly root: HTMLElement;
    private settings: Settings;
    private lastRunSetup: RunConfig;
    private lastChallengeSetup = loadLastChallengeSetup();
    private currentScreen: Screen | null = null;
    private game: Game | null = null;
    private pauseOverlay: ReturnType<typeof createPauseOverlay> | null = null;

    public constructor(root: HTMLElement) {
        this.root = root;
        this.settings = loadSettings();
        this.lastRunSetup = loadLastRunSetup();
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
            createHomeScreen(this.settings, {
                onStart: () => this.showMode(),
                onChallenges: () => this.showChallenges(),
                onSettings: () => this.showSettings(),
                onToggleAudio: (enabled) => {
                    const next = { ...this.settings, audioEnabled: enabled };
                    this.updateSettings(next);
                },
            }),
        );
    }

    private showMode(): void {
        this.stopGame();
        this.setScreen(
            createModeScreen(this.lastRunSetup, {
                onStart: (selection) => {
                    this.lastRunSetup = selection;
                    saveLastRunSetup(selection);
                    this.startGame(selection);
                },
                onBack: () => this.showHome(),
            }),
        );
    }

    private showChallenges(): void {
        this.stopGame();
        this.setScreen(
            createChallengesScreen(this.lastChallengeSetup, {
                onStart: (runConfig) => {
                    this.lastChallengeSetup = { scenarioId: runConfig.scenarioId ?? "", wind: runConfig.wind };
                    saveLastChallengeSetup(this.lastChallengeSetup);
                    this.startGame(runConfig);
                },
                onBack: () => this.showHome(),
                onUpdate: (setup) => {
                    this.lastChallengeSetup = setup;
                    saveLastChallengeSetup(setup);
                },
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
        const scenario = summary.scenarioId ? getScenarioById(summary.scenarioId) : null;
        const map = new Map(summary.mapDefinition, scenario ? scenario.thermalField : undefined);
        this.setScreen(
            createSummaryScreen(summary, map, {
                onRepeat: () => this.startGame(this.lastRunSetup),
                onHome: () => this.showHome(),
            }),
        );
    }

    private startGame(runConfig: RunConfig): void {
        this.stopGame();
        this.lastRunSetup = runConfig;
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

        const endOverlay = createEndOverlay({
            onContinue: () => this.exitRun(),
        });

        const attribution = createAttributionOverlay("© swisstopo");

        container.append(canvas, pauseOverlay.element, endOverlay.element, attribution);

        this.setScreen({ element: container });

        const scenario = runConfig.scenarioId ? getScenarioById(runConfig.scenarioId) : null;
        const mapDefinition =
            scenario?.mapDefinition ??
            (runConfig.mode === FlightMode.Individual && runConfig.individualConfig
                ? createIndividualMap(runConfig.individualConfig)
                : getMapDefinition(runConfig.mapId));
        const backgroundSettings = scenario
            ? { wmtsEnabled: true, wmtsLayer: "ch.swisstopo.pixelkarte-grau", wmtsOpacity: 0.65 }
            : resolveBackground(runConfig.mapId);

        const game = new Game(canvas, {
            runConfig,
            keybindings: this.settings.keybindings,
            audioEnabled: this.settings.audioEnabled,
            masterVolume: this.settings.masterVolume,
            touchControls: this.settings.touchControls,
            background: backgroundSettings,
            mapDefinition,
        });

        this.game = game;
        this.pauseOverlay = pauseOverlay;

        game.setPauseCallback((paused) => {
            pauseOverlay.setVisible(paused);
        });
        game.setEndCallback((state) => {
            pauseOverlay.setVisible(false);
            endOverlay.setVisible(true, state);
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

const resolveBackground = (mapId: RunConfig["mapId"]): { wmtsEnabled: boolean; wmtsLayer: string; wmtsOpacity: number } => {
    if (mapId === "swisstopo") {
        return {
            wmtsEnabled: true,
            wmtsLayer: "ch.swisstopo.pixelkarte-grau",
            wmtsOpacity: 0.65,
        };
    }
    return {
        wmtsEnabled: false,
        wmtsLayer: "ch.swisstopo.pixelkarte-grau",
        wmtsOpacity: 0.65,
    };
};
