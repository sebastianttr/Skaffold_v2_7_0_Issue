// What is the difference between this and WorkflowProcessState?
// WorkflowStates -> The state of the entire workflow. Is it running or just missing something?
// WorkflowProcessState -> The state of a process inside a workflow.

export enum WorkflowStates {
    IDLE,
    RUN,
    DONE,
    MISSING_DATA,
    EXCEPTION,
}
