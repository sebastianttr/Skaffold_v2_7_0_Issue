import {WorkflowProcessState} from "./enums/WorkflowProcessState";
import {WorkflowStates} from "./enums/WorkflowStates";

export interface IWorkflowUserMessageModel{
    messageUid: string,
    userId: string,
    data: IProcessData
    total?: number,
    counter?: number,
    time: number,
    title?: string
    description?: string,
    link?: string
}

export interface IProcessData {
    message: string
    calculationType?: string,
    processStatus?: WorkflowProcessState
    workflowStatus?: WorkflowStates
}