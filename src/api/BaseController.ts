import {Router, Request, Response, NextFunction} from "express";
import {Session} from "../session/Session";
import {IServerAppSetting} from "../config/setting";
import {IUser, User} from "../cmn/models/User";
import {Acl} from "../helpers/Acl";
import {IRole} from "../cmn/models/Role";
import {Logger} from "../helpers/Logger";
import {Database, Err} from "@vesta/core";

export interface IExtRequest extends Request {
    log: Logger;
    sessionDB: Database;
    session: Session;
}

export abstract class BaseController {
    protected MAX_FETCH_COUNT = 50;

    constructor(protected setting: IServerAppSetting, protected acl: Acl, protected database: Database) {
        this.init();
    }

    /**
     * This function is called when after a controller is instantiated and the route method is called.
     * Controller instantiation > init method > route method > resolve method
     * The instantiation of other controllers will happen in order and won't wait for this method's termination.
     * However, the next step in application initiation will pause until all promisses from all controllers
     * are resolved. If any of controllers reject their promises, the application won't start.
     *
     *
     * @returns {Promise<boolean>}
     */
    public resolve(): Promise<boolean> {
        return null;
    }

    /**
     * This function is called when a controller is instantiated within constructor method
     * The result of this function is not important.
     * Is an asynchronous operation is going to happen here, the execution process will not wait for it's termination.
     */
    protected init() {
    }

    protected user(req): User {
        let user = req.session.get('user');
        user = user || {roleGroups: [{name: this.setting.security.guestRoleName}]};
        return new User(user);
    }

    public abstract route(router: Router): void;

    /**
     * This method returns a middleware that checks the user access to specific (resource, action) whenever a request
     *  is made from a user.
     * It also adds (resource, action) to the resourceList at server init time.
     */
    protected checkAcl(resource: string, action: string) {
        this.acl.addResource(resource, action);
        return (req: IExtRequest, res: Response, next: NextFunction) => {
            if ((<IExtRequest>req).session) {
                let user: IUser = (<IExtRequest>req).session.get<IUser>('user');
                if (!user) user = {roleGroups: [{name: this.setting.security.guestRoleName}]};
                for (let i = user.roleGroups.length; i--;) {
                    if (this.acl.isAllowed((<IRole>user.roleGroups[i]).name, resource, action)) {
                        return next();
                    }
                }
            }
            next(new Err(Err.Code.Forbidden, 'Access to this edge is forbidden'));
        }
    }
}