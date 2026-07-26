import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const COMPANY={BM:'CV. BERKAH MULIA ADV',DM:'PT. DWI MULIA ADVERTISING',AP:'PT. AZKIA MULIA PERADA'};
let supabase, session, profile, activeInvestor, activeReports=[], syncPreview=null;

const $=id=>document.getElementById(id);
const money=n=>'Rp '+Math.round(Number(n||0)).toLocaleString('id-ID');
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function signed(n){return `<span class="${n<0?'negative':'positive'}">${money(n)}</span>`}

async function init(){
  try{
    const cfg=await fetch('/api/config').then(r=>r.json());
    if(!cfg.supabaseUrl||!cfg.supabaseAnonKey)throw new Error('Environment Supabase belum diatur di Vercel.');
    supabase=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
    const {data}=await supabase.auth.getSession();session=data.session;
    bind();
    if(session)await enterApp();else showLogin();
  }catch(e){$('loginMsg').textContent=e.message}
}
function bind(){
  $('loginForm').addEventListener('submit',login);
  $('logoutBtn').addEventListener('click',logout);
  $('yearSelect').addEventListener('change',loadReport);
  $('adminBtn').addEventListener('click',openAdmin);
  $('newInvestorBtn').addEventListener('click',()=>openInvestorForm());
  $('investorForm').addEventListener('submit',saveInvestor);
  $('syncFile').addEventListener('change',readSyncFile);
  $('saveSyncBtn').addEventListener('click',saveSync);
  $('savePublishBtn').addEventListener('click',savePublish);
  $('publishInvestor').addEventListener('change',loadPublish);
  $('publishYear').addEventListener('change',loadPublish);
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchAdminTab(b.dataset.tab,b)));
}
function showLogin(){$('loginView').classList.remove('hidden');$('appView').classList.add('hidden')}
async function login(e){
  e.preventDefault();$('loginMsg').textContent='';
  const username=$('loginUsername').value.trim().toLowerCase();
  const password=$('loginPassword').value;
  const email=`${username}@mulia-investor.local`;
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error){$('loginMsg').textContent='Username atau password tidak sesuai.';return}
  session=data.session;await enterApp();
}
async function logout(){await supabase.auth.signOut();session=null;profile=null;showLogin()}
async function enterApp(){
  const {data,error}=await supabase.from('profiles').select('*').eq('auth_user_id',session.user.id).single();
  if(error||!data){await logout();$('loginMsg').textContent='Profil akses belum tersedia.';return}
  profile=data;$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');
  $('adminBtn').classList.toggle('hidden',profile.role!=='owner');
  await fillYears();
  await loadReport();
}
async function fillYears(){
  const years=[];for(let y=new Date().getFullYear()+1;y>=2024;y--)years.push(y);
  $('yearSelect').innerHTML=years.map(y=>`<option>${y}</option>`).join('');
  $('yearSelect').value=String(new Date().getFullYear());
}
async function loadReport(){
  const year=+$('yearSelect').value;
  let investorQuery=supabase.from('investors').select('*');
  if(profile.role!=='owner')investorQuery=investorQuery.eq('id',profile.investor_id);
  const {data:investors,error:ierr}=await investorQuery.order('created_at');
  if(ierr||!investors?.length){renderEmpty(year);return}
  activeInvestor=profile.role==='owner'?(activeInvestor&&investors.find(x=>x.id===activeInvestor.id)||investors[0]):investors[0];
  const {data:reports,error}=await supabase.from('monthly_reports').select('*').eq('investor_id',activeInvestor.id).eq('year',year).order('month');
  activeReports=error?[]:(reports||[]);
  renderReport(year);
}
function renderEmpty(year){
  activeInvestor=null;activeReports=[];$('periodLabel').textContent=year;
  $('investorName').textContent='Belum ada investor';$('companyName').textContent='-';$('sharePercent').textContent='-';$('investorCode').textContent='-';
  renderTables(year,[]);
}
function renderReport(year){
  const i=activeInvestor;
  $('periodLabel').textContent=year;$('investorName').textContent=i.name;$('companyName').textContent=i.company_name;
  $('sharePercent').textContent=num(i.share_percent).toLocaleString('id-ID')+'%';$('investorCode').textContent=i.code;
  $('greeting').textContent=`Yth. Bapak/Ibu ${i.name}, berikut laporan perkembangan investasi pada ${i.company_name}.`;
  $('reportTitle').textContent=`Laporan Investor ${i.company_name}`;
  renderTables(year,activeReports);
}
function renderTables(year,reports){
  const map=new Map(reports.map(r=>[+r.month,r]));let totals={income:0,operational:0,profitSharing:0,expense:0,profit:0,investor:0,owner:0,saving:0};
  const rows=MONTHS.map((m,idx)=>{
    const r=map.get(idx+1)||{};
    const vals={income:num(r.income),operational:num(r.operational),profitSharing:num(r.profit_sharing_expense),expense:num(r.expense),profit:num(r.net_profit),investor:num(r.investor_share),owner:num(r.owner_share),saving:num(r.joint_savings)};
    Object.keys(vals).forEach(k=>totals[k]+=vals[k]);
    return {m,vals,published:r.published!==false};
  });
  $('monthlyRows').innerHTML=rows.map(x=>`<tr><td>${x.m} ${year}</td><td>${money(x.vals.income)}</td><td>${money(x.vals.operational)}</td><td>${money(x.vals.profitSharing)}</td><td>${money(x.vals.expense)}</td><td>${signed(x.vals.profit)}</td></tr>`).join('');
  $('monthlyFoot').innerHTML=`<tr><td>TOTAL</td><td>${money(totals.income)}</td><td>${money(totals.operational)}</td><td>${money(totals.profitSharing)}</td><td>${money(totals.expense)}</td><td>${signed(totals.profit)}</td></tr>`;
  const invPct=activeInvestor?num(activeInvestor.share_percent):10;
  $('invHead').innerHTML=`Investor / Partner<br><small>${invPct}%</small>`;$('ownerHead').innerHTML='Owner<br><small>60%</small>';$('savingHead').innerHTML='Tabungan Bersama<br><small>30%</small>';
  $('shareRows').innerHTML=rows.map(x=>`<tr><td>${x.m}</td><td>${money(x.vals.income)}</td><td>${money(x.vals.expense)}</td><td>${signed(x.vals.profit)}</td><td>${money(x.vals.investor)}</td><td>${money(x.vals.owner)}</td><td>${money(x.vals.saving)}</td></tr>`).join('');
  $('shareFoot').innerHTML=`<tr><td>TOTAL ${year}</td><td>${money(totals.income)}</td><td>${money(totals.expense)}</td><td>${signed(totals.profit)}</td><td>${money(totals.investor)}</td><td>${money(totals.owner)}</td><td>${money(totals.saving)}</td></tr>`;
  $('sumIncome').textContent=money(totals.income);$('sumExpense').textContent=money(totals.expense);$('sumProfit').textContent=money(totals.profit);$('sumInvestor').textContent=money(totals.investor);
  $('generatedAt').textContent='Dibuka '+new Date().toLocaleString('id-ID');
}
async function openAdmin(){
  if(profile.role!=='owner')return;
  adminDialog.showModal();await refreshAdmin();
}
async function refreshAdmin(){
  const {data}=await supabase.from('investors').select('*').order('created_at');
  const list=data||[];
  $('adminInvestorRows').innerHTML=list.map(i=>`<tr><td><b>${esc(i.name)}</b><br><small>${esc(i.code)}</small></td><td>${esc(i.username)}</td><td>${esc(i.company_name)}</td><td>${num(i.share_percent)}%</td><td>${i.active?'Aktif':'Nonaktif'}</td><td><button class="btn light editInvestor" data-id="${i.id}">Edit</button></td></tr>`).join('');
  document.querySelectorAll('.editInvestor').forEach(b=>b.onclick=()=>openInvestorForm(list.find(x=>x.id===b.dataset.id)));
  const opts=list.map(i=>`<option value="${i.id}">${esc(i.name)} — ${esc(i.company_name)}</option>`).join('');
  $('syncInvestor').innerHTML=opts;$('publishInvestor').innerHTML=opts;
  const ys=[];for(let y=new Date().getFullYear()+1;y>=2024;y--)ys.push(`<option>${y}</option>`);
  $('syncYear').innerHTML=ys.join('');$('publishYear').innerHTML=ys.join('');
}
function switchAdminTab(name,btn){
  document.querySelectorAll('.adminSection').forEach(x=>x.classList.add('hidden'));$('tab-'+name).classList.remove('hidden');
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  if(name==='publish')loadPublish();
}
function openInvestorForm(i=null){
  $('investorForm').reset();$('formInvestorId').value=i?.id||'';$('investorFormTitle').textContent=i?'Edit Investor':'Tambah Investor';
  $('formName').value=i?.name||'';$('formUsername').value=i?.username||'';$('formShare').value=i?.share_percent??10;$('formCompany').value=i?.company_code||'BM';$('formActive').value=String(i?.active??true);
  $('formPassword').required=!i;$('formPassword').placeholder=i?'Kosongkan jika tidak diubah':'Minimal 8 karakter';
  investorFormDialog.showModal();
}
async function saveInvestor(e){
  e.preventDefault();
  const payload={id:$('formInvestorId').value||null,name:$('formName').value.trim(),username:$('formUsername').value.trim().toLowerCase(),password:$('formPassword').value,company_code:$('formCompany').value,company_name:COMPANY[$('formCompany').value],share_percent:num($('formShare').value),active:$('formActive').value==='true'};
  const token=(await supabase.auth.getSession()).data.session?.access_token;
  const res=await fetch('/api/admin/investor',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`},body:JSON.stringify(payload)});
  const out=await res.json();if(!res.ok)return toast(out.error||'Gagal menyimpan investor.');
  investorFormDialog.close();toast('Akun investor berhasil disimpan.');await refreshAdmin();await loadReport();
}
function parseJSONPayload(raw){
  const storage=raw.storage||raw.data?.storage||raw.localStorage||raw;
  const keys=Object.keys(storage||{});
  const kasKeys=['BM_KAS_BESAR_IMPORT_EXCEL_V1','BM_KAS_BESAR_ACTIVE_DB','BM_KAS_IMPORT_EXCEL_V1','DMA_KAS_BESAR_ACTIVE_DB','dwiMuliaKas_V8_ENTERPRISE','AP_KAS_BESAR_ACTIVE_DB','AP_KAS_V8_ENTERPRISE'];
  let kas={};for(const k of kasKeys){let v=storage[k];if(typeof v==='string')try{v=JSON.parse(v)}catch{}if(v&&typeof v==='object'){kas=v;break}}
  const bhKey=keys.find(k=>/BAGI_HASIL|BH_SIMPLE/i.test(k));let shares=[];
  if(bhKey){let v=storage[bhKey];if(typeof v==='string')try{v=JSON.parse(v)}catch{};shares=v?.shares||[]}
  return {kas,shares,keys};
}
function monthCandidates(year,index){
  const m=MONTHS[index],pad=String(index+1).padStart(2,'0');
  return [m,`${m} ${year}`,`${year}-${pad}`,`${year}/${pad}`,`${pad}-${year}`,`${index+1}`,index];
}
function findMonth(container,year,index){
  if(!container)return null;for(const k of monthCandidates(year,index)){if(container[k]!=null)return container[k]}return null;
}
function sumList(arr){return (Array.isArray(arr)?arr:[]).reduce((s,x)=>s+num(x?.amount??x?.total??x?.nominal??x),0)}
function parseMonth(kas,year,index,pcts){
  const tx=findMonth(kas.transactions,year,index)||{};
  const recap=findMonth(kas.rekap,year,index)||findMonth(kas.monthly,year,index)||{};
  const income=sumList(tx.pemasukan)||num(recap.pemasukanReal??recap.pemasukan??recap.income);
  const operational=sumList(tx.operasional)||num(recap.operasionalExcelPayroll??recap.operasional??recap.pengeluaranReal??recap.pengeluaran??recap.expense);
  const profitSharing=sumList(tx.bagiHasil)||num(recap.bagiHasil??recap.profitSharing);
  const expense=num(recap.pengeluaranFinal??recap.totalPengeluaran) || operational;
  const profitRaw=recap.labaRugiReal??recap.labaBersih??recap.labaRugi??recap.profit;
  const profit=profitRaw!=null?num(profitRaw):income-expense;
  const base=Math.max(0,profit);
  return {year,month:index+1,income,operational,profit_sharing_expense:profitSharing,expense,net_profit:profit,investor_share:base*pcts.investor/100,owner_share:base*pcts.owner/100,joint_savings:base*pcts.saving/100,published:true};
}
async function readSyncFile(e){
  const f=e.target.files[0];if(!f)return;
  try{
    const raw=JSON.parse(await f.text()), parsed=parseJSONPayload(raw), year=+$('syncYear').value;
    const sharePct=activeInvestor?.share_percent||10;
    const named=parsed.shares.map(x=>({name:String(x.name||'').toLowerCase(),pct:num(x.pct)}));
    const pcts={
      investor:named.find(x=>/investor|partner|sentot|budi/.test(x.name))?.pct||sharePct,
      owner:named.find(x=>/owner|abdul|aziz/.test(x.name))?.pct||60,
      saving:named.find(x=>/tabungan|bersama|kas/.test(x.name))?.pct||30
    };
    syncPreview={rows:MONTHS.map((_,i)=>parseMonth(parsed.kas,year,i,pcts)),pcts,keys:parsed.keys};
    const total=syncPreview.rows.reduce((s,r)=>({income:s.income+r.income,expense:s.expense+r.expense,profit:s.profit+r.net_profit}),{income:0,expense:0,profit:0});
    $('syncPreview').innerHTML=`<b>File terbaca.</b><br>Key storage: ${parsed.keys.length}<br>Persentase: Investor ${pcts.investor}% • Owner ${pcts.owner}% • Tabungan ${pcts.saving}%<br>Total ${year}: Pemasukan ${money(total.income)} • Pengeluaran ${money(total.expense)} • Laba ${money(total.profit)}`;
    $('saveSyncBtn').disabled=false;
  }catch(err){syncPreview=null;$('syncPreview').textContent='File tidak dapat dibaca: '+err.message;$('saveSyncBtn').disabled=true}
}
async function saveSync(){
  if(!syncPreview)return;
  const investorId=$('syncInvestor').value,year=+$('syncYear').value;
  const payload=syncPreview.rows.map(r=>({...r,investor_id:investorId,year,source:'ADMIN_JSON',updated_at:new Date().toISOString()}));
  const {error}=await supabase.from('monthly_reports').upsert(payload,{onConflict:'investor_id,year,month'});
  if(error)return toast(error.message);toast('Data laporan berhasil disinkronkan.');await loadReport();
}
async function loadPublish(){
  const id=$('publishInvestor').value,year=+$('publishYear').value;if(!id)return;
  const {data}=await supabase.from('monthly_reports').select('month,published').eq('investor_id',id).eq('year',year);
  const map=new Map((data||[]).map(x=>[x.month,x.published]));
  $('publishMonths').innerHTML=MONTHS.map((m,i)=>`<label class="monthCheck"><input type="checkbox" data-month="${i+1}" ${map.get(i+1)!==false?'checked':''}>${m}</label>`).join('');
}
async function savePublish(){
  const investor_id=$('publishInvestor').value,year=+$('publishYear').value;
  const updates=[...document.querySelectorAll('#publishMonths input')].map(x=>({investor_id,year,month:+x.dataset.month,published:x.checked}));
  for(const u of updates)await supabase.from('monthly_reports').update({published:u.published}).eq('investor_id',u.investor_id).eq('year',u.year).eq('month',u.month);
  toast('Status publikasi disimpan.');
}
init();