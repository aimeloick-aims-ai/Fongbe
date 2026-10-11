const TONES = ["", "H", "L", "M", "LH", "HL", "HM", "ML", "UNKNOWN"];
const fields = ["utterance_id", "text_original", "audio_url", "duration_s"];
let examples = [], current = 0, toastTimer;
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
function saveState(){const s=state();s.annotator_id=slug(el("annotator").value);s.sentence_translation=el("sentence-translation").value;s.words=readWords();s.syllables=readSyllables();localStorage.setItem(key(),JSON.stringify(s));updateProgress();el("save-status").textContent="Brouillon enregistré sur cet appareil · "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});}
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
  const options=(value)=>TONES.map(t=>`<option value="${t}" ${value===t?"selected":""}>${t||"Choisir"}</option>`).join("");
  el("syllable-list").innerHTML=`<table class="syllable-table"><thead><tr><th>SYLLABE</th><th>DÉBUT (s)</th><th>FIN (s)</th><th>TON LEXICAL</th><th>CONTOUR ENTENDU</th><th>CONFIANCE</th><th>ÉCOUTER</th></tr></thead><tbody>${rows.map((u,i)=>`<tr class="syllable-row" data-text="${esc(u.unit_text)}" data-start-char="${u.start_char??-1}" data-end-char="${u.end_char??-1}"><td><input class="syl-time syl-word" data-f="text" value="${esc(u.unit_text)}" aria-label="Texte de la syllabe"></td><td><input class="syl-time" data-f="start" type="number" step="0.01" min="0" max="${item.duration_s||999}" value="${esc(u.start_s)}" aria-label="Début en secondes"></td><td><input class="syl-time" data-f="end" type="number" step="0.01" min="0" max="${item.duration_s||999}" value="${esc(u.end_s)}" aria-label="Fin en secondes"></td><td><select class="syl-select" data-f="lexical" aria-label="Ton lexical">${options(u.lexical_tone_final)}</select></td><td><select class="syl-select" data-f="contour" aria-label="Contour entendu">${options(u.contour_heard)}</select></td><td><select class="syl-select" data-f="confidence"><option value="">—</option>${["faible","moyenne","forte"].map(x=>`<option ${u.confidence===x?"selected":""}>${x}</option>`).join("")}</select></td><td><button class="play-syl" type="button" title="Écouter avec un peu de contexte" data-play="${i}">▶</button></td></tr>`).join("")}</tbody></table>`;
  el("syllable-list").querySelectorAll("input,select").forEach(control=>control.addEventListener("input",saveState));
  el("syllable-list").querySelectorAll("[data-play]").forEach(button=>button.addEventListener("click",()=>playUnit(Number(button.dataset.play))));
}
function playUnit(index){const item=examples[current],u=readSyllables()[index];if(!item||!u)return;const audio=el("audio-player");const margin=.15,start=Math.max(0,Number(u.start_s)-margin),end=Math.min(Number(item.duration_s)||Infinity,Number(u.end_s)+margin);audio.currentTime=start;audio.playbackRate=.82;audio.play();const stop=()=>{if(audio.currentTime>=end){audio.pause();audio.removeEventListener("timeupdate",stop);}};audio.addEventListener("timeupdate",stop);}
function render(){
  const has=examples.length>0;el("annotation-content").hidden=!has;el("empty-state").hidden=has;el("example-count").textContent=`${examples.length} extrait${examples.length===1?"":"s"} dans ce lot`;
  el("example-nav").innerHTML=examples.map((item,i)=>`<button class="nav-item ${i===current?"active":""}" data-i="${i}"><span class="nav-num">${String(i+1).padStart(2,"0")}</span><span class="nav-copy"><b>${esc(item.text_original||"Transcription à ajouter")}</b><small>${item.duration_s?`${Number(item.duration_s).toFixed(2)} s · `:""}${item.units?.length||0} syllabe${item.units?.length===1?"":"s"}</small></span><span class="nav-done" hidden>✓</span></button>`).join("");
  el("example-nav").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{saveState();current=Number(b.dataset.i);render();}));updateProgress();if(!has)return;
  current=Math.min(current,examples.length-1);const item=examples[current],s=state();el("item-kicker").textContent=`EXTRAIT ${String(current+1).padStart(2,"0")} / ${String(examples.length).padStart(2,"0")}`;el("item-title").textContent=item.text_original||"Écoutez cet extrait";el("duration-label").textContent=item.duration_s?`${Number(item.duration_s).toFixed(2)} secondes`:"";
  const audio=el("audio-player");audio.pause();audio.src=item.audio_url||"";audio.load();audio.playbackRate=1;el("sentence-translation").value=s.sentence_translation||"";el("sentence-translation").oninput=saveState;renderWords(item,s);renderSyllables(item,s);
  el("source-note").textContent=`ID : ${item.utterance_id} · Source : ${item.source_split||"non précisée"}${item.source_url?` · ${item.source_url}`:""}. Les suggestions sont des points de départ et les champs saisis ici constituent votre propre annotation.`;
  el("previous-item").disabled=current===0;el("next-item").disabled=current===examples.length-1;
}
function updateProgress(){if(!examples.length)return;const done=examples.filter(item=>{const k=`fongbe-annotation-v1:${slug(el("annotator").value)}:${item.utterance_id}`;try{const s=JSON.parse(localStorage.getItem(k)||"{}");return Boolean(s.sentence_translation||s.words?.some(w=>w.translation_fr)||s.syllables?.some(u=>u.lexical_tone_final||u.contour_heard));}catch{return false;}}).length;el("progress-label").textContent=`${done} / ${examples.length}`;el("progress-bar").style.width=`${done/examples.length*100}%`;document.querySelectorAll(".nav-item").forEach((b,i)=>{const k=`fongbe-annotation-v1:${slug(el("annotator").value)}:${examples[i].utterance_id}`;try{const s=JSON.parse(localStorage.getItem(k)||"{}");b.querySelector(".nav-done").hidden=!(s.sentence_translation||s.words?.some(w=>w.translation_fr)||s.syllables?.some(u=>u.lexical_tone_final||u.contour_heard));}catch{}});}
function exportRows(indices=examples.map((_,i)=>i)){
  const who=slug(el("annotator").value);const out=[];
  for(const i of indices){const item=examples[i],k=`fongbe-annotation-v1:${who}:${item.utterance_id}`;let s={};try{s=JSON.parse(localStorage.getItem(k)||"{}");}catch{}
    const common={utterance_id:item.utterance_id,annotator_id:who,source_split:item.source_split||"",text_original:item.text_original||"",duration_s:item.duration_s||"",audio_url:item.audio_url||"",utterance_translation_fr:s.sentence_translation||"",confidence:"",notes:""};
    out.push({...common,row_type:"phrase",unit_id:item.utterance_id,unit_text:item.text_original||"",start_char:0,end_char:(item.text_original||"").length,start_s:"",end_s:"",word_translation_fr:"",lexical_tone_final:"",contour_heard:""});
    for(const [j,w] of (s.words||[]).entries())out.push({...common,row_type:"mot",unit_id:`${item.utterance_id}:word:${j+1}`,unit_text:w.text,start_char:w.start_char,end_char:w.end_char,start_s:"",end_s:"",word_translation_fr:w.translation_fr||"",lexical_tone_final:"",contour_heard:""});
    for(const [j,u] of (s.syllables||[]).entries())out.push({...common,row_type:"syllabe",unit_id:`${item.utterance_id}:syllable:${j+1}`,unit_text:u.unit_text,start_char:u.start_char,end_char:u.end_char,start_s:u.start_s,end_s:u.end_s,word_translation_fr:"",lexical_tone_final:u.lexical_tone_final,contour_heard:u.contour_heard,confidence:u.confidence||""});
  }
  if(!out.length){announce("Aucune annotation à exporter.");return;}const blob=new Blob([csvText(out)],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`annotations_fongbe_${who}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);announce("CSV téléchargé : phrase, mots et syllabes.");
}
function downloadCurrent(){saveState();exportRows([current]);}
async function loadInitial(){try{const [a,b]=await Promise.all([fetch("data/examples.csv"),fetch("data/syllables.csv")]);if(!a.ok)throw new Error("CSV examples absent");const items=splitCsv(await a.text());const units=b.ok?splitCsv(await b.text()):[];const byId=new Map();for(const u of units){const id=u.utterance_id;if(!byId.has(id))byId.set(id,[]);byId.get(id).push({unit_text:u.syllable_text,start_char:Number(u.start_char),end_char:Number(u.end_char),start_s:Number(u.start_s),end_s:Number(u.end_s),lexical_tone_candidate:u.lexical_tone_candidate,contour_candidate:u.contour_candidate});}examples=items.map(x=>({...x,duration_s:Number(x.duration_s)||0,units:byId.get(x.utterance_id)||[]}));render();}catch{examples=[];render();}}
el("annotator").value=localStorage.getItem("fongbe-annotator-id")||"";el("annotator").addEventListener("input",()=>{localStorage.setItem("fongbe-annotator-id",el("annotator").value);render();});
el("local-audio").addEventListener("change",e=>{const file=e.target.files[0];if(!file)return;const audio=el("audio-player");if(audio.dataset.localUrl)URL.revokeObjectURL(audio.dataset.localUrl);audio.dataset.localUrl=URL.createObjectURL(file);audio.src=audio.dataset.localUrl;audio.load();announce("Audio chargé localement pour cet extrait.");e.target.value="";});
el("previous-item").addEventListener("click",()=>{saveState();current=Math.max(0,current-1);render();});el("next-item").addEventListener("click",()=>{saveState();current=Math.min(examples.length-1,current+1);render();});
el("add-word").addEventListener("click",()=>{const currentWords=readWords();currentWords.push({text:"",start_char:-1,end_char:-1,translation_fr:""});const s=state();s.words=currentWords;localStorage.setItem(key(),JSON.stringify(s));render();});
el("add-syllable").addEventListener("click",()=>{const ss=readSyllables();ss.push({unit_text:"",start_char:-1,end_char:-1,start_s:"",end_s:"",lexical_tone_final:"",contour_heard:"",confidence:""});const s=state();s.syllables=ss;localStorage.setItem(key(),JSON.stringify(s));render();});
el("export-all").addEventListener("click",()=>{saveState();exportRows();});el("export-current").addEventListener("click",downloadCurrent);
el("import-examples").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const incoming=rowsToExamples(splitCsv(await file.text()));if(!incoming.length)throw new Error("Aucune ligne avec utterance_id valide n’a été trouvée.");examples=incoming;current=0;render();announce(`${examples.length} extrait${examples.length===1?"":"s"} chargé${examples.length===1?"":"s"} depuis le CSV.`);}catch(err){announce(err.message||"CSV illisible.");}e.target.value="";});
el("import-annotations").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const imported=splitCsv(await file.text());let count=0;for(const item of examples){const matches=imported.filter(r=>r.utterance_id===item.utterance_id);if(!matches.length)continue;const sentence=matches.find(r=>r.row_type==="phrase");const words=matches.filter(r=>r.row_type==="mot").map(r=>({text:r.unit_text,start_char:Number(r.start_char),end_char:Number(r.end_char),translation_fr:r.word_translation_fr||""}));const syllables=matches.filter(r=>r.row_type==="syllabe").map(r=>({unit_text:r.unit_text,start_char:Number(r.start_char),end_char:Number(r.end_char),start_s:r.start_s,end_s:r.end_s,lexical_tone_final:r.lexical_tone_final,contour_heard:r.contour_heard,confidence:r.confidence}));localStorage.setItem(`fongbe-annotation-v1:${slug(el("annotator").value)}:${item.utterance_id}`,JSON.stringify({annotator_id:slug(el("annotator").value),sentence_translation:sentence?.utterance_translation_fr||"",words,syllables}));count++;}render();announce(`${count} extrait${count===1?"":"s"} repris depuis le CSV.`);}catch{announce("Impossible de lire ce CSV d’annotations.");}e.target.value="";});
loadInitial();
