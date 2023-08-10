import {IWorkflowProcessModel} from "./WorkflowProcessModel";
import {WorkflowStates} from "./enums/WorkflowStates";


interface IWorkflowStateModel {       // this will be stored in the mongo database ... it remembers te current state of the workflow
    currentState: WorkflowStates;   // Workflow states
    currentProcessId: string[];
    userId: string;
    id: string;
    messageUid: string;
    params: { [p: string]: string };
    start: string[];
    timestamp: number;
    processes?: IWorkflowProcessModel[];
}

export {IWorkflowStateModel}