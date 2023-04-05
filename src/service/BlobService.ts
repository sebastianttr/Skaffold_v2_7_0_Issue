import {singleton} from "tsyringe";
import {BlobServiceClient, ContainerClient} from "@azure/storage-blob";
import dotenv from "dotenv"
import {Inject, Log} from "../common";
import {Exception} from "tsoa";

dotenv.config();

const azure_connection_string:string = process.env.AZURE_BLOB_CONNECTION_STRING ?? ""


@singleton()
export class BlobService {

    blobServiceClient: BlobServiceClient;
    blobContainer: ContainerClient;

    constructor() {
        try{
            this.blobServiceClient = BlobServiceClient.fromConnectionString(azure_connection_string)
            this.blobContainer = this.blobServiceClient.getContainerClient("devworkflow")
            Log.info("Successfully connected to blob storage!")
        }
        catch (e){
            Log.error("Error connection to Azure Blob Storage!")
            Log.error(e.name + " : " + e.message)
        }
    }

    storeBlob = (blobName: string, content: string) => new Promise<void>(async (resolve, reject) => {
        await this.blobContainer.uploadBlockBlob(blobName,content,content.length,{})
        resolve()
    })


}

export default BlobService;