import {model, Schema} from "mongoose";
import {WorkFlowProcessModel, WorkflowProcessStatusModel} from "../model/WorkflowStartModel";

const workflowProcessStatusSchema = new Schema<WorkflowProcessStatusModel>({
    statusCount: Number,                // Status count as number
    statusTotal: Number,                // The total number of steps recorded
    message: Object,                    // Workflow States
    workflowID: String,                 // Workflow ID
    messageID: String,                  // Message ID ... for reporting back to a user(s)
    processID: String,                  // Process ID -> From where the status message came from
    timestamp: Date                     // Timestamp -> data will expire at some point (Like a week.)
});

const WorkflowStatus = model<WorkFlowProcessModel>("workflow_status",workflowProcessStatusSchema);

export {WorkflowStatus}