import {Controller} from "@tsoa/runtime";
import {Exception, Get, Post, Request, Route} from "tsoa";
import WorkflowService from "../service/WorkflowService";
import {Inject} from "../util/injection";
import express from "express";
import {IWorkflowStartModel} from "../model/WorkflowStartModel";
import {Log} from "../util/logging";
import {WorkflowStateRepository} from "../repository/WorkflowStateRepository";
import {WorkflowProcessRepository} from "../repository/WorkflowProcessRepository";
import {IWorkflowViewModel} from "../model/editor/WorkflowViewModel";
import * as crypto from "crypto";
import {IWorkflowProcessNode} from "../model/editor/WorkflowProcessNode";
import {IWorkflowConnection} from "../model/editor/WorkflowConnection";
import {WorkflowModel} from "../entity/WorkflowModel";
import {WorkflowState} from "../entity/WorkflowState";

@Route("api/v1/workflow")
export class WorkflowController extends Controller {
    private workflowService: WorkflowService = Inject(WorkflowService)
    private workflowStateRepository: WorkflowStateRepository = Inject(WorkflowStateRepository)
    private workflowProcessRepository: WorkflowProcessRepository = Inject(WorkflowProcessRepository)

    @Get()
    public async getWorkflowState(@Request() req: express.Request): Promise<any> {
       return this.workflowStateRepository.getWorkflowStateByUserId(req.headers["uid"] as string)
    }

    @Post()
    public startWorkflow(@Request() req: express.Request<IWorkflowStartModel>): Promise<string> {
        const startModel = req.body;
        return this.workflowService.startWorkflow(startModel).then(() => "Workflow has been started.");
    }

    @Get("start")
    public async startWorkflowById(@Request() req: express.Request<string>): Promise<any> {
        const uid: string = req.get("uid") || ""
        const workflowId: string = req.get("workflowId") || ""
        Log.info(workflowId + " " + uid)
        return
    }

    // TODO: put into a service
    @Get("create")
    public async createWorkflow(@Request() req: express.Request<string>): Promise<any> {
        const workflowId = crypto.randomUUID()
        Log.info(req.params)
        const userId = req.get("userId") ?? ""

        const workflowViewModel = new WorkflowModel({
            id: workflowId,
            userId: userId,
            messageUid: "", // not really needed.
            start: [],
            params: {},
            nodes: [],           // Any for now till fix on the Workflow Service Side
            connections: []   // Any for now till fix on the Workflow Service Side
        })

        await workflowViewModel.save()

        // send back the workflow ID to get a reference of the new workflow
        return workflowId
    }

    @Post("restart")
    public restartProcess(@Request() req: express.Request<IWorkflowStartModel>): Promise<string> {
        const process = req.body;
        return this.workflowService.restartProcess(process);
    }

    @Get("process")
    public async getWorkflowProcess(@Request() req: express.Request): Promise<any> {
        const uid: string = req.headers["uid"] as string
        const workflowID: string = req.headers["processid"] as string
        return this.workflowProcessRepository.getWorkflowProcess(uid, workflowID)
            .catch((e: Exception) => {
            Log.error("Could not get Workflow Processes! The process ID might be incorrect.")
        });
    }

    @Get("processes")
    public async getWorkflowProcesses(@Request() req: express.Request): Promise<any> {
        const uid: string = req.headers["uid"] as string
        return this.workflowProcessRepository.getWorkflowProcesses(uid)
            .catch((e: Exception) => {
                Log.error("Could not get Workflow Processes! The process ID might be incorrect.")
            });
    }

    // TODO: put into a service file
    @Post("ui")
    public async setWorkflow(@Request() req: express.Request<IWorkflowViewModel>): Promise<any>{

        const workflowViewModel: IWorkflowViewModel = req.body

        await WorkflowModel.findOneAndUpdate(
            {id: workflowViewModel.id, userId: workflowViewModel.userId},
            workflowViewModel,
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        )

        return "Set UI successfully."
    }

    @Get("ui")
    public async getWorkflow(@Request() req: express.Request): Promise<any>{
        console.log("Sending back a workflow")
        const uid: string = req.get("uid") || ""


    }

}