import {readFileSync, writeFileSync} from "fs";
import {dirname} from "path";
import {VariantConfig} from './config.var';
import {IDatabaseConfig} from "../cmn/core/Database";
import {IAdminConfig, IServerAppConfig} from "../helpers/Config";

let env = process.env;

let adminConfig: IAdminConfig;
try {
    adminConfig = JSON.parse(readFileSync(__dirname + '/config.json', 'utf8'));
} catch (err) {
    adminConfig = {
        logLevel: +env.LOG_LEVEL,
        monitoring: false,
        samplingInterval: 0
    };
    writeFileSync(__dirname + '/config.json', JSON.stringify(adminConfig));
    console.error(err);
}

export const config: IServerAppConfig = {
    env: env.NODE_ENV,
    log: {
        level: adminConfig.logLevel,
        dir: '/log'
    },
    version: {
        app: '0.1.0',
        api: 'v1'
    },
    regenerateSchema: VariantConfig.regenerateSchema,
    http2: VariantConfig.http2,
    ssl: {
        key: '/ssl/server.key',
        cert: '/ssl/server.crt'
    },
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
        log: '/log'
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
