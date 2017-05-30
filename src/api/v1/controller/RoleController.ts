import {Response, Router, NextFunction} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Role, IRole} from "../../../cmn/models/Role";
import {Permission} from "../../../cmn/models/Permission";
import {ValidationError, Vql, DatabaseError, Err} from "@vesta/core";


export class RoleController extends BaseController {

    public route(router: Router) {
        router.get('/acl/role/:id', this.checkAcl('acl.role', Permission.Action.Read), this.wrap(this.getRole));
        router.get('/acl/role', this.checkAcl('acl.role', Permission.Action.Read), this.wrap(this.getRoles));
        router.post('/acl/role', this.checkAcl('acl.role', Permission.Action.Add), this.wrap(this.addRole));
        router.put('/acl/role', this.checkAcl('acl.role', Permission.Action.Edit), this.wrap(this.updateRole));
        router.delete('/acl/role/:id', this.checkAcl('acl.role', Permission.Action.Delete), this.wrap(this.removeRole));
    }

    protected init() {
    }

    public async getRole(req: IExtRequest, res: Response, next: NextFunction) {
        let result = await Role.find<IRole>(req.params.id, {relations: ['permissions']});
        res.json(result)
    }

    public async getRoles(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(Role.schema.name);
        let filter = req.query.query;
        if (filter) {
            let role = new Role(filter);
            let validationError = query && role.validate(...Object.keys(filter));
            if (validationError) {
                throw new ValidationError(validationError)
            }
            query.filter(filter);
        }
        let result = await Role.find(query);
        res.json(result)
    }

    public async addRole(req: IExtRequest, res: Response, next: NextFunction) {
        let role = new Role(req.body),
            validationError = role.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = role.insert<IRole>();
        res.json(result)
    }

    public async updateRole(req: IExtRequest, res: Response, next: NextFunction) {
        let role = new Role(req.body),
            validationError = role.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await Role.find<IRole>(role.id);
        if (result.items.length == 1) {
            let rResult = await role.update();
            await this.acl.initAcl();
            res.json(rResult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }

    public async removeRole(req: IExtRequest, res: Response, next: NextFunction) {
        let role = new Role({id: +req.params.id});
        let result = await role.remove();
        result.items.length && this.acl.initAcl();
        res.json(result);
    }
}