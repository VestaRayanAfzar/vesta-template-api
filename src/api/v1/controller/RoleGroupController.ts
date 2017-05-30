import {Response, Router, NextFunction} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {RoleGroup, IRoleGroup} from "../../../cmn/models/RoleGroup";
import {Permission} from "../../../cmn/models/Permission";
import {Vql, ValidationError, DatabaseError, Err} from "@vesta/core";


export class RoleGroupController extends BaseController {

    public route(router: Router) {
        router.get('/acl/roleGroup/:id', this.checkAcl('acl.roleGroup', Permission.Action.Read), this.wrap(this.getRoleGroup));
        router.get('/acl/roleGroup', this.checkAcl('acl.roleGroup', Permission.Action.Read), this.wrap(this.getRoleGroups));
        router.post('/acl/roleGroup', this.checkAcl('acl.roleGroup', Permission.Action.Add), this.wrap(this.addRoleGroup));
        router.put('/acl/roleGroup', this.checkAcl('acl.roleGroup', Permission.Action.Edit), this.wrap(this.updateRoleGroup));
        router.delete('/acl/roleGroup/:id', this.checkAcl('acl.roleGroup', Permission.Action.Delete), this.wrap(this.removeRoleGroup));
    }

    protected init() {
    }

    public async getRoleGroup(req: IExtRequest, res: Response, next: NextFunction) {
        let result = await RoleGroup.find<IRoleGroup>(req.params.id, {relations: ['roles']});
        res.json(result)
    }

    public async getRoleGroups(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(RoleGroup.schema.name);
        let filter = req.query.query;
        if (filter) {
            let roleGroup = new RoleGroup(filter);
            let validationError = query && roleGroup.validate(...Object.keys(filter));
            if (validationError) {
                throw new ValidationError(validationError)
            }
            query.filter(filter);
        }
        let result = await  RoleGroup.find(query);
        res.json(result)
    }

    public async addRoleGroup(req: IExtRequest, res: Response, next: NextFunction) {
        let roleGroup = new RoleGroup(req.body),
            validationError = roleGroup.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await roleGroup.insert<IRoleGroup>();
        res.json(result)
    }

    public async updateRoleGroup(req: IExtRequest, res: Response, next: NextFunction) {
        let roleGroup = new RoleGroup(req.body),
            validationError = roleGroup.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await RoleGroup.find<IRoleGroup>(roleGroup.id);
        if (result.items.length == 1) {
            let rResult = roleGroup.update();
            await this.acl.initAcl();
            res.json(rResult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }

    public async removeRoleGroup(req: IExtRequest, res: Response, next: NextFunction) {
        let roleGroup = new RoleGroup({id: req.params.id});
        let result = await roleGroup.remove();
        result.items.length && this.acl.initAcl();
        res.json(result);
    }
}