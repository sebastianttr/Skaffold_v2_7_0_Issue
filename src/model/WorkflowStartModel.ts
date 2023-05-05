import {WorkflowStates} from "./WorkflowStateModel";
import {Query} from "mongoose";
import {WorkflowProcesses} from "../entity/WorkflowProcess";


interface WorkflowProcessOutputModel{
    variables: any,     // The variables ... calculation output
    message?: any,       // Adds some more info. Like for example: How was it calculated? What values were used ()
    extra?: any
}

interface WorkflowStartModel{
    id: string,                 // workflow id ... to keep track of the process -> generate a UUID
    UID: string,                // uid from frontend
    messageID: string,          // messageID from frontend
    timestamp: number,
    params:{[key: string]: string}    // defines the parameters of the entire process
    start: string[]
    processes?: WorkFlowProcessModel[]   // list of processes. where we define the next process and the parameters of the process.
}

interface WorkflowProcessStatusModel{
    statusCount: number;              // status counter
    statusTotal: number;              // status total -> how many steps in a process
    message: any;                    // The status message -> can have a state and a message ...
    workflowID: string;               // to which workflow it should belong too
    messageID: string;                // message ID from where it comes from
    processID: string;                // Process ID from which process it come from.
    timestamp: Date                   // Timestamp ... added by the

}

// used for both the input(start JSON) and to pass around the services.
class WorkFlowProcessModel {
    processID: string;       // process id = generated UID = to keep track of the process
    processName: string;    // name of the process -> to which process it should send the info to -> service name
    processState: WorkflowStates;
    // variables: any;          // variables needed. The value of the key defines the default value in case the constant variable lookup had no values. If it is empty string; assume your own value based of type (number: 0).
    // this variables field will be used differently when sending the message over kafka to the services.
    // output: {}
    workflowID: string;      // Workflow ID -> String because UUID
    next: string[];          // process id of the next process -> send this back to workflow process to keep track to get process params and start next process.
    messageID: string;       // For reporting the status. -> String because UUID
    variables: any;
    params: any;
    output?: WorkflowProcessOutputModel;

    // gets the current
    public static findCurrentProcess = (processID: string) => {
        return WorkflowProcesses.findOne(
            {processID: processID}
        )
    }

    public static getParallelProcesses = (nextProcesses: string) => WorkflowProcesses.find(
        {next: {$in: [nextProcesses]}}
    )
}



export {WorkflowStartModel, WorkFlowProcessModel, WorkflowProcessOutputModel, WorkflowProcessStatusModel}