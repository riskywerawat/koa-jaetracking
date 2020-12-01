

function formatGreeting(req, res) {
  const name = req.query.name

  const response = `Hello from service-b ${name}!`

  res.send(response)
}
module.exports = formatGreeting
