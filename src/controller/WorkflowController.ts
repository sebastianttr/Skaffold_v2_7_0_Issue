import {Controller} from "@tsoa/runtime";
import {Get, Request, Route} from "tsoa";
import WorkflowService from "../service/WorkflowService";
import {Inject} from "../common";

@Route("api/v1/workflow")
export class WorkflowController extends Controller {
    private workflowService: WorkflowService = Inject(WorkflowService)

    @Get("startProcess")
    public startProcess(@Request() req: Express.Request): string {
        this.workflowService.startProcess(req)
        return "Starting process!";
    }
}