'use strict';
/* Order Booking app (SalesFlo style) - shops, order booking, DSR Excel export */
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const BRANDS=[
  {id:'sh',name:'Super Hockey',g:'M',col:'E',h:'SUPER\nHOCKEY'},
  {id:'ch',name:'Classic Hockey',g:'M',col:'F',h:'CLASSIC\nHOCKEY'},
  {id:'fl',name:'Flame',g:'M',col:'G',h:'FLAME'},
  {id:'g60',name:'60gm',g:'O',col:'I',h:'60gm'},
  {id:'g90',name:'90gm',g:'O',col:'J',h:'90gm'},
  {id:'g155',name:'155gm',g:'O',col:'K',h:'155gm'},
  {id:'g255',name:'255gm',g:'O',col:'L',h:'255gm'},
  {id:'g290',name:'290gm',g:'O',col:'M',h:'290gm'},
  {id:'ml20',name:'20ml',g:'O',col:'N',h:'20ml'},
  {id:'ml275',name:'275ml',g:'O',col:'O',h:'275ml'},
  {id:'ml475',name:'475ml',g:'O',col:'P',h:'475ml'}
];
const LK='orderbooking.v1';
const $=(s,r)=>(r||document).querySelector(s);
const p2=n=>String(n).padStart(2,'0');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function todayStr(){const d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());}
function pd(s){const a=String(s).split('-').map(Number);return {y:a[0],m:a[1],d:a[2]};}
function fmtLong(s){const p=pd(s);return p.d+' '+MONTHS[p.m-1]+' '+p.y;}
function fmtShort(s){const p=pd(s);return p.d+' '+MONTHS[p.m-1].slice(0,3)+' '+p.y;}

function load(){
  try{const j=JSON.parse(localStorage.getItem(LK)||'null');if(j&&Array.isArray(j.shops))return j;}catch(e){}
  return {shops:[],orders:[],settings:{name:'',station:'',zone:'',area:'',dsrNo:'',discPct:1.5}};
}
let DB=load();
if(!DB.settings)DB.settings={name:'',station:'',zone:'',area:'',dsrNo:'',discPct:1.5};
function save(){try{localStorage.setItem(LK,JSON.stringify(DB));}catch(e){toast('Storage full or blocked');}}
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>{t.hidden=true;},2600);}

const ST={screen:'home',stack:[],date:todayStr(),q:'',shop:null,draft:null,pickFor:'order'};
function go(screen,opts){ST.stack.push(ST.screen);ST.screen=screen;Object.assign(ST,opts||{});render();window.scrollTo(0,0);}
function back(){ST.screen=ST.stack.pop()||'home';render();window.scrollTo(0,0);}
function tab(screen){ST.stack=[];ST.screen=screen;ST.q='';render();window.scrollTo(0,0);}

const shopById=id=>DB.shops.find(s=>s.id===id);
const ordersOn=d=>DB.orders.filter(o=>o.date===d).sort((a,b)=>(a.ts||0)-(b.ts||0));
const cartons=o=>BRANDS.reduce((s,b)=>s+(Number(o.qty&&o.qty[b.id])||0),0);
function remarksOf(o){
  const a=[];
  if(o.delivery)a.push('Delivery: '+fmtShort(o.delivery));
  if(o.disc)a.push('Discount '+(DB.settings.discPct||1.5)+'%');
  if(o.remarks)a.push(o.remarks);
  return a.join(', ');
}

/* ---------- views ---------- */
function hdr(title,sub,withBack){
  return '<div class="hdr">'+(withBack?'<button class="ib" data-act="back" aria-label="Back">‹</button>':'')+
    '<div class="grow"><h1>'+esc(title)+'</h1>'+(sub?'<div class="sub">'+esc(sub)+'</div>':'')+'</div></div>';
}
function vHome(){
  const os=ordersOn(todayStr());const c=os.reduce((s,o)=>s+cartons(o),0);
  const s=DB.settings;
  return '<div class="hero"><h1>Order Booking</h1><p>'+esc(s.name||'Set your name in Settings')+(s.station?' · '+esc(s.station):'')+' · '+fmtLong(todayStr())+'</p></div>'+
  '<div class="stats"><div class="stat"><b>'+os.length+'</b><span>Orders today</span></div><div class="stat"><b>'+c+'</b><span>Cartons today</span></div><div class="stat"><b>'+DB.shops.length+'</b><span>Shops</span></div></div>'+
  '<div class="tiles">'+
   '<button class="tile" data-act="newOrder"><i>🛒</i>Book Order<small>New order</small></button>'+
   '<button class="tile" data-act="tab" data-t="shops"><i>🏪</i>Outlets<small>'+DB.shops.length+' shops</small></button>'+
   '<button class="tile" data-act="tab" data-t="orders"><i>📋</i>Orders<small>Day wise</small></button>'+
   '<button class="tile" data-act="tab" data-t="dsr"><i>📊</i>DSR Report<small>Excel sheet</small></button>'+
  '</div>';
}
function vShops(){
  const q=ST.q.trim().toLowerCase();
  const list=DB.shops.filter(s=>!q||(s.name+' '+s.address).toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
  const pick=ST.pickFor==='order'&&ST.screen==='pick';
  return hdr(pick?'Select Shop':'Outlets',DB.shops.length+' shops',ST.screen==='pick')+
  '<div class="body"><input class="search" data-f="q" placeholder="Search shop or address" value="'+esc(ST.q)+'">'+
  (list.length?list.map(s=>'<div class="card"><div class="row"><div class="grow"><div class="ttl">'+esc(s.name)+' <span class="badge '+(s.rw==='R'?'':'w')+'">'+esc(s.rw)+'</span></div><div class="mut">'+esc(s.address||'-')+'</div></div>'+
    '<button class="btn p sm" data-act="book" data-id="'+s.id+'">Book</button>'+
    (pick?'':'<button class="btn sm" data-act="editShop" data-id="'+s.id+'">Edit</button>')+'</div></div>').join(''):
   '<div class="empty">No shops yet.<br>Tap + to add a shop.</div>')+'</div>'+
  '<button class="fab" data-act="addShop" aria-label="Add shop">+</button>';
}
function vShopForm(){
  const s=ST.shop;
  return hdr(s.id?'Edit Shop':'New Shop','',true)+'<div class="body">'+
  '<div class="fld"><label>Name</label><input class="in" data-s="name" value="'+esc(s.name)+'" placeholder="Shop name"></div>'+
  '<div class="fld"><label>R / W</label><div class="seg"><button data-act="rw" data-v="R" class="'+(s.rw==='R'?'on':'')+'">R · Retail</button><button data-act="rw" data-v="W.S" class="'+(s.rw==='W.S'?'on':'')+'">W.S · Wholesale</button></div></div>'+
  '<div class="fld"><label>Address / Phone No.</label><input class="in" data-s="address" value="'+esc(s.address)+'" placeholder="e.g. Daal Bazaar"></div>'+
  '<button class="btn p full" data-act="saveShop">Save Shop</button>'+
  (s.id?'<div style="height:10px"></div><button class="btn d full" data-act="delShop">Delete Shop</button>':'')+'</div>';
}
function stepRow(b,d){
  const v=Number(d.qty[b.id])||0;
  return '<div class="prod"><div class="nm">'+esc(b.name)+'</div><div class="step"><button data-act="dec" data-id="'+b.id+'">−</button>'+
   '<input type="number" inputmode="numeric" min="0" data-q="'+b.id+'" class="'+(v?'has':'')+'" value="'+(v||'')+'" placeholder="0"><button data-act="inc" data-id="'+b.id+'">+</button></div></div>';
}
function vOrderForm(){
  const d=ST.draft,sh=shopById(d.shopId);
  const tot=BRANDS.reduce((s,b)=>s+(Number(d.qty[b.id])||0),0);
  return hdr(sh?sh.name:'Order',sh?((sh.rw)+' · '+(sh.address||'-')):'',true)+'<div class="body">'+
  '<div class="fld"><label>Date</label><input class="in" type="date" data-d="date" value="'+esc(d.date)+'"></div>'+
  '<div class="sec">Match Division</div>'+BRANDS.filter(b=>b.g==='M').map(b=>stepRow(b,d)).join('')+
  '<div class="sec">Oll Clean</div>'+BRANDS.filter(b=>b.g==='O').map(b=>stepRow(b,d)).join('')+
  '<div class="sec">Remarks</div>'+
  '<label class="card row" style="gap:10px"><input type="checkbox" data-d="disc" '+(d.disc?'checked':'')+' style="width:22px;height:22px"><span class="grow ttl">Discount '+esc(DB.settings.discPct||1.5)+'%</span></label>'+
  '<div class="fld"><label>Delivery date (optional)</label><input class="in" type="date" data-d="delivery" value="'+esc(d.delivery||'')+'"></div>'+
  '<div class="fld"><label>Remarks</label><textarea class="in" data-d="remarks" placeholder="Remarks">'+esc(d.remarks||'')+'</textarea></div>'+
  (d.id?'<button class="btn d full" data-act="delOrder">Delete Order</button><div style="height:80px"></div>':'<div style="height:80px"></div>')+'</div>'+
  '<div class="bar"><div class="in2"><div class="grow mut">Total cartons<br><b id="tot">'+tot+'</b></div><button class="btn p" data-act="saveOrder" style="min-width:150px">Save Order</button></div></div>';
}
function vOrders(){
  const os=ordersOn(ST.date);const c=os.reduce((s,o)=>s+cartons(o),0);
  return hdr('Orders',os.length+' orders · '+c+' cartons',false)+'<div class="body">'+
  '<div class="fld"><label>Date</label><input class="in" type="date" data-f="date" value="'+esc(ST.date)+'"></div>'+
  (os.length?os.map(o=>{const sh=shopById(o.shopId)||{name:'(deleted shop)',address:'',rw:''};const r=remarksOf(o);
    return '<div class="card" data-act="editOrder" data-id="'+o.id+'"><div class="row"><div class="grow"><div class="ttl">'+esc(sh.name)+' <span class="badge '+(sh.rw==='R'?'':'w')+'">'+esc(sh.rw)+'</span></div><div class="mut">'+esc(sh.address||'-')+'</div></div><b>'+cartons(o)+' ctn</b></div>'+
     '<div class="chips">'+BRANDS.filter(b=>Number(o.qty[b.id])>0).map(b=>'<i>'+esc(b.name)+': <b>'+o.qty[b.id]+'</b></i>').join('')+'</div>'+(r?'<span class="note">'+esc(r)+'</span>':'')+'</div>';}).join(''):
   '<div class="empty">No orders on this date.</div>')+'</div>';
}
/* DSR rows: grouped by address, in booking order */
function dsrRows(date){
  const os=ordersOn(date);const order=[];const m=new Map();
  for(const o of os){const sh=shopById(o.shopId)||{name:'(deleted shop)',address:'',rw:''};const a=(sh.address||'').trim();
    if(!m.has(a)){m.set(a,[]);order.push(a);} m.get(a).push({o,sh});}
  const rows=[];for(const a of order)for(const x of m.get(a))rows.push({shop:x.sh.name,rw:x.sh.rw,addr:x.sh.address||'',q:x.o.qty||{},remarks:remarksOf(x.o)});
  return rows;
}
function vDsr(){
  const rows=dsrRows(ST.date);const n=Math.max(25,rows.length);
  const sums=BRANDS.map(b=>rows.reduce((s,r)=>s+(Number(r.q[b.id])||0),0));
  let body='';
  for(let i=0;i<n;i++){const r=rows[i];
    body+='<tr><td><b>'+(i+1)+'</b></td><td class="l">'+esc(r?r.shop:'')+'</td><td>'+esc(r?r.rw:'')+'</td><td class="l">'+esc(r?r.addr:'')+'</td>'+
      BRANDS.map(b=>'<td>'+(r&&Number(r.q[b.id])?r.q[b.id]:'')+'</td>').join('')+'<td class="l">'+esc(r?r.remarks:'')+'</td></tr>';}
  return hdr('DSR Report',rows.length+' shops',false)+'<div class="body">'+
  '<div class="fld"><label>Date</label><input class="in" type="date" data-f="date" value="'+esc(ST.date)+'"></div>'+
  '<div class="two"><button class="btn p" data-act="xlsx">⬇ Excel (.xlsx)</button><button class="btn p" data-act="pdf">⬇ PDF</button></div><div style="height:8px"></div><button class="btn full" data-act="share">Share Excel</button><div style="height:12px"></div>'+
  '<div class="scroll"><table class="dsr"><thead><tr><th>#</th><th>Name shop keepers</th><th>R/W</th><th>Address/Phone No.</th>'+
   BRANDS.map(b=>'<th>'+esc(b.h.replace('\n',' '))+'</th>').join('')+'<th>Remarks</th></tr></thead><tbody>'+body+
   '<tr class="sum"><td colspan="4" class="l">Sales:</td>'+sums.map(v=>'<td>'+(v||'')+'</td>').join('')+'<td></td></tr></tbody></table></div></div>';
}
function vSettings(){
  const s=DB.settings;
  const f=(k,l,ph)=>'<div class="fld"><label>'+l+'</label><input class="in" data-st="'+k+'" value="'+esc(s[k])+'" placeholder="'+(ph||'')+'"></div>';
  return hdr('Settings','DSR header details',false)+'<div class="body">'+
   f('name','Name','Your name')+f('station','Station','Sheikhupura')+f('zone','Zone','Sheikhupura')+f('area','Area / Sales Person','Main Market')+f('dsrNo','DSR No.','')+f('discPct','Discount %','1.5')+
   '<div class="sec">Test data</div><button class="btn full" data-act="sample">Load sample data (19 Oct 2026)</button><div class="mut" style="margin-top:6px">Adds 22 sample shops and orders from the DSR sheet so you can test the Excel and PDF.</div>'+
   '<div class="sec">Backup</div><div class="two"><button class="btn" data-act="backup">Download backup</button><button class="btn" data-act="restore">Restore backup</button></div>'+
   '<input type="file" id="rf" accept=".json,application/json" hidden></div>';
}
function render(){
  const sc=ST.screen;let h='';
  if(sc==='home')h=vHome();else if(sc==='shops'||sc==='pick')h=vShops();else if(sc==='shopForm')h=vShopForm();
  else if(sc==='order')h=vOrderForm();else if(sc==='orders')h=vOrders();else if(sc==='dsr')h=vDsr();else if(sc==='settings')h=vSettings();
  $('#app').innerHTML=h;
  const on={home:'home',shops:'shops',pick:'order',shopForm:'shops',order:'order',orders:'orders',dsr:'dsr',settings:'settings'}[sc];
  $('#nav').innerHTML=[['home','🏠','Home'],['shops','🏪','Outlets'],['orders','📋','Orders'],['dsr','📊','DSR'],['settings','⚙️','Settings']]
    .map(x=>'<button data-act="tab" data-t="'+x[0]+'" class="'+(on===x[0]?'on':'')+'"><i>'+x[1]+'</i>'+x[2]+'</button>').join('');
}

/* ---------- actions ---------- */
function startOrder(shopId,order){
  ST.draft=order?JSON.parse(JSON.stringify(order)):{id:'',shopId,date:todayStr(),qty:{},disc:false,delivery:'',remarks:''};
  go('order');
}
function updTot(){const d=ST.draft;const t=BRANDS.reduce((s,b)=>s+(Number(d.qty[b.id])||0),0);const e=$('#tot');if(e)e.textContent=t;}
function setQty(id,v){
  v=Math.max(0,Math.floor(Number(v)||0));ST.draft.qty[id]=v;
  const i=$('[data-q="'+id+'"]');if(i){i.value=v||'';i.classList.toggle('has',v>0);}updTot();
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');if(!t)return;const a=t.dataset.act;
  if(a==='back')back();
  else if(a==='tab')tab(t.dataset.t);
  else if(a==='newOrder'){ST.pickFor='order';ST.q='';go('pick');}
  else if(a==='addShop'){ST.shop={id:'',name:'',rw:'R',address:''};go('shopForm');}
  else if(a==='editShop'){ST.shop=Object.assign({},shopById(t.dataset.id));go('shopForm');}
  else if(a==='rw'){ST.shop.rw=t.dataset.v;render();}
  else if(a==='saveShop'){
    const s=ST.shop;s.name=s.name.trim();if(!s.name){toast('Enter shop name');return;}
    if(s.id){const i=DB.shops.findIndex(x=>x.id===s.id);DB.shops[i]=s;}else{s.id=uid();DB.shops.push(s);}
    save();toast('Shop saved');back();
  }
  else if(a==='delShop'){
    if(DB.orders.some(o=>o.shopId===ST.shop.id)){toast('This shop has orders, cannot delete');return;}
    if(confirm('Delete this shop?')){DB.shops=DB.shops.filter(x=>x.id!==ST.shop.id);save();back();}
  }
  else if(a==='book'){ST.q='';ST.stack=ST.stack.filter(s=>s!=='pick'&&s!=='order');startOrder(t.dataset.id);}
  else if(a==='inc')setQty(t.dataset.id,(Number(ST.draft.qty[t.dataset.id])||0)+1);
  else if(a==='dec')setQty(t.dataset.id,(Number(ST.draft.qty[t.dataset.id])||0)-1);
  else if(a==='saveOrder'){
    const d=ST.draft;if(!cartons(d)){toast('Enter at least one carton');return;}
    d.qty=Object.fromEntries(Object.entries(d.qty).filter(x=>Number(x[1])>0));
    if(d.id){const i=DB.orders.findIndex(o=>o.id===d.id);DB.orders[i]=d;}else{d.id=uid();d.ts=Date.now();DB.orders.push(d);}
    save();ST.date=d.date;toast('Order saved');ST.stack=[];ST.screen='orders';render();
  }
  else if(a==='editOrder'){const o=DB.orders.find(x=>x.id===t.dataset.id);if(o)startOrder(o.shopId,o);}
  else if(a==='delOrder'){if(confirm('Delete this order?')){DB.orders=DB.orders.filter(o=>o.id!==ST.draft.id);save();ST.stack=[];ST.screen='orders';render();}}
  else if(a==='xlsx')downloadXlsx(false);
  else if(a==='share')downloadXlsx(true);
  else if(a==='pdf')downloadPdf();
  else if(a==='sample')loadSample();
  else if(a==='backup'){const b=new Blob([JSON.stringify(DB)],{type:'application/json'});saveBlob(b,'OrderBooking_backup_'+todayStr()+'.json');}
  else if(a==='restore')$('#rf').click();
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.f==='q'){ST.q=t.value;const pos=t.selectionStart;render();const n=$('[data-f="q"]');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}}
  else if(t.dataset.q)setQty(t.dataset.q,t.value);
  else if(t.dataset.s)ST.shop[t.dataset.s]=t.value;
  else if(t.dataset.st){DB.settings[t.dataset.st]=t.dataset.st==='discPct'?(Number(t.value)||0):t.value;save();}
  else if(t.dataset.d){const k=t.dataset.d;ST.draft[k]=t.type==='checkbox'?t.checked:t.value;}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.f==='date'){ST.date=t.value||todayStr();render();}
  else if(t.id==='rf'&&t.files[0]){
    const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(!Array.isArray(j.shops)||!Array.isArray(j.orders))throw 0;
      if(confirm('Replace current data with this backup?')){DB=j;if(!DB.settings)DB.settings={name:'',station:'',zone:'',area:'',dsrNo:'',discPct:1.5};save();toast('Backup restored');render();}}
      catch(x){toast('Invalid backup file');}};r.readAsText(t.files[0]);
  }
});

/* ---------- Excel DSR (same layout as the DSR sheet) ---------- */
async function saveBlob(blob,name){
  try{
    if(window.claude&&window.claude.use){
      const dl=await window.claude.use('downloads');
      if(dl){await dl.save({filename:name,data:blob});return 'saved';}
    }
  }catch(e){if(e&&e.code==='declined')return 'declined';}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
  return 'saved';
}
async function buildXlsx(date){
  if(!window.ExcelJS)throw new Error('Excel tool did not load. Check internet and reopen.');
  const rows=dsrRows(date);const n=Math.max(25,rows.length);const s=DB.settings;
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet('DSR',{views:[{showGridLines:false}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.3,right:.3,top:.4,bottom:.4,header:.2,footer:.2}}});
  const W={A:6,B:34,C:8,D:30,E:9,F:9,G:9,H:4,I:8,J:8,K:8,L:8,M:8,N:8,O:8,P:8,Q:32};
  Object.keys(W).forEach(k=>{ws.getColumn(k).width=W[k];});
  const thin={style:'thin',color:{argb:'FF000000'}};const B={top:thin,left:thin,bottom:thin,right:thin};
  const DARK='FF404040',LIGHT='FFE4E4E4';
  const put=(ref,val,o)=>{o=o||{};const c=ws.getCell(ref);c.value=val;
    c.font={name:'Arial',size:o.sz||9,bold:!!o.b,color:{argb:o.color||'FF000000'}};
    c.alignment={horizontal:o.al||'center',vertical:'middle',wrapText:true,readingOrder:o.rtl?'rtl':undefined};
    if(o.fill)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:o.fill}};return c;};
  const box=(r1,c1,r2,c2)=>{for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)ws.getCell(r,c).border=B;};
  const mg=(rng)=>{ws.mergeCells(rng);};
  // header block rows 1-2
  mg('A1:C1');put('A1','Name: '+(s.name||''),{al:'left'});
  put('D1','Date: '+fmtLong(date),{al:'left'});
  mg('E1:H2');put('E1','D.S.R.',{b:true,sz:20,color:'FFFFFFFF',fill:DARK});
  mg('I1:N1');put('I1','Station: '+(s.station||''),{al:'left'});
  mg('O1:Q1');put('O1','Zone: '+(s.zone||''),{al:'left'});
  mg('A2:D2');put('A2','',{});
  mg('I2:O2');put('I2','Area / Sales Person: '+(s.area||''),{al:'left'});
  mg('P2:Q2');put('P2','No.: '+(s.dsrNo||''),{al:'left'});
  box(1,1,2,17);
  // column headers rows 3-5
  mg('A3:B4');put('A3','Name shop keepers',{b:true,sz:11,color:'FFFFFFFF',fill:DARK});
  mg('A5:B5');put('A5','Opening',{});
  mg('C3:C5');put('C3','R/W',{b:true,sz:11,color:'FFFFFFFF',fill:DARK});
  mg('D3:D5');put('D3','Address/Phone No.',{b:true,sz:11,color:'FFFFFFFF',fill:DARK});
  mg('E3:H3');put('E3','MATCH DIVISION',{b:true,sz:9,fill:LIGHT});
  mg('E4:H4');put('E4','SALES & POSITION',{b:true,sz:7,fill:LIGHT});
  mg('I3:P4');put('I3','OLL CLEAN',{b:true,sz:10,color:'FFFFFFFF',fill:DARK});
  mg('Q3:Q5');put('Q3','Remarks',{b:true,sz:11,color:'FFFFFFFF',fill:DARK});
  BRANDS.forEach(b=>put(b.col+'5',b.h,{b:true,sz:7,fill:LIGHT}));
  put('H5','',{fill:LIGHT});
  box(3,1,5,17);
  ws.getRow(5).height=26;ws.getRow(3).height=18;ws.getRow(4).height=14;ws.getRow(1).height=22;ws.getRow(2).height=22;
  // data rows
  const r0=6;
  for(let i=0;i<n;i++){
    const r=r0+i,x=rows[i];
    put('A'+r,i+1,{b:true});put('B'+r,x?x.shop:'',{});put('C'+r,x?x.rw:'',{});put('D'+r,x?x.addr:'',{});
    BRANDS.forEach(b=>{const v=x?Number(x.q[b.id])||0:0;put(b.col+r,v?v:null,{});});
    put('H'+r,null,{});put('Q'+r,x?x.remarks:'',{});
    ws.getRow(r).height=19;
  }
  box(r0,1,r0+n-1,17);
  // totals
  const rs=r0+n,rc=rs+1;
  mg('A'+rs+':B'+rs);put('A'+rs,'Sales:',{b:true,al:'left'});
  BRANDS.forEach(b=>{const v=rows.reduce((t,x)=>t+(Number(x.q[b.id])||0),0);
    const c=put(b.col+rs,null,{b:true});c.value={formula:'SUM('+b.col+r0+':'+b.col+(r0+n-1)+')',result:v};});
  mg('A'+rc+':B'+rc);put('A'+rc,'Closing:',{b:true,al:'left'});
  for(const col of ['C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q']){put(col+rs,ws.getCell(col+rs).value,{b:true});put(col+rc,null,{});}
  box(rs,1,rc,17);
  ws.getRow(rs).height=20;ws.getRow(rc).height=24;
  // Urdu notes row
  const rn=rc+2;
  mg('B'+rn+':D'+rn);put('B'+rn,'④ کتنے سپر اسٹور/ڈیپارٹمنٹل اسٹور وزٹ کیے۔',{al:'right',rtl:true});
  mg('F'+rn+':K'+rn);put('F'+rn,'③ اسٹاک پوزیشن خود چیک کرکے تحریر کریں۔',{al:'right',rtl:true});
  mg('M'+rn+':O'+rn);put('M'+rn,'② کتنی نئی شاپس پر مال کیا گیا۔',{al:'right',rtl:true});
  put('Q'+rn,'① کتنے آرڈر لیے گئے۔',{al:'right',rtl:true});
  ws.getRow(rn).height=24;
  return wb.xlsx.writeBuffer();
}
function fileStamp(date){const p=pd(date);return p.d+MONTHS[p.m-1].slice(0,3)+p.y;}
async function downloadXlsx(share){
  const date=ST.date;
  if(!ordersOn(date).length){toast('No orders on this date');return;}
  try{
    const buf=await buildXlsx(date);
    const name='DSR_Orders_'+fileStamp(date)+'.xlsx';
    const type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob=new Blob([buf],{type});
    if(share&&navigator.canShare){
      const f=new File([blob],name,{type});
      if(navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:name});return;}catch(e){if(e&&e.name==='AbortError')return;}}
    }
    const r=await saveBlob(blob,name);if(r==='saved')toast('Excel ready: '+name);
  }catch(e){toast(String(e.message||e));}
}

/* ---------- PDF DSR (same layout as the Excel) ---------- */
function buildPdf(date){
  if(!(window.jspdf&&window.jspdf.jsPDF))throw new Error('PDF tool did not load. Check internet and reopen.');
  const doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const rows=dsrRows(date),s=DB.settings;
  const W=297,H=210,mx=10,tw=W-2*mx;
  const wd=[8,46,11,38].concat(BRANDS.map(()=>12));wd.push(tw-wd.reduce((a,b)=>a+b,0));
  const xs=[];let ax=mx;for(const w of wd){xs.push(ax);ax+=w;}
  const NC=wd.length,LAST=NC-1;
  const DARK=[64,64,64],LIGHT=[228,228,228];
  doc.setLineWidth(0.2);doc.setDrawColor(40);
  function box(x,y,w,h,fill){if(fill){doc.setFillColor(fill[0],fill[1],fill[2]);doc.rect(x,y,w,h,'FD');}else doc.rect(x,y,w,h,'S');}
  function put(t,x,y,w,h,o){
    o=o||{};box(x,y,w,h,o.fill);if(t===''||t==null)return;
    const sz=o.sz||7.5;doc.setFont('helvetica',o.b?'bold':'normal');doc.setFontSize(sz);
    const c=o.color||[0,0,0];doc.setTextColor(c[0],c[1],c[2]);
    const lines=doc.splitTextToSize(String(t),Math.max(4,w-2)).slice(0,o.max||2);
    const lh=sz*0.3528*1.15;let ty=y+(h-lines.length*lh)/2+lh*0.8;
    for(const ln of lines){
      if(o.al==='l')doc.text(ln,x+1.2,ty);else doc.text(ln,x+w/2,ty,{align:'center'});
      ty+=lh;
    }
  }
  // header block
  const hb=[['Name: '+(s.name||''),70,'l'],['Date: '+fmtLong(date),50,'l'],['D.S.R.',57,'t'],['Station: '+(s.station||''),50,'l'],['Zone: '+(s.zone||''),tw-70-50-57-50,'l']];
  let hx=mx;
  for(const b of hb){
    if(b[2]==='t')put(b[0],hx,10,b[1],16,{fill:DARK,color:[255,255,255],b:true,sz:18});
    else put(b[0],hx,10,b[1],8,{al:'l',sz:8.5});
    hx+=b[1];
  }
  put('Area / Sales Person: '+(s.area||''),mx,18,70+50,8,{al:'l',sz:8.5});
  put('No.: '+(s.dsrNo||''),mx+70+50+57,18,tw-70-50-57,8,{al:'l',sz:8.5});
  // column headers
  const y0=28,gh=5,bh=9,hh=gh+bh;
  const left=[[0,'#'],[1,'Name shop keepers'],[2,'R/W'],[3,'Address/Phone No.'],[LAST,'Remarks']];
  for(const l of left)put(l[1],xs[l[0]],y0,wd[l[0]],hh,{fill:DARK,color:[255,255,255],b:true,sz:7.5});
  const mIdx=BRANDS.map((b,i)=>b.g==='M'?4+i:-1).filter(i=>i>=0),oIdx=BRANDS.map((b,i)=>b.g==='O'?4+i:-1).filter(i=>i>=0);
  put('MATCH DIVISION',xs[mIdx[0]],y0,wd[mIdx[0]]*mIdx.length,gh,{fill:LIGHT,b:true,sz:7});
  put('OLL CLEAN',xs[oIdx[0]],y0,wd[oIdx[0]]*oIdx.length,gh,{fill:DARK,color:[255,255,255],b:true,sz:7.5});
  BRANDS.forEach((b,i)=>put(b.h.replace('\n',' '),xs[4+i],y0+gh,wd[4+i],bh,{fill:LIGHT,b:true,sz:5.8,max:3}));
  let y=y0+hh;const rh=5.2;const n=Math.max(25,rows.length);
  const sums=BRANDS.map(b=>rows.reduce((t,r)=>t+(Number(r.q[b.id])||0),0));
  for(let i=0;i<n;i++){
    if(y+rh>H-24){doc.addPage();y=10;}
    const r=rows[i];
    put(String(i+1),xs[0],y,wd[0],rh,{b:true,sz:7});
    put(r?r.shop:'',xs[1],y,wd[1],rh,{al:'l',sz:7,max:1});
    put(r?r.rw:'',xs[2],y,wd[2],rh,{sz:7});
    put(r?r.addr:'',xs[3],y,wd[3],rh,{al:'l',sz:7,max:1});
    BRANDS.forEach((b,k)=>{const v=r?Number(r.q[b.id])||0:0;put(v?String(v):'',xs[4+k],y,wd[4+k],rh,{sz:7.5});});
    put(r?r.remarks:'',xs[LAST],y,wd[LAST],rh,{al:'l',sz:6.2,max:1});
    y+=rh;
  }
  if(y+14>H-6){doc.addPage();y=10;}
  put('Sales:',mx,y,wd[0]+wd[1]+wd[2]+wd[3],6,{al:'l',b:true,sz:8,fill:LIGHT});
  BRANDS.forEach((b,k)=>put(sums[k]?String(sums[k]):'',xs[4+k],y,wd[4+k],6,{b:true,sz:8,fill:LIGHT}));
  put('',xs[LAST],y,wd[LAST],6,{fill:LIGHT});y+=6;
  put('Closing:',mx,y,wd[0]+wd[1]+wd[2]+wd[3],6,{al:'l',b:true,sz:8});
  BRANDS.forEach((b,k)=>put('',xs[4+k],y,wd[4+k],6));put('',xs[LAST],y,wd[LAST],6);y+=10;
  doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(90,90,90);
  doc.text('1) Orders taken        2) New shops opened        3) Check stock position yourself        4) Super / departmental stores visited',mx,Math.min(y,H-6));
  return doc;
}
async function downloadPdf(){
  const date=ST.date;
  if(!ordersOn(date).length){toast('No orders on this date');return;}
  try{
    const doc=buildPdf(date);
    const name='DSR_Orders_'+fileStamp(date)+'.pdf';
    const blob=doc.output('blob');
    const r=await saveBlob(blob,name);if(r==='saved')toast('PDF ready: '+name);
  }catch(e){toast(String(e.message||e));}
}

/* ---------- sample data for testing ---------- */
const SAMPLE=[{"n":"Zain Nafees K S","rw":"W.S","a":"Daal Bazaar","q":{"g155":8,"g290":2},"d":true,"v":""},{"n":"Mohsin Hassan K S","rw":"W.S","a":"Daal Bazaar","q":{"g155":10,"g255":10,"g290":10,"ml275":1,"ml475":1},"d":true,"v":""},{"n":"Gulzar Sheikh K S","rw":"R","a":"Daal Bazaar","q":{"sh":1,"g155":1},"d":false,"v":""},{"n":"Abdul Waheed K S","rw":"W.S","a":"Daal Bazaar","q":{"sh":5,"g155":10},"d":true,"v":""},{"n":"Gulshan K S","rw":"R","a":"Daal Bazaar","q":{"g155":2},"d":false,"v":""},{"n":"Haji Yousaf K S","rw":"W.S","a":"Daal Bazaar","q":{"g155":18,"g255":1,"g290":1},"d":true,"v":"2026-10-25"},{"n":"Ahmad K S","rw":"R","a":"Daal Bazaar","q":{"sh":1},"d":false,"v":""},{"n":"Irfan K S","rw":"R","a":"Daal Bazaar","q":{"sh":1},"d":false,"v":""},{"n":"Khurram Shehzad K S","rw":"R","a":"Daal Bazaar","q":{"g155":2},"d":false,"v":""},{"n":"Arif K S (Faizan)","rw":"W.S","a":"Daal Bazaar","q":{"g155":10},"d":true,"v":"2026-11-01"},{"n":"Sheih Arshad K S","rw":"W.S","a":"Daal Bazaar","q":{"sh":5},"d":false,"v":""},{"n":"Abdul Rasheed K S","rw":"R","a":"Daal Bazaar","q":{"g155":2},"d":false,"v":""},{"n":"Sohail K S","rw":"W.S","a":"Daal Bazaar","q":{"g155":10},"d":true,"v":""},{"n":"A D K S","rw":"R","a":"Faisal Bazaar","q":{"g155":1},"d":false,"v":""},{"n":"Maqsood K S","rw":"W.S","a":"Faisal Bazaar","q":{"g155":8,"g255":1,"g290":1},"d":true,"v":""},{"n":"Saif Ullah K S","rw":"R","a":"Faisal Bazaar","q":{"g155":1},"d":false,"v":""},{"n":"Haji Sohail K S","rw":"R","a":"Faisal Bazaar","q":{"g155":2},"d":false,"v":""},{"n":"Sheikh Imran K S","rw":"R","a":"Faisal Bazaar","q":{"g155":1},"d":false,"v":""},{"n":"M Shareef K S","rw":"R","a":"Faisal Bazaar","q":{"g155":1},"d":false,"v":""},{"n":"Khalid K S","rw":"W.S","a":"Vanike Chowk","q":{"g290":10},"d":true,"v":""},{"n":"Shangrilla K S","rw":"R","a":"Vanike Chowk","q":{"g155":1,"g290":1},"d":false,"v":""},{"n":"Nanha K S","rw":"R","a":"Ali Pur Road","q":{"g155":1},"d":false,"v":""}];
function loadSample(){
  const s=DB.settings;
  if(!s.name)s.name='Hammad Asi';if(!s.station)s.station='Sheikhupura';if(!s.zone)s.zone='Sheikhupura';if(!s.area)s.area='Main Market';
  let added=0;
  SAMPLE.forEach((x,i)=>{
    let sh=DB.shops.find(z=>z.name===x.n&&z.address===x.a);
    if(!sh){sh={id:uid(),name:x.n,rw:x.rw==='R'?'R':'W.S',address:x.a};DB.shops.push(sh);}
    if(!DB.orders.some(o=>o.shopId===sh.id&&o.date==='2026-10-19')){
      DB.orders.push({id:uid(),shopId:sh.id,date:'2026-10-19',qty:x.q,disc:!!x.d,delivery:x.v||'',remarks:'',ts:Date.now()+i});added++;
    }
  });
  save();ST.date='2026-10-19';toast(added?('Sample loaded: '+added+' orders (19 Oct 2026)'):'Sample already loaded');render();
}

render();
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0){navigator.serviceWorker.register('sw.js').catch(()=>{});}
