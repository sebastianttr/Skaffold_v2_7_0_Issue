import {Controller} from "@tsoa/runtime";
import {Get, Post, Put, Request, Route} from "tsoa";
import WorkflowService from "../service/WorkflowService";
import {Inject, Log} from "../common";
import {WorkFlowProcessModel, WorkflowStartModel} from "../model/WorkflowStartModel";
import express from "express";

@Route("api/v1/workflow")
export class WorkflowController extends Controller {
    private workflowService: WorkflowService = Inject(WorkflowService)

    @Get()
    public async getWorkflowState(@Request() req: express.Request): Promise<any> {
       return WorkflowService.getWorkflowState(req.headers["uid"] as string)
    }

    @Post()
    public startWorkflow(@Request() req: express.Request): string {
        const startModel: WorkflowStartModel = req.body;
        this.workflowService.startWorkflow(startModel)
        return "Starting process!";
    }

    @Post("restart")
    public restartProcess(@Request() req: express.Request): Promise<string> {
        const process: WorkFlowProcessModel = req.body;
        return this.workflowService.restartProcess(process);
    }

    @Get("process")
    public async getWorkflowProcess(@Request() req: express.Request): Promise<any> {
        const uid: string = req.headers["uid"] as string
        const workflowID: string = req.headers["processid"] as string
        return WorkflowService.getWorkflowProcess(uid, workflowID);
    }

    @Get("processes")
    public async getWorkflowProcesses(@Request() req: express.Request): Promise<any> {
        const uid: string = req.headers["uid"] as string
        return WorkflowService.getWorkflowProcesses(uid);
    }
}