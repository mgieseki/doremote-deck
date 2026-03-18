import streamDeck from "@elgato/streamdeck";
import {
    createDoremote,
    DOREMOTE_CONNECTED,
    DOREMOTE_CONNECTION_DENIED,
    DOREMOTE_OFFLINE,
    type IDoremote
} from "./native/DoremoteBindings";

export type GlobalSettings = {
    port?: string;
    token?: string;
    autoReconnect?: boolean;
};

export type SessionState = "connected" | "denied" | "offline";

const defaultGlobalSettings: GlobalSettings = {
    port: "4560",
    token: "",
    autoReconnect: true,
};

export class ConnectionManager {
    private remote: IDoremote = createDoremote();

    private globals: GlobalSettings = defaultGlobalSettings;

    private state: SessionState = "offline";
    private listeners = new Set<(s: SessionState, reason: string) => void>();

    private userRequestedDisconnect = false;

    private reconnectTimer: NodeJS.Timeout | undefined;
    private reconnectAttempt = 0;

    private connectivityTimer: NodeJS.Timeout | undefined;
    private offlineStreak = 0;

    constructor () {
        void this.loadGlobalSettings();
    }

    private async loadGlobalSettings(): Promise<void> {
        const loaded = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
        this.globals = { ...defaultGlobalSettings, ...(loaded ?? {}) };
    }

    onStateChange(fn: (s: SessionState, reason: string) => void) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private setState(s: SessionState, reason: string) {
        if (this.state === s) return;
        this.state = s;
        for (const fn of this.listeners)
            fn(s, reason);
    }

    getState() {return this.state;}
    getSessionToken() {return this.globals.token;}
    getPort() {return this.globals.port;}

    getDoricoVersion() {
        if (this.state !== "connected")
            return "";
        const info = this.remote.getAppInfo();
        return String(info.variant) + " " + info.number;
    }

    setGlobalSettings(s: GlobalSettings) { this.globals = { ...this.globals, ...s }; }
    getGlobalSettings() {return this.globals;}

    isServiceUp(): boolean {
        try {
            return this.remote.isServiceUp();
        }
        catch {
            return false;
        }
    }

    connectOnce(reason = "connectOnce"): SessionState {
        streamDeck.logger.info("state: ", this.getState());
        this.userRequestedDisconnect = false;
        const name = "Doremote Deck";
        const host = "127.0.0.1";
        const port = this.globals.port ?? "4560";
        const token = (this.globals.token ?? "").trim();
        streamDeck.logger.info("token: ", token);
        let rc = -1;
        try {
            rc = token
                ? this.remote.reconnect(name, host, port, token)
                : this.remote.connect(name, host, port);
            if (token && rc === DOREMOTE_CONNECTION_DENIED)  // previous token no longer valid?
                rc = this.remote.connect(name, host, port);
        }
        catch {
            rc = -1;
        }
        streamDeck.logger.info("rc: ", rc);
        switch (rc) {
            case DOREMOTE_CONNECTED:
                const newToken = this.remote.sessionToken() ?? "";
                streamDeck.logger.info("new token: ", newToken);
                if (newToken)
                    this.globals.token = newToken;
                this.reconnectAttempt = 0;
                this.cancelReconnect();
                this.setState("connected", reason);
                return "connected";
            case DOREMOTE_CONNECTION_DENIED:
                streamDeck.logger.info("in DENIED");
                this.cancelReconnect();
                this.globals.token = "";
                this.setState("denied", reason);
                return "denied"
            default:
                this.setState("offline", reason);
                this.scheduleReconnect("offline after connect");
        }
        return "offline";
    }

    disconnect(reason = "user disconnect") {
        this.userRequestedDisconnect = true;
        this.cancelReconnect();
        try { this.remote.disconnect(); } catch {}
        this.setState("offline", reason);
    }

    startMonitoring() {
        this.stopMonitoring();
        this.connectivityTimer = setInterval(() => {
            const up = this.isServiceUp();
            if (!up) {
                this.offlineStreak++;
                if (this.offlineStreak >= 2) {
                    if (this.state === "connected")
                        this.setState("offline", "service down");
                    this.scheduleReconnect("service down");
                }
                return;
            }
            this.offlineStreak = 0;
            if (this.state === "offline" && !this.userRequestedDisconnect && this.globals.autoReconnect)
                this.scheduleReconnect("service up");
        }, 1000);
    }

    stopMonitoring() {
        if (this.connectivityTimer) clearInterval(this.connectivityTimer);
        this.connectivityTimer = undefined;
        this.offlineStreak = 0;
    }

    private cancelReconnect() {
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
    }

    private scheduleReconnect(reason: string) {
        if (this.userRequestedDisconnect) return;
        if (!this.globals.autoReconnect) return;
        if (this.state === "denied") return;
        if (this.state === "connected") return;
        if (this.reconnectTimer) return;

        const base = 1000;
        const cap = 30000;
        const delay = Math.min(cap, base * Math.pow(2, this.reconnectAttempt)) + Math.floor(Math.random() * 250);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            this.reconnectAttempt++;
            this.connectOnce(`auto-reconnect (${reason})`);
        }, delay);
    }

    sendCommand(command: string): number {
        if (this.getState() !== "connected")
            return -1;
        return this.remote.sendCommand(command);
    }

    sendCommands(commands: string[]): number {
        if (this.getState() !== "connected")
            return -1;
        for (const cmd of commands) {
            const rc = this.remote.sendCommand(cmd);
            if (rc === 0)
                return 0;
        }
        return 1;
    }
}
