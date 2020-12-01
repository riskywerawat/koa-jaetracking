const Koa = require('koa');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();


const port = 8081
const serviceName = process.env.SERVICE_NAME || 'service-b'

// Initialize the Tracer
const tracer = initTracer(serviceName)
const opentracing = require('opentracing')
opentracing.initGlobalTracer(tracer)


// Using the span inside a route handler
// Instrument every incomming request

app.use(router.routes());
app.use(router.allowedMethods());
router.use(tracingMiddleWare);
const formatter = require('./formatter')
router.get('/formatGreeting',formatter);

app.listen(port, () => console.log(`Service ${serviceName} listening on port ${port}!`))

function initTracer (serviceName) {
  const initJaegerTracer = require('jaeger-client').initTracerFromEnv

  // Sampler set to const 1 to capture every request, do not do this for production
  const config = {
    serviceName: serviceName
  }
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
  const wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, ctx.request.headers)
  // Creating our span with context from incoming request
  const span = tracer.startSpan(ctx.path, { childOf: wireCtx })
  // Use the log api to capture a log
  console.log('opentracing.Tags.HTTP_METHOD',opentracing.Tags.HTTP_METHOD);
  console.log('opentracing.Tags.SPAN_KIND',opentracing.Tags.SPAN_KIND);
  span.log({ event: 'request_received' })
  // Use the setTag api to capture standard span tags for http traces
  span.setTag(opentracing.Tags.HTTP_METHOD, ctx.method)
  span.setTag(opentracing.Tags.SPAN_KIND, opentracing.Tags.SPAN_KIND_RPC_SERVER)
  span.setTag(opentracing.Tags.HTTP_URL, ctx.path)
  // include trace ID in headers so that we can debug slow requests we see in
  // the browser by looking up the trace ID found in response headers
  const responseHeaders = {}
  tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, responseHeaders)
  ctx.set(responseHeaders);
  console.log('responseHeaders',responseHeaders);
  console.log("Reporting Span = " + responseHeaders["uber-trace-id"].split(":")[0])
  // add the span to the request object for any other handler to use the span
  await Object.assign(ctx.request, { span })

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