import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";
import url from "node:url";
import fs from "node:fs";
import { spawn } from "node:child_process";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.mgieseking.doremote-deck.sdPlugin";

const restartPlugin = (pluginId) => ({
    name: "restart-streamdeck-on-bundle",
    writeBundle() {
        if (!isWatching) return;
        spawn("streamdeck", ["restart", pluginId], { stdio: "inherit", shell: true });
    }
});

function copyFile(src, dst) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
}

const copyNativePlugin = (sdPluginDir) => ({
    name: "copy-native",
    writeBundle() {
        copyFile("build/Release/DoremoteBindings.node", `${sdPluginDir}/native/DoremoteBindings.node`);
        copyFile("native/doremote.dll", `${sdPluginDir}/native/doremote.dll`);
    }
});

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
    input: "src/plugin.ts",
    output: {
        file: `${sdPlugin}/bin/plugin.js`,
        sourcemap: isWatching,
        sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
            return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
        }
    },
    plugins: [
        {
            name: "watch-externals",
            buildStart: function () {
                this.addWatchFile(`${sdPlugin}/manifest.json`);
            },
        },
        typescript({
            mapRoot: isWatching ? "./" : undefined
        }),
        nodeResolve({
            browser: false,
            exportConditions: ["node"],
            preferBuiltins: true
        }),
        commonjs(),
        !isWatching && terser(),
        copyNativePlugin(sdPlugin),
        {
            name: "emit-module-package-file",
            generateBundle() {
                this.emitFile({ fileName: "package.json", source: `{ "type": "module" }`, type: "asset" });
            }
        }
    ]
};

export default config;
