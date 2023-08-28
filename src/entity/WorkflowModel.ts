import {model, Schema} from "mongoose";
import {IWorkflowProcessModel} from "../model/WorkflowProcessModel";
import {IWorkflowViewModel} from "../model/editor/WorkflowViewModel";
import {IWorkflowProcessNode} from "../model/editor/WorkflowProcessNode";
import {IWorkflowConnection} from "../model/editor/WorkflowConnection";

const workflowSchema = new Schema<IWorkflowViewModel>({
    id: String,
    userId: String,
    name: String,
    messageUid: String,
    start: Array<String>,
    params: Object,
    nodes: Array<IWorkflowProcessNode>,           // Any for now till fix on the Workflow Service Side
    connections: Array<IWorkflowConnection>
});

const WorkflowModel = model<IWorkflowViewModel>("workflows",workflowSchema);

export {WorkflowModel}