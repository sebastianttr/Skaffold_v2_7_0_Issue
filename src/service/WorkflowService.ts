import {injectable} from "tsyringe";
import {Inject, Log} from "../common";
import KafkaMessagingService from "./KafkaMessagingService";
import {WorkFlowProcess, WorkflowStartModel} from "../model/WorkflowStartModel";
import {VariableRequestProtocol, VariablesRequestModel} from "../model/VariablesRequestModel";
import config from "../config";
import BlobService from "./BlobService";
import {model, Schema, } from "mongoose";
import {WorkflowStateModel, WorkflowStates} from "../model/WorkflowStateModel";

const workflowStartUserSchema = new Schema<WorkflowStateModel>({
    id: String,                 // workflow id ... to keep track of the process -> generate a UUID
    currentState: String,                // uid from frontend
    currentProcessId: String,          // messageID from frontend
    timestamp: Number,
    processes: [],  // list of processes. where we define the next process and the parameters of the process.
    params: Object
});

const WorkflowState = model<WorkflowStateModel>("workflow_states",workflowStartUserSchema);

@injectable()
export default class WorkflowService{

    private kafkaMessageService: KafkaMessagingService = Inject(KafkaMessagingService)
    private blobService: BlobService = Inject(BlobService)


    constructor() {

    }

    fetchVariablesOverHTTP = (options: any) => new Promise<any>((resolve) => {
        resolve("fetchValue")
    });

    fetchVariablesOverKafka = (options: any) => new Promise<any>((resolve) => {
        resolve("fetchValue")
    });

    startProcess = async (workflowStartModel: WorkflowStartModel) => {
        // define states
        let workflowProcesses:WorkFlowProcess[] = [];

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
                    else
                        variables[entry.key] = await this.fetchVariablesOverKafka(configData.options)
                }
                else variables[entry.key] = entry.value

            }

            // once the variables are in, send to blob storage
            // send the variables for each process individually ... so we don't send a big one that is useless for the processes
            const blobName = `var_${workflowStartModel.id}_${process.id}`;
            await this.blobService.storeBlob(blobName, JSON.stringify(variables))

            // change the workflow processes variable to only have the blob name
            process.variables =  blobName;

            // add process to workflow processes array
            workflowProcesses.push(process)
        }

        // compose the messages.
        const workFlowState: WorkflowStateModel = {
            id:workflowStartModel.id,                                           // ID
            messageID: workflowStartModel.messageID,                            // MessageID
            UID: workflowStartModel.UID,                                        // UID
            timestamp: Date.now(),                                              // Record the current timestamp
            currentProcessId: workflowStartModel.processes[0].processID,        // first process start
            currentState: WorkflowStates.RUN,                                   // start with a running state
            processes: workflowProcesses,                                       // processes -> variables are removed, only blob name instead
            params: workflowStartModel.params                                   // params from workflowStartModel
        }

        // save the state to the database
        new WorkflowState(workFlowState).save()
            .catch((e) => {
                Log.error(e)
            });

        // once in the blob storage and DB, send all the necessary information over kafka to service
        this.kafkaMessageService.send(
            JSON.stringify(workflowStartModel.processes[0]),
            "dev.file.upload.firm-service",
            "",
            0,
            {})
            .then(r => {
                Log.info("Sent kafka message")
            })
            .catch(e => {
                Log.info("Error!")
                Log.info(e.message)
            })
        //Log.info("Starting the process")*/
    }
}