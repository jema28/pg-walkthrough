const http = require('http')
const handler = require('./handler')

const server = http.createServer(handler)
const port = process.env.PORT || 3000

server.listen(port, () => console.log(`Server listening on http://localhost:${port}`))