var schema = mongoose.Schema({
    username: {type:String, required: true},
    password: {type :String, default: ""},
    role: {type :String, default: "user"},
    name:{type :String, trim:true, default: ""},
    lastName:{type :String, trim:true, default: ""},
    gender: {type :String, default: ""},
    isMobile: {type :Boolean, default: true},
    authCode: {type :String, default: ""},
    verified: {type :Boolean, default: false},
    email: {type :String, default: ""},
    country: {type :String, default: ""},
    favorites: [],
    point : {type :Number, default: 100},
    latitude: {type :Number, default: 0},
    longitude:{type :Number, default: 0},
    address:{
        cityName: {type :String, default: ''},
        citySubdivisionName:{type :String, default: ''},
        streetName:{type :String, default: ''},
        buildingNumber: {type :String, default: ''},
        buildingName: {type :String, default: ''},
        room: {type :String, default: ''},
        countryName: {type :String, default: ''},
        province: {type :String, default: ''}
    },
    address2:{
        cityName: {type :String, default: ''},
        citySubdivisionName:{type :String, default: ''},
        streetName:{type :String, default: ''},
        buildingNumber: {type :String, default: ''},
        buildingName: {type :String, default: ''},
        room: {type :String, default: ''},
        countryName: {type :String, default: ''},
        province: {type :String, default: ''}
    },
    mainPicture: {type: mongoose.Schema.Types.ObjectId, ref:'images' , default:null},
    mainPictureSmall: {type: mongoose.Schema.Types.ObjectId, ref:'smallimages' , default:null},
    mainPictureBlur: {type: mongoose.Schema.Types.ObjectId, ref:'images' , default:null},
    mainPictureSmallBlur: {type: mongoose.Schema.Types.ObjectId, ref:'smallimages' , default:null},
    taxboardPicture: {type: mongoose.Schema.Types.ObjectId, ref:'images' , default:null},
    idCardPicture1: {type: mongoose.Schema.Types.ObjectId, ref:'images' , default:null},
    idCardPicture2: {type: mongoose.Schema.Types.ObjectId, ref:'images' , default:null},

    showName :  {type :Boolean, default: true},
    showPicture :  {type :Boolean, default: true},
    profileEnabled :  {type :Boolean, default: true},
    ip: {type :String, default: ""},
    deviceId: {type :String, default: ""},
    deviceToken: {type :String, default: ""},
    createdDate: { type: Date,default: Date.now},
    modifiedDate:{ type: Date,default: Date.now},
    modules:{},
    passive: {type: Boolean, default: false}
})

schema.pre('save',function(next){
	next()
	//bir seyler ters giderse 
	// next(new Error('ters giden birseyler var'))
})
schema.pre('remove',function(next){
	next()
})


schema.pre('remove', true, function (next, done) {
  	next()
	//bir seyler ters giderse 
	// next(new Error('ters giden birseyler var'))
})

schema.on('init', function (model) {

})

schema.plugin(mongoosePaginate)
schema.plugin(mongooseAggregatePaginate)

var model=dbconn.model('members', schema)

schema.index({ name: 'text', lastName: 'text'},{default_language: "turkish" ,name:'members_searchindex', weights:{name:10,lastName:5}})
model.removeOne=(member, filter,cb)=>{ sendToTrash(conn,collectionName,member,filter,cb) }

module.exports=model