
global.fs=require('fs')
global.path=require('path')
var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var logger = require('morgan')
var favicon = require('serve-favicon')

global.util = require('./bin/util')
global.privateConfig={}
if(fs.existsSync('./private-config.json')){
	global.privateConfig=require('./private-config.json')
}

global.mail=require('./bin/mail')


var indexRouter = require('./routes/index')
var dbLoader = require('./db/db-loader')

var app = express()
var cors = require('cors')
app.use(cors())
var flash = require('connect-flash')

app.use(logger('dev'))
app.use(bodyParser.json({limit: "100mb"}))
app.use(bodyParser.urlencoded({limit: "100mb", extended: true, parameterLimit:50000}))
app.use(cookieParser())

indexRouter(app)

testControllers(false)

app.set('name',require('./package').name)
app.set('version',require('./package').version)
app.set('port',config.httpserver.port)

module.exports=(cb)=>{
	dbLoader((err)=>{
		if(!err){
			global.taskHelper=require('./bin/taskhelper')
			global.posDevice=require('./services/pos-device/pos-device')
			posDevice.start()
			cb(null,app)
		}else{
			cb(err)
		}
	})
}


process.on('uncaughtException', function (err) {
	errorLog('Caught exception: ', err)
	
	mail.sendErrorMail(`Err ${config.status} ${app.get('name')}`,err,(mailErr,info)=>{
		if(mailErr)
			console.log(`mailErr:`,mailErr)
		console.log(`mail info:`,info)
		process.exit(0)
	})

})


/* [CONTROLLER TEST] */
function testControllers(log){
	moduleLoader(path.join(__dirname,'controllers'),'.controller.js',(log?'controllers testing':''),(err,holder)=>{
		if(err)
			throw err
		else{
			eventLog(`test controllers OK ${Object.keys(holder).length.toString().yellow}`)
			
		}
	})
}