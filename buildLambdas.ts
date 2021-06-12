import {buildSync} from "esbuild";
import path from "path";

export async function buildLambdas() {
    buildSync({
        bundle: true,
        entryPoints: [path.resolve(__dirname, "lambda", "src", "index.ts")],
        external: ["aws-sdk"],
        format: "cjs",
        outfile: path.join(__dirname, "lambda", "dist", "index.js"),
        platform: "node",
        sourcemap: true,
        target: "node12.2"
    });
}

buildLambdas();
