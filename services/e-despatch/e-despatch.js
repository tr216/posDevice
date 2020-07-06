var processList=[]
var repeatInterval=60000*10
var SinifGrubu=require('./uyumsoft/DespatchIntegration.class.js')
var downloadInterval=5000 
var taskInterval=5000
var serviceName=`[eDespatch]`.yellow
var ioBox=(ioType)=>{ return ioType==0?'Outbox':'Inbox'}
global.WcfHelper=require('../../bin/wcf-helper').WcfHelper

exports.syncDespatches=(dbModel,ioType,integrator,callback)=>{
	eventLog(`syncDespatches ${ioBox(ioType)} started `)
	dbModel.temp_table.find({docType:`eDespatch_sync${ioBox(ioType)}List`,status:'',docId2:integrator._id},(err,docs)=>{
		if(!err){
			iteration(docs,
			(listItem,cb)=>{ 
				exports.getDespatch(dbModel,ioType,integrator,listItem,cb)
			},
			downloadInterval,true,
			(err,result)=>{
				callback(err,result)
			})
		}else{
			callback(err)
		}
	})
}

exports.getDespatch=(dbModel,ioType,integrator,listItem,callback)=>{
	dbModel.despatches.findOne({ioType:ioType, eIntegrator:listItem.docId2,'uuid.value':listItem.docId},(err,doc)=>{
		if(!err){
			if(doc==null){
				var GetDespatch=(query,cb)=>{
					if(ioType==0){
						integrator.despatchIntegration.GetOutboxDespatch(query,cb)
					}else{
						integrator.despatchIntegration.GetInboxDespatch(query,cb)
					}
				}
				GetDespatch(listItem.docId,(err,data)=>{
					if(!err){
						// fs.writeFileSync(path.join(config.tmpDir,`${ioBox(ioType)}_${listItem.document.despatchNumber}.json`),JSON.stringify(data,null,2),'utf8')
						var newDoc=new dbModel.despatches(data.value.despatchAdvice)
						newDoc.eIntegrator=integrator._id
						newDoc.ioType=ioType
						newDoc.despatchStatus=listItem.document.statusEnum
						if(newDoc.profileId.value=='TEMELSEVKIRSALIYESI')
							newDoc.profileId.value='TEMELIRSALIYE'


						newDoc.save((err,newDoc2)=>{
							if(!err){
								eventLog(`Despatch_${ioBox(ioType)}:${newDoc2.ID.value} indirildi`)
							}
							listItem.status='Downloaded'
							listItem.save((err)=>{
								callback(err)
							})
							
						})
					}else{
						callback(err)
					}
				})
			}else{
				eventLog(`getDespatch ${ioBox(ioType)} ${doc.ID.value} zaten var `)
				if(ioType==0){
					listItem.status='Uploaded'
				}else{
					listItem.status='Downloaded'
				}
				
				listItem.save((err)=>{
					callback(err)
				})
			}
		}else{
			callback(err)
		}
	})
}

exports.syncDespatchList=(dbModel,ioType,integrator,callback)=>{
	exports.syncDespatchList_queryModel(dbModel,ioType,integrator,(err,query)=>{
		var GetDespatchList=(query,cb)=>{
			if(ioType==0){
				integrator.despatchIntegration.GetOutboxDespatchList(query,cb)
			}else{
				integrator.despatchIntegration.GetInboxDespatchList(query,cb)
			}
		}

		function indir(cb){
			GetDespatchList(query,(err,data)=>{
				if(!err){
					if(data.value.attr.totalPages==0) 
						return cb(null)
					eventLog(`syncDespatchList ${ioBox(ioType)} page:${data.value.attr.pageIndex+1}/${data.value.attr.totalPages}`)
					if(!Array.isArray(data.value.items)){
						data.value.items=[clone(data.value.items)]
					}
					data.value.items.forEach((e)=>{ e._integratorId=integrator._id })
					iteration(data.value.items,(item,cb)=>{ exports.insertTempTable(dbModel,ioType,item,cb)},0,false,(err)=>{
						if(!err){
							if(data.value.attr.pageIndex<data.value.attr.totalPages-1){
								query.PageIndex++
								setTimeout(indir,downloadInterval,cb)
							}else{
								cb(null)
							}
							
						}else{
							cb(err)
						}
					})
				}else{
					cb(err)
				}
			})
		}

		indir((err)=>{
			callback(err)
		})
		
	})
	
}

exports.syncDespatchList_queryModel=(dbModel,ioType,integrator,cb)=>{
	var query=ioType==0?new SinifGrubu.OutboxDespatchListQueryModel():new SinifGrubu.InboxDespatchListQueryModel()

	
	query.PageIndex=0
	query.PageSize=10
	query.CreateStartDate=defaultStartDate()
	query.CreateEndDate=endDate()

	dbModel.temp_table.find({docType:`eDespatch_sync${ioBox(ioType)}List`}).sort({orderBy:-1}).limit(1).exec((err,docs)=>{
		if(!err){
			if(docs.length>0){
				var tarih=new Date(docs[0].document['createDateUtc'])
				tarih.setMinutes(tarih.getMinutes()+(new Date()).getTimezoneOffset()*-1)
				query.CreateStartDate=tarih.toISOString()

				cb(null,query)
			}else{
				cb(null,query)
			}
		}else{
			cb(err,query)
		}
	})
}

exports.insertTempTable=(dbModel,ioType,item,callback)=>{
	if(item['statusEnum']=='Error')
		return callback(null)
	var filter={
			docType:`eDespatch_sync${ioBox(ioType)}List`,
			docId:item['despatchId'],
			docId2:item['_integratorId']
		}

	dbModel.temp_table.findOne(filter,(err,doc)=>{
		if(err) 
			return callback(err)
		if(doc==null){
			var data={
				docType:`eDespatch_sync${ioBox(ioType)}List`,
				docId:item['despatchId'],
				docId2:item['_integratorId'],
				document:item,
				status:'',
				orderBy:item['createDateUtc']
			}
			
			doc=new dbModel.temp_table(data)
			doc.save((err)=>{
				callback(err)
			})
		}else{
			if(doc.document['statusEnum']!=item['statusEnum']){
				doc.status='modified'
				doc.document=item
				doc.modifiedDate=new Date()

				doc.save((err)=>{
					callback(err)
				})
			}else{
				callback(null)
			}
		}
	})
}


function defaultStartDate(){
	
	return (new Date((new Date()).getFullYear(),6,2,0,0,0)).toISOString()
}

function endDate(){
	var a=new Date()
	a.setMinutes(a.getMinutes()+(new Date()).getTimezoneOffset()*-1)
	return a.toISOString()
}

exports.logs=(dbModel,despatchDoc,callback)=>{
	var wsIrsaliye=new SinifGrubu.DespatchIntegration(despatchDoc.eIntegrator.despatch.url,despatchDoc.eIntegrator.despatch.username,despatchDoc.eIntegrator.despatch.password)
	var GetDespatchStatusWithLogs=(despatchIds,cb)=>{
			if(despatchDoc.ioType==0){
				wsIrsaliye.GetOutboxDespatchStatusWithLogs(despatchIds,cb)
			}else{
				wsIrsaliye.GetInboxDespatchStatusWithLogs(despatchIds,cb)
			}
		}
	
	GetDespatchStatusWithLogs([despatchDoc.uuid.value],(err,data)=>{
		if(!err){
			tempLog(`GetDespatchStatusWithLogs_response_${despatchDoc.ID.value}.json`,JSON.stringify(data,null,2))
			callback(null,data.value)
		}else{
			callback(err)
		}
		
	})
}


exports.xsltView=(dbModel,despatchDoc,callback)=>{
	try{
		var wsIrsaliye=new SinifGrubu.DespatchIntegration(despatchDoc.eIntegrator.despatch.url,despatchDoc.eIntegrator.despatch.username,despatchDoc.eIntegrator.despatch.password)
		var GetDespatchView=(despatchId,cb)=>{
				if(despatchDoc.ioType==0){
					wsIrsaliye.GetOutboxDespatchView(despatchId,cb)
				}else{
					wsIrsaliye.GetInboxDespatchView(despatchId,cb)
				}
			}
		
		GetDespatchView(despatchDoc.uuid.value,(err,data)=>{
			if(!err){
				callback(null,data.value.html)
			}else{
				callback(err)
			}
			
		})
	}catch(e){
		cb(e)
	}
}

function despatchTime(text){
	var sbuf='09:13:11.0000000+03:00'
	return sbuf
}

exports.getXslt=(dbModel,despatchDoc,cb)=>{
	if(despatchDoc.eIntegrator.despatch.xslt){
		dbModel.files.findOne({_id:despatchDoc.eIntegrator.despatch.xslt},(err,doc)=>{
			if(!err){
				if(doc!=null){
					cb(null,doc.data.replace('data:application/xml;base64,',''))
				}else{
					cb(null)
				}
			}else{
				cb(err)
			}
		})
	}else{
		cb(null)
	}
}

exports.sendToGib=(dbModel,despatchDoc,cb)=>{
	try{
		exports.getXslt(dbModel,despatchDoc,(err,xsltData)=>{
			if(!err){
				var wsIrsaliye=new SinifGrubu.DespatchIntegration(despatchDoc.eIntegrator.despatch.url,despatchDoc.eIntegrator.despatch.username,despatchDoc.eIntegrator.despatch.password)
				despatchDoc.despatchSupplierParty.party=despatchDoc.eIntegrator.party
				despatchDoc.sellerSupplierParty.party=despatchDoc.eIntegrator.party
				despatchDoc.buyerCustomerParty.party=despatchDoc.deliveryCustomerParty.party
				// despatchDoc.issueTime.value+='.0000000+03:00'
				if(despatchDoc.uuid.value=='')
					despatchDoc.uuid.value=uuid.v4()
				if(xsltData){
					despatchDoc.additionalDocumentReference=[{
						ID:{value:uuid.v4()},
						issueDate:{value:despatchDoc.issueDate.value},
						documentType:{value:'xslt'},
						attachment:{
							embeddedDocumentBinaryObject:{
								attr:{
									filename:'tr216com.xslt',
									characterSetCode:'UTF-8',
									encodingCode:'Base64',
									mimeCode:'application/xml'
								},
								value:xsltData
							}
						}
					}]
				}

				despatchDoc.shipment={
					ID:{value:'1'},
					shipmentStage:despatchDoc.shipment.shipmentStage,
					delivery:{
						ID:{value:'1'},
						despatch:{
							actualDespatchDate:{value:despatchDoc.issueDate.value},
							actualDespatchTime:{value:despatchDoc.issueTime.value}
						}
					}
				}

				var despatchInfo=new SinifGrubu.DespatchInfo(despatchDoc)
				var xmlstr=despatchInfo.generateXml()
				
				tempLog(`sendToGib_request_${despatchDoc.ID.value}.xml`,xmlstr)
				/* DespatchInfo[] despatches */
				wsIrsaliye.SendDespatch([xmlstr],(err,data)=>{
					if(!err){
						tempLog(`sendToGib_response_${despatchDoc.ID.value}.json`,JSON.stringify(data,null,2))
						dbModel.despatches.updateMany({_id:despatchDoc._id},{
							$set:{
								despatchStatus:'Queued',
								uuid:{value:data.value.attr.id},
								ID:{value:data.value.attr.number}
							}
						},{multi:false},(err)=>{
							if(!err){
								cb(null,data.value)
							}else{
								cb(err)
							}
						})
					}else{
						tempLog(`sendToGib_response_err_${despatchDoc.ID.value}.json`,JSON.stringify(err,null,2))
						errorLog(`${serviceName} Hata:`,err)
						cb(err)
					}
				})
			}else{
				cb(err)
			}
		})
		

	}catch(e){
		cb(e)
	}
	
}


function listenTasks(dbModel){
	dbModel.tasks.find({taskType:'edespatch_send_to_gib',status:'pending'},(err,docs)=>{
		if(!err){
			if(docs.length>0){
				eventLog(`${serviceName} task count:${docs.length}`)
				iteration(docs,(item,cb)=>{ 
					exports.sendToGib(dbModel,item.document,(err)=>{
						if(!err){
							dbModel.tasks.updateMany({_id:item._id},{$set:{status:'completed'}},(err)=>{
								cb(err)
							})
						}else{
							dbModel.tasks.updateMany({_id:item._id},{$set:{status:'error',error:[{code:(err.code || err.name || 'TASK_ERROR'),message:err.message}]}},{multi:false},(err2)=>{
								dbModel.despatches.updateMany({_id:item.documentId},{$set:{despatchStatus:'Error',despatchErrors:[{code:(err.code || err.name || 'TASK_ERROR'),message:err.message}]}},{multi:false},(err2)=>{
									cb(null)
								})
							})
						}
					})
				},0,true,(err,result)=>{
					if(!err){
						eventLog(`${serviceName} sendToGib:${dbModel.dbName}\tOK`)
					}else{
						errorLog(`${serviceName} sendToGib:${dbModel.dbName} \tError`,err)
					}
					setTimeout(()=>{
						listenTasks(dbModel)
					},taskInterval)
				})
			}else{
				setTimeout(()=>{
					listenTasks(dbModel)
				},taskInterval)
			}
			
					
		}else{
			errorLog(`${serviceName} Hata:\n`,err)
			setTimeout(()=>{
				listenTasks(dbModel)
			},taskInterval)
		}
	})
}

exports.queryDespatchStatus=(dbModel,despatchDoc,cb)=>{
	try{
		if(!despatchDoc.eIntegrator)
			return cb(null)
		
		var wsIrsaliye=new SinifGrubu.DespatchIntegration(despatchDoc.eIntegrator.despatch.url,despatchDoc.eIntegrator.despatch.username,despatchDoc.eIntegrator.despatch.password)
		var GetDespatchList=(query,cb)=>{
			if(despatchDoc.ioType==0){
				return wsIrsaliye.GetOutboxDespatchList(query,cb)
			}else{
				return wsIrsaliye.GetInboxDespatchList(query,cb)
			}
		}

		var query={
			DespatchIds:[despatchDoc.uuid.value],
			PageIndex:0,
			PageSize:1
		}
		GetDespatchList(query,(err,data)=>{
			if(!err){
				if(!data.value)
					return cb(null)
				if(!data.value.items)
					return cb(null)
				
				if(!Array.isArray(data.value.items)){
					data.value.items=[clone(data.value.items)]
				}
				var obj={
					_id:despatchDoc._id,
					uuid:data.value.items[0].despatchId,
					ID:data.value.items[0].despatchNumber,
					title:data.value.items[0].targetTitle,
					vknTckn:data.value.items[0].targetTcknVkn,
					despatchStatus:data.value.items[0].statusEnum
				}
				if(despatchDoc.despatchStatus!=data.value.items[0].statusEnum){
					dbModel.despatches.updateMany({_id:despatchDoc._id},{$set:{despatchStatus:data.value.items[0].statusEnum}},{multi:false},(err)=>{
						if(!err){
							cb(null,obj)
						}else{
							cb(err)
						}
					})
				}else{
					cb(null,obj)
				}
			}else{
				cb(err)
			}
		})
		
				
	}catch(e){
		cb(e)
	}
}

function repeatDownloadDespatches(dbModel){
	dbModel.integrators.find({passive:false},(err,docs)=>{
		if(!err){
			var integrators=[]
			docs.forEach((e)=>{
				var itg=e.toJSON()
				itg['despatchIntegration']=new SinifGrubu.DespatchIntegration(itg.despatch.url,itg.despatch.username,itg.despatch.password)
				integrators.push(itg)
			})

			iteration(integrators,(item,cb)=>{ exports.syncDespatchList(dbModel,0,item,cb)},0,true,(err,result)=>{
				if(err)
					errorLog(`e-despatch service ${ioBox(0)}List  error:`,err)
				else
					eventLog(`e-despatch service ${ioBox(0)}List\tok`)

				iteration(integrators,(item,cb)=>{ exports.syncDespatchList(dbModel,1,item,cb)},0,true,(err,result)=>{
					if(err)
						errorLog(`e-despatch service ${ioBox(1)}List  error:`,err)
					else
						eventLog(`e-despatch service ${ioBox(1)}List\tok`)

					iteration(integrators,(item,cb)=>{ exports.syncDespatches(dbModel,0,item,cb)},0,true,(err,result)=>{
						if(err)
							errorLog(`e-despatch service ${ioBox(0)}Despatches  error:`,err)
						else
							eventLog(`e-despatch service ${ioBox(0)}Despatches\tok`)

						iteration(integrators,(item,cb)=>{ exports.syncDespatches(dbModel,1,item,cb)},0,true,(err,result)=>{
							if(err)
								errorLog(`e-despatch service ${ioBox(1)}Despatches  error:`,err)
							else
								eventLog(`e-despatch service ${ioBox(1)}Despatches\tok`)
							
							
							eventLog('e-despatch service finished:',dbModel.dbName)
							setTimeout(()=>{repeatDownloadDespatches(dbModel)},repeatInterval)
						})
					})
				})
			})
			
			setTimeout(()=>{repeatDownloadDespatches(dbModel)},repeatInterval)
		}else{
			errorLog('e-despatch service error:',err)
			setTimeout(()=>{repeatDownloadDespatches(dbModel)},repeatInterval)
		}
	})
}

function repeatCheckDespatcheStatus(dbModel){
	var baslamaTarihi=(new Date()).addDays(-15).yyyymmdd()
	var filter={
		ioType:0,
		despatchStatus:{$nin:['Approved','PartialApproved','Declined','Canceled','Cancelled']},
		'issueDate.value':{$gte:baslamaTarihi}
	}

	dbModel.despatches.find(filter).populate('eIntegrator').exec((err,docs)=>{
		if(!err){
			console.log('statusu kontrol edilecek irs:',docs.length)
			iteration(docs,(item,cb)=>{ exports.queryDespatchStatus(dbModel,item,cb)},0,true,(err,result)=>{
				if(!err){
					eventLog('result:',result)
				}else{
					errorLog(err)
				}
				setTimeout(()=>{repeatCheckDespatcheStatus(dbModel)},repeatInterval)
			})
			
		}else{
			errorLog(err)
			setTimeout(()=>{repeatCheckDespatcheStatus(dbModel)},repeatInterval)
		}
	})
}

exports.start=()=>{

	

	setTimeout(()=>{
		Object.keys(repoDb).forEach((e)=>{
			repeatDownloadDespatches(repoDb[e])
			eventLog(`${serviceName} download working on ${repoDb[e].dbName.cyan}`)
			
			repeatCheckDespatcheStatus(repoDb[e])
			eventLog(`${serviceName} checkStatus working on ${repoDb[e].dbName.cyan}`)

			listenTasks(repoDb[e])
			eventLog(`${serviceName} tasks listening on ${repoDb[e].dbName.cyan}`)
			
		})
		
	},10000)
}
