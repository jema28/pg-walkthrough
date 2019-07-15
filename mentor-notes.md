# Pg Walkthrough Notes

This workshop is intended to be delivered as a code-along. This file contains the mentor notes, and the `step-*` folders in the same directory as this file contain the correct code after the corresponding step. There is no `step-1` folder as step 1 is simply inspecting the files. The students should code in the root directory.

## Step 1: Introduction to the files

1. Clone the repo and install the dependencies in root: `npm i`

2. Open `src/handler.js`. Here we see the `/static` endpoint reads and serves a file called `static.js`.

3. Open `src/static.js`. We see that it contains a data array with two superhero objects.

4. Run `npm start` in command line and navigate to `http://localhost:3000/static` in the browser.
   - Here we see our hardcoded, static, data from `static.js`. Storing/loading dynamic data in files is bad, because file I/O is inefficient and should just be used for server load/config data.
   - In this code-along we're going to create an alternative to this by serving the data from a database instead of a static file. You will learn how to build a database using SQL, connect your app to the database with javascript and the module 'pg', and send data from your database to the client!

## Step 2: Setting up the database

1. Create a folder inside the root project: `database`. In the folder `database`, we're going to setup the structure/schema of our database, and hardcoded data.

2. Create a new file: `database/db_build.sql`.

   1. Put a `BEGIN;` at the start of the file and a `COMMIT;` at the end of the file.

   2. Write `DROP TABLE IF EXISTS superheroes CASCADE;` between these above two lines.

      - This line drops our database each time this file is run.
        > ONLY RUN IT ONCE. This file should never be used in production other than for initialisation. You only want to use this to reset your test database (and can add mock data for it).

      To update your schema, you can create separate update scripts.

      - Cascade will delete tables with relations (that have a REFERENCE defined towards) to `superheroes` too.

   3. Write the schema:

      ```sql
      CREATE TABLE superheroes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        superPower TEXT NOT NULL,
        weight INTEGER DEFAULT 100
      );
      ```

      - All tables should have an integer `id` that is set as a `PRIMARY KEY` - this is used relate databased together (integer PRIMARY KEY helps with performance)
      - `PRIMARY KEY` also adds `UNIQUE` and `NOT NULL` (primary keys have to be unique).
      - `VARCHAR(LENGTH)`, `INTEGER`, `TEXT` (unlimited length, but larger data usage), etc are SQL data types.
      - `NOT NULL` tells the PostgreSQL to give an error if this is not set.
      - `DEFAULT 100` changes `NULL` values to be `100`.

   4. Initialise some mock/hardcoded data:

      ```sql
      INSERT INTO superheroes (name, superPower, weight) VALUES
        ('Wolverine', 'Regeneration', 300),
        ('Captain Marvel', 'Shoots concussive energy bursts from her hands', 165),
        ('Iron Man', 'None', 425);
      ```

      - Rows separated with commas and each bracket, `(comma-separated values inside here)`, has a row inside it with values

## Step 3 – Connecting and building the database

Pg is a non-blocking PostgreSQL client for node.js that lets you access SQL values as JavaScript data values. Translates data types appropriately to/from JS data types.

Our database is now outlined, but we need a way to connect it

1. Create a new file: `database/db_connection.js`.

2. Install the npm packages `pg` and `env2`: `npm i pg env2`

3. Add the following:

```js
const { Pool } = require('pg')
require('env2')('./config.env')

const connectionString = process.env.DB_URL

if (!connectionString) {
  throw new Error('Please set a DB_URL environment variable')
}

module.exports = new Pool({
  connectionString,
  ssl: !connectionString.includes('localhost')
})
```

- Connection pooling refers to the method of creating a pool of connections and caching those connections so that it can be reused again.
- `ssl` will enable SSL (set to true) if you're not testing on a local machine. TLS / SSL (Secure Sockets Layer) ensures that you are connecting to the database from a secure server, preventing external networks from being able to read/manipulate database queries with MITM attacks

4. Create a file: `database/db_build.js` with this code:

   ```js
   const fs = require('fs')

   const dbConnection = require('./db_connection')
   // previously exported pool object

   const sql = fs.readFileSync(`${__dirname}/db_build.sql`).toString()
   // `sql` is a string of the build script.

   dbConnection.query(sql, (err, res) => {
     if (err) throw err
     console.log('Super heroes table created with result: ', res)
   })
   ```

   - For getting data, `dbConnection.query` takes the arguments `dbConnection.query(<sql query string goes here>, <callback function with (err, res)>)`
   - For posting data, `dbConnection.query` takes the arguments `dbConnection.query('INSERT INTO table_name (name) VALUES ($1) TO ', [name], <callback function with (err, res)>`
   - This file should only be run separately. NEVER run this in a production after setup, or from other files (unless you know what you're doing).

## Step 4 – Building the database

Now that we have all the correct files, let's get this database up and running.

1. In your command line, run `psql` (Mac/Linux) or `sudo -u postgres psql` (Linux).

2. Create the database by typing `CREATE DATABASE film;` into your Postgres CLI client.

3. Create a user specifically for the database with a password by typing `CREATE USER [the new username] WITH PASSWORD '[the password of the database]'`;

   - The password needs to be in single-quotes, otherwise you get an error
   - For security: In production/public facing server, clear command history and use a password manager with 25+ random characters - and use a firewall

4. Change ownership of the database to the new user by typing `GRANT ALL PRIVILEGES ON DATABASE [name of the database] TO [the new username];`.

5. Add a config.env file and add the database's url in this format: `DB_URL = postgres://[username]:[password]@localhost:5432/[database]`

6. Now we build the tables we set out in db_build.sql by running our `db_build.js` file by running: `node database/db_build.js` in command line.

7. Try connecting to the database by typing `psql postgres://[username]:[password]@localhost:5432/[database]` and test if everything worked by typing `SELECT * FROM superheroes;`. You should see the data we entered in `db_build.sql` appear.

If you experience permission problems, try running `psql film` then `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO [the new username];`

## Step 5 – connecting to our database from the server

Let's first write a file that gets our information from the database.

1. Create a `queries` folder and `getData.js` file: `database/queries/getData.js`.

2. Import `db_connection.js` and write an asynchronous `getData` function that takes and returns a callback.

   ```js
   const dbConnection = require('../database/db_connection')

   const getData = cb => {
     dbConnection.query('SELECT * FROM superheroes', (err, res) => {
       if (err) {
         return cb(err)
       }
       cb(null, res.rows)
     })
   }

   module.exports = getData
   ```

3. Import `getData.js` in `handler.js` and call getData in 'dynamic' endpoint

   ```js
   const getData = require('./database/queries/getData')

   if (endpoint === '/dynamic') {
     getData((err, res) => {
       if (err) {
         return console.log(err)
       }
       let dynamicData = JSON.stringify(res)
       response.writeHead(200, { 'content-type': 'application/json' })
       response.end(dynamicData)
     })
   }
   ```

4. Navigate to `http://localhost:3000/dynamic` to check it's worked.
