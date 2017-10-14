#!/usr/bin/env node
import {config} from "./config/config";
import {ServerApp} from "./ServerApp";

const MAX_TRY_COUNT = 3;
const TRY_INTERVAL = 5000;
let tryCounter = 1;

(async function run() {
    try {
        let server = new ServerApp(config);
        await server.init();
        await server.start();
        console.log('Server booted at ', new Date().toString());
    } catch (err) {
        ++tryCounter;
        console.error('Server initiation error: ', err);
        if (tryCounter <= MAX_TRY_COUNT) {
            // increasing the interval in case of repetitive errors
            let nextTryInterval = TRY_INTERVAL * tryCounter;
            console.warn(`A retry effort will occurred in ${nextTryInterval / 1000}s`);
            setTimeout(async () => {
                console.warn(`Restarting server initiation process [try #${tryCounter}]...`);
                await run();
            }, nextTryInterval);
        } else {
            console.error('MAX_TRY_COUNT reached; exiting server...');
            process.exit(1);
        }
    }
})();
