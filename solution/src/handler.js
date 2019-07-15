const getData = require('../database/queries/getData')
const staticSuperHeroes = require('./static')

const handler = (request, response) => {
  let endpoint = request.url

  if (endpoint === '/static') {
    let staticData = JSON.stringify(staticSuperHeroes)
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(staticData)
  }

  if (endpoint === '/dynamic') {
    getData((err, res) => {
      if (err) {
        return console.log(err)
      }
      let dynamicData = JSON.stringify(res)
      response.writeHead(200, {'content-type': 'application/json'})
      response.end(dynamicData)
    })
  }
}

module.exports = handler
