import {WorkflowState} from "../entity/WorkflowState";
import {WorkflowProcesses} from "../entity/WorkflowProcess";

// WHY STATIC METHODS? because you cannot use this in async function because of promises. So the second best choices is making the method static.
export class WorkflowStateRepository {

    // get the workflow state - no type because unknown for now
    public static getWorkflowState = (workflowID: string) => WorkflowState.findOne({id: workflowID})

    // remove process ID from the list of current process ID from the state
    // should actually be in WorkflowStateModel but because of TypeScript, you cannot
    public static removeFromProcessIdList = (processIdList: string[], processID: string): string[] => processIdList.reduce((acc : string[], value : string) => {
        // if current value is the process, take it out. Add the next process later.
        if (value != processID)
            acc.push(value)

        return acc;
    }, [])

    public static getNextProcess = (next: string) => WorkflowProcesses.findOne({processID: next})

}