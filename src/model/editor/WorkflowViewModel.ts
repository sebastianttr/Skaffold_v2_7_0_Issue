import {IWorkflowProcessNode} from "./WorkflowProcessNode";
import {IWorkflowConnection} from "./WorkflowConnection";

export interface IWorkflowViewModel {
    id: string,
    userId: string,
    messageUid: string,
    name: string,
    start:string[],
    params: any,
    nodes: IWorkflowProcessNode[],           // Any for now till fix on the Workflow Service Side
    connections: IWorkflowConnection[]      // Any for now till fix on the Workflow Service Side
}