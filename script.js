const STORE_KEY = 'redovalnica_v2';
const SKLOPI = ['A','B','C','D'];
const MESECI = ['September','Oktober','November','December','Januar','Februar','Marec','April','Maj','Junij'];
const MESEC_JS = {0:8,1:9,2:10,3:11,4:0,5:1,6:2,7:3,8:4,9:5};
let data = load();
let ui = { sklopCtx: null, zakljCtx: null, calCtx: null, selType: 'ustno' };

function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return JSON.parse(raw); } catch(e) {}
  return { activeYear: '2025/2026', years: { '2025/2026': { subjects: [], calendar: {} } } };
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function yr() { return data.years[data.activeYear]; }
function subs() { return yr().subjects; }
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function toast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove('show'), 1900);
}

function allMarks(sub) {
  if (!sub.sklopi) return [];
  return SKLOPI.flatMap(sk => sub.sklopi[sk] || []);
}
function subjAvg(sub) {
  const m = allMarks(sub).map(g => Number(g.mark)).filter(n => n>=1 && n<=5);
  if (!m.length) return null;
  return m.reduce((a,b)=>a+b,0)/m.length;
}
function gradeClass(v) {
  if (v == null) return null;
  const r = Math.round(v);
  return 'gc' + Math.min(5, Math.max(1, r));
}

function render() { renderYears(); renderHud(); renderGradeTable(); renderCalendar(); save(); }

function renderYears() {
  const sel = document.getElementById('yearSelect'); sel.innerHTML = '';
  Object.keys(data.years).forEach(y => {
    const o = document.createElement('option'); o.value=y; o.textContent='Leto '+y;
    if (y===data.activeYear) o.selected=true; sel.appendChild(o);
  });
}

function renderHud() {
  const hud = document.getElementById('hud');
  const allG = subs().flatMap(allMarks);
  const numeric = allG.map(g=>Number(g.mark)).filter(n=>n>=1&&n<=5);
  const overall = numeric.length ? numeric.reduce((a,b)=>a+b,0)/numeric.length : null;
  const corrCount = allG.filter(g=>g.corrected).length;

  // next upcoming exam
  const next = nextExam();
  let nextHtml;
  if (next) {
    const d = next.daysLeft;
    const when = d === 0 ? 'danes!' : d === 1 ? 'jutri' : d < 0 ? 'mimo' : 'čez '+d+' dni';
    nextHtml = `<div class="hud-card"><div class="lbl">Naslednji test</div>
      <div class="val" style="font-size:20px">${esc(next.code)}</div>
      <div class="sub2">${next.day}. ${MESECI[next.monthIdx].toLowerCase()} &middot; ${when}</div></div>`;
  } else {
    nextHtml = `<div class="hud-card"><div class="lbl">Naslednji test</div>
      <div class="val" style="font-size:20px;color:var(--text-faint)">—</div>
      <div class="sub2">ni napovedanih</div></div>`;
  }

  hud.innerHTML = `
    <div class="hud-card accent">
      <div class="lbl">Skupno povprečje</div>
      <div class="val">${overall==null?'—':overall.toFixed(2)}</div>
      <div class="sub2">${subs().length} predmetov</div>
    </div>
    <div class="hud-card">
      <div class="lbl">Vseh ocen</div>
      <div class="val">${allG.length}</div>
      <div class="sub2">${numeric.length} številčnih</div>
    </div>
    <div class="hud-card">
      <div class="lbl">Popravljenih</div>
      <div class="val">${corrCount}</div>
      <div class="sub2">${corrCount? 'dobro delo' : 'brez popravljanj'}</div>
    </div>
    ${nextHtml}
  `;
}

// Vsaka celica koledarja je lahko en objekt (star format) ali polje (nov, več testov).
function calEntries(cal, key) {
  const v = cal[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}
function examDate(monthIdx, day, yStart) {
  const jsMonth = MESEC_JS[monthIdx];
  const yearOfMonth = jsMonth >= 8 ? yStart : yStart+1;
  const dt = new Date(yearOfMonth, jsMonth, Number(day)); dt.setHours(0,0,0,0);
  return dt;
}

function nextExam() {
  const cal = yr().calendar || {};
  const now = new Date(); now.setHours(0,0,0,0);
  const yStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear()-1;
  let best = null;
  Object.keys(cal).forEach(key => {
    const [sid, mi] = key.split('|');
    const sub = subs().find(s=>s.id===sid); if (!sub) return;
    const monthIdx = Number(mi);
    calEntries(cal, key).forEach(e => {
      const dt = examDate(monthIdx, e.day, yStart);
      const diff = Math.round((dt - now)/86400000);
      if (diff >= 0 && (!best || diff < best.daysLeft))
        best = { code: sub.code||sub.name, day: e.day, monthIdx, daysLeft: diff, type: e.type };
    });
  });
  return best;
}

function renderGradeTable() {
  const wrap = document.getElementById('gradeTableWrap');
  if (!subs().length) {
    wrap.innerHTML = '<div class="empty"><div class="big">📚</div>Še ni predmetov.<br>Klikni <b>+ Predmet</b> za začetek.</div>';
    return;
  }
  let head = '<thead><tr><th class="predmet-col" rowspan="2">Predmet</th>'
    + '<th colspan="'+SKLOPI.length+'">Ocene po sklopih</th>'
    + '<th class="zaklj-col" rowspan="2">Zaključeno</th></tr><tr>'
    + SKLOPI.map(s=>'<th>'+s+'</th>').join('') + '</tr></thead>';
  let body = '<tbody>';
  subs().forEach(sub => {
    const avg = subjAvg(sub);
    const avgPill = avg!=null ? '<span class="subj-avg-pill">⌀ '+avg.toFixed(2)+'</span>' : '';
    body += '<tr><td class="subj-cell">'
      + '<button class="ghost danger delsub" data-delsub="'+sub.id+'" title="Izbriši predmet">✕</button>'
      + '<span class="code">'+esc(sub.code||'')+'</span>'
      + (sub.name? '<span class="full">'+esc(sub.name)+'</span>' : '')
      + avgPill + '</td>'
      + SKLOPI.map(sk => sklopCellHTML(sub, sk)).join('')
      + zakljCellHTML(sub) + '</tr>';
  });
  body += '</tbody>';
  wrap.innerHTML = '<table class="grade-table">'+head+body+'</table>';
}
function sklopCellHTML(sub, sk) {
  const list = (sub.sklopi && sub.sklopi[sk]) || [];
  const inner = list.length ? list.map(markHTML).join('') : '<span class="add-hint">+</span>';
  return '<td class="sklop-cell" data-sklop="'+sub.id+'|'+sk+'"><div class="marks">'+inner+'</div></td>';
}
function markHTML(g) {
  const corr = g.corrected ? '<span class="small-old">'+g.oldMark+'</span>' : '';
  const cls = 'mark t-'+g.type+(g.corrected?' corr':'');
  return '<span class="'+cls+'">'+corr+g.mark+'</span>';
}
function zakljCellHTML(sub) {
  const z = sub.zakljucena;
  if (z===undefined||z===''||z===null) return '<td class="zaklj-cell" data-zaklj="'+sub.id+'"><span class="placeholder">—</span></td>';
  const isWord = (z==='opravil'||z==='ni opravil');
  if (isWord) return '<td class="zaklj-cell" data-zaklj="'+sub.id+'"><span class="zaklj-word">'+esc(z)+'</span></td>';
  const gc = gradeClass(Number(z));
  return '<td class="zaklj-cell" data-zaklj="'+sub.id+'"><span class="zaklj-badge '+gc+'">'+esc(z)+'</span></td>';
}

function renderCalendar() {
  const wrap = document.getElementById('calTableWrap');
  if (!subs().length) { wrap.innerHTML = '<div class="empty"><div class="big">🗓️</div>Najprej dodaj predmete v zavihku <b>Ocene</b>.</div>'; return; }
  const cal = yr().calendar || {};
  const now = new Date(); now.setHours(0,0,0,0);
  const yStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear()-1;
  let head = '<thead><tr><th class="pred">Predmet</th>'+MESECI.map(m=>'<th>'+m+'</th>').join('')+'</tr></thead>';
  let body = '<tbody>';
  subs().forEach(sub => {
    body += '<tr><td class="pred">'+esc(sub.code||sub.name)+'</td>';
    MESECI.forEach((m, i) => {
      const key = sub.id+'|'+i;
      const entries = calEntries(cal, key).slice().sort((a,b)=>Number(a.day)-Number(b.day));
      if (entries.length) {
        const chips = entries.map(e => {
          const dt = examDate(i, e.day, yStart);
          const diff = Math.round((dt - now)/86400000);
          const isToday = diff === 0, isPast = diff < 0, soon = diff > 0 && diff <= 7;
          let cd = '';
          if (isToday) cd = 'danes';
          else if (diff === 1) cd = 'jutri';
          else if (diff > 1 && diff <= 14) cd = 'čez '+diff+'d';
          const c = ['cal-chip', e.type==='pisno'?'pisno-c':'ustno-c'];
          if (isToday) c.push('today'); if (isPast) c.push('past'); if (soon) c.push('soon');
          const bell = (e.remDays !== undefined && e.remDays !== '') ? '<span class="bell">🔔</span>' : '';
          return '<span class="'+c.join(' ')+'"><span class="daynum">'+e.day+'.</span>'+bell
            + (cd? '<span class="countdown">'+cd+'</span>':'') + '</span>';
        }).join('');
        body += '<td class="cal-cell has" data-cal="'+key+'"><div class="cal-stack">'+chips+'</div></td>';
      } else {
        body += '<td class="cal-cell" data-cal="'+key+'"><span class="add-hint">+</span></td>';
      }
    });
    body += '</tr>';
  });
  body += '</tbody>';
  wrap.innerHTML = '<table class="cal-table">'+head+body+'</table>';
}

document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  const tab = t.dataset.tab;
  document.getElementById('tab-ocene').style.display = tab==='ocene'?'':'none';
  document.getElementById('tab-koledar').style.display = tab==='koledar'?'':'none';
}));

document.getElementById('yearSelect').addEventListener('change', e => { data.activeYear = e.target.value; render(); });
document.getElementById('addYearBtn').addEventListener('click', () => {
  const name = prompt('Šolsko leto (npr. 2026/2027):');
  if (name && !data.years[name]) { data.years[name] = { subjects: [], calendar: {} }; data.activeYear = name; render(); toast('Dodano leto '+name); }
});
document.getElementById('renameYearBtn').addEventListener('click', () => {
  const name = prompt('Novo ime šolskega leta:', data.activeYear);
  if (name && name!==data.activeYear && !data.years[name]) {
    data.years[name] = data.years[data.activeYear]; delete data.years[data.activeYear]; data.activeYear = name; render();
  }
});
document.getElementById('delYearBtn').addEventListener('click', () => {
  if (Object.keys(data.years).length<=1) { alert('Vsaj eno leto mora ostati.'); return; }
  if (confirm('Izbrišem leto "'+data.activeYear+'" z vsemi ocenami?')) {
    delete data.years[data.activeYear]; data.activeYear = Object.keys(data.years)[0]; render();
  }
});
document.getElementById('addSubjectBtn').addEventListener('click', () => {
  const code = prompt('Kratica predmeta (npr. MAT):'); if (code===null) return;
  const name = prompt('Polno ime (npr. Matematika):') || '';
  subs().push({ id: uid(), code: code.trim(), name: name.trim(), sklopi: {A:[],B:[],C:[],D:[]}, zakljucena: '' });
  render(); toast('Dodan predmet');
});

document.getElementById('gradeTableWrap').addEventListener('click', e => {
  const del = e.target.closest('[data-delsub]');
  if (del) { if (confirm('Izbrišem predmet in vse njegove ocene?')) { yr().subjects = subs().filter(s=>s.id!==del.dataset.delsub); render(); } return; }
  const sk = e.target.closest('[data-sklop]');
  if (sk) { openSklop(sk.dataset.sklop); return; }
  const z = e.target.closest('[data-zaklj]');
  if (z) { openZaklj(z.dataset.zaklj); }
});

const sklopOverlay = document.getElementById('sklopOverlay');
function openSklop(ctx) {
  ui.sklopCtx = ctx;
  const [sid, sk] = ctx.split('|');
  const sub = subs().find(s=>s.id===sid);
  document.getElementById('sklopTitle').textContent = 'Sklop ' + sk;
  document.getElementById('sklopSub').textContent = (sub.code? sub.code+' ':'') + (sub.name||'');
  setType('ustno');
  document.getElementById('mMark').value='5';
  document.getElementById('mDesc').value='';
  document.getElementById('mDate').value='';
  document.getElementById('mCorr').checked=false;
  document.getElementById('mCorrFields').classList.remove('show');
  renderExisting(sub, sk);
  sklopOverlay.classList.add('show');
}
function renderExisting(sub, sk) {
  const list = (sub.sklopi && sub.sklopi[sk]) || [];
  const el = document.getElementById('existingMarks');
  if (!list.length) { el.innerHTML = '<p style="color:var(--text-faint);font-size:13px;">V tem sklopu še ni ocen.</p>'; return; }
  el.innerHTML = list.map(g => {
    const corr = g.corrected ? ' <span class="em-corr">↑ z '+g.oldMark+'</span>' : '';
    const meta = [g.desc, g.date? new Date(g.date).toLocaleDateString('sl-SI'):''].filter(Boolean).join(' · ');
    return '<div class="em-row"><div class="em-mark t-'+g.type+'">'+g.mark+'</div>'
      + '<div class="em-info"><div class="em-type">'+esc(g.type)+corr+'</div>'
      + (meta? '<div class="em-meta">'+esc(meta)+'</div>':'') + '</div>'
      + '<button class="danger" data-delmark="'+g.id+'">Izbriši</button></div>';
  }).join('');
}
function setType(t) {
  ui.selType = t;
  document.querySelectorAll('#typeSeg button').forEach(b => { b.className = (b.dataset.type===t) ? 'on-'+t : ''; });
}
document.querySelectorAll('#typeSeg button').forEach(b => b.addEventListener('click', () => setType(b.dataset.type)));
document.getElementById('mCorr').addEventListener('change', e =>
  document.getElementById('mCorrFields').classList.toggle('show', e.target.checked));
document.getElementById('mAdd').addEventListener('click', () => {
  const [sid, sk] = ui.sklopCtx.split('|');
  const sub = subs().find(s=>s.id===sid);
  if (!sub.sklopi) sub.sklopi = {A:[],B:[],C:[],D:[]};
  if (!sub.sklopi[sk]) sub.sklopi[sk] = [];
  const corr = document.getElementById('mCorr').checked;
  sub.sklopi[sk].push({
    id: uid(), mark: document.getElementById('mMark').value, type: ui.selType,
    desc: document.getElementById('mDesc').value.trim(), date: document.getElementById('mDate').value,
    corrected: corr, oldMark: corr ? document.getElementById('mOldMark').value : null
  });
  renderExisting(sub, sk); renderGradeTable(); renderHud(); save();
  document.getElementById('mDesc').value=''; document.getElementById('mCorr').checked=false;
  document.getElementById('mCorrFields').classList.remove('show');
  toast('Ocena dodana');
});
document.getElementById('existingMarks').addEventListener('click', e => {
  const d = e.target.closest('[data-delmark]'); if (!d) return;
  const [sid, sk] = ui.sklopCtx.split('|');
  const sub = subs().find(s=>s.id===sid);
  sub.sklopi[sk] = sub.sklopi[sk].filter(g=>g.id!==d.dataset.delmark);
  renderExisting(sub, sk); renderGradeTable(); renderHud(); save();
});
document.getElementById('sklopClose').addEventListener('click', ()=>sklopOverlay.classList.remove('show'));
sklopOverlay.addEventListener('click', e=>{ if(e.target===sklopOverlay) sklopOverlay.classList.remove('show'); });

const zakljOverlay = document.getElementById('zakljOverlay');
function openZaklj(sid) {
  ui.zakljCtx = sid;
  const sub = subs().find(s=>s.id===sid);
  document.getElementById('zakljSub').textContent = (sub.code?sub.code+' ':'')+(sub.name||'');
  document.getElementById('zMark').value = sub.zakljucena || '';
  zakljOverlay.classList.add('show');
}
document.getElementById('zSave').addEventListener('click', () => {
  const sub = subs().find(s=>s.id===ui.zakljCtx);
  sub.zakljucena = document.getElementById('zMark').value;
  zakljOverlay.classList.remove('show'); renderGradeTable(); save(); toast('Shranjeno');
});
document.getElementById('zCancel').addEventListener('click', ()=>zakljOverlay.classList.remove('show'));
zakljOverlay.addEventListener('click', e=>{ if(e.target===zakljOverlay) zakljOverlay.classList.remove('show'); });

document.getElementById('calTableWrap').addEventListener('click', e => {
  const c = e.target.closest('[data-cal]'); if (!c) return; openCal(c.dataset.cal);
});
const calOverlay = document.getElementById('calOverlay');

function calArr(key) {
  if (!yr().calendar) yr().calendar = {};
  const v = yr().calendar[key];
  if (v === undefined) return [];
  if (!Array.isArray(v)) yr().calendar[key] = [v]; // migracija starega formata
  return yr().calendar[key];
}
function openCal(key) {
  ui.calCtx = key;
  const [sid, mi] = key.split('|');
  const sub = subs().find(s=>s.id===sid);
  document.getElementById('calTitle').textContent = (sub.code||sub.name) + ' · ' + MESECI[Number(mi)];
  document.getElementById('calSub').textContent = sub.name || '';
  document.getElementById('calDay').value = '';
  document.getElementById('calType').value = 'pisno';
  document.getElementById('calRemDays').value = '1';
  document.getElementById('calRemTime').value = '18:00';
  renderCalExisting();
  calOverlay.classList.add('show');
}
function renderCalExisting() {
  const [sid, mi] = ui.calCtx.split('|');
  const sub = subs().find(s=>s.id===sid);
  const list = calArr(ui.calCtx).slice().sort((a,b)=>Number(a.day)-Number(b.day));
  const el = document.getElementById('calExisting');
  if (!list.length) { el.innerHTML = '<p style="color:var(--text-faint);font-size:13px;">Še ni testov v tem mesecu.</p>'; return; }
  el.innerHTML = list.map(e => {
    const rem = (e.remDays!==undefined && e.remDays!=='')
      ? '🔔 '+(e.remDays==0?'na dan':e.remDays==1?'dan prej':e.remDays+' dni prej')+' ob '+(e.remTime||'18:00')
      : 'brez opomnika';
    return '<div class="em-row"><div class="em-mark t-'+(e.type==='pisno'?'pisno':'ustno')+'">'+e.day+'.</div>'
      + '<div class="em-info"><div class="em-type">'+esc(e.type)+'</div><div class="em-meta">'+rem+'</div></div>'
      + '<button class="ghost" data-icscal="'+e.id+'" title="Dodaj v koledar telefona" style="padding:5px 8px;">📅</button>'
      + '<button class="danger" data-delcal="'+e.id+'">Izbriši</button></div>';
  }).join('');
}
document.getElementById('calAdd').addEventListener('click', () => {
  const day = document.getElementById('calDay').value;
  if (!day || Number(day)<1 || Number(day)>31) { toast('Vpiši dan med 1 in 31'); return; }
  const arr = calArr(ui.calCtx);
  arr.push({
    id: uid(), day: Number(day),
    type: document.getElementById('calType').value,
    remDays: document.getElementById('calRemDays').value,
    remTime: document.getElementById('calRemTime').value
  });
  document.getElementById('calDay').value = '';
  renderCalExisting(); renderCalendar(); renderHud(); save();
  toast('Test dodan');
});
document.getElementById('calExisting').addEventListener('click', e => {
  const del = e.target.closest('[data-delcal]');
  if (del) {
    const arr = calArr(ui.calCtx);
    const i = arr.findIndex(x => x.id === del.dataset.delcal);
    if (i > -1) arr.splice(i, 1);
    if (!arr.length) delete yr().calendar[ui.calCtx];
    renderCalExisting(); renderCalendar(); renderHud(); save();
    toast('Test izbrisan');
    return;
  }
  const ics = e.target.closest('[data-icscal]');
  if (ics) {
    const arr = calArr(ui.calCtx);
    const ex = arr.find(x => x.id === ics.dataset.icscal);
    if (ex) downloadICS(ex);
  }
});
document.getElementById('calClose').addEventListener('click', ()=>calOverlay.classList.remove('show'));
calOverlay.addEventListener('click', e=>{ if(e.target===calOverlay) calOverlay.classList.remove('show'); });

// ---- Ustvari .ics vnos za koledar telefona (z opomnikom) ----
function downloadICS(ex) {
  const [sid, mi] = ui.calCtx.split('|');
  const sub = subs().find(s=>s.id===sid);
  const now = new Date();
  const yStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear()-1;
  const dt = examDate(Number(mi), ex.day, yStart);
  const [hh, mm] = (ex.remTime || '08:00').split(':').map(Number);
  // dogodek postavimo na uro opomnika na dan testa (celodnevni bi zapletel alarme)
  const start = new Date(dt); start.setHours(8, 0, 0, 0);
  const end = new Date(dt); end.setHours(9, 0, 0, 0);
  const pad = n => String(n).padStart(2,'0');
  const fmt = d => d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T'+pad(d.getHours())+pad(d.getMinutes())+'00';
  const naslov = (sub.code||sub.name) + ' — ' + ex.type;
  let alarm = '';
  if (ex.remDays !== undefined && ex.remDays !== '') {
    // trigger: X dni prej ob izbrani uri = (dan testa 08:00) minus (dni*24h) plus/minus do izbrane ure
    const trig = new Date(dt);
    trig.setDate(trig.getDate() - Number(ex.remDays));
    trig.setHours(hh, mm, 0, 0);
    const mins = Math.round((start - trig)/60000);
    alarm = 'BEGIN:VALARM\nACTION:DISPLAY\nDESCRIPTION:'+naslov+'\nTRIGGER:-PT'+mins+'M\nEND:VALARM\n';
  }
  const ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MojaRedovalnica//SL\nBEGIN:VEVENT\n'
    + 'UID:'+ex.id+'@redovalnica\nDTSTAMP:'+fmt(now)+'\nDTSTART:'+fmt(start)+'\nDTEND:'+fmt(end)+'\n'
    + 'SUMMARY:'+naslov+'\nDESCRIPTION:Napovedan '+ex.type+' pri predmetu '+(sub.name||sub.code)+'\n'
    + alarm + 'END:VEVENT\nEND:VCALENDAR';
  const blob = new Blob([ics], {type:'text/calendar'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'test-'+(sub.code||'predmet')+'-'+ex.day+'.ics'; a.click();
  toast('Odpri datoteko → dodaj v koledar');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show'));
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'redovalnica-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
  toast('Varnostna kopija shranjena');
});
document.getElementById('importBtn').addEventListener('click', ()=>document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try {
    const obj = JSON.parse(r.result);
    if (obj.years && obj.activeYear) { data = obj; render(); toast('Uvoženo'); }
    else alert('Napačna datoteka.');
  } catch(err){ alert('Napaka pri branju datoteke.'); } };
  r.readAsText(f); e.target.value='';
});

render();
