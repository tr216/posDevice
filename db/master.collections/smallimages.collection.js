var schema = mongoose.Schema({
	imageid: { type: mongoose.Schema.Types.ObjectId, ref: 'images' },
    item: {type: mongoose.Schema.Types.ObjectId, ref:'items' , default:null},
    member: {type: mongoose.Schema.Types.ObjectId, ref:'members' , default:null},
    image: {type:String, default: ''},
    width:{type:Number,default:0},
    height:{type:Number,default:0},
    blur: {type:Boolean, default: false},
    uploaddate: {type:Date,default: Date('1900-01-01')},
    deleted: {type:Boolean, default: false},
    deleteddate: {type:Date,default: Date('1900-01-01')}
});

schema.pre('save',function(next){
	next();
	//bir seyler ters giderse 
	// next(new Error('ters giden birseyler var'));
});
schema.pre('remove',function(next){
	next();
});

schema.pre('remove', true, function (next, done) {
  	next();
	//bir seyler ters giderse 
	// next(new Error('ters giden birseyler var'));
});

schema.on('init', function (model) {

});

module.exports= dbconn.model('smallimages', schema);
