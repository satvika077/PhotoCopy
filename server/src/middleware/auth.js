import admin from 'firebase-admin';
const configured=process.env.FIREBASE_PROJECT_ID&&process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY;
if(configured&&!admin.apps.length) admin.initializeApp({credential:admin.credential.cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')})});
export const firestore=()=>configured?admin.firestore():null;
export async function authMiddleware(req,res,next){ if(!configured){ req.auth=null; return next(); } try{const header=req.headers.authorization||'';if(!header.startsWith('Bearer '))return res.status(401).json({message:'Authentication required'});req.auth=await admin.auth().verifyIdToken(header.slice(7));next();}catch{res.status(401).json({message:'Invalid or expired token'});} }
