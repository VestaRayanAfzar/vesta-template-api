let gulp = require('gulp');
let path = require('path');
let http = require('http');
let server = require('gulp-develop-server');

const root = __dirname;

const dir = {
    root: root,
    build: path.join(root, 'vesta'),
    buildServer: path.join(root, 'vesta/server'),
};

const debug = {type: 'inspect', ports: {debug: 5858, inspect: 9229}, address: '192.168.99.100'};

/**
 * This tasks is called by npm script for starting api server in docker env
 */
gulp.task('api', function () {
    let delay = 500, debuggerDelay = 500, timer, debuggerTimer;
    let port = debug.ports[debug.type];
    server.listen({path: `${dir.buildServer}/app.js`, execArgv: [`--${debug.type}=0.0.0.0:${port}`]});
    let isInspect = debug.type === 'inspect';
    isInspect && loadDebugger();
    gulp.watch([`${dir.buildServer}/**/*.js`], () => {
        clearTimeout(timer);
        clearTimeout(debuggerTimer);
        timer = setTimeout(() => {
            server.restart();
            isInspect && loadDebugger();
        }, delay);
    });

    function loadDebugger() {
        debuggerTimer = setTimeout(launchInspector, debuggerDelay);

        function launchInspector() {
            http.get(`http://${debug.address}:${debug.ports.inspect}/json`, res => {
                res.setEncoding('utf8');
                let rawData = '';
                res.on('data', chunk => {
                    rawData += chunk;
                });
                res.on('end', () => {
                    let data = JSON.parse(rawData);
                    let url = data[0]['devtoolsFrontendUrl'];
                    let regex = new RegExp(`&ws=[^:]+:${debug.ports.inspect}\/`);
                    url = url.replace(regex, `&ws=${debug.address}:${debug.ports.inspect}/`);
                    process.stdout.write(`\n\nInspect URL: \n${url}\n\n`);
                })
            }).on('error', err => process.stderr.write(err.message));
        }
    }
});
