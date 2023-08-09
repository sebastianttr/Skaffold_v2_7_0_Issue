import {Controller} from "@tsoa/runtime";
import {Exception, Get, Post, Put, Request, Route} from "tsoa";
import WorkflowService from "../service/WorkflowService";
import {Inject} from "../util/injection";
import express from "express";
import {IWorkflowStartModel} from "../model/WorkflowStartModel";
import {Log} from "../util/logging";

@Route("api/v1/workflow")
export class WorkflowController extends Controller {
    private workflowService: WorkflowService = Inject(WorkflowService)

    @Get()
    public async getWorkflowState(@Request() req: express.Request): Promise<any> {
       return WorkflowService.getWorkflowState(req.headers["uid"] as string)
    }

    @Post()
    public startWorkflow(@Request() req: express.Request<IWorkflowStartModel>): string {
        const startModel = req.body;
        this.workflowService.startWorkflow(startModel)
        return "Starting process!";
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
        return WorkflowService.getWorkflowProcess(uid, workflowID)
            .catch((e: Exception) => {
            Log.error("Could not get Workflow Processes! The process ID might be incorrect.")
        });;
    }

    @Get("processes")
    public async getWorkflowProcesses(@Request() req: express.Request): Promise<any> {
        const uid: string = req.headers["uid"] as string
        return WorkflowService.getWorkflowProcesses(uid)
            .catch((e: Exception) => {
                Log.error("Could not get Workflow Processes! The process ID might be incorrect.")
            });
    }
}