#!/usr/bin/env node
import { appConfig } from "./config/appConfig";
import { Config } from "./helpers/Config";
import { ITextMessageConfig } from "./helpers/TextMessage";
import { ServerApp } from "./ServerApp";

Config.init(appConfig);
// Culture.register(IrLocale, IrVocabs, IrDate);
// application based configuration
Config.set<ITextMessageConfig>("sms", {
    host: "",
    number: "",
    password: "",
    url: "",
    username: "",
});

// initiating server
const MAX_TRY_COUNT = 3;
const TRY_INTERVAL = 5000;
let tryCounter = 1;

(async function run() {
    try {
        const server = new ServerApp(appConfig);
        await server.init();
        await server.start();
        // tslint:disable-next-line:no-console
        console.log(`Server booted at ${new Date().toString()}`);
    } catch (err) {
        ++tryCounter;
        // tslint:disable-next-line:no-console
        console.error("Server initiation error: ", err);
        if (tryCounter <= MAX_TRY_COUNT) {
            // increasing the interval in case of repetitive errors
            const nextTryInterval = TRY_INTERVAL * tryCounter;
            // tslint:disable-next-line:no-console
            console.warn(`A retry effort will occurred in ${nextTryInterval / 1000}s`);
            setTimeout(async () => {
                // tslint:disable-next-line:no-console
                console.warn(`Restarting server initiation process [try #${tryCounter}]...`);
                await run();
            }, nextTryInterval);
        } else {
            // tslint:disable-next-line:no-console
            console.error("MAX_TRY_COUNT reached; exiting server...");
            process.exit(1);
        }
    }
})();
