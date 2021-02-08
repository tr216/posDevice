var schema = mongoose.Schema({
    identifier: {type: String, trim:true, default:"" ,index:true},
    postboxAlias: {type: String, trim:true, default:"",index:true},
    senderboxAlias: {type: String, trim:true, default:"",index:true},
    title: {type: String, trim:true, default:"",index:true},
    type: {type: String, trim:true, default:""},
    systemCreateDate: { type: Date,default: Date.now},
    firstCreateDate: { type: Date,default: Date.now},
    enabled: {type: Boolean, default: false,index:true}
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

schema.plugin(mongoosePaginate)



schema.on('init', function(model) {
 
})



module.exports = dbconn.model('edespatch_users', schema)