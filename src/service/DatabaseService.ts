import {injectable, singleton} from "tsyringe";
import dotenv from "dotenv"
import * as mongoose from "mongoose";
import {Log} from "../common";
import {Exception} from "tsoa";
import {model, Mongoose, Schema} from "mongoose";

dotenv.config()

const host = process.env["MONGO_HOST"] ?? "localhost"
const db = process.env["MONGO_DATABASE"] ?? "service_workflow"
const username = process.env["MONGO_USERNAME"] ?? "admin"
const password = encodeURIComponent(process.env["MONGO_PASSWORD"] ?? "")
const port = process.env["MONGO_PORT"] ?? "27017"

const connectionString = `mongodb://${username}:${password}@${host}:${port}/${db}?authSource=admin`

mongoose.set('strictQuery', false);

@singleton()
export class DatabaseService{

    constructor() {
        //this.connectToMongo();
    }

    connectToMongo = (): Promise<void> => mongoose.connect(connectionString)
            .then(async () => {
                Log.info("Successfully established connection to MongoDB!")
            })
            .catch((e:Exception) => {
                Log.error("Error connection to mongo db!")
                Log.error(e.name + " : " + e.message)
            })

}