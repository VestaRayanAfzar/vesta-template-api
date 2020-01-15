import { Registry } from "@vesta/core";
import { request, RequestOptions } from "http";
import { stringify } from "querystring";
import { IUser, User } from "../cmn/models/User";

export interface ITextMessageConfig {
    host: string;
    url: string;
    username: string;
    password: string;
    lineNumber: string;
}

export interface ITextMessageResult {
    RetStatus: number;
}

export class TextMessage {

    public static getInstance(): TextMessage {
        if (!TextMessage.instance) {
            TextMessage.instance = new TextMessage(Registry.get<ITextMessageConfig>("sms"));
        }
        return TextMessage.instance;
    }

    private static instance: TextMessage;

    constructor(private config: ITextMessageConfig) {
    }

    public async sendTo(userId: number, message: string): Promise<ITextMessageResult> {
        const user = await User.find<IUser>(userId);
        if (!user.items.length) { return null; }
        return this.sendMessage(user.items[0].mobile, message);
    }

    public async sendMessage(to: string, text: string): Promise<ITextMessageResult> {
        const { username, password, lineNumber } = this.config;
        return new Promise<ITextMessageResult>((resolve, reject) => {
            const req = request(this.getReqOptions(), (res) => {
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    const body = Buffer.concat(chunks);
                    resolve(JSON.parse(body.toString()));
                });
            });
            req.on("error", (error) => {
                reject(error);
            });
            req.write(stringify({ username, password, to, from: lineNumber, text, isflash: "false" }));
            req.end();
        });
    }
    private getReqOptions(): RequestOptions {
        const { host, url } = this.config;
        return {
            headers: {
                "cache-control": "no-cache",
                "content-type": "application/x-www-form-urlencoded",
                "postman-token": "986f8677-6806-fd9c-62bf-5b7594a44066",
            },
            hostname: host,
            method: "POST",
            path: url,
            port: null,
        };
    }
}
