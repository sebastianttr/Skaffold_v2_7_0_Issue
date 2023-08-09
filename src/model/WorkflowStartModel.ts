import {WorkflowProcessStatusMessage} from "./types/WorkflowProcessStatusMessage";
import {IWorkflowProcessModel} from "./WorkflowProcessModel";

interface IWorkflowStartModel{
    id: string,                 // workflow id ... to keep track of the process -> generate a UUID
    userId: string,               // uid from frontend
    messageUid: string,          // messageID from frontend
    timestamp: number,
    params:{[key: string]: string}    // defines the parameters of the entire process
    start: string[]
    processes?: IWorkflowProcessModel[]   // list of processes. where we define the next process and the parameters of the process.
}



export {WorkflowProcessStatusMessage,IWorkflowStartModel}