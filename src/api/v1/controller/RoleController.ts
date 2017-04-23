import {Response, Router, NextFunction} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Err} from "vesta-lib/Err";
import {ValidationError} from "vesta-lib/error/ValidationError";
import {Role, IRole} from "../../../cmn/models/Role";
import {Vql} from "vesta-lib/Vql";
import {Permission} from "../../../cmn/models/Permission";
import {DatabaseError} from "vesta-lib/error/DatabaseError";


export class RoleController extends BaseController {

    public route(router: Router) {
        router.get('/acl/role/:id', this.checkAcl('acl.role', Permission.Action.Read), this.getRole.bind(this));
        router.get('/acl/role', this.checkAcl('acl.role', Permission.Action.Read), this.getRoles.bind(this));
        router.post('/acl/role', this.checkAcl('acl.role', Permission.Action.Add), this.addRole.bind(this));
        router.put('/acl/role', this.checkAcl('acl.role', Permission.Action.Edit), this.updateRole.bind(this));
        router.delete('/acl/role/:id', this.checkAcl('acl.role', Permission.Action.Delete), this.removeRole.bind(this));
    }

    protected init() {
    }

    public getRole(req: IExtRequest, res: Response, next: NextFunction) {
        Role.findById<IRole>(req.params.id, {relations: ['permissions']})
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public getRoles(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(Role.schema.name);
        let filter = req.query.query;
        if (filter) {
            let role = new Role(filter);
            let validationError = query && role.validate(...Object.keys(filter));
            if (validationError) {
                return next(new ValidationError(validationError))
            }
            query.filter(filter);
        }
        Role.findByQuery(query)
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public addRole(req: IExtRequest, res: Response, next: NextFunction) {
        let role = new Role(req.body),
            validationError = role.validate();
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        role.insert<IRole>()
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public updateRole(req: IExtRequest, res: Response, next: NextFunction) {
        let role = new Role(req.body),
            validationError = role.validate();
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        Role.findById<IRole>(role.id)
            .then(result => {
                if (result.items.length == 1) {
                    return role.update()
                        .then(result => {
                            this.acl.initAcl();
                            res.json(result);
                        });
                }
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
            })
            .catch(error => next(error));
    }

    public removeRole(req: IExtRequest, res: Response, next: NextFunction) {
        let role = new Role({id: +req.params.id});
        return role.delete()
            .then(result => {
                result.items.length && this.acl.initAcl();
                res.json(result);
            })
            .catch(error => next(error));
    }
}