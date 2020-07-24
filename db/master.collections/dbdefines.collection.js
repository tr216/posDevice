var schema = mongoose.Schema({
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'members', default: null, index:true},
    dbName: {type: String, required: true, index:true},
    userDb: {type: String, default: "", index:true},    //kullanici icin acilan mongodb ismi
    userDbHost: {type: String,  default: "mongodb://localhost:27017/", index:true},  //kullanicin veri tabaninin bulundugu mongo server address
    authorizedMembers:[{
        memberId:{type: mongoose.Schema.Types.ObjectId, ref: 'members', default: null, index:true},
        canRead:{type: Boolean, default: true},
        canWrite:{type: Boolean, default: false},
        canDelete:{type: Boolean, default: false}
        }
    ],
    settings:{type: Object, default:null},
    createdDate: { type: Date,default: Date.now},
    modifiedDate:{ type: Date,default: Date.now},
    version:{type: String, default: "", index:true},
    deleted: {type: Boolean, default: false, index:true},
    passive: {type: Boolean, default: false, index:true}
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

module.exports = dbconn.model('dbdefines', schema);