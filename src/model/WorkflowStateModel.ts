import {WorkFlowProcessModel, WorkflowStartModel} from "./WorkflowStartModel";
import {WorkflowState} from "../entity/WorkflowState";
import {WorkflowProcesses} from "../entity/WorkflowProcess";

enum WorkflowStates {
    IDLE,
    RUN,
    DONE,
    MISSING_DATA,
    EXCEPTION,
}

class WorkflowStateModel implements WorkflowStartModel{       // this will be stored in the mongo database ... it remembers te current state of the workflow
    currentState: WorkflowStates;   // Workflow states
    currentProcessId: string[];
    UID: string;
    id: string;
    messageID: string;
    params: { [p: string]: string };
    start: string[];
    timestamp: number;
    processes?: WorkFlowProcessModel[];

    // get the workflow state - no type because unknown for now
    public static getWorkflowState = (workflowID: string) => WorkflowState.findOne({id: workflowID})

    // remove process ID from the list of current process ID from the state
    public static removeFromCurrentProcessID = (currentProcessIDs: string[],processID): string[] => currentProcessIDs.reduce((acc, value) => {
        // if current value is the process, take it out. Add the next process later.
        if (value != processID)
            acc.push(value)

        return acc;
    }, [])

    public static getNextProcess = (next: string) => WorkflowProcesses.findOne({processID: next})

}

export {WorkflowStateModel, WorkflowStates}