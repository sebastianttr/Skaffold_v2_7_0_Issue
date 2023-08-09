export type WorkflowProcessStatusMessage = {
    statusCount: number,                // status counter
    statusTotal: number,                // status total -> how many steps in a process
    type: string,                       // type -> DETAIL_TYPE (ADX_CALCULATION, ADX_FINISH, CDX_CALCULATION, CDX_FINISH, etc.)
    processType: string,                // process type -> what kind of process is this supposed to be. PROCESS_TYPE (ADX, CDX, SAVE, etc.)
    status: string                      // current status: INFO, DONE, WARNING, ERROR;
    message: string
}
