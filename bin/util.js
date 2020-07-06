var os=require('os')
var request=require('request')
var parseString = require('xml2js').parseString
var js2xmlparser = require("js2xmlparser")

global.uuid=require('uuid');

Date.prototype.yyyymmdd = function () {
    var yyyy = this.getFullYear().toString()
    var mm = (this.getMonth() + 1).toString() // getMonth() is zero-based
    var dd = this.getDate().toString()
    var HH = this.getHours().toString()
    var min = this.getMinutes().toString()
    var sec = this.getSeconds().toString()
    return yyyy + '-' + (mm[1]?mm:"0" + mm[0]) + '-' + (dd[1]?dd:"0" + dd[0]) 
}

Date.prototype.yyyymmddhhmmss = function (middleChar) {
    var yyyy = this.getFullYear().toString()
    var mm = (this.getMonth() + 1).toString() // getMonth() is zero-based
    var dd = this.getDate().toString()
    var HH = this.getHours().toString()
    var min = this.getMinutes().toString()
    var sec = this.getSeconds().toString()
    return yyyy + '-' + (mm[1]?mm:"0" + mm[0]) + '-' + (dd[1]?dd:"0" + dd[0]) + (middleChar?middleChar:' ') + (HH[1]?HH:"0" + HH[0]) + ':' + (min[1]?min:"0" + min[0]) + ':' + (sec[1]?sec:"0" + sec[0]) 
}

Date.prototype.yyyymmddmilisecond = function () {
    var yyyy = this.getFullYear().toString()
    var mm = (this.getMonth() + 1).toString() // getMonth() is zero-based
    var dd = this.getDate().toString()
    var HH = this.getHours().toString()
    var min = this.getMinutes().toString()
    var sec = this.getSeconds().toString()
    var msec = this.getMilliseconds().toString()
    return yyyy + '-' + (mm[1]?mm:"0" + mm[0]) + '-' + (dd[1]?dd:"0" + dd[0]) + ' ' + (HH[1]?HH:"0" + HH[0]) + ':' + (min[1]?min:"0" + min[0]) + ':' + (sec[1]?sec:"0" + sec[0]) + '.' + msec 
}


Date.prototype.addDays = function(days)
{
    var dat = new Date(this.valueOf())
    dat.setDate(dat.getDate() + days)
    return dat
}



exports.timeStamp = function () { return (new Date).yyyymmddhhmmss() }  //UTC time stamp


exports.datefromyyyymmdd = function (text) {
    var yyyy = Number(text.substring(0,4))
    var mm = Number(text.substring(5,7))
    var dd = Number(text.substring(8,10))
    var tarih=new Date(yyyy,mm-1,dd,5,0,0)
    //tarih.setDate(tarih.getDate() + 1)
    return tarih
}


String.prototype.replaceAll = function (search, replacement) {
    var target = this
    return target.split(search).join(replacement)
    // var target = this
    // return target.replace(new RegExp(search, 'g'), replacement)
}

exports.replaceAll= function (search, replacement) {
    var target = this
    return target.replace(new RegExp(search, 'g'), replacement)
}


global.atob=require('atob')
global.btoa=require('btoa')

global.tempLog=(fileName,text)=>{
	if(config.status!='development')
		return
	var tmpDir=os.tmpdir()
	if(config)
		if(config.tmpDir)
			tmpDir=config.tmpDir
	fs.writeFileSync(path.join(tmpDir,fileName),text,'utf8')
}

global.moduleLoader=(folder,suffix,expression,cb)=>{
    try{
    	var moduleHolder={}
        var files=fs.readdirSync(folder)
        
        files.forEach((e)=>{
        	let f = path.join(folder, e)
            if(!fs.statSync(f).isDirectory()){
                var fileName = path.basename(f)
                var apiName = fileName.substr(0, fileName.length - suffix.length)
                if (apiName != '' && (apiName + suffix) == fileName) {
                    moduleHolder[apiName] = require(f)
                }
            }
        })
        
        cb(null,moduleHolder)
    }catch(e){
		errorLog(
	`moduleLoader Error:
		folder:${folder} 
		suffix:${suffix}
		expression:${expression}
		`)
		cb(e)
    }
}

global.downloadFile=(file,req,res)=>{
    var contentType=file.contentType || file.type || 'text/plain'
    var data
    res.contentType(contentType)
    if(contentType.indexOf('text')>-1){
        data=file.data
    }else{
        var raw = atob(file.data)
        var rawLength = raw.length
        var array = new Uint8Array(new ArrayBuffer(rawLength))
        raw.forEach((e,index)=>{
        	array[index] = raw.charCodeAt(index)
        })
        
        eventLog('rawLength:',rawLength)
        eventLog('array.Length:',array.length)
        data=Buffer.from(array)
        res.set('Content-Disposition','attachment filename=' + file.fileName )
    }

    // res.status(200).send(data, { 'Content-Disposition': 'attachment filename=' + file.fileName })
    res.status(200).send(data)
}

global.clone=(obj)=>{
    return JSON.parse(JSON.stringify(obj))
}

global.iteration=(dizi, fonksiyon, interval=0, errContinue=false, callback)=>{
	var index=0
	var result=[]
	var errors=''

	function tekrar(cb){
		if(index>=dizi.length)
			return cb(null)
		if(config.status=='dev' && index>=3){
			return cb(null)
		}
		fonksiyon(dizi[index],(err,data)=>{
			if(!err){
				if(data) result.push(result)
				index++
				setTimeout(tekrar,interval,cb)
			}else{
				errorLog(`iteration():`,err)
				if(errContinue){
					errors +=`iteration(): ${err.message}\n`
					index++
					setTimeout(tekrar,interval,cb)
				}else{
					cb(err)
				}
				
			}
		})
	}

	tekrar((err)=>{
		if(!err){
			if(errContinue && errors!=''){
				callback({code:'IterationError',message:errors},result)
			}else{
				callback(null,result)
			}
		}else{
			callback(err,result)
		}
		
	})
}


exports.renameKey=(key)=>{
		switch(key){
			case 'UUID': return 'uuid'
			case 'ID': return 'ID'
			case 'URI': return 'URI'
			case '$': return 'attr'
		}
		if(key.length<2) return key
		key=key[0].toLowerCase() + key.substr(1,key.length-1)
		if(key.substr(key.length-2,2)=='ID' && key.length>2){
			key=key.substr(0,key.length-2) + 'Id'
		}
		return key
	}

exports.renameInvoiceObjects=(obj,renameFunction)=>{
	
	if(Array.isArray(obj)){
		var newObj=[]
		obj.forEach((e)=>{
			newObj.push(exports.renameInvoiceObjects(e,renameFunction))
		})
		
		return newObj
	}else if (typeof obj==='object'){
		var newObj={}

		var keys=Object.keys(obj)
		keys.forEach((key)=>{
			var newKey=renameFunction(key)
			if((Array.isArray(obj[key]) || typeof obj==='object') && (key!='$')){
				newObj[newKey]=exports.renameInvoiceObjects(obj[key],renameFunction)
			}else{
				newObj[newKey]=obj[key]
			}
		})
		return newObj
	}else{
		return obj
	}
}


var edespatchXmlHazirla=(obj)=>einvoiceXmlHazirla(obj)

exports.e_despatch2xml=function(doc,rootName='DespatchAdvice'){
	
	try{


    var jsObject=JSON.parse(JSON.stringify(doc))

    jsObject=exports.deleteObjectFields(jsObject,[
		"_id","createdDate","modifiedDate","deleted","__v",
		"eIntegrator",'ioType','despatchErrors','despatchStatus',
		'localStatus','localErrors','pdf','html','despatchXslt','despatchXsltFiles',
		'location','location2','subLocation','subLocation2','despatchPeriod',
		'originatorCustomerParty','localDocumentId'
		])
    jsObject=exports.deleteObjectProperty(jsObject,'_id')
    jsObject=exports.deleteObjectProperty(jsObject,'identityDocumentReference')
    jsObject=exports.deleteObjectProperty(jsObject,'financialAccount')
    jsObject=exports.deleteObjectProperty(jsObject,'otherCommunication')
    
    
    if(jsObject.despatchLine!=undefined){
        
        jsObject.despatchLine.forEach((line)=>{
            if(line.taxTotal!=undefined){
                if(line.taxTotal.taxAmount!=undefined){
                    if(line.taxTotal.taxAmount.value==0 && line.taxTotal.taxSubTotal==undefined){
                        line.taxTotal=undefined
                        delete line.taxTotal
                        
                    }
                }
            }
            if(line.item)
                if(line.item.originCountry)
                    if(line.item.originCountry.identificationCode)
                        if((line.item.originCountry.identificationCode.value || '')==''){
                            line.item.originCountry=undefined
                            delete line.item.originCountry
                            eventLog('calisti delete line.item.originCountry')
                        }
        })
    }

    jsObject=edespatchXmlHazirla(jsObject)
    
    var options={
        attributeString:'attr',
        valueString:'value',
        declaration:{
            include:false,
            encoding:'UTF-8',
            version:'1.0'
        },
        format:{
            doubleQuotes:true
        }
    }
 
    var despatchAttr={
        'xmlns:ds' : 'http://www.w3.org/2000/09/xmldsig#',
        'xmlns:qdt' : 'urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2',
        'xmlns:cctc' : 'urn:un:unece:uncefact:documentation:2',
        'xmlns:ubltr' : 'urn:oasis:names:specification:ubl:schema:xsd:TurkishCustomizationExtensionComponents',
        'xmlns:xsi' : 'http://www.w3.org/2001/XMLSchema-instance',
        'xmlns:udt' : 'urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2',
        'xmlns' : 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        'xmlns:cac' : 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:ext' : 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2' ,
        'xmlns:cbc' : 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2' ,
        'xmlns:xades' : 'http://uri.etsi.org/01903/v1.3.2#',
        'xsi:schemaLocation':'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2 UBL-DespatchAdvice-2.1.xsd',
        'xmlns:q1' : 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2'
    }
 
    var obj={
        'attr':despatchAttr,
        'cbc:UBLVersionID':'2.1',
        'cbc:CustomizationID':'TR1.2.1',
        'cbc:CopyIndicator':'false'
    }
    Object.keys(jsObject).forEach((key)=>{
        if(Object.keys(obj).indexOf(key)<0){
            obj[key]=jsObject[key]
        }
    })
    var xmlString=js2xmlparser.parse(rootName, obj, options)
    xmlString=xmlString.replace('</cbc:ID>','</cbc:ID><cbc:CopyIndicator>false</cbc:CopyIndicator>')
    xmlString=xmlString.replaceAll('<cbc:TaxExemptionReason/>','')
    xmlString=xmlString.replaceAll('<cbc:TaxExemptionReasonCode/>','')
    xmlString=xmlString.replaceAll('<cbc:IssueDate/>','')
    xmlString=xmlString.replaceAll('[object Object]','')
    // xmlString=xmlString.replaceAll('<cbc:ID/>','')
    return xmlString
}catch(tryErr){
	console.error('e_despatch2xml.tryErr',tryErr)
}
}

exports.amountValueFixed2Digit=function(obj,parentKeyName){
    if ( typeof(obj) === 'undefined' || obj === null ) return obj
    if(Array.isArray(obj)){
        obj.forEach((e)=>{
        	e=exports.amountValueFixed2Digit(e,parentKeyName)
        })
            
        return obj
    }else if (typeof obj=='object'){
        var keys=Object.keys(obj)
        
        keys.forEach((key)=>{
            if ( typeof(obj) !== 'undefined' && obj !== null ){
                if(Array.isArray(obj[key]) || typeof obj[key]=='object'){
                    obj[key]=exports.amountValueFixed2Digit(obj[key],key)
                }else{
                    if(parentKeyName.toLowerCase().indexOf('amount')>-1){
                        if(key=='value'){
                            if(!isNaN(obj[key])){
                                obj[key]=Number(obj[key]).toFixed(2)
                            }
                            
                        }
                    }
                }
            }
        })
        return obj
    }else{
        return obj
    }
}

function einvoiceXmlHazirla(obj){
    if(Array.isArray(obj)){
        var newObj=[]
        obj.forEach((e)=>{
        	newObj.push(einvoiceXmlHazirla(e))
        })
        
        return newObj
    }else if (typeof obj==='object'){
        var newObj={}
        

        var keys=Object.keys(obj)
        
        keys.forEach((key)=>{
            if(key!='attr' && key!='value'){
                var key2=key
                if((Array.isArray(obj[key]) || typeof obj[key]==='object' )){
                    key2='cac:' + exports.eInvoiceRenameKeys(key)
                    if(typeof obj[key]==='object'){
                        if(Object.keys(obj[key]).indexOf('value')>-1){
                            key2='cbc:' + exports.eInvoiceRenameKeys(key)
                        }
                    }
                    newObj[key2]=einvoiceXmlHazirla(obj[key])
                }else{
                    key2='cbc:' + exports.eInvoiceRenameKeys(key)
                    newObj[key2]=obj[key]
                }
            }else{
                newObj[key]=obj[key]
            }
            
        })
        
        
        return newObj
    }else{
        return obj
    }
}

exports.deleteObjectFields = function (obj,fields) {
    if(obj!=undefined){
        if(typeof obj['limit']!='undefined' && typeof obj['totalDocs']!='undefined' && typeof obj['totalPages']!='undefined' && typeof obj['page']!='undefined'){
            obj['pageSize']=obj.limit
            obj.limit=undefined
            delete obj.limit

            obj['recordCount']=obj.totalDocs
            obj.totalDocs=undefined
            delete obj.totalDocs

            obj['pageCount']=obj.totalPages
            obj.totalPages=undefined
            delete obj.totalPages

        }
    }

    if(obj==undefined || fields==undefined) return obj
    if(obj==null || fields==null) return obj
    
    for(var key in obj){

        if(fields.indexOf(key.toString())>=0){
            obj[key]=undefined
            delete obj[key]
        }

    }
    
    return obj
}



exports.deleteObjectProperty=function(obj,propertyName){
    if(obj==null) return {}

    if(Array.isArray(obj)){
        // eventLog('typeof obj: array[] length:',obj.length)
        var newObj=[]
        obj.forEach((e)=>{
        	newObj.push(exports.deleteObjectProperty(e,propertyName))
        })
        return newObj
    }else if (typeof obj==='object'){
        var newObj={}

        if(obj[propertyName]!=undefined){
            obj[propertyName]=undefined
            delete obj[propertyName]
        }
        if(propertyName.indexOf('*')>-1){
            var keys=Object.keys(obj)
            var s=propertyName.replaceAll('*','')
            keys.forEach((e)=>{
                if(e.indexOf(s)>-1){
                    obj[e]=undefined
                    delete obj[e]
                }
            })
        }

        var keys=Object.keys(obj)
        keys.forEach((key)=>{
            // eventLog('key:',key)
            if(Array.isArray(obj[key]) || typeof obj[key]==='object'){
                // eventLog('typeof obj:',(typeof obj),key)
                newObj[key]=exports.deleteObjectProperty(obj[key],propertyName)
            }else{
                newObj[key]=obj[key]
            }
        })
        
        return newObj
    }else{
        return obj
    }
}

exports.eInvoiceRenameKeys=(key)=>{

    switch(key){
        case 'uuid': return 'UUID'
        case 'id': return 'ID'
        case 'uri': return 'URI'
        //case 'attr': return '@'
    }
    if(key.length<2) return key
    key=key[0].toUpperCase() + key.substr(1,key.length-1)
    if(key.substr(key.length-2,2)=='Id' && key.length>2){
        key=key.substr(0,key.length-2) + 'ID'
    }
    return key
}