import { DatabaseError, Err, ValidationError } from "@vesta/core";
import { NextFunction, Response, Router } from "express";
import { AclAction } from "../../../cmn/enum/Acl";
import { IRole, Role } from "../../../cmn/models/Role";
import { BaseController, IExtRequest } from "../../BaseController";

export class RoleController extends BaseController {

    public route(router: Router) {
        router.get("/acl/role/:id", this.checkAcl("acl.role", AclAction.Read), this.wrap(this.getRole));
        router.get("/acl/role", this.checkAcl("acl.role", AclAction.Read), this.wrap(this.getRoles));
        router.post("/acl/role", this.checkAcl("acl.role", AclAction.Add), this.wrap(this.addRole));
        router.put("/acl/role", this.checkAcl("acl.role", AclAction.Edit), this.wrap(this.updateRole));
        router.delete("/acl/role/:id", this.checkAcl("acl.role", AclAction.Delete), this.wrap(this.removeRole));
    }

    public async getRole(req: IExtRequest, res: Response, next: NextFunction) {
        const id = this.retrieveId(req);
        const result = await Role.find<IRole>(id, { relations: ["permissions"] });
        res.json(result);
    }

    public async getRoles(req: IExtRequest, res: Response, next: NextFunction) {
        const query = this.query2vql(Role, req.query);
        delete query.limit;
        const result = await Role.find(query);
        res.json(result);
    }

    public async addRole(req: IExtRequest, res: Response, next: NextFunction) {
        const role = new Role(req.body);
        const validationError = role.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        const result = await role.insert<IRole>();
        await this.acl.initAcl();
        res.json(result);
    }

    public async updateRole(req: IExtRequest, res: Response, next: NextFunction) {
        const role = new Role(req.body);
        const validationError = role.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        const result = await Role.find<IRole>(role.id);
        if (result.items.length === 1) {
            // prevent updating root role
            const { rootRoleName, guestRoleName, userRoleName } = this.config.security;
            if (result.items[0].name === rootRoleName) {
                throw new Err(Err.Code.WrongInput);
            }
            // prevent changing guest role name
            if (result.items[0].name === guestRoleName) {
                role.name = guestRoleName;
            }
            // prevent changing user role name
            if (result.items[0].name === userRoleName) {
                role.name = userRoleName;
            }
            const rResult = await role.update();
            await this.acl.initAcl();
            res.json(rResult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }

    public async removeRole(req: IExtRequest, res: Response, next: NextFunction) {
        const id = this.retrieveId(req);
        const role = new Role({ id });
        const result = await Role.find<IRole>(role.id);
        if (result.items.length === 1) {
            // prevent deleting root & guest & user role
            const { rootRoleName, guestRoleName, userRoleName } = this.config.security;
            const roleName = result.items[0].name;
            if ([rootRoleName, guestRoleName, userRoleName].indexOf(roleName) >= 0) {
                throw new Err(Err.Code.WrongInput, "err_default_role_delete");
            }
            const delResult = await role.remove();
            if (delResult.items.length) {
                await this.acl.initAcl();
            }
            res.json(delResult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }
}
