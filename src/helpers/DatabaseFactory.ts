import { IModelCollection, Database, IDatabaseConfig, IDatabase, DatabaseError, Err } from "../medium";

export class DatabaseFactory {
    private static databases: {
        [protocol: string]: {
            database: IDatabase,
            models?: IModelCollection,
            instance?: Database,
            config: IDatabaseConfig
        }
    } = {};

    public static getInstance(name: string): Promise<Database> {
        let db = DatabaseFactory.databases[name];
        if (db) {
            if (db.instance) {
                return Promise.resolve(db.instance);
            } else {
                db.instance = new (db.database)(db.config, db.models);
                return db.instance.connect().then(() => {
                    for (let model in db.models) {
                        if (db.models.hasOwnProperty(model)) {
                            db.models[model].database = db.instance;
                        }
                    }
                    return db.instance;
                })
            }
        } else {
            return Promise.reject(new DatabaseError(Err.Code.DBInvalidDriver, new Error('invalid driver')));
        }
    }

    public static register(name: string, config: IDatabaseConfig, driver: IDatabase, models?: IModelCollection) {
        if (driver && config && name) DatabaseFactory.databases[name] = {
            database: driver,
            models: models,
            config: config,
        };
    }
}