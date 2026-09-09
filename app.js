const DEFAULT={
 wallpaper:null,camera:false,
 slots:["spotify","date2","prayer"]
};
const LABELS={spotify:"Spotify / Müzik",weather:"Hava durumu",prayer:"Ezan vakti",date2:"Tarih",battery:"Pil",custom:"Özel"};
let state=loadState(), rewinding=false, cameraStream=null, sampleTimer=null, previousFrame=null, lastMotion=0;

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

function backwardShow(){
  if(rewinding)return;
  rewinding=true;
  const real=Date.now(),start=performance.now(),duration=1700,amount=35000;
  const id=setInterval(()=>{
    const p=Math.min(1,(performance.now()-start)/duration),ease=1-Math.pow(1-p,3);
    $("clock").textContent=formatTime(new Date(real-amount*(1-ease)));
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
if(state.camera)setTimeout(startCamera,700);
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js?v=4").catch(()=>{});
