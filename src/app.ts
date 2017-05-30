#!/usr/bin/env node
import {setting} from "./config/setting";
import {ServerApp} from "./ServerApp";

(async function () {
    try {
        let server = new ServerApp(setting);
        await server.init();
        await server.start();
        console.log('server booted at', new Date().toString())
    }catch (err){
        console.error('server initiation error: ', err);
        process.exit(1);
    }
})();
