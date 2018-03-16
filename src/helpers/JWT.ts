import * as jwt from "jsonwebtoken";
import { SignOptions, VerifyCallback, VerifyOptions } from "jsonwebtoken";
import { config } from "../config/config";

const security = config.security;

export class JWT {

    public static sign(payload: any): string {
        const secretOrPrivateKey = security.secret;
        const options: SignOptions = {
            algorithm: security.session.hashing,
        };
        try {
            return jwt.sign(payload, secretOrPrivateKey, options);
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.error("jwt sign failed", e);
            return null;
        }
    }

    public static verify(token: string, callback: VerifyCallback) {
        const secretOrPrivateKey = security.secret;
        const options: VerifyOptions = {
            algorithms: [security.session.hashing],
            ignoreExpiration: true,
        };
        try {
            jwt.verify(token, secretOrPrivateKey, options, callback);
        } catch (e) {
            callback(e, null);
        }
    }
}
