import { Route, Request, Delete} from "tsoa";
import {Inject} from "../util/injection";
import {Controller} from "@tsoa/runtime";
import BlobService from "../service/BlobService";

@Route("api/v1/basic")
export class BasicController extends Controller {

    private blobService: BlobService = Inject(BlobService)

    @Delete("blobs")
    public deleteAllBlobs(@Request() req: Express.Request): string{
        this.blobService.getBlobs().then(blobs => {
            this.blobService.deleteBlobs(blobs)
        })
        return "Deleted the blob list. "
    }

}