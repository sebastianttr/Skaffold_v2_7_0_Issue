import { container, InjectionToken } from "tsyringe";


export function Inject<Type>(dep: InjectionToken<Type>) : Type {
    return container.resolve(dep)
}



