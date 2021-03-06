# Example Node.js application intregated with Jaeger tracing

## Environment Variable

| Property  | Description |
| ------------- | ------------- |
| JAEGER_SERVICE_NAME  | The service name |
| JAEGER_AGENT_HOST  | The hostname for communicating with agent via UDP  |
| JAEGER_AGENT_PORT | The port for communicating with agent via UDP |
| JAEGER_ENDPOINT | (Optional) The HTTP endpoint for sending spans directly to a collector, i.e. http://jaeger-collector:14268/api/traces |

## Use Environment Variable in Docker Compose
``` yml
version: "3.7"
services:
  jaeger:
    image: jaegertracing/all-in-one:1.13.1
    ports:
      - "16686:16686"
    restart: on-failure
  service-a:
    build: ./service-a
    links:
      - jaeger
      - service-b
    depends_on:
      - jaeger
      - service-b
    ports:
      - "8080:8080"
    environment:
      JAEGER_AGENT_HOST: jaeger
      JAEGER_ENDPOINT: http://jaeger:14268/api/traces
      SERVICE_FORMATTER: service-b
  service-b:
    build: ./service-b
    links:
      - jaeger
    depends_on:
      - jaeger
    ports:
      - "8081:8081"
    environment:
      JAEGER_AGENT_HOST: jaeger

```

## Run on Docker Compose 

``` bash
docker-compose up --build
```

## Further information
If you are interested in continuing with Tracing instrument we recommend to read in-depth information from site reference below

https://tracing.cloudnative101.dev/docs/index.html
#   k o a - j a e t r a c k i n g  
 