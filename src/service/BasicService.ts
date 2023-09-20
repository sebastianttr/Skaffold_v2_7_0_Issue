import {injectable} from "tsyringe";

@injectable()
export default class BasicService{
    public handle = (req:Express.Request): Promise<any> => new Promise((resolve, reject) => {
        resolve({
            name:"John",
            value:"Doe"
        })
    })

}