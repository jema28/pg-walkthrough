const {Pool} = require("pg")
require('env2')('./config.env')

const connectionString = process.env.DB_URL

if (!connectionString) {
  throw new Error("Please set a DB_URL environment variable")
}

module.exports = new Pool({
  connectionString,
  ssl: !connectionString.includes("localhost")
})