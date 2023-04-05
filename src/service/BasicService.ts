import { injectable } from "tsyringe";
import {Inject} from "../common";
import {ObjectId} from "mongodb";
import {UserModel} from "../model/UserModel";


@injectable()
export class BasicService {

    constructor() {
        // do something here
    }

    getUser = () : UserModel => {
        return {
            _id: new ObjectId(),
            email: "example@gmail.com",
            username: "Max Musterman",
            password: "somepassword"
        }
    }
}