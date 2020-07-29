module.exports=function(conn){
	var schema = mongoose.Schema({
		name: {type: String, required: [true,'Isim gereklidir.']},
		files:[{
			fileName:{type :String, default:''},
			code:{type :String, default:''},
			randerEngine:{type :String, default:'ejs'}
		}],
		createdDate: { type: Date,default: Date.now},
		modifiedDate:{ type: Date,default: Date.now},
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


	var collectionName='programs';
	var model=conn.model(collectionName, schema);

	model.removeOne=(member, filter,cb)=>{ sendToTrash(conn,collectionName,member,filter,cb); }

    //model.relations={pos_devices:'localConnector'}

    return model;
  }
