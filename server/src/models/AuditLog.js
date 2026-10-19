import mongoose from 'mongoose';
const schema = new mongoose.Schema({ actor:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, actorName:{type:String,default:''}, action:{type:String,required:true}, entity:{type:String,required:true}, entityId:{type:String,default:''}, details:{type:String,default:''}, ip:{type:String,default:''} },{timestamps:true});
export default mongoose.model('AuditLog',schema);
