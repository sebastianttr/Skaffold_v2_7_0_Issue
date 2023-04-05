import { Get, Path, Route , Request} from "tsoa";
import { Inject } from "../common";
import { UserModel } from "../model/UserModel";
import { BasicService } from "../service/BasicService";
import {Controller} from "@tsoa/runtime";
import WorkflowService from "../service/WorkflowService";

@Route("api/v1/basic")
export class BasicController extends Controller {

    private basicService: BasicService = Inject(BasicService)
    private workflowService: WorkflowService = Inject(WorkflowService)

    @Get("getUser")
    public getUser(@Request() req: Express.Request): UserModel {
        return this.basicService.getUser()
    }

}