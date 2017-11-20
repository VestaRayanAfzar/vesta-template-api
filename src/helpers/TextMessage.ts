import {stringify} from "querystring";
import {request, RequestOptions} from "http";
import {Config} from "./Config";

export interface ITextMessageConfig {
    host: string;
    url: string;
    username: string;
    password: string;
    number: string;
}

export interface ITextMessageResult {
    RetStatus: number;
}

export class TextMessage {
    private static instance: TextMessage;

    constructor(private config: ITextMessageConfig) {
    }

    private getReqOptions(): RequestOptions {
        const {host, url} = this.config;
        return {
            method: "POST",
            hostname: host,
            port: null,
            path: url,
            headers: {
                "cache-control": "no-cache",
                "postman-token": "986f8677-6806-fd9c-62bf-5b7594a44066",
                "content-type": "application/x-www-form-urlencoded"
            }
        };
    }

    public async sendMessage(text: string, to: string): Promise<ITextMessageResult> {
        const {username, password, number} = this.config;
        return new Promise<ITextMessageResult>((resolve, reject) => {
            let req = request(this.getReqOptions(), function (res) {
                let chunks = [];
                res.on("data", function (chunk) {
                    chunks.push(chunk);
                });
                res.on("end", function () {
                    let body = Buffer.concat(chunks);
                    resolve(JSON.parse(body.toString()));
                });
            });
            req.on('error', error => {
                reject(error);
            });
            req.write(stringify({username, password, to, from: number, text, isflash: 'false'}));
            req.end();
        })
    }

    public static getInstance(): TextMessage {
        if (!TextMessage.instance) {
            TextMessage.instance = new TextMessage(Config.get<ITextMessageConfig>('sms'));
        }
        return TextMessage.instance;
    }
}