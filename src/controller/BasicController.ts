import {Route, Request, Get} from "tsoa";
import {Inject} from "../util/injection";
import {Controller} from "@tsoa/runtime";
import BasicService from "../service/BasicService";
import {Log} from "../util/logging";

@Route("api/v1/basic")
export class BasicController extends Controller {

    private basicService: BasicService = Inject(BasicService)

    @Get("model")
    public getModel(@Request() req: Express.Request): Promise<any> {
        Log.info("New incoming request")
        return this.basicService.handle(req)
    }

}