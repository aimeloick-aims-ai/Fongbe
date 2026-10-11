const TONES = ["", "H", "L", "LH", "UNKNOWN"];
const fields = ["utterance_id", "text_original", "audio_url", "duration_s"];
let examples = [], current = 0, toastTimer, f0ById = {}, activeSyllable = -1, activeAudioStop = null;
let csvUrl = "", csvRefreshTimer = null;
const el = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug = value => String(value || "annotateur").trim().replace(/[^\p{L}\p{N}_-]+/gu,"_").slice(0,40) || "annotateur";
const key = () => `fongbe-annotation-v1:${slug(el("annotator").value)}:${examples[current]?.utterance_id || "none"}`;
const splitCsv = text => {
  const rows=[]; let row=[], value="", quoted=false;
  for(let i=0;i<text.length;i++) { const c=text[i];
    if(quoted&&c==='"'&&text[i+1]==='"'){value+='"';i++;}
    else if(c==='"') quoted=!quoted;
    else if(c===','&&!quoted){row.push(value);value="";}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(x=>x!==""))rows.push(row);row=[];value="";}
    else value+=c;
  }
  if(value!==""||row.length){row.push(value);if(row.some(x=>x!==""))rows.push(row);}
  const headers=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,"").trim());
  return rows.map(cols=>Object.fromEntries(headers.map((h,i)=>[h,cols[i]??""])));
};
const csvValue = x => `"${String(x??"").replaceAll('"','""')}"`;
const csvText = rows => { const cols=Object.keys(rows[0]||{});return "\uFEFF"+[cols.join(","),...rows.map(r=>cols.map(c=>csvValue(r[c])).join(","))].join("\r\n"); };
function announce(message){const t=el("toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2400);}
function rowsToExamples(rows){
  const grouped=new Map();
  for(const row of rows){
    const id=(row.utterance_id||row.id||"").trim();if(!id)continue;
    let item=grouped.get(id);
    if(!item){item={utterance_id:id,text_original:row.text_original||row.transcription||row.text||"",audio_url:row.audio_url||row.audio_path||"",duration_s:Number(row.duration_s)||0,source_split:row.source_split||row.split||"",source_url:row.source_url||"",units:[]};grouped.set(id,item);}
    if(!item.text_original)item.text_original=row.text_original||row.transcription||row.text||"";
    if(!item.audio_url)item.audio_url=row.audio_url||row.audio_path||"";
    const unitText=row.syllable_text||row.unit_text||"";
    if(unitText){item.units.push({unit_text:unitText,start_char:Number(row.start_char),end_char:Number(row.end_char),start_s:Number(row.start_s||row.proposed_start_s)||0,end_s:Number(row.end_s||row.proposed_end_s)||0,lexical_tone_candidate:row.lexical_tone_candidate||"",contour_candidate:row.contour_candidate||""});}
  }
  return [...grouped.values()];
}
function state(){try{return JSON.parse(localStorage.getItem(key())||"{}");}catch{return {};}}
function displayText(item){const k=`fongbe-annotation-v1:${slug(el("annotator").value)}:${item.utterance_id}`;try{return JSON.parse(localStorage.getItem(k)||"{}").text_original??item.text_original??"";}catch{return item.text_original??"";}}
function saveState(){const s=state(),item=examples[current];s.annotator_id=slug(el("annotator").value);s.source_split=item?.source_split||s.source_split||"";s.duration_s=item?.duration_s||s.duration_s||"";s.source_url=item?.source_url||s.source_url||"";s.text_original=el("source-transcription")?.value??s.text_original??examples[current]?.text_original??"";s.sentence_translation=el("sentence-translation").value;s.words=readWords();s.syllables=readSyllables();localStorage.setItem(key(),JSON.stringify(s));updateProgress();el("save-status").textContent="Brouillon enregistré sur cet appareil · "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});}
function readWords(){return [...document.querySelectorAll(".word-card")].map(card=>({text:card.querySelector(".word-text").value,start_char:Number(card.dataset.start),end_char:Number(card.dataset.end),translation_fr:card.querySelector(".word-translation").value}));}
function readSyllables(){return [...document.querySelectorAll(".syllable-row")].map(row=>({unit_text:row.querySelector("[data-f=text]").value,start_char:Number(row.dataset.startChar),end_char:Number(row.dataset.endChar),start_s:row.querySelector("[data-f=start]").value,end_s:row.querySelector("[data-f=end]").value,lexical_tone_final:row.querySelector("[data-f=lexical]").value,contour_heard:row.querySelector("[data-f=contour]").value,confidence:row.querySelector("[data-f=confidence]").value}));}
function wordTokens(text){const out=[];const re=/\S+/gu;let m;while((m=re.exec(text)))out.push({text:m[0],start_char:m.index,end_char:m.index+m[0].length});return out;}
function renderWords(item,saved){
  const words=saved.words?.length?saved.words:wordTokens(item.text_original).map(w=>({...w,translation_fr:""}));
  el("word-list").innerHTML=words.map((w,i)=>`<label class="word-card" data-text="${esc(w.text)}" data-start="${w.start_char}" data-end="${w.end_char}"><span class="word-source">MOT ${String(i+1).padStart(2,"0")} · FONGBE</span><input class="word-text" aria-label="Mot Fongbe" value="${esc(w.text)}" placeholder="mot Fongbe"><input class="word-translation" aria-label="Traduction française" value="${esc(w.translation_fr)}" placeholder="sens en français…"></label>`).join("");
  el("word-list").querySelectorAll("input").forEach(input=>input.addEventListener("input",saveState));
}
function renderSyllables(item,saved){
  const rows=saved.syllables?.length?saved.syllables:(item.units||[]).map(u=>({...u,lexical_tone_final:"",contour_heard:"",confidence:""}));
  const options=(value)=>TONES.map(t=>`<option value="${t}" ${value===t?"selected":""}>${t==="UNKNOWN"?"Incertain":t||"Choisir"}</option>`).join("");
  el("syllable-list").innerHTML=`<table class="syllable-table"><thead><tr><th>SYLLABE</th><th>DÉBUT (s)</th><th>FIN (s)</th><th>TON LEXICAL</th><th>TON ENTENDU</th><th>CONFIANCE</th><th>ÉCOUTER</th></tr></thead><tbody>${rows.map((u,i)=>`<tr class="syllable-row" data-text="${esc(u.unit_text)}" data-start-char="${u.start_char??-1}" data-end-char="${u.end_char??-1}"><td><input class="syl-time syl-word" data-f="text" value="${esc(u.unit_text)}" aria-label="Texte de la syllabe"></td><td><input class="syl-time" data-f="start" type="number" step="0.01" min="0" max="${item.duration_s||999}" value="${esc(u.start_s)}" aria-label="Début en secondes"></td><td><input class="syl-time" data-f="end" type="number" step="0.01" min="0" max="${item.duration_s||999}" value="${esc(u.end_s)}" aria-label="Fin en secondes"></td><td><select class="syl-select" data-f="lexical" aria-label="Ton lexical">${options(u.lexical_tone_final)}</select></td><td><select class="syl-select" data-f="contour" aria-label="Ton entendu">${options(u.contour_heard)}</select></td><td><select class="syl-select" data-f="confidence"><option value="">—</option>${["faible","moyenne","forte"].map(x=>`<option ${u.confidence===x?"selected":""}>${x}</option>`).join("")}</select></td><td><button class="play-syl" type="button" title="Écouter exactement cette syllabe" data-play="${i}">▶</button></td></tr>`).join("")}</tbody></table>`;
  el("syllable-list").querySelectorAll("input,select").forEach(control=>control.addEventListener("input",()=>{saveState();drawF0();}));
  el("syllable-list").querySelectorAll("[data-play]").forEach(button=>button.addEventListener("click",()=>playUnit(Number(button.dataset.play))));
}
function drawF0(){
  const canvas=el("f0-chart"),item=examples[current];if(!canvas||!item)return;
  const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(320,rect.width),h=240;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const left=48,right=w-14,top=17,bottom=h-34,duration=Number(item.duration_s)||1,contour=f0ById[item.utterance_id];
  ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);
  const values=(contour?.f0_hz||[]).filter(Number.isFinite),min=Math.max(40,Math.floor((Math.min(...values,80)-10)/20)*20),max=Math.ceil((Math.max(...values,240)+10)/20)*20;
  const x=t=>left+(right-left)*Math.max(0,Math.min(duration,t))/duration,y=v=>bottom-(bottom-top)*(v-min)/(max-min||1);
  const units=readSyllables();units.forEach((u,i)=>{const a=Number(u.start_s),b=Number(u.end_s);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return;ctx.fillStyle=i===activeSyllable?"rgba(205,117,80,.18)":"rgba(36,93,73,.07)";ctx.fillRect(x(a),top,Math.max(1,x(b)-x(a)),bottom-top);ctx.strokeStyle=i===activeSyllable?"#cd7550":"#91aa98";ctx.lineWidth=i===activeSyllable?2:1;ctx.beginPath();ctx.moveTo(x(a),top);ctx.lineTo(x(a),bottom);ctx.moveTo(x(b),top);ctx.lineTo(x(b),bottom);ctx.stroke();});
  ctx.font="10px 'DM Mono',monospace";ctx.fillStyle="#77837a";ctx.strokeStyle="#e8ebe5";ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const val=min+(max-min)*i/4,yy=y(val);ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();ctx.textAlign="right";ctx.fillText(`${Math.round(val)}`,left-8,yy+3);}
  for(let i=0;i<=4;i++){const t=duration*i/4,xx=x(t);ctx.textAlign="center";ctx.fillText(`${t.toFixed(2)} s`,xx,bottom+18);}
  ctx.strokeStyle="#75837a";ctx.lineWidth=1.2;ctx.beginPath();let open=false;const times=contour?.time_s||[],f0=contour?.f0_hz||[];
  for(let i=0;i<Math.min(times.length,f0.length);i++){if(!Number.isFinite(f0[i])){open=false;continue;}const xx=x(times[i]),yy=y(f0[i]);if(!open){ctx.moveTo(xx,yy);open=true;}else ctx.lineTo(xx,yy);}ctx.stroke();
  if(contour){ctx.fillStyle="#245d49";ctx.lineWidth=1.5;for(let i=0;i<Math.min(times.length,f0.length);i++){if(Number.isFinite(f0[i])){ctx.beginPath();ctx.arc(x(times[i]),y(f0[i]),1.7,0,Math.PI*2);ctx.fill();}}el("f0-status").textContent=`${contour.method} · ${values.length} trames voisées`;}else el("f0-status").textContent="Courbe F0 indisponible pour cet extrait.";
  const now=el("audio-player").currentTime;if(el("audio-player").src&&now>0){ctx.strokeStyle="#cd7550";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x(now),top);ctx.lineTo(x(now),bottom);ctx.stroke();}
  canvas.onclick=event=>{const box=canvas.getBoundingClientRect(),t=(event.clientX-box.left-left)/(right-left)*duration,idx=units.findIndex(u=>t>=Number(u.start_s)&&t<=Number(u.end_s));if(idx>=0)playUnit(idx);else{const audio=el("audio-player");audio.currentTime=Math.max(0,Math.min(duration,t));audio.play().catch(()=>{});}};
}
function playUnit(index){const item=examples[current],u=readSyllables()[index];if(!item||!u)return;const audio=el("audio-player"),start=Number(u.start_s),end=Math.min(Number(item.duration_s)||Infinity,Number(u.end_s));if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start){announce("V\u00e9rifiez les limites temporelles de cette syllabe.");return;}if(activeAudioStop){audio.removeEventListener("timeupdate",activeAudioStop);activeAudioStop=null;}activeSyllable=index;drawF0();audio.pause();audio.currentTime=start;audio.playbackRate=.75;const stop=()=>{if(audio.currentTime>=end-.015){audio.removeEventListener("timeupdate",stop);activeAudioStop=null;audio.pause();drawF0();}};activeAudioStop=stop;audio.addEventListener("timeupdate",stop);audio.play().catch(()=>announce("Impossible de lire cet audio. R\u00e9essayez apr\u00e8s le chargement."));}
function render(){
  const has=examples.length>0;el("annotation-content").hidden=!has;el("empty-state").hidden=has;el("example-count").textContent=`${examples.length} extrait${examples.length===1?"":"s"} dans ce lot`;
  const navItems=examples;el("example-nav").innerHTML=navItems.map((item,i)=>`<button class="nav-item ${i===current?"active":""}" data-i="${i}"><span class="nav-num">${String(i+1).padStart(2,"0")}</span><span class="nav-copy"><b>${esc(displayText(item)||"Transcription \u00e0 ajouter")}</b><small>${item.duration_s?`${Number(item.duration_s).toFixed(2)} s · `:""}${item.units?.length||0} syllabe${item.units?.length===1?"":"s"}</small></span><span class="nav-done" hidden>✓</span></button>`;}).join("");
  el("example-nav").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{saveState();current=Number(b.dataset.i);render();}));updateProgress();if(!has)return;
  current=Math.min(current,examples.length-1);const item=examples[current],s=state();el("item-kicker").textContent=`EXTRAIT ${String(current+1).padStart(2,"0")} / ${String(examples.length).padStart(2,"0")}`;el("item-title").textContent=item.text_original||"Écoutez cet extrait";el("duration-label").textContent=item.duration_s?`${Number(item.duration_s).toFixed(2)} secondes`:"";
  const audio=el("audio-player");if(activeAudioStop){audio.removeEventListener("timeupdate",activeAudioStop);activeAudioStop=null;}audio.pause();audio.src=item.audio_url||"";audio.load();audio.onloadedmetadata=()=>{if(Number.isFinite(audio.duration)){item.duration_s=audio.duration;el("duration-label").textContent=`${audio.duration.toFixed(2)} secondes`;drawF0();}};audio.playbackRate=1;activeSyllable=-1;audio.ontimeupdate=drawF0;audio.onpause=()=>{if(activeAudioStop){audio.removeEventListener("timeupdate",activeAudioStop);activeAudioStop=null;}};audio.onerror=()=>announce("Audio local indisponible. Rechargez la page ou choisissez un autre extrait.");el("source-transcription").value=s.text_original??item.text_original??"";el("source-transcription").oninput=()=>{item.text_original=el("source-transcription").value;el("item-title").textContent=item.text_original||"\u00c9coutez cet extrait";const active=el("example-nav").querySelectorAll(".nav-item")[current];if(active)active.querySelector(".nav-copy b").textContent=item.text_original||"Transcription \u00e0 ajouter";saveState();};el("sentence-translation").value=s.sentence_translation||"";el("sentence-translation").oninput=saveState;renderWords(item,s);renderSyllables(item,s);drawF0();
  el("source-note").textContent=`ID : ${item.utterance_id} · Source : ${item.source_split||"non précisée"}${item.source_url?` · ${item.source_url}`:""}. Les suggestions sont des points de départ et les champs saisis ici constituent votre propre annotation.`;
  el("previous-item").disabled=current===0;el("next-item").disabled=current===examples.length-1;
}
function updateProgress(){if(!examples.length)return;const who=slug(el("annotator").value),loaded=examples;const done=loaded.filter(item=>{const k=`fongbe-annotation-v1:${who}:${item.utterance_id}`;try{const s=JSON.parse(localStorage.getItem(k)||"{}");return Boolean(s.sentence_translation||s.words?.some(w=>w.translation_fr)||s.syllables?.some(u=>u.lexical_tone_final||u.contour_heard));}catch{return false;}}).length;el("progress-label").textContent=`${done} / ${loaded.length} dans ce lot`;el("progress-bar").style.width=`${done/loaded.length*100}%`;document.querySelectorAll(".nav-item").forEach(b=>{const item=examples[Number(b.dataset.i)];if(!item)return;const k=`fongbe-annotation-v1:${who}:${item.utterance_id}`;try{const s=JSON.parse(localStorage.getItem(k)||"{}");b.querySelector(".nav-done").hidden=!(s.sentence_translation||s.words?.some(w=>w.translation_fr)||s.syllables?.some(u=>u.lexical_tone_final||u.contour_heard));}catch{}});}
function buildExportRows(){
  const who=slug(el("annotator").value),prefix=`fongbe-annotation-v1:${who}:`,out=[];
  const stored=[];for(let i=0;i<localStorage.length;i++){const storageKey=localStorage.key(i);if(storageKey?.startsWith(prefix)){try{stored.push([storageKey.slice(prefix.length),JSON.parse(localStorage.getItem(storageKey)||"{}")]);}catch{}}}
  for(const [id,s] of stored){
    const item=examples.find(x=>x.utterance_id===id)||{};
    const text=s.text_original||item.text_original||"";
    const hasWork=Boolean(s.sentence_translation||s.words?.some(w=>w.translation_fr)||s.syllables?.some(u=>u.lexical_tone_final||u.contour_heard||u.start_s!==""||u.end_s!==""));if(!hasWork)continue;
    const common={utterance_id:id,annotator_id:who,source_split:s.source_split||item.source_split||"",text_original:text,duration_s:s.duration_s||item.duration_s||"",source_url:s.source_url||item.source_url||"",utterance_translation_fr:s.sentence_translation||"",confidence:"",notes:""};
    out.push({...common,row_type:"phrase",unit_id:id,unit_text:text,start_char:0,end_char:text.length,start_s:"",end_s:"",word_translation_fr:"",lexical_tone_final:"",contour_heard:""});
    for(const [j,w] of (s.words||[]).entries())out.push({...common,row_type:"mot",unit_id:`${id}:word:${j+1}`,unit_text:w.text,start_char:w.start_char,end_char:w.end_char,start_s:"",end_s:"",word_translation_fr:w.translation_fr||"",lexical_tone_final:"",contour_heard:""});
    for(const [j,u] of (s.syllables||[]).entries())out.push({...common,row_type:"syllabe",unit_id:`${id}:syllable:${j+1}`,unit_text:u.unit_text,start_char:u.start_char,end_char:u.end_char,start_s:u.start_s,end_s:u.end_s,word_translation_fr:"",lexical_tone_final:u.lexical_tone_final,contour_heard:u.contour_heard,confidence:u.confidence||""});
  }
  return out;
}
function refreshCsvDownload(){const link=el("export-all"),rows=buildExportRows();if(!link)return;if(csvUrl)URL.revokeObjectURL(csvUrl);if(!rows.length){csvUrl="";link.href="#";link.removeAttribute("download");link.setAttribute("aria-disabled","true");return;}link.removeAttribute("aria-disabled");csvUrl=URL.createObjectURL(new Blob([csvText(rows)],{type:"text/csv;charset=utf-8"}));link.href=csvUrl;link.download=`annotations_fongbe_${slug(el("annotator").value)}.csv`;}
async function loadInitial(){
  const [a,b,c]=await Promise.all([fetch("data/examples.csv"),fetch("data/syllables.csv"),fetch("data/f0_contours.json")]);
  if(!a.ok||!b.ok||!c.ok)throw new Error("Les fichiers du lot local de 8 extraits ne sont pas accessibles.");
  const items=splitCsv(await a.text()),units=splitCsv(await b.text());f0ById=await c.json();const byId=new Map();
  for(const u of units){const id=u.utterance_id;if(!byId.has(id))byId.set(id,[]);byId.get(id).push({unit_text:u.syllable_text,start_char:Number(u.start_char),end_char:Number(u.end_char),start_s:Number(u.start_s),end_s:Number(u.end_s),boundary_source:u.boundary_source,lexical_tone_candidate:u.lexical_tone_candidate,contour_candidate:u.contour_candidate});}
  examples=items.map(x=>({...x,duration_s:Number(x.duration_s)||0,units:byId.get(x.utterance_id)||[]}));
  el("dataset-status").textContent="8 extraits et leurs courbes F0 sont stock\u00e9s avec le site ; aucune connexion \u00e0 Hugging Face n\u2019est n\u00e9cessaire.";
  render();
}
el("annotator").value=localStorage.getItem("fongbe-annotator-id")||"";el("annotator").addEventListener("input",()=>{localStorage.setItem("fongbe-annotator-id",el("annotator").value);render();refreshCsvDownload();});
window.addEventListener("resize",()=>drawF0());
el("previous-item").addEventListener("click",()=>{saveState();current=Math.max(0,current-1);render();});el("next-item").addEventListener("click",()=>{saveState();current=Math.min(examples.length-1,current+1);render();});
el("add-word").addEventListener("click",()=>{const currentWords=readWords();currentWords.push({text:"",start_char:-1,end_char:-1,translation_fr:""});const s=state();s.words=currentWords;localStorage.setItem(key(),JSON.stringify(s));render();});
el("add-syllable").addEventListener("click",()=>{const ss=readSyllables();ss.push({unit_text:"",start_char:-1,end_char:-1,start_s:"",end_s:"",lexical_tone_final:"",contour_heard:"",confidence:""});const s=state();s.syllables=ss;localStorage.setItem(key(),JSON.stringify(s));render();});
el("export-all").addEventListener("click",()=>{saveState();refreshCsvDownload();});document.addEventListener("input",event=>{if(event.target.closest(".translation-section")){clearTimeout(csvRefreshTimer);csvRefreshTimer=setTimeout(refreshCsvDownload,400);}});document.addEventListener("change",event=>{if(event.target.closest(".translation-section")){clearTimeout(csvRefreshTimer);csvRefreshTimer=setTimeout(refreshCsvDownload,400);}});
loadInitial().then(refreshCsvDownload).catch(error=>{el("dataset-status").textContent=error.message;el("empty-state").hidden=false;el("empty-state").querySelector("p").textContent="V\u00e9rifiez que le site est ouvert depuis son adresse web ou depuis un serveur local.";});

