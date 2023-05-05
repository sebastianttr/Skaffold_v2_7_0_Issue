import {Inject, Log} from "../common";
import KafkaMessagingService from "../service/KafkaMessagingService";
import packageJSON from "../../package.json"
import {IHeaders} from "kafkajs";

interface KafkaIncomingRecord {
    key: string,
    value: string,
    headers?: IHeaders,
    partition: number,
    topic: string
}

const defaultBuffer = (buffer: Buffer) => (buffer) ? buffer : Buffer.from("")

// Incoming decorator
function incoming(topic: string){
    return function (
        target: Object,
        key: string | symbol,
        descriptor: PropertyDescriptor
    ) {
        // get the kafka messaging service and the kafka consumer
        const kafkaMessagingService:KafkaMessagingService = Inject(KafkaMessagingService)
        const consumer = kafkaMessagingService.kafka.consumer({
            groupId: packageJSON.name,
            rebalanceTimeout: 4000
        })

        // connect to consumer
        consumer.connect()
            .then(async () => {
                // subscribe to the topic
                await consumer.subscribe({ topics: [topic], fromBeginning: true,})
                Log.info("Subscribed")
                await consumer.run({
                    // for each message, send it back to the function.
                    eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
                        consumer.pause([{ topic }])

                        // Log.info("got something")
                        message.key = defaultBuffer(message.key)
                        message.value = defaultBuffer(message.value)

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
                            await descriptor.value(incomingRecord);
                        }
                        catch (e: any) {
                            Log.error(e.stack)
                        }
                        consumer.resume([{ topic }])
                    },
                    eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
                        Log.info("got something batched")
                        await descriptor.value("Test");
                    },
                    partitionsConsumedConcurrently: 10,
                    autoCommitThreshold: 100,

                })
            })
    }
}

export { incoming, KafkaIncomingRecord };
