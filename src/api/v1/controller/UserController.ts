import * as path from "path";
import {Response, Router, NextFunction} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Err} from "vesta-lib/Err";
import {Vql} from "vesta-lib/Vql";
import {DatabaseError} from "vesta-lib/error/DatabaseError";
import {ValidationError} from "vesta-lib/error/ValidationError";
import {User, IUser} from "../../../cmn/models/User";
import {Permission} from "../../../cmn/models/Permission";
import {FileUploader} from "../../../helpers/FileUploader";


export class UserController extends BaseController {

    public route(router: Router) {
        router.get('/user/count', this.checkAcl('user', Permission.Action.Read), this.getUserCount.bind(this));
        router.get('/user/:id', this.checkAcl('user', Permission.Action.Read), this.getUser.bind(this));
        router.get('/user', this.checkAcl('user', Permission.Action.Read), this.getUsers.bind(this));
        router.post('/user', this.checkAcl('user', Permission.Action.Add), this.addUser.bind(this));
        router.put('/user', this.checkAcl('user', Permission.Action.Edit), this.updateUser.bind(this));
        router.delete('/user/:id', this.checkAcl('user', Permission.Action.Delete), this.removeUser.bind(this));
        router.post('/user/file/:id', this.checkAcl('user', Permission.Action.Edit), this.upload.bind(this));
    }

    protected init() {
    }

    public getUserCount(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(User.schema.name);
        let filter = req.query.query;
        if (filter) {
            let user = new User(filter);
            let validationError = query && user.validate(...Object.keys(filter));
        if (validationError) {
                return next(new ValidationError(validationError))
            }
            query.filter(filter);
        }
        User.count(query)
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public getUser(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(User.schema.name);
        query.filter({id: req.params.id}).fetchRecordFor('roleGroups');
        User.findByQuery<IUser>(query)
            .then(result => {
                if (result.items.length == 1) {
                delete result.items[0].password;
                res.json(result);
                }
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
            })
            .catch(error => next(error));
    }

    public getUsers(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(User.schema.name);
        let filter = req.query.query;
        if (filter) {
            let user = new User(filter);
            let validationError = query && user.validate(...Object.keys(filter));
        if (validationError) {
                return next(new ValidationError(validationError))
            }
            query.filter(filter);
        }
        query.limitTo(Math.min(+req.query.limit || this.MAX_FETCH_COUNT, this.MAX_FETCH_COUNT))
            .fromPage(+req.query.page || 1);
        if (req.query.orderBy) {
            let orderBy = req.query.orderBy[0];
            query.sortBy(orderBy.field, orderBy.ascending == 'true');
        }
        User.findByQuery<IUser>(query)
            .then(result => {
                for (let i = result.items.length; i--;) {
                    delete result.items[i].password;
                }
                res.json(result);
            })
            .catch(error => next(error));
    }

    public addUser(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User(req.body),
            validationError = user.validate();
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        user.insert<IUser>()
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public updateUser(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User(req.body),
            validationError = user.validate();
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        User.findById<IUser>(user.id)
            .then(result => {
                if (result.items.length == 1) {
                    return user.update<IUser>()
                        .then(result => {
                            delete result.items[0].password;
                            res.json(result);
                        });
                }
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
            })
            .catch(error => next(error));
    }

    public removeUser(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User({id: req.params.id});
        user.delete()
            .then(result => res.json(result))
            .catch(error => next(error));
    }

    public upload(req: IExtRequest, res: Response, next: NextFunction) {
        let user: User;
        let destDirectory = path.join(this.setting.dir.upload, 'user');
        User.findById<IUser>(+req.params.id)
            .then(result => {
                if (result.items.length != 1) throw new Err(Err.Code.DBRecordCount, 'User not found');
                delete result.items[0].password;
                user = new User(result.items[0]);
                let uploader = new FileUploader<IUser>(destDirectory);
                return uploader.upload(req);
            })
            .then(upl => {
                let oldFileName = user.image;
                user.image = upl.image;
                return FileUploader.checkAndDeleteFile(`${destDirectory}/${oldFileName}`);
            })
            .then(() => user.update())
            .then(result => res.json(result))
            .catch(reason => next(new Err(reason.error.code, reason.error.message)));
    }
}