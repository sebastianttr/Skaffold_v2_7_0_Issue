
interface WorkflowStartModel{
    id: string,                 // workflow id ... to keep track of the process -> generate a UUID
    UID: string,                // uid from frontend
    messageID: string,          // messageID from frontend
    timestamp: number,
    processes: WorkFlowProcess[]   // list of processes. where we define the next process and the parameters of the process.
    // difference between the array is
    params:{[key: string]: string}    // defines the parameters of the entire process
}

interface WorkFlowProcess{
    id: number,
    processID: string       // process id = generated UID = to keep track of the process
    processName: string,    // name of the process -> to which process it should send the info to -> service name
    next: string[]            // process id of the next process -> send this back to workflow process to keep track to get process params and start next process.
    variables: any       // variables needed. The value of the key defines the default value in case the constant variable lookup had no values. If it is empty string, assume your own value based of type (number: 0).
    // this variables field will be used differently when sending the message over kafka to the services.
    // output: {}
}



export {WorkflowStartModel, WorkFlowProcess}