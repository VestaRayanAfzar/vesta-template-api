import { access, createReadStream, readdir, unlink } from "fs";
import { NextFunction, Response, Router } from "express";
import { BaseController, IExtRequest } from "../../BaseController";
import { Log } from "../../../cmn/models/Log";
import { AclAction } from "../../../cmn/enum/Acl";
import { Err } from "../../../medium";

export class LogController extends BaseController {

    public route(router: Router) {
        router.get('/log/:id', this.checkAcl('log', AclAction.Read), this.wrap(this.getLog));
        router.get('/log', this.checkAcl('log', AclAction.Read), this.wrap(this.getLogs));
        router.post('/log', this.checkAcl('log', AclAction.Add), this.wrap(this.addLog));
        router.delete('/log/:id', this.checkAcl('log', AclAction.Delete), this.wrap(this.removeLog));
    }

    public async getLog(req: IExtRequest, res: Response, next: NextFunction) {
        const id = this.retrieveId(req);
        const logDirectory = this.config.log.dir;
        let logFile = `${logDirectory}/${id}-logger.log`;
        access(logFile, error => {
            if (error) return next(new Err(Err.Code.FileSystem, error.message));
            res.setHeader('Content-Type', 'text/plain');
            createReadStream(logFile).pipe(res);
        })
    }

    public async getLogs(req: IExtRequest, res: Response, next: NextFunction) {
        const logDirectory = this.config.log.dir;
        readdir(logDirectory, (error, files) => {
            if (error) return next(new Err(Err.Code.FileSystem, error.message, 'getLogs', 'LogController'));
            res.json({ items: files });
        });
    }

    public async addLog(req: IExtRequest, res: Response, next: NextFunction) {
        let log = new Log(req.body);
        req.log(log.level, log.message);
        res.json({});
    }

    public async removeLog(req: IExtRequest, res: Response, next: NextFunction) {
        const id = this.retrieveId(req);
        const logDirectory = this.config.log.dir;
        let logFile = `${logDirectory}/${id}-logger.log`;
        access(logFile, error => {
            if (error) return next(new Err(Err.Code.FileSystem, error.message, 'removeLog[1]', 'LogController'));
            unlink(logFile, error => {
                if (error) return next(new Err(Err.Code.FileSystem, error.message, 'removeLog[2]', 'LogController'));
                res.json({ items: [id] });
            });
        })
    }
}
