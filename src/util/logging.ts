import winston, {format} from "winston";

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
            label({ label: "" }),
            timestamp({ format: 'YY-MM-DD HH:MM:SS' }),
            printf(
                (info) => {
                    return  `${info.timestamp} ${info.level}${info.message}`
                }
            ),
        )
    }))
}

const LogWinston = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: consoleTransport
})

export class Log{

    // only file name because the line numbering is broken.
    private static getCallerFileAndLine(stack: string):string {
        // get the stack lines.
        const stackLines: string[] = new Error().stack!.split("\n")

        // get the last item that contains
        const lastStackLine:string = stackLines.filter((item: string) => item.includes("/app")).pop() || ""

        // format it into something readable.
        const lastCaller: string = lastStackLine.substring(lastStackLine.indexOf("/app"),lastStackLine.length)
            .replace("\)","")

        let [fileName , line] = lastCaller.split(":")
        fileName = fileName.substring(fileName.lastIndexOf("/")+1, fileName.length)

        return `${fileName}`
    }

    static info = (infoObject: any) => LogWinston.info(` [${Log.getCallerFileAndLine(new Error().stack || "")}] : ${infoObject}`)
    static warn = (infoObject: any) => LogWinston.warn(` [${Log.getCallerFileAndLine(new Error().stack || "")}] : ${infoObject}`)
    static error = (infoObject: any) => LogWinston.error(` [${Log.getCallerFileAndLine(new Error().stack || "")}] : ${infoObject}`)
    static debug = (infoObject: any) => LogWinston.debug(` [${Log.getCallerFileAndLine(new Error().stack || "")}] : ${infoObject}`)
}
