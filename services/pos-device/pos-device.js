/* Pos Device Service | etulia/portal */
var ingenico=require('./ingenico/ingenico.js')
var repeatInterval=60000

exports.start=()=>{
	
	function calistir(){
		refreshRepoDb(()=>{
			Object.keys(repoDb).forEach((_id)=>{
				if(!repoDb[_id].working){
					repoDb[_id].working=true
					syncPosDeviceSync(repoDb[_id],()=>{
						repoDb[_id].working=false
					})
				}else{
					console.log(`${repoDb[_id].dbName.yellow} is working`)
				}
			})
		})
		setTimeout(calistir,repeatInterval)
	}

	calistir()
}


function syncPosDeviceSync(dbModel,cb){
	
	eventLog(`syncPosDeviceSync on ${dbModel.dbName.yellow}`)
	try{
		checkDbAndDownload(dbModel,(err)=>{
			if(err){
				errorLog(`Error: syncPosDeviceSync db:${dbModel.dbName.yellow}`,err)
			}
			cb()
		})
	}catch(tryErr){
		errorLog(`tryErr:`,tryErr)
		cb()
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
							console.log(`checkDbAndDownload ${dbModel.dbName} index:${index}:`)
							downloadData(dbModel,serviceDocs[index],posDeviceDocs,(err)=>{
								if(err){
									errorLog(`(${dbModel.dbName.yellow}) ${serviceDocs[index].type.cyan} _id:${serviceDocs[index]._id.cyan}:`,err)
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
	
	switch(serviceDoc.type){
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
