import {createClient} from '@supabase/supabase-js';

const DOMAIN='mulia-investor.local';

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method tidak diizinkan.'});
  const url=process.env.SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const setupSecret=process.env.OWNER_SETUP_CODE;
  if(!url||!service||!setupSecret)return res.status(500).json({error:'Environment server belum lengkap.'});
  const body=req.body||{};
  if(body.setupCode!==setupSecret)return res.status(403).json({error:'Kode Setup tidak sesuai.'});
  const username=String(body.username||'').trim().toLowerCase();
  const password=String(body.password||'');
  const name=String(body.name||'').trim();
  if(!/^[a-z0-9._-]{3,30}$/.test(username))return res.status(400).json({error:'Format username tidak valid.'});
  if(password.length<8)return res.status(400).json({error:'Password minimal 8 karakter.'});
  if(!name)return res.status(400).json({error:'Nama Owner wajib diisi.'});

  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const count=await admin.from('profiles').select('auth_user_id',{count:'exact',head:true}).eq('role','owner');
  if(count.error)return res.status(500).json({error:count.error.message});
  if((count.count||0)>0)return res.status(409).json({error:'Akun Owner sudah tersedia.'});

  const email=`${username}@${DOMAIN}`;
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name,username}});
  if(created.error)return res.status(400).json({error:created.error.message});

  const profile=await admin.from('profiles').insert({
    auth_user_id:created.data.user.id,username,full_name:name,role:'owner'
  });
  if(profile.error){
    await admin.auth.admin.deleteUser(created.data.user.id);
    return res.status(400).json({error:profile.error.message});
  }
  res.status(200).json({ok:true});
}