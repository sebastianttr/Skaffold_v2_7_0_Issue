import {WorkflowStates} from "./WorkflowStateModel";
import {Query} from "mongoose";
import {WorkflowProcesses} from "../entity/WorkflowProcess";
import {Log} from "../common";


interface WorkflowProcessOutputModel{
    variables: any,     // The variables ... calculation output
    message?: any,       // Adds some more info. Like for example: How was it calculated? What values were used ()
    extra?: any
}

interface WorkflowStartModel{
    id: string,                 // workflow id ... to keep track of the process -> generate a UUID
    userId: string,               // uid from frontend
    messageId: string,          // messageID from frontend
    timestamp: number,
    params:{[key: string]: string}    // defines the parameters of the entire process
    start: string[]
    processes?: WorkFlowProcessModel[]   // list of processes. where we define the next process and the parameters of the process.
}

type WorkflowProcessStatusMessage = {
    statusCount: number,                // status counter
    statusTotal: number,                // status total -> how many steps in a process
    messageUid: string,                 // message Uid -> needed to tell where to send it back
    userId: string,                     // user Id -> to tell from which user it is to get user-specific data.
    type: string,                       // type -> DETAIL_TYPE (ADX_CALCULATION, ADX_FINISH, CDX_CALCULATION, CDX_FINISH, etc.)
    processType: string,                // process type -> what kind of process is this supposed to be. PROCESS_TYPE (ADX, CDX, SAVE, etc.)
    status: string                      // current status: INFO, DONE, WARNING, ERROR;
    message: string
}

interface WorkflowProcessStatusModel{
    // statusCount: number;              // status counter                                          -> In message property
    // statusTotal: number;              // status total -> how many steps in a process             -> In message property
    message: WorkflowProcessStatusMessage;                    // The status message -> can have a state and a message ...    -> containes
    workflowId: string;               // to which workflow it should belong too
    //messageID: string;                // message ID from where it comes from                      -> In message property
    processId: string;                // Process ID from which process it come from.
    timestamp: Date                   // Timestamp ... added by the
}

// used for both the input(start JSON) and to pass around the services.
class WorkFlowProcessModel {
    processId: string;       // process id = generated UID = to keep track of the process
    processName: string;    // name of the process -> to which process it should send the info to -> service name
    processState: WorkflowStates;
    // variables: any;          // variables needed. The value of the key defines the default value in case the constant variable lookup had no values. If it is empty string; assume your own value based of type (number: 0).
    // this variables field will be used differently when sending the message over kafka to the services.
    // output: {}
    workflowId: string;      // Workflow ID -> String because UUID
    next: string[];          // process id of the next process -> send this back to workflow process to keep track to get process params and start next process.
    messageId: string;       // For reporting the status. -> String because UUID
    userId: string;
    variables: any;
    params: any;
    output?: WorkflowProcessOutputModel;

    constructor(processID: string, processName: string, processState: WorkflowStates, workflowID: string, next: string[], messageID: string, userID: string,variables: any, params: any, output: WorkflowProcessOutputModel) {
        this.processId = processID;
        this.processName = processName;
        this.processState = processState;
        this.workflowId = workflowID;
        this.next = next;
        this.messageId = messageID;
        this.userId = userID;
        this.variables = variables;
        this.params = params;
        this.output = output;
    }

    // gets the current
    public static getProcess = (processID: string) => {
        return WorkflowProcesses.findOne(
            {processId: processID}
        )
    }

    public static getParallelProcesses = (nextProcesses: string) => WorkflowProcesses.find(
        {next: {$in: [nextProcesses]}}
    )

    public static hasOutputVariables = (processes: WorkFlowProcessModel[]) => {
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



export {WorkflowStartModel, WorkFlowProcessModel, WorkflowProcessOutputModel, WorkflowProcessStatusModel, WorkflowProcessStatusMessage}