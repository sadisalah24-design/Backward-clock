const DEFAULT={wallpaper:null,camera:false,slots:["spotify","date2","prayer"],startTime:null,sens:28};
const LABELS={spotify:"Spotify / Müzik",weather:"Hava durumu",prayer:"Ezan vakti",date2:"Tarih",battery:"Pil",custom:"Özel"};
let state=loadState(), rewinding=false, cameraStream=null, sampleTimer=null, previousFrame=null, lastMotion=0, targetStartMs=null, animationId=0;
const $=id=>document.getElementById(id);

function loadState(){try{const s=JSON.parse(localStorage.getItem("backward-clock-v6"));if(s)return {...DEFAULT,...s,slots:Array.isArray(s.slots)&&s.slots.length===3?s.slots:DEFAULT.slots};}catch(e){}return structuredClone(DEFAULT)}
function saveState(){localStorage.setItem("backward-clock-v6",JSON.stringify(state))}
function pad(n){return String(n).padStart(2,"0")}
function formatTime(d){return d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit",hour12:false})}
function formatDate(d){return d.toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"})}
function timeInputValue(d){return pad(d.getHours())+":"+pad(d.getMinutes())}
function chosenStartMs(){
  const v=$("startTime").value; const n=new Date();
  if(!v)return n.getTime()+5*60000;
  const [h,m]=v.split(":").map(Number); const t=new Date(n); t.setHours(h,m,0,0);
  // If selected time is behind the current time, interpret it as tomorrow.
  if(t.getTime()<=Date.now()+500)t.setDate(t.getDate()+1);
  return t.getTime();
}

function tick(){
  if(!rewinding)$("clock").textContent=formatTime(new Date());
  $("date").textContent=formatDate(new Date());
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
function render(){const box=$("widgets");box.innerHTML="";state.slots.slice(0,3).forEach((type,i)=>{const el=document.createElement("div");el.className="widget "+type;el.dataset.slot=i;el.innerHTML=widgetMarkup(type);box.appendChild(el)});renderSlots()}
function renderSlots(){const box=$("slotList");if(!box)return;box.innerHTML="";state.slots.forEach((type,i)=>{const row=document.createElement("div");row.className="slot";const opts=Object.entries(LABELS).map(([v,n])=>`<option value="${v}" ${v===type?"selected":""}>${n}</option>`).join("");row.innerHTML=`<strong>Slot ${i+1}</strong><select data-slot="${i}">${opts}</select><span>${i===0?"Sol":i===1?"Orta":"Sağ"}</span>`;box.appendChild(row)})}
function openSettings(){$("settings").classList.add("open");$("settings").setAttribute("aria-hidden","false");$("cameraToggle").checked=state.camera;renderSlots()}
function closeSettings(){$("settings").classList.remove("open");$("settings").setAttribute("aria-hidden","true")}
$("settingsButton").onclick=openSettings;$("closeSettings").onclick=closeSettings;
$("slotList").onchange=e=>{const s=Number(e.target.dataset.slot);if(Number.isInteger(s)){state.slots[s]=e.target.value;saveState();render()}};
$("cameraToggle").onchange=e=>{state.camera=e.target.checked;saveState();if(state.camera)startCamera();else stopCamera()};
$("saveButton").onclick=()=>{saveState();closeSettings()};
$("resetButton").onclick=()=>{state=structuredClone(DEFAULT);saveState();render();openSettings();initSetup()};

function saveWallpaper(file){const reader=new FileReader();reader.onload=()=>{state.wallpaper=reader.result;saveState();applyWallpaper();$("wallName").textContent=file.name};reader.readAsDataURL(file)}
$("wallpaperInput").onchange=e=>{if(e.target.files?.[0])saveWallpaper(e.target.files[0])};
$("wallInput").onchange=e=>{if(e.target.files?.[0])saveWallpaper(e.target.files[0])};
function applyWallpaper(){$("wallpaper").style.backgroundImage=state.wallpaper?`url("${state.wallpaper}")`:`linear-gradient(135deg,#070707,#1b1b1b)`}
function flashHint(){
  $("gestureHint").classList.add("show");setTimeout(()=>$("gestureHint").classList.remove("show"),1500)
}
function setSetupVisible(visible){$("setup").classList.toggle("hidden",!visible);$("setup").setAttribute("aria-hidden",String(!visible))}

function trigger(){
  if(rewinding)return;
  const real=Date.now();
  // Always start from the exact time chosen on the V2-style setup screen.
  const from=(targetStartMs&&targetStartMs>real)?targetStartMs:chosenStartMs();
  if(from<=real)return;
  rewinding=true;cancelAnimationFrame(animationId);
  const duration=Math.max(1500,Math.min(5200,1200+(from-real)/7));const t0=performance.now();
  function frame(t){
    const p=Math.min(1,(t-t0)/duration);const e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    const ms=from+(real-from)*e;$("clock").textContent=formatTime(new Date(ms));
    if(p<1)animationId=requestAnimationFrame(frame);else{rewinding=false;$("clock").textContent=formatTime(new Date());}
  }
  animationId=requestAnimationFrame(frame)
}

$("app").addEventListener("pointerdown",e=>{
  if($("setup").classList.contains("hidden")===false)return;
  if($("settings").classList.contains("open"))return;
  if(e.target.closest(".settings-button,.bottom-action"))return;
  trigger();
});

async function startCamera(){
  if(cameraStream||!navigator.mediaDevices?.getUserMedia){flashHint();return false}
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});
    const v=$("cameraFeed");v.srcObject=cameraStream;await v.play();
    const c=document.createElement("canvas");c.width=96;c.height=72;const ctx=c.getContext("2d",{willReadFrequently:true});
    sampleTimer=setInterval(()=>{
      if(!cameraStream||!v.videoWidth)return;
      ctx.drawImage(v,0,0,96,72);const d=ctx.getImageData(0,0,96,72).data;
      if(!previousFrame){previousFrame=new Uint8ClampedArray(d);return}
      let diff=0,count=0;for(let i=0;i<d.length;i+=16){diff+=Math.abs(d[i]-previousFrame[i])+Math.abs(d[i+1]-previousFrame[i+1])+Math.abs(d[i+2]-previousFrame[i+2]);count+=3}
      previousFrame=new Uint8ClampedArray(d);const avg=diff/count;
      if(avg>Number(state.sens||28)&&Date.now()-lastMotion>2200){lastMotion=Date.now();trigger()}
    },120);
    return true;
  }catch(e){state.camera=false;saveState();$("cameraToggle").checked=false;flashHint();return false}
}
function stopCamera(){if(sampleTimer)clearInterval(sampleTimer);sampleTimer=null;previousFrame=null;if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}}
$("cameraButton").onclick=()=>state.camera?startCamera():openSettings();
$("flashlight").onclick=flashHint;

function initSetup(){
  const now=new Date();let defaultMs=state.startTime?parseInt(state.startTime,10):Date.now()+5*60000;
  if(defaultMs<=Date.now())defaultMs=Date.now()+5*60000;
  const d=new Date(defaultMs);$("startTime").value=timeInputValue(d);$("sens").value=state.sens||28;$("sensValue").textContent=$("sens").value;
  $("wallName").textContent=state.wallpaper?"Kayıtlı duvar kâğıdı kullanılacak":"Henüz duvar kâğıdı seçilmedi";
}
$("sens").oninput=e=>{$("sensValue").textContent=e.target.value;state.sens=Number(e.target.value);saveState()};
$("cameraPrepare").onclick=async()=>{state.camera=true;saveState();const ok=await startCamera();if(ok)flashHint()};
$("start").onclick=async()=>{
  targetStartMs=chosenStartMs();state.startTime=String(targetStartMs);state.sens=Number($("sens").value);saveState();
  $("clock").textContent=formatTime(new Date(targetStartMs));
  setSetupVisible(false);
  if(!cameraStream){state.camera=true;saveState();await startCamera()}
  flashHint();
};
$("openSettings").onclick=()=>{setSetupVisible(false);openSettings()};

async function initBattery(){try{const b=await navigator.getBattery();const update=()=>{$("batteryStatus").textContent=Math.round(b.level*100)+"%"};update();b.addEventListener("levelchange",update)}catch{}}
applyWallpaper();render();tick();initSetup();initBattery();
if(state.camera&&state.startTime&&Number(state.startTime)>Date.now())setTimeout(startCamera,700);
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js?v=6").catch(()=>{});
