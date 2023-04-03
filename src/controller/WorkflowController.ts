import {Controller} from "@tsoa/runtime";
import {Get, Post, Request, Route} from "tsoa";
import WorkflowService from "../service/WorkflowService";
import {Inject, Log} from "../common";
import {WorkflowStartModel} from "../model/WorkflowStartModel";
import express from "express";

@Route("api/v1/workflow")
export class WorkflowController extends Controller {
    private workflowService: WorkflowService = Inject(WorkflowService)


    private testModel: WorkflowStartModel = {
        id: "uuid",
        UID: "some-uid",
        messageID: "some-message-ID",
        timestamp: Date.now() / 1000,   // ms to sec
        processes: [
            {
                id:0,
                processID: "process-id-1",
                processName:"Workflow Element 1",
                next: "process-id-2",
                variables: {
                    "myVar1":"",
                    "myVar2":"1"    // default value
                }
            }
        ],
        params: {
            // no idea what we write here yet
        }
    }

    @Post("startProcess")
    public startProcess(@Request() req: express.Request): string {
        const startModel: WorkflowStartModel = req.body;
        // Log.info("Start model = " + JSON.stringify(startModel))

        this.workflowService.startProcess(startModel)
        return "Starting process!";
    }
}