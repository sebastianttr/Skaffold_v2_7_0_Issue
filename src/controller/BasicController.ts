import { Get, Path, Route , Request} from "tsoa";
import {Inject, Log} from "../common";
import { UserModel } from "../model/UserModel";
import { BasicService } from "../service/BasicService";
import {Controller} from "@tsoa/runtime";
import WorkflowService from "../service/WorkflowService";
import BlobService from "../service/BlobService";

@Route("api/v1/basic")
export class BasicController extends Controller {

    private basicService: BasicService = Inject(BasicService)
    private workflowService: WorkflowService = Inject(WorkflowService)
    private blobService: BlobService = Inject(BlobService)

    @Get("getUser")
    public getUser(@Request() req: Express.Request): UserModel {
        return this.basicService.getUser()
    }

    @Get("deleteBlobs")
    public deleteAllBlobs(@Request() req: Express.Request): string{
        this.blobService.getBlobs().then(blobs => {
            this.blobService.deleteBlobs(blobs)
        })
        return "Deleted the blob list. "
    }

}