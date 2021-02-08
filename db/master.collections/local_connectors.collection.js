var schema = mongoose.Schema({
    connectorId: {type: Number, default:0, unique : true},
    connectorPass: {type: String, required: true},
    uuid: {type: String, required: true,default:""},
    version: {type: String, default:""},
    ip: {type: String, required: true,default:""},
    platform: {type: String,default:""},
    architecture: {type: String,default:""},
    hostname: {type: String,default:""},
    release: {type: String,default:""},
    userInfo: {type: Object,default:null},
    cpus: {type: Object,default:null},
    freemem: {type: Number,default:0},
    totalmem: {type: Number,default:0},
    createdDate: { type: Date,default: Date.now},
    lastOnline:{ type: Date,default: Date.now},
    lastError: {type: String, default:""},
    passive: {type: Boolean, default: false}
})

schema.pre('save', function(next) {
    if(this.connectorId==0){
        this.connectorId=112600420
        dbconn.model('etulia_connectors').findOne({}).sort({connectorId:-1}).exec((err,doc)=>{
            if(!err){
                if(doc!=null){
                    this.connectorId=doc.connectorId+1
                }
            }else{
                console.log('save error:',err)
            }
            next()
        })
        
    }else{
        next()
    }
    
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


module.exports = dbconn.model('local_connectors', schema)