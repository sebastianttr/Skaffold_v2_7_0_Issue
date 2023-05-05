import {Get, Path, Route, Request, Delete} from "tsoa";
import {Inject, Log} from "../common";
import {Controller} from "@tsoa/runtime";
import WorkflowService from "../service/WorkflowService";
import BlobService from "../service/BlobService";

@Route("api/v1/basic")
export class BasicController extends Controller {

    private workflowService: WorkflowService = Inject(WorkflowService)
    private blobService: BlobService = Inject(BlobService)

    @Delete("blobs")
    public deleteAllBlobs(@Request() req: Express.Request): string{
        this.blobService.getBlobs().then(blobs => {
            this.blobService.deleteBlobs(blobs)
        })
        return "Deleted the blob list. "
    }

}