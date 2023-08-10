import {injectable, singleton} from "tsyringe";
import {Inject} from "../util/injection";
import {Log} from "../util/logging"
import KafkaMessagingService from "./KafkaMessagingService";
import config from "../config";
import BlobService from "./BlobService";
import {KafkaIncomingRecord} from "../util/kafkaincoming";
import objectSize from "object-sizeof";
import {WorkflowStatus} from "../entity/WorkflowStatus";
import {Exception} from "tsoa";
import {ObjectHelper} from "../entity/ObjectHelper";
import {WorkflowProcessRepository} from "../repository/WorkflowProcessRepository";
import {WorkflowStateRepository} from "../repository/WorkflowStateRepository";
import {IWorkflowStateModel} from "../model/WorkflowStateModel";
import {IWorkflowProcessStatusModel} from "../model/WorkflowProcessStatusModel";
import {IWorkflowProcessModel} from "../model/WorkflowProcessModel";
import {IWorkflowStartModel} from "../model/WorkflowStartModel";
import {IWorkflowUserMessageModel} from "../model/WorkflowUserMessageModel";
import {WorkflowStates} from "../model/enums/WorkflowStates";
import {WorkflowState} from "../entity/WorkflowState";
import {WorkflowStatusRepository} from "../repository/WorkflowStatusRepository";

const delay = (ms:number) => new Promise(resolve => setTimeout(resolve, ms))

const BYTE_IN_MB = 0.00000095367432;

@injectable()
@singleton()
export default class WorkflowService{

    private kafkaMessageService: KafkaMessagingService = Inject(KafkaMessagingService)
    private blobService: BlobService = Inject(BlobService)
    private workflowStateRepository: WorkflowStateRepository = Inject(WorkflowStateRepository)
    private workflowProcessRepository: WorkflowProcessRepository = Inject(WorkflowProcessRepository)
    private workflowStatusRepository: WorkflowStatusRepository = Inject(WorkflowStatusRepository)

    // get the variable over HTTP from a known microservice endpoint
    fetchVariablesOverHTTP(options: any) {
        return new Promise<any>((resolve) => {
            resolve("fetchValue")
        });
    }

    // get the variable over Kafka by waiting to receive something -> all caught in incoming.
    // use a bus system ... you send a request over kafka (simple message), a incoming takes the data and send it back to the function
    fetchVariablesOverKafka(options: any) {
        return new Promise<any>((resolve) => {
            resolve("fetchValue")
        });
    }

    public async workflowMessages(message: KafkaIncomingRecord) {
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

    /*
    Handle Status Message:
     */
    private async handleStatusMessage(message: KafkaIncomingRecord){
        const workflowProcessStatusModel: IWorkflowProcessStatusModel = JSON.parse(message.value)

        // check if the params needed for status are not null, undefined or empty string
        if(!ObjectHelper.getKeyListOfFalsyValues(workflowProcessStatusModel).length){
            // Remove old status messages because we cannot have statuses with the same workflowId, processId an status count -> bad for process time estimation
            await this.workflowStatusRepository.removeOldStatuses(workflowProcessStatusModel)

            // Save incoming status into the database
            await this.workflowStatusRepository.save(workflowProcessStatusModel)

            //Log.info(`Process ID: ${workflowProcessStatusModel.processId}, Workflow ID: ${workflowProcessStatusModel.workflowId}`)
            const processFinishTime = await this.estimateProcessFinishTime(workflowProcessStatusModel)

            Log.info(`ETA: ${(processFinishTime / 1000).toFixed(3)} sec`)

            // send some messages back to user ...
            this.notifyUser({
                messageUid: workflowProcessStatusModel.messageUid,
                userId: workflowProcessStatusModel.userId,
                data: {
                    message: workflowProcessStatusModel.message.message,
                    processStatus: workflowProcessStatusModel.message.status,
                },
                total: workflowProcessStatusModel.message.statusTotal,
                counter: workflowProcessStatusModel.message.statusCount,
                time: new Date(workflowProcessStatusModel.timestamp).getTime(),
                title:
                    "New Workflow Status from Process" + (await this.workflowProcessRepository.getWorkflowProcess(workflowProcessStatusModel.userId,workflowProcessStatusModel.processId))?.processName,
            })
        }
        else {
            Log.error("Error in handling the status message: Some properties are empty like " + JSON.stringify(ObjectHelper.getKeyListOfFalsyValues(workflowProcessStatusModel)))
        }
    }


    // Uses the status messages to estimate the finish time.
    private async estimateProcessFinishTime(workFlowProcessStatusModel: IWorkflowProcessStatusModel): Promise<number> {

        // get all statuses with workflow id and process id
        // we need a better solution for the query
        const allWorkflowStatuses: IWorkflowProcessStatusModel[] = (await WorkflowStatus.find(
            WorkflowStatusRepository.queryFromWorkflowStatus(workFlowProcessStatusModel))
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
        let currentPersistedProcess: IWorkflowProcessModel | null = await this.workflowProcessRepository.getProcess(workFlowProcess.processId)

        // get the workflow state
        let currentWorkflowState: IWorkflowStateModel | null  = await this.workflowStateRepository.getWorkflowStateByWorkflowId(workFlowProcess.workflowId)

        // if there is a current workflow process and a current workflow state available
        if(currentPersistedProcess && currentWorkflowState){

            // update the current processes
            currentWorkflowState.currentProcessId = this.workflowStateRepository.removeFromProcessIdList(currentWorkflowState.currentProcessId,workFlowProcess.processId)

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
                    const parallelProcesses: IWorkflowProcessModel[] = await this.workflowProcessRepository.getParallelProcesses(nextProcess)

                    // check if the previous processes are done.
                    const isPreviousProcessesDone: Boolean = parallelProcesses.filter(item => item.processState == WorkflowStates.DONE).length == currentPersistedProcess.next.length

                    // also check if there is a restart in the parameters
                    const isRestart: Boolean = workFlowProcess.params.restart == "true"

                    // a small delay so it is not too fast
                    // await delay(500);


                    // if all the processes are done and there is something after those processes
                    if(isPreviousProcessesDone && !isRestart){
                        Log.info("Previous processes are done & there is a next")

                        // push the next processes into the WorkflowState
                        currentWorkflowState.currentProcessId.push(nextProcess)

                        // get the next processes as a model (not process id) from the database.
                        const nextProcessModel: IWorkflowProcessModel | null = await WorkflowStateRepository.getNextProcess(nextProcess)

                        if(nextProcessModel){

                            // preprocess the variables -> to take into account that variables can come from other places too
                            nextProcessModel.variables = await this.preprocessVariables(nextProcessModel)

                            // attach the output from the previous processes to the nextProcessModel
                            // iterate over all, use spread operator to add given variables and process output variables.
                            parallelProcesses.forEach(proc => {
                                nextProcessModel.variables = {
                                    ...nextProcessModel.variables,
                                    ...proc.variables
                                }
                            })

                            // send it signal to start the process
                            this.sendProcessMessageOverKafka(nextProcessModel)
                        }
                        // no else. If there is no next process, then it does not need to throw and error or tell something
                    }
                    else {
                        // set the status of the workflow to done.
                        currentWorkflowState.currentProcessId = currentWorkflowState.currentProcessId.filter(value => value == workFlowProcess.processId)

                        this.notifyUser({
                            messageUid: currentWorkflowState.messageUid,
                            userId: currentWorkflowState.userId,
                            data: {
                                message: `Done with the process called ${workFlowProcess.processName} [${workFlowProcess.processId}]. Starting the next process if available.`,
                                workflowStatus: currentWorkflowState.currentState,
                            },
                            time: currentWorkflowState.timestamp,
                            title: "Process finished."
                        })
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
            await this.workflowProcessRepository.persistProcesses([...nextProcesses, currentPersistedProcess])
        }
        else {
            if(currentPersistedProcess == null)
                Log.error(`There was an error in \"handleProcessMessages\": The given processID '${workFlowProcess.processId}' does not point to any known processes!`)

            if(currentWorkflowState == null)
                Log.error(`There was an error in \"handleProcessMessages\": The given workflowId '${workFlowProcess.workflowId}' does not point to any known workflows!`)
        }

    }

    public async startWorkflow(workflowStartModel: IWorkflowStartModel) {
        const workflowStartProcesses: IWorkflowProcessModel[] = workflowStartModel.processes || []

        // get all the variables -> fetch
        // go over all the variables from the Workflow Start Model
        for(const process of workflowStartProcesses){
            // variables
            let variables = {}

            // Preprocess -> fetch the variables from other places.
            variables = await this.preprocessVariables(process)

            // assign variables to the process data
            process.variables = variables;
            // add process to workflow processes array
        }

        if(!workflowStartModel.start.length){
            this.notifyUser({
                messageUid: workflowStartModel.messageUid,
                userId: workflowStartModel.userId,
                data: {
                    message: `There is no starting point for the processes. Place a process into the editor to get started.`,
                    workflowStatus: WorkflowStates.EXCEPTION    // Exception because there is no starting
                },
                time: workflowStartModel.timestamp,
                title: "Error: No starting process found!"
            })

            return; // return. not worth continuing if there is not starting point
        }

        // compose the messages.
        const workFlowState: IWorkflowStateModel = {
            id:workflowStartModel.id,                                           // ID
            messageUid: workflowStartModel.messageUid,                          // MessageID
            userId: workflowStartModel.userId,                                  // UID
            timestamp: Date.now(),                                              // Record the current timestamp
            currentProcessId: workflowStartModel.start,                         // first process start
            currentState: WorkflowStates.RUN,                                   // start with a running state
            start: workflowStartModel.start,                                    // set the starting processes
            params: workflowStartModel.params                                   // params from workflowStartModel
        }

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
        await this.workflowProcessRepository.persistProcesses(processes)
        // once in the blob storage and DB, send all the necessary information over kafka to service

        // get the start processes
        const startingProcesses: IWorkflowProcessModel[] = workflowStartProcesses.filter(item => workflowStartModel.start.includes(item.processId))

        //Log.info("Start processes: " + JSON.stringify(startingProcesses))

        // send the message out over kafka to start each process.
        startingProcesses.forEach(process => {
            this.sendProcessMessageOverKafka(process)
        })

        // send some messages back to user ...
        this.notifyUser({
            messageUid: workflowStartModel.messageUid,
            userId: workflowStartModel.userId,
            data: {
                message: "The workflow has been started. You can track the processes and the data by clicking on the process.",
                workflowStatus: WorkflowStates.RUN    // Exception because there is no starting
            },
            time: workflowStartModel.timestamp,
            title: "Starting workflow..."
        })
    }

    // restarts the process.
    // process can only be restarted if the process is currently
    async restartProcess(process: IWorkflowProcessModel): Promise<string> {

        // get the workflow states and the process from the database
        const workflowStateModel: IWorkflowStateModel | null = await this.workflowStateRepository.getWorkflowStateByWorkflowId(process.workflowId)
        const processModel: IWorkflowProcessModel | null = await this.workflowProcessRepository.getProcess(process.processId)

        // check if the do exist
        if(workflowStateModel && processModel){
            // check the state, only DONE and EXCEPTION can work
            if (workflowStateModel.currentState == WorkflowStates.DONE || WorkflowStates.EXCEPTION) {
                // get the output from the previous operations
                let parallelProcesses: IWorkflowProcessModel[] = await this.workflowProcessRepository.getParallelProcesses(process.processId)


                // check if there is an output variable from the previous process, if not, do not start and notify
                const processesOutputVariables:any = this.workflowProcessRepository.hasOutputVariables(parallelProcesses)

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
                    this.sendProcessMessageOverKafka(processModel)

                    // reset params
                    processModel.params = undefined
                    // when you persist, persist with the next processes too
                    await this.workflowProcessRepository.persistProcesses([processModel])

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


    private async preprocessVariables(process: IWorkflowProcessModel): Promise<any> {
        let variables:{[key:string]:string} = {};
        // get it in a different format for easier processing
        const processVariablesName: { key: string; value: unknown; }[] = Object.entries(process.variables).map(entry => ({key: entry[0], value: entry[1]}))

        for await (const entry of processVariablesName){

            // get entry value as a variable
            const entryVal:string = entry.value as string;

            if(entryVal.startsWith("http")){         // like this for example: http(service_name, variable_name[optional, else take myVar])
                // create an options variable which will have service name and variable name for the fetching
                const options:{[key:string]:string} = this.getVariableOptions(entry)
                variables[entry.key] = await this.fetchVariablesOverKafka(options)
            }
            else if (entryVal.startsWith("kafka")){  // kafka(service_name, variable_name[optional, else take myVar])
                // create an options variable which will have service name and variable name for the fetching
                const options = this.getVariableOptions(entry)
                variables[entry.key] = await this.fetchVariablesOverHTTP(options)
            }
            else {
                // else it stays the same
                variables[entry.key] = entry.value as string
            }
        }

        return variables;
    }

    private getVariableOptions(entry:any): {[key: string]: string} {
        const params: string[] = entry.value.replace(/[()]/gm,"").split(",")
        const serviceName: string = params[0];
        const variableName: string = params[1] ?? entry.key;

        return {serviceName: serviceName, variableName: variableName}
    }

    private notifyUser(workflowUserMessage: IWorkflowUserMessageModel) {
        //Log.info(JSON.stringify(workflowUserMessage))

        // this.kafkaMessageService.send(
        //     JSON.stringify(process),
        //     config.processMapping["User"].topic,
        //     "",
        //     0,
        //     {})
        //     .then(() => {
        //         //Log.info("Sent kafka message")
        //     })
        //     .catch(e => {
        //         Log.error(e.stack)
        //     })
    }

    private sendProcessMessageOverKafka(process: IWorkflowProcessModel) {
        // check if the process model is bigger than Kafka Transmit limit - 100 KB for good measure -> only check variables.
        if(objectSize(process.variables) * BYTE_IN_MB >= 0.9){
            Log.info("Warning! The variables contained is too big for Kafka to transmit. (Over 1 MB of Message size.)")

            // upload the blob storage
            const blobName = `var_${process.workflowId}_${process.processId}`;
            this.blobService.storeBlob(blobName, JSON.stringify(process.variables))
                .catch(e => {
                    Log.error(e.stack)
                });

            // delete everything in the variable property.
            process.variables = {"blob":blobName};
        }


        this.kafkaMessageService.send(
            JSON.stringify(process),
            config.processMapping[process.processName].topic,
            "",
            0,
            {})
            .then(() => {
                //Log.info("Sent kafka message")
            })
            .catch(e => {
                Log.error(e.stack)
            })
    }
}