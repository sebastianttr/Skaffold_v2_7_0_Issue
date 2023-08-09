import {SchemaType} from "mongoose";
import {WorkflowProcessStatusModel} from "./src/model/WorkflowStartModel";

declare global {

}

declare module 'mongoose' {
    namespace Schema {
        namespace Types {
             class WorkflowProcessStatusMessageType extends SchemaType {}
        }
    }


}




