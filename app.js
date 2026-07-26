import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';

const MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const COMPANY={BM:'CV. BERKAH MULIA ADV',DM:'PT. DWI MULIA ADVERTISING',AP:'PT. AZKIA MULIA PERADA'};
const SESSION_KEY='MULIA_SIMPLE_SESSION_V1';
const $=id=>document.getElementById(id);
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const money=n=>'Rp '+Math.round(num(n)).toLocaleString('id-ID');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

let session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
let profile=null,investors=[],activeInvestor=null,syncPreview=null;

function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2300)}
function show(id,yes=true){$(id).classList.toggle('hidden',!yes)}
function signed(v){return `<span class="${v<0?'negative':'positive'}">${money(v)}</span>`}
async function rpc(name,args={}){const {data,error}=await supabase.rpc(name,args);if(error)throw new Error(error.message);return data}

function validateConfig(){
  if(!SUPABASE_URL.startsWith('https://')||SUPABASE_URL.includes('PASTE_'))throw new Error('Isi SUPABASE_URL dan SUPABASE_ANON_KEY di config.js terlebih dahulu.');
}

async function init(){
  bindEvents();
  try{
    validateConfig();
    const status=await rpc('setup_status');
    show('setupOpenButton',!status);
    if(session?.token){
      const valid=await rpc('validate_session',{p_token:session.token});
      if(valid?.valid){profile=valid;await enterApp();return}
      localStorage.removeItem(SESSION_KEY);session=null;
    }
    showLogin();
  }catch(error){$('loginMessage').textContent=error.message}
}

function bindEvents(){
  $('loginForm').addEventListener('submit',login);
  $('setupOpenButton').addEventListener('click',()=>{show('loginBox',false);show('setupBox',true)});
  $('setupCancelButton').addEventListener('click',()=>{show('setupBox',false);show('loginBox',true)});
  $('setupForm').addEventListener('submit',setupOwner);
  $('logoutButton').addEventListener('click',logout);
  $('adminOpenButton').addEventListener('click',openAdmin);
  $('addInvestorButton').addEventListener('click',()=>openInvestorForm());
  $('investorForm').addEventListener('submit',saveInvestor);
  $('yearSelect').addEventListener('change',loadReport);
  $('investorSelect').addEventListener('change',()=>{activeInvestor=investors.find(x=>x.id===$('investorSelect').value)||investors[0];loadReport()});
  $('syncFile').addEventListener('change',readSyncFile);
  $('saveSyncButton').addEventListener('click',saveSync);
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    show('tab-investors',b.dataset.tab==='investors');show('tab-sync',b.dataset.tab==='sync');
  }));
}
function showLogin(){show('loginView',true);show('appView',false)}
async function login(e){
  e.preventDefault();$('loginMessage').textContent='';
  try{
    const data=await rpc('login_user',{p_username:$('loginUsername').value.trim().toLowerCase(),p_password:$('loginPassword').value});
    if(!data?.token)throw new Error('Username atau password tidak sesuai.');
    session={token:data.token};localStorage.setItem(SESSION_KEY,JSON.stringify(session));profile=data;await enterApp();
  }catch(error){$('loginMessage').textContent=error.message}
}
async function setupOwner(e){
  e.preventDefault();$('setupMessage').textContent='';
  try{
    if($('setupPassword').value!==$('setupPassword2').value)throw new Error('Konfirmasi password tidak sama.');
    await rpc('setup_owner',{p_name:$('setupName').value.trim(),p_username:$('setupUsername').value.trim().toLowerCase(),p_password:$('setupPassword').value,p_setup_code:$('setupCode').value});
    toast('Owner berhasil dibuat. Silakan login.');show('setupBox',false);show('loginBox',true);show('setupOpenButton',false);
    $('loginUsername').value=$('setupUsername').value;
  }catch(error){$('setupMessage').textContent=error.message}
}
async function logout(){
  try{if(session?.token)await rpc('logout_user',{p_token:session.token})}catch{}
  localStorage.removeItem(SESSION_KEY);session=null;profile=null;showLogin()
}
async function enterApp(){
  show('loginView',false);show('appView',true);show('adminOpenButton',profile.role==='owner');show('investorSelect',profile.role==='owner');
  fillYears();await loadInvestors();await loadReport();
}
function fillYears(){
  const ys=[];for(let y=new Date().getFullYear()+1;y>=2024;y--)ys.push(`<option>${y}</option>`);
  $('yearSelect').innerHTML=ys.join('');$('yearSelect').value=String(new Date().getFullYear());
}
async function loadInvestors(){
  investors=await rpc('get_investors',{p_token:session.token})||[];
  if(profile.role==='owner')$('investorSelect').innerHTML=investors.map(i=>`<option value="${i.id}">${esc(i.name)} — ${esc(i.company_name)}</option>`).join('');
  activeInvestor=investors.find(i=>i.id===(profile.role==='owner'?$('investorSelect').value:profile.investor_id))||investors[0]||null;
}
async function loadReport(){
  const year=+$('yearSelect').value;
  const reports=activeInvestor?await rpc('get_reports',{p_token:session.token,p_investor_id:activeInvestor.id,p_year:year}):[];
  renderReport(year,reports||[]);
}
function renderReport(year,reports){
  const i=activeInvestor;$('periodLabel').textContent=year;$('investorName').textContent=i?.name||'-';$('companyName').textContent=i?.company_name||'-';$('sharePercent').textContent=i?`${num(i.share_percent)}%`:'-';$('investorCode').textContent=i?.code||'-';$('statusLabel').textContent=i?.active===false?'NONAKTIF':'AKTIF';$('reportTitle').textContent=i?`Laporan Investor ${i.company_name}`:'Mulia Group Investor Report';$('greeting').textContent=i?`Yth. Bapak/Ibu ${i.name}, berikut laporan perkembangan investasi Anda.`:'Belum ada investor.';
  const map=new Map(reports.map(r=>[+r.month,r]));const t={income:0,operational:0,profitSharing:0,expense:0,profit:0,investor:0,owner:0,saving:0};
  const rows=MONTHS.map((m,idx)=>{const r=map.get(idx+1)||{};const v={income:num(r.income),operational:num(r.operational),profitSharing:num(r.profit_sharing_expense),expense:num(r.expense),profit:num(r.net_profit),investor:num(r.investor_share),owner:num(r.owner_share),saving:num(r.joint_savings)};Object.keys(v).forEach(k=>t[k]+=v[k]);return{m,v}});
  $('monthlyRows').innerHTML=rows.map(r=>`<tr><td>${r.m} ${year}</td><td>${money(r.v.income)}</td><td>${money(r.v.operational)}</td><td>${money(r.v.profitSharing)}</td><td>${money(r.v.expense)}</td><td>${signed(r.v.profit)}</td></tr>`).join('');
  $('monthlyFoot').innerHTML=`<tr><td>TOTAL</td><td>${money(t.income)}</td><td>${money(t.operational)}</td><td>${money(t.profitSharing)}</td><td>${money(t.expense)}</td><td>${signed(t.profit)}</td></tr>`;
  $('investorHead').innerHTML=`Investor<br><small>${num(i?.share_percent)}%</small>`;$('ownerHead').innerHTML=`Owner<br><small>${num(i?.owner_percent||60)}%</small>`;$('savingHead').innerHTML=`Tabungan<br><small>${num(i?.saving_percent||30)}%</small>`;
  $('shareRows').innerHTML=rows.map(r=>`<tr><td>${r.m}</td><td>${money(r.v.income)}</td><td>${money(r.v.expense)}</td><td>${signed(r.v.profit)}</td><td>${money(r.v.investor)}</td><td>${money(r.v.owner)}</td><td>${money(r.v.saving)}</td></tr>`).join('');
  $('shareFoot').innerHTML=`<tr><td>TOTAL ${year}</td><td>${money(t.income)}</td><td>${money(t.expense)}</td><td>${signed(t.profit)}</td><td>${money(t.investor)}</td><td>${money(t.owner)}</td><td>${money(t.saving)}</td></tr>`;
  $('sumIncome').textContent=money(t.income);$('sumExpense').textContent=money(t.expense);$('sumProfit').textContent=money(t.profit);$('sumInvestor').textContent=money(t.investor);
}
async function openAdmin(){$('adminDialog').showModal();await refreshAdmin()}
async function refreshAdmin(){
  investors=await rpc('get_investors',{p_token:session.token})||[];
  $('adminInvestorRows').innerHTML=investors.map(i=>`<tr><td><b>${esc(i.name)}</b><br><small>${esc(i.code)}</small></td><td>${esc(i.username)}</td><td>${esc(i.company_name)}</td><td>${num(i.share_percent)}%</td><td>${i.active?'Aktif':'Nonaktif'}</td><td><button class="btn secondary edit-investor" data-id="${i.id}">Edit</button></td></tr>`).join('')||'<tr><td colspan="6">Belum ada investor.</td></tr>';
  document.querySelectorAll('.edit-investor').forEach(b=>b.addEventListener('click',()=>openInvestorForm(investors.find(i=>i.id===b.dataset.id))));
  const opts=investors.map(i=>`<option value="${i.id}">${esc(i.name)} — ${esc(i.company_name)}</option>`).join('');$('syncInvestor').innerHTML=opts;
  const ys=[];for(let y=new Date().getFullYear()+1;y>=2024;y--)ys.push(`<option>${y}</option>`);$('syncYear').innerHTML=ys.join('');
}
function openInvestorForm(i=null){
  $('investorForm').reset();$('formInvestorId').value=i?.id||'';$('investorDialogTitle').textContent=i?'Edit Investor':'Tambah Investor';$('formName').value=i?.name||'';$('formUsername').value=i?.username||'';$('formCompany').value=i?.company_code||'BM';$('formShare').value=i?.share_percent??10;$('formOwnerShare').value=i?.owner_percent??60;$('formSavingShare').value=i?.saving_percent??30;$('formActive').value=String(i?.active??true);$('formPassword').required=!i;$('formPassword').placeholder=i?'Kosongkan jika tidak diubah':'Minimal 8 karakter';$('investorDialog').showModal();
}
async function saveInvestor(e){
  e.preventDefault();
  try{
    const payload={p_token:session.token,p_id:$('formInvestorId').value||null,p_name:$('formName').value.trim(),p_username:$('formUsername').value.trim().toLowerCase(),p_password:$('formPassword').value||null,p_company_code:$('formCompany').value,p_company_name:COMPANY[$('formCompany').value],p_share_percent:num($('formShare').value),p_owner_percent:num($('formOwnerShare').value),p_saving_percent:num($('formSavingShare').value),p_active:$('formActive').value==='true'};
    if(Math.abs(payload.p_share_percent+payload.p_owner_percent+payload.p_saving_percent-100)>.001)throw new Error('Total persentase harus 100%.');
    await rpc('owner_save_investor',payload);$('investorDialog').close();toast('Investor berhasil disimpan.');await refreshAdmin();await loadInvestors();await loadReport();
  }catch(error){toast(error.message)}
}
function parseStorage(raw){
  const s=raw.storage||raw.data?.storage||raw.localStorage||raw;const keys=Object.keys(s||{});const candidates=['BM_KAS_BESAR_IMPORT_EXCEL_V1','BM_KAS_BESAR_ACTIVE_DB','BM_KAS_IMPORT_EXCEL_V1','DMA_KAS_BESAR_ACTIVE_DB','dwiMuliaKas_V8_ENTERPRISE','AP_KAS_BESAR_ACTIVE_DB','AP_KAS_V8_ENTERPRISE'];let kas={};
  for(const k of candidates){let v=s[k];if(typeof v==='string')try{v=JSON.parse(v)}catch{}if(v&&typeof v==='object'){kas=v;break}}
  return{kas,keys}
}
function monthKeys(year,idx){const m=MONTHS[idx],p=String(idx+1).padStart(2,'0');return[m,`${m} ${year}`,`${year}-${p}`,`${p}-${year}`,idx+1,idx]}
function findMonth(obj,year,idx){if(!obj)return null;for(const k of monthKeys(year,idx))if(obj[k]!=null)return obj[k];return null}
function sumList(a){return(Array.isArray(a)?a:[]).reduce((s,x)=>s+num(x?.amount??x?.total??x?.nominal??x),0)}
function parseMonth(kas,year,idx,i){
  const tx=findMonth(kas.transactions,year,idx)||{},r=findMonth(kas.rekap,year,idx)||findMonth(kas.monthly,year,idx)||{};
  const income=sumList(tx.pemasukan)||num(r.pemasukanReal??r.pemasukan??r.income);const operational=sumList(tx.operasional)||num(r.operasionalExcelPayroll??r.operasional??r.pengeluaranReal??r.pengeluaran??r.expense);const profitSharing=sumList(tx.bagiHasil)||num(r.bagiHasil??r.profitSharing);const expense=num(r.pengeluaranFinal??r.totalPengeluaran)||operational;const pv=r.labaRugiReal??r.labaBersih??r.labaRugi??r.profit;const profit=pv!=null?num(pv):income-expense;const base=Math.max(0,profit);
  return{month:idx+1,income,operational,profit_sharing_expense:profitSharing,expense,net_profit:profit,investor_share:base*num(i.share_percent)/100,owner_share:base*num(i.owner_percent)/100,joint_savings:base*num(i.saving_percent)/100,published:true}
}
async function readSyncFile(e){
  try{
    const raw=JSON.parse(await e.target.files[0].text()),p=parseStorage(raw),i=investors.find(x=>x.id===$('syncInvestor').value),year=+$('syncYear').value;if(!i)throw new Error('Pilih investor.');
    syncPreview={investor:i,year,rows:MONTHS.map((_,idx)=>parseMonth(p.kas,year,idx,i))};const t=syncPreview.rows.reduce((s,r)=>({income:s.income+r.income,expense:s.expense+r.expense,profit:s.profit+r.net_profit}),{income:0,expense:0,profit:0});$('syncPreview').innerHTML=`<b>File terbaca.</b><br>Key storage: ${p.keys.length}<br>Total pemasukan: ${money(t.income)}<br>Total pengeluaran: ${money(t.expense)}<br>Total laba: ${money(t.profit)}`;$('saveSyncButton').disabled=false;
  }catch(error){syncPreview=null;$('syncPreview').textContent='Gagal membaca file: '+error.message;$('saveSyncButton').disabled=true}
}
async function saveSync(){
  if(!syncPreview)return;
  try{
    await rpc('owner_upsert_reports',{p_token:session.token,p_investor_id:syncPreview.investor.id,p_year:syncPreview.year,p_rows:syncPreview.rows});
    activeInvestor=syncPreview.investor;$('investorSelect').value=activeInvestor.id;$('yearSelect').value=String(syncPreview.year);toast('Laporan berhasil disimpan.');await loadReport();
  }catch(error){toast(error.message)}
}
init();
