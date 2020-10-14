const config = require('config')
const fs = require('fs')
const express = require('express')

const cors = require('cors')
const morgan = require('morgan')
const MBTiles = require('@mapbox/mbtiles')
const TimeFormat = require('hh-mm-ss')
const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')

// config constants
const morganFormat = config.get('morganFormat')
const htdocsPath = config.get('htdocsPath')
const port = config.get('port') 
const hostname = config.get('hostname') //added
const defaultZ = config.get('defaultZ')
const mbtilesDir = config.get('mbtilesDir')
const logDirPath = config.get('logDirPath')

// global variables
let mbtilesPool = {}
let tz = config.get('tz')
let busy = false

// logger configuration
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: `${logDirPath}/onyx-%DATE%.log`,
      datePattern: 'YYYY-MM-DD'
    })
  ]
})

logger.stream = {
  write: (message) => { logger.info(message.trim()) }
}

// app
const app = express()
app.use(cors())
app.use(morgan(morganFormat, {
  stream: logger.stream
}))
app.use(express.static(htdocsPath))


const generateMbtilesName = (z, x, y) => {
  return "example"
}

const getMBTiles = async (t, z, x, y) => {
  let mbtilesPath = ''
  if (!tz[t]) tz[t] = defaultZ
  
  if (z < tz[t]) {
    const mbtileName = generateMbtilesName(z, x, y)
    mbtilesPath = `${mbtilesDir}/${t}/${mbtileName}.mbtiles`
  } else {
    const mbtileName = generateMbtilesName(tz[t], x >> (z - tz[t]), y >> (z - tz[t]))
    mbtilesPath = `${mbtilesDir}/${t}/${mbtileName}.mbtiles`
  }
  
  console.log(mbtilesPath);
  
  return new Promise((resolve, reject) => {
    if (mbtilesPool[mbtilesPath]) {
      resolve(mbtilesPool[mbtilesPath].mbtiles)
    } else {
      if (fs.existsSync(mbtilesPath)) {
        new MBTiles(`${mbtilesPath}?mode=ro`, (err, mbtiles) => {
          if (err) {
            reject(new Error(`${mbtilesPath} could not open.`))
          } else {
            mbtilesPool[mbtilesPath] = {
              mbtiles: mbtiles, openTime: new Date()
            }
            resolve(mbtilesPool[mbtilesPath].mbtiles)
          }
        })
      } else {
        reject(new Error(`${mbtilesPath} was not found.`))
      }
    }
  })
}

const getTile = async (mbtiles, z, x, y) => {
  return new Promise((resolve, reject) => {
    mbtiles.getTile(z, x, y, (err, tile, headers) => {
      if (err) {
        reject()
      } else {
        resolve({tile: tile, headers: headers})
      }
    })
  })
}

app.get(`/xyz/:t/:z/:x/:y.pbf`, async (req, res) => {
  busy = true
  const t = req.params.t
  const z = parseInt(req.params.z)
  const x = parseInt(req.params.x)
  const y = parseInt(req.params.y)
  getMBTiles(t, z, x, y).then(mbtiles => {
    getTile(mbtiles, z, x, y).then(r => {
      if (r.tile) {
        res.set('content-type', 'application/vnd.mapbox-vector-tile')
        res.set('content-encoding', 'gzip')
        res.set('last-modified', r.headers['Last-Modified'])
        res.set('etag', r.headers['ETag'])
        res.send(r.tile)
        busy = false
      } else {
        res.status(404).send(`tile not found: /xyz/${t}/${z}/${x}/${y}.pbf`)
        busy = false
      }
    }).catch(e => {
      res.status(404).send(`tile not found: /xyz/${t}/${z}/${x}/${y}.pbf`)
      busy = false
    })
  }).catch(e => {
    res.status(404).send(`mbtiles not found for /xyz/${t}/${z}/${x}/${y}.pbf`)
  })
})

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
