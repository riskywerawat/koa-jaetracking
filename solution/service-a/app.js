
const Koa = require('koa');
const Router = require('koa-router');
const router = new Router();
const app = new Koa();

const port = 8080
const serviceName = process.env.SERVICE_NAME || 'service-a'
const hello = require('./hello')
// Initialize the Tracer
const tracer = initTracer(serviceName)
const opentracing = require('opentracing')
opentracing.initGlobalTracer(tracer)


// Let's capture http error span

app.use(router.routes());
app.use(router.allowedMethods());

  // the middleware 
  router.use(tracingMiddleWare);

// Using the span inside a route handler


router.get('/sayhello',hello);
app.listen(port, () => console.log(`Service ${serviceName} listening on port ${port}!`))

function initTracer(serviceName) {
  const initJaegerTracer = require('jaeger-client').initTracerFromEnv
  const config = {
    serviceName: serviceName

  }

  if (process.env.JAEGER_AGENT_HOST) {
    config.reporter = {
      agentHost: process.env.JAEGER_AGENT_HOST,
      agentPort: process.env.JAEGER_AGENT_PORT,
      logSpans: true
    }
  } else {
    config.reporter = {
      collectorEndpoint: process.env.JAEGER_ENDPOINT,
      logSpans: true
    }
  }
  // Sampler set to const 1 to capture every request, do not do this for production
  // Only for DEV the sampler will report every span
  config.sampler = { type: 'const', param: 1 }

  var options = {
    logger: {
      info: function logInfo(msg) {
        console.log("INFO ", msg);
      },
      error: function logError(msg) {
        console.log("ERROR", msg);
      },
    },
  }

  return initJaegerTracer(config, options)
}

async function  tracingMiddleWare(ctx,next) {
  const tracer = opentracing.globalTracer();
  const wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, ctx.request.header)
  // Creating our span with context from incoming request
  const span = tracer.startSpan(ctx.request.path, { childOf: wireCtx })
  // Use the log api to capture a log

  span.log({ event: 'request_received' })
  // Use the setTag api to capture standard span tags for http traces
  span.setTag(opentracing.Tags.HTTP_METHOD, ctx.request.method)
  span.setTag(opentracing.Tags.SPAN_KIND, opentracing.Tags.SPAN_KIND_RPC_SERVER)
  span.setTag(opentracing.Tags.HTTP_URL, ctx.request.path)
  // include trace ID in headers so that we can debug slow requests we see in
  // the browser by looking up the trace ID found in response headers
  const responseHeaders = {}
  tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, responseHeaders)

  ctx.set(responseHeaders);
  console.log("Reporting Span = " + responseHeaders["uber-trace-id"].split(":")[0])
  // add the span to the request object for any other handler to use the span
   Object.assign(ctx.request, { span })

  // finalize the span when the response is completed
  const finishSpan = () => {
    if (ctx.response.statusCode >= 500) {
      // Force the span to be collected for http errors
      span.setTag(opentracing.Tags.SAMPLING_PRIORITY, 1)
      // If error then set the span to error
      span.setTag(opentracing.Tags.ERROR, true)

      // Response should have meaning info to futher troubleshooting
      span.log({ event: 'error', message: ctx.response.status })
    }
    // Capture the status code
    span.setTag(opentracing.Tags.HTTP_STATUS_CODE, ctx.response.status)
    span.log({ event: 'request_end' })
    span.finish()
  }
  ctx.res.on('finish', finishSpan)
    await next();
     
  }




  

