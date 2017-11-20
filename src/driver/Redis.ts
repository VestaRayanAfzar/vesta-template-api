import {createClient, RedisClient} from "redis";
import {IDatabaseConfig, KeyValueDatabase} from "../cmn/core/Database";
import {IDeleteResult, IQueryResult, IUpsertResult} from "../cmn/core/ICRUDResult";
import {DatabaseError} from "../cmn/core/error/DatabaseError";
import {Err} from "../cmn/core/Err";

export class Redis implements KeyValueDatabase {
    private connection: RedisClient;
    private config: IDatabaseConfig;

    public constructor(config: IDatabaseConfig) {
        this.config = config;
    }

    public connect(): Promise<KeyValueDatabase> {
        if (this.connection) return Promise.resolve(<KeyValueDatabase>this);
        return new Promise<KeyValueDatabase>((resolve, reject) => {
            let client = createClient(this.config.port, this.config.host);
            client.on('ready', () => {
                this.connection = client;
                resolve(this);
                console.log('Redis connection established');
            });
            client.on('error', (error) => {
                reject(error);
                console.log('Redis Error', error);
            });
            client.on('reconnecting', () => {
                console.log('Redis connection established');
            });
        })
    }

    close(connection: any): Promise<boolean> {
        return Promise.reject(false);
    }

    find<T>(key: string): Promise<IQueryResult<T | string>> {
        return new Promise<IQueryResult<T | string>>((resolve, reject) => {
            this.connection.get(key, (err, reply) => {
                let result: IQueryResult<T | string> = <IQueryResult<T | string>>{};
                result.items = [];
                if (err) {
                    return reject(new DatabaseError(Err.Code.DBInsert, err));
                }
                if (reply) {
                    try {
                        result.items = [<T>JSON.parse(reply)];
                    } catch (e) {
                        result.items = [reply];
                    }
                }
                resolve(result);
            });
        })
    }

    insert<T>(key: string, value: T | string): Promise<IUpsertResult<T>> {
        return new Promise<IUpsertResult<T>>((resolve, reject) => {
            this.connection.set(key, <string>value, (err) => {
                if (err) {
                    return reject(new DatabaseError(Err.Code.DBInsert, err));
                }
                resolve();
            });
        })
    }

    update<T>(key: string, value: T): Promise<IUpsertResult<T>> {
        return this.insert<T>(key, value);
    }

    remove(key: string): Promise<IDeleteResult> {
        return new Promise((resolve, reject) => this.connection.del(key, ((err, res) => {
            if (err) {
                return reject(new DatabaseError(Err.Code.DBDelete, err));
            }
            resolve();
        })))
    }
}