import { DatabaseError, Err, ValidationError } from "@vesta/core";
import { NextFunction, Response, Router } from "express";
import { AclAction } from "../../../cmn/enum/Acl";
import { IToken, Token } from "../../../cmn/models/Token";
import { IUser } from "../../../cmn/models/User";
import { BaseController, IExtRequest } from "../../BaseController";

export class TokenController extends BaseController {

    public route(router: Router) {
        // router.get('/token/count', this.checkAcl('token', AclAction.Read), this.wrap(this.getTokenCount));
        // router.get('/token/:id', this.checkAcl('token', AclAction.Read), this.wrap(this.getToken));
        // router.get('/token', this.checkAcl('token', AclAction.Read), this.wrap(this.getTokens));
        router.post('/token', this.checkAcl('token', AclAction.Add), this.wrap(this.addToken));
        router.put('/token', this.checkAcl('token', AclAction.Edit), this.wrap(this.updateToken));
        router.delete('/token/:token', this.checkAcl('token', AclAction.Delete), this.wrap(this.removeToken));
    }

    public async getTokenCount(req: IExtRequest, res: Response, next: NextFunction) {
        let query = this.query2vql(Token, req.query, true);
        let result = await Token.count<IToken>(query);
        res.json(result);
    }

    public async getToken(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getUserFromSession(req);
        const isAdmin = this.isAdmin(authUser);
        const id = this.retrieveId(req);
        let result = await Token.find<IToken>(id, { relations: ['user'] });
        if (result.items.length != 1 || (!isAdmin && ((<IUser>result.items[0].user).id != authUser.id))) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        delete (<IUser>result.items[0].user).password;
        res.json(result);
    }

    public async getTokens(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getUserFromSession(req);
        const isAdmin = this.isAdmin(authUser);
        let query = this.query2vql(Token, req.query);
        if (!isAdmin) {
            query.filter({ user: authUser.id });
        }
        let result = await Token.find<IToken>(query);
        for (let i = result.items.length; i--;) {
            delete (<IUser>result.items[i].user).password;
        }
        res.json(result);
    }

    public async addToken(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getUserFromSession(req);
        let token = new Token(req.body);
        token.user = authUser.id;
        let validationError = token.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await Token.find<IToken>({ token: token.token, user: token.user });
        if (result.items.length) {
            token.id = result.items[0].id;
            let uResult = await token.update<IToken>();
            return res.json(uResult);
        }
        let uResult = await token.insert<IToken>();
        delete (<IUser>uResult.items[0].user).password;
        res.json(uResult);
    }

    public async updateToken(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getUserFromSession(req);
        let token = new Token(req.body);
        token.user = authUser.id;
        //
        let prevToken = req.body.prevToken;
        let prevTokenResult = await Token.find<IToken>({ token: prevToken, user: authUser.id });
        if (prevTokenResult.items.length == 1) {
            let pToken = new Token(prevTokenResult.items[0]);
            await pToken.remove();
        }
        //
        let validationError = token.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await token.insert<IToken>();
        delete (<IUser>result.items[0].user).password;
        res.json(result);
    }

    public async removeToken(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getUserFromSession(req);
        const iToken: IToken = { user: authUser.id, token: req.params.token };
        // todo add regex to token model for validation
        let result = await Token.find(iToken);
        if (result.items.length != 1) {
            throw new Err(Err.Code.Token);
        }
        const token = new Token(result.items[0]);
        let dResult = await token.remove();
        res.json(dResult);
    }
}
