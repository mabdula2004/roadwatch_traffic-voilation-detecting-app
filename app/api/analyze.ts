import {createClient} from '@supabase/supabase-js';
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
 const publicKey=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const aiKey=process.env.OPENROUTER_API_KEY;
 if(!url||!publicKey||!aiKey)return res.status(503).json({error:'AI analysis is not configured on this deployment.'});
 const authorization=req.headers.authorization;
 if(typeof authorization!=='string'||!authorization.startsWith('Bearer '))return res.status(401).json({error:'Sign in before submitting evidence.'});
 const {data,error}=await createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}}).auth.getUser(authorization.slice(7));
 if(error||!data.user)return res.status(401).json({error:'Your session is invalid or expired.'});
 const messages=req.body?.messages;
 if(!Array.isArray(messages)||messages.length!==1||messages[0]?.role!=='user'||!Array.isArray(messages[0]?.content))return res.status(400).json({error:'Invalid analysis request.'});
 const content=messages[0].content;
 if(content.length<1||content.length>4||content.some((part:any)=>(!part||typeof part!=='object')?true:part.type==='text'?typeof part.text!=='string'||part.text.length>24000:part.type!=='image_url'||typeof part.image_url?.url!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(part.image_url.url)||part.image_url.url.length>1500000))return res.status(400).json({error:'Invalid or oversized evidence frames.'});
 try{
  const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${aiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.AI_MODEL||'qwen/qwen3-vl-8b-instruct',messages,temperature:.1,max_tokens:450}),signal:AbortSignal.timeout(45000)});
  if(!response.ok)return res.status(response.status===402?402:response.status===429?429:502).json({error:'The analysis provider could not process this request.'});
  return res.status(200).json(await response.json());
 }catch{return res.status(502).json({error:'The analysis provider is unavailable. Please retry later.'});}
}
