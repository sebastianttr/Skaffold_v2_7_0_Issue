
export class ObjectHelper {

    // gets the keys of the values that are falsy.
    static getKeyListOfFalsyValues = (object: any): string[] => {
        const entries = Object.entries(object)

        const keyNames: string[] = [];

        for(const entry of entries){
            if(!entry[1]){
                keyNames.push(entry[0])
            }
        }

        return keyNames;
    }

}