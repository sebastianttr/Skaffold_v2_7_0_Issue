import {injectable} from "tsyringe";
import dotenv from "dotenv";
import {DatabaseService} from "./DatabaseService";
import {Inject} from "../common";
import {Log} from "../common";
import {model, Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import {ObjectId} from "mongodb"
import express from "express";
import {ApiError} from "../model/ApiError";
import {UserModel} from "../model/UserModel";

dotenv.config()


const UserSchema = new Schema<UserModel>({
    _id: ObjectId,
    email: String,
    username: String,
    password: String,
});

enum ResponseTypes {
    Success,
    AuthSuccess,
    Error,
    InfoRequired,
}

const User = model<UserModel>("User", UserSchema);

// Math.round(Math.random()*10)
const pwSalt = 4;

@injectable()
export default class UserService {
    databaseService: DatabaseService = Inject(DatabaseService)

    public addNewUser = (newUser: UserModel) => new Promise<any>(async (resolve) => {
        await new User(newUser).save();

        resolve({
            type: ResponseTypes.Success,
            msg: "User added successfully!"
        })
    })

}