import {injectable} from "tsyringe";
import {Inject, Log} from "../common";
import KafkaMessagingService from "./KafkaMessagingService";
import {WorkFlowProcessModel, WorkflowStartModel} from "../model/WorkflowStartModel";
import {VariableRequestProtocol, VariablesRequestModel} from "../model/VariablesRequestModel";
import config from "../config";
import BlobService from "./BlobService";
import {model, Schema,} from "mongoose";
import {WorkflowStateModel, WorkflowStates} from "../model/WorkflowStateModel";
import {incoming, KafkaIncomingRecord} from "../helper/KafkaIncoming";

const workflowStartUserSchema = new Schema<WorkflowStateModel>({
    id: String,                         // workflow id ... to keep track of the process -> generate a UUID
    currentState: String,               // uid from frontend
    currentProcessId: [String],         // messageID from frontend
    timestamp: Number,                  // timestamp
    processes: [],                      // list of processes. where we define the next process and the parameters of the process.
    params: Object                      // Params - can specify how the workflow is treated.
});

const workflowProcessSchema = new Schema<WorkFlowProcessModel>({
    processID: String,                  // Process ID as string -> Identifier
    processName: String,                // Process name as string
    processState: Number,       // Workflow States
    next: [],                           // List of next processes. Parallel streams works because array.
    variables: String,                  // Variables. Either a map as string, or the name of the blob.
    workflowID: String                  // Workflow id
});

const WorkflowState = model<WorkflowStateModel>("workflow_states",workflowStartUserSchema);
const WorkflowProcesses = model<WorkFlowProcessModel>("workflow_processes",workflowProcessSchema);
const WorkflowVariables = [];   // this will be a model later.

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

@injectable()
export default class WorkflowService{

    private static kafkaMessageService: KafkaMessagingService = Inject(KafkaMessagingService)
    private blobService: BlobService = Inject(BlobService)

    constructor() { }

    fetchVariablesOverHTTP = (options: any) => new Promise<any>((resolve) => {
        resolve("fetchValue")
    });

    fetchVariablesOverKafka = (options: any) => new Promise<any>((resolve) => {
        resolve("fetchValue")
    });

    @incoming("dev.workflow.service")
    private async workflowNotifications(message: KafkaIncomingRecord) {
        const workFlowProcess: WorkFlowProcessModel = JSON.parse(message.value)

        Log.info("Done with processID " + workFlowProcess.processID)

        // state of workflow from the DB.
        const updatedWorkflowState: WorkflowStateModel = await WorkflowState.findOne(
            {id: workFlowProcess.workflowID}
        )

        // current process from the DB
        const currentUpdateProcess : WorkFlowProcessModel = await WorkflowProcesses.findOne(
            {processID: workFlowProcess.processID}
        )

        Log.info("Current workflow state from DB: " + JSON.stringify(updatedWorkflowState))

        // update the state.
        if(workFlowProcess.next.length){
            // get the current workflow process

            // update the current processes
            updatedWorkflowState.currentProcessId.reduce((acc,value) => {
                // if current value is the process, take it out and replace it with the next processes
                if(value == workFlowProcess.processID){
                    acc.push(...(workFlowProcess.next))
                    return acc;
                }

                // else push the normal values
                acc.push(value)
                return acc;
            },[])

            WorkflowProcesses.updateOne({id: workFlowProcess.processID}, updatedWorkflowState)

            // get the next process.
            const nextProcesses = updatedWorkflowState.processes.filter((process: WorkFlowProcessModel) => process.processID != workFlowProcess.processID)

            Log.info("Next processes: " + JSON.stringify(nextProcesses))

            // send some messages back to user ...
            // SOCKET IO STUFF HERE
            await delay(2000)

            // send that process to the next workflow element

            for(const nextProcess of nextProcesses){
                WorkflowService.sendProcessMessageOverKafka(nextProcess)
            }
        }
        else {
            // we are done.
            Log.info("Workflow done")

            // set the status of the workflow to done.
            updatedWorkflowState.currentProcessId.filter(value => value == workFlowProcess.processID)
            updatedWorkflowState.currentState = WorkflowStates.DONE;
            WorkflowProcesses.updateOne({id: workFlowProcess.processID}, updatedWorkflowState)


            // send some messages back to user ...
            // SOCKET IO STUFF HERE

        }

    }

    startProcess = async (workflowStartModel: WorkflowStartModel) => {
        // define states
        let workflowProcesses:WorkFlowProcessModel[] = [];

        // get all the variables
        // go over all the variables from the Workflow Start Model
        for(const process of workflowStartModel.processes){
            let variables = {}

            // map it right
            const processVariables: any[] = Object.entries(process.variables).map(entry => ({key: entry[0], value: entry[1]}))

            // iterate over all the variables
            for(const entry of processVariables){
                // get config based on the know fetch-able variables -> config.dev.json
                const configData: VariablesRequestModel = config.variables[entry.key]

                // if there is config data -> fetch
                if(configData){
                    if(configData.protocol == VariableRequestProtocol.HTTP)
                        variables[entry.key] = await this.fetchVariablesOverHTTP(configData.options)
                    else if(configData.protocol == VariableRequestProtocol.KAFKA)
                        variables[entry.key] = await this.fetchVariablesOverKafka(configData.options)
                }
                else variables[entry.key] = entry.value

            }

            // once the variables are in, send to blob storage
            // send the variables for each process individually ... so we don't send a big one that is useless for the processes
            const blobName = `var_${workflowStartModel.id}_${process.processID}`;
            await this.blobService.storeBlob(blobName, JSON.stringify(variables))

            // change the workflow processes variable to only have the blob name
            process.variables = blobName;

            // add process to workflow processes array
            workflowProcesses.push(process)
        }

        // compose the messages.
        const workFlowState: WorkflowStateModel = {
            id:workflowStartModel.id,                                           // ID
            messageID: workflowStartModel.messageID,                            // MessageID
            UID: workflowStartModel.UID,                                        // UID
            timestamp: Date.now(),                                              // Record the current timestamp
            currentProcessId: [workflowStartModel.processes[0].processID],        // first process start
            currentState: WorkflowStates.RUN,                                   // start with a running state
            processes: workflowProcesses,                                       // processes -> variables are removed, only blob name instead
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
        // also assign them a state.
        const processes: WorkFlowProcessModel[] = workflowStartModel.processes.map(item => {
            item.workflowID = workflowStartModel.id
            item.processState = WorkflowStates.IDLE
            return item;
        })

        // set the first process state to run.
        processes[0].processState = WorkflowStates.RUN;

        // save the processes in a separate database. don't forget to update the state.
        for await(const process of processes){
            await WorkflowProcesses.updateOne(
                {"processID": {$eq : process.processID}},
                process,
                {upsert: true}
            )
        }

        // once in the blob storage and DB, send all the necessary information over kafka to service
        WorkflowService.sendProcessMessageOverKafka(processes[0])
        //Log.info("Starting the process")*/
    }

    private static sendProcessMessageOverKafka = (process: WorkFlowProcessModel) => {
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
                Log.info("Error!")
                Log.info(e.message)
            })
    }
}