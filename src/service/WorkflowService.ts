import {injectable} from "tsyringe";
import {Inject, Log} from "../common";
import KafkaMessagingService from "./KafkaMessagingService";

@injectable()
export default class WorkflowService{

    private kafkaMessageService: KafkaMessagingService = Inject(KafkaMessagingService)

    constructor() {

    }

    startProcess = (req: Express.Request) => {
        this.kafkaMessageService.send(
            "Hello World!!",
            "dev.file.upload.firm-service",
            "",
            0,
            {})
            .then(r => Log.info("Sent kafka message"))
            .catch(e => {
                Log.info("Error!")
                Log.info(e.message)
            })

        //Log.info("Starting the process")
    }
}