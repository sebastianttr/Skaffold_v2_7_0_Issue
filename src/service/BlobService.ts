import {singleton} from "tsyringe";
import { BlobServiceClient, ContainerClient} from "@azure/storage-blob";
import dotenv from "dotenv"
import {Log} from "../util/logging";

dotenv.config();

const azure_connection_string:string = process.env.AZURE_BLOB_CONNECTION_STRING ?? ""

@singleton()
export class BlobService {

    blobServiceClient?: BlobServiceClient;
    blobContainer?: ContainerClient;

    constructor() {
        try{
            this.blobServiceClient = BlobServiceClient.fromConnectionString(azure_connection_string)
            this.blobContainer = this.blobServiceClient.getContainerClient(process.env["BLOB_STORAGE_CONTAINER"] ?? "devworkflow")
            Log.info("Successfully connected to blob storage!")
        }
        catch (e:any){
            Log.error("Error connection to Azure Blob Storage!")
            Log.error(e.name + " : " + e.message)
        }
    }

    storeBlob = (blobName: string, content: string) => new Promise<void>(async (resolve, reject) => {
        await this.blobContainer!.uploadBlockBlob(blobName,content,content.length,{})
        resolve()
    })

    // delete a blob by using the name of the blob
    deleteBlob = (blobName: string) => new Promise<void>(async (resolve, reject) => {
        await this.blobContainer!.deleteBlob(blobName)
        resolve()
    })


    deleteBlobs = (blobNames: string[]) => new Promise<void>(async (resolve, reject) => {
        for await(const blobs of blobNames){
            try{
                await this.blobContainer!.deleteBlob(blobs);

            }
            catch (e){
                Log.error(`The specified blob called ${blobs} does not exist!`)
            }
        }
        resolve()
    })

    // get blob content as string
    getBlobContent = (blobName: string) => new Promise<string>(async (resolve, reject) => {
        // download the data, convert the Uint8Array into a buffer and call the toString method.
        const contentBuffer = await this.getBlobContentBuffer(blobName)
        resolve(contentBuffer.toString())
    })

    getBlobContentBuffer = (blobName: string):Promise<Buffer> => this.blobContainer!.getBlobClient(blobName).download()
        .then(stream => {
            const content: NodeJS.ReadableStream = stream.readableStreamBody!
            const chunks: any[] = [];
            let buffer: Buffer = Buffer.alloc(0);

            content.on('data', (data) => {
                chunks.push(data instanceof Buffer ? data : Buffer.from(data));
            });
            content.on('end', () => {
                buffer = Buffer.concat(chunks);
            });
            content.on('error', () => {});

            return buffer;
        })

    /*getBlobContentBuffer = (blobName: string) => new Promise<Buffer>(async (resolve, reject) => {
        // download the data, convert the Uint8Array into a buffer
        const downloadResponse = (await this.blobContainer.getBlobClient(blobName).download()).readableStreamBody

        // from the stream, build the buffer.
        const downloaded: Buffer = await new Promise((resolve, reject) => {
            const chunks = [];
            downloadResponse.on('data', (data) => {
                chunks.push(data instanceof Buffer ? data : Buffer.from(data));
            });
            downloadResponse.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            downloadResponse.on('error', reject);
        });

        resolve(downloaded)
    })*/

    // https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-list-javascript
    getBlobs = (maxPageSize:number = 100) => new Promise<string[]>(async (resolve,reject) => {

        // some options for filtering list
        const listOptions = {
            includeMetadata: false,
            includeSnapshots: false,
            includeTags: false,
            includeVersions: false,
            prefix: ''
        };

        let iterator = this.blobContainer!.listBlobsFlat(listOptions).byPage({ maxPageSize });
        let response = (await iterator.next()).value;

        resolve(response.segment.blobItems.map((i:any) => i.name));
    })

}

export default BlobService;