import { createClient } from '@supabase/supabase-js';

const URL=process.env.SUPABASE_URL;
const SERVICE=process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAIN='mulia-investor.local';

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method tidak diizinkan.'});
  if(!URL||!SERVICE)return res.status(500).json({error:'Environment Supabase belum lengkap.'});
  const admin=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const {data:{user},error:userError}=await admin.auth.getUser(token);
  if(userError||!user)return res.status(401).json({error:'Sesi admin tidak valid.'});
  const {data:owner}=await admin.from('profiles').select('role').eq('auth_user_id',user.id).single();
  if(owner?.role!=='owner')return res.status(403).json({error:'Hanya Owner yang dapat mengatur investor.'});

  const b=req.body||{};
  const username=String(b.username||'').trim().toLowerCase();
  if(!/^[a-z0-9._-]{3,30}$/.test(username))return res.status(400).json({error:'Format username tidak valid.'});
  if(!b.id&&String(b.password||'').length<8)return res.status(400).json({error:'Password baru minimal 8 karakter.'});
  const email=`${username}@${DOMAIN}`;

  try{
    if(b.id){
      const {data:inv,error:invErr}=await admin.from('investors').select('auth_user_id,code').eq('id',b.id).single();
      if(invErr)throw invErr;
      const attrs={email,user_metadata:{name:b.name,username}};
      if(b.password)attrs.password=b.password;
      const {error:authErr}=await admin.auth.admin.updateUserById(inv.auth_user_id,attrs);
      if(authErr)throw authErr;
      const {error:iErr}=await admin.from('investors').update({
        name:b.name,username,company_code:b.company_code,company_name:b.company_name,
        share_percent:Number(b.share_percent||0),active:!!b.active,updated_at:new Date().toISOString()
      }).eq('id',b.id);if(iErr)throw iErr;
      const {error:pErr}=await admin.from('profiles').update({username,full_name:b.name}).eq('auth_user_id',inv.auth_user_id);if(pErr)throw pErr;
      return res.status(200).json({ok:true,id:b.id});
    }

    const {data:created,error:createErr}=await admin.auth.admin.createUser({
      email,password:b.password,email_confirm:true,user_metadata:{name:b.name,username}
    });
    if(createErr)throw createErr;
    const code='INV-'+Date.now().toString().slice(-6);
    const {data:inv,error:iErr}=await admin.from('investors').insert({
      auth_user_id:created.user.id,code,name:b.name,username,company_code:b.company_code,
      company_name:b.company_name,share_percent:Number(b.share_percent||0),active:!!b.active
    }).select().single();
    if(iErr){await admin.auth.admin.deleteUser(created.user.id);throw iErr}
    const {error:pErr}=await admin.from('profiles').insert({
      auth_user_id:created.user.id,username,full_name:b.name,role:'investor',investor_id:inv.id
    });
    if(pErr)throw pErr;
    return res.status(200).json({ok:true,id:inv.id,code});
  }catch(e){
    return res.status(400).json({error:e.message||'Gagal menyimpan akun investor.'});
  }
}