import "reflect-metadata";
import express from 'express';
import {Inject, Log} from "./common";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import * as swaggerUi from 'swagger-ui-express';
import swaggerDocument from "../swagger.json";
import {DatabaseService} from "./service/DatabaseService";
import KafkaMessagingService from "./service/KafkaMessagingService";
import BlobService from "./service/BlobService";
import {RegisterRoutes} from "../dist/routes";

const app = express();
const port = 3000;

const databaseService: DatabaseService = Inject(DatabaseService)
const kafkaService: KafkaMessagingService = Inject(KafkaMessagingService)
const blobService: BlobService = Inject(BlobService)

app.use(cors({
        origin: '*',
        optionsSuccessStatus: 200,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '500mb',
    parameterLimit: 100000
}));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(bodyParser.json({
    limit: '500mb'
}));

app.use(express.static("public"));

RegisterRoutes(app);

app.listen(port, () => {
  Log.info(`Express is listening at http://localhost:${port}`);
});

