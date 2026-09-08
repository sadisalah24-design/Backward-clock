const DEFAULT={
 wallpaper:null,camera:false,
 slots:["spotify","date2","prayer"]
};
const LABELS={spotify:"Spotify / Müzik",weather:"Hava durumu",prayer:"Ezan vakti",date2:"Tarih",battery:"Pil",custom:"Özel"};
let state=loadState(), rewinding=false, cameraStream=null, sampleTimer=null, previousFrame=null, lastMotion=0, showStartMs=null;

function loadState(){
  try{const s=JSON.parse(localStorage.getItem("backward-clock-v4"));if(s)return {...DEFAULT,...s,slots:Array.isArray(s.slots)&&s.slots.length===3?s.slots:DEFAULT.slots};}catch(e){}
  return structuredClone(DEFAULT);
}
function saveState(){localStorage.setItem("backward-clock-v4",JSON.stringify(state))}
const $=id=>document.getElementById(id);

function formatTime(d){return d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit",hour12:false})}
function formatDate(d){return d.toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"})}

function tick(){
  if(!rewinding) $("clock").textContent=formatTime(new Date());
  $("date").textContent=formatDate(new Date());
  $("batteryStatus").textContent=(navigator.getBattery? "": "45%");
}
setInterval(tick,1000);

function widgetMarkup(type){
  const now=new Date();
  if(type==="spotify")return `<div class="icon">♫</div><div class="label">Müzik</div>`;
  if(type==="weather")return `<div class="value">29°</div><div class="label">Hava</div>`;
  if(type==="prayer")return `<div class="value">16:55</div><div class="label">Asr</div>`;
  if(type==="date2")return `<div class="value">${now.getDate()}</div><div class="label">${now.toLocaleDateString("tr-TR",{month:"long"})}</div>`;
  if(type==="battery")return `<div class="value">45%</div><div class="label">Pil</div>`;
  return `<div class="value">—</div><div class="label">Özel</div>`;
}

function render(){
  const box=$("widgets");box.innerHTML="";
  state.slots.forEach((type,i)=>{
    const el=document.createElement("div");el.className="widget "+type;el.dataset.slot=i;el.dataset.type=type;
    el.innerHTML=widgetMarkup(type);box.appendChild(el);
  });
  renderSlots();
}

function renderSlots(){
  const box=$("slotList");box.innerHTML="";
  state.slots.forEach((type,i)=>{
    const row=document.createElement("div");row.className="slot";
    const opts=Object.entries(LABELS).map(([v,n])=>`<option value="${v}" ${v===type?"selected":""}>${n}</option>`).join("");
    row.innerHTML=`<strong>Slot ${i+1}</strong><select data-slot="${i}">${opts}</select><span>${i===0?"Sol":i===1?"Orta":"Sağ"}</span>`;
    box.appendChild(row);
  });
}

function openSettings(){
  $("settings").classList.add("open");$("settings").setAttribute("aria-hidden","false");
  $("cameraToggle").checked=state.camera;renderSlots();
}
function closeSettings(){
  $("settings").classList.remove("open");$("settings").setAttribute("aria-hidden","true");
}
$("settingsButton").onclick=openSettings;
$("closeSettings").onclick=closeSettings;
$("slotList").onchange=e=>{
  const s=Number(e.target.dataset.slot);
  if(Number.isInteger(s))state.slots[s]=e.target.value;
  if(new Set(state.slots).size<3){ /* duplicates allowed but corrected on save */ }
  render();
};
$("cameraToggle").onchange=e=>{
  state.camera=e.target.checked;saveState();
  if(state.camera)startCamera(); else stopCamera();
};
$("saveButton").onclick=()=>{saveState();closeSettings();};
$("resetButton").onclick=()=>{
  state=structuredClone(DEFAULT);saveState();render();openSettings();
};

async function saveWallpaper(file){
  const reader=new FileReader();
  reader.onload=()=>{state.wallpaper=reader.result;saveState();applyWallpaper();};
  reader.readAsDataURL(file);
}
$("wallpaperInput").onchange=e=>{if(e.target.files?.[0])saveWallpaper(e.target.files[0])};
function applyWallpaper(){
  $("wallpaper").style.backgroundImage=state.wallpaper?`url("${state.wallpaper}")`:"linear-gradient(135deg,#070707,#1b1b1b)";
}
function flashHint(){
  $("gestureHint").classList.add("show");
  setTimeout(()=>$("gestureHint").classList.remove("show"),1400);
}

function defaultStartTime(){
  const d=new Date(Date.now()+5*60000);
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function setupStartTime(){
  const el=$("startTime");
  if(!el)return;
  const now=new Date();
  const d=showStartMs?new Date(showStartMs):new Date(now.getTime()+5*60000);
  el.value=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function hideSetup(){
  const el=$("setup");if(el)el.classList.add('hidden');
}
function showSetup(){
  const el=$("setup");if(el)el.classList.remove('hidden');
  setupStartTime();
}
function applySetupWallpaper(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{state.wallpaper=reader.result;saveState();applyWallpaper();const n=$("wallpaperName");if(n)n.textContent=file.name;};
  reader.readAsDataURL(file);
}
function selectedStartMs(){
  const val=$("startTime")?.value;
  if(!val)return Date.now()+5*60000;
  const [h,m]=val.split(':').map(Number);
  const now=new Date(), d=new Date(now); d.setHours(h,m,0,0);
  if(d.getTime()<=now.getTime())d.setDate(d.getDate()+1);
  return d.getTime();
}

function backwardShow(){
  if(rewinding)return;
  rewinding=true;
  const real=Date.now(), target=showStartMs||real+35000, start=performance.now();
  const amount=Math.max(1000,target-real), duration=Math.max(1700,Math.min(4200,1300+amount/8));
  const id=setInterval(()=>{
    const p=Math.min(1,(performance.now()-start)/duration),ease=1-Math.pow(1-p,3);
    $("clock").textContent=formatTime(new Date(target-amount*ease));
    if(p>=1){clearInterval(id);rewinding=false;$("clock").textContent=formatTime(new Date());}
  },30);
}
$("app").addEventListener("pointerdown",e=>{
  if($("settings").classList.contains("open"))return;
  if(e.target.closest(".settings-button,.bottom-action"))return;
  backwardShow();
});

async function startCamera(){
  if(cameraStream||!navigator.mediaDevices?.getUserMedia){flashHint();return;}
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:320,height:240},audio:false});
    const v=$("cameraFeed");v.srcObject=cameraStream;await v.play();
    const c=document.createElement("canvas");c.width=64;c.height=48;
    const ctx=c.getContext("2d",{willReadFrequently:true});
    sampleTimer=setInterval(()=>{
      if(!cameraStream||!v.videoWidth)return;
      ctx.drawImage(v,0,0,64,48);
      const d=ctx.getImageData(0,0,64,48).data;
      if(!previousFrame){previousFrame=d;return}
      let diff=0;for(let i=0;i<d.length;i+=20)diff+=Math.abs(d[i]-previousFrame[i]);
      previousFrame=d;
      if(diff>7000 && Date.now()-lastMotion>2500){lastMotion=Date.now();backwardShow();}
    },220);
  }catch(e){state.camera=false;saveState();$("cameraToggle").checked=false;flashHint();}
}
function stopCamera(){
  if(sampleTimer)clearInterval(sampleTimer);sampleTimer=null;previousFrame=null;
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
}
$("cameraButton").onclick=()=>state.camera?startCamera():openSettings();
$("flashlight").onclick=flashHint;

async function initBattery(){
  try{const b=await navigator.getBattery();const update=()=>{$("batteryStatus").textContent=Math.round(b.level*100)+"%"};update();b.addEventListener("levelchange",update)}catch{}
}
applyWallpaper();render();tick();initBattery();
setupStartTime();
if(state.wallpaper){const n=$("wallpaperName");if(n)n.textContent="Kayıtlı duvar kâğıdı";}
$("wallpaperSetupInput").onchange=e=>applySetupWallpaper(e.target.files?.[0]);
$("cameraPrepare").onclick=async()=>{state.camera=true;saveState();await startCamera();};
$("start").onclick=async()=>{
  showStartMs=selectedStartMs();
  if(showStartMs<=Date.now())showStartMs=Date.now()+5000;
  hideSetup();
  if(state.camera&&!cameraStream)await startCamera();
  flashHint();
};
$("openSettingsFromSetup").onclick=openSettings;
if(state.camera)setTimeout(startCamera,700);
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js?v=6").catch(()=>{});
