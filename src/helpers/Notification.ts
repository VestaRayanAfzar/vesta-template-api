import {request} from "https";
import {IToken, Token} from "../cmn/models/Token";
import {Err} from "../cmn/core/Err";
import {SourceApp} from "../cmn/models/User";

export class Notification {
    private static instance: Notification;
    private spKey = "cecb9136-c6db-46c9-96ad-b7b92bbd250f";
    private spAuth = "ODEzOWUyMTctMGMyNS00YWFkLTlmYzQtY2E4Y2NhYjUzYzg2";
    private euKey = "13f5cec0-2911-4f76-a26e-56daef405555";
    private euAuth = "ZjM0NzA4NGQtNGY0NS00MGYzLWFiMzYtZjI3ODhlNDAzMmM2";

    private constructor() {
    }

    private sendNotification(content: string, playerIds: Array<string>, sourceApp: SourceApp, data: any) {
        const message: any = {
            app_id: sourceApp == SourceApp.EndUser ? this.spKey : this.euKey,
            contents: {"en": content},
            include_player_ids: playerIds
        };
        if (data) {
            message.data = data;
        }
        return new Promise((resolve, reject) => {
            let headers = {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${sourceApp == SourceApp.EndUser ? this.spAuth : this.euAuth}`
            };

            const options = {
                host: "onesignal.com",
                port: 443,
                path: "/api/v1/notifications",
                method: "POST",
                headers: headers
            };

            let req = request(options, function (res) {
                let chunks = [];
                res.on("data", function (chunk) {
                    chunks.push(chunk);
                });
                res.on("end", function () {
                    let body = Buffer.concat(chunks);
                    resolve(JSON.parse(body.toString()));
                });
            });

            req.on('error', function (e) {
                reject(e);
            });

            req.write(JSON.stringify(message));
            req.end();
        })
    };

    public async sendMessage(user: number, message: string, sourceApp: SourceApp, data?: any) {
        let result = await Token.find<IToken>({user: user});
        if (!result.items.length) {
            throw new Err(Err.Code.Token);
        }
        const tokens = result.items.map(t => t.token);
        return this.sendNotification(message, tokens, sourceApp, data);
    }

    public static getInstance(): Notification {
        if (!Notification.instance) {
            Notification.instance = new Notification();
        }
        return Notification.instance;
    }
}