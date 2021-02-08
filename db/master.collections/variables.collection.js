var schema = mongoose.Schema({
    parameter: {type: String, trim:true, default:""},
    value: {type: Object}
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



module.exports = dbconn.model('variables', schema)