import { Err } from "@vesta/core";
import { Files, IncomingForm } from "formidable";
import { access, rename, unlink } from "fs";
import * as mkdirp from "mkdirp";
import { join, parse } from "path";
import { IExtRequest } from "../api/BaseController";
import { IDirConfig } from "../config/appConfig";
import { Config } from "./Config";
import { Hashing } from "./Hashing";

export class FileUploader<T> {

    public static async checkAndDeleteFile(filePath: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            access(filePath, (accError) => {
                if (accError) {
                    reject(accError);
                }
                return unlink(filePath, async (error) => error ? reject(error) : resolve(filePath));
            });
        });
    }

    private form = new IncomingForm();
    private files: Files;
    private destination;

    constructor(private genRandomFileName) {
        this.form.uploadDir = Config.get<IDirConfig>("dir").upload;
        this.form.keepExtensions = true;
        this.form.multiples = true;
    }

    public parse(req: IExtRequest): Promise<T> {
        return new Promise((resolve, reject) => {
            this.form.parse(req, (err, fields, files) => {
                if (err) {
                    return reject(new Err(Err.Code.NotAllowed, err.message));
                }
                this.files = files;
                resolve({ ...fields, ...files } as any as T);
            });
        });
    }

    public upload(destination: string): Promise<T> {
        this.destination = destination;
        return this.assertDestination()
            .then(() => this.moveFiles(this.files));
    }

    private assertDestination(): Promise<any> {
        return new Promise((resolve, reject) => {
            access(this.destination, (error) => {
                if (!error) {
                    return resolve();
                }
                mkdirp(this.destination, (mkdirError) => {
                    return mkdirError ? reject(mkdirError) : resolve();
                });
            });
        });
    }

    private moveFiles(files): Promise<any> {
        const renameList = [];
        const uploadedFiles = files instanceof Array ? [] : {};
        Object.keys(files).forEach((fieldName) => {
            if (files[fieldName] instanceof Array) {
                renameList.push(this.moveFiles(files[fieldName]).then((subFiles) => {
                    uploadedFiles[fieldName] = subFiles;
                }));
            } else {
                const uploadPath = files[fieldName].path;
                const fileName = this.genFileName(uploadPath, files[fieldName].name);
                uploadedFiles[fieldName] = fileName;
                renameList.push(this.rename(uploadPath, join(this.destination, fileName)));
            }
        });
        return Promise.all(renameList).then(() => uploadedFiles);
    }

    private rename(srcFileName: string, destFileName: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            rename(srcFileName, destFileName, (error) => {
                return error ? reject({ error }) : resolve(true);
            });
        });
    }

    private genFileName(filePath: string, originalFileName): string {
        if (!this.genRandomFileName) {
            return originalFileName;
        }
        const parts = parse(filePath);
        return `${Hashing.simple(parts.name + Date.now().toString())}${parts.ext}`;
    }
}
