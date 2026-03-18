import streamDeck, { Action, action, type KeyDownEvent, type DidReceiveSettingsEvent, type WillAppearEvent, SingletonAction } from "@elgato/streamdeck";
import type { ConnectionManager } from "../ConnectionManager";

export const COMMAND_ACTION_UUID = "com.mgieseking.doremote-deck.commands";

type ButtonSettings = {
    commands?: string;
};

@action({ UUID: COMMAND_ACTION_UUID })
export class SendCommandsAction extends SingletonAction<ButtonSettings> {
    constructor(private readonly conn: ConnectionManager) { super(); }

    override onWillAppear(ev: WillAppearEvent<ButtonSettings>): void {
        ev.action.setTitle("Send\nCommand\nSequence");
    }

    override async onKeyDown(ev: KeyDownEvent<ButtonSettings>): Promise<void> {
        if (!ev.payload.settings.commands?.length || this.conn.getState() !== "connected") {
            await ev.action.showAlert();
        }
        else {
            var cmdString = ev.payload.settings.commands.split("\n").join(";").replaceAll(/\s+/g, "");
            var commands = cmdString.split(";").filter(entry => entry);
            for (var cmd of commands) {
                const rc = this.conn.sendCommand(cmd.trim());
                if (rc === 0) {
                    await ev.action.showAlert();
                    break;
                }
            }
        }
    }
}
