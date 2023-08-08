import {injectable} from "tsyringe";
import {Inject, Log} from "../common";
import KafkaMessagingService from "./KafkaMessagingService";
import {WorkFlowProcessModel, WorkflowProcessStatusModel, WorkflowStartModel} from "../model/WorkflowStartModel";
import config from "../config";
import BlobService from "./BlobService";
import {WorkflowStateModel, WorkflowStates} from "../model/WorkflowStateModel";
import {incoming, KafkaIncomingRecord} from "../helper/KafkaIncoming";
import objectSize from "object-sizeof";
import {WorkflowStatus} from "../entity/WorkflowStatus";
import {WorkflowState} from "../entity/WorkflowState";
import {WorkflowProcesses} from "../entity/WorkflowProcess";
import {start} from "repl";

const delay = (ms:number) => new Promise(resolve => setTimeout(resolve, ms))

const BYTE_IN_MB = 0.00000095367432;

@injectable()
export default class WorkflowService{

    private static kafkaMessageService: KafkaMessagingService = Inject(KafkaMessagingService)
    private static blobService: BlobService = Inject(BlobService)

    constructor() {

    }


    // get the variable over HTTP from a known microservice endpoint
    static fetchVariablesOverHTTP = (options: any) => new Promise<any>((resolve) => {
        resolve("fetchValue")
    });

    // get the variable over Kafka by waiting to receive something -> all caught in incoming.
    // use a bus system ... you send a request over kafka (simple message), a incoming takes the data and send it back to the function
    static fetchVariablesOverKafka = (options: any) => new Promise<any>((resolve) => {
        resolve("fetchValue")
    });


    @incoming("dev.workflow.service")
    private async workflowMessages(message: KafkaIncomingRecord) {
        //Log.info("Message key: " + message.key)
        //Log.info("Message content: " + message.value)

        // if message key is process -> handle process ... else it is a status message
        if(message.key === "status")        await WorkflowService.handleStatusMessage(message)
        else if(message.key === "process")  await WorkflowService.handleProcessMessage(message)
    }


    /*

    Handle Status Message:

    // Convert the Record data to an object (WorkflowProcessStatusModel) - Done
    // Add a timestamp to the status model - DONE
    // Report back to the user (SocketIO) - DONE
    // Persist to database.
     */

    private static async handleStatusMessage(message: KafkaIncomingRecord){
        const workFlowProcessStatusModel: WorkflowProcessStatusModel = JSON.parse(message.value)

        // Log the status
        // Log.info(`(${workFlowProcessStatusModel.processID} [${workFlowProcessStatusModel.message["status"]}]) ${workFlowProcessStatusModel.message["message"]}`)

        // set timestamp - so we can clear it out after some time
        //workFlowProcessStatusModel.timestamp = new Date(Date.now())

        // Remove old status messages because we cannot have statuses with the same worklflowId, processId an status count -> bad for process time estimation
        await WorkflowService.removeOldStatuses(workFlowProcessStatusModel)

        // Insert incoming status into the database
        await WorkflowStatus.insertMany([workFlowProcessStatusModel])

        //Log.info(`Process ID: ${workFlowProcessStatusModel.processId}, Workflow ID: ${workFlowProcessStatusModel.workflowId}`)
        const processFinishTime = await WorkflowService.estimateProcessFinishTime(workFlowProcessStatusModel)

        Log.info(`ETA: ${(processFinishTime / 1000).toFixed(3)} sec`)

        // send some messages back to user ...
        // TODO: SOCKET IO STUFF HERE

    }

    private static removeOldStatuses = async (workflowProcessStatusModel: WorkflowProcessStatusModel) => {
        // Important: Status counter begins with 1
        // remove statuses that have already been in the database when a new process begins.
        const oldStatuses: WorkflowProcessStatusModel[] = (await WorkflowStatus.find(
            {"message.statusCount":0, workflowId: workflowProcessStatusModel.workflowId, processId: workflowProcessStatusModel.processId, messageUid: workflowProcessStatusModel.messageUid}))!

        // if there is an old status with status count of 1 and the current incoming status has number 1
        // then remove all the statuses by workflowId and processId
        if(oldStatuses.length >= 1 && workflowProcessStatusModel.message.statusCount == 0){
            // remove all with given workflowId and processId
            await WorkflowStatus.remove({workflowId: workflowProcessStatusModel.workflowId, processId: workflowProcessStatusModel.processId})
        }
    }

    private static estimateProcessFinishTime = async (workFlowProcessStatusModel: WorkflowProcessStatusModel): Promise<number> => {
        // get all statuses with workflow id and process id
        const allWorkflowStatuses: WorkflowProcessStatusModel[] = (await WorkflowStatus.find(
            {workflowId: workFlowProcessStatusModel.workflowId,processId:  workFlowProcessStatusModel.processId, messageUid: workFlowProcessStatusModel.messageUid}))!

        // you need at least 2 status messages to be able to calculate the
        if(allWorkflowStatuses.length >= 2){
            const allWorkflowStatusesTimestampSorted: WorkflowProcessStatusModel[] = allWorkflowStatuses.sort((a, b) => {
                return a.timestamp.valueOf() - b.timestamp.valueOf();
            });

            const startTime: number = allWorkflowStatusesTimestampSorted[0].timestamp.valueOf()

            // calculate the average time
            const averageTime = (allWorkflowStatusesTimestampSorted.at(-1)?.timestamp.valueOf()! - startTime) / (allWorkflowStatusesTimestampSorted.length-1)
            const timeCount: number = allWorkflowStatusesTimestampSorted.at(-1)?.timestamp.valueOf()! - startTime;
            const timeTotal: number = averageTime * (allWorkflowStatusesTimestampSorted.at(-1)?.message.statusTotal!)
            const remainingTime = (timeTotal - timeCount);

            //console.log("Remaining Time: " + remainingTime)
            return remainingTime;
        }
        else {
            //console.log("There is no average to be calculated.")
            return NaN;
        }

        // estimate how much longer it will take.
    }


    /*

     Workflow for incoming once a process has finished:

   - Message comes in.
   - Get the current workflow state from the process.
   - Update the current workflow and remove the incoming process with reduce.
   - Get the current process from the database and update the state to DONE.
   - Save the variables from the incoming workflow process.
   - Check to see if it should proceed to the next process by getting other processes.
   _ If all processes have the DONE state
        -> move to the next processes
        -> then send a message
   - If the processes are not all done, only update the workflow state and the process state.
   - Before finishing, update the database state.

   */

    private static async handleProcessMessage(message: KafkaIncomingRecord) {
        // record from kafka to usable object
        const workFlowProcess: WorkFlowProcessModel = JSON.parse(message.value)

        Log.info("Done with this process: " + workFlowProcess.processId)

        // get the current process and update the state from RUN to DONE
        let currentPersistedProcess: WorkFlowProcessModel = (await WorkFlowProcessModel.getProcess(workFlowProcess.processId))!

        // get the workflow state
        let currentWorkflowState: WorkflowStateModel = (await WorkflowStateModel.getWorkflowState(workFlowProcess.workflowId))!

        // update the current processes
        currentWorkflowState.currentProcessId = WorkflowStateModel.removeFromCurrentProcessID(currentWorkflowState.currentProcessId,workFlowProcess.processId)

        // Update the states and save the output variables
        currentPersistedProcess.processState = workFlowProcess.processState;
        currentPersistedProcess.output = workFlowProcess.output

        // Now we start each process individually ... by iterating over the next fields
        // before you can continue with the next process, check to see if the previous process is really done.
        // get previous process
        // check state - if all done, move on.
        //Log.info("Querying ... ")
        //const doneProcessCounter = 0;

        // check if there is a next process to start for this one.
        let nextProcesses: any[] = [];

        if(currentPersistedProcess.next.length) {
            // Has a next
            for(const nextProcess of currentPersistedProcess.next){
                // get the parallel processes of the next processs
                const parallelProcesses: WorkFlowProcessModel[] = await WorkFlowProcessModel.getParallelProcesses(nextProcess)

                // check if the previous processes are done.
                const isPreviousProcessesDone: Boolean = parallelProcesses.filter(item => item.processState == WorkflowStates.DONE).length == currentPersistedProcess.next.length

                // also check if there is a restart in the parameters
                const isRestart: Boolean = workFlowProcess.params.restart == "true"

                // a small delay so it is not too fast
                // TODO: In Production or Staging, remove delay.
                await delay(500);


                // if all the processes are done and there is something after those processes
                if(isPreviousProcessesDone && !isRestart){
                    Log.info("Previous processes are done & there is a next")

                    // push the next processes into the WorkflowState
                    currentWorkflowState.currentProcessId.push(nextProcess)

                    // get the next processes as a model (not process id) from the database.
                    const nextProcessModel: WorkFlowProcessModel = (await WorkflowStateModel.getNextProcess(nextProcess))!

                    // preprocess the variables -> to take into account that variables can come from other places too
                    nextProcessModel.variables = await WorkflowService.preprocessVariables(nextProcessModel)

                    // attach the output from the previous processes to the nextProcessModel
                    // iterate over all, use spread operator to add given variables and process output variables.
                    parallelProcesses.forEach(proc => {
                        nextProcessModel.variables = {
                            ...nextProcessModel.variables,
                            ...proc.variables
                        }
                    })

                    // send it signal to start the process
                    WorkflowService.sendProcessMessageOverKafka(nextProcessModel)
                }
                else {
                    // set the status of the workflow to done.
                    currentWorkflowState.currentProcessId = currentWorkflowState.currentProcessId.filter(value => value == workFlowProcess.processId)

                    // send some messages back to user ...
                    // TODO: SOCKET IO STUFF HERE
                }
            }
        } else {
            Log.info("This stream is done! ")

            // workflow states is done when all processes have done state.
            if(!currentWorkflowState.currentProcessId.length){
                Log.info("The workflow is completely done. ")
                currentWorkflowState.currentState = WorkflowStates.DONE;
            }
        }

        //Log.info("Final workflow state: " + JSON.stringify(updatedWorkflowState))

        // update the Workflow State
        await WorkflowState.updateOne({id: currentWorkflowState.id}, currentWorkflowState)

        // update the Workflow Processes
        await WorkflowService.persistProcesses([...nextProcesses, currentPersistedProcess])

        //Log.info("Finished processing kafka message!")
    }

    // TODO: When there is no next property, start the first process in the list.
    startWorkflow = async (workflowStartModel: WorkflowStartModel) => {

        // get all the variables -> fetch
        // go over all the variables from the Workflow Start Model
        for(const process of workflowStartModel.processes!){
            // variables
            let variables = {}

            // Preprocess -> fetch the variables from other places.
            variables = await WorkflowService.preprocessVariables(process)

            // assign variables to the process data
            process.variables = variables;
            // add process to workflow processes array
        }

        if(!workflowStartModel.start.length){
            // TODO: Notify User that there is no starting point.
            return; // return. not worth continuing if there is not starting point
        }

        // compose the messages.
        const workFlowState: WorkflowStateModel = {
            id:workflowStartModel.id,                                           // ID
            messageUid: workflowStartModel.messageUid,                            // MessageID
            userId: workflowStartModel.userId,                                        // UID
            timestamp: Date.now(),                                              // Record the current timestamp
            currentProcessId: workflowStartModel.start,                         // first process start
            currentState: WorkflowStates.RUN,                                   // start with a running state
            start: workflowStartModel.start,                                    // set the starting processes
            params: workflowStartModel.params                                   // params from workflowStartModel
        }

        //Log.info("Workflow State: " + JSON.stringify(workFlowState))

        // save the state to the database
        await WorkflowState.findOneAndUpdate(
            {},
            workFlowState,
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        )

        // give all the processes the workflow model.
        // also assign them a state and some IDs.
        let processes: WorkFlowProcessModel[] = workflowStartModel.processes!.map(item => {
            item.workflowId = workflowStartModel.id
            item.messageUid = workflowStartModel.messageUid;
            item.userId = workflowStartModel.userId;

            // check if the current item process id is part of start model start property -> assign correct state
            item.processState = (workflowStartModel.start.includes(item.processId)) ? WorkflowStates.RUN:WorkflowStates.IDLE;
            item.output = {variables:{}}
            return item;
        })

        // save the processes in a separate database. don't forget to update the state.
        await WorkflowService.persistProcesses(processes)
        // once in the blob storage and DB, send all the necessary information over kafka to service

        // get the start processes
        const startingProcesses: WorkFlowProcessModel[] = workflowStartModel.processes!.filter(item => workflowStartModel.start.includes(item.processId))

        //Log.info("Start processes: " + JSON.stringify(startingProcesses))

        // send the message out over kafka to start each process.
        startingProcesses.forEach(process => {
            WorkflowService.sendProcessMessageOverKafka(process)
        })

        // send some messages back to user ...
        // TODO: SOCKET IO STUFF HERE
        //Log.info("Starting the process")*/
    }

    // restarts the process.
    // process can only be restarted if the process is currently
    restartProcess = async (process: WorkFlowProcessModel): Promise<string> => {
        // get the workflow states and the process from the database
        const workflowStateModel: WorkflowStateModel = (await WorkflowStateModel.getWorkflowState(process.workflowId))!
        const processModel: WorkFlowProcessModel = (await WorkFlowProcessModel.getProcess(process.processId))!

        // check if the do exist
        if(workflowStateModel != null && processModel != null){
            // check the state, only DONE and EXCEPTION can work
            if (workflowStateModel.currentState == WorkflowStates.DONE || WorkflowStates.EXCEPTION) {
                // get the output from the previous operations
                let parallelProcesses: WorkFlowProcessModel[] = await WorkFlowProcessModel.getParallelProcesses(process.processId)


                // check if there is an output variable from the previous process, if not, do not start and notify
                const processesOutputVariables:any = WorkFlowProcessModel.hasOutputVariables(parallelProcesses)

                // check if the processes have output variables on all parallel processes
                if(processesOutputVariables.hasOutputVariables){
                    parallelProcesses.forEach(proc => {
                        processModel.variables = {
                            ...processModel.variables,
                            ...proc.variables
                        }
                    })

                    // set the state to run and the params as restart
                    processModel.processState = WorkflowStates.RUN
                    processModel.params = JSON.stringify({"restart":"true"})

                    // start the service by sending a message and save the processModel to database
                    WorkflowService.sendProcessMessageOverKafka(processModel)

                    // reset params
                    processModel.params = undefined
                    // when you persist, persist with the next processes too
                    await WorkflowService.persistProcesses([processModel])

                    return "Process restarting...";
                }
                else {
                    // if the restarting process does not have output variables from the previous processes
                    let returnText = "Cannot start the process because we are missing the output for the other processes: "

                    processesOutputVariables.missingVariableProcess.forEach((item: string, index: number) => {
                        returnText += item

                        if(index != processesOutputVariables.missingVariableProcess.length - 1){
                            returnText += " , "
                        }
                    })

                    return returnText
                }
            }
            else {
                return "Cannot stop process because it is in Running or missing data needed for the process operation!"
            }

        }
        return "Process does not exist"
    }

    private static async preprocessVariables(process: WorkFlowProcessModel): Promise<any> {
        let variables:{[key:string]:string} = {};
        // get it in a different format for easier processing
        const processVariablesName: { key: string; value: unknown; }[] = Object.entries(process.variables).map(entry => ({key: entry[0], value: entry[1]}))

        for await (const entry of processVariablesName){

            // get entry value as a variable
            const entryVal:string = entry.value as string;

            if(entryVal.startsWith("http")){         // like this for example: http(service_name, variable_name[optional, else take myVar])
                // create an options variable which will have service name and variable name for the fetching
                const options:{[key:string]:string} = WorkflowService.getVariableOptions(entry)
                variables[entry.key] = (await WorkflowService.fetchVariablesOverKafka(options))!
            }
            else if (entryVal.startsWith("kafka")){  // kafka(service_name, variable_name[optional, else take myVar])
                // create an options variable which will have service name and variable name for the fetching
                const options = WorkflowService.getVariableOptions(entry)
                variables[entry.key] = await WorkflowService.fetchVariablesOverHTTP(options)
            }
            else {
                // else it stays the same
                variables[entry.key] = entry.value as string
            }
        }

        return variables;
    }


    private static getVariableOptions(entry:any): {[key: string]: string} {
        const params: string[] = entry.value.replace(/[()]/gm,"").split(",")
        const serviceName: string = params[0];
        const variableName: string = params[1] ?? entry.key;

        return {serviceName: serviceName, variableName: variableName}
    }


    /* ---------------- Database operations ----------------  */

    private static persistProcesses = async (processes: WorkFlowProcessModel[]) => {
        for await(const process of processes){
            await WorkflowProcesses.updateOne(
                {"processId": {$eq : process.processId},"workflowId": {$eq : process.workflowId}},
                process,
                {upsert: true}
            )
        }
    }

    public static getWorkflowState = async (userId: string): Promise<WorkflowStateModel[]> => WorkflowState.find({userId: userId}).exec()

    public static getWorkflowProcess = async (userId: string, processId: string): Promise<WorkflowStateModel | null> => {
        const workflowId: WorkflowStateModel = (await WorkflowState.findOne({userId: userId}))!.id
        return WorkflowProcesses.findOne({workflowId: workflowId, processId: processId});
    }

    public static getWorkflowProcesses = async (userId: string): Promise<WorkflowStateModel | null> => {
        const workflowId: WorkflowStateModel = (await WorkflowState.findOne({userId: userId}))!.id
        return WorkflowProcesses.findOne({workflowId: workflowId});
    }

    private static sendProcessMessageOverKafka = (process: WorkFlowProcessModel) => {
        // check if the process model is bigger than Kafka Transmit limit - 100 KB for good measure -> only check variables.
        if(objectSize(process.variables) * BYTE_IN_MB >= 0.9){
            Log.info("Warning! The variables contained is too big for Kafka to transmit. (Over 1 MB of Message size.)")

            // upload the blob storage
            const blobName = `var_${process.workflowId}_${process.processId}`;
            WorkflowService.blobService.storeBlob(blobName, JSON.stringify(process.variables));

            // delete everything in the variable property.
            process.variables = {"blob":blobName};
        }


        WorkflowService.kafkaMessageService.send(
            JSON.stringify(process),
            config.processMapping[process.processName].topic,
            "",
            0,
            {})
            .then(r => {
                //Log.info("Sent kafka message")
            })
            .catch(e => {
                Log.error(e.stack)
            })
    }
}