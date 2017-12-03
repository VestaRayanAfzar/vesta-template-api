import {NextFunction, Response, Router} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {ValidationError} from "../../../cmn/core/error/ValidationError";
import {DatabaseError} from "../../../cmn/core/error/DatabaseError";
import {Err} from "../../../cmn/core/Err";
import {IQueryResult} from "../../../cmn/core/ICRUDResult";
import {Session} from "../../../session/Session";
import {Hashing} from "../../../helpers/Hashing";
import {IRole, Role} from "../../../cmn/models/Role";
import {IUser, SourceApp, User, UserType} from "../../../cmn/models/User";
import {TextMessage} from "../../../helpers/TextMessage";


export class AccountController extends BaseController {

    public route(router: Router) {
        router.get('/me', this.wrap(this.getMe));
        router.post('/account', this.checkAcl('account', 'register'), this.wrap(this.register));
        router.post('/account/login', this.checkAcl('account', 'login'), this.wrap(this.login));
        router.post('/account/forget', this.checkAcl('account', 'forget'), this.wrap(this.forget));
        router.get('/account/logout', this.checkAcl('account', 'logout'), this.wrap(this.logout));
    }

    public async register(req: IExtRequest, res: Response, next: NextFunction) {
        let userExists = false;
        const sourceApp = req.body.s;
        if (sourceApp != SourceApp.EndUser) {
            throw new Err(Err.Code.Forbidden);
        }
        const userRoleName = this.config.security.userRoleName;
        let user = new User(req.body);
        let validationError = user.validate('username', 'password');
        if (validationError) {
            throw new ValidationError(validationError);
        }
        // checking if user exists
        let existingUser = await User.find<IUser>({username: user.username});
        if (existingUser.items.length == 1) {
            userExists = true;
            user = new User(existingUser.items[0]);
            if (!user.isOfType(UserType.User)) {
                user.type.push(UserType.User);
            }
        } else {
            user.type = [UserType.User];
        }
        let role = await Role.find<IRole>({name: userRoleName});
        if (!role.items.length) {
            throw new Err(Err.Code.OperationFailed, 'err_no_role');
        }
        user.role = role.items[0].id;
        // generating password for new user
        const randomNumber = Hashing.randomInt();
        user.password = Hashing.withSalt(`${randomNumber}`);
        let result = userExists ? await user.update<IUser>() : await user.insert<IUser>();
        // sending sms
        let sms = await TextMessage.getInstance().sendMessage(`Enter this code: ${randomNumber}`, user.mobile);
        if (sms.RetStatus === 1) {
            return res.json({});
        }
        throw new Err(Err.Code.OperationFailed, 'err_sms');
    }

    public async login(req: IExtRequest, res: Response, next: NextFunction) {
        const sourceApp = req.body.s;
        if ([SourceApp.EndUser, SourceApp.Panel].indexOf(sourceApp) < 0) {
            throw new Err(Err.Code.WrongInput);
        }
        let user = new User(req.body);
        let validationError = user.validate('username', 'password');
        if (validationError) {
            throw new ValidationError(validationError);
        }
        user.password = Hashing.withSalt(user.password);
        let result = await User.find<IUser>({username: user.username, password: user.password}, {relations: ['role']});
        if (result.items.length != 1) {
            throw new Err(Err.Code.DBNoRecord);
        }
        result.items[0].role = this.acl.updateRolePermissions(<IRole>result.items[0].role);
        user.setValues(result.items[0]);
        user.sourceApp = sourceApp;
        delete user.password;
        // prevent admin from logging into application
        if (user.sourceApp != SourceApp.Panel && this.isAdmin(user)) {
            throw new Err(Err.Code.Forbidden, 'err_admin_login');
        }
        // prevent other users from logging into panel
        if (user.sourceApp == SourceApp.Panel && !user.isOfType(UserType.Admin)) {
            throw new Err(Err.Code.Forbidden, 'err_user_admin_login');
        }
        // prevent none user from logging into user app
        if (user.sourceApp == SourceApp.EndUser && !user.isOfType(UserType.User)) {
            throw new Err(Err.Code.Forbidden, 'err_none_user_login');
        }
        req.session.destroy();
        let session = await Session.create(req.body.rememberMe);
        Session.setAuthToken(res, session.sessionId);
        req.session = session;
        req.session.set('user', user.getValues());
        res.json({items: [user]});
    }

    public async logout(req: IExtRequest, res: Response, next: NextFunction) {
        let result = await User.find<IUser>(this.getUserFromSession(req).id);
        if (result.items.length != 1) {
            throw new DatabaseError(Err.Code.DBNoRecord, null);
        }
        req.session.destroy();
        let session = await Session.create();
        Session.setAuthToken(res, session.sessionId);
        await this.getMe(req, res, next);
    }

    public async forget(req: IExtRequest, res: Response, next: NextFunction) {
        const sourceApp = req.body.s;
        if ([SourceApp.EndUser, SourceApp.Panel].indexOf(sourceApp) < 0) {
            throw new Err(Err.Code.Forbidden);
        }
        let user = new User(req.body);
        let validationError = user.validate('mobile');
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await User.find<IUser>({mobile: user.mobile});
        if (result.items.length != 1) {
            throw new ValidationError({mobile: 'invalid'});
        }
        user.setValues(result.items[0]);
        // enumeration possibility
        const randomNumber = Hashing.randomInt();
        let sms = await TextMessage.getInstance().sendMessage(`Enter this code: ${randomNumber}`, result.items[0].mobile);
        if (sms.RetStatus === 1) {
            // updating user password
            user.password = Hashing.withSalt(`${randomNumber}`);
            await user.update();
            return res.json({});
        }
        // todo: something goes wrong
        throw new Err(Err.Code.OperationFailed, 'err_sms');
    }

    public async getMe(req: IExtRequest, res: Response, next: NextFunction) {
        //<production>
        const sourceApp = +req.query.s;
        if ([SourceApp.EndUser, SourceApp.Panel].indexOf(sourceApp) < 0) {
            throw new Err(Err.Code.WrongInput);
        }
        //</production>
        let user = this.getUserFromSession(req);
        if (user.id) {
            let result = await User.find<IUser>(user.id, {relations: ['role']});
            result.items[0].role = this.acl.updateRolePermissions(<IRole>result.items[0].role);
            delete result.items[0].password;
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
}