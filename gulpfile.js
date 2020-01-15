const gulp = require('gulp');
const path = require('path');
const { execSync } = require('child_process');
const server = require('gulp-develop-server');

const root = __dirname;

const dir = {
    root: root,
    build: path.join(root, 'vesta'),
    buildServer: path.join(root, 'vesta/server'),
};

const setting = { dir, production: false, debug: { address: null, port: 9229 } };

module.exports = {
    default: gulp.series(compileTs, watch),
    deploy: gulp.series(production, compileTs),
    // This tasks is called by npm script for starting api server in docker env
    api: gulp.series(api, watch)
}

function api() {
    const { port } = setting.debug;
    server.listen({ path: `${dir.buildServer}/index.js`, execArgv: [`--inspect=0.0.0.0:${port}`] });
    return Promise.resolve();
}

function reload() {
            server.restart();
    return Promise.resolve();
}

function compileTs() {
    const options = setting.production ? "" : "--source-map"
    try {
        execSync(`npx tsc ${options}`);
    } catch (e) {}
    return Promise.resolve();
}

function production() {
    setting.production = true;
    return Promise.resolve();
}

function watch() {
    gulp.watch(`${dir.root}/src/**/*`, gulp.series(compileTs, reload));
    return Promise.resolve();
}
