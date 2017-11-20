import {config} from "../config/config";
import * as crypto from "crypto";

export class Hashing {

    public static withSalt(password: string): string {
        let {hashing, salt} = config.security;
        let hash = crypto.createHash(hashing);
        let saltedPassword = password.length % 2 == 0 ? (salt + password) : (password + salt);
        return hash.update(saltedPassword).digest('hex');
    }

    public static compare(password, hash) {
        let hashedPassword = Hashing.withSalt(password);
        return hashedPassword == hash;
    }

    public static simple(text: string) {
        let hash = crypto.createHash(config.security.hashing);
        return hash.update(text).digest('hex');
    }

    public static randomInt(length: number = 6): number {
        let nums = [];
        for (let i = 0; i < length; ++i) {
            let rand = 0;
            do {
                rand = Math.floor(Math.random() * 10);
            } while (nums.indexOf(rand) >= 0);
            nums.push(rand);
        }
        return +nums.join('');
    }
}