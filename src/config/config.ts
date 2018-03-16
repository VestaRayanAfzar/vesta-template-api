import { dirname } from "path";
import { IServerAppConfig } from "../helpers/Config";
import { LogStorage } from "../helpers/LogFactory";
import { IDatabaseConfig } from "../medium";
import { VariantConfig } from "./config.var";

const env = process.env;

export const config: IServerAppConfig = {
    database: {
        database: env.ADB_NAME,
        host: env.ADB_HOST,
        password: env.ADB_PASSWORD,
        port: +env.ADB_PORT,
        protocol: env.ADB_PROTOCOL,
        user: env.ADB_USERNAME,
    } as IDatabaseConfig,
    dir: {
        root: dirname(__dirname),
        upload: "/upload",
    },
    env: env.NODE_ENV,
    log: {
        dir: "/log",
        level: +env.LOG_LEVEL,
        // rotate log file every 3 days
        rotationInterval: 3 * 24 * 3600000,
        storage: env.NODE_ENV === "development" ? LogStorage.Console : LogStorage.File,
    },
    port: +env.PORT,
    regenerateSchema: VariantConfig.regenerateSchema,
    security: {
        guestRoleName: "guest",
        hashing: "sha256",
        rootRoleName: "root",
        salt: env.SALT,
        secret: env.SECRET_KEY,
        session: {
            database: {
                host: env.SDB_HOST,
                port: +env.SDB_PORT,
                protocol: env.SDB_PROTOCOL,
            } as IDatabaseConfig,
            hashing: "HS256",
            idPrefix: "sess:",
            maxAge: 0,
        },
        userRoleName: "user",
    },
    version: {
        api: "v1",
        app: "0.1.0",
    },
};
