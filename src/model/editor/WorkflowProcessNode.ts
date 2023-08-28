
export interface IWorkflowProcessNode {
    name: string,
    processType: string,
    processID: string
    position: any
    inputs?: any[],
    outputs?: any[],
    properties?: any[]
}

