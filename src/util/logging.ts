import {console as Console} from "tracer";
import Transport from "winston-transport";
import winston, {format, transports} from "winston";

const { combine, colorize, timestamp, printf } = format;

const leadingZero = (num:number):string => {
    return (num < 10) ? '0' + num : String(num)
}

const getFormatedDate = () => {
    const date: Date = new Date();
    let hour = leadingZero(date.getHours());
    let minute = leadingZero(date.getMinutes());
    let seconds = leadingZero(date.getSeconds());

    let day = leadingZero(date.getDate());
    let month = leadingZero(date.getMonth()+1);
    let year = leadingZero(date.getFullYear());

    // ${day}/${month}/${year}

    return `${hour}:${minute}:${seconds}`;
}

export const LogDev = new transports.Console({
    format: format.combine(format.simple(), format.colorize())
})

/*Console({
format: [
    '({{file}}): {{message}}',
    {
        info: `(${getFormatedDate()}): {{message}} `,
        error: '({{file}}:{{line}}) {{message}}'
    }
],
dateformat: 'HH:MM:ss.L',
})*/

class CustomTransport extends Transport {
    constructor(opts:any) {
        super(opts);
    }

    log(info:any, callback: any) {
        LogDev.info(info["message"]);
        callback();
    }
}

let consoleTransport: any[] = [];

if (process.env.NODE_ENV == 'production') {    // in production, we use file and winston console
    consoleTransport.push(new winston.transports.File({ filename: 'error.log', level: 'error' }))
    consoleTransport.push(new winston.transports.File({ filename: 'combined.log' }))
    consoleTransport.push(new winston.transports.Console({
        format: winston.format.simple(),
    }))
    // add a custom transport
}
else {  // for any other environment like dev, we use console logger
    consoleTransport.push(new CustomTransport({}))
}

export const Log = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: consoleTransport
})