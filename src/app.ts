#!/usr/bin/env node
import {config} from "./config/config";
import {ServerApp} from "./ServerApp";

(async function () {
    try {
        let server = new ServerApp(config);
        await server.init();
        await server.start();
        console.log('server booted at ', new Date().toString())
    } catch (err) {
        console.error('server initiation error: ', err);
        process.exit(1);
    }
})();
