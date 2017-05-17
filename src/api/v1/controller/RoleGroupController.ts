import {Response, Router, NextFunction} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {RoleGroup, IRoleGroup} from "../../../cmn/models/RoleGroup";
import {Permission} from "../../../cmn/models/Permission";
import {Vql, ValidationError, DatabaseError, Err} from "@vesta/core";


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
        RoleGroup.find<IRoleGroup>(req.params.id, {relations: ['roles']})
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
        RoleGroup.find(query)
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
        RoleGroup.find<IRoleGroup>(roleGroup.id)
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
        roleGroup.remove()
            .then(result => {
                result.items.length && this.acl.initAcl();
                res.json(result);
            })
            .catch(error => next(error));
    }
}