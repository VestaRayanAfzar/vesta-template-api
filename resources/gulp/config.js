let path = require('path');
let fse = require('fs-extra');

let root = path.normalize(path.join(__dirname, '../..'));

const dir = {
    root: root,
    npm: path.join(root, 'node_modules'),
    resource: path.join(root, 'resources'),
    docker: path.join(root, 'resources/docker'),
    src: path.join(root, 'src'),
    gulp: path.join(root, 'resources/gulp'),
    build: path.join(root, 'vesta'),
    buildServer: path.join(root, 'vesta/server'),
};

const debug = {type: 'debug', ports: {debug: 5858, inspect: 9229}, address: '192.168.99.100'};
const port = {api: 3000};

module.exports = {
    dir, port, debug,
    clean: (dir) => {
        try {
            fse.removeSync(dir);
        } catch (e) {
            process.stderr.write(e.message);
        }
    },
    error: (err) => {
        process.stderr.write(err.message);
    },
    findInFileAndReplace: (file, search, replace) => {
        try {
            if (!fse.existsSync(file)) return;
            let content = fse.readFileSync(file, {encoding: 'utf8'});
            content = content.replace(search, replace);
            fse.writeFileSync(file, content);
        } catch (e) {
            console.error(e.message);
        }
    }
};
