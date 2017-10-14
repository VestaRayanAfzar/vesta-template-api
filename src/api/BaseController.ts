import {NextFunction, Request, Response, Router} from "express";
import {Session} from "../session/Session";
import {IServerAppConfig} from "../config/config";
import {IUser, User} from "../cmn/models/User";
import {Acl} from "../helpers/Acl";
import {IRole} from "../cmn/models/Role";
import {Logger} from "../helpers/Logger";
import {Database, Err, IModel, IQueryRequest, KeyValueDatabase, ValidationError, Vql} from "@vesta/core";

export interface IExtRequest extends Request {
    log: Logger;
    sessionDB: KeyValueDatabase;
    session: Session;
}

export abstract class BaseController {
    protected MAX_FETCH_COUNT = 50;

    constructor(protected config: IServerAppConfig, protected acl: Acl, protected database: Database) {
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
        user = user || {roleGroups: [{name: this.config.security.guestRoleName}]};
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
            if (req.session) {
                let user: IUser = req.session.get<IUser>('user');
                if (!user) {
                    user = {role: {name: this.config.security.guestRoleName}};
                }
                if (this.acl.isAllowed((<IRole>user.role).name, resource, action)) {
                    return next();
                }
            }
            next(new Err(Err.Code.Forbidden, 'Access to this edge is forbidden'));
        }
    }

    protected retrieveId(req: IExtRequest): number {
        let id = +req.params.id;
        if (isNaN(id)) {
            throw new ValidationError({id: 'number'});
        }
        return id;
    }

    protected query2vql<T>(modelClass: IModel, req: IQueryRequest<T>, isCounting?: boolean, isSearch?: boolean): Vql {
        let fields = [];
        if (req.query) {
            for (let fieldNames = modelClass.schema.getFieldsNames(), i = fieldNames.length; i--;) {
                if (fieldNames[i] in req.query) {
                    fields.push(fieldNames[i]);
                }
            }
        }
        let query = new Vql(modelClass.schema.name);
        if (fields.length) {
            let model = new modelClass(req.query);
            let validationError = query && model.validate(...fields);
            if (validationError) {
                throw new ValidationError(validationError)
            }
            isSearch ? query.search(req.query, modelClass) : query.filter(req.query);
        }
        if (!isCounting) {
            query.limitTo(Math.min(+req.limit || this.MAX_FETCH_COUNT, this.MAX_FETCH_COUNT)).fromPage(+req.page || 1);
            if (req.orderBy && req.orderBy.length) {
                let orderBy = req.orderBy;
                for (let i = 0, il = req.orderBy.length; i < il; ++i) {
                    query.sortBy(orderBy[i].field, orderBy[i].ascending);
                }
            }
        }
        return query;
    }

    protected wrap(action: (req: IExtRequest, res: Response, next: NextFunction) => any) {
        action = action.bind(this);
        return async (req, res, next) => {
            try {
                await action(req, res, next)
            } catch (error) {
                next(error)
            }
        }
    }
}