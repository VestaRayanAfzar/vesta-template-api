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

/**
 * in case of using docker toolbox change the address for updated inspector url,
 * otherwise use chrome developer console for connecting to inspector
 */
const debug = {address: null, port: 9229};

/**
 * This tasks is called by npm script for starting api server in docker env
 */
gulp.task('api', function () {
    let delay = 500, debuggerDelay = 500, timer, debuggerTimer;
    const {address, port} = debug;
    server.listen({path: `${dir.buildServer}/app.js`, execArgv: [`--inspect=0.0.0.0:${port}`]});
    address && loadDebugger();
    gulp.watch([`${dir.buildServer}/**/*.js`], () => {
        clearTimeout(timer);
        clearTimeout(debuggerTimer);
        timer = setTimeout(() => {
            server.restart();
            address && loadDebugger();
        }, delay);
    });

    function loadDebugger() {
        debuggerTimer = setTimeout(launchInspector, debuggerDelay);

        function launchInspector() {
            const {address, port} = debug;
            http.get(`http://${address}:${port}/json`, res => {
                res.setEncoding('utf8');
                let rawData = '';
                res.on('data', chunk => {
                    rawData += chunk;
                });
                res.on('end', () => {
                    let data = JSON.parse(rawData);
                    let url = data[0]['devtoolsFrontendUrl'];
                    let regex = new RegExp(`&ws=[^:]+:${port}\/`);
                    url = url.replace(regex, `&ws=${address}:${port}/`);
                    process.stdout.write(`\n\nInspect URL: \n${url}\n\n`);
                })
            }).on('error', err => process.stderr.write(err.message));
        }
    }
});
