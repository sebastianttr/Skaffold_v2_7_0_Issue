import {incoming, KafkaIncomingRecord} from "../helper/KafkaIncoming";
import WorkflowService from "../service/WorkflowService";
import {InjectionToken, singleton} from "tsyringe";


@singleton()
export class KafkaMessageProcessor{

    @incoming({topic:"dev.workflow.service",injectables:[WorkflowService]})        // ugly!!!!
    public async workflowMessages<T extends InjectionToken>(message: KafkaIncomingRecord, injections:T[]) {
        await (injections[0] as unknown as WorkflowService).workflowMessages(message)       // also mega ugly.
    }
}