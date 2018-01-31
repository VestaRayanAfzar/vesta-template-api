import * as express from "express";
import { createServer, Server } from "http";
import { json, urlencoded } from "body-parser";
import { readdirSync } from "fs";
import { MySQL } from "./driver/MySQL";
import { IServerAppConfig } from "./helpers/Config";
import { ApiFactory } from "./api/ApiFactory";
import { sessionMiddleware } from "./middlewares/session";
import { IExtRequest } from "./api/BaseController";
import { Acl } from "./helpers/Acl";
import { DatabaseFactory } from "./helpers/DatabaseFactory";
import { loggerMiddleware } from "./middlewares/logger";
import { LogFactory } from "./helpers/LogFactory";
import { Session } from "./session/Session";
import { AclPolicy } from "./cmn/enum/Acl";
import { LogLevel } from "./cmn/models/Log";
import { KeyValueDatabase, Database, Err, IModelCollection } from "./medium";

let cors = require('cors');
let helmet = require('helmet');

export class ServerApp {
    private app: express.Express;
    private server: Server;
    private sessionDatabase: KeyValueDatabase;
    private database: Database;
    private acl: Acl;

    constructor(private config: IServerAppConfig) {
        this.app = express();
        this.server = createServer(this.app);
        this.server.on('error', err => console.error(err));
        this.acl = new Acl(config, AclPolicy.Deny);
        if (!LogFactory.init(this.config.log)) {
            process.exit(1);
        }
    }

    private configExpressServer() {
        this.app.use(helmet({
            noCache: true,
            referrerPolicy: true
        }));
        // todo CHANGE origin in production mode based on your requirement
        this.app.use(cors({
            origin: [/https?:\/\/*:*/],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['X-Requested-With', 'Content-Type', 'Content-Length', 'X-Auth-Token'],
            exposedHeaders: ['Content-Type', 'Content-Length', 'X-Auth-Token']
        }));
        this.app.use(urlencoded({ limit: '50mb', extended: false }));
        this.app.use(json({ limit: '50mb' }));
        // todo closing connection after sending response ???
        this.app.use((req: IExtRequest, res: express.Response, next: express.NextFunction) => {
            res.set('Connection', 'Close');
            next();
        });
        this.app.enable('trust proxy');
        this.app.disable('case sensitive routing');
        this.app.disable('strict routing');
        this.app.disable('x-powered-by');
        this.app.disable('etag');
    }

    private async initRouting(): Promise<any> {
        if (this.config.env == 'development') {
            this.app.use('/upl', express.static(this.config.dir.upload));
        }
        this.app.use((req: IExtRequest, res, next) => {
            req.sessionDB = this.sessionDatabase;
            sessionMiddleware(req, res, next);
        });
        // logger must be set after session
        this.app.use(loggerMiddleware);
        let routing = await ApiFactory.create(this.config, this.acl, this.database);
        return this.app.use('/', routing)
    }

    private initErrorHandlers() {
        // 404 Not Found
        this.app.use((req: IExtRequest, res: express.Response, next: express.NextFunction) => {
            this.handleError(req, res, new Err(404, `Not Found: ${req.url}`))
        });
        // 50x Internal Server Error
        this.app.use((err: any, req: IExtRequest, res: express.Response, next: express.NextFunction) => {
            this.handleError(req, res, err);
        });
        //
        process.on('unhandledRejection', (reason) => {
            console.error(`Unhandled Rejection at: ${reason}`);
        });
    }

    private async initDatabase(): Promise<any> {
        let modelsDirectory = `${__dirname}/cmn/models`;
        let modelFiles = readdirSync(modelsDirectory);
        let models: IModelCollection = {};
        // creating models list
        for (let i = modelFiles.length; i--;) {
            if (modelFiles[i].endsWith('.js')) {
                let modelName = modelFiles[i].slice(0, -3);
                let model = require(`${modelsDirectory}/${modelFiles[i]}`);
                models[model[modelName]['schema']['name']] = model[modelName];
            }
        }
        // registering database drivers
        DatabaseFactory.register('appDatabase', this.config.database, MySQL, models);
        // getting application database instance
        let db = await DatabaseFactory.getInstance('appDatabase');
        this.config.regenerateSchema ? await db.init() : db
    }

    public async init(): Promise<any> {
        this.configExpressServer();
        await Session.init(this.config.security.session);
        await this.initDatabase();
        await this.initRouting();
        this.initErrorHandlers();
        await this.acl.initAcl();
    }

    public start() {
        return new Promise((resolve, reject) => {
            this.server.listen(this.config.port)
                .on('listening', arg => resolve(arg))
                .on('error', err => resolve(err));
        })

    }

    /**
     * This method handles the error generated inside any controller.
     * It will also removes actual error messages in production mode.
     */
    private handleError(req: IExtRequest, res: express.Response, error: Err | string) {
        if ('string' == typeof error) {
            error = new Err(Err.Code.OperationFailed, error);
        }
        req.log ? req.log(LogLevel.Error, error.message, error.method || 'handleError', error.file || 'ServerApp') : console.error(error);
        if (this.config.env == 'production') {
            delete error.method;
            delete error.file;
            if (error['sqlMessage']) {
                // sql error
                error.code = Err.Code.Database;
                delete error.message;
            }
        }
        if (error instanceof Error) {
            error = new Err(error.code, error.message);
        }
        error.code = +error.code || Err.Code.Server;
        res.status(error.code);
        res.json({ error });
    }
}