

var BasicHttpBinding = require('wcf.js').BasicHttpBinding;
// var CustomBinding = require('wcf.js').CustomBinding;
// var WSHttpBinding = require('wcf.js').WSHttpBinding;
var Proxy = require('wcf.js').Proxy;
var timeout=180000;

function generateRequestMessage(funcName,query,isQuery=true){
    var message =  '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
    '<s:Header />' +
    '<s:Body>' +
    '<s:' + funcName + ' xmlns:s="http://tempuri.org/">'
    if(isQuery){
        message +='<s:query PageIndex="' + (query.pageIndex || query.PageIndex || 0) + '" PageSize="' + (query.pageSize || query.PageSize || 10) + '">';
        for(let k in query){
            if(k!='pageIndex' && k!='PageIndex' && k!='pageSize' && k!='PageSize'){
                if(!Array.isArray(query[k])){
                    message +="<s:" + k + ">" + query[k].toString() + "</s:" + k +">";
                }else{
                    query[k].forEach((e)=>{
                        message +='<s:' + k + '>' + e.toString() + '</s:' + k +'>';
                    });
                }
            }
        }
        message +='</s:query>';
    }else{
        
        for(let k in query){
            if(!Array.isArray(query[k])){
                if(Object.keys(query[k]).indexOf('pageIndex')>-1 || Object.keys(query[k]).indexOf('pageSize')>-1 || Object.keys(query[k]).indexOf('PageIndex')>-1 || Object.keys(query[k]).indexOf('PageSize')>-1){
                    message +='<s:' + k + ' PageIndex="' + (query[k].pageIndex || query.PageIndex || 0) + '" PageSize="' + (query.pageSize || query.PageSize || 10) + '">' + query[k].toString() + '</s:' + k +'>';
                }else{
                    message +='<s:' + k + '>' + query[k].toString() + '</s:' + k +'>';
                }
            }else{
                query[k].forEach((e)=>{
                    message +='<s:' + k + '>' + e.toString() + '</s:' + k +'>';
                });
            }
        }
        
    }
    message +='</s:' + funcName + '>';
    message +='</s:Body>' +
    '</s:Envelope>'
    return message;
}



function seperateItems(response){
    var items=[]
    var s1=-1;
    var s2=-1;
    var i=0;

    while(response.indexOf('<Items',s1+1)>-1){
        s1=response.indexOf('<Items',s1+1); 
        s2=response.indexOf('</Items>',s1);                
        if(s2<0 || s2<s1) break;
        var sbuf=response.substr(s1,s2-s1+8);
        eventLog('sbuf.length:',sbuf.length);
        items.push(sbuf);
    }

    return items;
}

function seperateDespatche(items){
    var despatch=''
    if(!items) return despatch;
    var s1=items.indexOf('<Despatche');
    var s2=items.indexOf('</Despatche>');

    if(s1>-1 && s2>s1){
        despatch=items.substr(s1,s2-s1+10);
    }

    return despatch;
}



function uyumsoftDespatcheStatus(status){
    // NotPrepared, NotSend, Draft, Canceled, Queued, Processing, SentToGib, Approved, WaitingForApprovement, Declined,  Return, EArchivedCanceled, Error,
    //  , , , , WaitingForApprovement, Declined,  Return, , Error,
    //'Draft','Processing','SentToGib','Approved','Declined','WaitingForApprovement','Error'

    switch(status){
        case 'NotPrepared':
        case 'NotSend':
        case 'Draft':
        case 'Canceled':
        case 'EArchivedCanceled':
        return 'Draft';

        case 'Queued':
        case 'Processing':
        return 'Processing';

        case 'SentToGib':
        return 'SentToGib';

        case 'Approved':
        return 'Approved';

        case 'Return':
        case 'Declined':
        return 'Declined';

        case 'WaitingForApprovement':
        return 'WaitingForApprovement';

        case 'Error':
        return 'Error';

        default:
        return 'Unknown';
    }
}

function uyumsoftDespatcheProfileID(typeCode){
    switch(typeCode){
        case 'BaseDespatche':
        case '0':
        return 'TEMELFATURA';
        case 'ComercialDespatche':
        case '1':
        return 'TICARIFATURA';
        case 'DespatcheWithPassanger':
        case '2':
        return 'YOLCUBERABERFATURA';
        case 'Export':
        case '3':
        return 'IHRACAT';
        case 'eArchive':
        case '4':
        return 'EARSIVFATURA';
        default:
        return 'TEMELFATURA';
    }
}

/**
* @query :{CreateStartDate:Date, CreateEndDate:Date, ExecutionStartDate:Date, ExecutionEndDate:Date, PageIndex:Number, PageSize:Number
* , Status:String, OnlyNewestDespatches:Boolean, DespatcheNumbers:String[] , DespatcheIds: String[]}
*
*  Status in NotPrepared, NotSend, Draft, Canceled, Queued, Processing, SentToGib, Approved, WaitingForApprovement, Declined, Return, EArchivedCanceled, Error
*/


exports.getInboxDespatcheList = function (options,query,mainCallback) {
    var timeIsUp=false;
    var stopTimer=false;

    var callback=function(...obj){
        stopTimer=true;
        if(!timeIsUp) return mainCallback(...obj);
        else return;
    }
    setTimeout(()=>{
        if(stopTimer) return;
        eventLog('Zaman asimi oldu'.green);
        timeIsUp=true;
        return mainCallback({code:'TIME_OUT',message:'Zaman asimi oldu'});
        
    }, timeout)
    try{ 

        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })

        var proxy = new Proxy(binding, options.url);
        
        // var proxy = new Proxy(binding, 'https://efatura.uyumsoft11.com.tr/');
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('GetInboxDespatcheList',query);
        
        eventLog('before: proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatcheList", function(response, ctx) {')
        proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatcheList", function(response, ctx) {
            eventLog('after: proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatcheList", function(response, ctx) {')

            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            
            eventLog('before: mrutil.xml2json(response,(err,jsObject)=>{')
            mrutil.xml2json(response,(err,jsObject)=>{
                eventLog('after: mrutil.xml2json(response,(err,jsObject)=>{')
                if(!err){
                    
                    if(jsObject['s:Envelope']['s:Body'][0]['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body'][0]['s:Fault'][0]['faultstring'][0]['_'];
                        return callback({code:'WebServiceError',message:errorMessage});
                        
                        
                    }
                    if(jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatcheListResponse'][0]['GetInboxDespatcheListResult'][0]['$'].IsSucceded=='true'){
                        var result={
                            page:0,
                            pageSize:0,
                            recordCount: 0,
                            pageCount: 0,
                            docs:[]
                        }

                        // result.page= query.PageIndex;
                        // result.pageSize=query.PageSize;
                        result.page= Number(jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatcheListResponse'][0]['GetInboxDespatcheListResult'][0]['Value'][0]['$'].PageIndex);
                        result.pageSize=Number(jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatcheListResponse'][0]['GetInboxDespatcheListResult'][0]['Value'][0]['$'].PageSize);
                        result.recordCount= Number(jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatcheListResponse'][0]['GetInboxDespatcheListResult'][0]['Value'][0]['$'].TotalCount);
                        result.pageCount=Number(jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatcheListResponse'][0]['GetInboxDespatcheListResult'][0]['Value'][0]['$'].TotalPages);
                        
                        var items=jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatcheListResponse'][0]['GetInboxDespatcheListResult'][0]['Value'][0]['Items'];
                        if(items){
                            for(var i=0;i<items.length;i++){
                                
                                var obj={
                                    ioType:1,
                                    profileId:uyumsoftDespatcheProfileID(items[i]['Type'][0]),
                                    id:items[i]['DespatcheId'][0],
                                    uuid:items[i]['DocumentId'][0],
                                    issueDate:items[i]['ExecutionDate'][0].toString().substr(0,10),
                                    issueTime:items[i]['ExecutionDate'][0].toString().substr(11,8),
                                    despatchType:'SATIS',
                                    accountingParty:{
                                        tcknVkn:items[i]['TargetTcknVkn']!=undefined?(items[i]['TargetTcknVkn'][0]) || '':'',
                                        title:items[i]['TargetTitle']!=undefined?(items[i]['TargetTitle'][0]|| ''):''
                                    },
                                    payableAmount:Number(items[i]['PayableAmount'][0]),
                                    taxExclusiveAmount:Number(items[i]['TaxExclusiveAmount'][0]),
                                    taxTotal:Number(items[i]['TaxTotal'][0]),
                                    taxSummary :{
                                        vat1:Number(items[i]['Vat1'][0]),
                                        vat8:Number(items[i]['Vat8'][0]),
                                        vat18:Number(items[i]['Vat18'][0]),
                                        vat0TaxableAmount:Number(items[i]['Vat0TaxableAmount'][0]),
                                        vat1TaxableAmount:Number(items[i]['Vat1TaxableAmount'][0]),
                                        vat8TaxableAmount:Number(items[i]['Vat8TaxableAmount'][0]),
                                        vat18TaxableAmount:Number(items[i]['Vat18TaxableAmount'][0])
                                    },
                                    withHoldingTaxTotal:0,
                                    documentCurrencyCode:items[i]['DocumentCurrencyCode'][0],
                                    exchangeRate:Number(items[i]['ExchangeRate'][0]),
                                    
                                    status:uyumsoftDespatcheStatus(items[i]['Status'][0])
                                }
                                result.docs.push(obj);
                            }
                            callback(null,result);
                        }else{
                            callback(null,result);
                        }
                    }else{
                        callback({code:'UNSUCCESSFUL',message:'Uyumsoft E-DespatcheDownload Basarisiz'});
                    }
                    
                    
                }else{
                    callback({code:'XML2JSON_ERROR',message:(err.name || err.message || err.toString())});
                }
            });


});

}catch(tryErr){
    callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || tryErr});
}
}


/**
* @query :{ despatchId: String}
*/
exports.getInboxDespatche = function (options,despatchId,mainCallback) {
    var timeIsUp=false;
    var stopTimer=false;

    var callback=function(...obj){
        stopTimer=true;
        if(!timeIsUp) return mainCallback(...obj);
        else return;
    }
    setTimeout(()=>{
        if(stopTimer) return;
        eventLog('Zaman asimi oldu'.green);
        timeIsUp=true;
        return mainCallback({code:'TIME_OUT',message:'Zaman asimi oldu'});
        
    }, timeout)
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        // var proxy = new Proxy(binding, 'https://efatura.uyumsoft11.com.tr/');
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('GetInboxDespatche',{despatchId:despatchId},false);
        eventLog('before: proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatche", function(response, ctx) {')
        proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatche", function(response, ctx) {
            eventLog('after: proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatche", function(response, ctx) {')
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }

            mrutil.xml2json3(response,(err,jsObject)=>{
                if(!err){
                    if(jsObject['s:Envelope']['s:Body']['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body']['s:Fault']['faultstring'];

                        return callback({code:'WebServiceError',message:errorMessage});
                    }

                    try{
                        if(jsObject['s:Envelope']['s:Body']['GetInboxDespatcheResponse']['GetInboxDespatcheResult']['$'].IsSucceded=='true'){
                            var result={
                                IsSucceded: true, 
                                doc:{despatch:jsObject['s:Envelope']['s:Body']['GetInboxDespatcheResponse']['GetInboxDespatcheResult']['Value']['Despatche']}
                            }
                            return callback(null,result);
                        }else{
                            return callback({code:'UNSUCCESSFUL',message:jsObject['s:Envelope']['s:Body']['GetInboxDespatcheResponse']['GetInboxDespatcheResult']['$'].Message});
                        }
                        
                    }catch(tryErr1){
                        callback({code: tryErr1.name || 'CATCHED_ERROR',message:tryErr1.message || 'CATCHED_ERROR'});
                    }
                }else{
                    callback(err);
                }
            });
            
        });
    }catch(tryErr){
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || 'CATCHED_ERROR'});
    }
}; 

/**
* @query :{ despatchId: String}
*/
exports.getInboxDespatcheHtml = function (options,despatchId,mainCallback) {
    var timeIsUp=false;
    var stopTimer=false;

    var callback=function(...obj){
        stopTimer=true;
        if(!timeIsUp) return mainCallback(...obj);
        else return;
    }
    setTimeout(()=>{
        if(stopTimer) return;
        eventLog('Zaman asimi oldu'.green);
        timeIsUp=true;
        return mainCallback({code:'TIME_OUT',message:'Zaman asimi oldu'});
        
    }, timeout)
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        // var proxy = new Proxy(binding, 'https://efatura.uyumsoft11.com.tr/');
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('GetInboxDespatcheView',{despatchId:despatchId},false);
        eventLog('before: proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatcheView", function(response, ctx) {')
        proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatcheView", function(response, ctx) {
            eventLog('after: proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatcheView", function(response, ctx) {')
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            eventLog('before: mrutil.xml2json(response,(err,jsObject)=>{')
            mrutil.xml2json(response,(err,jsObject)=>{
                eventLog('after: mrutil.xml2json(response,(err,jsObject)=>{')
                if(!err){
                    
                    if(jsObject['s:Envelope']['s:Body'][0]['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body'][0]['s:Fault'][0]['faultstring'][0]['_'];
                        return callback({code:'WebServiceError',message:errorMessage});
                    }

                    
                    try{
                        if(jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatcheViewResponse'][0]['GetInboxDespatcheViewResult'][0]['$'].IsSucceded=='true'){
                            var result={
                                IsSucceded: true, 
                                doc:{html:(jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatcheViewResponse'][0]['GetInboxDespatcheViewResult'][0]['Value'][0].Html || '')}
                            }
                            return callback(null,result);
                        }else{
                            return callback({code:'UNSUCCESSFUL',message:jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatcheViewResponse'][0]['GetInboxDespatcheViewResult'][0]['$'].Message});
                        }
                        
                    }catch(tryErr1){
                        errorLog('exports.getInboxDespatcheHtml tryErr1:',tryErr1)
                        return callback({code: tryErr1.name || 'CATCHED_ERROR',message:tryErr1.message || 'CATCHED_ERROR'});
                    }
                }else{
                    errorLog('exports.getInboxDespatcheHtml err:',err)
                    callback(err);
                }
            });
            
        });
    }catch(tryErr){
        errorLog('exports.getInboxDespatchePdf tryErr:',tryErr)
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || 'CATCHED_ERROR'});
    }
}


/**
* @query :{ despatchId: String}
*/
exports.getInboxDespatchePdf = function (options,despatchId,mainCallback) {
    var timeIsUp=false;
    var stopTimer=false;

    var callback=function(...obj){
        stopTimer=true;
        if(!timeIsUp) return mainCallback(...obj);
        else return;
    }
    setTimeout(()=>{
        if(stopTimer) return;
        eventLog('Zaman asimi oldu'.green);
        timeIsUp=true;
        return mainCallback({code:'TIME_OUT',message:'Zaman asimi oldu'});
        
    }, timeout)
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        // var proxy = new Proxy(binding, 'https://efatura.uyumsoft11.com.tr/');
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('GetInboxDespatchePdf',{despatchId:despatchId},false);

        eventLog('before: proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatchePdf", function(response, ctx) {')
        proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatchePdf", function(response, ctx) {
            eventLog('after: proxy.send(message, "http://tempuri.org/IIntegration/GetInboxDespatchePdf", function(response, ctx) {')
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            eventLog('before: mrutil.xml2json(response,(err,jsObject)=>{')
            mrutil.xml2json(response,(err,jsObject)=>{
                eventLog('after: mrutil.xml2json(response,(err,jsObject)=>{')
                if(!err){
                    
                    if(jsObject['s:Envelope']['s:Body'][0]['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body'][0]['s:Fault'][0]['faultstring'][0]['_'];
                        return callback({code:'WebServiceError',message:errorMessage});
                    }

                    
                    try{
                        if(jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatchePdfResponse'][0]['GetInboxDespatchePdfResult'][0]['$'].IsSucceded=='true'){
                            var result={
                                IsSucceded: true, 
                                doc:{pdf:(jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatchePdfResponse'][0]['GetInboxDespatchePdfResult'][0]['Value'][0].Data || '')}
                            }
                            return callback(null,result);
                        }else{
                            return callback({code:'UNSUCCESSFUL',message:jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatchePdfResponse'][0]['GetInboxDespatchePdfResult'][0]['$'].Message});
                        }
                        
                    }catch(tryErr1){
                        errorLog('exports.getInboxDespatchePdf tryErr1:',tryErr1)
                        return callback({code: tryErr1.name || 'CATCHED_ERROR',message:tryErr1.message || 'CATCHED_ERROR'});
                    }
                }else{
                    errorLog('exports.getInboxDespatchePdf err:',err)
                    callback(err);
                }
            });
        });
    }catch(tryErr){
        errorLog('exports.getInboxDespatchePdf tryErr:',tryErr)
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || 'CATCHED_ERROR'});
    }
}



/**
* @query :{CreateStartDate:Date, CreateEndDate:Date, ExecutionStartDate:Date, ExecutionEndDate:Date, PageIndex:Number, PageSize:Number
* , Status:String, OnlyNewestDespatches:Boolean, DespatcheNumbers:String[] , DespatcheIds: String[]}
*
*  Status in NotPrepared, NotSend, Draft, Canceled, Queued, Processing, SentToGib, Approved, WaitingForApprovement, Declined, Return, EArchivedCanceled, Error
*/

exports.getOutboxDespatcheList = function (options,query,mainCallback) {
    var timeIsUp=false;
    var stopTimer=false;

    var callback=function(...obj){
        stopTimer=true;
        if(!timeIsUp) return mainCallback(...obj);
        else return;
    }
    setTimeout(()=>{
        if(stopTimer) return;
        eventLog('Zaman asimi oldu'.green);
        timeIsUp=true;
        return mainCallback({code:'TIME_OUT',message:'Zaman asimi oldu'});
        
    }, timeout)
    try{ 

        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })

        var proxy = new Proxy(binding, options.url);
        
        // var proxy = new Proxy(binding, 'https://efatura.uyumsoft11.com.tr/');
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('GetOutboxDespatcheList',query);
        
        eventLog('before: proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatcheList", function(response, ctx) {')
        proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatcheList", function(response, ctx) {
            eventLog('after: proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatcheList", function(response, ctx) {')

            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            
            eventLog('before: mrutil.xml2json(response,(err,jsObject)=>{')
            mrutil.xml2json(response,(err,jsObject)=>{
                eventLog('after: mrutil.xml2json(response,(err,jsObject)=>{')
                if(!err){
                    
                    if(jsObject['s:Envelope']['s:Body'][0]['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body'][0]['s:Fault'][0]['faultstring'][0]['_'];
                        return callback({code:'WebServiceError',message:errorMessage});
                        
                        
                    }
                    if(jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatcheListResponse'][0]['GetOutboxDespatcheListResult'][0]['$'].IsSucceded=='true'){
                        var result={
                            page:0,
                            pageSize:0,
                            recordCount: 0,
                            pageCount: 0,
                            docs:[]
                        }

                        // result.page= query.PageIndex;
                        // result.pageSize=query.PageSize;
                        result.page= Number(jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatcheListResponse'][0]['GetOutboxDespatcheListResult'][0]['Value'][0]['$'].PageIndex);
                        result.pageSize=Number(jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatcheListResponse'][0]['GetOutboxDespatcheListResult'][0]['Value'][0]['$'].PageSize);
                        result.recordCount= Number(jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatcheListResponse'][0]['GetOutboxDespatcheListResult'][0]['Value'][0]['$'].TotalCount);
                        result.pageCount=Number(jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatcheListResponse'][0]['GetOutboxDespatcheListResult'][0]['Value'][0]['$'].TotalPages);
                        
                        var items=jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatcheListResponse'][0]['GetOutboxDespatcheListResult'][0]['Value'][0]['Items'];
                        if(items){
                            for(var i=0;i<items.length;i++){
                                
                                var obj={
                                    ioType:1,
                                    profileId:uyumsoftDespatcheProfileID(items[i]['Type'][0]),
                                    id:items[i]['DespatcheId'][0],
                                    uuid:items[i]['DocumentId'][0],
                                    issueDate:items[i]['ExecutionDate'][0].toString().substr(0,10),
                                    issueTime:items[i]['ExecutionDate'][0].toString().substr(11,8),
                                    despatchType:'SATIS',
                                    accountingParty:{
                                        tcknVkn:items[i]['TargetTcknVkn']!=undefined?(items[i]['TargetTcknVkn'][0]) || '':'',
                                        title:items[i]['TargetTitle']!=undefined?(items[i]['TargetTitle'][0]|| ''):''
                                    },
                                    payableAmount:Number(items[i]['PayableAmount'][0]),
                                    taxExclusiveAmount:Number(items[i]['TaxExclusiveAmount'][0]),
                                    taxTotal:Number(items[i]['TaxTotal'][0]),
                                    taxSummary :{
                                        vat1:Number(items[i]['Vat1'][0]),
                                        vat8:Number(items[i]['Vat8'][0]),
                                        vat18:Number(items[i]['Vat18'][0]),
                                        vat0TaxableAmount:Number(items[i]['Vat0TaxableAmount'][0]),
                                        vat1TaxableAmount:Number(items[i]['Vat1TaxableAmount'][0]),
                                        vat8TaxableAmount:Number(items[i]['Vat8TaxableAmount'][0]),
                                        vat18TaxableAmount:Number(items[i]['Vat18TaxableAmount'][0])
                                    },
                                    withHoldingTaxTotal:0,
                                    documentCurrencyCode:items[i]['DocumentCurrencyCode'][0],
                                    exchangeRate:Number(items[i]['ExchangeRate'][0]),
                                    
                                    status:uyumsoftDespatcheStatus(items[i]['Status'][0])
                                }
                                result.docs.push(obj);
                            }
                            callback(null,result);
                        }else{
                            callback(null,result);
                        }
                    }else{
                        callback({code:'UNSUCCESSFUL',message:'Uyumsoft E-DespatcheDownload Basarisiz'});
                    }
                    
                    
                }else{
                    callback({code:'XML2JSON_ERROR',message:(err.name || err.message || err.toString())});
                }
            });


});

}catch(tryErr){
    callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || tryErr});
}
}


/**
* @query :{ despatchId: String}
*/
exports.getOutboxDespatche = function (options,despatchId,mainCallback) {
    var timeIsUp=false;
    var stopTimer=false;

    var callback=function(...obj){
        stopTimer=true;
        if(!timeIsUp) return mainCallback(...obj);
        else return;
    }
    setTimeout(()=>{
        if(stopTimer) return;
        eventLog('Zaman asimi oldu'.green);
        timeIsUp=true;
        return mainCallback({code:'TIME_OUT',message:'Zaman asimi oldu'});
        
    }, timeout)
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        // var proxy = new Proxy(binding, 'https://efatura.uyumsoft11.com.tr/');
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('GetOutboxDespatche',{despatchId:despatchId},false);
        eventLog('before: proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatche", function(response, ctx) {')
        proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatche", function(response, ctx) {
            eventLog('after: proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatche", function(response, ctx) {')
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }

            mrutil.xml2json3(response,(err,jsObject)=>{
                if(!err){
                    if(jsObject['s:Envelope']['s:Body']['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body']['s:Fault']['faultstring'];

                        return callback({code:'WebServiceError',message:errorMessage});
                    }

                    try{
                        if(jsObject['s:Envelope']['s:Body']['GetOutboxDespatcheResponse']['GetOutboxDespatcheResult']['$'].IsSucceded=='true'){
                            var result={
                                IsSucceded: true, 
                                doc:{despatch:jsObject['s:Envelope']['s:Body']['GetOutboxDespatcheResponse']['GetOutboxDespatcheResult']['Value']['Despatche']}
                            }
                            return callback(null,result);
                        }else{
                            return callback({code:'UNSUCCESSFUL',message:jsObject['s:Envelope']['s:Body']['GetOutboxDespatcheResponse']['GetOutboxDespatcheResult']['$'].Message});
                        }
                        
                    }catch(tryErr1){
                        callback({code: tryErr1.name || 'CATCHED_ERROR',message:tryErr1.message || 'CATCHED_ERROR'});
                    }
                }else{
                    callback(err);
                }
            });
            
        });
    }catch(tryErr){
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || 'CATCHED_ERROR'});
    }
}; 

/**
* @query :{ despatchId: String}
*/
exports.getOutboxDespatcheHtml = function (options,despatchId,mainCallback) {
    var timeIsUp=false;
    var stopTimer=false;

    var callback=function(...obj){
        stopTimer=true;
        if(!timeIsUp) return mainCallback(...obj);
        else return;
    }
    setTimeout(()=>{
        if(stopTimer) return;
        eventLog('Zaman asimi oldu'.green);
        timeIsUp=true;
        return mainCallback({code:'TIME_OUT',message:'Zaman asimi oldu'});
        
    }, timeout)
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        // var proxy = new Proxy(binding, 'https://efatura.uyumsoft11.com.tr/');
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('GetOutboxDespatcheView',{despatchId:despatchId},false);
        eventLog('before: proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatcheView", function(response, ctx) {')
        proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatcheView", function(response, ctx) {
            eventLog('after: proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatcheView", function(response, ctx) {')
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            eventLog('before: mrutil.xml2json(response,(err,jsObject)=>{')
            mrutil.xml2json(response,(err,jsObject)=>{
                eventLog('after: mrutil.xml2json(response,(err,jsObject)=>{')
                if(!err){
                    
                    if(jsObject['s:Envelope']['s:Body'][0]['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body'][0]['s:Fault'][0]['faultstring'][0]['_'];
                        return callback({code:'WebServiceError',message:errorMessage});
                    }

                    
                    try{
                        if(jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatcheViewResponse'][0]['GetOutboxDespatcheViewResult'][0]['$'].IsSucceded=='true'){
                            var result={
                                IsSucceded: true, 
                                doc:{html:(jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatcheViewResponse'][0]['GetOutboxDespatcheViewResult'][0]['Value'][0].Html || '')}
                            }
                            return callback(null,result);
                        }else{
                            return callback({code:'UNSUCCESSFUL',message:jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatcheViewResponse'][0]['GetOutboxDespatcheViewResult'][0]['$'].Message});
                        }
                        
                    }catch(tryErr1){
                        errorLog('exports.getOutboxDespatcheHtml tryErr1:',tryErr1)
                        return callback({code: tryErr1.name || 'CATCHED_ERROR',message:tryErr1.message || 'CATCHED_ERROR'});
                    }
                }else{
                    errorLog('exports.getOutboxDespatcheHtml err:',err)
                    callback(err);
                }
            });
            
        });
    }catch(tryErr){
        errorLog('exports.getOutboxDespatchePdf tryErr:',tryErr)
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || 'CATCHED_ERROR'});
    }
}


/**
* @query :{ despatchId: String}
*/
exports.getOutboxDespatchePdf = function (options,despatchId,mainCallback) {
    var timeIsUp=false;
    var stopTimer=false;

    var callback=function(...obj){
        stopTimer=true;
        if(!timeIsUp) return mainCallback(...obj);
        else return;
    }
    setTimeout(()=>{
        if(stopTimer) return;
        eventLog('Zaman asimi oldu'.green);
        timeIsUp=true;
        return mainCallback({code:'TIME_OUT',message:'Zaman asimi oldu'});
        
    }, timeout)
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        // var proxy = new Proxy(binding, 'https://efatura.uyumsoft11.com.tr/');
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('GetOutboxDespatchePdf',{despatchId:despatchId},false);

        eventLog('before: proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatchePdf", function(response, ctx) {')
        proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatchePdf", function(response, ctx) {
            eventLog('after: proxy.send(message, "http://tempuri.org/IIntegration/GetOutboxDespatchePdf", function(response, ctx) {')
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            eventLog('before: mrutil.xml2json(response,(err,jsObject)=>{')
            mrutil.xml2json(response,(err,jsObject)=>{
                eventLog('after: mrutil.xml2json(response,(err,jsObject)=>{')
                if(!err){
                    
                    if(jsObject['s:Envelope']['s:Body'][0]['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body'][0]['s:Fault'][0]['faultstring'][0]['_'];
                        return callback({code:'WebServiceError',message:errorMessage});
                    }

                    
                    try{
                        if(jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatchePdfResponse'][0]['GetOutboxDespatchePdfResult'][0]['$'].IsSucceded=='true'){
                            var result={
                                IsSucceded: true, 
                                doc:{pdf:(jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatchePdfResponse'][0]['GetOutboxDespatchePdfResult'][0]['Value'][0].Data || '')}
                            }
                            return callback(null,result);
                        }else{
                            return callback({code:'UNSUCCESSFUL',message:jsObject['s:Envelope']['s:Body'][0]['GetOutboxDespatchePdfResponse'][0]['GetOutboxDespatchePdfResult'][0]['$'].Message});
                        }
                        
                    }catch(tryErr1){
                        errorLog('exports.getOutboxDespatchePdf tryErr1:',tryErr1)
                        return callback({code: tryErr1.name || 'CATCHED_ERROR',message:tryErr1.message || 'CATCHED_ERROR'});
                    }
                }else{
                    errorLog('exports.getOutboxDespatchePdf err:',err)
                    callback(err);
                }
            });
        });
    }catch(tryErr){
        errorLog('exports.getOutboxDespatchePdf tryErr:',tryErr)
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || 'CATCHED_ERROR'});
    }
}




/**
* @query :{ despatches: String[]}
*/
exports.setDespatchesTaken = function (options,despatches,callback) {
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('SetDespatchesTaken',{despatches:despatches},false);

        proxy.send(message, "http://tempuri.org/IIntegration/SetDespatchesTaken", function(response, ctx) {
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});
                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            mrutil.xml2json3(response,(err,jsObject)=>{
                if(!err){
                    if(jsObject['s:Envelope']['s:Body']['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body']['s:Fault']['faultstring'];
                        return callback({code:'WebServiceError',message:errorMessage});
                    }
                    
                    callback(null);
                }else{
                    callback(err);
                }
            });

        });
    }catch(tryErr){
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || tryErr});
    }
}


/**
* @vknTckn:String
*/

exports.isEDespatcheUser = function (options,vknTckn,callback) {
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('IsEDespatcheUser',{vknTckn:vknTckn,alias:''});
        
        proxy.send(message, "http://tempuri.org/IIntegration/IsEDespatcheUser", function(response, ctx) {
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }

            mrutil.xml2json(response,(err,jsObject)=>{
                if(!err){
                    if(jsObject['s:Envelope']['s:Body'][0]['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body'][0]['s:Fault'][0]['faultstring'][0]['_'];

                        return callback({code:'WebServiceError',message:errorMessage});
                    }
                    var value=jsObject['s:Envelope']['s:Body'][0]['IsEDespatcheUserResponse'][0]['IsEDespatcheUserResult'][0]['$'].Value=='true';
                    callback(null,value);
                }else{
                    callback({code:'XML2JSON_ERROR',message:(err.name || err.message || err.toString())});
                }
            });
        });
    }catch(tryErr){
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || tryErr});
    }
}






/**
* @query :{ pagination: {pageIndex:Number, pageSize:Number} }
*/


exports.getEDespatcheUsers = function (options,query,callback) {
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        // var proxy = new Proxy(binding, 'https://efatura.uyumsoft11.com.tr/');
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('GetEDespatcheUsers',query,false);
        
        
        proxy.send(message, "http://tempuri.org/IIntegration/GetEDespatcheUsers", function(response, ctx) {
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            mrutil.xml2json(response,(err,jsObject)=>{
                if(!err){
                    if(jsObject['s:Envelope']['s:Body'][0]['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body'][0]['s:Fault'][0]['faultstring'][0]['_'];

                        return callback({code:'WebServiceError',message:errorMessage});
                    }
                    if(jsObject['s:Envelope']['s:Body'][0]['GetEDespatcheUsersResponse'][0]['GetEDespatcheUsersResult'][0]['$'].IsSucceded=='true'){
                        var result={
                            page:0,
                            pageSize:0,
                            recordCount: 0,
                            pageCount: 0,
                            docs:[]
                        }

                        result.page= Number(jsObject['s:Envelope']['s:Body'][0]['GetEDespatcheUsersResponse'][0]['GetEDespatcheUsersResult'][0]['Value'][0]['$'].PageIndex || query.pagination.pageIndex);
                        result.pageSize=Number(jsObject['s:Envelope']['s:Body'][0]['GetEDespatcheUsersResponse'][0]['GetEDespatcheUsersResult'][0]['Value'][0]['$'].PageSize || query.pagination.pageSize);
                        result.recordCount= Number(jsObject['s:Envelope']['s:Body'][0]['GetEDespatcheUsersResponse'][0]['GetEDespatcheUsersResult'][0]['Value'][0]['$'].TotalCount);
                        result.pageCount=Number(jsObject['s:Envelope']['s:Body'][0]['GetEDespatcheUsersResponse'][0]['GetEDespatcheUsersResult'][0]['Value'][0]['$'].TotalPages);
                        
                        var items=jsObject['s:Envelope']['s:Body'][0]['GetEDespatcheUsersResponse'][0]['GetEDespatcheUsersResult'][0]['Value'][0]['Items'];
                        if(items){
                            items.forEach((item)=>{
                                var obj={
                                    identifier:item['$'].Identifier.trim(),
                                    postboxAlias:item['$'].PostboxAlias.trim(),
                                    title:item['$'].Title.trim(),
                                    type:item['$'].Type.trim(),
                                    systemCreateDate:new Date(item['$'].SystemCreateDate + '.000+0300'),
                                    firstCreateDate:new Date(item['$'].FirstCreateDate + '.000+0300'),
                                    enabled:Boolean(item['$'].Enabled)

                                }
                                result.docs.push(obj);
                            });

                        }
                        
                        callback(null,result);
                    }else{
                        callback({code:'UNSUCCESSFUL',message:'Uyumsoft getEDespatcheUsers Basarisiz'});
                    }
                }else{
                    callback({code:'XML2JSON_ERROR',message:(err.name || err.message || err.toString())});
                }
            });
        });
    }catch(tryErr){
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || tryErr});
    }
}

/**
* @despatch: {object}
*/
exports.sendDespatche = function (options,ssss,callback) {
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;
        
        var msj ='<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Header /><s:Body>';
        msj +='<s:SendDespatche xmlns:s="http://tempuri.org/">';
        msj += ssss
        msj +='</s:SendDespatche></s:Body></s:Envelope>';

        proxy.send(msj, "http://tempuri.org/IIntegration/SendDespatche", function(response, ctx) {
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});

                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            mrutil.xml2json3(response,(err,jsObject)=>{
                if(!err){
                    if(jsObject['s:Envelope']['s:Body']['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body']['s:Fault']['faultstring'];

                        return callback({code:'WebServiceError',message:errorMessage});
                    }

                    if(jsObject['s:Envelope']['s:Body']['SendDespatcheResponse']['SendDespatcheResult']['$'].IsSucceded=='false'){
                        return callback({code:'UYUMSOFT_SEND_INVOICE',message:jsObject['s:Envelope']['s:Body']['SendDespatcheResponse']['SendDespatcheResult']['$'].Message});
                    }
                    var result={
                        IsSucceded: true, //jsObject['s:Envelope']['s:Body'][0]['GetInboxDespatcheResponse'][0]['GetInboxDespatcheResult'][0]['$'].IsSucceded=='true',
                        doc:{} // {despatch:jsObject['s:Envelope']['s:Body']['GetInboxDespatcheResponse']['GetInboxDespatcheResult']['Value']['Despatche']}
                    }
                    
                    callback(null,result);
                    
                    
                }else{
                    callback(err);
                }
            });
            
        });
    }catch(tryErr){
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || tryErr});
    }
    
}

/**
* @query :{ documentResponseInfo: [{DespatcheId:string, ResponseStatus:string}]}
* ResponseStatus : 'Approved' || ' Declined' || 'Return'
*/
exports.sendDocumentResponse = function (options,query,callback) {
    try{
        var binding = new BasicHttpBinding(
                                           { SecurityMode: "TransportWithMessageCredential"
                                           , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
                                       })
        var proxy = new Proxy(binding, options.url);
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('SendDocumentResponse',query,false);

        proxy.send(message, "http://tempuri.org/IIntegration/SendDocumentResponse", function(response, ctx) {
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});
                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            mrutil.xml2json3(response,(err,jsObject)=>{
                if(!err){
                    if(jsObject['s:Envelope']['s:Body']['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body']['s:Fault']['faultstring'];
                        return callback({code:'WebServiceError',message:errorMessage});
                    }
                    if(jsObject['s:Envelope']['s:Body']['SendDocumentResponseResponse']['SendDocumentResponseResult']['$'].IsSucceded=='false'){
                        return callback({code:'UYUMSOFT_SEND_DOCUMENT_RESPONSE',message:jsObject['s:Envelope']['s:Body']['SendDocumentResponseResponse']['SendDocumentResponseResult']['$'].Message});
                    }
                    var result={
                        IsSucceded: true
                    }
                    
                    callback(null);
                }else{
                    callback(err);
                }
            });

        });
    }catch(tryErr){
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || tryErr});
    }
}

/**
* @query :{  DespatcheIds: String[] }
*/
/*
exports.checkInboxDespatchesStatus=function(options,query,callback){
    try{
        var binding = new BasicHttpBinding(
            { SecurityMode: "TransportWithMessageCredential"
            , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
        })
        var proxy = new Proxy(binding, options.url);
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('QueryInboxDespatcheStatus',query,false);
        
        proxy.send(message, "http://tempuri.org/IIntegration/QueryInboxDespatcheStatus", function(response, ctx) {
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});
                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            mrutil.xml2json(response,(err,jsObject)=>{
                if(!err){
                    if(jsObject['s:Envelope']['s:Body'][0]['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body'][0]['s:Fault'][0]['faultstring'][0]['_'];

                        return callback({code:'WebServiceError',message:errorMessage});
                    }
                    if(jsObject['s:Envelope']['s:Body'][0]['QueryInboxDespatcheStatusResponse'][0]['QueryInboxDespatcheStatusResult'][0]['$'].IsSucceded=='false'){
                        return callback({code:'UYUMSOFT_QUERY_INBOX_INVOICE_STATUS',message:jsObject['s:Envelope']['s:Body'][0]['QueryInboxDespatcheStatusResponse'][0]['QueryInboxDespatcheStatusResult'][0]['$'].Message});
                    }
                    eventLog('api result:',JSON.stringify(jsObject['s:Envelope']['s:Body'],null,2));

                    var result={
                        IsSucceded: true,
                        Value:jsObject['s:Envelope']['s:Body'][0]['QueryInboxDespatcheStatusResponse'][0]['QueryInboxDespatcheStatusResult'][0]['Value']
                    }
                    
                    callback(null,result);
                }else{
                    callback(err);
                }
            });

        });
    }catch(tryErr){
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || tryErr});
    }
}
*/
/**
* @query :{  DespatcheIds: String[] }
*/
/** 
exports.checkOutboxDespatchesStatus=function(options,query,callback){
    try{
        var binding = new BasicHttpBinding(
            { SecurityMode: "TransportWithMessageCredential"
            , MessageClientCredentialType: "UserName", MaxBufferPoolSize : 20000000, MaxBufferSize : 20000000, MaxReceivedMessageSize : 20000000, SendTimeout : new Date(12, 50, 50), ReceiveTimeout : new Date(12, 50, 50)
        })
        var proxy = new Proxy(binding, options.url);
        proxy.ClientCredentials.Username.Username =options.username;
        proxy.ClientCredentials.Username.Password =options.password ;

        var message=generateRequestMessage('QueryOutboxDespatcheStatus',query,false);
        
        proxy.send(message, "http://tempuri.org/IIntegration/QueryOutboxDespatcheStatus", function(response, ctx) {
            if(ctx.error!=undefined){
                if(ctx.error['code']=='ENOTFOUND') return callback({code:'URL_NOT_FOUND',message:'Web Servis URL bulunamadi!'});
                return callback({code:ctx.error['code'],message:ctx.error['code']});
            }
            mrutil.xml2json(response,(err,jsObject)=>{
                if(!err){
                    if(jsObject['s:Envelope']['s:Body'][0]['s:Fault']!=undefined){
                        var errorMessage=jsObject['s:Envelope']['s:Body'][0]['s:Fault'][0]['faultstring'][0]['_'];

                        return callback({code:'WebServiceError',message:errorMessage});
                    }
                    if(jsObject['s:Envelope']['s:Body'][0]['QueryOutboxDespatcheStatusResponse'][0]['QueryOutboxDespatcheStatusResult'][0]['$'].IsSucceded=='false'){
                        return callback({code:'UYUMSOFT_QUERY_OUTBOX_INVOICE_STATUS',message:jsObject['s:Envelope']['s:Body'][0]['QueryOutboxDespatcheStatusResponse'][0]['QueryOutboxDespatcheStatusResult'][0]['$'].Message});
                    }
                    eventLog('api result:',JSON.stringify(jsObject['s:Envelope']['s:Body'],null,2));

                    var result={
                        IsSucceded: true,
                        Value:jsObject['s:Envelope']['s:Body'][0]['QueryOutboxDespatcheStatusResponse'][0]['QueryOutboxDespatcheStatusResult'][0]['Value']
                    }
                    
                    callback(null,result);
                }else{
                    callback(err);
                }
            });

        });
    }catch(tryErr){
        callback({code: tryErr.name || 'CATCHED_ERROR',message:tryErr.message || tryErr});
    }
}
**/