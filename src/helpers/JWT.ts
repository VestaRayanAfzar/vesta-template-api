import { sign, SignOptions, verify, VerifyCallback, VerifyOptions } from "jsonwebtoken";
import config from "../config";

const { session, security } = config;

export class JWT {
    public static sign(payload: any, expiresIn: number | string): string {
        const secretOrPrivateKey = security.secret;
        const options: SignOptions = {
            algorithm: session.hashing,
            expiresIn,
        };
        try {
            return sign(payload, secretOrPrivateKey, options);
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.error("jwt sign failed", e);
            return null;
        }
    }

    public static verify(token: string, callback: VerifyCallback) {
        const secretOrPrivateKey = security.secret;
        const options: VerifyOptions = {
            algorithms: [session.hashing],
            ignoreExpiration: true,
        };
        try {
            verify(token, secretOrPrivateKey, options, callback);
        } catch (e) {
            callback(e, null);
        }
    }
}
