import winston, {format} from "winston";

const { colorize, label, timestamp, printf } = format;

const leadingZero = (num:number):string => {
    return (num < 10) ? '0' + num : String(num)
}

const getFormattedDate = () => {
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
    private static getCallerFileAndLine(stack: string): string {
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

    static info = (infoObject: any, ...args: any[]) => LogWinston.info(Log.logFormat(infoObject, ...args))
    static warn = (infoObject: any, ...args: any[]) => LogWinston.warn(Log.logFormat(infoObject, ...args))
    static error = (infoObject: any, ...args: any[]) => LogWinston.error(Log.logFormat(infoObject, ...args))
    static debug = (infoObject: any, ...args: any[]) => LogWinston.debug(Log.logFormat(infoObject, ...args))

    static logFormat = (infoObject: any, ...args: any[]): string => {
        if(args.length){
            let argString: string = "";

            for(const arg of args){
                if(typeof arg == "object"){
                    argString = argString.concat(argString," " + JSON.stringify(arg))
                }
                else
                    argString = argString.concat(argString," " + arg)
            }

            return `[${Log.getCallerFileAndLine(new Error().stack || "")}] : ${infoObject}${argString}`
        }
        else {
            return `[${Log.getCallerFileAndLine(new Error().stack || "")}] : ${infoObject}`
        }
    }
}
