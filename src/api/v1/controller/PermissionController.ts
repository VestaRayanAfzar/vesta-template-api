import { DatabaseError, Err, ValidationError } from "@vesta/core";
import { NextFunction, Response, Router } from "express";
import { AclAction } from "../../../cmn/enum/Acl";
import { IPermission, Permission } from "../../../cmn/models/Permission";
import { BaseController, IExtRequest } from "../../BaseController";

export class PermissionController extends BaseController {

    public route(router: Router) {
        // tslint:disable-next-line:max-line-length
        router.get("/acl/permission/:id", this.checkAcl("acl.permission", AclAction.Read), this.wrap(this.getPermission));
        router.get("/acl/permission", this.checkAcl("acl.permission", AclAction.Read), this.wrap(this.getPermissions));
        // tslint:disable-next-line:max-line-length
        router.put("/acl/permission", this.checkAcl("acl.permission", AclAction.Edit), this.wrap(this.updatePermission));
    }

    public async getPermission(req: IExtRequest, res: Response, next: NextFunction) {
        const id = this.retrieveId(req);
        const result = await Permission.find<IPermission>(id);
        res.json(result);
    }

    public async getPermissions(req: IExtRequest, res: Response, next: NextFunction) {
        const query = this.query2vql(Permission, req.query, false, true);
        // removing limit
        delete query.limit;
        const result = await Permission.find(query);
        res.json(result);
    }

    public async updatePermission(req: IExtRequest, res: Response, next: NextFunction) {
        const permission = new Permission(req.body);
        const validationError = permission.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        const result = await Permission.find<IPermission>(permission.id);
        if (result.items.length === 1) {
            result.items[0].status = permission.status;
            permission.setValues(result.items[0]);
            const pResult = await permission.update();
            await this.acl.initAcl();
            res.json(pResult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }
}
