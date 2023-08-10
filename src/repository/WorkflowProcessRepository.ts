import {WorkflowProcesses} from "../entity/WorkflowProcesses";
import {IWorkflowProcessModel} from "../model/WorkflowProcessModel";
import {singleton} from "tsyringe";
import {IWorkflowStateModel} from "../model/WorkflowStateModel";
import {WorkflowState} from "../entity/WorkflowState";
import {Log} from "../util/logging";

// WHY STATIC METHODS? because you cannot use this in async function because of promises. So the second best choices is making the method static.

@singleton()
export class WorkflowProcessRepository {

    // This function retrieves a specific workflow process based on its process ID.
    // It returns the matching process if found, or null if not found.
    public getProcess = (processID: string) => {
        return WorkflowProcesses.findOne(
            { processId: processID }
        );
    }

    // This function retrieves all parallel workflow processes based on their "next" processes.
    // It returns an array of processes that have the specified "next" processes.
    public getParallelProcesses = (nextProcesses: string) => WorkflowProcesses.find(
        { next: { $in: [nextProcesses] } }
    );

    // This function checks whether a list of workflow processes has output variables.
    // It returns an object indicating whether output variables are present and lists any missing variables.
    public hasOutputVariables = (processes: IWorkflowProcessModel[]) => {
        let hasVariable: boolean = true;
        let missingVariableProcess: string[] = [];

        processes.forEach((proc) => {
            // If a process doesn't have an output variable, mark hasVariable as false and record the process ID.
            if (!proc.output) {
                hasVariable = false;
                missingVariableProcess.push(proc.processId);
            }
        });

        // Return an object indicating the presence of output variables and any missing variable process IDs.
        return {
            hasOutputVariables: hasVariable,
            missingVariableProcess: missingVariableProcess
        };
    }

    // This function retrieves a specific workflow process for a given user and process ID.
    // It returns the workflow process if found, or null if not found.
    public async getWorkflowProcess(userId: string, processId: string): Promise<IWorkflowProcessModel | null> {
        // Find the workflow state associated with the given user ID.
        const workflowState: IWorkflowStateModel | null = await WorkflowState.findOne({ userId: userId });

        // If a matching workflow state is found.
        if (workflowState) {
            // Return the workflow process that matches the workflow ID and process ID.
            return WorkflowProcesses.findOne({ workflowId: workflowState.id, processId: processId });
        } else {
            // If no matching workflow state is found, log an error and return null.
            Log.error("Error in \"getWorkflowProcess\": Could not find a workflow state that matches the userId and processId! ");
            return null;
        }
    }

    // This function retrieves all workflow processes for a given user.
    // It returns an array of workflow states if found, or null if not found.
    public async getWorkflowProcesses(userId: string): Promise<IWorkflowProcessModel[] | null> {
        // Find the workflow state associated with the given user ID.
        const workflowState: IWorkflowStateModel | null = await WorkflowState.findOne({ userId: userId });

        // If a matching workflow state is found.
        if (workflowState) {
            // Return an array of workflow processes that match the workflow ID.
            return WorkflowProcesses.find({ workflowId: workflowState.id });
        } else {
            // If no matching workflow state is found, log an error and return null.
            Log.error("Error in \"getWorkflowProcesses\": Could not find a workflow state that matches the userId! ");
            return null;
        }
    }

    // This function persists an array of workflow processes to the database.
    public async persistProcesses(processes: IWorkflowProcessModel[]) {
        // Iterate through each process in the provided array.
        for await (const process of processes) {
            // Update or insert the workflow process based on process and workflow IDs.
            await WorkflowProcesses.updateOne(
                {
                    "processId": { $eq: process.processId },
                    "workflowId": { $eq: process.workflowId }
                },
                process,
                // Perform an upsert operation to update or insert the process.
                { upsert: true }
            );
        }
    }

}