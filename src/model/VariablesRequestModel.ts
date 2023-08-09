
enum VariableRequestProtocol{
    HTTP,
    KAFKA
}

interface IVariablesRequestModel {            // the variables that are available have to be known in advance ...
    name: string,
    protocol: VariableRequestProtocol,
    options: {[key: string]:string}
}

export { IVariablesRequestModel, VariableRequestProtocol}