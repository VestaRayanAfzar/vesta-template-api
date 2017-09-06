import * as http from "http";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as morgan from "morgan";
import * as fs from "fs";
import {IServerAppConfig} from "./config/config";
import {ApiFactory} from "./api/ApiFactory";
import {sessionMiddleware} from "./middlewares/session";
import {IExtRequest} from "./api/BaseController";
import {Acl} from "./helpers/Acl";
import {DatabaseFactory} from "./helpers/DatabaseFactory";
import {loggerMiddleware} from "./middlewares/logger";
import {LogFactory, LogStorage} from "./helpers/LogFactory";
import {Session} from "./session/Session";
import {AclPolicy} from "./cmn/enum/Acl";
import {Database, Err, IModelCollection, KeyValueDatabase} from "@vesta/core";
import {MySQL} from "@vesta/driver-mysql";
import * as spdy from "spdy"
let cors = require('cors');
let helmet = require('helmet');

export class ServerApp {
    private app: express.Express;
    private server: spdy.Server | http.Server;
    private sessionDatabase: KeyValueDatabase;
    private database: Database;
    private acl: Acl;

    constructor(private config: IServerAppConfig) {
        this.app = express();
        if (config.http2) {
            const options = {
                key: fs.readFileSync(config.ssl.key),
                cert: fs.readFileSync(config.ssl.cert)
            };
            this.server = spdy.createServer(options, <any>this.app);
        } else {
            this.server = http.createServer(this.app);
        }
        this.server.on('error', err => console.error(err));
        this.acl = new Acl(config, AclPolicy.Deny);
        this.config.log.storage = this.config.env == 'development' ? LogStorage.Console : LogStorage.File;
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
        this.app.use(loggerMiddleware);
        this.app.use(morgan(this.config.env == 'development' ? 'dev' : 'combined'));
        this.app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));
        this.app.use(bodyParser.json({limit: '50mb'}));
        // closing connection after sending response ???
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
        this.app.use('/upl', express.static(this.config.dir.upload));
        this.app.use('/asset', express.static(this.config.dir.html));
        this.app.use((req: IExtRequest, res, next) => {
            req.sessionDB = this.sessionDatabase;
            sessionMiddleware(req, res, next);
        });
        let routing = await ApiFactory.create(this.config, this.acl, this.database);
        return this.app.use('/', routing)
    }

    private initErrorHandlers() {
        // 404 Not Found
        this.app.use((req: IExtRequest, res: express.Response, next: express.NextFunction) => {
            if (/.+\.(html|htm|js|css|xml|png|jpg|jpeg|gif|pdf|txt|ico|woff|woff2|svg|eot|ttf|rss|zip|mp3|rar|exe|wmv|doc|avi|ppt|mpg|mpeg|tif|wav|mov|psd|ai|xls|mp4|m4a|swf|dat|dmg|iso|flv|m4v|torrent)$/i.exec(req.url)) {
                res.status(404);
                return res.end();
            }
            // todo what if its a REST request
            // res.sendFile(`${this.config.dir.html}/index.html`);
            this.handleError(req, res, new Err(404, `Not Found: ${req.url}`))
        });
        // 50x Internal Server Error
        this.app.use((err: any, req: IExtRequest, res: express.Response, next: express.NextFunction) => {
            this.handleError(req, res, err);
        });
    }

    private async initDatabase(): Promise<any> {
        let modelsDirectory = `${__dirname}/cmn/models`;
        let modelFiles = fs.readdirSync(modelsDirectory);
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
    private handleError(req: IExtRequest, res: express.Response, error: Err) {
        req.log.err(error);
        if (this.config.env == 'production') {
            error = new Err(Err.Code.Server);
        } else {
            error.code = error.code || Err.Code.Server;
        }
        res.status(error.code < Err.Code.Client ? Err.Code.Server : error.code);
        res.json({error});
    }
}