module.exports=function(conn){
    var schema = mongoose.Schema({
        name:{type: String, trim:true, required:[true,'isim gereklidir']},
        account: {type: mongoose.Schema.Types.ObjectId, ref: 'accounts', default:null },
        salesAccount: {type: mongoose.Schema.Types.ObjectId, ref: 'accounts', default:null },
        returnAccount: {type: mongoose.Schema.Types.ObjectId, ref: 'accounts', default:null },
        exportSalesAccount: {type: mongoose.Schema.Types.ObjectId, ref: 'accounts', default:null },
        salesDiscountAccount: {type: mongoose.Schema.Types.ObjectId, ref: 'accounts', default:null },
        buyingDiscountAccount: {type: mongoose.Schema.Types.ObjectId, ref: 'accounts', default:null },
        costOfGoodsSoldAccount: {type: mongoose.Schema.Types.ObjectId, ref: 'accounts', default:null },
        createdDate: { type: Date,default: Date.now, index:true },
        modifiedDate:{ type: Date,default: Date.now, index:true }
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
    
    schema.index({
        "name":1
    },{unique:true})
    var collectionName='account_groups'
    var model=conn.model(collectionName, schema)
    

    model.removeOne=(member, filter,cb)=>{ sendToTrash(conn,collectionName,member,filter,cb) }
    // model.removeMany=(member, filter,cb)=>{ sendToTrashMany(conn,collectionName,member,filter,cb) }
    model.relations={items:'accountGroup'}

    return model
}

