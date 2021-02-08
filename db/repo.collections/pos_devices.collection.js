module.exports=function(conn){
    var schema = mongoose.Schema({
        location: {type: mongoose.Schema.Types.ObjectId, ref: 'locations', required: [true,'Lokasyon gereklidir.']},
        service: {type: mongoose.Schema.Types.ObjectId, ref: 'pos_device_services', required: [true,'Yazarkasa servisi gereklidir.']},
        deviceSerialNo: {type: String, required: [true,'Cihaz seri numarasi gereklidir.']},
        deviceModel: {type: String, default: ''},
        localConnector: {type: mongoose.Schema.Types.ObjectId, ref: 'local_connectors',default:null},
        createdDate: { type: Date,default: Date.now},
        modifiedDate:{ type: Date,default: Date.now},
        passive: {type: Boolean, default: false}
    })

    schema.pre('save', function(next) {
        next()
        //bir seyler ters giderse 
        // next(new Error('ters giden birseyler var'))
    })
    schema.pre('remove', function(next) {
        next()
    })

    schema.pre('remove', true, function(next, done) {
        next()
        //bir seyler ters giderse 
        // next(new Error('ters giden birseyler var'))
    })

    schema.on('init', function(model) {

    })
    schema.plugin(mongoosePaginate)
    

    var collectionName='pos_devices'
    var model=conn.model(collectionName, schema)
    
    model.removeOne=(member, filter,cb)=>{ sendToTrash(conn,collectionName,member,filter,cb) }
    
    model.relations={pos_device_zreports:'posDevice'}

    return model
}
