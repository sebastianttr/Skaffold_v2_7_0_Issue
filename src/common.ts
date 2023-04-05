import { console } from "tracer";
import { container, InjectionToken } from "tsyringe";

export function Inject<Type>(dep: InjectionToken<Type>) : Type {
    return container.resolve(dep)
}

const leadingZero = (num) => {
    if(num < 10) num = '0' + num;
    return num
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

export const Log = console({
    format: [
        '({{file}}): {{message}}',
        {
            info: `(${getFormatedDate()} - {{file}}): {{message}} `,
            error: '({{file}}:{{line}}) {{message}}'
        }
    ],
    dateformat: 'HH:MM:ss.L',
})