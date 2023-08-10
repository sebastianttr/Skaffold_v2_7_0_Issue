import winston, {addColors, format} from "winston";
import {inspect} from "util";

const { combine, colorize, label, timestamp, json, prettyPrint, printf, simple } = format;

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

const colors = {
    debug: 'grey',
    warn: 'yellow',
    error: 'red',
};

let consoleTransport: any[] = [];

if (process.env.NODE_ENV == 'production') {    // in production, we use file and winston console
    consoleTransport.push(new winston.transports.File({ filename: 'error.log', level: 'error' }))
    consoleTransport.push(new winston.transports.File({ filename: 'combined.log' }))
    consoleTransport.push(new winston.transports.Console({
        format: winston.format.simple(),
    }))
}
else {
    consoleTransport.push(new winston.transports.Console({
        format: format.combine(
            // colorize({ all: true }),
            colorize({
                colors
            }),
            label({ label: '[LOGGER]' }),
            timestamp({ format: 'YY-MM-DD HH:MM:SS' }),
            printf(
                (info) => {
                    return  `${info.timestamp} ${info.level}: ${info.message}`
                }
            ),
        )
    }))
}
//
// addColors({
//     info: "grey",
//     warn: 'italic yellow',
//     error: 'bold red',
//     debug: 'green',
// })

export const Log = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: consoleTransport
})
