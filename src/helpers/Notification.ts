import { request } from "https";
import { IToken, Token } from "../cmn/models/Token";
import { SourceApp } from "../cmn/models/User";
import { Err } from "../medium";
import { Config } from "./Config";

export class Notification {

    public static getInstance(): Notification {
        if (!Notification.instance) {
            Notification.instance = new Notification();
        }
        return Notification.instance;
    }

    private static instance: Notification;
    private euKey;
    private euAuth;
    private spKey;
    private spAuth;

    private constructor() {
        const notifConfig = Config.get<any>("notif");
        this.euKey = notifConfig.euKey;
        this.euAuth = notifConfig.euAuth;
        this.spKey = notifConfig.spKey;
        this.spAuth = notifConfig.spAuth;
    }

    public async sendMessage(userId: number, message: string, sourceApp: SourceApp, data?: any) {
        const result = await Token.find<IToken>({ user: userId });
        if (!result.items.length) {
            throw new Err(Err.Code.Token);
        }
        const tokens = result.items.map((t) => t.token);
        return this.sendNotification(message, tokens, sourceApp, data);
    }

    private sendNotification(content: string, playerIds: string[], sourceApp: SourceApp, data: any) {
        const message: any = {
            app_id: sourceApp === SourceApp.EndUser ? this.spKey : this.euKey,
            contents: { en: content },
            include_player_ids: playerIds,
        };
        message.data = data || {};
        return new Promise((resolve, reject) => {
            const headers = {
                "Authorization": `Basic ${sourceApp === SourceApp.EndUser ? this.spAuth : this.euAuth}`,
                "Content-Type": "application/json; charset=utf-8",
            };

            const options = {
                headers,
                host: "onesignal.com",
                method: "POST",
                path: "/api/v1/notifications",
                port: 443,
            };

            const req = request(options, (res) => {
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    const body = Buffer.concat(chunks);
                    resolve(JSON.parse(body.toString()));
                });
            });

            req.on("error", (e) => {
                reject(e);
            });

            req.write(JSON.stringify(message));
            req.end();
        });
    }
}
