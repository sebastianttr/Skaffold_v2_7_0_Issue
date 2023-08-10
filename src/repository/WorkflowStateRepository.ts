import {WorkflowState} from "../entity/WorkflowState";
import {WorkflowProcesses} from "../entity/WorkflowProcesses";
import {singleton} from "tsyringe";
import {IWorkflowStateModel} from "../model/WorkflowStateModel";

// WHY STATIC METHODS? because you cannot use this in async function because of promises. So the second best choices is making the method static.
@singleton()
export class WorkflowStateRepository {

    // get the workflow state - no type because unknown for now
    public getWorkflowStateByWorkflowId = (workflowID: string) => WorkflowState.findOne({id: workflowID})

    public async getWorkflowStateByUserId(userId: string): Promise<IWorkflowStateModel[]> {
        return WorkflowState.find({userId: userId});
    }

    // remove process ID from the list of current process ID from the state
    // should actually be in WorkflowStateModel but because of TypeScript, you cannot
    public removeFromProcessIdList = (processIdList: string[], processID: string): string[] => processIdList.reduce((acc : string[], value : string) => {
        // if current value is the process, take it out. Add the next process later.
        if (value != processID)
            acc.push(value)

        return acc;
    }, [])

    public static getNextProcess = (next: string) => WorkflowProcesses.findOne({processID: next})

}