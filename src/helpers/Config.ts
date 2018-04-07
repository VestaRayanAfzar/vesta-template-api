import { IAppConfig } from "../config/appConfig";

export class Config {

    public static init(config: IAppConfig) {
        Config.config = config;
    }

    public static get<T>(key: string, defaultValue?: T) {
        if (key in Config.storage) {
            return Config.storage[key] as T;
        }
        if (key in Config.config) {
            return Config.config[key] as T;
        }
        return defaultValue;
    }

    public static getConfig(): IAppConfig {
        return Config.config;
    }

    public static set<T>(key: string, value: T) {
        Config.storage[key] = value;
    }

    private static config: IAppConfig;
    private static storage: any = {};
}
