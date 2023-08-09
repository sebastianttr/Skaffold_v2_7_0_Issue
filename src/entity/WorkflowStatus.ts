import * as mongoose from "mongoose";
import {IWorkflowProcessStatusModel} from "../model/WorkflowProcessStatusModel";


// class WorkflowProcessStatusMessageType extends mongoose.SchemaType {
//     constructor(key, options) {
//         super(key, options, 'Int8');
//     }
// }

// (mongoose.Schema.Types).WorkflowProcessStatusMessageType = WorkflowProcessStatusMessageType;

const workflowProcessStatusMessageSchema = new mongoose.Schema({
    statusCount: Number,                // status counter
    statusTotal: Number,                // status total -> how many steps in a process
    type: String,                       // type -> DETAIL_TYPE (ADX_CALCULATION, ADX_FINISH, CDX_CALCULATION, CDX_FINISH, etc.)
    processType: String,                // process type -> what kind of process is this supposed to be. PROCESS_TYPE (ADX, CDX, SAVE, etc.)
    status: String,                      // current status: INFO, DONE, WARNING, ERROR;
    message: String
})

const workflowProcessStatusSchema = new mongoose.Schema<IWorkflowProcessStatusModel>({
    message: workflowProcessStatusMessageSchema,                // Workflow States
    workflowId: String,                                         // Workflow ID
    processId: String,                                          // Process ID -> From where the status message came from
    messageUid: String,                 // message Uid -> needed to tell where to send it back
    userId: String,                     // user Id -> to tell from which user it is to get user-specific data.
    timestamp: Date                                             // Timestamp -> data will expire at some point (Like a week.)
});

const WorkflowStatusModel = mongoose.model<IWorkflowProcessStatusModel>("workflow_process_status",workflowProcessStatusSchema);


class WorkflowStatus extends WorkflowStatusModel implements IWorkflowProcessStatusModel{


    public static findWorkflowById = async (workflowProcessStatusModel: IWorkflowProcessStatusModel, option: any): Promise<IWorkflowProcessStatusModel[]> => {
        return await WorkflowStatus.find(WorkflowStatus.queryFromWorkflowStatus(workflowProcessStatusModel,option))!
    }

    public static queryFromWorkflowStatus = (workflowProcessStatusModel: IWorkflowProcessStatusModel, option: any = {}): any => {
        return {
            workflowId: workflowProcessStatusModel.workflowId,
            processId: workflowProcessStatusModel.processId,
            messageUid: workflowProcessStatusModel.messageUid,
            userId: workflowProcessStatusModel.userId,
            ...option
        }
    }

    public static save = async (workflowProcessStatusModel:IWorkflowProcessStatusModel): Promise<void> => {
        const newStatusModel = new WorkflowStatusModel({
            message: workflowProcessStatusModel.message,
            workflowId: workflowProcessStatusModel.workflowId,
            processId: workflowProcessStatusModel.processId,
            messageUid: workflowProcessStatusModel.messageUid,
            userId: workflowProcessStatusModel.userId,
            timestamp: workflowProcessStatusModel.timestamp
        })

        await newStatusModel.save()
    }
}

export {WorkflowStatus}