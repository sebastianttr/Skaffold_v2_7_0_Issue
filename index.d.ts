import {SchemaType} from "mongoose";

declare global {

}

declare module 'mongoose' {
    namespace Schema {
        namespace Types {
             class WorkflowProcessStatusMessageType extends SchemaType {}
        }
    }
}


