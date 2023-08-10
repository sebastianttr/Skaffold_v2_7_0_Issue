import {incoming, KafkaIncomingRecord} from "../util/kafkaincoming";
import WorkflowService from "../service/WorkflowService";
import {InjectionToken, singleton} from "tsyringe";
import {Inject} from "../util/injection";

@singleton()
export class KafkaMessageProcessor{

    @incoming("dev.workflow.service",{})
    public async workflowMessages<T extends InjectionToken>(message: KafkaIncomingRecord) {
        const workflowService = Inject(WorkflowService);
        await workflowService.workflowMessages(message)
    }

}