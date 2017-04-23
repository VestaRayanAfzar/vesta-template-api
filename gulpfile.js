let gulp = require('gulp');
let path = require('path');
let config = require('./resources/gulp/config');
let {dir} = config;


/** sets setting.production to true for deploy tasks */
gulp.task('production', () => {
    setting.production = true;
});

/** Loading api tasks foreach target */
let [tasks, watches] = loadTasks(['api']);
gulp.task(`dev:api`, tasks.concat(watches));
gulp.task(`deploy:api`, ['production'].concat(tasks));

/** Loading tasks from each modules*/
function loadTasks(modules) {
    let tasks = [],
        watches = [];

    for (let i = 0, il = modules.length; i < il; ++i) {
        let result = require(path.join(dir.gulp, modules[i]))(config);
        if (result.tasks) {
            tasks = tasks.concat(result.tasks);
        }
        if (result.watch) {
            watches = watches.concat(result.watch);
        }
    }
    return [tasks, watches];
}
