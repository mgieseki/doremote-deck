import streamDeck, {SingletonAction, action, type KeyDownEvent, type WillAppearEvent, type WillDisappearEvent, type SendToPluginEvent} from "@elgato/streamdeck";
import type {ConnectionManager, SessionState} from "../ConnectionManager";

export const CONNECT_ACTION_UUID = "com.mgieseking.doremote-deck.connect";

@action({ UUID: CONNECT_ACTION_UUID })
export class ConnectAction extends SingletonAction {
    private instances = new Map<string, any>();

    constructor(private readonly conn: ConnectionManager) {
        super();
        this.conn.onStateChange((s) => this.updateAll(s));
    }

    override onWillAppear(ev: WillAppearEvent): void {
        this.instances.set(ev.action.id, ev.action);
        this.updateOne(ev.action, this.conn.getState());
    }

    override onWillDisappear(ev: WillDisappearEvent): void {
        this.instances.delete(ev.action.id);
    }

    override async onKeyDown(ev: KeyDownEvent): Promise<void> {
        const state = this.conn.getState();
        if (state === "connected") {
            this.conn.disconnect();
            await ev.action.showOk();
        }
        else {
            const next = this.conn.connectOnce("manual connect");
            if (next === "connected")
                await ev.action.showOk();
            else
                await ev.action.showAlert();
        }
    }

    override async onSendToPlugin(ev: SendToPluginEvent<any, Settings>): Promise<void> {
        streamDeck.ui.sendToPropertyInspector({
            port:  this.conn.getPort(),
            token: this.conn.getSessionToken(),
            version: this.conn.getDoricoVersion()
        });
    }

    private updateAll(state: SessionState) {
        for (const a of this.instances.values())
            this.updateOne(a, state);
    }

    private updateOne(a: any, state: SessionState) {
        const connected = state === "connected";
        a.setState(connected ? 1 : 0);
        a.setTitle(state === "denied" ? "Denied" : connected ? "Dis-\nconnect" : "Connect");
    }
}

type Settings = {
    port: string,
    token: string,
    version: string;
};