import {IHeaders, Kafka, logLevel, Message, Partitioners, Producer} from "kafkajs"
import * as dotenv from 'dotenv'
import {singleton} from "tsyringe";
import {Inject, Log} from "../common"
import packageJSON from "../../package.json";
import {KafkaIncomingRecord} from "../helper/KafkaIncoming";


dotenv.config()

@singleton()
class KafkaMessaging {
    clientId: string;
    host: string;
    topic: string;
    kafka?: Kafka;
    producer?: Producer;
    private connected = false;
    private connecting = false; // need it because async

    constructor(){
        this.clientId = process.env["KAFKA_CLIENTID"] ?? "";
        this.host = process.env["KAFKA_HOST"] ?? "";
        this.topic = process.env["KAFKA_TOPIC"] ?? "";

        // Can connect async ... low chance of it sending message on empty producer...
        if(!this.producer)
            this.connect().then(() => {
                Log.info("Connected to Kafka Broker!")
            })

    }

    private connect = async () => {
        if(!this.connected && !this.connecting) {
            this.connecting = true;
            this.kafka = new Kafka({
                clientId: this.clientId,
                brokers: [this.host],
                logLevel: logLevel.ERROR || logLevel.WARN
            })

            this.producer = this.kafka.producer(
                {createPartitioner: Partitioners.LegacyPartitioner}
            );

            await this.producer.connect();
            this.connected = true;
            this.connecting = false;
        }
    }

    send = async (text:string,topic?:string,key?:string,partition?:number, headers?: IHeaders) => {
        // Log.info(topic)
        // Log.info(conf.topics[topic ?? ""])
        await this.producer!.send({
            topic: topic,
            messages: [
                {
                    headers: (headers ?? {"key":"value"}) as IHeaders,
                    key: key ?? "",
                    value: text,
                    partition: partition ?? 0,
                },
            ],
        })
    }

    sendBulk = async (messages: Message[],topic?:string) => {
        await this.producer!.send({
            topic: topic ?? "",
            messages: messages,
        })
    }

}

export default KafkaMessaging;