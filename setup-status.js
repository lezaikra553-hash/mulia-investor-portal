import {createClient} from '@supabase/supabase-js';

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method tidak diizinkan.'});
  const url=process.env.SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!service)return res.status(500).json({error:'Environment Supabase belum lengkap.'});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await admin.from('profiles').select('auth_user_id',{count:'exact',head:true}).eq('role','owner');
  if(result.error)return res.status(500).json({error:result.error.message});
  res.status(200).json({ownerExists:(result.count||0)>0});
}