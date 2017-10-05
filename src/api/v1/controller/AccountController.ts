import {NextFunction, Response, Router} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {IUser, User} from "../../../cmn/models/User";
import {Session} from "../../../session/Session";
import {Hashing} from "../../../helpers/Hashing";
import {DatabaseError, Err, IQueryResult, ValidationError} from "@vesta/core";
import {IRole} from "../../../cmn/models/Role";
import {AclAction} from "../../../cmn/enum/Acl";


export class AccountController extends BaseController {

    public route(router: Router) {
        router.get('/me', this.wrap(this.getMe));
        router.put('/account', this.checkAcl('account', AclAction.Edit), this.wrap(this.update));
        router.post('/account', this.checkAcl('account', 'register'), this.wrap(this.register));
        router.post('/account/login', this.checkAcl('account', 'login'), this.wrap(this.login));
        router.post('/account/forget', this.checkAcl('account', 'forget'), this.wrap(this.forget));
        router.get('/account/logout', this.checkAcl('account', 'logout'), this.wrap(this.logout));
    }

    public async register(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User(req.body);
        let validationError = user.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        user.password = Hashing.withSalt(user.password);
        let result = await user.insert<IUser>();
        result.items[0].password = '';
        user.setValues(result.items[0]);
        req.session && req.session.destroy();
        let session = await Session.create();
        Session.setAuthToken(res, session.sessionId);
        req.session = session;
        req.session.set('user', user.getValues());
        res.json(result);
    }

    public async login(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User(req.body);
        let validationError = user.validate('username', 'password');
        if (validationError) {
            throw new ValidationError(validationError);
        }
        user.password = Hashing.withSalt(user.password);
        let result = await User.find<IUser>({username: user.username, password: user.password}, {
            relations: [{name: 'role', fields: ['id', 'name', 'status']}]
        });
        if (result.items.length != 1) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        result.items[0].role = this.acl.updateRolePermissions(<IRole>result.items[0].role);
        result.items[0].password = '';
        user.setValues(result.items[0]);
        req.session && req.session.destroy();
        let session = await Session.create(req.body.rememberMe);
        Session.setAuthToken(res, session.sessionId);
        req.session = session;
        req.session.set('user', user.getValues());
        res.json(result);
    }

    public async logout(req: IExtRequest, res: Response, next: NextFunction) {
        let result = await User.find<IUser>(this.user(req).id);
        if (result.items.length != 1) {
            throw new DatabaseError(Err.Code.DBNoRecord, null);
        }
        req.session && req.session.destroy();
        let session = await Session.create();
        Session.setAuthToken(res, session.sessionId);
        await this.getMe(req, res, next);
    }

    public async forget(req: IExtRequest, res: Response, next: NextFunction) {
        let result = await User.find<IUser>(this.user(req).id);
        if (result.items.length != 1) {
            // enumeration possibility
        }
        // sending email
        res.end();
    }

    public async getMe(req: IExtRequest, res: Response, next: NextFunction) {
        let user = this.user(req);
        if (user.id) {
            let result = await User.find<IUser>(user.id, {
                relations: [{
                    name: 'role',
                    fields: ['id', 'name', 'status']
                }]
            });
            result.items[0].role = this.acl.updateRolePermissions(<IRole>result.items[0].role);
            result.items[0].password = '';
            res.json(result);
        } else {
            let {guestRoleName} = this.config.security;
            let guest = <IUser>{
                username: guestRoleName,
                role: this.acl.updateRolePermissions({name: guestRoleName})
            };
            res.json(<IQueryResult<IUser>>{items: [guest]});
        }
    }

    public async update(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User(req.body), validationError = user.validate();
        user.id = this.user(req).id;
        if (validationError) throw new ValidationError(validationError);
        let result = await User.find<IUser>(user.id);
        if (result.items.length != 1) throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        user.update<IUser>().then(result => res.json(result));
    }
}