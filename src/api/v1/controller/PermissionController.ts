import {Response, Router, NextFunction} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Err} from "vesta-lib/Err";
import {ValidationError} from "vesta-lib/error/ValidationError";
import {Permission, IPermission} from "../../../cmn/models/Permission";
import {Vql} from "vesta-lib/Vql";
import {DatabaseError} from "vesta-lib/error/DatabaseError";


export class PermissionController extends BaseController {

    public route(router: Router) {
        router.get('/acl/permission/:id', this.checkAcl('acl.permission', Permission.Action.Read), this.getPermission.bind(this));
        router.get('/acl/permission', this.checkAcl('acl.permission', Permission.Action.Read), this.getPermissions.bind(this));
        router.put('/acl/permission', this.checkAcl('acl.permission', Permission.Action.Edit), this.updatePermission.bind(this));
    }

    protected init() {
    }

    public getPermission(req: IExtRequest, res: Response, next: NextFunction) {
        Permission.findById<IPermission>(req.params.id)
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public getPermissions(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(Permission.schema.name);
        let filter = req.query.query;
        if (filter) {
            let permission = new Permission(filter);
            let validationError = query && permission.validate(...Object.keys(filter));
            if (validationError) {
                return next(new ValidationError(validationError))
            }
            query.filter(filter);
        }
        Permission.findByQuery(query)
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public updatePermission(req: IExtRequest, res: Response, next: NextFunction) {
        let permission = new Permission(req.body),
            validationError = permission.validate();
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        Permission.findById<IPermission>(permission.id)
            .then(result => {
                if (result.items.length == 1) {
                    result.items[0].status = permission.status;
                    permission.setValues(result.items[0]);
                    return permission.update()
                        .then(result => {
                            this.acl.initAcl();
                            res.json(result);
                        });
                }
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
            })
            .catch(error => next(error));
    }
}