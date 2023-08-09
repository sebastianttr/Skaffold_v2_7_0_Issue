import {IWorkflowProcessModel} from "./WorkflowProcessModel";

enum WorkflowStates {
    IDLE,
    RUN,
    DONE,
    MISSING_DATA,
    EXCEPTION,
}

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

export {IWorkflowStateModel, WorkflowStates}