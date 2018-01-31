import {NextFunction, Response} from "express";
import {IExtRequest} from "../api/BaseController";
import {LogFactory} from "../helpers/LogFactory";
import {LogLevel} from "../cmn/models/Log";
import {IUser, SourceApp} from "../cmn/models/User";

export function loggerMiddleware(req: IExtRequest, res: Response, next: NextFunction) {
    const sourceApp = +(req.body.s || req.query.s);
    const user = req.session.get<IUser>('user');
    let log = LogFactory.create(user ? +user.id : 0, sourceApp);
    res.on('end', onAfterResponse);
    res.on('finish', onAfterResponse);
    req.log = log.log;
    next();

    function onAfterResponse() {
        const message = [
            req.headers['X-Real-IP'] || req.ip,
            `${req.method} ${req.url} ${res.statusCode}`,
            req.headers['user-agent']
        ];
        if (sourceApp != SourceApp.Panel) {
            // saving request information
            log.log(LogLevel.Info, message.join('-;-'), 'loggerMiddleware');
        }
        log.save();
    }
}