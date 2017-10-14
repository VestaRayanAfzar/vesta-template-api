import {NextFunction, Response, Router} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {IRole, Role} from "../../../cmn/models/Role";
import {DatabaseError, Err, ValidationError} from "@vesta/core";
import {AclAction} from "../../../cmn/enum/Acl";


export class RoleController extends BaseController {

    public route(router: Router) {
        router.get('/acl/role/:id', this.checkAcl('acl.role', AclAction.Read), this.wrap(this.getRole));
        router.get('/acl/role', this.checkAcl('acl.role', AclAction.Read), this.wrap(this.getRoles));
        router.post('/acl/role', this.checkAcl('acl.role', AclAction.Add), this.wrap(this.addRole));
        router.put('/acl/role', this.checkAcl('acl.role', AclAction.Edit), this.wrap(this.updateRole));
        router.delete('/acl/role/:id', this.checkAcl('acl.role', AclAction.Delete), this.wrap(this.removeRole));
    }

    public async getRole(req: IExtRequest, res: Response, next: NextFunction) {
        let id = this.retrieveId(req);
        let result = await Role.find<IRole>(id, {relations: ['permissions']});
        res.json(result)
    }

    public async getRoles(req: IExtRequest, res: Response, next: NextFunction) {
        let query = this.query2vql(Role, req.query);
        let result = await Role.find(query);
        res.json(result)
    }

    public async addRole(req: IExtRequest, res: Response, next: NextFunction) {
        let role = new Role(req.body);
        let validationError = role.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await role.insert<IRole>();
        res.json(result)
    }

    public async updateRole(req: IExtRequest, res: Response, next: NextFunction) {
        let role = new Role(req.body);
        let validationError = role.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await Role.find<IRole>(role.id);
        if (result.items.length == 1) {
            // prevent updating root role
            const {rootRoleName, guestRoleName} = this.config.security;
            if (result.items[0].name == rootRoleName) {
                throw new Err(Err.Code.WrongInput)
            }
            // prevent changing guest role name
            if (result.items[0].name == guestRoleName) {
                role.name = guestRoleName;
            }
            let rResult = await role.update();
            await this.acl.initAcl();
            res.json(rResult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }

    public async removeRole(req: IExtRequest, res: Response, next: NextFunction) {
        let id = this.retrieveId(req);
        let role = new Role({id});
        let result = await Role.find<IRole>(role.id);
        if (result.items.length == 1) {
            // prevent deleting root & guest role
            const {rootRoleName, guestRoleName} = this.config.security;
            let roleName = result.items[0].name;
            if (roleName == rootRoleName || roleName == guestRoleName) {
                throw new Err(Err.Code.WrongInput)
            }
            let delResult = await role.remove();
            if (delResult.items.length) {
                await this.acl.initAcl();
            }
            res.json(delResult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }
}