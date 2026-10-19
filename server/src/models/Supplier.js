import mongoose from 'mongoose';
const schema = new mongoose.Schema({ name:{type:String,required:true,trim:true}, contactPerson:{type:String,default:''}, email:{type:String,default:''}, phone:{type:String,default:''}, address:{type:String,default:''}, notes:{type:String,default:''} }, {timestamps:true});
export default mongoose.model('Supplier', schema);
