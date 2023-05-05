import {model, Schema} from "mongoose";
import {WorkflowStateModel} from "../model/WorkflowStateModel";
import {WorkFlowProcessModel, WorkflowProcessStatusModel} from "../model/WorkflowStartModel";

const workflowStateUserSchema = new Schema<WorkflowStateModel>({
    id: String,                         // workflow id ... to keep track of the process -> generate a UUID
    currentState: String,               // uid from frontend
    currentProcessId: [String],         // messageID from frontend
    timestamp: Number,                  // timestamp
    UID: String,
    messageID: String,
    start: [String],
    // processes: [],                      // list of processes. where we define the next process and the parameters of the process.
    params: Object                      // Params - can specify how the workflow is treated.
});

const workflowProcessSchema = new Schema<WorkFlowProcessModel>({
    processID: String,                  // Process ID as string -> Identifier
    processName: String,                // Process name as string
    processState: Number,               // Workflow States
    next: [String],                     // List of next processes. Parallel streams works because array.
    variables: Object,                  // Variables. Either a map as string, or the name of the blob.
    workflowID: String,                 // Workflow id
    messageID: String,                  // Message id ... for reporting back to a user(s)
    params: String,                     // Params ... saved as string for simplicity’s sake
    output: Object                      // Output from the services.
});

const workflowProcessStatusSchema = new Schema<WorkflowProcessStatusModel>({
    statusCount: Number,                // Status count as number
    statusTotal: Number,                // The total number of steps recorded
    message: Object,                    // Workflow States
    workflowID: String,                 // Workflow ID
    messageID: String,                  // Message ID ... for reporting back to a user(s)
    processID: String,                  // Process ID -> From where the status message came from
    timestamp: Date                     // Timestamp -> data will expire at some point (Like a week.)
});


const WorkflowState = model<WorkflowStateModel>("workflow_states",workflowStateUserSchema);
const WorkflowProcesses = model<WorkFlowProcessModel>("workflow_processes",workflowProcessSchema);
const WorkflowStatus = model<WorkFlowProcessModel>("workflow_status",workflowProcessStatusSchema);

export {WorkflowState, WorkflowProcesses, WorkflowStatus}