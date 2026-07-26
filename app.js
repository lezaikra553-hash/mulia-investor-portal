import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const COMPANY={BM:'CV. BERKAH MULIA ADV',DM:'PT. DWI MULIA ADVERTISING',AP:'PT. AZKIA MULIA PERADA'};
const $=id=>document.getElementById(id);
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const money=n=>'Rp '+Math.round(num(n)).toLocaleString('id-ID');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

let supabase=null,profile=null,session=null,investors=[],activeInvestor=null,activeReports=[],syncPreview=null;

function toast(message){
  const el=$('toast');el.textContent=message;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2500);
}
function show(element,visible=true){element.classList.toggle('hidden',!visible)}
function signed(value){return `<span class="${value<0?'negative':'positive'}">${money(value)}</span>`}

async function requestJSON(url,options={}){
  const response=await fetch(url,options);
  const text=await response.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{throw new Error(`Respons server tidak valid (${response.status}).`)}
  if(!response.ok)throw new Error(data.error||`Permintaan gagal (${response.status}).`);
  return data;
}

async function init(){
  bindEvents();
  try{
    const config=await requestJSON('/api/config');
    if(!config.supabaseUrl||!config.supabaseAnonKey)throw new Error('Environment Supabase belum diatur di Vercel.');
    supabase=createClient(config.supabaseUrl,config.supabaseAnonKey);
    const status=await requestJSON('/api/auth/setup-status');
    show($('openSetupBtn'),!status.ownerExists);
    const result=await supabase.auth.getSession();
    session=result.data.session;
    if(session)await enterApplication();else showLogin();
  }catch(error){
    $('loginMessage').textContent=error.message;
  }
}

function bindEvents(){
  $('loginForm').addEventListener('submit',login);
  $('openSetupBtn').addEventListener('click',()=>{show($('loginBox'),false);show($('setupBox'),true)});
  $('cancelSetupBtn').addEventListener('click',()=>{show($('setupBox'),false);show($('loginBox'),true)});
  $('setupForm').addEventListener('submit',createOwner);
  $('logoutButton').addEventListener('click',logout);
  $('adminButton').addEventListener('click',openAdmin);
  $('addInvestorButton').addEventListener('click',()=>openInvestorForm());
  $('investorForm').addEventListener('submit',saveInvestor);
  $('yearSelect').addEventListener('change',loadReport);
  $('investorSelect').addEventListener('change',()=>{activeInvestor=investors.find(i=>i.id===$('investorSelect').value)||investors[0];loadReport()});
  $('syncFile').addEventListener('change',readSyncFile);
  $('saveSyncButton').addEventListener('click',saveSync);
  $('publishInvestor').addEventListener('change',loadPublish);
  $('publishYear').addEventListener('change',loadPublish);
  $('savePublishButton').addEventListener('click',savePublish);

  document.querySelectorAll('[data-close]').forEach(button=>{
    button.addEventListener('click',()=>document.getElementById(button.dataset.close)?.close());
  });
  document.querySelectorAll('.tab').forEach(button=>{
    button.addEventListener('click',()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      button.classList.add('active');
      document.querySelectorAll('.admin-section').forEach(x=>x.classList.add('hidden'));
      $('tab-'+button.dataset.tab).classList.remove('hidden');
      if(button.dataset.tab==='publish')loadPublish();
    });
  });
}

function showLogin(){
  show($('loginView'),true);show($('appView'),false);
}

async function login(event){
  event.preventDefault();$('loginMessage').textContent='';
  try{
    const username=$('loginUsername').value.trim().toLowerCase();
    const password=$('loginPassword').value;
    const email=`${username}@mulia-investor.local`;
    const result=await supabase.auth.signInWithPassword({email,password});
    if(result.error)throw new Error('Username atau password tidak sesuai.');
    session=result.data.session;
    await enterApplication();
  }catch(error){$('loginMessage').textContent=error.message}
}

async function createOwner(event){
  event.preventDefault();$('setupMessage').textContent='';
  try{
    const password=$('setupPassword').value;
    if(password!==$('setupPassword2').value)throw new Error('Konfirmasi password tidak sama.');
    const payload={
      name:$('setupName').value.trim(),
      username:$('setupUsername').value.trim().toLowerCase(),
      password,
      setupCode:$('setupCode').value
    };
    await requestJSON('/api/auth/setup-owner',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    toast('Akun Owner berhasil dibuat.');
    show($('setupBox'),false);show($('loginBox'),true);show($('openSetupBtn'),false);
    $('loginUsername').value=payload.username;$('loginPassword').value='';
  }catch(error){$('setupMessage').textContent=error.message}
}

async function logout(){
  await supabase.auth.signOut();session=null;profile=null;showLogin();
}

async function enterApplication(){
  const result=await supabase.from('profiles').select('*').eq('auth_user_id',session.user.id).single();
  if(result.error||!result.data){await logout();$('loginMessage').textContent='Profil akses belum tersedia.';return}
  profile=result.data;show($('loginView'),false);show($('appView'),true);
  show($('adminButton'),profile.role==='owner');show($('investorSelect'),profile.role==='owner');
  fillYears();
  await loadInvestors();
  await loadReport();
}

function fillYears(){
  const years=[];for(let year=new Date().getFullYear()+1;year>=2024;year--)years.push(year);
  const options=years.map(y=>`<option value="${y}">${y}</option>`).join('');
  $('yearSelect').innerHTML=options;$('yearSelect').value=String(new Date().getFullYear());
}

async function loadInvestors(){
  let query=supabase.from('investors').select('*').order('created_at');
  if(profile.role!=='owner')query=query.eq('id',profile.investor_id);
  const result=await query;
  investors=result.data||[];
  if(profile.role==='owner'){
    $('investorSelect').innerHTML=investors.map(i=>`<option value="${i.id}">${esc(i.name)} — ${esc(i.company_name)}</option>`).join('');
  }
  activeInvestor=investors.find(i=>i.id===(profile.role==='owner'?$('investorSelect').value:profile.investor_id))||investors[0]||null;
}

async function loadReport(){
  const year=+$('yearSelect').value;
  if(!activeInvestor){renderReport(year,[]);return}
  const result=await supabase.from('monthly_reports').select('*').eq('investor_id',activeInvestor.id).eq('year',year).order('month');
  activeReports=result.data||[];
  renderReport(year,activeReports);
}

function renderReport(year,reports){
  const investor=activeInvestor;
  $('periodLabel').textContent=year;
  $('investorName').textContent=investor?.name||'-';
  $('companyName').textContent=investor?.company_name||'-';
  $('sharePercent').textContent=investor?`${num(investor.share_percent).toLocaleString('id-ID')}%`:'-';
  $('investorCode').textContent=investor?.code||'-';
  $('statusLabel').textContent=investor?.active===false?'NONAKTIF':'AKTIF';
  $('reportTitle').textContent=investor?`Laporan Investor ${investor.company_name}`:'Mulia Group Investor Report';
  $('greeting').textContent=investor?`Yth. Bapak/Ibu ${investor.name}, berikut laporan perkembangan investasi Anda.`:'Belum ada investor.';

  const map=new Map(reports.map(r=>[+r.month,r]));
  const totals={income:0,operational:0,profitSharing:0,expense:0,profit:0,investor:0,owner:0,saving:0};
  const rows=MONTHS.map((month,index)=>{
    const report=map.get(index+1)||{};
    const values={
      income:num(report.income),operational:num(report.operational),
      profitSharing:num(report.profit_sharing_expense),expense:num(report.expense),
      profit:num(report.net_profit),investor:num(report.investor_share),
      owner:num(report.owner_share),saving:num(report.joint_savings)
    };
    Object.keys(values).forEach(key=>totals[key]+=values[key]);
    return{month,values};
  });

  $('monthlyRows').innerHTML=rows.map(r=>`<tr>
    <td>${r.month} ${year}</td><td>${money(r.values.income)}</td><td>${money(r.values.operational)}</td>
    <td>${money(r.values.profitSharing)}</td><td>${money(r.values.expense)}</td><td>${signed(r.values.profit)}</td>
  </tr>`).join('');
  $('monthlyFoot').innerHTML=`<tr><td>TOTAL</td><td>${money(totals.income)}</td><td>${money(totals.operational)}</td><td>${money(totals.profitSharing)}</td><td>${money(totals.expense)}</td><td>${signed(totals.profit)}</td></tr>`;

  $('investorHead').innerHTML=`Investor / Partner<br><small>${num(investor?.share_percent)}%</small>`;
  $('ownerHead').innerHTML=`Owner<br><small>${num(investor?.owner_percent||60)}%</small>`;
  $('savingHead').innerHTML=`Tabungan Bersama<br><small>${num(investor?.saving_percent||30)}%</small>`;
  $('shareRows').innerHTML=rows.map(r=>`<tr>
    <td>${r.month}</td><td>${money(r.values.income)}</td><td>${money(r.values.expense)}</td>
    <td>${signed(r.values.profit)}</td><td>${money(r.values.investor)}</td>
    <td>${money(r.values.owner)}</td><td>${money(r.values.saving)}</td>
  </tr>`).join('');
  $('shareFoot').innerHTML=`<tr><td>TOTAL ${year}</td><td>${money(totals.income)}</td><td>${money(totals.expense)}</td><td>${signed(totals.profit)}</td><td>${money(totals.investor)}</td><td>${money(totals.owner)}</td><td>${money(totals.saving)}</td></tr>`;

  $('sumIncome').textContent=money(totals.income);$('sumExpense').textContent=money(totals.expense);
  $('sumProfit').textContent=money(totals.profit);$('sumInvestor').textContent=money(totals.investor);
  $('generatedAt').textContent='Dibuka '+new Date().toLocaleString('id-ID');
}

async function openAdmin(){
  $('adminDialog').showModal();
  await refreshAdmin();
}

async function refreshAdmin(){
  const result=await supabase.from('investors').select('*').order('created_at');
  investors=result.data||[];
  $('adminInvestorRows').innerHTML=investors.map(i=>`<tr>
    <td><b>${esc(i.name)}</b><br><small>${esc(i.code)}</small></td>
    <td>${esc(i.username)}</td><td>${esc(i.company_name)}</td><td>${num(i.share_percent)}%</td>
    <td>${i.active?'Aktif':'Nonaktif'}</td>
    <td><button class="btn secondary edit-investor" data-id="${i.id}">Edit</button></td>
  </tr>`).join('')||'<tr><td colspan="6">Belum ada investor.</td></tr>';
  document.querySelectorAll('.edit-investor').forEach(button=>{
    button.addEventListener('click',()=>openInvestorForm(investors.find(i=>i.id===button.dataset.id)));
  });

  const options=investors.map(i=>`<option value="${i.id}">${esc(i.name)} — ${esc(i.company_name)}</option>`).join('');
  $('syncInvestor').innerHTML=options;$('publishInvestor').innerHTML=options;
  const yearOptions=[];for(let year=new Date().getFullYear()+1;year>=2024;year--)yearOptions.push(`<option>${year}</option>`);
  $('syncYear').innerHTML=yearOptions.join('');$('publishYear').innerHTML=yearOptions.join('');
}

function openInvestorForm(investor=null){
  $('investorForm').reset();$('formInvestorId').value=investor?.id||'';
  $('investorDialogTitle').textContent=investor?'Edit Investor':'Tambah Investor';
  $('formName').value=investor?.name||'';$('formUsername').value=investor?.username||'';
  $('formCompany').value=investor?.company_code||'BM';$('formShare').value=investor?.share_percent??10;
  $('formOwnerShare').value=investor?.owner_percent??60;$('formSavingShare').value=investor?.saving_percent??30;
  $('formActive').value=String(investor?.active??true);$('formPassword').required=!investor;
  $('formPassword').placeholder=investor?'Kosongkan jika tidak diubah':'Minimal 8 karakter';
  $('investorDialog').showModal();
}

async function saveInvestor(event){
  event.preventDefault();
  try{
    const payload={
      id:$('formInvestorId').value||null,
      name:$('formName').value.trim(),
      username:$('formUsername').value.trim().toLowerCase(),
      password:$('formPassword').value,
      company_code:$('formCompany').value,
      company_name:COMPANY[$('formCompany').value],
      share_percent:num($('formShare').value),
      owner_percent:num($('formOwnerShare').value),
      saving_percent:num($('formSavingShare').value),
      active:$('formActive').value==='true'
    };
    const total=payload.share_percent+payload.owner_percent+payload.saving_percent;
    if(Math.abs(total-100)>.001)throw new Error(`Total persentase harus 100%. Saat ini ${total}%.`);
    const token=(await supabase.auth.getSession()).data.session?.access_token;
    await requestJSON('/api/admin/investor',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`},body:JSON.stringify(payload)});
    $('investorDialog').close();toast('Investor berhasil disimpan.');
    await refreshAdmin();await loadInvestors();await loadReport();
  }catch(error){toast(error.message)}
}

function parseStorage(raw){
  const storage=raw.storage||raw.data?.storage||raw.localStorage||raw;
  const keys=Object.keys(storage||{});
  const kasKeys=['BM_KAS_BESAR_IMPORT_EXCEL_V1','BM_KAS_BESAR_ACTIVE_DB','BM_KAS_IMPORT_EXCEL_V1','DMA_KAS_BESAR_ACTIVE_DB','dwiMuliaKas_V8_ENTERPRISE','AP_KAS_BESAR_ACTIVE_DB','AP_KAS_V8_ENTERPRISE'];
  let kas={};
  for(const key of kasKeys){
    let value=storage[key];
    if(typeof value==='string')try{value=JSON.parse(value)}catch{}
    if(value&&typeof value==='object'){kas=value;break}
  }
  return{kas,keys};
}
function monthCandidates(year,index){
  const month=MONTHS[index],padded=String(index+1).padStart(2,'0');
  return[month,`${month} ${year}`,`${year}-${padded}`,`${year}/${padded}`,`${padded}-${year}`,index+1,index];
}
function findMonth(container,year,index){
  if(!container)return null;
  for(const key of monthCandidates(year,index))if(container[key]!=null)return container[key];
  return null;
}
function sumList(array){
  return(Array.isArray(array)?array:[]).reduce((sum,item)=>sum+num(item?.amount??item?.total??item?.nominal??item),0);
}
function parseMonth(kas,year,index,investor){
  const transaction=findMonth(kas.transactions,year,index)||{};
  const recap=findMonth(kas.rekap,year,index)||findMonth(kas.monthly,year,index)||{};
  const income=sumList(transaction.pemasukan)||num(recap.pemasukanReal??recap.pemasukan??recap.income);
  const operational=sumList(transaction.operasional)||num(recap.operasionalExcelPayroll??recap.operasional??recap.pengeluaranReal??recap.pengeluaran??recap.expense);
  const profitSharing=sumList(transaction.bagiHasil)||num(recap.bagiHasil??recap.profitSharing);
  const expense=num(recap.pengeluaranFinal??recap.totalPengeluaran)||operational;
  const profitValue=recap.labaRugiReal??recap.labaBersih??recap.labaRugi??recap.profit;
  const profit=profitValue!=null?num(profitValue):income-expense;
  const base=Math.max(0,profit);
  return{
    year,month:index+1,income,operational,profit_sharing_expense:profitSharing,
    expense,net_profit:profit,
    investor_share:base*num(investor.share_percent)/100,
    owner_share:base*num(investor.owner_percent)/100,
    joint_savings:base*num(investor.saving_percent)/100,
    published:true
  };
}

async function readSyncFile(event){
  const file=event.target.files[0];if(!file)return;
  try{
    const raw=JSON.parse(await file.text());
    const parsed=parseStorage(raw);
    const investor=investors.find(i=>i.id===$('syncInvestor').value);
    if(!investor)throw new Error('Pilih investor terlebih dahulu.');
    const year=+$('syncYear').value;
    syncPreview={investor,year,rows:MONTHS.map((_,index)=>parseMonth(parsed.kas,year,index,investor))};
    const total=syncPreview.rows.reduce((sum,row)=>({income:sum.income+row.income,expense:sum.expense+row.expense,profit:sum.profit+row.net_profit}),{income:0,expense:0,profit:0});
    $('syncPreview').innerHTML=`<b>File berhasil dibaca.</b><br>Key storage: ${parsed.keys.length}<br>Total pemasukan: ${money(total.income)}<br>Total pengeluaran: ${money(total.expense)}<br>Total laba: ${money(total.profit)}`;
    $('saveSyncButton').disabled=false;
  }catch(error){
    syncPreview=null;$('syncPreview').textContent='File tidak dapat dibaca: '+error.message;$('saveSyncButton').disabled=true;
  }
}

async function saveSync(){
  if(!syncPreview)return;
  const payload=syncPreview.rows.map(row=>({...row,investor_id:syncPreview.investor.id,source:'ADMIN_JSON',updated_at:new Date().toISOString()}));
  const result=await supabase.from('monthly_reports').upsert(payload,{onConflict:'investor_id,year,month'});
  if(result.error)return toast(result.error.message);
  activeInvestor=syncPreview.investor;$('investorSelect').value=activeInvestor.id;$('yearSelect').value=String(syncPreview.year);
  toast('Laporan berhasil disinkronkan.');await loadReport();
}

async function loadPublish(){
  const investorId=$('publishInvestor').value,year=+$('publishYear').value;
  if(!investorId)return;
  const result=await supabase.from('monthly_reports').select('month,published').eq('investor_id',investorId).eq('year',year);
  const map=new Map((result.data||[]).map(x=>[x.month,x.published]));
  $('publishMonths').innerHTML=MONTHS.map((month,index)=>`<label class="month-check"><input type="checkbox" data-month="${index+1}" ${map.get(index+1)!==false?'checked':''}>${month}</label>`).join('');
}

async function savePublish(){
  const investorId=$('publishInvestor').value,year=+$('publishYear').value;
  const checks=[...document.querySelectorAll('#publishMonths input')];
  for(const check of checks){
    await supabase.from('monthly_reports').update({published:check.checked}).eq('investor_id',investorId).eq('year',year).eq('month',+check.dataset.month);
  }
  toast('Status publikasi disimpan.');
}

init();
