import {injectable} from "tsyringe";
import {Inject} from "../util/injection";
import {Log} from "../util/logging"
import KafkaMessagingService from "./KafkaMessagingService";
import config from "../config";
import BlobService from "./BlobService";
import {incoming, KafkaIncomingRecord} from "../helper/KafkaIncoming";
import objectSize from "object-sizeof";
import {WorkflowStatus} from "../entity/WorkflowStatus";
import {WorkflowState} from "../entity/WorkflowState";
import {WorkflowProcesses} from "../entity/WorkflowProcess";
import {Exception} from "tsoa";
import {ObjectHelper} from "../helper/ObjectHelper";
import {WorkflowProcessRepository} from "../repository/WorkflowProcessRepository";
import {WorkflowStateRepository} from "../repository/WorkflowStateRepository";
import {IWorkflowStateModel, WorkflowStates} from "../model/WorkflowStateModel";
import {IWorkflowProcessStatusModel} from "../model/WorkflowProcessStatusModel";
import {IWorkflowProcessModel} from "../model/WorkflowProcessModel";
import {IWorkflowStartModel} from "../model/WorkflowStartModel";

const delay = (ms:number) => new Promise(resolve => setTimeout(resolve, ms))

const BYTE_IN_MB = 0.00000095367432;

@injectable()
export default class WorkflowService{

    private static kafkaMessageService: KafkaMessagingService = Inject(KafkaMessagingService)
    private static blobService: BlobService = Inject(BlobService)

    constructor() {
        this.workflowMessages = this.workflowMessages.bind(this)
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

    //@incoming("dev.workflow.service", )        // ugly!!!!
    public workflowMessages = async (message: KafkaIncomingRecord) => {
        //Log.info("Message key: " + message.key)
        //Log.info("Message content: " + message.value)
        //
        // if message key is process -> handle process ... else it is a status message
        if(message.key === "status")
            await this.handleStatusMessage(message)
                .catch((e: Exception) => {
                    Log.error(`Error during handle of status message: [${e.status}] ${e.stack}`)
                })
        else if(message.key === "process")
            await this.handleProcessMessage(message)
                .catch((e: Exception) => {
                    Log.error(`Error during handle of process message: [${e.status}] ${e.stack}`)
                })
    }

    private handleStatusMessageTest = () => {
        Log.info("Status Message Test!")
    }

    /*
    Handle Status Message:
     */
    private async handleStatusMessage(message: KafkaIncomingRecord){
        const workFlowProcessStatusModel: IWorkflowProcessStatusModel = JSON.parse(message.value)


        // check if the params needed for status are not null, undefined or empty string
        if(!ObjectHelper.getKeyListOfFalsyValues(workFlowProcessStatusModel).length){
            // Remove old status messages because we cannot have statuses with the same workflowId, processId an status count -> bad for process time estimation
            await WorkflowService.removeOldStatuses(workFlowProcessStatusModel)

            // Save incoming status into the database
            await WorkflowStatus.save(workFlowProcessStatusModel)

            //Log.info(`Process ID: ${workFlowProcessStatusModel.processId}, Workflow ID: ${workFlowProcessStatusModel.workflowId}`)
            const processFinishTime = await WorkflowService.estimateProcessFinishTime(workFlowProcessStatusModel)

            Log.info(`ETA: ${(processFinishTime / 1000).toFixed(3)} sec`)

            // send some messages back to user ...
            // TODO: SOCKET IO STUFF HERE
        }
        else {
            Log.error("Error in handling the status message: Some properties are empty like " + JSON.stringify(ObjectHelper.getKeyListOfFalsyValues(workFlowProcessStatusModel)))
        }
    }

    private static removeOldStatuses = async (workflowProcessStatusModel: IWorkflowProcessStatusModel) => {
        // Important: Status counter begins with 1
        // remove statuses that have already been in the database when a new process begins.
        // const oldStatuses: WorkflowProcessStatusModel.ts[] = (await WorkflowStatus.find(
        //     {
        //         "message.statusCount":0,
        //         workflowId: workflowProcessStatusModel.workflowId,
        //         processId: workflowProcessStatusModel.processId,
        //         messageUid: workflowProcessStatusModel.messageUid,
        //         userId: workflowProcessStatusModel.userId
        //     })
        // )

        const oldStatuses: IWorkflowProcessStatusModel[] = await WorkflowStatus.findWorkflowById(workflowProcessStatusModel, {"message.statusCount":0,})


        // if there is an old status with status count of 0 and the current incoming status has number 0
        // then remove all the statuses by workflowId and processId
        if(oldStatuses.length >= 1 && workflowProcessStatusModel.message.statusCount == 0){
            // remove all with given workflowId and processId
            await WorkflowStatus.remove(WorkflowStatus.queryFromWorkflowStatus(workflowProcessStatusModel))
        }
    }

    // Uses the status messages to estimate the finish time.
    private static estimateProcessFinishTime = async (workFlowProcessStatusModel: IWorkflowProcessStatusModel): Promise<number> => {

        // get all statuses with workflow id and process id
        // we need a better solution for the query
        const allWorkflowStatuses: IWorkflowProcessStatusModel[] = (await WorkflowStatus.find(
            WorkflowStatus.queryFromWorkflowStatus(workFlowProcessStatusModel))
        ) || []

        // you need at least 2 status messages to be able to calculate the
        if(allWorkflowStatuses.length >= 2){
            const allWorkflowStatusesTimestampSorted: IWorkflowProcessStatusModel[] = allWorkflowStatuses.sort((a, b) => {
                return a.timestamp.valueOf() - b.timestamp.valueOf();
            });

            const startTime: number = allWorkflowStatusesTimestampSorted[0].timestamp.valueOf()
            const lastStatus: IWorkflowProcessStatusModel | undefined = allWorkflowStatusesTimestampSorted.at(-1)

            if(lastStatus){
                const averageTime = (lastStatus.timestamp.valueOf() - startTime) / (allWorkflowStatusesTimestampSorted.length-1)

                // calculate the average time
                const timeCount: number = lastStatus.timestamp.valueOf() - startTime;
                const timeTotal: number = averageTime * lastStatus.message.statusTotal

                //console.log("Remaining Time: " + remainingTime)
                return (timeTotal - timeCount);
            }
            else return -1;
        }
        else {
            //Log.info("There are too few status messages to calculate the estimated time of arrival")
            return -1;
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

    private async handleProcessMessage(message: KafkaIncomingRecord) {

        // record from kafka to usable object
        const workFlowProcess: IWorkflowProcessModel = JSON.parse(message.value)

        // check that the workflow process is valid.

        Log.info("Done with this process: " + workFlowProcess.processId)

        // get the current process and update the state from RUN to DONE
        let currentPersistedProcess: IWorkflowProcessModel | null = await WorkflowProcessRepository.getProcess(workFlowProcess.processId)

        // get the workflow state
        let currentWorkflowState: IWorkflowStateModel | null  = await WorkflowStateRepository.getWorkflowState(workFlowProcess.workflowId)

        // if there is a current workflow process and a current workflow state available
        if(currentPersistedProcess && currentWorkflowState){

            // update the current processes
            currentWorkflowState.currentProcessId = WorkflowStateRepository.removeFromProcessIdList(currentWorkflowState.currentProcessId,workFlowProcess.processId)

            // Update the states and save the output variables
            currentPersistedProcess.processState = workFlowProcess.processState;
            currentPersistedProcess.output = workFlowProcess.output;

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
                    const parallelProcesses: IWorkflowProcessModel[] = await WorkflowProcessRepository.getParallelProcesses(nextProcess)

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
                        const nextProcessModel: IWorkflowProcessModel | null = await WorkflowStateRepository.getNextProcess(nextProcess)

                        if(nextProcessModel){

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
                        // no else. If there is no next process, then it does not need to throw and error or tell something
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
        }
        else {
            if(currentPersistedProcess == null)
                Log.error(`There was an error in \"handleProcessMessages\": The given processID '${workFlowProcess.processId}' does not point to any known processes!`)

            if(currentWorkflowState == null)
                Log.error(`There was an error in \"handleProcessMessages\": The given workflowId '${workFlowProcess.workflowId}' does not point to any known workflows!`)

        }

    }

    // TODO: When there is no next property, start the first process in the list.
    startWorkflow = async (workflowStartModel: IWorkflowStartModel) => {

        const workflowStartProcesses: IWorkflowProcessModel[] = workflowStartModel.processes || []

        // get all the variables -> fetch
        // go over all the variables from the Workflow Start Model
        for(const process of workflowStartProcesses){
            // variables
            let variables = {}

            // Preprocess -> fetch the variables from other places.
            variables = await WorkflowService.preprocessVariables(process)

            // assign variables to the process data
            process.variables = variables;
            // add process to workflow processes array
        }

        Log.info("Preprocess var done")

        if(!workflowStartModel.start.length){
            // TODO: Notify User that there is no starting point.
            return; // return. not worth continuing if there is not starting point
        }

        // compose the messages.
        const workFlowState: IWorkflowStateModel = {
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

        Log.info("findOneAndUpdate done")


        // give all the processes the workflow model.
        // also assign them a state and some IDs.
        let processes: IWorkflowProcessModel[] = workflowStartProcesses.map(item => {
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

        Log.info("persistProcesses done")


        // get the start processes
        const startingProcesses: IWorkflowProcessModel[] = workflowStartProcesses.filter(item => workflowStartModel.start.includes(item.processId))

        //Log.info("Start processes: " + JSON.stringify(startingProcesses))

        // send the message out over kafka to start each process.
        startingProcesses.forEach(process => {
            WorkflowService.sendProcessMessageOverKafka(process)
        })

        Log.info("sendProcessMessageOverKafka done")


        // send some messages back to user ...
        // TODO: SOCKET IO STUFF HERE
        //Log.info("Starting the process")*/
    }

    // restarts the process.
    // process can only be restarted if the process is currently
    restartProcess = async (process: IWorkflowProcessModel): Promise<string> => {

        // get the workflow states and the process from the database
        const workflowStateModel: IWorkflowStateModel | null = await WorkflowStateRepository.getWorkflowState(process.workflowId)
        const processModel: IWorkflowProcessModel | null = await WorkflowProcessRepository.getProcess(process.processId)

        // check if the do exist
        if(workflowStateModel && processModel){
            // check the state, only DONE and EXCEPTION can work
            if (workflowStateModel.currentState == WorkflowStates.DONE || WorkflowStates.EXCEPTION) {
                // get the output from the previous operations
                let parallelProcesses: IWorkflowProcessModel[] = await WorkflowProcessRepository.getParallelProcesses(process.processId)


                // check if there is an output variable from the previous process, if not, do not start and notify
                const processesOutputVariables:any = WorkflowProcessRepository.hasOutputVariables(parallelProcesses)

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
        else {
            if(processModel == null)
                Log.error(`There was an error in \"restartProcess\": The given processID '${process.processId}' does not point to any known processes!`)

            if(workflowStateModel == null)
                Log.error(`There was an error in \"restartProcess\": The given workflowId '${process.workflowId}' does not point to any known workflows!`)

            return "Error! Could not restart the process because either the workflow ID or the process ID is incorrect."
        }
    }


    private static async preprocessVariables(process: IWorkflowProcessModel): Promise<any> {
        let variables:{[key:string]:string} = {};
        // get it in a different format for easier processing
        const processVariablesName: { key: string; value: unknown; }[] = Object.entries(process.variables).map(entry => ({key: entry[0], value: entry[1]}))

        for await (const entry of processVariablesName){

            // get entry value as a variable
            const entryVal:string = entry.value as string;

            if(entryVal.startsWith("http")){         // like this for example: http(service_name, variable_name[optional, else take myVar])
                // create an options variable which will have service name and variable name for the fetching
                const options:{[key:string]:string} = WorkflowService.getVariableOptions(entry)
                variables[entry.key] = await WorkflowService.fetchVariablesOverKafka(options)
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

    private static persistProcesses = async (processes: IWorkflowProcessModel[]) => {
        for await(const process of processes){
            await WorkflowProcesses.updateOne(
                {"processId": {$eq : process.processId},"workflowId": {$eq : process.workflowId}},
                process,
                {upsert: true}
            )
        }
    }

    public static getWorkflowState = async (userId: string): Promise<IWorkflowStateModel[]> => WorkflowState.find({userId: userId}).exec()

    public static getWorkflowProcess = async (userId: string, processId: string): Promise<IWorkflowStateModel | null> => {
        const workflowId: IWorkflowStateModel | null = await WorkflowState.findOne({userId: userId})

        if(workflowId)
            return WorkflowProcesses.findOne({workflowId: workflowId.id, processId: processId});
        else{
            Log.error("Error in \"getWorkflowState\": " + workflowId)
            return null;
        }
    }

    public static getWorkflowProcesses = async (userId: string): Promise<IWorkflowStateModel[] | null> => {
        const workflowId: IWorkflowStateModel | null  = (await WorkflowState.findOne({userId: userId}))

        if(workflowId)
            return WorkflowProcesses.find({workflowId: workflowId.id});
        else{
            Log.error("Error in \"getWorkflowState\": " + workflowId)
            return null;
        }
    }

    private static sendProcessMessageOverKafka = (process: IWorkflowProcessModel) => {
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