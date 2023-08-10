// used for both the input(start JSON) and to pass around the services.
import IWorkflowProcessOutputModel from "./WorkflowProcessOutputModel";
import {WorkflowStates} from "./enums/WorkflowStates";

export interface IWorkflowProcessModel {
    processId: string;       // process id = generated UID = to keep track of the process
    processName: string;    // name of the process -> to which process it should send the info to -> service name
    processState: WorkflowStates;
    // variables: any;          // variables needed. The value of the key defines the default value in case the constant variable lookup had no values. If it is empty string; assume your own value based of type (number: 0).
    // this variables field will be used differently when sending the message over kafka to the services.
    // output: {}
    workflowId: string;      // Workflow ID -> String because UUID
    next: string[];          // process id of the next process -> send this back to workflow process to keep track to get process params and start next process.
    messageUid: string;       // For reporting the status. -> String because UUID
    userId: string;
    variables: any;
    params: any;
    output?: IWorkflowProcessOutputModel;
}