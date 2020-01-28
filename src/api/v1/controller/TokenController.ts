import { DatabaseError, Err, ValidationError } from "@vesta/core";
import { AclAction } from "@vesta/services";
import { NextFunction, Response, Router } from "express";
import { IToken, Token } from "../../../cmn/models/Token";
import { IUser } from "../../../cmn/models/User";
import { BaseController, IExtRequest } from "../../BaseController";

export class TokenController extends BaseController {
    public route(router: Router) {
        // router.get('/token/count', this.checkAcl('token', AclAction.Read), this.wrap(this.getTokenCount));
        // router.get('/token/:id', this.checkAcl('token', AclAction.Read), this.wrap(this.getToken));
        // router.get('/token', this.checkAcl('token', AclAction.Read), this.wrap(this.getTokens));
        router.post("/token", this.checkAcl("token", AclAction.Add), this.wrap(this.addToken));
        router.put("/token", this.checkAcl("token", AclAction.Edit), this.wrap(this.updateToken));
        router.delete("/token/:token", this.checkAcl("token", AclAction.Delete), this.wrap(this.removeToken));
    }

    public async getTokenCount(req: IExtRequest, res: Response, next: NextFunction) {
        const query = this.query2vql(Token, req.query, true);
        const result = await Token.count<IToken>(query);
        res.json(result);
    }

    public async getToken(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getAuthUser(req);
        const isAdmin = this.isAdmin(authUser);
        const id = this.retrieveId(req);
        const result = await Token.find<IToken>(id, { relations: ["user"] });
        if (result.items.length !== 1 || (!isAdmin && (result.items[0].user as IUser).id !== authUser.id)) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        delete (result.items[0].user as IUser).password;
        res.json(result);
    }

    public async getTokens(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getAuthUser(req);
        const isAdmin = this.isAdmin(authUser);
        const query = this.query2vql(Token, req.query);
        if (!isAdmin) {
            query.filter({ user: authUser.id });
        }
        const result = await Token.find<IToken>(query);
        for (let i = result.items.length; i--; ) {
            delete (result.items[i].user as IUser).password;
        }
        res.json(result);
    }

    public async addToken(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getAuthUser(req);
        const token = new Token(req.body);
        token.user = authUser.id;
        const validationError = token.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        const result = await Token.find<IToken>({ token: token.token, user: token.user });
        if (result.items.length) {
            token.id = result.items[0].id;
            const uResult = await token.update<IToken>();
            return res.json(uResult);
        }
        const iResult = await token.insert<IToken>();
        delete (iResult.items[0].user as IUser).password;
        res.json(iResult);
    }

    public async updateToken(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getAuthUser(req);
        const token = new Token(req.body);
        token.user = authUser.id;
        //
        const prevToken = req.body.prevToken;
        const prevTokenResult = await Token.find<IToken>({ token: prevToken, user: authUser.id });
        if (prevTokenResult.items.length === 1) {
            const pToken = new Token(prevTokenResult.items[0]);
            await pToken.remove();
        }
        //
        const validationError = token.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        const result = await token.insert<IToken>();
        delete (result.items[0].user as IUser).password;
        res.json(result);
    }

    public async removeToken(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getAuthUser(req);
        const iToken: IToken = { user: authUser.id, token: req.params.token };
        // todo add regex to token model for validation
        const result = await Token.find(iToken);
        if (result.items.length !== 1) {
            throw new Err(Err.Code.Token);
        }
        const token = new Token(result.items[0]);
        const dResult = await token.remove();
        res.json(dResult);
    }
}
