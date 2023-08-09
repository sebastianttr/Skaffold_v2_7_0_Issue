import {WorkflowProcesses} from "../entity/WorkflowProcess";
import {IWorkflowProcessModel} from "../model/WorkflowProcessModel";

// WHY STATIC METHODS? because you cannot use this in async function because of promises. So the second best choices is making the method static.
export class WorkflowProcessRepository {


    // gets the current
    public static getProcess = (processID: string) => {
        return WorkflowProcesses.findOne(
            {processId: processID}
        )
    }

    public static getParallelProcesses = (nextProcesses: string) => WorkflowProcesses.find(
        {next: {$in: [nextProcesses]}}
    )

    public static hasOutputVariables = (processes: IWorkflowProcessModel[]) => {
        let hasVariable:boolean = true;
        let missingVariableProcess: string[] = []

        processes.forEach((proc) => {

            if(!proc.output){
                hasVariable = false;
                missingVariableProcess.push(proc.processId)
            }
        })

        return {
            hasOutputVariables: hasVariable,
            missingVariableProcess:missingVariableProcess
        }
    }

}