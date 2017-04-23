import {Response, Router, NextFunction} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Err} from "vesta-lib/Err";
import {ValidationError} from "vesta-lib/error/ValidationError";
import {RoleGroup, IRoleGroup} from "../../../cmn/models/RoleGroup";
import {Vql} from "vesta-lib/Vql";
import {Permission} from "../../../cmn/models/Permission";
import {DatabaseError} from "vesta-lib/error/DatabaseError";


export class RoleGroupController extends BaseController {

    public route(router: Router) {
        router.get('/acl/roleGroup/:id', this.checkAcl('acl.roleGroup', Permission.Action.Read), this.getRoleGroup.bind(this));
        router.get('/acl/roleGroup', this.checkAcl('acl.roleGroup', Permission.Action.Read), this.getRoleGroups.bind(this));
        router.post('/acl/roleGroup', this.checkAcl('acl.roleGroup', Permission.Action.Add), this.addRoleGroup.bind(this));
        router.put('/acl/roleGroup', this.checkAcl('acl.roleGroup', Permission.Action.Edit), this.updateRoleGroup.bind(this));
        router.delete('/acl/roleGroup/:id', this.checkAcl('acl.roleGroup', Permission.Action.Delete), this.removeRoleGroup.bind(this));
    }

    protected init() {
    }

    public getRoleGroup(req: IExtRequest, res: Response, next: NextFunction) {
        RoleGroup.findById<IRoleGroup>(req.params.id, {relations: ['roles']})
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public getRoleGroups(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(RoleGroup.schema.name);
        let filter = req.query.query;
        if (filter) {
            let roleGroup = new RoleGroup(filter);
            let validationError = query && roleGroup.validate(...Object.keys(filter));
            if (validationError) {
                return next(new ValidationError(validationError))
            }
            query.filter(filter);
        }
        RoleGroup.findByQuery(query)
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public addRoleGroup(req: IExtRequest, res: Response, next: NextFunction) {
        let roleGroup = new RoleGroup(req.body),
            validationError = roleGroup.validate();
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        roleGroup.insert<IRoleGroup>()
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public updateRoleGroup(req: IExtRequest, res: Response, next: NextFunction) {
        let roleGroup = new RoleGroup(req.body),
            validationError = roleGroup.validate();
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        RoleGroup.findById<IRoleGroup>(roleGroup.id)
            .then(result => {
                if (result.items.length == 1) {
                    return roleGroup.update()
                        .then(result => {
                            this.acl.initAcl();
                            res.json(result);
                        });
                }
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
            })
            .catch(error => next(error));
    }

    public removeRoleGroup(req: IExtRequest, res: Response, next: NextFunction) {
        let roleGroup = new RoleGroup({id: req.params.id});
        roleGroup.delete()
            .then(result => {
                result.items.length && this.acl.initAcl();
                res.json(result);
            })
            .catch(error => next(error));
    }
}