
const sayHello = async (req, res) => {
  const name = req.params.name
    const response = await formatGreetingRemote(name);
    res.send(response)
}

const bent = require('bent')
const formatGreetingRemote = async (name) => {
  const service = process.env.SERVICE_FORMATTER || 'localhost'
  const servicePort = process.env.SERVICE_FORMATTER_PORT || '8081'
  const url = `http://${service}:${servicePort}/formatGreeting?name=${name}`
  const headers = {}
  const request = bent('string', headers)
  const response = await request(url)
  return response
}

module.exports = sayHello
