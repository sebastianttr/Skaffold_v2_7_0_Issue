import {WorkflowProcessStatusMessage} from "./types/WorkflowProcessStatusMessage";

export interface IWorkflowProcessStatusModel{
    // statusCount: number;              // status counter                                          -> In message property
    // statusTotal: number;              // status total -> how many steps in a process             -> In message property
    message: WorkflowProcessStatusMessage;                    // The status message -> can have a state and a message ...    -> containes
    workflowId: string;               // to which workflow it should belong too
    processId: string;                // Process ID from which process it come from.
    messageUid: string,                 // message Uid -> needed to tell where to send it back
    userId: string,                     // user Id -> to tell from which user it is to get user-specific data.
    timestamp: Date                   // Timestamp ... added by the
}