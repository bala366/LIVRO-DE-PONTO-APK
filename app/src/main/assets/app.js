const STORE='livroPontoDataV1';
const now=()=>new Date();
const ymd=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const hm=d=>new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const minsToHM=m=>`${String(Math.floor(Math.max(0,m)/60)).padStart(2,'0')}:${String(Math.round(Math.max(0,m)%60)).padStart(2,'0')}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

let data=JSON.parse(localStorage.getItem(STORE)||'null')||{
  company:'Empresa Local',defaultHours:8,
  employees:[{id:crypto.randomUUID(),name:'João da Silva',code:'001',role:'Auxiliar Administrativo',hours:8}],
  punches:[],activeEmployeeId:null
};
if(!data.activeEmployeeId&&data.employees[0])data.activeEmployeeId=data.employees[0].id;
const save=()=>localStorage.setItem(STORE,JSON.stringify(data));
const toast=t=>{const e=document.querySelector('#toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',2600)};
const employee=id=>data.employees.find(e=>e.id===id);
const today=()=>ymd(new Date());
const dayPunches=(empId,date=today())=>data.punches.filter(p=>p.employeeId===empId&&p.date===date).sort((a,b)=>a.time.localeCompare(b.time));
const typeLabel={entrada:'Entrada',almoco_saida:'Saída Almoço',almoco_retorno:'Retorno Almoço',saida:'Saída',extra:'Hora Extra'};

function calcDay(empId,date){
  const p=dayPunches(empId,date); const get=t=>p.filter(x=>x.type===t).at(-1);
  const a=get('entrada'),b=get('almoco_saida'),c=get('almoco_retorno'),d=get('saida');
  let worked=0; const diff=(x,y)=>x&&y?(new Date(`${date}T${y.time}`)-new Date(`${date}T${x.time}`))/60000:0;
  worked+=diff(a,b); worked+=diff(c,d); if(a&&!b&&date===today()) worked+=diff(a,{time:hm(now())});
  if(a&&b&&!c&&d) worked=diff(a,d)-60;
  const emp=employee(empId); const goal=(emp?.hours||data.defaultHours||8)*60; const extra=Math.max(0,worked-goal);
  return {worked,extra,total:worked};
}
function registerPunch(empId,type,date=today(),time=hm(now())){
  if(!empId)return toast('Selecione um funcionário.');
  data.punches.push({id:crypto.randomUUID(),employeeId:empId,type,date,time,createdAt:new Date().toISOString()});data.activeEmployeeId=empId;save();renderAll();toast(`${typeLabel[type]} registrada às ${time}.`);
}
function renderHeader(){const d=new Date();document.querySelector('#todayDate').textContent=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});document.querySelector('#todayWeek').textContent=d.toLocaleDateString('pt-BR',{weekday:'long'});document.querySelector('#monthLabel').textContent=d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});}
function renderDashboard(){
  document.querySelector('#statEmployees').textContent=data.employees.length;
  const present=new Set(data.punches.filter(p=>p.date===today()&&p.type==='entrada').map(p=>p.employeeId));document.querySelector('#statPresent').textContent=present.size;
  let total=0,extra=0; data.employees.forEach(e=>{const c=calcDay(e.id,today());total+=c.worked;extra+=c.extra});document.querySelector('#statHours').textContent=minsToHM(total);document.querySelector('#statExtra').textContent=minsToHM(extra);
  const emp=employee(data.activeEmployeeId);document.querySelector('#activeName').textContent=emp?.name||'Nenhum funcionário selecionado';document.querySelector('#activeMeta').textContent=emp?`Código: ${emp.code} • Cargo: ${emp.role}`:'Selecione um funcionário';
  const ps=emp?dayPunches(emp.id):[]; const last=t=>ps.filter(p=>p.type===t).at(-1)?.time||'--:--';document.querySelector('#timeEntrada').textContent=last('entrada');document.querySelector('#timeAlmocoSaida').textContent=last('almoco_saida');document.querySelector('#timeAlmocoRetorno').textContent=last('almoco_retorno');document.querySelector('#timeSaida').textContent=last('saida');
  const c=emp?calcDay(emp.id,today()):{worked:0,extra:0,total:0};document.querySelector('#journeyHours').textContent=minsToHM(c.worked);document.querySelector('#journeyExtra').textContent=minsToHM(c.extra);document.querySelector('#journeyTotal').textContent=minsToHM(c.total);document.querySelector('#workStatus').textContent=ps.some(p=>p.type==='entrada')&&!ps.some(p=>p.type==='saida')?'Em andamento':'Aguardando';
  const latest=[...data.punches].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6);document.querySelector('#latestRecords').innerHTML=latest.length?latest.map(p=>`<div class="record-item"><i class="dot"></i><div><b>${esc(employee(p.employeeId)?.name||'Excluído')}</b><small>${typeLabel[p.type]} • ${new Date(p.date+'T12:00').toLocaleDateString('pt-BR')}</small></div><b>${p.time}</b></div>`).join(''):'<p>Nenhum registro ainda.</p>';
  const month=today().slice(0,7);const dates=[...new Set(data.punches.filter(p=>p.date.startsWith(month)&&p.type==='entrada').map(p=>`${p.employeeId}|${p.date}`))];let mw=0,me=0;dates.forEach(k=>{const [id,dt]=k.split('|'),cc=calcDay(id,dt);mw+=cc.worked;me+=cc.extra});document.querySelector('#monthDays').textContent=new Set(dates.map(x=>x.split('|')[1])).size;document.querySelector('#monthHours').textContent=minsToHM(mw);document.querySelector('#monthExtra').textContent=minsToHM(me);
}
function renderEmployees(){const sel=document.querySelector('#punchEmployee');sel.innerHTML=data.employees.map(e=>`<option value="${e.id}" ${e.id===data.activeEmployeeId?'selected':''}>${esc(e.code)} - ${esc(e.name)}</option>`).join('');document.querySelector('#employeeList').innerHTML=`<table class="data-table"><thead><tr><th>Código</th><th>Nome</th><th>Cargo</th><th>Jornada</th><th>Ações</th></tr></thead><tbody>${data.employees.map(e=>`<tr><td>${esc(e.code)}</td><td>${esc(e.name)}</td><td>${esc(e.role)}</td><td>${e.hours}h</td><td><button class="edit" data-edit="${e.id}">Editar</button> <button class="delete" data-del="${e.id}">Excluir</button></td></tr>`).join('')}</tbody></table>`;}
function renderRecords(){const q=(document.querySelector('#recordSearch')?.value||'').toLowerCase();let arr=[...data.punches].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));if(q)arr=arr.filter(p=>`${employee(p.employeeId)?.name} ${p.date} ${typeLabel[p.type]}`.toLowerCase().includes(q));document.querySelector('#recordsTable').innerHTML=`<table class="data-table"><thead><tr><th>Data</th><th>Hora</th><th>Funcionário</th><th>Tipo</th><th>Ação</th></tr></thead><tbody>${arr.map(p=>`<tr><td>${new Date(p.date+'T12:00').toLocaleDateString('pt-BR')}</td><td>${p.time}</td><td>${esc(employee(p.employeeId)?.name||'Excluído')}</td><td>${typeLabel[p.type]}</td><td><button class="delete" data-del-punch="${p.id}">Excluir</button></td></tr>`).join('')}</tbody></table>`;}
function monthlyRows(month){return data.employees.map(e=>{const dates=[...new Set(data.punches.filter(p=>p.employeeId===e.id&&p.date.startsWith(month)&&p.type==='entrada').map(p=>p.date))];let w=0,x=0;dates.forEach(d=>{const c=calcDay(e.id,d);w+=c.worked;x+=c.extra});return {e,days:dates.length,worked:w,extra:x,bank:w-dates.length*(e.hours||data.defaultHours)*60};});}
function renderReport(){const m=document.querySelector('#reportMonth').value||today().slice(0,7);const rows=monthlyRows(m);const days=new Set(data.punches.filter(p=>p.date.startsWith(m)&&p.type==='entrada').map(p=>p.date)).size;const w=rows.reduce((s,r)=>s+r.worked,0),x=rows.reduce((s,r)=>s+r.extra,0);document.querySelector('#reportSummary').innerHTML=`<div>Dias com registros<b>${days}</b></div><div>Funcionários<b>${data.employees.length}</b></div><div>Horas Trabalhadas<b>${minsToHM(w)}</b></div><div>Horas Extras<b>${minsToHM(x)}</b></div>`;document.querySelector('#reportTable').innerHTML=`<table class="data-table"><thead><tr><th>Código</th><th>Funcionário</th><th>Dias</th><th>Horas</th><th>Extras</th><th>Banco</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.e.code)}</td><td>${esc(r.e.name)}</td><td>${r.days}</td><td>${minsToHM(r.worked)}</td><td>${minsToHM(r.extra)}</td><td>${r.bank<0?'-':''}${minsToHM(Math.abs(r.bank))}</td></tr>`).join('')}</tbody></table>`;}
function renderExtrasBank(){const month=(document.querySelector('#reportMonth').value||today().slice(0,7));const rows=monthlyRows(month);document.querySelector('#extraTable').innerHTML=`<table class="data-table"><thead><tr><th>Funcionário</th><th>Horas extras no mês</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.e.name)}</td><td>${minsToHM(r.extra)}</td></tr>`).join('')}</tbody></table>`;document.querySelector('#bankTable').innerHTML=`<table class="data-table"><thead><tr><th>Funcionário</th><th>Banco de horas</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.e.name)}</td><td>${r.bank<0?'-':''}${minsToHM(Math.abs(r.bank))}</td></tr>`).join('')}</tbody></table>`;}
function renderConfig(){document.querySelector('#companyName').value=data.company||'';document.querySelector('#defaultHours').value=data.defaultHours||8;}
function renderAll(){renderHeader();renderEmployees();renderDashboard();renderRecords();renderReport();renderExtrasBank();renderConfig();}
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===id));if(id==='relatorios')renderReport();}

document.addEventListener('click',async e=>{
  const nav=e.target.closest('[data-view]');if(nav){showView(nav.dataset.view);return}
  const jump=e.target.closest('[data-view-jump]');if(jump){showView(jump.dataset.viewJump);return}
  const quick=e.target.closest('.punch[data-punch]');if(quick){registerPunch(data.activeEmployeeId,quick.dataset.punch);return}
  const manual=e.target.closest('[data-manual-punch]');if(manual){registerPunch(document.querySelector('#punchEmployee').value,manual.dataset.manualPunch,document.querySelector('#punchDate').value,document.querySelector('#punchTime').value);return}
  if(e.target.matches('#saveEmployeeBtn')){const id=document.querySelector('#employeeId').value;const obj={id:id||crypto.randomUUID(),name:document.querySelector('#employeeName').value.trim(),code:document.querySelector('#employeeCode').value.trim(),role:document.querySelector('#employeeRole').value.trim(),hours:Number(document.querySelector('#employeeHours').value||8)};if(!obj.name||!obj.code)return toast('Informe nome e código.');if(id){data.employees[data.employees.findIndex(x=>x.id===id)]=obj}else{data.employees.push(obj);data.activeEmployeeId=obj.id}save();['employeeId','employeeName','employeeCode','employeeRole'].forEach(id=>document.querySelector('#'+id).value='');document.querySelector('#employeeHours').value=data.defaultHours;renderAll();toast('Funcionário salvo.');return}
  const edit=e.target.closest('[data-edit]');if(edit){const x=employee(edit.dataset.edit);document.querySelector('#employeeId').value=x.id;document.querySelector('#employeeName').value=x.name;document.querySelector('#employeeCode').value=x.code;document.querySelector('#employeeRole').value=x.role;document.querySelector('#employeeHours').value=x.hours;return}
  const del=e.target.closest('[data-del]');if(del&&confirm('Excluir funcionário?')){data.employees=data.employees.filter(x=>x.id!==del.dataset.del);if(data.activeEmployeeId===del.dataset.del)data.activeEmployeeId=data.employees[0]?.id||null;save();renderAll();return}
  const dp=e.target.closest('[data-del-punch]');if(dp&&confirm('Excluir este registro?')){data.punches=data.punches.filter(x=>x.id!==dp.dataset.delPunch);save();renderAll();return}
  if(e.target.matches('#finalizeBtn')){registerPunch(data.activeEmployeeId,'saida');return}
  if(e.target.matches('#backupBtn,#backupQuick')){const r=await window.desktopAPI.saveBackup(data);if(r.ok)toast('Backup salvo com sucesso.');return}
  if(e.target.matches('#restoreBtn')){const r=await window.desktopAPI.loadBackup();if(r.ok){data=r.data;save();renderAll();toast('Backup restaurado.')}return}
  if(e.target.matches('#saveConfig')){data.company=document.querySelector('#companyName').value.trim();data.defaultHours=Number(document.querySelector('#defaultHours').value||8);save();renderAll();toast('Configurações salvas.');return}
  if(e.target.matches('#pdfBtn')){await window.desktopAPI.printPDF();return}
  if(e.target.matches('#csvBtn')){const m=document.querySelector('#reportMonth').value;const rows=monthlyRows(m);const csv=['Código;Funcionário;Dias;Horas;Extras;Banco',...rows.map(r=>`${r.e.code};${r.e.name};${r.days};${minsToHM(r.worked)};${minsToHM(r.extra)};${r.bank<0?'-':''}${minsToHM(Math.abs(r.bank))}`)].join('\n');await window.desktopAPI.exportCSV(csv);return}
});
document.querySelector('#punchEmployee').addEventListener('change',e=>{data.activeEmployeeId=e.target.value;save();renderDashboard()});
document.querySelector('#recordSearch').addEventListener('input',renderRecords);document.querySelector('#reportMonth').addEventListener('change',()=>{renderReport();renderExtrasBank()});
const d=new Date();document.querySelector('#punchDate').value=today();document.querySelector('#punchTime').value=hm(d);document.querySelector('#reportMonth').value=today().slice(0,7);renderAll();setInterval(()=>{if(document.activeElement?.id!=='punchTime')document.querySelector('#punchTime').value=hm(new Date());renderDashboard()},60000);
