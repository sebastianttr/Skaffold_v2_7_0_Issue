import {model, Schema} from "mongoose";
import {IWorkflowProcessModel} from "../model/WorkflowProcessModel";

const workflowProcessSchema = new Schema<IWorkflowProcessModel>({
    processId: String,                  // Process ID as string -> Identifier
    processName: String,                // Process name as string
    processState: Number,               // Workflow States
    next: [String],                     // List of next processes. Parallel streams works because array.
    variables: Object,                  // Variables. Either a map as string, or the name of the blob.
    workflowId: String,                 // Workflow id
    messageUid: String,                 // Message id ... for reporting back to a user(s)
    params: String,                     // Params ... saved as string for simplicity’s sake
    output: Object                      // Output from the services.
});

const WorkflowProcesses = model<IWorkflowProcessModel>("workflow_processes",workflowProcessSchema);

export {WorkflowProcesses}