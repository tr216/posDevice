/* Pos Device Service | etulia/portal */
var ingenico=require('./ingenico/ingenico.js')
var repeatInterval=60000

exports.start=()=>{
	Object.keys(repoDb).forEach((_id)=>{
		console.log(`start ${repoDb[_id].dbName}:`)
		setTimeout(()=>{
			syncPosDeviceSync(repoDb[_id])/15
		},20000)
	})
}


function syncPosDeviceSync(dbModel){
	eventLog(`syncPosDeviceSync on ${dbModel.dbName.yellow}`)
	try{
		checkDbAndDownload(dbModel,(err)=>{
			if(err){
				errorLog(`Error: syncPosDeviceSync db:${dbModel.dbName.yellow}`,err)
			}
			setTimeout(()=>{ syncPosDeviceSync(dbModel) },repeatInterval)
		})
	}catch(tryErr){
		console.error(`tryErr:`,tryErr)
		setTimeout(()=>{ syncPosDeviceSync(dbModel) },repeatInterval)
	}
}


function checkDbAndDownload(dbModel,callback){

	if(dbModel.pos_device_services==undefined) 
		return callback(null)
	
	dbModel.pos_device_services.find({url:{$ne:''},passive:false},(err,serviceDocs)=>{
		if(dberr(err,callback)){
			var index=0
			function runService(cb){
				if(index>=serviceDocs.length){
					cb(null)
				}else{
					dbModel.pos_devices.find({service:serviceDocs[index]._id,passive:false},(err,posDeviceDocs)=>{
						if(!err){
							
							downloadData(dbModel,serviceDocs[index],posDeviceDocs,(err)=>{
								if(err){
									errorLog(`(${dbModel.dbName.yellow}) ${serviceDocs[index].serviceType.cyan} _id:${serviceDocs[index]._id.cyan}:`,err)
								}
								index++
								setTimeout(runService,3000,cb)
							})
						}else{
							index++
							setTimeout(runService,3000,cb)
							//cb(err)
						}
					})
				}
			}

			runService((err)=>{
				callback(err)
			})

		}
	})
}

function downloadData(dbModel,serviceDoc,posDeviceDocs,cb){
	
	switch(serviceDoc.serviceType){
		case 'ingenico':
		ingenico.download(dbModel,serviceDoc,posDeviceDocs,cb)
		break
		default:
		cb(null)
		break
	}
}


exports.zreportDataToString=(serviceType,data)=>{
	switch(serviceType){
		case 'ingenico':
		return ingenico.zreportDataToString(data)
		default:
		return 'ZREPORT DETAIL...'
	}
}
