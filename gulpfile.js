const gulp = require("gulp");
const path = require("path");
const { execSync } = require("child_process");
const server = require("gulp-develop-server");

const root = __dirname;

const dir = {
    root: root,
    build: {
        build: path.join(root, "build"),
        dev: path.join(root, "tmp/server"),
    },
};

const setting = { dir, production: false, debug: { address: null, port: 9229 } };

module.exports = {
    default: gulp.series(compileTs, api, watch),
    build: gulp.series(production, compileTs),
};

function api() {
    const { port } = setting.debug;
    server.listen({ path: `${dir.build.dev}/index.js`, execArgv: [`--inspect=0.0.0.0:${port}`] });
    return Promise.resolve();
}

function reload() {
    server.restart();
    return Promise.resolve();
}

function compileTs() {
    const options = [setting.production ? "" : "--sourceMap", setting.production ? "" : `--outDir ${dir.build.dev}`];
    try {
        execSync(`npx tsc ${options.join(" ")}`);
    } catch (e) {}
    return Promise.resolve();
}

function production() {
    setting.production = true;
    try {
        execSync(`rm -rf ${dir.build.production}`);
    } catch (e) {}
    return Promise.resolve();
}

function watch() {
    gulp.watch(`${dir.root}/src/**/*`, gulp.series(compileTs, reload));
    return Promise.resolve();
}