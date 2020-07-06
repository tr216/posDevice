
    var schema = mongoose.Schema({
        collectionName: {type: String, default: ''},
        documentId: {type: mongoose.Schema.Types.ObjectId, default: null},
        document: {type: Object, default: null},
        deletedBy: {type: String, required: true, default: ''},
        deletedDate: { type: Date,required: true, default: Date.now}
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
    
   
    var collectionName='recycle';
    var model=dbconn.model(collectionName, schema);
    
    //model.removeOne=(member, filter,cb)=>{ sendToTrash(dbconn,collectionName,member,filter,cb); }
    //model.relations={pos_devices:'location'}

    module.exports = dbconn.model(collectionName, schema);


