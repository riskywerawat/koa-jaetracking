const { request } = require('express')
const opentracing = require('opentracing')
const tracer = opentracing.globalTracer()

async function formatGreeting(ctx,next) {
  // You can re-use the parent span or create a child span
  const span = tracer.startSpan('format-greeting', { childOf: ctx.request.span })
  // Parse the handler input
  const name = ctx.query.name
  span.log({ event: 'format', message: `formatting message remotely for name ${name}` })
  // check the baggage
  const baggage = span.getBaggageItem('my-baggage')
  span.log({ event: 'propagation', message: `this is baggage ${baggage}` })
  const response = `Hello from service-b ${name}!`
  span.finish()
  ctx.body =response;
}
module.exports = formatGreeting
