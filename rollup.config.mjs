import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

/**
 * @type { import("rollup").RollupOptions }
 */
export default {
    input: "src/index.ts",
    output: [{
        file: "dist/worker.min.js",
        format: "esm",
        sourcemap: true,
        plugins: [terser()]
    }, {
        file: "dist/worker.js",
        format: "esm",
        sourcemap: true
    }],
    plugins: [nodeResolve(), typescript()]
};