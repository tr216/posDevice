module.exports=function(conn){
    var schema = mongoose.Schema({
        name: {type: String, required: [true,'Isim gereklidir.']},
        importerType: {type: String, enum:['','invoice','despatch','order','e-invoice','e-ledger','zreport']},
        importFileExtensions:{type: String, trim:true, default:'*.*;'},
        startFile:{type: mongoose.Schema.Types.ObjectId, ref: 'files'},
        files:[{type: mongoose.Schema.Types.ObjectId, ref: 'files'}],
        createdDate: { type: Date,default: Date.now},
        modifiedDate:{ type: Date,default: Date.now},
        isDefault: {type: Boolean, default: true},
        passive: {type: Boolean, default: false}
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
    

    var collectionName='file_importers';
    var model=conn.model(collectionName, schema);
    
    model.removeOne=(member, filter,cb)=>{ sendToTrash(conn,collectionName,member,filter,cb); }
    
    //model.relations={pos_devices:'localConnector'}

    return model;
}
