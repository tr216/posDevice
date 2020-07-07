var nodemailer=require('nodemailer')
var htmlToText = require('html-to-text')
var emailvalidator = require("email-validator")

exports.sendMail = function (mailto,subject, body,cb){
    try {
        if(!emailvalidator.validate(mailto))
            return cb({code:"EMAIL_NOT_VALID",message:"Email gecersiz."})

        var smtpTransport = require('nodemailer-smtp-transport')
        
        subject = htmlToText.fromString(subject, {wordwrap: 130})
        body = htmlToText.fromString(body, {wordwrap: 130})
        
        var transporter = nodemailer.createTransport(smtpTransport({
            host: 'smtp.yandex.com',
            port: 587,
            secure:false,
            auth: {
                user: 'keloglan@tr216.com',
                pass: 'atabar18'
            },
            tls: { rejectUnauthorized: false }
        }))

        var mailOptions = {
            from: 'keloglan@tr216.com', 
            to: mailto,  

            subject: subject + '', // Subject line
            text: body + '', // plaintext body
            html: body + '' // html body
        }
        
        // send mail with defined transport object
       transporter.sendMail(mailOptions, (error, info)=>{
       	console.log(`mail error:`,error)
       	console.log(`info:`,info)
            transporter.close()
            if (error) {
                cb(error)
            }else{
                cb(null,info.response)
            }
            
        })
    } catch ( err ) {
        
        cb(err)
    }
}

exports.sendErrorMail=(subject,err,cb)=>{
	var body='Error:<br>'
	if(typeof err=='string'){
		body += err
	}else{
		body +='code:' + (err.code || err.name || '') + '<br>'
		body +='message:' + (err.message || '')
	}
	exports.sendMail('alitek@gmail.com',subject,body,cb)
}