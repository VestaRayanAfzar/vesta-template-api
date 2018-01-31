import { dirname } from "path";
import { VariantConfig } from './config.var';
import { IServerAppConfig } from "../helpers/Config";
import { LogStorage } from "../helpers/LogFactory";
import { IDatabaseConfig } from "../medium";

let env = process.env;

export const config: IServerAppConfig = {
    env: env.NODE_ENV,
    log: {
        level: +env.LOG_LEVEL,
        storage: env.NODE_ENV == 'development' ? LogStorage.Console : LogStorage.File,
        dir: '/log',
        // rotate log file every 3 days
        rotationInterval: 3 * 24 * 3600000
    },
    version: {
        app: '0.1.0',
        api: 'v1'
    },
    regenerateSchema: VariantConfig.regenerateSchema,
    database: <IDatabaseConfig>{
        protocol: env.ADB_PROTOCOL,
        host: env.ADB_HOST,
        port: +env.ADB_PORT,
        user: env.ADB_USERNAME,
        password: env.ADB_PASSWORD,
        database: env.ADB_NAME
    },
    dir: {
        root: dirname(__dirname),
        upload: '/upload',
    },
    port: +env.PORT,
    security: {
        secret: env.SECRET_KEY,
        salt: env.SALT,
        hashing: 'sha256',
        guestRoleName: 'guest',
        rootRoleName: 'root',
        userRoleName: 'user',
        session: {
            maxAge: 0,
            idPrefix: 'sess:',
            hashing: 'HS256',
            database: <IDatabaseConfig>{
                protocol: env.SDB_PROTOCOL,
                host: env.SDB_HOST,
                port: +env.SDB_PORT
            }
        }
    }
};
