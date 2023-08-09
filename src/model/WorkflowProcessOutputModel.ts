export default interface IWorkflowProcessOutputModel {
    variables: any,     // The variables ... calculation output
    message?: any,       // Adds some more info. Like for example: How was it calculated? What values were used ()
    extra?: any
}