import {WorkFlowProcessModel, WorkflowStartModel} from "./WorkflowStartModel";

enum WorkflowStates {
    IDLE,
    RUN,
    DONE,
    MISSING_DATA,
}

interface WorkflowStateModel extends WorkflowStartModel{       // this will be stored in the mongo database ... it remembers te current state of the workflow
    currentState: WorkflowStates,   // Workflow states
    currentProcessId: string[],
}

export {WorkflowStateModel, WorkflowStates}