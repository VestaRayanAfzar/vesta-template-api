import {Response, Router, NextFunction} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Err} from "vesta-lib/Err";
import {ValidationError} from "vesta-lib/error/ValidationError";
import {User, IUser} from "../../../cmn/models/User";
import {IQueryResult} from "vesta-lib/ICRUDResult";
import {Session} from "../../../session/Session";
import {RoleGroup, IRoleGroup} from "../../../cmn/models/RoleGroup";
import {Hashing} from "../../../helpers/Hashing";
import {Permission} from "../../../cmn/models/Permission";
import {Status} from "../../../cmn/enum/Status";
import {DatabaseError} from "vesta-lib/error/DatabaseError";


export class AccountController extends BaseController {

    public route(router: Router) {
        router.get('/me', this.getMe.bind(this));
        router.put('/account', this.checkAcl('account', Permission.Action.Edit), this.update.bind(this));
        router.post('/account', this.checkAcl('account', 'register'), this.register.bind(this));
        router.post('/account/login', this.checkAcl('account', 'login'), this.login.bind(this));
        router.get('/account/logout', this.checkAcl('account', 'logout'), this.logout.bind(this));
    }

    protected init() {
    }

    private updateGroupRoles(roleGroups: Array<IRoleGroup>): Array<IRoleGroup> {
        for (let i = roleGroups.length; i--;) {
            if (roleGroups[i].status) {
                roleGroups[i].roles = this.acl.getGroupRoles(roleGroups[i].name);
            } else {
                roleGroups.slice(i)
            }
        }
        return roleGroups;
    }

    public register(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User(req.body),
            validationError = user.validate();
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        user.password = Hashing.withSalt(user.password);
        user.insert<IUser>()
            .then(result => {
                result.items[0].password = '';
                user.setValues(result.items[0]);
                req.session && req.session.destroy();
                Session.create()
                    .then(session => {
                        Session.setAuthToken(res, session.sessionId);
                        req.session = session;
                        req.session.set('user', user.getValues());
                        res.json(result);
                    })
            })
            .catch(error => next(error));
    }

    public login(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User(req.body),
            validationError = user.validate('username', 'password');
        if (validationError) {
            return next(new ValidationError(validationError))
        }
        user.password = Hashing.withSalt(user.password);
        User.findByModelValues<IUser>({username: user.username, password: user.password}, {
            relations: [{
                name: 'roleGroups',
                fields: ['id', 'name', 'status']
            }]
        })
            .then(result => {
                if (result.items.length != 1) {
                    return next(new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null));
                }
                result.items[0].roleGroups = this.updateGroupRoles(<Array<RoleGroup>>result.items[0].roleGroups);
                result.items[0].password = '';
                user.setValues(result.items[0]);
                req.session && req.session.destroy();
                Session.create(req.body.rememberMe)
                    .then(session => {
                        Session.setAuthToken(res, session.sessionId);
                        req.session = session;
                        req.session.set('user', user.getValues());
                        res.json(result);
                    })
            })
            .catch(error => next(error));
    }

    public logout(req: IExtRequest, res: Response, next: NextFunction) {
        User.findById<IUser>(this.user(req).id)
            .then(result => {
                if (result.items.length != 1) throw new DatabaseError(Err.Code.DBNoRecord, null);
                req.session && req.session.destroy();
                return Session.create()
            })
            .then(session => {
                Session.setAuthToken(res, session.sessionId);
                this.getMe(req, res, next);
            })
            .catch(error => next(error));
    }

    public getMe(req: IExtRequest, res: Response, next: NextFunction) {
        let user = this.user(req);
        if (user.id) {
            User.findById<IUser>(user.id, {relations: [{name: 'roleGroups', fields: ['id', 'name', 'status']}]})
                .then(result => {
                    result.items[0].roleGroups = this.updateGroupRoles(<Array<RoleGroup>>result.items[0].roleGroups);
                    result.items[0].password = '';
                    res.json(result);
                })
                .catch(error => next(error));
        } else {
            let securitySetting = this.setting.security;
            let guest = <IUser>{
                username: securitySetting.guestRoleName,
                roleGroups: this.updateGroupRoles([<IRoleGroup>{
                    status: Status.Active,
                    name: securitySetting.guestRoleName
                }])
            };
            res.json(<IQueryResult<IUser>>{items: [guest]});
        }
    }

    public update(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User(req.body),
            validationError = user.validate();
        user.id = this.user(req).id;
        if (validationError) {
            return next(new ValidationError(validationError));
        }
        User.findById<IUser>(user.id)
            .then(result => {
                if (result.items.length == 1) return user.update<IUser>().then(result => res.json(result));
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
            })
            .catch(error => next(error));
    }
}