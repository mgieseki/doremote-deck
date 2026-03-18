import path from "node:path";
import fs from "node:fs";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

export const DOREMOTE_CONNECTED = 0;
export const DOREMOTE_CONNECTION_DENIED = 1;
export const DOREMOTE_OFFLINE = 2;

export interface IDoremote {
    connect(name: string, host: string, port: string): number;
    reconnect(name: string, host: string, port: string, token: string): number;
    disconnect(): void;

    sendCommand(command: string): number;

    isServiceUp(): boolean;
    sessionToken(): string | null;
    getAppInfo(): { number: string; variant: string };
}

export function createDoremote(): IDoremote {
    const addonPath = path.resolve(__dirname, "..", "native", "DoremoteBindings.node");
    const dllPath = path.resolve(__dirname, "..", "native", "doremote.dll");
    if (!fs.existsSync(dllPath)) throw new Error(`Missing doremote.dll at ${dllPath}`);
    if (!fs.existsSync(addonPath)) throw new Error(`Missing DoremoteBindings.node at ${addonPath}`);

    const addon = require(addonPath);
    return new addon.DoremoteBindings(dllPath) as IDoremote;
}
