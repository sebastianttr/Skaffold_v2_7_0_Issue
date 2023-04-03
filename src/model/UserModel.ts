import {ObjectId} from "mongodb"

export interface UserModel {
    _id: ObjectId
    email: string
    username: string
    password: string
}