import { Database, DatabaseError, Err, IDatabase, IDatabaseConfig, IModelCollection } from "@vesta/core";

interface IDatabaseConnectionInstance {
    config: IDatabaseConfig;
    database: IDatabase;
    models?: IModelCollection;
    instance?: Database;
}

interface IDatabaseConnectionStorage {
    [protocol: string]: IDatabaseConnectionInstance;
}

export class DatabaseFactory {

    public static getInstance(name: string): Promise<Database> {
        const db = DatabaseFactory.databases[name];
        if (db) {
            if (db.instance) {
                return Promise.resolve(db.instance);
            } else {
                db.instance = new (db.database)(db.config, db.models);
                return db.instance.connect().then(() => {
                    for (const model in db.models) {
                        if (db.models.hasOwnProperty(model)) {
                            db.models[model].database = db.instance;
                        }
                    }
                    return db.instance;
                });
            }
        } else {
            return Promise.reject(new DatabaseError(Err.Code.DBInvalidDriver, new Error("invalid driver")));
        }
    }

    public static register(name: string, config: IDatabaseConfig, driver: IDatabase, models?: IModelCollection) {
        if (driver && config && name) {
            DatabaseFactory.databases[name] = { config, database: driver, models };
        }
    }
    private static databases: IDatabaseConnectionStorage = {};
}
