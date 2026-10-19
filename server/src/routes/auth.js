import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendOtpEmail } from '../utils/email.js';
import { protect } from '../middleware/auth.js';
const router=Router();
const otpLimiter=rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false,message:{message:'Too many OTP requests. Try again in 15 minutes.'}});
const authLimiter=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false,message:{message:'Too many attempts. Try again later.'}});
const emailNorm=v=>String(v||'').trim().toLowerCase();
const codeHash=(email,purpose,code)=>crypto.createHash('sha256').update(`${email}:${purpose}:${code}:${process.env.JWT_SECRET}`).digest('hex');
const makeCode=()=>crypto.randomInt(0,1000000).toString().padStart(6,'0');
function tokenFor(user){return jwt.sign({sub:user._id.toString(),role:user.role},process.env.JWT_SECRET,{expiresIn:'8h'});}
async function issueOtp(email,purpose){ const code=makeCode(); await Otp.deleteMany({email,purpose}); await Otp.create({email,purpose,codeHash:codeHash(email,purpose,code),expiresAt:new Date(Date.now()+5*60*1000)}); try { await sendOtpEmail(email,code,purpose); } catch(e) { await Otp.deleteMany({email,purpose}); throw e; } }
router.post('/register',authLimiter,async(req,res)=>{
  const name=String(req.body.name||'').trim(), email=emailNorm(req.body.email), phone=String(req.body.phone||'').trim(), password=String(req.body.password||'');
  if(name.length<2 || !/^\S+@\S+\.\S+$/.test(email) || password.length<8) return res.status(400).json({message:'Enter a valid name and email. Password must be at least 8 characters.'});
  if(await User.exists({email,isVerified:true})) return res.status(409).json({message:'An account with this email already exists.'});
  const passwordHash=await bcrypt.hash(password,12); await User.findOneAndUpdate({email,isVerified:false},{name,email,phone,passwordHash,role:'client',isVerified:false,isActive:true},{upsert:true,new:true,setDefaultsOnInsert:true});
  try { await issueOtp(email,'verify-email'); res.status(200).json({message:'Verification code sent to your email.',email}); } catch(e){ console.error(e); res.status(503).json({message:'Could not send email OTP. Check Gmail SMTP configuration and try again.'}); }
});
router.post('/verify-email',authLimiter,async(req,res)=>{
  const email=emailNorm(req.body.email), code=String(req.body.code||'').trim(); if(!/^\d{6}$/.test(code)) return res.status(400).json({message:'Enter the 6-digit code.'});
  const otp=await Otp.findOne({email,purpose:'verify-email',consumed:false,expiresAt:{$gt:new Date()}}).sort({createdAt:-1});
  if(!otp) return res.status(400).json({message:'Code expired or not found. Request a new code.'}); if(otp.attempts>=5){await otp.deleteOne();return res.status(429).json({message:'Too many incorrect codes. Request a new code.'});}
  if(otp.codeHash!==codeHash(email,'verify-email',code)){otp.attempts+=1;await otp.save();return res.status(400).json({message:'Incorrect verification code.'});}
  otp.consumed=true; await otp.save(); const user=await User.findOneAndUpdate({email,role:'client'},{isVerified:true},{new:true}); if(!user)return res.status(400).json({message:'Registration not found. Please register again.'}); await Otp.deleteMany({email,purpose:'verify-email'});
  res.json({message:'Email verified. Your account is ready.',token:tokenFor(user),user});
});
router.post('/resend-otp',otpLimiter,async(req,res)=>{const email=emailNorm(req.body.email);const purpose=req.body.purpose==='reset-password'?'reset-password':'verify-email'; if(!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({message:'Enter a valid email.'}); const user=await User.findOne({email}); if(purpose==='verify-email' && (!user || user.isVerified))return res.json({message:'If the account needs verification, a new code will be sent.'}); if(purpose==='reset-password'&&!user)return res.json({message:'If the account exists, a reset code will be sent.'}); try{await issueOtp(email,purpose);res.json({message:'If applicable, a new code has been sent.'});}catch(e){console.error(e);res.status(503).json({message:'Unable to send OTP. Check email settings.'});}});
router.post('/login',authLimiter,async(req,res)=>{const email=emailNorm(req.body.email),password=String(req.body.password||'');const user=await User.findOne({email}).select('+passwordHash'); if(!user || !(await bcrypt.compare(password,user.passwordHash)))return res.status(401).json({message:'Invalid email or password.'}); if(!user.isActive)return res.status(403).json({message:'This account has been deactivated.'}); if(user.role==='client'&&!user.isVerified)return res.status(403).json({message:'Please verify your email before logging in.'}); res.json({token:tokenFor(user),user});});
router.post('/forgot-password',otpLimiter,async(req,res)=>{const email=emailNorm(req.body.email);if(!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({message:'Enter a valid email.'});const user=await User.findOne({email,isActive:true});if(user){try{await issueOtp(email,'reset-password');}catch(e){console.error(e);return res.status(503).json({message:'Unable to send OTP. Check email settings.'});}}res.json({message:'If an active account exists for that email, a reset code has been sent.'});});
router.post('/reset-password',authLimiter,async(req,res)=>{const email=emailNorm(req.body.email),code=String(req.body.code||''),password=String(req.body.password||'');if(!/^\d{6}$/.test(code)||password.length<8)return res.status(400).json({message:'Enter a valid 6-digit code and a password of at least 8 characters.'});const otp=await Otp.findOne({email,purpose:'reset-password',consumed:false,expiresAt:{$gt:new Date()}}).sort({createdAt:-1});if(!otp)return res.status(400).json({message:'Code expired or not found. Request a new one.'});if(otp.attempts>=5){await otp.deleteOne();return res.status(429).json({message:'Too many incorrect codes. Request a new code.'});}if(otp.codeHash!==codeHash(email,'reset-password',code)){otp.attempts+=1;await otp.save();return res.status(400).json({message:'Incorrect verification code.'});}otp.consumed=true;await otp.save();const passwordHash=await bcrypt.hash(password,12);const user=await User.findOneAndUpdate({email,isActive:true},{passwordHash},{new:true});await Otp.deleteMany({email,purpose:'reset-password'});if(!user)return res.status(400).json({message:'Account not found.'});res.json({message:'Password reset successful. You can now log in.'});});
router.get('/me',protect,(req,res)=>res.json({user:req.user}));
export default router;
