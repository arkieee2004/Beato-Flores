import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export async function protect(req,res,next){
  try { const header=req.headers.authorization; if(!header?.startsWith('Bearer ')) return res.status(401).json({message:'Please log in.'});
    const payload=jwt.verify(header.slice(7),process.env.JWT_SECRET); const user=await User.findById(payload.sub);
    if(!user || !user.isActive) return res.status(401).json({message:'Account is unavailable.'});
    req.user=user; next();
  } catch { return res.status(401).json({message:'Invalid or expired session. Please log in again.'}); }
}
export const allowRoles=(...roles)=>(req,res,next)=>{ if(!req.user || !roles.includes(req.user.role)) return res.status(403).json({message:'You do not have permission to perform this action.'}); next(); };
