var api=require('./api.js');


exports.downloadInbox=function(dbModel,eIntegratorDoc,callback){
	try{
		if(!eIntegratorDoc) return callback(null);
		var isTestPlatform=eIntegratorDoc.despatch.url.indexOf('test')>-1?true:false;
		if(isTestPlatform) eventLog('uyumsoft test platform');
		eventLog('downloadInbox dbId:',dbModel._id);
		dbModel.despatches.find({eIntegrator:eIntegratorDoc._id, ioType:1}).sort({'issueDate.value':-1}).limit(1).exec((err,docs)=>{
			if(!err){
				var date2=new Date();
				var query={ 
					ExecutionStartDate:'2019-01-01T00:00:00.000Z', 
					ExecutionEndDate:date2.yyyymmdd() + 'T23:59:59.000Z', 
					PageIndex:0, 
					PageSize:10,

					OnlyNewestDespatchs:false,
					SetTaken:false
					// DespatchNumbers:[] , 
					// DespatchIds: []
				}
				if(docs.length>0){
					var date1=mrutil.datefromyyyymmdd(docs[0].issueDate.value);
					eventLog('Son tarih:',date1);

					date1=date1.addDays(-10);
					eventLog('Date1:',date1);
					query.ExecutionStartDate=date1.yyyymmdd() + 'T00:00:00.000Z';
					// query.ExecutionEndDate=date2.yyyymmdd() + 'T23:59:59.000Z';
				}
				if(isTestPlatform) query.ExecutionStartDate=(new Date()).addDays(-1).yyyymmdd() + 'T00:00:00.000Z';
				//eventLog('downloadInbox query:',query);
				console.log('exports.downloadInbox query:',query);
				var indirilecekFaturalar=[];

				function listeIndir(cb){
						api.getInboxDespatchList(eIntegratorDoc.eDespatch,JSON.parse(JSON.stringify(query)),(err,result)=>{
							if(!err){
								eventLog('inbox invoices pageIndex:',(result.page +1) + '/' + result.pageCount);
								if(result.docs.length>0){
									for(var i=0;i<result.docs.length;i++){
										if(result.docs[i].uuid!=undefined){
											indirilecekFaturalar.push(result.docs[i]);
										}
									}
									query.PageIndex++;
									if(query.PageIndex>=result.pageCount  || ( isTestPlatform && query.PageIndex==2)){ 
										eventLog('downloadInbox.listeIndir sonu.');
										kaydetInbox(dbModel,eIntegratorDoc,Array.from(indirilecekFaturalar),(err)=>{
											indirilecekFaturalar=[];
											cb(null);
										});
									}else{
										kaydetInbox(dbModel,eIntegratorDoc,Array.from(indirilecekFaturalar),(err)=>{
											indirilecekFaturalar=[];
											setTimeout(()=>{
												listeIndir(cb);
												return;
											},1000);
										});
										
									}
								}else{
									cb(null)
								}
							}else{
								errorLog('downloadInbox Hata:',err);
								cb(err);
							}
						})
				}


				listeIndir((err)=>{
					callback(err);
				});
				
			}else{
				callback(err);
			}
		});
	}catch(tryErr){
		errorLog('downloadInbox Hata:',tryErr);
		callback(tryErr);
	}
}

function kaydetInbox(dbModel,eIntegratorDoc,indirilecekFaturalar,callback){
	var index=0;
	eventLog('kaydetInbox indirilecekFaturalar.length:',indirilecekFaturalar.length);
	function faturaIndir(cb){
		try{
			if(index>=indirilecekFaturalar.length) return cb(null);
			dbModel.despatches.findOne({ioType:1,'uuid.value':indirilecekFaturalar[index].uuid},(err,doc)=>{
				if(!err){
					if(doc!=null){
						if(doc.despatchestatus!=indirilecekFaturalar[index].status){
							doc.modifiedDate=new Date();
							doc.despatchestatus=indirilecekFaturalar[index].status;
							doc.save((err,doc2)=>{
								//eventLog('zaten indirilmis. statusu degistirildi. ',indirilecekFaturalar[index].uuid);
								index++;
								setTimeout(faturaIndir,0,cb);
								return;
							});
						}else{
							//eventLog('zaten indirilmis. ',indirilecekFaturalar[index].uuid);
							index++;
							setTimeout(faturaIndir,0,cb);
							return;
						}
					}
				}
				
				api.getInboxDespatch(eIntegratorDoc.eDespatch,indirilecekFaturalar[index].uuid,(err,result)=>{
					if(!err){
						if(result.doc){
							if(result.doc.despatch){
								var invoice=prepareDespatchObject(result.doc.despatch);
								invoice['invoiceStatus']=indirilecekFaturalar[index].status;
								
								var files={html:'',pdf:null};

								api.getInboxDespatchHtml(eIntegratorDoc.eDespatch,indirilecekFaturalar[index].uuid,(err,resultHtml)=>{
									if(!err){
										
										files.html=resultHtml.doc.html;
									}
									api.getInboxDespatchPdf(eIntegratorDoc,indirilecekFaturalar[index].uuid,(err,resultPdf)=>{
										if(!err){
											files.pdf=resultPdf.doc.pdf
											
										}else{
											eventLog('api.getInboxDespatchPdf Error:',err);
										}
										insertDespatch(dbModel, eIntegratorDoc,1, invoice,files,(err)=>{
											if(err){
												eventLog('insertInboxDespatch error: uuid: ' + indirilecekFaturalar[index].uuid,err);
												index++;
												setTimeout(faturaIndir,500,cb);
											}else{
												eventLog('insertInboxDespatch OK uuid: ', indirilecekFaturalar[index].uuid);
												index++;
												setTimeout(faturaIndir,500,cb);
												
											}
											
										});
									});
								});
							}else{
								index++;
								setTimeout(faturaIndir,500,cb);
							}
						}else{
							index++;
							setTimeout(faturaIndir,500,cb);
						}
					}else{
						eventLog('api.getInboxDespatch error: ',err);
						index++;
						setTimeout(faturaIndir,500,cb);
					}
				});
			})
		}catch(tryErr){
			errorLog('uyumsoft kaydetInbox error:',tryErr);
			index++;
			setTimeout(faturaIndir,500,cb);
		}
	}
					
	faturaIndir((err)=>{
		callback(err);
	});
}


exports.downloadOutbox=function(dbModel,eIntegratorDoc,callback){
	try{
		if(!eIntegratorDoc) return callback(null);
		var isTestPlatform=eIntegratorDoc.despatch.url.indexOf('test')>-1?true:false;
		if(isTestPlatform) eventLog('uyumsoft test platform');
		eventLog('downloadOutbox dbId:',dbModel._id);
		dbModel.despatches.find({eIntegrator:eIntegratorDoc._id, ioType:0}).sort({'issueDate.value':-1}).limit(1).exec((err,docs)=>{
			if(!err){
				var date2=new Date();
				var query={ 
					ExecutionStartDate:'2019-01-01T00:00:00.000Z', 
					ExecutionEndDate:date2.yyyymmdd() + 'T23:59:59.000Z', 
					PageIndex:0, 
					PageSize:10,

					OnlyNewestDespatchs:false,
					SetTaken:false
					// DespatchNumbers:[] , 
					// DespatchIds: []
				}
				if(docs.length>0){
					var date1=mrutil.datefromyyyymmdd(docs[0].issueDate.value);
					eventLog('Son tarih:',date1);

					date1=date1.addDays(-10);
					eventLog('Date1:',date1);
					query.ExecutionStartDate=date1.yyyymmdd() + 'T00:00:00.000Z';
					// query.ExecutionEndDate=date2.yyyymmdd() + 'T23:59:59.000Z';
				}
				if(isTestPlatform) query.ExecutionStartDate=(new Date()).addDays(-1).yyyymmdd() + 'T00:00:00.000Z';
				//eventLog('downloadOutbox query:',query);
				
				
				var indirilecekFaturalar=[];

				function listeIndir(cb){
					api.getOutboxDespatchList(eIntegratorDoc.eDespatch,JSON.parse(JSON.stringify(query)),(err,result)=>{
						if(!err){
							if(result.docs.length>0){
								for(var i=0;i<result.docs.length;i++){
									if(result.docs[i].uuid!=undefined){
										indirilecekFaturalar.push(result.docs[i]);
									}
								}
								query.PageIndex++;
								if(query.PageIndex>=result.pageCount  || ( isTestPlatform && query.PageIndex==2)){ 
									kaydetOutbox(dbModel,eIntegratorDoc,Array.from(indirilecekFaturalar),(err)=>{
										indirilecekFaturalar=[];
										cb(null);
									});
								}else{
									kaydetOutbox(dbModel,eIntegratorDoc,Array.from(indirilecekFaturalar),(err)=>{
										indirilecekFaturalar=[];
										setTimeout(()=>{
											listeIndir(cb);
											return;
										},1000);
									});
									
								}
							}else{
								cb(null)
							}
						}else{
							errorLog('downloadOutbox Hata:',err);
							cb(err);
						}
					}) 
				}

				listeIndir((err)=>{
					if(err){
						errorLog('exports.downloadOutbox',err);
					}
					callback(err);
				});
				
			}else{
				errorLog('exports.downloadOutbox',err);
				callback(err);
			}
		});
	}catch(tryErr){
		errorLog('downloadInbox Hata:',tryErr);
		callback(tryErr);
	}
}

function kaydetOutbox(dbModel,eIntegratorDoc,indirilecekFaturalar,callback){
	var index=0;
	eventLog('kaydetOutbox indirilecekFaturalar.length:',indirilecekFaturalar.length);
	function faturaIndir(cb){
		try{
			if(index>=indirilecekFaturalar.length) return cb(null);
		
			dbModel.despatches.findOne({ioType:0,'uuid.value':indirilecekFaturalar[index].uuid},(err,doc)=>{
				if(!err){
					if(doc!=null){
						if(doc.despatchestatus!=indirilecekFaturalar[index].status){
							doc.modifiedDate=new Date();
							doc.despatchestatus=indirilecekFaturalar[index].status;
							doc.save((err,doc2)=>{
								eventLog('zaten indirilmis. statusu degistirildi. ',indirilecekFaturalar[index].uuid);
								index++;
								setTimeout(faturaIndir,500,cb);
								return;
							});
						}else{
							eventLog('zaten indirilmis. ',indirilecekFaturalar[index].uuid);
							index++;
							setTimeout(faturaIndir,500,cb);
							return;
						}
					}
				}
				
				api.getOutboxDespatch(eIntegratorDoc.eDespatch,indirilecekFaturalar[index].uuid,(err,result)=>{
					if(!err){
						if(result.doc){
							if(result.doc.despatch){
								var invoice=prepareDespatchObject(result.doc.despatch);

								invoice['invoiceStatus']=indirilecekFaturalar[index].status;
								
								var files={html:'',pdf:null};

								api.getOutboxDespatchHtml(eIntegratorDoc.eDespatch,indirilecekFaturalar[index].uuid,(err,resultHtml)=>{
									if(!err){
										files.html=resultHtml.doc.html;
									}
									
									api.getOutboxDespatchPdf(eIntegratorDoc.eDespatch,indirilecekFaturalar[index].uuid,(err,resultPdf)=>{
										if(!err){
											files.pdf=resultPdf.doc.pdf
											
										}else{
											errorLog('api.getOutboxDespatchPdf Error:',err);
										}
										insertDespatch(dbModel, eIntegratorDoc,0, invoice,files,(err)=>{
											if(err){
												errorLog('insertOutboxDespatch error: uuid: ' + indirilecekFaturalar[index].uuid,err);
												index++;
												setTimeout(faturaIndir,500,cb);
											}else{
												eventLog('insertOutboxDespatch OK uuid: ', indirilecekFaturalar[index].uuid);
												index++;
												setTimeout(faturaIndir,500,cb);
												
											}
											
										});
									});
								});
						
							}else{
								index++;
								setTimeout(faturaIndir,500,cb);
							}
						}else{
							errorLog('api.getOutboxDespatch result.doc bos result ',result);
							index++;
							setTimeout(faturaIndir,500,cb);
						}
						
					}else{
						errorLog('api.getOutboxDespatch error: ',err);
						errorLog('api.getOutboxDespatch index: ',index);
						errorLog('api.getOutboxDespatch indirilecekFaturalar[index].uuid: ',indirilecekFaturalar[index].uuid);
						index++;
						setTimeout(faturaIndir,500,cb);
					}
				});
			})
		}catch(tryErr){
			errorLog('uyumsoft kaydetOutbox error:',tryErr);
			index++;
			setTimeout(faturaIndir,500,cb);
		}
	}
					
	faturaIndir((err)=>{
		callback(err);
	});
}


function insertDespatch(dbModel,eIntegratorDoc,ioType,invoice,files,callback){
	try{
		dbModel.despatches.findOne({ioType:ioType,'uuid.value':invoice.uuid.value},(err,foundDoc)=>{
			if(!err){
				if(foundDoc==null){
					eventLog('insertDespatch uuid:', invoice.uuid.value);
					
					var data={ioType:ioType,eIntegrator:eIntegratorDoc._id}
					data=Object.assign(data,invoice);
					var testDespatchValidate=new dbModel.despatches(data);
					var err=epValidateSync(testDespatchValidate);
					
					if(err){
						errorLog('var err=epValidateSync(testDespatchValidate); Err:',err);
						return callback({success: false, error: {code: err.name, message: err.message}});
					} 
					saveFiles(dbModel,invoice.ID.value, files,(err,resultFiles)=>{
						if(!err){
							if(resultFiles.html) data['html']=resultFiles.html;
							if(resultFiles.pdf) data['pdf']=resultFiles.pdf;
						}
						var newDespatch=new dbModel.despatches(data);
						newDespatch.save((err,newDoc)=>{
							if(!err){
								callback(null,newDoc);
							}else{
								errorLog('insertDespatch newDespatch.save((err,newDoc)=>{  error:',err);
								callback(err);
							}
						})
					});
					
					
				}else{
					eventLog('insertDespatch zaten var');
					callback(null);
				}
				
			}else{
				errorLog('insertDespatch HATA:',err);
				callback(err);
			}
		});

	}catch(tryErr){
		callback(tryErr);
	}
}

function saveFiles(dbModel,fileName,files,cb){
	var resultFiles={html:'',pdf:''}

	saveFileHtml(dbModel,fileName,files,(err,html)=>{
		if(!err) resultFiles.html=html;
		saveFilePdf(dbModel,fileName,files,(err,pdf)=>{
			if(!err) resultFiles.pdf=pdf;
			cb(null,resultFiles);
		})
	});
}

function saveFileHtml(dbModel,fileName,files,cb){
	if(files.html){
		var newFile=new dbModel.files({
			name:fileName,
			type:'text/html',
			extension:'html',
			data:files.html
		});
		newFile.save((err,doc)=>{
			if(!err){
				cb(null,doc._id);
			}else{
				cb(err);
			}
		})
	}else{
		cb(null,null)
	}
}

function saveFilePdf(dbModel,fileName,files,cb){
	if(files.pdf){
		var newFile=new dbModel.files({
			name:fileName,
			type:'application/pdf',
			extension:'pdf',
			data:files.pdf
		});
		newFile.save((err,doc)=>{
			if(!err){
				cb(null,doc._id);
			}else{
				cb(err);
			}
		})
	}else{
		cb(null,null)
	}
}

function renameKey(key){
	switch(key){
		case 'UUID': return 'uuid';
		case 'ID': return 'ID';
		case 'URI': return 'URI';
		case '$': return 'attr';
	}
	if(key.length<2) return key;
	key=key[0].toLowerCase() + key.substr(1,key.length-1);
	if(key.substr(key.length-2,2)=='ID' && key.length>2){
		key=key.substr(0,key.length-2) + 'Id';
	}
	return key;
}

function renameDespatchObjects(obj,renameFunction){
	
	if(Array.isArray(obj)){
		var newObj=[];
		for(var i=0;i<obj.length;i++){
			newObj.push(renameDespatchObjects(obj[i],renameFunction));
		}
		return newObj;
	}else if (typeof obj==='object'){
		var newObj={};

		var keys=Object.keys(obj);
		keys.forEach((key)=>{
			var newKey=renameFunction(key);
			if((Array.isArray(obj[key]) || typeof obj==='object') && (key!='$')){
				newObj[newKey]=renameDespatchObjects(obj[key],renameFunction);
			}else{
				newObj[newKey]=obj[key];
			}
		});
		return newObj;
	}else{
		return obj;
	}
}

function deleteEmptyObject(obj,propertyName){
	
	if(Array.isArray(obj)){
		var newObj=[];
		for(var i=0;i<obj.length;i++){
			newObj.push(deleteEmptyObject(obj[i],propertyName));
		}
		return newObj;
	}else if (typeof obj==='object'){
		var newObj={};

		if(obj[propertyName]!=undefined){
			if(JSON.stringify(obj[propertyName])===JSON.stringify({})){
				obj[propertyName]=undefined;
				delete obj[propertyName];
			}
		}
		
		
		var keys=Object.keys(obj);
		keys.forEach((key)=>{
			if(Array.isArray(obj[key]) || typeof obj==='object'){
				newObj[key]=deleteEmptyObject(obj[key],propertyName);
			}else{
				newObj[key]=obj[key];
			}
		})
		
		return newObj;
	}else{
		return obj;
	}
}

function prepareDespatchObject(invoice){
	invoice=mrutil.deleteObjectProperty(invoice,'xmlns*');
	invoice=deleteEmptyObject(invoice,'$');
	invoice=renameDespatchObjects(invoice,renameKey);
	return invoice;
}

exports.downloadEDespatchUsers=function(callback){
	
	var index=0;
	var hataDeneme=0;
	var indirilecekFaturalar=[];
	var query={pagination:{pageIndex:0, pageSize:300}}
	function listeIndir(cb){
		api.getEDespatchUsers({url:'https://efatura.uyumsoft.com.tr/Services/Integration',username:'Alitek_WebServis',password:'AyXEZR%k'},query,(err,result)=>{
			if(!err){
				eventLog('einvoice_users pageIndex:',(result.page +1) + '/' + result.pageCount);
				if(result.docs.length>0){
					insertEDespatchUsers(result.docs,(err)=>{
						if(err){
							eventLog('insertEDespatchUsers Error:',err);
						}
						query.pagination.pageIndex++;
						if(query.pagination.pageIndex>=result.pageCount){ 
							cb(null)
						}else{
							setTimeout(listeIndir,3000,cb);
						}
					})
					
				}else{
					cb(null)
				}
			}else{
				eventLog('einvoice_users error:',err);
				if(hataDeneme<10){
					hataDeneme++;
					setTimeout(listeIndir,3000,cb);
				}else{
					cb(err);
				}
				
				
			}
		});
		
	}


	listeIndir((err)=>{
		callback(err);
	});

}

function insertEDespatchUsers(docs,callback){
	var index=0;
	function kaydet(cb){
		if(index>=docs.length) return cb(null);
		db.einvoice_users.findOne({identifier:docs[index].identifier,postboxAlias:docs[index].postboxAlias},(err,foundDoc)=>{
			if(!err){
				if(foundDoc==null){
					var newDoc=new db.einvoice_users({
						identifier:docs[index].identifier,
						postboxAlias:docs[index].postboxAlias,
						title:docs[index].title,
						type:docs[index].type,
						systemCreateDate:docs[index].systemCreateDate,
						firstCreateDate:docs[index].firstCreateDate,
						enabled:docs[index].enabled
					});
					newDoc.save((err,newDoc2)=>{
						if(!err){
							eventLog('E-Fatura Mukellefi eklendi:' + newDoc2.title);
							index++;
							setTimeout(kaydet,500,cb);
						}else{
							cb(err);
						}
					});
				}else{
					if(foundDoc.postboxAlias===docs[index].postboxAlias && foundDoc.title===docs[index].title && foundDoc.enabled===docs[index].enabled){
						
						index++;
						setTimeout(kaydet,500,cb);
					}else{
						
						foundDoc.postboxAlias=docs[index].postboxAlias;
						foundDoc.title=docs[index].title;
						foundDoc.type=docs[index].type;
						foundDoc.systemCreateDate=docs[index].systemCreateDate;
						foundDoc.firstCreateDate=docs[index].firstCreateDate;
						foundDoc.enabled=docs[index].enabled;

						foundDoc.save((err,newDoc2)=>{
							if(!err){
								eventLog('E-Fatura Mukellefi duzeltildi:' + newDoc2.title);
								index++;
								setTimeout(kaydet,500,cb); 
							}else{
								cb(err);
							}
						});
					}
					
				}
			}else{
				cb(err);
			}
		})
	}

	kaydet((err)=>{
		callback(err);
	});
}

exports.sendToGib=function(dbModel,eDespatch,callback){
	try{
		var options=JSON.parse(JSON.stringify(eDespatch.eIntegrator));
		var isTestPlatform=false;
		if(options.url.indexOf('test')>-1) isTestPlatform=true;

		var title = eDespatch.accountingCustomerParty.party.partyName.name;
		var vergiNo='';
		var alias='defaultpk';
		var email='';

		if(isTestPlatform){
			eDespatch.accountingSupplierParty.party.partyIdentification.forEach((e)=>{
				var schemeID=(e.ID.attr.schemeID || '').toUpperCase();
				if(schemeID=='VKN' || schemeID=='TCKN'){
					e.ID.value='9000068418';
					return;
				}
			});
			if( eDespatch.profileId.value!='EARSIVFATURA'){
				eDespatch.accountingCustomerParty.party.partyIdentification.forEach((e)=>{
					var schemeID=(e.ID.attr.schemeID || '').toUpperCase();
					if(schemeID=='VKN' || schemeID=='TCKN'){
						e.ID.value='9000068418';
						return;
					}
				});
			}
		}

		eDespatch.accountingCustomerParty.party.partyIdentification.forEach((e)=>{
			var schemeID=(e.ID.attr.schemeID || '').toUpperCase();
			if(schemeID=='VKN' || schemeID=='TCKN'){
				vergiNo=e.ID.value;
				return;
			}
		});

		if(eDespatch.accountingCustomerParty.party.contact.electronicMail.value.indexOf('@')>-1){
			email=eDespatch.accountingCustomerParty.party.contact.electronicMail.value;
			if(isTestPlatform) email='alitek@gmail.com';
		}

		
		findEDespatchUserPostBoxAlias(vergiNo,eDespatch.profileId.value,(err,postboxAlias)=>{
			if(!err) alias=postboxAlias;

			var invoiceXml=mrutil.e_invoice2xml(eDespatch,'Despatch');
			
			invoiceXml=invoiceXml.replace('<Despatch','<s:Despatch');
			invoiceXml=invoiceXml.replace('</Despatch','</s:Despatch');
			var xml='<s:invoices>';
			xml +='<s:DespatchInfo LocalDocumentId="' + eDespatch.localDocumentId + '">';
			// xml +'<s:Scenario>eDespatch</s:Scenario>';
			if(eDespatch.profileId.value!='EARSIVFATURA'){
				xml +'<s:Scenario>1</s:Scenario>';
			}else{
				xml +'<s:Scenario>2</s:Scenario>';
			}
			
			if(!isTestPlatform || eDespatch.profileId.value=='EARSIVFATURA'){
			// if(!isTestPlatform){
				xml +='<s:TargetCustomer Title="' + title + '" VknTckn="' + vergiNo + '" Alias="' + alias + '" />';
			}else{
				xml +='<s:TargetCustomer Title="' + title + '" VknTckn="9000068418" Alias="defaultpk" />';
			}
			
			// xml +='<s:Despatch>' + invoiceXml + '</s:Despatch>';
			xml +='' + invoiceXml + '';
			xml +='<s:EArchiveDespatchInfo DeliveryType="Electronic" />';
			xml +='</s:DespatchInfo>';
			xml +='</s:invoices>';

			
			api.sendDespatch(options,xml,(err,result)=>{
				if(!err){

					//eventLog('sendToGib result:',result);
					callback(null,eDespatch);
				}else{
					//eventLog('sendToGib error:',err);
					callback(err);
				}

			});
		});
	}catch(tryErr){
		callback(tryErr);
	}
}

function findEDespatchUserPostBoxAlias(vergiNo,profileId,callback){
	try{
		if(profileId=='EARSIVFATURA') return callback(null,'defaultpk');

		db.einvoice_users.findOne({identifier:vergiNo,enabled:true},(err,doc)=>{
			if(!err){
				if(doc!=null){
					callback(null,doc.postboxAlias);
				}else{
					callback(null,'defaultpk');
				}
				
			}else{
				callback(err);
			}
		});

	}catch(tryErr){
		callback(tryErr);
	}
}


exports.sendDocumentResponse=function(responseStatus, dbModel,eDespatch,callback){
	try{
		var options=JSON.parse(JSON.stringify(eDespatch.eIntegrator));
		var isTestPlatform=false;
		if(options.url.indexOf('test')>-1) isTestPlatform=true;
		var query={DocumentResponseInfo:[{DespatchId:eDespatch.uuid.value,ResponseStatus:-1}]}
		switch(responseStatus.toLowerCase()){
			case 'approved':
				query.DocumentResponseInfo[0].ResponseStatus=0;
			break;
			case 'declined':
				query.DocumentResponseInfo[0].ResponseStatus=1;
			break;
			case 'return':
				query.DocumentResponseInfo[0].ResponseStatus=2;
			break;
		}

		api.sendDocumentResponse(options,query,(err,result)=>{
				if(!err){

					eventLog('sendDocumentResponse result:',result);
					callback(null,eDespatch);
				}else{
					eventLog('sendDocumentResponse error:',err);
					callback(err);
				}

			});
	}catch(tryErr){
		callback(tryErr);
	}
}

exports.checkInboxStatus=function(dbModel,eIntegratorDoc,invoiceList,callback){
	try{
		var options=JSON.parse(JSON.stringify(eIntegratorDoc.eDespatch));
		var isTestPlatform=false;
		if(options.url.indexOf('test')>-1) isTestPlatform=true;
		var query={
			DespatchIds:[],
			PageIndex:0, 
			PageSize:10000,

			OnlyNewestDespatchs:false,
			SetTaken:false
		}
		invoiceList.forEach((e)=>{
			query.despatchIds.push(e.uuid);
		})
		var guncellenmisDespatchList=[];

		function listeIndir(cb){
			api.getInboxDespatchList(eIntegratorDoc.eDespatch,JSON.parse(JSON.stringify(query)),(err,result)=>{
				if(!err){
					
					if(result.docs.length>0){
						eventLog('result.docs.length:',result.docs.length);
						eventLog('api.getInboxDespatchList page:',result.page+1,'/',result.pageCount);
						query.PageIndex++;
						if(query.PageIndex>=result.pageCount  || ( isTestPlatform && query.PageIndex==2)){ 
							result.docs.forEach((e)=>{
								invoiceList.forEach((e2)=>{
									if(e.uuid==e2.uuid){
										if(e2.status!=e.status){
											guncellenmisDespatchList.push({_id:e2._id,uuid:e2.uuid,status:e.status});
										}
										return;
									}
								});
								
							})
							cb(null);
						}else{
							result.docs.forEach((e)=>{
								invoiceList.forEach((e2)=>{
									if(e.uuid==e2.uuid){
										if(e2.status!=e.status){
											guncellenmisDespatchList.push({_id:e2._id,uuid:e2.uuid,status:e.status});
										}
										return;
									}
								});
								
							})
							setTimeout(()=>{
								listeIndir(cb);
								return;
							},1000);
						}
					}else{
						cb(null)
					}
				}else{
					eventLog('checkInboxStatus Hata:',err);
					cb(err);
				}
			}) 
		}


		listeIndir((err)=>{
			callback(err,guncellenmisDespatchList);
		});
	}catch(tryErr){
		callback(tryErr);
	}
}

exports.checkOutboxStatus=function(dbModel,eIntegratorDoc,invoiceList,callback){
	try{
		var options=JSON.parse(JSON.stringify(eIntegratorDoc.eDespatch));
		var isTestPlatform=false;
		if(options.url.indexOf('test')>-1) isTestPlatform=true;
		var query={
			DespatchIds:[],
			PageIndex:0, 
			PageSize:10000,

			OnlyNewestDespatchs:false,
			SetTaken:false
		}
		invoiceList.forEach((e)=>{
			query.despatchIds.push(e.uuid);
		})
		var guncellenmisDespatchList=[];

		function listeIndir(cb){
			api.getOutboxDespatchList(eIntegratorDoc.eDespatch,JSON.parse(JSON.stringify(query)),(err,result)=>{
				if(!err){
					
					if(result.docs.length>0){
						query.PageIndex++;
						if(query.PageIndex>=result.pageCount  || ( isTestPlatform && query.PageIndex==2)){ 
							result.docs.forEach((e)=>{
								invoiceList.forEach((e2)=>{
									if(e.uuid==e2.uuid){
										if(e2.status!=e.status){
											guncellenmisDespatchList.push({_id:e2._id,uuid:e2.uuid,status:e.status});
										}
										return;
									}
								});
								
							})
							cb(null);
						}else{
							result.docs.forEach((e)=>{
								invoiceList.forEach((e2)=>{
									if(e.uuid==e2.uuid){
										if(e2.status!=e.status){
											guncellenmisDespatchList.push({_id:e2._id,uuid:e2.uuid,status:e.status});
										}
										return;
									}
								});
								
							})
							setTimeout(()=>{
								listeIndir(cb);
								return;
							},1000);
						}
					}else{
						cb(null)
					}
				}else{
					eventLog('checkOutboxStatus Hata:',err);
					cb(err);
				}
			}) 
		}


		listeIndir((err)=>{
			callback(err,guncellenmisDespatchList);
		});
	}catch(tryErr){
		callback(tryErr);
	}
}
