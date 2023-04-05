import {Controller} from "@tsoa/runtime";
import {Get, Post, Request, Route} from "tsoa";
import WorkflowService from "../service/WorkflowService";
import {Inject, Log} from "../common";
import {WorkflowStartModel} from "../model/WorkflowStartModel";
import express from "express";

@Route("api/v1/workflow")
export class WorkflowController extends Controller {
    private workflowService: WorkflowService = Inject(WorkflowService)

    @Post("startProcess")
    public startProcess(@Request() req: express.Request): string {
        const startModel: WorkflowStartModel = req.body;
        // Log.info("Start model = " + JSON.stringify(startModel))

        this.workflowService.startProcess(startModel)
        return "Starting process!";
    }
}