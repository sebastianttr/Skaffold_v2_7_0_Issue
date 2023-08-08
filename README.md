# Workflow Service

This is the workflow service that is used to coordinate the processes.

This service can be used with Workflow Quarkus Package.

## Usage

### Return the Status Messages without the Package using Kafka.

If you choose to send a status messages just with Kafka, create a serializable object in Java or a simple interface in TypeScript

Convert it to a JSON string and send to the topic called "dev.workflow.service"

Create a usable model using this AVRO schema:

````avro schema
{
  "namespace": "com.quanticfinancial.schemas.export",
  "type": "record",
  "name": "WorkflowMessageObject",
  "fields": [
    {
      "name": "message",
      "type": {
        "type": "record",
        "name": "WorkflowMessageModel",
        "fields": [
          {
            "name": "messageUid",
            "type": ["null", "string"],
            "default": null
          },
          {
            "name": "statusTotal",
            "type": ["null", "string"],
            "default": null
          },
          {
            "name": "statusCount",
            "type": ["null", "string"],
            "default": null
          },
          {
            "name": "processType",
            "type": ["null", "string"],
            "default": null
          },
          {
            "name": "type",
            "type": ["null", "string"],
            "default": null
          },
          {
            "name": "message",
            "type": ["null", "string"],
            "default": null
          },
          {
            "name": "userId",
            "type": ["null", "string"],
            "default": null
          },
          {
            "name": "status",
            "type": ["null", "string"],
            "default": null
          }
        ]
      }
    },
    {
      "name": "workflowId",
      "type": "string"
    },
    {
      "name": "processId",
      "type": "string"
    },
    {
      "name": "timestamp",
      "type": "string"
    }
  ]
}
````

Afterwards, make sure to set these properties in the kafka Message:

```text
Topic: "dev.workflow.service"
Key: "status" (|"process")
Value: "JSON String"
```

Additionally, this is the recommended way to serialize the object. This configuration has worked well in a lot of cases.

````java

/**
 *      Add this class. You need it or else you cannot convert it to a JSON
 */

import com.fasterxml.jackson.annotation.JsonIgnore;

public abstract class JacksonIgnoreAvroPropertiesMixIn {

    @JsonIgnore
    public abstract org.apache.avro.Schema getSchema();

    @JsonIgnore
    public abstract org.apache.avro.specific.SpecificData getSpecificData();
}


WorkflowMessageObject workflowMessageModel = WorkflowMessageObject.newBuilder()
    .setMessage(
        WorkflowMessageModel.newBuilder()
            .setMessage("")
            .setProcessType("some-process-type")
            .setType("some-type")
            .setStatusTotal("3")
            .setStatusCount("1")
            .setStatus("some-status")
            .build()
    )
    .setWorkflowId("some-workflow-id")
    .setProcessId("some-process-id")
    .setMessageUid("messageUid")
    .setUserId("userId")
    .setTimestamp((int)Date.from(Instant.now()).getTime())
    .build();

ObjectMapper objectMapper = new ObjectMapper();
objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
objectMapper.registerModule(new JavaTimeModule());
objectMapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
objectMapper.registerModule(new Jdk8Module());
objectMapper.addMixIn(
    org.apache.avro.specific.SpecificRecord.class,
    JacksonIgnoreAvroPropertiesMixIn.class);

logger.info("Converting to JSON.");

try {
    String json = objectMapper.writeValueAsString(workflowMessageModel);
    logger.info("JSON: " + json);
} catch (JsonProcessingException e) {
    logger.info("Error converting to JSON");
    e.printStackTrace();
}
````