import * as fs from "fs";
import {container, InjectionToken} from "tsyringe";

export interface IConfig {
    variables: { [key:string]: any }    // 0 = http, 1 = kafka
    processMapping:  { [key:string]: any }
}

export function Inject<Type>(dependency: InjectionToken<Type>) : Type {
    return container.resolve(dependency)
}

const NODE_ENV = process.env.NODE_ENV || "dev";

console.log("NODE_ENV", NODE_ENV, __dirname + "/config." + NODE_ENV + ".json")

const raw = fs.readFileSync(__dirname + "/config." + NODE_ENV + ".json");
let data = {} as IConfig;

try {
    data = JSON.parse(raw.toString()) as IConfig;
} catch (e) {
    console.error(e);
}

export default data;