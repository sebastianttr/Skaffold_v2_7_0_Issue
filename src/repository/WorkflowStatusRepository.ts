import {singleton} from "tsyringe";
import {IWorkflowProcessStatusModel} from "../model/WorkflowProcessStatusModel";
import {WorkflowStatus} from "../entity/WorkflowStatus";
import {Log} from "../util/logging";


@singleton()
export class WorkflowStatusRepository {

    public findWorkflowById = async (workflowProcessStatusModel: IWorkflowProcessStatusModel, option: any): Promise<IWorkflowProcessStatusModel[]> => {
        return WorkflowStatus.find(WorkflowStatusRepository.queryFromWorkflowStatus(workflowProcessStatusModel, option))!;
    }

    // can be static.
    public static queryFromWorkflowStatus(workflowProcessStatusModel: IWorkflowProcessStatusModel, option: any = {}): any {
        return {
            workflowId: workflowProcessStatusModel.workflowId,
            processId: workflowProcessStatusModel.processId,
            messageUid: workflowProcessStatusModel.messageUid,
            userId: workflowProcessStatusModel.userId,
            ...option
        }
    }

    public async save(workflowProcessStatusModel:IWorkflowProcessStatusModel): Promise<void> {
        const newStatusModel = new WorkflowStatus({
            message: workflowProcessStatusModel.message,
            workflowId: workflowProcessStatusModel.workflowId,
            processId: workflowProcessStatusModel.processId,
            messageUid: workflowProcessStatusModel.messageUid,
            userId: workflowProcessStatusModel.userId,
            timestamp: workflowProcessStatusModel.timestamp
        })

        await newStatusModel.save()
    }

    public async removeOldStatuses(workflowProcessStatusModel: IWorkflowProcessStatusModel) {

        // Get the old statuses from the database.
        const oldStatuses: IWorkflowProcessStatusModel[] = await this.findWorkflowById(workflowProcessStatusModel, {"message.statusCount":0,})

        // if there is an old status with status count of 0 and the current incoming status has number 0
        // then remove all the statuses by workflowId and processId
        if(oldStatuses.length >= 1 && workflowProcessStatusModel.message.statusCount == 0){
            // remove all with given workflowId and processId
            await WorkflowStatus.remove(WorkflowStatusRepository.queryFromWorkflowStatus(workflowProcessStatusModel))
        }
    }
}