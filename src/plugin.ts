import streamDeck from "@elgato/streamdeck";
import { ConnectionManager } from "./ConnectionManager";
import { ConnectAction } from "./actions/ConnectAction";
import { SendCommandAction } from "./actions/SendCommandAction";
import { SendCommandsAction } from "./actions/SendCommandsAction";

const conn = new ConnectionManager();

streamDeck.settings.onDidReceiveGlobalSettings(({ settings }) => {
    conn.setGlobalSettings(settings);
    conn.startMonitoring();
});

conn.onStateChange((state) => {
    streamDeck.settings.setGlobalSettings(conn.getGlobalSettings());
});

streamDeck.actions.registerAction(new ConnectAction(conn));
streamDeck.actions.registerAction(new SendCommandAction(conn));
streamDeck.actions.registerAction(new SendCommandsAction(conn));

streamDeck.connect();