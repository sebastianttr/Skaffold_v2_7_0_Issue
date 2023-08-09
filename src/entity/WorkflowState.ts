import {model, Schema} from "mongoose";
import {IWorkflowStateModel} from "../model/WorkflowStateModel";

const workflowStateUserSchema = new Schema<IWorkflowStateModel>({
    id: String,                         // workflow id ... to keep track of the process -> generate a UUID
    currentState: String,               // uid from frontend
    currentProcessId: [String],         // messageID from frontend
    timestamp: Number,                  // timestamp
    userId: String,
    messageUid: String,
    start: [String],
    // processes: [],                   // list of processes. where we define the next process and the parameters of the process.
    params: Object                      // Params - can specify how the workflow is treated.
});

const WorkflowState = model<IWorkflowStateModel>("workflow_states",workflowStateUserSchema);

export {WorkflowState}