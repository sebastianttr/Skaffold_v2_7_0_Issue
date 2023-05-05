import {Controller} from "@tsoa/runtime";
import {Get, Post, Request, Route} from "tsoa";
import WorkflowService from "../service/WorkflowService";
import {Inject, Log} from "../common";
import {WorkflowStartModel} from "../model/WorkflowStartModel";
import express from "express";
import {WorkflowStateModel, WorkflowStates} from "../model/WorkflowStateModel";
import {WorkflowProcesses, WorkflowState} from "../schema/WokflowSchemas";

@Route("api/v1/workflow")
export class WorkflowController extends Controller {
    private workflowService: WorkflowService = Inject(WorkflowService)

    @Get()
    public async getWorkflowState(@Request() req: express.Request): Promise<any> {
       return WorkflowService.getWorkflowState(req.headers["uid"] as string)
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

    @Post("startProcess")
    public startProcess(@Request() req: express.Request): string {
        const startModel: WorkflowStartModel = req.body;
        this.workflowService.startProcess(startModel)
        return "Starting process!";
    }

}