module.exports=function(conn){
    var schema = mongoose.Schema({
        posDevice: {type: mongoose.Schema.Types.ObjectId, ref: 'pos_devices', required: true},
        zNo: { type: Number,default: 0},
        zDate: { type: Date,default: null},
        zTotal: { type: Number,default: 0},
        data: {type: Object, default: null},
        status: {type: String, default: '',enum:['','transferring','pending','transferred','error']},
        createdDate: { type: Date,default: Date.now},
        modifiedDate:{ type: Date,default: Date.now},
        error:{code:'',message:''}
    });

    schema.pre('save', function(next) {
        next();
        //bir seyler ters giderse 
        // next(new Error('ters giden birseyler var'));
    });
    schema.pre('remove', function(next) {
        next();
    });

    schema.pre('remove', true, function(next, done) {
        next();
        //bir seyler ters giderse 
        // next(new Error('ters giden birseyler var'));
    });

    schema.on('init', function(model) {

    });
    

    

    schema.plugin(mongoosePaginate);
    schema.plugin(mongooseAggregatePaginate);
    
    schema.index({
        "zNo":1,
        "zDate":1,
        "status":1,
        "posDevice":1
    });
    
    var collectionName='pos_device_zreports';
    var model=conn.model(collectionName, schema);
    
    model.removeOne=(member, filter,cb)=>{ sendToTrash(conn,collectionName,member,filter,cb); }
    
    return model;
}
