import "reflect-metadata";
import express from 'express';
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import {RegisterRoutes} from "../dist/routes";
import {Exception} from "tsoa";
import {Log} from "./util/logging";
import cors from "cors";

const app = express();
const port = 3000;

(async () => {
    app.use(cors());

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({
        extended: true,
        limit: '500mb',
        parameterLimit: 100000
    }));

    app.use(bodyParser.json({
        limit: '500mb'
    }));

    app.use(express.static("public"));

    RegisterRoutes(app);

    app.listen(port, () => {
        Log.info(`Express is listening at http://localhost:${port}`);
    });


})().catch((e: Exception) => {
    Log.error(`Error during app startup: [${e.status}] ${e.message}`)
} )



