import { Database } from "@vesta/core";
import { Router } from "express";
import { IAppConfig } from "../config";
import { Acl } from "../helpers/Acl";
import { exporter } from "./v1/import";

export class ApiFactory {

    public static create(config: IAppConfig, acl: Acl, database: Database): Promise<any> {
        const apiRouter = Router();
        return ApiFactory.loadControllers(config, acl, database)
            .then((controllerRouter) => apiRouter.use(`/api/${config.version.api}`, controllerRouter));
    }

    private static loadControllers(config: IAppConfig, acl, database: Database): Promise<Router> {
        return new Promise((resolve, reject) => {
            const router: Router = Router();
            const resolveList: Array<Promise<boolean>> = [];
            for (const controllerName in exporter.controller) {
                if (exporter.controller.hasOwnProperty(controllerName)) {
                    const instance = new exporter.controller[controllerName](config, acl, database);
                    instance.route(router);
                    const resolver = instance.resolve();
                    if (resolver) { resolveList.push(resolver); }
                }
            }
            return resolveList.length ?
                Promise.all(resolveList).then(() => resolve(router)).catch((reason) => reject(reason)) :
                resolve(router);
        });
    }
}
