import {Inject} from "../util/injection";
import KafkaMessagingService from "../service/KafkaMessagingService";
import packageJSON from "../../package.json"
import {IHeaders} from "kafkajs";
import {Log} from "../util/logging";
import {InjectionToken} from "tsyringe";

interface KafkaIncomingRecord {
    key: string,
    value: string,
    headers?: IHeaders,
    partition: number,
    topic: string
}


interface IIncomingProperties <T> {
    topic: string
    groupId?: string,
    injectables?: T[]
}

const defaultBuffer = (buffer: Buffer) => (buffer) ? buffer : Buffer.from("")

// Incoming decorator
function incoming<T extends InjectionToken>(properties: IIncomingProperties<T>){
    return function (
        target: Object,
        key: string | symbol,
        descriptor: TypedPropertyDescriptor<any>
    ) {
        // get the kafka messaging service and the kafka consumer
        const kafkaMessagingService:KafkaMessagingService = Inject(KafkaMessagingService)
        const consumer = kafkaMessagingService.kafka!.consumer({
            groupId: packageJSON.name,
            rebalanceTimeout: 4000
        })

        const injectableInstances: T[] = (properties.injectables || []).map(item => Inject(item))

        const originalValue = descriptor.value
        console.log(originalValue)

        // connect to consumer
        consumer.connect()
            .then(async () => {
                // subscribe to the topic
                await consumer.subscribe({ topics: [properties.topic], fromBeginning: true,})

                await consumer.run({
                    // for each message, send it back to the function.
                    eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
                        consumer.pause([{ topic }])

                        // Log.info("got something")
                        message.key = defaultBuffer(message.key!)
                        message.value = defaultBuffer(message.value!)

                        let messageValue = message?.value.toString()
                            .replace(/\\/g, '')
                            .replace(/^\"|\"$/g,'') ?? ""

                        const incomingRecord: KafkaIncomingRecord = {
                            key: message.key.toString(),
                            value: messageValue,
                            headers: message.headers,
                            partition: partition,
                            topic: topic,
                        };

                        try{
                            // send the incoming record back.
                            // descriptor!.value = function(...args: any[]) {
                            //
                            //     return originalValue.apply(this, args);
                            // }

                            await descriptor.value(incomingRecord, injectableInstances);
                        }
                        catch (e: any) {
                            Log.error(e.stack)
                        }
                        consumer.resume([{ topic }])
                    },
                    eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
                        Log.info("got something batched")
                        await descriptor.value("Test",injectableInstances);
                    },
                    partitionsConsumedConcurrently: 10,
                    autoCommitThreshold: 100,

                })
            })
    }
}

export { incoming, KafkaIncomingRecord };
