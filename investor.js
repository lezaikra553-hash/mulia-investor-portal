import {createClient} from '@supabase/supabase-js';

const DOMAIN='mulia-investor.local';

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method tidak diizinkan.'});
  const url=process.env.SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!service)return res.status(500).json({error:'Environment Supabase belum lengkap.'});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const authResult=await admin.auth.getUser(token);
  if(authResult.error||!authResult.data.user)return res.status(401).json({error:'Sesi Owner tidak valid.'});
  const owner=await admin.from('profiles').select('role').eq('auth_user_id',authResult.data.user.id).single();
  if(owner.data?.role!=='owner')return res.status(403).json({error:'Hanya Owner yang dapat mengatur investor.'});

  const body=req.body||{};
  const username=String(body.username||'').trim().toLowerCase();
  if(!/^[a-z0-9._-]{3,30}$/.test(username))return res.status(400).json({error:'Format username tidak valid.'});
  if(!body.id&&String(body.password||'').length<8)return res.status(400).json({error:'Password baru minimal 8 karakter.'});
  const total=Number(body.share_percent||0)+Number(body.owner_percent||0)+Number(body.saving_percent||0);
  if(Math.abs(total-100)>.001)return res.status(400).json({error:'Total persentase harus 100%.'});

  try{
    if(body.id){
      const investorResult=await admin.from('investors').select('auth_user_id').eq('id',body.id).single();
      if(investorResult.error)throw investorResult.error;
      const attributes={email:`${username}@${DOMAIN}`,user_metadata:{name:body.name,username}};
      if(body.password)attributes.password=body.password;
      const authUpdate=await admin.auth.admin.updateUserById(investorResult.data.auth_user_id,attributes);
      if(authUpdate.error)throw authUpdate.error;
      const update=await admin.from('investors').update({
        name:body.name,username,company_code:body.company_code,company_name:body.company_name,
        share_percent:Number(body.share_percent||0),owner_percent:Number(body.owner_percent||0),
        saving_percent:Number(body.saving_percent||0),active:!!body.active,updated_at:new Date().toISOString()
      }).eq('id',body.id);
      if(update.error)throw update.error;
      const profileUpdate=await admin.from('profiles').update({username,full_name:body.name}).eq('auth_user_id',investorResult.data.auth_user_id);
      if(profileUpdate.error)throw profileUpdate.error;
      return res.status(200).json({ok:true,id:body.id});
    }

    const created=await admin.auth.admin.createUser({
      email:`${username}@${DOMAIN}`,password:body.password,email_confirm:true,
      user_metadata:{name:body.name,username}
    });
    if(created.error)throw created.error;

    const code='INV-'+Date.now().toString().slice(-6);
    const inserted=await admin.from('investors').insert({
      auth_user_id:created.data.user.id,code,name:body.name,username,
      company_code:body.company_code,company_name:body.company_name,
      share_percent:Number(body.share_percent||0),owner_percent:Number(body.owner_percent||0),
      saving_percent:Number(body.saving_percent||0),active:!!body.active
    }).select().single();
    if(inserted.error){
      await admin.auth.admin.deleteUser(created.data.user.id);
      throw inserted.error;
    }
    const profileInsert=await admin.from('profiles').insert({
      auth_user_id:created.data.user.id,username,full_name:body.name,
      role:'investor',investor_id:inserted.data.id
    });
    if(profileInsert.error)throw profileInsert.error;
    res.status(200).json({ok:true,id:inserted.data.id,code});
  }catch(error){
    res.status(400).json({error:error.message||'Gagal menyimpan investor.'});
  }
}