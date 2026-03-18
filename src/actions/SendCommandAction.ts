import streamDeck, { Action, action, type KeyDownEvent, type DidReceiveSettingsEvent, type WillAppearEvent, SingletonAction } from "@elgato/streamdeck";
import type { ConnectionManager } from "../ConnectionManager";

export const COMMAND_ACTION_UUID = "com.mgieseking.doremote-deck.command";

type ButtonSettings = {
    command?: string;
};

@action({ UUID: COMMAND_ACTION_UUID })
export class SendCommandAction extends SingletonAction<ButtonSettings> {
    constructor(private readonly conn: ConnectionManager) { super(); }

    override onWillAppear(ev: WillAppearEvent<ButtonSettings>): void {
        ev.action.setTitle("Send\nCommand");
    }

    override async onKeyDown(ev: KeyDownEvent<ButtonSettings>): Promise<void> {
        if (!ev.payload.settings.command?.length || this.conn.getState() !== "connected") {
            await ev.action.showAlert();
        }
        else {
            const rc = this.conn.sendCommand(ev.payload.settings.command);
            if (rc !== 1)
                await ev.action.showAlert();
        }
    }
}
