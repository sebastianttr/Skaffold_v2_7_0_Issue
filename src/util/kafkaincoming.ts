import {Inject} from "./injection";
import KafkaMessagingService from "../service/KafkaMessagingService";
import packageJSON from "../../package.json"
import {IHeaders, RetryOptions} from "kafkajs";
import {Log} from "./logging";
import {InjectionToken} from "tsyringe";

interface KafkaIncomingRecord {
    key: string,
    value: string,
    headers?: IHeaders,
    partition: number,
    topic: string
}

interface IIncomingProperties <T> {
    groupId?: string,
    injectables?: T[],
    rebalanceTimeout?: number
    sessionTimeout?: number
    retry?: RetryOptions & { restartOnFailure?: (err: Error) => Promise<boolean> }
}

const defaultBuffer = (buffer: Buffer) => (buffer) ? buffer : Buffer.from("")

// Incoming decorator
function incoming<T extends InjectionToken>(topic: string, properties: IIncomingProperties<T>){
    return function (
        target: Object,
        key: string | symbol,
        descriptor: TypedPropertyDescriptor<any>
    ) {

        // get the kafka messaging service and the kafka consumer
        const kafkaMessagingService:KafkaMessagingService = Inject(KafkaMessagingService)
        const consumer = kafkaMessagingService.kafka!.consumer({
            groupId: properties.groupId || packageJSON.name,
            rebalanceTimeout: properties.rebalanceTimeout || 4000,      // important. Without this, the messages are not guaranteed to arrive.
            sessionTimeout: properties.sessionTimeout || undefined,
            retry: properties.retry || undefined
        })

        // connect to consumer
        consumer.connect()
            .then(async () => {
                // subscribe to the topic
                await consumer.subscribe({ topics: [topic], fromBeginning: true,})

                await consumer.run({
                    // for each message, send it back to the function.
                    eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
                        // we need to pause the consumer, or else there might be concurrences
                        //consumer.pause([{ topic }])

                        // set the key and the value of the kafka message
                        // Log.info("got something")
                        message.key = defaultBuffer(message.key!)
                        message.value = defaultBuffer(message.value!)

                        // get the actual message value
                        let messageValue = message?.value.toString()
                            .replace(/\\/g, '')
                            .replace(/^\"|\"$/g,'') ?? ""

                        // create a variable to store the return information
                        const incomingRecord: KafkaIncomingRecord = {
                            key: message.key.toString(),
                            value: messageValue,
                            headers: message.headers,
                            partition: partition,
                            topic: topic,
                        };

                        try{
                            // try to return the record back to the consumer function
                            await descriptor.value(incomingRecord)
                        }
                        catch (e: any) {
                            Log.error(e.stack)
                        }
                        //consumer.resume([{ topic }])
                    },
                    partitionsConsumedConcurrently: 10,
                    autoCommitThreshold: 100,
                })
            })
    }
}

export { incoming, KafkaIncomingRecord };
