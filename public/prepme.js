let BANK = [];
const app = document.getElementById('app'), prog = document.getElementById('progress');
// The home page never waits for the question bank: it shows straight away and the bank loads in the background.
let BANK_READY = BANK.length > 0, BANK_ERR = null, bankWaiters = [];
const COUNT_KEY = 'prepme-counts-v2';
const _H = ['55 questions','59 questions','71 questions','58 questions','56 questions + 4 stories'];
let COUNT_HINT = { bronze:_H, silver:_H, gold:_H };   // questions per grade; replaced by the real counts once the bank arrives
try { const c = JSON.parse(localStorage.getItem(COUNT_KEY) || 'null'); if (c && c.silver) COUNT_HINT = c; } catch (e) {}
function gradeCount(g, m){ if (!BANK_READY) return ((COUNT_HINT[m] || COUNT_HINT.silver)[g-1] ?? ''); const t = testSize(g, m); return `${t.plain} questions` + (t.stories ? ` + ${t.stories} stories` : ''); }
(function(){ const st = document.createElement('style'); st.textContent =
  '.loadwait{text-align:center;padding:48px 12px;color:#5D6B85}.loadwait .spin{width:54px;height:54px;margin:0 auto 18px;border:6px solid #D6E4F7;border-top-color:#2F6FD6;border-radius:50%;animation:pmspin .9s linear infinite}' +
  '.loadwait h2{margin:0 0 8px;color:#1B2A4A}' +
  '.choose{display:grid;gap:16px;margin:16px 0}.ch-card{border:2px solid #D6E4F7;border-radius:18px;padding:18px 20px;text-align:left}.ch-card h2{margin:0 0 6px}.ch-card p{margin:0 0 12px}' +
  '.ch-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin-bottom:8px}.ch-item{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid #D6E4F7;border-radius:12px;cursor:pointer}' +
  '.ch-item input{width:22px;height:22px}.ch-item small{width:100%;color:#5D6B85;padding-left:30px}.ch-acts{display:flex;gap:18px;margin:4px 0 12px}' +
  '.story{background:#FFF7E6;border:2px solid #F5D9A6;border-radius:16px;padding:14px 18px;margin:8px 0 14px;text-align:left}.story-h{font-weight:800;color:#9A5B00;font-size:15px;margin-bottom:6px}.story p{margin:0;font-size:clamp(18px,2.6vw,21px);line-height:1.5}' +
  '.story-mini{background:#FFF7E6;border-radius:12px;padding:8px 12px;margin:6px 0;font-size:15px}.story-mini summary{cursor:pointer;font-weight:800;color:#9A5B00}@keyframes pmspin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.loadwait .spin{animation-duration:2.5s}}';
  document.head.appendChild(st); })();
// Run fn once the bank is loaded. Until then show a waiting screen; after 5 seconds it turns into a clear spinner.
function whenBank(fn){
  if (BANK_READY) return fn();
  bankWaiters = [fn]; prog.hidden = true;
  app.innerHTML = `<div class="loadwait" role="status" aria-live="polite"><p id="lw">Getting your questions ready…</p></div>`;
  if (BANK_ERR) return showBankError();
  clearTimeout(whenBank.t);
  whenBank.t = setTimeout(() => { const w = app.querySelector('.loadwait'); if (!w || BANK_READY) return;
    w.innerHTML = `<div class="spin" aria-hidden="true"></div><h2>Loading the questions…</h2><p>This can take a little longer on a slow connection. Please keep this page open.</p>`; }, 5000);
}
function showBankError(){
  app.innerHTML = `<div class="loadwait" role="alert"><h2>Couldn't load the questions</h2><p>Please check the internet connection and try again.</p><p><button class="btn btn-primary" id="retry">Try again</button></p></div>`;
  document.getElementById('retry').onclick = () => location.reload();
}
function bankArrived(){
  BANK_READY = true; clearTimeout(whenBank.t);
  try { const c = {}; Object.keys(MEDALS).forEach(m => c[m] = [1,2,3,4,5].map(g => gradeCount(g, m))); localStorage.setItem(COUNT_KEY, JSON.stringify(c)); } catch (e) {}
  document.querySelectorAll('.gbtn[data-g] small[data-count]').forEach(el => { el.textContent = gradeCount(+el.dataset.count, medal); });
  const w = bankWaiters; bankWaiters = []; w.forEach(f => f());
}
let test = [], idx = 0, answers = [], reached = 0, exitedAt = null, cur = null, onlyMissed = false, grade = 1, kidName = '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const INK='#1D2A44', SKY='#2E7BD6', ACC='#FF7A2F', LINE='#D6DEEA', PAPER='#EEF3F8';
const T = (x,y,s,o='') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="800" ${o}>${s}</text>`;

// ---------- pick one question per subcategory of the chosen grade, in bank order ----------
function subsFor(g){ const m = new Map(); BANK.filter(q => q.grade === g).forEach(q => { if (!m.has(q.skill_id)) m.set(q.skill_id, []); m.get(q.skill_id).push(q); }); return m; }
// ---------- medals: the kid picks Bronze, Silver or Gold ----------
// Bronze: no stretch subcategories, about 70% level 1 / 30% level 2.
// Silver: every subcategory (stretch too), about 70% level 2 / 30% level 1.
// Gold:   every subcategory (stretch too), about 60% level 3 / 40% level 2 (the hardest questions).
const MEDALS = {
  bronze: { name:'Bronze', icon:'🥉', mix:[[1,.7],[2,.3]], stretch:false, order:{1:[1,2,3],2:[2,1,3]}, blurb:'Warm-up' },
  silver: { name:'Silver', icon:'🥈', mix:[[2,.7],[1,.3]], stretch:true,  order:{1:[1,2,3],2:[2,1,3]}, blurb:'Grade level' },
  gold:   { name:'Gold',   icon:'🥇', mix:[[3,.6],[2,.4]], stretch:true,  order:{2:[2,3,1],3:[3,2,1]}, blurb:'Challenge' },
};
let medal = 'silver';
const subIsStretch = list => list.filter(q => q.is_stretch).length * 2 > list.length;
function medalSubs(g, m){ return [...subsFor(g).values()].filter(list => MEDALS[m].stretch || !subIsStretch(list)); }
function levelPlan(n, mix){ // exact counts per level, spread at random over the subcategories
  const out = []; let left = n;
  mix.forEach(([lv, share], k) => { const c = k === mix.length - 1 ? left : Math.round(n * share); for (let i = 0; i < c; i++) out.push(lv); left -= c; });
  return shuffle(out);
}
function pickAt(list, lv, order, noStretch){ // a question at the wanted level, else the nearest level in `order`
  const pool = noStretch ? list.filter(q => !q.is_stretch) : list;
  for (const l of (order[lv] || [lv])) { const at = pool.filter(q => q.difficulty === l); if (at.length) return shuffle(at)[0]; }
  return shuffle(pool.length ? pool : list)[0];
}
// ---------- story problems (Grade 5): one story, then 3-5 questions about it ----------
const isStory = q => !!(q.params && q.params.story_id);
const STORY_LV = { bronze: 1, silver: 2, gold: 3 };            // the level of stories each medal gets
const STORY_N = 4;                                              // stories in a whole test
function storiesFor(g, lv){                                     // [[part1, part2, ...], ...], one entry per story
  const m = new Map(); BANK.filter(q => q.grade === g && isStory(q) && (lv == null || q.difficulty === lv)).forEach(q => {
    const k = q.params.story_id; if (!m.has(k)) m.set(k, []); m.get(k).push(q); });
  return [...m.values()].map(l => l.sort((a, b) => a.params.part - b.params.part));
}
function pickStories(g, m){                                     // different story settings, one of each, in random order
  const byTitle = new Map(); shuffle(storiesFor(g, STORY_LV[m])).forEach(st => { const t = st[0].params.title; if (!byTitle.has(t)) byTitle.set(t, st); });
  return shuffle([...byTitle.values()]).slice(0, STORY_N);
}
const plainSubs = (g, m) => medalSubs(g, m).filter(list => !isStory(list[0]));
function pickTest(m = medal){
  const M = MEDALS[m], subs = plainSubs(grade, m), plan = levelPlan(subs.length, M.mix);
  return subs.map((list, i) => pickAt(list, plan[i], M.order, !M.stretch)).concat(pickStories(grade, m).flat());
}
// ---------- practice: every question of the chosen sections, at the medal's level ----------
function practiceLevel(list, m){ const M = MEDALS[m], lv = STORY_LV[m]; for (const l of (M.order[lv] || [lv])) if (list.some(q => q.difficulty === l)) return l; return lv; }
function sectionsFor(g, m){                                     // [{topic, qs}] in bank order
  const out = new Map();
  plainSubs(g, m).forEach(list => { const l = practiceLevel(list, m), qs = list.filter(q => q.difficulty === l && (MEDALS[m].stretch || !q.is_stretch));
    const t = list[0].topic; if (!out.has(t)) out.set(t, { topic: t, qs: [], stories: 0 }); out.get(t).qs.push(...shuffle(qs)); });
  const st = storiesFor(g, STORY_LV[m]);
  if (st.length) out.set('Story Problems', { topic: 'Story Problems', qs: shuffle(st).flat(), stories: st.length });
  return [...out.values()];
}
function testSize(g, m){ return { plain: plainSubs(g, m).length, stories: Math.min(STORY_N, new Set(storiesFor(g, STORY_LV[m]).map(s => s[0].params.title)).size) }; }
// answer options are shown in a new random order every test (ordered scales like certain…impossible stay in order)
const KEEP_ORDER = [['certain','likely','unlikely','impossible'], ['even','odd'], ['prime','composite'], ['yes','no'], ['true','false'], ['a.m.','p.m.']];
function prepare(qs){ return qs.map(q => q.answer_type === 'choice_text' && q.options && !KEEP_ORDER.some(k => q.options.every(o => k.includes(String(o)))) ? { ...q, options: shuffle(q.options) } : q); }
function begin(qs){ test = prepare(qs); idx = 0; reached = 0; exitedAt = null; answers = Array(test.length).fill(undefined); showQuestion(); }

// ---------- answer checking ----------
function isCorrect(q, g){
  if (g == null || g === '') return false;
  const a = q.correct_answer;
  if (q.answer_type === 'number') return Number(g) === Number(a);
  if (q.answer_type === 'time'){ const x = g.includes(':') ? g : g + ':00'; const [h,m] = x.split(':'); return `${+h}:${(m||'').padStart(2,'0')}` === a; }
  if (q.answer_type === 'multi_number') return g.split('|').map(Number).join('|') === a.split('|').map(Number).join('|');
  return String(g) === a;
}
function showAnswer(q, v){
  if (v == null || v === '') return '—';
  if (q.answer_type === 'multi_number' && q.params.layout === 'remainder'){ const p = v.split('|'); return `${p[0]} R ${p[1]}`; }
  if (q.answer_type === 'multi_number'){ const f = q.params.fields; return v.split('|').map((x,i)=>`${x} ${f[i].label}`.trim()).join(', '); }
  if (q.answer_type === 'number' && q.params && q.params.unit) return `${v} ${q.params.unit}`;
  return v;
}

// ---------- visuals ----------
function V(vt, p, small){
  switch(vt){
    case 'clock': return clock(p);
    case 'number_line': return numberLine(p);
    case 'objects': return objects(p, small);
    case 'pattern': return `<div class="patt">${p.items.map(x => x==='?' ? '<span class="q">?</span>' : `<span>${x}</span>`).join('')}</div>`;
    case 'hundred_chart': return hundred(p);
    case 'ten_frame': return tenFrame(p);
    case 'base_ten': return baseTen(p);
    case 'column': if (p.nums) return colNums(p); return `<div class="colsum"><span>${p.a}</span><span>${p.op} ${p.b}</span><span class="ln"></span></div>`;
    case 'fraction_shape': return fraction(p, small);
    case 'bars': return bars(p);
    case 'units': return units(p);
    case 'ruler': return ruler(p);
    case 'coins': return coins(p);
    case 'calendar': return calendarV(p);
    case 'shape': return p.scale ? shapeSized(p) : shape2d(p.shape, small);
    case 'balance': return balanceV(p);
    case 'long_div': return longDiv(p);
    case 'polygon': return polyV(p);
    case 'coord': return coordV(p);
    case 'cubes': return cubesV(p);
    case 'stem_leaf': return stemLeaf(p);
    case 'measuring_cup': return cupV(p);
    case 'thermometer': return thermoV(p);
    case 'venn': return vennV(p);
    case 'pie': return pieV(p);
    case 'line_graph': return lineGraphV(p);
    case 'protractor': return protractorV(p);
    case 'shape3d': return shape3d(p.shape, small);
    case 'emoji_pic': return emojiPic(p, small);
    case 'tally_marks': { const w=Math.floor(p.count/5)*64+(p.count%5)*12+24; return `<svg viewBox="0 0 ${w} 48" width="${w}" height="48" role="img" aria-label="Tally marks">${tallyMarks(p.count,14,24)}</svg>`; }
    case 'arrow': return arrow(p.direction);
    case 'flag': return flag(p.facing, small);
    case 'tally': return tally(p);
    case 'pictograph': return pictograph(p);
    case 'bar_chart': return barChart(p);
    case 'array': return arrayV(p);
    case 'area_grid': return areaGrid(p);
    case 'rect': return rectV(p);
    case 'fraction_line': return fractionLine(p);
    case 'line_plot': return linePlot(p);
    case 'angle': return angleV(p);
    case 'lines': return linesV(p);
    case 'symmetry': return symmetryV(p);
    case 'double_bar': return doubleBarV(p);
    case 'double_line': return doubleLineV(p);
    case 'net': return netV(p, small);
    case 'angle_pair': return anglePairV(p);
    case 'pictograph2': return `<div style="display:flex;flex-direction:column;gap:14px;align-items:center">${pictograph(p.a)}${pictograph(p.b)}</div>`;
    case 'venn3': return venn3V(p);
    case 'factor_tree': return factorTreeV(p);
    case 'dial': return dialV(p);
    case 'year_calendar': return yearCalV(p);
    case 'circle_rd': return circleRD(p);
  }
  return '';
}
function clock(p){
  const c=120,r=108,o=[`<circle cx="${c}" cy="${c}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="6"/>`];
  for(let i=0;i<60;i++){const a=i*6*Math.PI/180,L=i%5===0,r1=L?r-14:r-8;o.push(`<line x1="${c+r1*Math.sin(a)}" y1="${c-r1*Math.cos(a)}" x2="${c+(r-4)*Math.sin(a)}" y2="${c-(r-4)*Math.cos(a)}" stroke="${INK}" stroke-width="${L?3:1.2}"/>`);}
  for(let n=1;n<=12;n++){const a=n*30*Math.PI/180;o.push(T(c+(r-32)*Math.sin(a),c-(r-32)*Math.cos(a)+8,n,`font-size="22" fill="${INK}"`));}
  const ha=((p.hour%12)+p.minute/60)*30*Math.PI/180, ma=p.minute*6*Math.PI/180;
  o.push(`<line x1="${c}" y1="${c}" x2="${c+52*Math.sin(ha)}" y2="${c-52*Math.cos(ha)}" stroke="${ACC}" stroke-width="9" stroke-linecap="round"/>`);
  o.push(`<line x1="${c}" y1="${c}" x2="${c+82*Math.sin(ma)}" y2="${c-82*Math.cos(ma)}" stroke="${SKY}" stroke-width="6" stroke-linecap="round"/><circle cx="${c}" cy="${c}" r="7" fill="${INK}"/>`);
  return `<svg viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="Clock">${o.join('')}</svg>`;
}
function numberLine(p){
  if(p.jumps){const W=700,pad=30,n=p.max-p.min,s=(W-2*pad)/n,y=90,ls=p.label_step||1,o=[`<line x1="${pad-12}" y1="${y}" x2="${W-pad+12}" y2="${y}" stroke="${INK}" stroke-width="3"/>`];
    for(let i=0;i<=n;i++){const x=pad+i*s,lab=(p.min+i)%ls===0;o.push(`<line x1="${x}" y1="${y-(lab?10:6)}" x2="${x}" y2="${y+(lab?10:6)}" stroke="${INK}" stroke-width="${lab?2:1.2}"/>`);if(lab)o.push(T(x,y+34,p.min+i,`font-size="17" fill="${INK}"`));}
    for(let k=0;k<p.jumps;k++){const x1=pad+(p.start+k*p.size-p.min)*s,x2=x1+p.size*s;o.push(`<path d="M${x1},${y-4} Q${(x1+x2)/2},${y-4-Math.min(60,p.size*s*0.6)} ${x2},${y-4}" fill="none" stroke="${ACC}" stroke-width="3"/><polygon points="${x2},${y-4} ${x2-9},${y-14} ${x2-2},${y-16}" fill="${ACC}"/>`);}
    return `<svg viewBox="0 0 ${W} 135" width="${W}" height="135" role="img" aria-label="Number line with jumps">${o.join('')}</svg>`;}
  const W=700,H=110,pad=28,n=p.max-p.min,s=(W-2*pad)/n,y=58,o=[`<line x1="${pad-12}" y1="${y}" x2="${W-pad+12}" y2="${y}" stroke="${INK}" stroke-width="3"/>`];
  for(let i=0;i<=n;i++){const x=pad+i*s;o.push(`<line x1="${x}" y1="${y-10}" x2="${x}" y2="${y+10}" stroke="${INK}" stroke-width="2"/>`,T(x,y+34,p.min+i,`font-size="18" fill="${INK}"`));}
  const sx=pad+(p.start-p.min)*s; o.push(`<circle cx="${sx}" cy="${y}" r="10" fill="${ACC}"/>`,T(sx,y-20,'start',`font-size="16" fill="${ACC}"`));
  if(p.show_end){const ex=pad+(p.start+p.jump-p.min)*s; o.push(`<circle cx="${ex}" cy="${y}" r="10" fill="${SKY}"/>`,T(ex,y-20,'end',`font-size="16" fill="${SKY}"`));}
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Number line">${o.join('')}</svg>`;
}
function objects(p, small){
  const parts = p.groups.map(g => {
    const items = g.items || Array(g.count).fill(g.emoji);
    const cols = small ? Math.min(3, items.length) : Math.min(p.rows_of || (g.items ? 8 : 5), items.length);
    return `<div class="grp${small?' sm':''}" style="grid-template-columns:repeat(${cols},auto)">${items.map((e,i)=>`<span class="${g.crossed && i>=items.length-g.crossed?'x':''}">${e}</span>`).join('')}</div>`;
  });
  return `<div class="objs">${p.label_left?`<span class="topic-tag">${esc(p.label_left)}</span>`:''}${parts.join(p.op?`<span class="op">${p.op}</span>`:'')}</div>`;
}
function hundred(p){
  const cw=56,ch=46,o=[];
  for(let r=0;r<p.rows;r++)for(let c=0;c<10;c++){const v=p.start+r*10+c,x=c*cw,y=r*ch,hid=p.hidden.includes(v);
    o.push(`<rect x="${x+1}" y="${y+1}" width="${cw-2}" height="${ch-2}" rx="6" fill="${hid?'#FFF1E6':'#fff'}" stroke="${hid?ACC:LINE}" stroke-width="2"/>`,T(x+cw/2,y+ch/2+7,hid?'★':v,`font-size="${hid?24:18}" fill="${hid?ACC:INK}"`));}
  return `<svg viewBox="0 0 ${10*cw} ${p.rows*ch}" width="${10*cw}" height="${p.rows*ch}" role="img" aria-label="Number chart">${o.join('')}</svg>`;
}
function tenFrame(p){
  const s=52,o=[], f2=p.filled2||0, tot=p.filled+f2;   // filled = blue dots, filled2 = orange dots that come after them
  for(let f=0;f<p.frames;f++){const ox=f*(5*s+24);
    for(let i=0;i<10;i++){const x=ox+(i%5)*s,y=Math.floor(i/5)*s,n=f*10+i;o.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#fff" stroke="${INK}" stroke-width="3"/>`); if(n<tot)o.push(`<circle cx="${x+s/2}" cy="${y+s/2}" r="17" fill="${n<p.filled?SKY:'#F28C38'}"/>`);}}
  const W=p.frames*5*s+(p.frames-1)*24; return `<svg viewBox="-2 -2 ${W+4} ${2*s+4}" width="${W+4}" height="${2*s+4}" role="img" aria-label="Ten frame">${o.join('')}</svg>`;
}
function baseTen(p){
  const H=p.hundreds||0, u=H?9:16, o=[]; let x=0;
  for(let h=0;h<H;h++){for(let r=0;r<10;r++)for(let c=0;c<10;c++)o.push(`<rect x="${x+c*u}" y="${r*u}" width="${u}" height="${u}" fill="#9CC3F0" stroke="${INK}" stroke-width="1"/>`); x+=10*u+10;}
  for(let t=0;t<p.tens;t++){for(let k=0;k<10;k++)o.push(`<rect x="${x}" y="${k*u}" width="${u}" height="${u}" fill="#7FB2EC" stroke="${INK}" stroke-width="1.5"/>`); x+=u+6;}
  x+=12; for(let k=0;k<p.ones;k++){const cx=x+(k%3)*(u+5),cy=10*u-u-(Math.floor(k/3))*(u+5);o.push(`<rect x="${cx}" y="${cy}" width="${u}" height="${u}" fill="#FFB98A" stroke="${INK}" stroke-width="1.5"/>`);}
  if(p.plus){ x+=(p.ones?3*(u+5):0)+14; o.push(T(x+10,5*u+12,'+',`font-size="34" fill="${INK}"`)); x+=36;   // second number for addition
    for(let t=0;t<p.plus.tens;t++){for(let k=0;k<10;k++)o.push(`<rect x="${x}" y="${k*u}" width="${u}" height="${u}" fill="#7FB2EC" stroke="${INK}" stroke-width="1.5"/>`); x+=u+6;}
    x+=12; for(let k=0;k<p.plus.ones;k++){const cx=x+(k%3)*(u+5),cy=10*u-u-(Math.floor(k/3))*(u+5);o.push(`<rect x="${cx}" y="${cy}" width="${u}" height="${u}" fill="#FFB98A" stroke="${INK}" stroke-width="1.5"/>`);}
    if(!p.plus.ones) x-=3*(u+5)-4; }
  const W=x+3*(u+5); return `<svg viewBox="-2 -2 ${W+4} ${10*u+4}" width="${W+4}" height="${10*u+4}" role="img" aria-label="Base ten blocks">${o.join('')}</svg>`;
}
function fraction(p, small){
  if(p.wholes>1){const out=[];let left=p.shaded;for(let w=0;w<p.wholes;w++){const k=Math.max(0,Math.min(p.parts,left));left-=k;out.push(fraction({...p,wholes:1,shaded:k},small));}
    return `<div style="display:flex;gap:18px;justify-content:center;flex-wrap:wrap">${out.join('')}</div>`;}
  const S=small?110:180, c=S/2, o=[], n=p.parts, uneq=!p.equal, v=p.variant||0;
  const fillI = i => i < (p.shaded||0) ? '#7FB2EC' : '#fff';
  if(p.shape==='circle'){
    let angs=[...Array(n).keys()].map(i=>i*360/n); if(uneq) angs=angs.map((a,i)=>i===0?0:a+(i%2?28:-18)+v*6);
    for(let i=0;i<n;i++){const a1=angs[i]*Math.PI/180,a2=(i+1<n?angs[i+1]:360)*Math.PI/180,r=c-4,large=(a2-a1)>Math.PI?1:0;
      o.push(`<path d="M${c},${c} L${c+r*Math.sin(a1)},${c-r*Math.cos(a1)} A${r},${r} 0 ${large} 1 ${c+r*Math.sin(a2)},${c-r*Math.cos(a2)} Z" fill="${fillI(i)}" stroke="${INK}" stroke-width="3"/>`);}
  } else {
    const W = p.shape==='rect' ? S*1.5 : S, H=S; let cuts=[...Array(n+1).keys()].map(i=>i*W/n);
    if(uneq){ const w=[1.7,0.8,1.2,0.6].slice(0,n).map((x,i)=>x+((v+i)%3)*0.15), tot=w.reduce((a,b)=>a+b,0); let acc=0; cuts=[0,...w.map(x=>(acc+=x)/tot*W)]; }
    const split = p.shape==='square' && n===4 && !uneq && (p.nonce||0)%2===0;
    if(split){ const q=[[0,0],[W/2,0],[0,H/2],[W/2,H/2]]; q.forEach((pt,i)=>o.push(`<rect x="${pt[0]+2}" y="${pt[1]+2}" width="${W/2-2}" height="${H/2-2}" fill="${fillI(i)}" stroke="${INK}" stroke-width="3"/>`)); }
    else for(let i=0;i<n;i++) o.push(`<rect x="${cuts[i]+2}" y="2" width="${cuts[i+1]-cuts[i]-2}" height="${H-4}" fill="${fillI(i)}" stroke="${INK}" stroke-width="3"/>`);
    return `<svg viewBox="0 0 ${W+4} ${H+2}" width="${W+4}" height="${H+2}" role="img" aria-label="Shape cut into parts">${o.join('')}</svg>`;
  }
  return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="Shape cut into parts">${o.join('')}</svg>`;
}
function bars(p){
  const u=48,o=[]; const cols=['#FF9F66','#7FB2EC','#8BD3A8'];
  p.bars.forEach((b,i)=>{const y=i*56; o.push(T(14,y+32,b.label,`font-size="22" fill="${INK}"`),`<rect x="40" y="${y+8}" width="${b.length*u}" height="32" rx="10" fill="${cols[i%3]}" stroke="${INK}" stroke-width="2"/>`);});
  const W=40+11*u; return `<svg viewBox="0 0 ${W} ${p.bars.length*56}" width="${W}" height="${p.bars.length*56}" role="img" aria-label="Ribbons">${o.join('')}</svg>`;
}
function units(p){
  const u=52,W=p.length*u+20; let o=`<rect x="0" y="6" width="${p.length*u}" height="36" rx="10" fill="#FFD9A8" stroke="${INK}" stroke-width="2"/>${T(26,34,p.object,'font-size="26"')}`;
  for(let i=0;i<p.length;i++) o+=T(i*u+u/2,84,p.unit,'font-size="34"');
  return `<svg viewBox="0 0 ${W} 100" width="${W}" height="100" role="img" aria-label="Object measured with paper clips">${o}</svg>`;
}
function ruler(p){
  if(p.mm){const u=6,W=100*u+40;let o=`<rect x="20" y="6" width="${p.length_mm*u}" height="28" rx="5" fill="#8BD3A8" stroke="${INK}" stroke-width="2"/><rect x="20" y="44" width="${100*u}" height="54" fill="#FFF4D6" stroke="${INK}" stroke-width="2"/>`;
    for(let k=0;k<=100;k++){const x=20+k*u,L=k%10===0?24:k%5===0?16:9;o+=`<line x1="${x}" y1="44" x2="${x}" y2="${44+L}" stroke="${INK}" stroke-width="${k%10?1:2.2}"/>`; if(k%10===0)o+=T(x,90,k/10,`font-size="15" fill="${INK}"`);}
    o+=T(W-70,24,'cm (mm marks)',`font-size="14" fill="#5D6B85"`);
    return `<svg viewBox="0 0 ${W} 104" width="${W}" height="104" role="img" aria-label="Ruler in millimeters">${o}</svg>`; }
  if(p.quarters){ const u=96,n=6,W=n*u+30; let o=`<rect x="14" y="6" width="${p.length_q/4*u}" height="28" rx="6" fill="#8BD3A8" stroke="${INK}" stroke-width="2"/><rect x="14" y="44" width="${n*u}" height="50" fill="#FFF4D6" stroke="${INK}" stroke-width="2"/>`;
    for(let k=0;k<=n*4;k++){const x=14+k*u/4,L=k%4===0?24:k%2===0?16:10;o+=`<line x1="${x}" y1="44" x2="${x}" y2="${44+L}" stroke="${INK}" stroke-width="${k%4?1.5:2.5}"/>`; if(k%4===0)o+=T(x,88,k/4,`font-size="16" fill="${INK}"`);}
    o+=T(W-40,24,'inches',`font-size="15" fill="#5D6B85"`);
    return `<svg viewBox="0 0 ${W} 100" width="${W}" height="100" role="img" aria-label="Ruler in quarter inches">${o}</svg>`; }
  // one bar (optionally not starting at 0), or several labelled bars over the same ruler (p.bars = [{start, length, label}])
  const u=56,L=30,W=10*u+L+20, bars = p.bars || [{ start: p.start || 0, length: p.length }], cols = ['#8BD3A8', '#FFC27A', '#9CC4F0'];
  const top = 6, rh = 34, ry = top + bars.length * rh + 4;
  let o = '';
  bars.forEach((bb, k) => { o += `<rect x="${L + (bb.start||0)*u}" y="${top + k*rh}" width="${bb.length*u}" height="26" rx="6" fill="${cols[k % 3]}" stroke="${INK}" stroke-width="2"/>`;
    if (bb.label) o += T(14, top + k*rh + 19, esc(bb.label), `font-size="16" fill="${INK}"`); });
  o += `<rect x="${L}" y="${ry}" width="${10*u}" height="46" fill="#FFF4D6" stroke="${INK}" stroke-width="2"/>`;
  for(let i=0;i<=10;i++){o+=`<line x1="${L+i*u}" y1="${ry}" x2="${L+i*u}" y2="${ry+20}" stroke="${INK}" stroke-width="2"/>`+T(L+i*u,ry+40,i,`font-size="16" fill="${INK}"`); if(i<10)o+=`<line x1="${L+i*u+u/2}" y1="${ry}" x2="${L+i*u+u/2}" y2="${ry+12}" stroke="${INK}" stroke-width="1.5"/>`;}
  if (bars.length === 1 && (bars[0].start||0) > 0) o += `<line x1="${L+bars[0].start*u}" y1="${top+26}" x2="${L+bars[0].start*u}" y2="${ry}" stroke="${INK}" stroke-width="1.5" stroke-dasharray="4 3"/><line x1="${L+(bars[0].start+bars[0].length)*u}" y1="${top+26}" x2="${L+(bars[0].start+bars[0].length)*u}" y2="${ry}" stroke="${INK}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  o+=T(W-30,ry-6,p.unit==='cm'?'cm':'inches',`font-size="15" fill="#5D6B85"`);
  const H = ry + 52;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Ruler">${o}</svg>`;
}
const COINS={1:{r:30,f:'#C9824E',e:'#8A5230',t:'ONE CENT',n:'penny'},5:{r:34,f:'#C8CDD3',e:'#6B7480',t:'FIVE CENTS',n:'nickel'},
  10:{r:27,f:'#D7DBE0',e:'#6B7480',t:'ONE DIME',n:'dime'},25:{r:40,f:'#CDD2D8',e:'#6B7480',t:'QUARTER',n:'quarter'}};
const COIN_IMG = Object.fromEntries(['penny','nickel','dime','quarter'].flatMap(c => ['heads','tails'].map(f => [`${c}-${f}`, `/coins/${c}-${f}.webp`])));
const BILL_IMG = Object.fromEntries([1,5,10,20,50,100].map(v => [v, `/bills/usd-${v}.webp`]));   // real bill photos, front only, shown small   // real coin pictures, heads and tails
function coins(p){
  if((p.bills||[]).length && p.bills.every(b=>BILL_IMG[b])){
    const bills=p.bills.map(b=>`<img src="${BILL_IMG[b]}" alt="$${b} bill" style="width:210px;height:auto;border:1px solid #9AA5B8;border-radius:3px">`).join('');
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px"><div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">${bills}</div>${coins({...p,bills:[]})}</div>`;
  }
  let x=0,o='';
  (p.bills||[]).forEach(b=>{ if(BILL_IMG[b]){ o+=`<image href="${BILL_IMG[b]}" x="${x+4}" y="14" width="150" height="64" preserveAspectRatio="none"/><rect x="${x+4}" y="14" width="150" height="64" fill="none" stroke="#9AA5B8" stroke-width="1"/>`; x+=160; return; } const five=b===5,f=five?'#E3D7F3':'#DCEBD3',e=five?'#5E3F8C':'#4F7A45',tx=five?'#3E2468':'#2F4F2A',w=five?'FIVE DOLLARS':'ONE DOLLAR';
    o+=`<rect x="${x+4}" y="10" width="150" height="72" rx="6" fill="${f}" stroke="${e}" stroke-width="3"/><rect x="${x+12}" y="18" width="134" height="56" rx="4" fill="none" stroke="${e}" stroke-opacity=".5" stroke-width="1.5"/>`+
    T(x+79,48,'$'+b,`font-size="26" fill="${tx}"`)+T(x+79,68,w,`font-size="10" fill="${tx}" letter-spacing="1"`)+T(x+24,34,b,`font-size="15" fill="${tx}"`)+T(x+134,74,b,`font-size="15" fill="${tx}"`); x+=160;}); p.coins.forEach((v,i)=>{const c=COINS[v], face=(p.faces&&p.faces[i])||'heads', img=COIN_IMG[`${c.n}-${face}`]; x+=c.r+8;
    if(img) o+=`<image href="${img}" x="${x-c.r}" y="${48-c.r}" width="${2*c.r}" height="${2*c.r}"/>`;
    else o+=`<circle cx="${x}" cy="48" r="${c.r}" fill="${c.f}" stroke="${c.e}" stroke-width="3"/>`+T(x,52,c.t,`font-size="9" fill="${INK}"`);
    x+=c.r+8;});
  const k = (p.bills&&p.bills.length) ? Math.min(1.5, 760/x) : p.coins.length===1 ? 2.6 : 1.8;   // relative sizes stay true to real coins
  return `<svg viewBox="0 0 ${x} 96" width="${x*k}" height="${96*k}" role="img" aria-label="Coins">${o}</svg>`;
}
function calendarV(p){
  const cw=58,ch=44,names=['S','M','T','W','T','F','S'],M=['January','February','March','April','May','June','July','August','September','October','November','December'];
  let o=T(7*cw/2,26,`${M[p.month-1]} ${p.year}`,`font-size="22" fill="${INK}"`);
  names.forEach((n,i)=>o+=T(i*cw+cw/2,60,n,`font-size="16" fill="#5D6B85"`));
  for(let d=1;d<=p.days;d++){const k=p.first_weekday+d-1,c=k%7,r=Math.floor(k/7),x=c*cw,y=72+r*ch,h=d===p.highlight||d===p.highlight_from;
    o+=`<rect x="${x+2}" y="${y}" width="${cw-4}" height="${ch-4}" rx="6" fill="${h?'#FFF1E6':'#fff'}" stroke="${h?ACC:LINE}" stroke-width="2"/>`+T(x+cw/2,y+27,d,`font-size="17" fill="${h?ACC:INK}"`);}
  const rows=Math.ceil((p.first_weekday+p.days)/7); return `<svg viewBox="0 0 ${7*cw} ${72+rows*ch}" width="${7*cw}" height="${72+rows*ch}" role="img" aria-label="Calendar">${o}</svg>`;
}
function poly(n,c,r,rot=-90){return [...Array(n).keys()].map(i=>{const a=(rot+i*360/n)*Math.PI/180;return `${c+r*Math.cos(a)},${c+r*Math.sin(a)}`}).join(' ');}
function shapeInner(s,S,st){
  const c=S/2,r=S/2-8;
  if(s==='circle') return `<circle cx="${c}" cy="${c}" r="${r}" ${st}/>`;
  if(s==='oval') return `<ellipse cx="${c}" cy="${c}" rx="${r}" ry="${r*.62}" ${st}/>`;
  if(s==='square') return `<rect x="${c-r*.75}" y="${c-r*.75}" width="${r*1.5}" height="${r*1.5}" ${st}/>`;
  if(s==='rectangle') return `<rect x="8" y="${c-r*.5}" width="${S-16}" height="${r}" ${st}/>`;
  if(s==='triangle') return `<polygon points="${poly(3,c,r)}" ${st}/>`;
  if(s==='pentagon') return `<polygon points="${poly(5,c,r)}" ${st}/>`;
  if(s==='octagon') return `<polygon points="${poly(8,c,r,-67.5)}" ${st}/>`;
  if(s==='right triangle') return `<polygon points="14,14 14,${S-14} ${S-14},${S-14}" ${st}/>`;
  if(s==='hexagon') return `<polygon points="${poly(6,c,r,0)}" ${st}/>`;
  if(s==='rhombus') return `<polygon points="${c},8 ${S-20},${c} ${c},${S-8} 20,${c}" ${st}/>`;
  if(s==='trapezoid') return `<polygon points="${S*.3},${S*.25} ${S*.7},${S*.25} ${S-8},${S*.75} 8,${S*.75}" ${st}/>`;
  if(s==='parallelogram') return `<polygon points="${S*.32},${S*.28} ${S-8},${S*.28} ${S*.68},${S*.72} 8,${S*.72}" ${st}/>`;
  return '';
}
function shape2d(s, small){
  const S=small?110:170, st=`fill="#BFD9F7" stroke="${INK}" stroke-width="4" stroke-linejoin="round"`;
  return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="Shape">${shapeInner(s,S,st)}</svg>`;
}
function shape3d(s, small){
  const st=`fill="#BFD9F7" stroke="${INK}" stroke-width="3" stroke-linejoin="round"`, dk=`fill="#8DBBEA" stroke="${INK}" stroke-width="3" stroke-linejoin="round"`; let d='';
  if(s==='cube') d=`<polygon points="40,70 120,70 120,150 40,150" ${st}/><polygon points="40,70 70,40 150,40 120,70" ${dk}/><polygon points="120,70 150,40 150,120 120,150" ${dk}/>`;
  else if(s==='rectangular prism'||s==='cuboid') d=`<polygon points="20,80 140,80 140,150 20,150" ${st}/><polygon points="20,80 50,50 170,50 140,80" ${dk}/><polygon points="140,80 170,50 170,120 140,150" ${dk}/>`;
  else if(s==='sphere') d=`<circle cx="95" cy="95" r="65" ${st}/><ellipse cx="95" cy="95" rx="65" ry="18" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5"/>`;
  else if(s==='cylinder') d=`<path d="M45,45 L45,145 A50,16 0 0 0 145,145 L145,45" ${st}/><ellipse cx="95" cy="45" rx="50" ry="16" ${dk}/>`;
  else if(s==='cone') d=`<path d="M95,25 L45,145 A50,16 0 0 0 145,145 Z" ${st}/><ellipse cx="95" cy="145" rx="50" ry="16" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5"/>`;
  else if(s==='pyramid') d=`<polygon points="95,25 35,140 120,160" ${st}/><polygon points="95,25 120,160 165,130" ${dk}/>`;
  const W=small?120:190, Hh=small?110:175;
  return `<svg viewBox="0 0 190 175" width="${W}" height="${Hh}" role="img" aria-label="Solid shape">${d}</svg>`;
}
function arrow(dir){const rot={up:0,right:90,down:180,left:270}[dir];
  return `<svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="Arrow"><g transform="rotate(${rot} 80 80)"><rect x="66" y="60" width="28" height="80" rx="6" fill="${SKY}"/><polygon points="80,14 130,70 30,70" fill="${SKY}"/></g></svg>`;}
function flag(f, small){const S=small?100:150, rot={right:0,down:90,left:0,up:-90}[f], flip=f==='left';
  return `<svg viewBox="0 0 150 150" width="${S}" height="${S}" role="img" aria-label="Flag"><g transform="rotate(${rot} 75 75) ${flip?'translate(150 0) scale(-1 1)':''}"><rect x="34" y="18" width="8" height="118" rx="3" fill="${INK}"/><polygon points="42,20 124,46 42,74" fill="${ACC}"/><circle cx="64" cy="46" r="7" fill="#fff"/></g></svg>`;}
function tallyMarks(n,x0,y){let o='',x=x0;for(let g=0;g<Math.floor(n/5);g++){for(let k=0;k<4;k++)o+=`<line x1="${x+k*12}" y1="${y-16}" x2="${x+k*12}" y2="${y+16}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;o+=`<line x1="${x-6}" y1="${y+12}" x2="${x+42}" y2="${y-12}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;x+=64;}
  for(let k=0;k<n%5;k++)o+=`<line x1="${x+k*12}" y1="${y-16}" x2="${x+k*12}" y2="${y+16}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;return o;}
function tally(p){const rh=56,W=470;let o=T(W/2,24,esc(p.title),`font-size="20" fill="${INK}"`);
  p.rows.forEach((r,i)=>{const y=44+i*rh;o+=`<rect x="1" y="${y}" width="${W-2}" height="${rh}" fill="#fff" stroke="${LINE}" stroke-width="2"/><line x1="150" y1="${y}" x2="150" y2="${y+rh}" stroke="${LINE}" stroke-width="2"/>`+T(75,y+35,esc(r.label),`font-size="20" fill="${INK}"`)+tallyMarks(r.count,172,y+rh/2);});
  return `<svg viewBox="0 0 ${W} ${48+p.rows.length*rh}" width="${W}" height="${48+p.rows.length*rh}" role="img" aria-label="Tally chart">${o}</svg>`;}
function pictograph(p){const key=p.key||1,rh=54,W=600;let o=T(W/2,24,esc(p.title),`font-size="20" fill="${INK}"`);
  p.rows.forEach((r,i)=>{const y=44+i*rh,icon=[...r.label][0];o+=`<rect x="1" y="${y}" width="${W-2}" height="${rh}" fill="#fff" stroke="${LINE}" stroke-width="2"/><line x1="140" y1="${y}" x2="140" y2="${y+rh}" stroke="${LINE}" stroke-width="2"/>`+T(70,y+34,esc(r.label.split(' ').slice(1).join(' ')),`font-size="18" fill="${INK}"`);
    const whole=Math.floor(r.count/key), half=(r.count%key)!==0;
    for(let k=0;k<whole;k++)o+=T(166+k*44,y+38,icon,'font-size="30"');
    if(half){const cx=166+whole*44;o+=`<clipPath id="hp${i}"><rect x="${cx-22}" y="${y}" width="22" height="${rh}"/></clipPath><g clip-path="url(#hp${i})">${T(cx,y+38,icon,'font-size="30"')}</g>`;}});
  o+=T(W/2,48+p.rows.length*rh+22,`Each picture = ${key} vote${key>1?'s':''}`,`font-size="16" fill="#5D6B85"`);
  return `<svg viewBox="0 0 ${W} ${80+p.rows.length*rh}" width="${W}" height="${80+p.rows.length*rh}" role="img" aria-label="Pictograph">${o}</svg>`;}
function barChart(p){const n=p.bars.length,step=p.step||1,W=Math.max(460,90+n*100),H=330,l=50,b=270,top=40,u=(b-top)/p.max,bw=Math.min(80,(W-l-40)/n-30);let o=T(W/2,24,esc(p.title),`font-size="20" fill="${INK}"`);
  for(let v=0;v<=p.max;v+=step){const y=b-v*u;o+=`<line x1="${l}" y1="${y}" x2="${W-10}" y2="${y}" stroke="${v?LINE:INK}" stroke-width="${v?1:3}"/>`+T(l-20,y+6,v,`font-size="14" fill="${INK}"`);}
  p.bars.forEach((r,i)=>{const x=l+30+i*(bw+30),h=r.value*u;o+=`<rect x="${x}" y="${b-h}" width="${bw}" height="${h}" fill="${['#FF9F66','#7FB2EC','#8BD3A8','#F2C14E'][i%4]}" stroke="${INK}" stroke-width="2"/>`+T(x+bw/2,b+26,[...r.label][0],'font-size="24"')+T(x+bw/2,b+50,esc(r.label.split(' ').slice(1).join(' ')),`font-size="14" fill="${INK}"`);});
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Bar chart">${o}</svg>`;}
function arrayV(p){ return `<div class="objs"><div class="grp" style="grid-template-columns:repeat(${p.cols},auto)">${Array(p.rows*p.cols).fill(`<span>${p.emoji||'🔵'}</span>`).join('')}</div></div>`; }
function areaGrid(p){const c=40,o=[];const on=p.cells?new Set(p.cells.map(x=>x[0]+','+x[1])):null;
  for(let r=0;r<p.rows;r++)for(let k=0;k<p.cols;k++){const f=!on||on.has(r+','+k); if(f)o.push(`<rect x="${k*c+2}" y="${r*c+2}" width="${c}" height="${c}" fill="#BFD9F7" stroke="${INK}" stroke-width="2"/>`);}
  (p.halves||[]).forEach(([r,k,d])=>{const x=k*c+2,y=r*c+2,P={bl:[[x,y],[x,y+c],[x+c,y+c]],br:[[x+c,y],[x+c,y+c],[x,y+c]],tl:[[x,y],[x+c,y],[x,y+c]],tr:[[x,y],[x+c,y],[x+c,y+c]]}[d];
    o.push(`<rect x="${x}" y="${y}" width="${c}" height="${c}" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="4 4"/><polygon points="${P.map(q=>q.join(',')).join(' ')}" fill="#BFD9F7" stroke="${INK}" stroke-width="2"/>`);});
  return `<svg viewBox="0 0 ${p.cols*c+4} ${p.rows*c+4}" width="${p.cols*c+4}" height="${p.rows*c+4}" role="img" aria-label="Grid of squares">${o.join('')}</svg>`;}
function rectV(p){const sc=Math.min(320/p.w,170/p.h),w=p.w*sc,h=p.h*sc,W=w+120,H=h+70;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Rectangle"><rect x="20" y="10" width="${w}" height="${h}" fill="#BFD9F7" stroke="${INK}" stroke-width="4"/>${T(20+w/2,h+42,`${p.w} ${p.unit}`,`font-size="20" fill="${INK}"`)}${T(w+62,10+h/2+7,`${p.h} ${p.unit}`,`font-size="20" fill="${INK}"`)}</svg>`;}
function fractionLine(p){const M=p.max||1,W=600,l=40,r=W-40,y=50,s=(r-l)/(p.parts*M);let o=`<line x1="${l}" y1="${y}" x2="${r}" y2="${y}" stroke="${INK}" stroke-width="3"/>`;
  for(let k=0;k<=p.parts*M;k++){const x=l+k*s;o+=`<line x1="${x}" y1="${y-12}" x2="${x}" y2="${y+12}" stroke="${INK}" stroke-width="${k%p.parts?2:3}"/>`;}
  for(let w=0;w<=M;w++)o+=T(l+w*p.parts*s,y+40,String(w),`font-size="20" fill="${INK}"`);
  o+=`<circle cx="${l+p.point*s}" cy="${y}" r="11" fill="${ACC}"/>`;
  return `<svg viewBox="0 0 ${W} 100" width="${W}" height="100" role="img" aria-label="Number line from 0 to 1">${o}</svg>`;}
function linePlot(p){const xs=p.values.map(v=>v.x),n=xs.length,W=Math.max(420,n*70+60),step=(W-80)/(n-1),y0=60+Math.max(...p.values.map(v=>v.count))*26;let o='';
  o+=`<line x1="20" y1="${y0}" x2="${W-20}" y2="${y0}" stroke="${INK}" stroke-width="3"/>`;
  p.values.forEach((v,i)=>{const x=40+i*step;o+=`<line x1="${x}" y1="${y0-8}" x2="${x}" y2="${y0+8}" stroke="${INK}" stroke-width="2"/>`+T(x,y0+30,v.x,`font-size="18" fill="${INK}"`);
    for(let k=0;k<v.count;k++)o+=T(x,y0-16-k*26,'✕',`font-size="22" fill="${SKY}"`);});
  o+=T(W/2,y0+58,esc(p.title||''),`font-size="16" fill="#5D6B85"`);
  return `<svg viewBox="0 0 ${W} ${y0+70}" width="${W}" height="${y0+70}" role="img" aria-label="Line plot">${o}</svg>`;}
function angleV(p){const rot=p.degrees>180?(p.rotate||0):Math.min(p.rotate||0,180-p.degrees),cx=110,cy=140,L=95,a1=-rot*Math.PI/180,a2=a1-p.degrees*Math.PI/180;
  const P=a=>[cx+L*Math.cos(a),cy+L*Math.sin(a)],[x1,y1]=P(a1),[x2,y2]=P(a2),ar=34,[ax1,ay1]=[cx+ar*Math.cos(a1),cy+ar*Math.sin(a1)],[ax2,ay2]=[cx+ar*Math.cos(a2),cy+ar*Math.sin(a2)];
  return `<svg viewBox="0 0 220 180" width="220" height="180" role="img" aria-label="Angle"><line x1="${cx}" y1="${cy}" x2="${x1}" y2="${y1}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${ax1},${ay1} A${ar},${ar} 0 ${p.degrees>180?1:0} 0 ${ax2},${ay2}" fill="none" stroke="${ACC}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="5" fill="${INK}"/></svg>`;}
function linesV(p){const t=p.tilt||0;let g;
  const ah=(x,y,d)=>`<polygon points="${x},${y} ${x-14*d},${y-8} ${x-14*d},${y+8}" fill="${INK}"/>`, dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="7" fill="${INK}"/>`;
  if(p.kind==='line') g=`<line x1="30" y1="100" x2="210" y2="100" stroke="${INK}" stroke-width="5"/>${ah(222,100,1)}${ah(18,100,-1)}`;
  else if(p.kind==='segment') g=`<line x1="40" y1="100" x2="200" y2="100" stroke="${INK}" stroke-width="5"/>${dot(40,100)}${dot(200,100)}`;
  else if(p.kind==='ray') g=`<line x1="40" y1="100" x2="210" y2="100" stroke="${INK}" stroke-width="5"/>${dot(40,100)}${ah(222,100,1)}`;
  else if(p.kind==='parallel') g=`<line x1="20" y1="70" x2="220" y2="70" stroke="${INK}" stroke-width="5"/><line x1="20" y1="130" x2="220" y2="130" stroke="${SKY}" stroke-width="5"/>`;
  else if(p.kind==='perpendicular') g=`<line x1="20" y1="100" x2="220" y2="100" stroke="${INK}" stroke-width="5"/><line x1="120" y1="10" x2="120" y2="190" stroke="${SKY}" stroke-width="5"/>`;
  else g=`<line x1="20" y1="100" x2="220" y2="100" stroke="${INK}" stroke-width="5"/><line x1="50" y1="180" x2="190" y2="20" stroke="${SKY}" stroke-width="5"/>`;
  return `<svg viewBox="0 0 240 200" width="240" height="200" role="img" aria-label="Two lines"><g transform="rotate(${t} 120 100)">${g}</g></svg>`;}
function dialV(p){const c=150,R=118,o=[`<rect x="40" y="250" width="220" height="30" rx="8" fill="#C9D3E3" stroke="${INK}" stroke-width="3"/><circle cx="${c}" cy="${c}" r="${R+14}" fill="#F3F6FB" stroke="${INK}" stroke-width="5"/>`];
  const ang=v=>(-135+270*v/p.max)*Math.PI/180;
  for(let v=0;v<=p.max+1e-9;v+=p.minor){const a=ang(v),big=Math.abs(v/p.step-Math.round(v/p.step))<1e-9,r1=big?R-18:R-9;o.push(`<line x1="${c+r1*Math.sin(a)}" y1="${c-r1*Math.cos(a)}" x2="${c+R*Math.sin(a)}" y2="${c-R*Math.cos(a)}" stroke="${INK}" stroke-width="${big?3:1.4}"/>`);
    if(big)o.push(T(c+(R-38)*Math.sin(a),c-(R-38)*Math.cos(a)+6,String(Math.round(v)),`font-size="16" fill="${INK}"`));}
  const a=ang(p.value);o.push(`<line x1="${c}" y1="${c}" x2="${c+(R-12)*Math.sin(a)}" y2="${c-(R-12)*Math.cos(a)}" stroke="${ACC}" stroke-width="5" stroke-linecap="round"/><circle cx="${c}" cy="${c}" r="9" fill="${INK}"/>`,T(c,c+62,esc(p.unit),`font-size="20" fill="#5D6B85"`));
  return `<svg viewBox="0 0 300 285" width="300" height="285" role="img" aria-label="Weighing scale">${o.join('')}</svg>`;}
function yearCalV(p){const M=['January','February','March','April','May','June','July','August','September','October','November','December'],cw=25,ch=20,bw=7*cw+14,bh=26+20+6*ch+8;let o=T(2*bw,22,String(p.year),`font-size="20" fill="${INK}"`);
  const hl=p.highlight||[0,0];
  for(let m=0;m<12;m++){const ox=(m%4)*bw,oy=34+Math.floor(m/4)*bh,first=new Date(p.year,m,1).getDay(),days=new Date(p.year,m+1,0).getDate();
    o+=`<rect x="${ox+2}" y="${oy}" width="${bw-6}" height="${bh-6}" rx="6" fill="#fff" stroke="${LINE}" stroke-width="1.5"/>`+T(ox+bw/2-2,oy+16,M[m],`font-size="15" fill="${INK}"`);
    ['S','M','T','W','T','F','S'].forEach((d,k)=>o+=T(ox+8+k*cw+cw/2,oy+34,d,`font-size="12" fill="#5D6B85"`));
    for(let d=1;d<=days;d++){const k=first+d-1,x=ox+8+(k%7)*cw,y=oy+40+Math.floor(k/7)*ch,h=hl[0]===m+1&&hl[1]===d;
      if(h)o+=`<rect x="${x+1}" y="${y}" width="${cw-2}" height="${ch-1}" rx="3" fill="#FFF1E6" stroke="${ACC}" stroke-width="1.5"/>`;
      o+=T(x+cw/2,y+14,d,`font-size="12" fill="${h?ACC:INK}"`);}}
  return `<svg viewBox="0 0 ${4*bw} ${34+3*bh}" width="${4*bw}" height="${34+3*bh}" role="img" aria-label="Calendar for the year">${o}</svg>`;}
function circleRD(p){const c=110,R=90;let o=`<circle cx="${c}" cy="${c}" r="${R}" fill="#BFD9F7" stroke="${INK}" stroke-width="4"/><circle cx="${c}" cy="${c}" r="5" fill="${INK}"/>`;
  if(p.show==='diameter') o+=`<line x1="${c-R}" y1="${c}" x2="${c+R}" y2="${c}" stroke="${ACC}" stroke-width="5"/>`+(p.label?T(c,c-12,esc(p.label),`font-size="18" fill="${INK}"`):'');
  else o+=`<line x1="${c}" y1="${c}" x2="${c+R*0.71}" y2="${c-R*0.71}" stroke="${ACC}" stroke-width="5"/>`+(p.label?T(c+R*0.36-26,c-R*0.36-6,esc(p.label),`font-size="18" fill="${INK}"`):'');
  return `<svg viewBox="0 0 220 220" width="220" height="220" role="img" aria-label="Circle">${o}</svg>`;}
function anglePairV(p){const cx=60,cy=200,L=230,P=d=>[cx+L*Math.cos(-d*Math.PI/180),cy+L*Math.sin(-d*Math.PI/180)],[x1,y1]=P(p.a),[x2,y2]=P(p.a+p.b);
  let o=`<line x1="${cx}" y1="${cy}" x2="${cx+L}" y2="${cy}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${x1}" y2="${y1}" stroke="${SKY}" stroke-width="5" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  const arc=(d1,d2,r,c)=>{const a1=-d1*Math.PI/180,a2=-d2*Math.PI/180;return `<path d="M${cx+r*Math.cos(a1)},${cy+r*Math.sin(a1)} A${r},${r} 0 0 0 ${cx+r*Math.cos(a2)},${cy+r*Math.sin(a2)}" fill="none" stroke="${c}" stroke-width="4"/>`;};
  o+=arc(0,p.a,48,ACC)+arc(p.a,p.a+p.b,70,'#7FB2EC');
  const lab=(d,r,t)=>T(cx+r*Math.cos(-d*Math.PI/180),cy+r*Math.sin(-d*Math.PI/180)+6,esc(t),`font-size="19" fill="${INK}"`);
  o+=lab(p.a/2,p.a<30?140:100,p.labels[0])+lab(p.a+p.b/2,p.b<30?160:125,p.labels[1]);
  if(p.right) o+=`<polyline points="${cx+18},${cy} ${cx+18},${cy-18} ${cx},${cy-18}" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
  o+=`<circle cx="${cx}" cy="${cy}" r="6" fill="${INK}"/>`;
  const minY=Math.min(y1,y2,cy)-10, maxX=Math.max(x1,x2,cx+L)+10, minX=Math.min(x1,x2,cx)-10;
  return `<svg viewBox="${minX} ${minY} ${maxX-minX} ${cy+20-minY}" width="${Math.min(460,maxX-minX)}" role="img" aria-label="Two angles side by side">${o}</svg>`;}
function venn3V(p){const R=p.regions,W=520,H=440,c=[[200,170],[320,170],[260,275]],r=110;let o=`<rect x="2" y="2" width="${W-4}" height="${H-4}" rx="14" fill="#fff" stroke="${LINE}" stroke-width="2"/>`;
  const cols=['#FF9F66','#7FB2EC','#8BD3A8'];c.forEach(([x,y],k)=>o+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${cols[k]}" fill-opacity=".22" stroke="${cols[k]}" stroke-width="3"/>`);
  o+=T(120,40,esc(p.labels[0]),`font-size="18" fill="${INK}"`)+T(400,40,esc(p.labels[1]),`font-size="18" fill="${INK}"`)+T(260,418,esc(p.labels[2]),`font-size="18" fill="${INK}"`);
  const put=(x,y,v)=>T(x,y,v,`font-size="24" fill="${INK}"`);
  o+=put(160,150,R.a)+put(360,150,R.b)+put(260,330,R.c)+put(260,130,R.ab)+put(200,245,R.ac)+put(320,245,R.bc)+put(260,205,R.abc)+put(470,410,R.none)+T(470,385,'none',`font-size="13" fill="#5D6B85"`);
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Venn diagram with three circles">${o}</svg>`;}
function factorTreeV(p){const W=440,H=260;let o='';const box=(x,y,t)=>`<rect x="${x-30}" y="${y-22}" width="60" height="40" rx="10" fill="${t==='?'?'#FFF1E6':'#fff'}" stroke="${t==='?'?ACC:INK}" stroke-width="3"/>`+T(x,y+8,t,`font-size="22" fill="${t==='?'?ACC:INK}"`);
  const walk=(n,x,y,dx)=>{if(n.k){n.k.forEach((ch,j)=>{const nx=x+(j?dx:-dx),ny=y+90;o+=`<line x1="${x}" y1="${y+18}" x2="${nx}" y2="${ny-22}" stroke="${INK}" stroke-width="2.5"/>`;walk(ch,nx,ny,dx/2);});}o+=box(x,y,String(n.n));};
  walk(p.tree,W/2,30,110);return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Factor tree">${o}</svg>`;}
const DCOL=['#FF9F66','#7FB2EC'];
function dKey(p,W){return p.series.map((sr,k)=>`<rect x="${W-190+k*95}" y="40" width="16" height="16" fill="${DCOL[k]}" stroke="${INK}" stroke-width="1.5"/>`+T(W-140+k*95,53,esc(sr.name),`font-size="13" fill="${INK}"`)).join('');}
function doubleBarV(p){const n=p.labels.length,W=Math.max(520,100+n*95),H=350,l=56,b=290,top=70,u=(b-top)/p.max,gw=(W-l-30)/n,bw=Math.min(30,gw/2-8);let o=T(W/2,24,esc(p.title),`font-size="19" fill="${INK}"`)+dKey(p,W);
  for(let v=0;v<=p.max;v+=p.step){const y=b-v*u;o+=`<line x1="${l}" y1="${y}" x2="${W-10}" y2="${y}" stroke="${v?LINE:INK}" stroke-width="${v?1:3}"/>`+T(l-22,y+5,v,`font-size="13" fill="${INK}"`);}
  p.labels.forEach((lb,i)=>{const x0=l+i*gw+gw/2-bw;p.series.forEach((sr,k)=>{const h=sr.values[i]*u;o+=`<rect x="${x0+k*bw}" y="${b-h}" width="${bw}" height="${h}" fill="${DCOL[k]}" stroke="${INK}" stroke-width="1.5"/>`;});o+=T(l+i*gw+gw/2,b+24,esc(lb),`font-size="14" fill="${INK}"`);});
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Double bar graph">${o}</svg>`;}
function doubleLineV(p){const n=p.labels.length,W=560,H=350,l=56,b=290,top=70,u=(b-top)/p.max,dx=(W-l-60)/(n-1);let o=T(W/2,24,esc(p.title),`font-size="19" fill="${INK}"`)+dKey(p,W);
  for(let v=0;v<=p.max;v+=p.step){const y=b-v*u;o+=`<line x1="${l}" y1="${y}" x2="${W-20}" y2="${y}" stroke="${v?LINE:INK}" stroke-width="${v?1:3}"/>`+T(l-22,y+5,v,`font-size="13" fill="${INK}"`);}
  p.series.forEach((sr,k)=>{const P=sr.values.map((v,i)=>[l+20+i*dx,b-v*u]);o+=`<polyline points="${P.map(x=>x.join(',')).join(' ')}" fill="none" stroke="${DCOL[k]}" stroke-width="4" ${k?'stroke-dasharray="10 6"':''}/>`;
    P.forEach(([x,y])=>o+=k?`<rect x="${x-6}" y="${y-6}" width="12" height="12" fill="${DCOL[k]}" stroke="${INK}" stroke-width="1.5"/>`:`<circle cx="${x}" cy="${y}" r="6" fill="${DCOL[k]}" stroke="${INK}" stroke-width="1.5"/>`);});
  p.labels.forEach((lb,i)=>o+=T(l+20+i*dx,b+24,esc(lb),`font-size="14" fill="${INK}"`));
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Double line graph">${o}</svg>`;}
function netV(p, small){const u=small?32:44;let o='',W,H;const sq=(c,r,w,h)=>`<rect x="${10+c*u}" y="${10+r*u}" width="${(w||1)*u}" height="${(h||1)*u}" fill="#BFD9F7" stroke="${INK}" stroke-width="2.5"/>`;
  const tri=(pts)=>`<polygon points="${pts.map(([x,y])=>`${10+x*u},${10+y*u}`).join(' ')}" fill="#BFD9F7" stroke="${INK}" stroke-width="2.5"/>`;
  const cells=p.kind==='cells'?p.cells:p.kind==='cube'?[[0,1],[1,0],[1,1],[1,2],[1,3],[2,1]]:null;
  if(cells){cells.forEach(([r,c])=>o+=sq(c,r));W=20+u*(1+Math.max(...cells.map(x=>x[1])));H=20+u*(1+Math.max(...cells.map(x=>x[0])));}
  else if(p.kind==='rectangular prism'){o+=sq(0,1,1,1.5)+sq(1,1,2,1.5)+sq(3,1,1,1.5)+sq(4,1,2,1.5)+sq(1,0,2,1)+sq(1,2.5,2,1);W=20+6*u;H=20+3.5*u;}
  else if(p.kind==='triangular prism'){o+=sq(1,1,1.5,1)+sq(1,2,1.5,1)+sq(1,3,1.5,1)+tri([[1,1],[1,2],[0.1,1.5]])+tri([[2.5,1],[2.5,2],[3.4,1.5]]);W=20+3.6*u;H=20+4.2*u;o=o.replace(/height="0"/g,'');}
  else if(p.kind==='square pyramid'){o+=sq(1,1)+tri([[1,1],[2,1],[1.5,0]])+tri([[1,2],[2,2],[1.5,3]])+tri([[1,1],[1,2],[0,1.5]])+tri([[2,1],[2,2],[3,1.5]]);W=20+3*u;H=20+3*u;}
  else if(p.kind==='triangular pyramid'){o+=tri([[0,2],[2,2],[1,0.27]])+tri([[2,2],[4,2],[3,0.27]])+tri([[1,0.27],[3,0.27],[2,2]])+tri([[0,2],[4,2],[2,3.73]]).replace(/.*/,'')+tri([[0,2],[2,2],[1,3.73]]);W=20+4*u;H=20+3.8*u;}
  else if(p.kind==='cylinder'){o+=sq(0.6,1.2,3,1.6)+`<circle cx="${10+2.1*u}" cy="${10+0.6*u}" r="${0.6*u}" fill="#BFD9F7" stroke="${INK}" stroke-width="2.5"/><circle cx="${10+2.1*u}" cy="${10+3.4*u}" r="${0.6*u}" fill="#BFD9F7" stroke="${INK}" stroke-width="2.5"/>`;W=20+4.2*u;H=20+4*u;}
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Net of a solid">${o}</svg>`;}
function symmetryV(p){const S=180,c=S/2,st=`fill="#BFD9F7" stroke="${INK}" stroke-width="4" stroke-linejoin="round"`;
  const ln=p.line==='vertical'?`<line x1="${c}" y1="0" x2="${c}" y2="${S}"/>`:p.line==='horizontal'?`<line x1="0" y1="${c}" x2="${S}" y2="${c}"/>`:
    (p.shape==='rectangle'?`<line x1="8" y1="${c-41}" x2="${S-8}" y2="${c+41}"/>`:`<line x1="${c-62}" y1="${c-62}" x2="${c+62}" y2="${c+62}"/>`);
  return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="Shape with a dashed line">${shapeInner(p.shape,S,st)}<g stroke="${ACC}" stroke-width="4" stroke-dasharray="10 7">${ln}</g></svg>`;}

function emojiPic(p, small){const S=small?110:170, f=p.flip==='h'?'scale(-1 1)':p.flip==='v'?'scale(1 -1)':'';
  return `<svg viewBox="0 0 120 120" width="${S}" height="${S}" role="img" aria-label="Picture"><g transform="translate(60 60) rotate(${p.rotate||0}) ${f}"><text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="84">${p.e}</text></g></svg>`;}

function colNums(p){const f=n=>Number(n).toLocaleString('en-US');const ns=p.nums;
  return `<div class="colsum">${ns.map((n,i)=>`<span>${i===ns.length-1?p.op+' ':''}${f(n)}</span>`).join('')}<span class="ln"></span></div>`;}
function longDiv(p){const fs=34,cw=21,dv=String(p.divisor),dd=String(p.dividend),L=16+dv.length*cw,W=L+30+dd.length*cw+24,H=84;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:${W}px;height:auto" role="img" aria-label="Long division: ${dd} divided by ${dv}"><text x="${L}" y="58" text-anchor="end" font-family="Courier New,monospace" font-weight="700" font-size="${fs}" fill="${INK}">${dv}</text><path d="M${L+8},20 Q${L+19},44 ${L+8},70" fill="none" stroke="${INK}" stroke-width="3"/><line x1="${L+8}" y1="20" x2="${W-6}" y2="20" stroke="${INK}" stroke-width="3"/><text x="${L+20}" y="58" font-family="Courier New,monospace" font-weight="700" font-size="${fs}" fill="${INK}">${dd}</text></svg>`;}
function polyV(p){const W=380,H=270,a=(p.rotate||0)*Math.PI/180;
  let pts=p.pts.map(([x,y])=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]);
  const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),mnx=Math.min(...xs),mxx=Math.max(...xs),mny=Math.min(...ys),mxy=Math.max(...ys),s=Math.min((W-110)/(mxx-mnx||1),(H-80)/(mxy-mny||1));
  const ox=(W-(mxx-mnx)*s)/2, oy=(H-(mxy-mny)*s)/2;
  const P=pts.map(([x,y])=>[ox+(x-mnx)*s,H-oy-(y-mny)*s]);
  const inside=(x,y)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,yi]=P[i],[xj,yj]=P[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;};
  let o=`<polygon points="${P.map(q=>q.join(',')).join(' ')}" fill="#BFD9F7" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  [].concat(p.right_at===undefined?[]:p.right_at).forEach(k=>{const n=P.length,[x0,y0]=P[k],[xa,ya]=P[(k+1)%n],[xb,yb]=P[(k-1+n)%n],u=(x,y)=>{const L=Math.hypot(x,y)||1;return [x/L*16,y/L*16];},[ux,uy]=u(xa-x0,ya-y0),[vx,vy]=u(xb-x0,yb-y0);
    o+=`<polyline points="${x0+ux},${y0+uy} ${x0+ux+vx},${y0+uy+vy} ${x0+vx},${y0+vy}" fill="none" stroke="${INK}" stroke-width="2.5"/>`;});
  (p.labels||[]).forEach((l,k)=>{const [x1,y1]=P[k],[x2,y2]=P[(k+1)%P.length];const mx=(x1+x2)/2,my=(y1+y2)/2,L=Math.hypot(x2-x1,y2-y1)||1;let nx=(y2-y1)/L,ny=-(x2-x1)/L;
    if(inside(mx+nx*4,my+ny*4)){nx=-nx;ny=-ny;} const d=Math.abs(nx)>0.7?30:16;o+=T(mx+nx*d,my+ny*d+6,esc(l),`font-size="17" fill="${INK}"`);});
  if(p.height){const tf=([x,y])=>{const rx=x*Math.cos(a)-y*Math.sin(a),ry=x*Math.sin(a)+y*Math.cos(a);return [ox+(rx-mnx)*s,H-oy-(ry-mny)*s];};const [h1,h2]=p.height.map(tf);
    o+=`<line x1="${h1[0]}" y1="${h1[1]}" x2="${h2[0]}" y2="${h2[1]}" stroke="${ACC}" stroke-width="3" stroke-dasharray="7 5"/><polyline points="${h1[0]+12},${h1[1]} ${h1[0]+12},${h1[1]-12} ${h1[0]},${h1[1]-12}" fill="none" stroke="${ACC}" stroke-width="2"/>`;
    if(p.hlabel)o+=T(h1[0]+14+String(p.hlabel).length*4.2,(h1[1]+h2[1])/2+6,esc(p.hlabel),`font-size="16" fill="${ACC}"`);}
  if(p.right_angle!=null){const k=p.right_angle,[x,y]=P[k],[ax,ay]=P[(k+1)%P.length],[bx,by]=P[(k+P.length-1)%P.length];const u=(qx,qy)=>{const d=Math.hypot(qx-x,qy-y);return [(qx-x)/d*16,(qy-y)/d*16]};const [ux,uy]=u(ax,ay),[vx,vy]=u(bx,by);o+=`<path d="M${x+ux},${y+uy} L${x+ux+vx},${y+uy+vy} L${x+vx},${y+vy}" fill="none" stroke="${INK}" stroke-width="2"/>`;}
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Shape">${o}</svg>`;}
function coordV(p){const m=p.max,u=30,L=40,B=40+m*u,W=L+m*u+30;let o='';
  for(let k=0;k<=m;k++){o+=`<line x1="${L+k*u}" y1="40" x2="${L+k*u}" y2="${B}" stroke="${LINE}" stroke-width="1"/><line x1="${L}" y1="${B-k*u}" x2="${L+m*u}" y2="${B-k*u}" stroke="${LINE}" stroke-width="1"/>`;o+=T(L+k*u,B+20,k,`font-size="12" fill="${INK}"`)+T(L-14,B-k*u+4,k,`font-size="12" fill="${INK}"`);}
  o+=`<line x1="${L}" y1="${B}" x2="${L+m*u+10}" y2="${B}" stroke="${INK}" stroke-width="2.5"/><line x1="${L}" y1="${B}" x2="${L}" y2="30" stroke="${INK}" stroke-width="2.5"/>`+T(L+m*u+20,B+4,'x',`font-size="15" fill="${INK}"`)+T(L,22,'y',`font-size="15" fill="${INK}"`);
  p.points.forEach(q=>{const x=L+q.x*u,y=B-q.y*u;o+=`<circle cx="${x}" cy="${y}" r="6" fill="${ACC}" stroke="${INK}" stroke-width="1.5"/>`+T(x+11,y-8,q.label,`font-size="16" fill="${INK}"`);});
  return `<svg viewBox="0 0 ${W} ${B+34}" width="${W}" height="${B+34}" role="img" aria-label="Coordinate grid">${o}</svg>`;}
function cubesV(p){const s=26,dx=s*0.5,dy=s*0.35;let o='';const W=p.l*s+p.w*dx+20,H=p.h*s+p.w*dy+20;
  const face=(pts,fill)=>`<polygon points="${pts.map(q=>q.join(',')).join(' ')}" fill="${fill}" stroke="${INK}" stroke-width="1.5"/>`;
  for(let z=0;z<p.h;z++)for(let y=p.w-1;y>=0;y--)for(let x=0;x<p.l;x++){const ox=10+x*s+y*dx,oy=H-10-z*s-y*dy;
    if(y===0)o+=face([[ox,oy],[ox+s,oy],[ox+s,oy-s],[ox,oy-s]],'#BFD9F7');
    if(z===p.h-1)o+=face([[ox,oy-s],[ox+s,oy-s],[ox+s+dx,oy-s-dy],[ox+dx,oy-s-dy]],'#DCEAFB');
    if(x===p.l-1)o+=face([[ox+s,oy],[ox+s+dx,oy-dy],[ox+s+dx,oy-s-dy],[ox+s,oy-s]],'#8DBBEA');}
  return `<svg viewBox="0 0 ${W} ${H}" width="${Math.min(360,W*1.6)}" height="${Math.min(300,H*1.6)}" role="img" aria-label="Box of unit cubes">${o}</svg>`;}
function stemLeaf(p){const rh=38,W=360;let o=T(W/2,22,esc(p.title),`font-size="18" fill="${INK}"`)+T(60,56,'Stem',`font-size="15" fill="#5D6B85"`)+T(200,56,'Leaf',`font-size="15" fill="#5D6B85"`);
  o+=`<line x1="20" y1="66" x2="${W-20}" y2="66" stroke="${INK}" stroke-width="2"/><line x1="100" y1="40" x2="100" y2="${70+p.rows.length*rh}" stroke="${INK}" stroke-width="2"/>`;
  p.rows.forEach((r,i)=>{const y=94+i*rh;o+=T(60,y,r.stem,`font-size="22" fill="${INK}"`);r.leaves.forEach((l,k)=>o+=T(126+k*34,y,l,`font-size="22" fill="${INK}"`));});
  o+=T(W/2,92+p.rows.length*rh,'Key: '+esc(p.key),`font-size="14" fill="#5D6B85"`);
  return `<svg viewBox="0 0 ${W} ${104+p.rows.length*rh}" width="${W}" height="${104+p.rows.length*rh}" role="img" aria-label="Stem and leaf plot">${o}</svg>`;}
function shapeSized(p){const S=150,st=`fill="#BFD9F7" stroke="${INK}" stroke-width="${4/p.scale}" stroke-linejoin="round"`;
  return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="Shape"><g transform="translate(${S/2} ${S/2}) rotate(${p.rotate||0}) scale(${p.scale*0.62*(p.sx||1)} ${p.scale*0.62*(p.sy||1)}) translate(${-S/2} ${-S/2})">${shapeInner(p.shape,S,st)}</g></svg>`;}
function itemsV(side,x,y){let o='';const n=side.count,cols=Math.min(n,3);for(let k=0;k<n;k++){const cx=x+((k%cols)-(cols-1)/2)*30,cy=y-Math.floor(k/cols)*28;o+=T(cx,cy,side.emoji,`font-size="${n>1?26:40}"`);}return o;}
function balanceV(p){const t={left:10,right:-10,level:0}[p.tilt],W=360,c=W/2,py=70,L=130,rad=t*Math.PI/180,lx=c-L*Math.cos(rad),ly=py+L*Math.sin(rad),rx=c+L*Math.cos(rad),ry=py-L*Math.sin(rad);
  let o=`<polygon points="${c},${py} ${c-34},200 ${c+34},200" fill="#C9D3E3" stroke="${INK}" stroke-width="3"/><line x1="${lx}" y1="${ly}" x2="${rx}" y2="${ry}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><circle cx="${c}" cy="${py}" r="7" fill="${INK}"/>`;
  [[lx,ly,p.left],[rx,ry,p.right]].forEach(([x,y,sd])=>{o+=`<line x1="${x}" y1="${y}" x2="${x}" y2="${y+40}" stroke="${INK}" stroke-width="2"/><path d="M${x-50},${y+40} Q${x},${y+66} ${x+50},${y+40} Z" fill="#FFE2B8" stroke="${INK}" stroke-width="3"/>`+itemsV(sd,x,y+34);});
  return `<svg viewBox="0 -20 ${W} 230" width="${W}" height="230" role="img" aria-label="Balance scale">${o}</svg>`;}
function cupV(p){const H=220,top=30,bot=200,x=60,w=130,u=(bot-top)/p.max;let o=`<rect x="${x}" y="${bot-p.value*u}" width="${w}" height="${p.value*u}" fill="#9FD0F5"/>`;
  o+=`<path d="M${x},${top-10} L${x},${bot} Q${x},${bot+10} ${x+10},${bot+10} L${x+w-10},${bot+10} Q${x+w},${bot+10} ${x+w},${bot} L${x+w},${top-10}" fill="none" stroke="${INK}" stroke-width="4"/><path d="M${x+w},${top+20} q40,10 30,70 q-6,30 -30,40" fill="none" stroke="${INK}" stroke-width="5"/>`;
  for(let v=p.minor;v<p.max+0.001;v+=p.minor){const y=bot-v*u,maj=Math.abs(v/p.step-Math.round(v/p.step))<1e-6;o+=`<line x1="${x}" y1="${y}" x2="${x+(maj?34:18)}" y2="${y}" stroke="${INK}" stroke-width="${maj?3:1.5}"/>`;if(maj)o+=`<text x="${x-8}" y="${y+6}" text-anchor="end" font-family="Nunito,sans-serif" font-weight="800" font-size="16" fill="${INK}">${v}</text>`;}
  o+=T(x+w/2,H+18,p.unit,`font-size="16" fill="#5D6B85"`);
  return `<svg viewBox="0 0 260 ${H+28}" width="260" height="${H+28}" role="img" aria-label="Measuring cup">${o}</svg>`;}
function thermoV(p){const top=24,bot=284,x=90,span=p.max-p.min,u=(bot-top)/span,y=bot-(p.value-p.min)*u;
  let o=`<rect x="${x-12}" y="${top-12}" width="24" height="${bot-top+24}" rx="12" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="${x}" cy="${bot+28}" r="22" fill="#E5533D" stroke="${INK}" stroke-width="3"/><rect x="${x-6}" y="${y}" width="12" height="${bot+12-y}" fill="#E5533D"/>`;
  for(let v=p.min;v<=p.max;v+=p.minor){const yy=bot-(v-p.min)*u,maj=(v-p.min)%p.label_step===0;o+=`<line x1="${x+14}" y1="${yy}" x2="${x+(maj?40:26)}" y2="${yy}" stroke="${INK}" stroke-width="${maj?2.5:1.2}"/>`;if(maj)o+=`<text x="${x+48}" y="${yy+6}" font-family="Nunito,sans-serif" font-weight="800" font-size="16" fill="${INK}">${v}</text>`;}
  o+=T(x-44,top+6,p.unit,`font-size="18" fill="#5D6B85"`);
  return `<svg viewBox="0 -6 200 ${bot+60}" width="200" height="${bot+66}" role="img" aria-label="Thermometer">${o}</svg>`;}
function vennV(p){const W=560,H=p.outside?330:290,cy=150,r=118,cx1=200,cx2=360;
  const place=(arr,x,yc)=>arr.map((t,k)=>T(x,yc-(arr.length-1)*15+k*30,esc(String(t)),`font-size="18" fill="${INK}"`)).join('');
  let o=`<rect x="2" y="2" width="${W-4}" height="${H-4}" rx="14" fill="#fff" stroke="${LINE}" stroke-width="2"/><circle cx="${cx1}" cy="${cy}" r="${r}" fill="#FF9F66" fill-opacity=".22" stroke="${ACC}" stroke-width="3"/><circle cx="${cx2}" cy="${cy}" r="${r}" fill="#7FB2EC" fill-opacity=".25" stroke="${SKY}" stroke-width="3"/>`;
  o+=T(cx1-30,26,esc(p.left),`font-size="17" fill="${ACC}"`)+T(cx2+30,26,esc(p.right),`font-size="17" fill="${SKY}"`);
  o+=place(p.a,cx1-55,cy)+place(p.both,(cx1+cx2)/2,cy)+place(p.b,cx2+55,cy);
  if(p.outside) o+=T(W/2,H-18,esc(p.outside.join('   ')),`font-size="18" fill="${INK}"`);
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Venn diagram">${o}</svg>`;}
function pieV(p){const c=150,r=128,cols=['#FF9F66','#7FB2EC','#8BD3A8','#F2C14E'];let o='',a=0;
  const pt=t=>[c+r*Math.sin(t*2*Math.PI/p.total),c-r*Math.cos(t*2*Math.PI/p.total)];
  p.slices.forEach((s,i)=>{const [x1,y1]=pt(a),[x2,y2]=pt(a+s.value),lg=s.value*2>p.total?1:0;o+=`<path d="M${c},${c} L${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2} Z" fill="${cols[i]}" stroke="${INK}" stroke-width="3"/>`;a+=s.value;});
  if(!p.fractions) for(let k=0;k<p.total;k++){const [x,y]=pt(k);o+=`<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="${INK}" stroke-width="1.2" stroke-opacity=".55"/>`;}
  if(p.fractions){let acc=0;const g=(x,y)=>y?g(y,x%y):x;p.slices.forEach(s=>{const mid=(acc+s.value/2)*2*Math.PI/p.total,d=g(s.value,p.total);o+=T(c+r*0.6*Math.sin(mid),c-r*0.6*Math.cos(mid)+8,`${s.value/d}/${p.total/d}`,`font-size="22" fill="${INK}"`);acc+=s.value;});}
  let lg='';p.slices.forEach((s,i)=>{lg+=`<rect x="318" y="${40+i*40}" width="24" height="24" rx="4" fill="${cols[i]}" stroke="${INK}" stroke-width="2"/>`+`<text x="352" y="${59+i*40}" font-family="Nunito,sans-serif" font-weight="800" font-size="18" fill="${INK}">${esc(s.label)}</text>`;});
  return `<svg viewBox="0 0 500 ${2*c+30}" width="500" height="${2*c+30}" role="img" aria-label="Circle graph">${o}${lg}${T(c,2*c+24,esc(p.title),`font-size="16" fill="#5D6B85"`)}</svg>`;}
function lineGraphV(p){const n=p.points.length,W=560,H=330,l=60,b=270,top=40,u=(b-top)/(p.max-(p.min||0)),dx=(W-l-40)/(n-1);let o=T(W/2,22,esc(p.title),`font-size="18" fill="${INK}"`);
  for(let v=p.min||0;v<=p.max;v+=p.step){const y=b-(v-(p.min||0))*u;o+=`<line x1="${l}" y1="${y}" x2="${W-20}" y2="${y}" stroke="${v===(p.min||0)?INK:LINE}" stroke-width="${v===(p.min||0)?3:1}"/><text x="${l-10}" y="${y+5}" text-anchor="end" font-family="Nunito,sans-serif" font-weight="800" font-size="13" fill="${INK}">${v}</text>`;}
  const P=p.points.map((q,i)=>[l+20+i*dx*((W-l-60)/(W-l-40)),b-(q.value-(p.min||0))*u]);
  o+=`<polyline points="${P.map(x=>x.join(',')).join(' ')}" fill="none" stroke="${SKY}" stroke-width="4"/>`;
  P.forEach(([x,y],i)=>{o+=`<circle cx="${x}" cy="${y}" r="7" fill="${ACC}" stroke="${INK}" stroke-width="2"/>`+T(x,b+26,esc(p.points[i].label),`font-size="14" fill="${INK}"`);});
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Line graph">${o}</svg>`;}
function protractorV(p){const cx=220,cy=210,R=180,ri=140;let o=`<path d="M${cx-R},${cy} A${R},${R} 0 0 1 ${cx+R},${cy} Z" fill="#FFF7DE" stroke="${INK}" stroke-width="3"/>`;
  for(let d=0;d<=180;d+=5){const a=d*Math.PI/180,L=d%10===0?20:10,x1=cx+R*Math.cos(a),y1=cy-R*Math.sin(a),x2=cx+(R-L)*Math.cos(a),y2=cy-(R-L)*Math.sin(a);o+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="${d%10?1:2}"/>`;
    if(d%10===0&&d%180)o+=T(cx+(R-36)*Math.cos(a),cy-(R-36)*Math.sin(a)+5,d,`font-size="13" fill="${INK}"`);}
  if(p.from_left){for(let d=10;d<180;d+=10){const a=d*Math.PI/180;o+=T(cx+(R-62)*Math.cos(a),cy-(R-62)*Math.sin(a)+5,180-d,`font-size="11" fill="#5D6B85"`);}
    const a=(180-p.degrees)*Math.PI/180;o+=`<line x1="${cx}" y1="${cy}" x2="${cx-ri*1.2}" y2="${cy}" stroke="${SKY}" stroke-width="5" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${cx+ri*1.2*Math.cos(a)}" y2="${cy-ri*1.2*Math.sin(a)}" stroke="${SKY}" stroke-width="5" stroke-linecap="round"/>`;
    o+=`<path d="M${cx-40},${cy} A40,40 0 0 1 ${cx+40*Math.cos(a)},${cy-40*Math.sin(a)}" fill="none" stroke="${ACC}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="6" fill="${INK}"/>`;
  } else {
  const a=p.degrees*Math.PI/180;o+=`<line x1="${cx}" y1="${cy}" x2="${cx+ri*1.2}" y2="${cy}" stroke="${SKY}" stroke-width="5" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${cx+ri*1.2*Math.cos(a)}" y2="${cy-ri*1.2*Math.sin(a)}" stroke="${SKY}" stroke-width="5" stroke-linecap="round"/>`;
  o+=`<path d="M${cx+40},${cy} A40,40 0 0 0 ${cx+40*Math.cos(a)},${cy-40*Math.sin(a)}" fill="none" stroke="${ACC}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="6" fill="${INK}"/>`;}
  return `<svg viewBox="0 0 440 230" width="440" height="230" role="img" aria-label="Angle on a protractor">${o}</svg>`;}
const visualOf = (q, small) => q.visual_type && q.visual_type !== 'none' && q.visual_type !== 'column' ? `<div class="visual">${V(q.visual_type, q.params, small)}</div>` :
                               q.visual_type === 'column' ? `<div class="visual">${V('column', q.params)}</div>` : '';

// ---------- screens ----------
function showWelcome(){
  prog.hidden = true; adminMode = false; app.classList.remove('wide');
  const counts = [1,2,3,4,5].map(g => gradeCount(g, medal));
  app.innerHTML = `<div style="font-size:60px;line-height:1" aria-hidden="true">🧮</div>
    <h1>Hi there! Ready for your math challenge?</h1>
    <div class="field"><label for="kid">What's your name?</label><input id="kid" class="namebox" maxlength="20" autocomplete="off" placeholder="Type your name" value="${esc(kidName)}"></div>
    <div class="field"><span class="label" id="glabel">Which grade are you in?</span>
      <div class="grades" role="radiogroup" aria-labelledby="glabel">${[1,2,3,4,5].map(g=>`<button class="gbtn" role="radio" aria-checked="${g===grade}" data-g="${g}">Grade ${g}<small data-count="${g}">${counts[g-1]}</small></button>`).join('')}</div></div>
    <div class="field"><span class="label" id="mlabel">Pick your level</span>
      <div class="grades medals" role="radiogroup" aria-labelledby="mlabel">${Object.entries(MEDALS).map(([k,M])=>`<button class="gbtn mbtn" role="radio" aria-checked="${k===medal}" data-m="${k}"><span aria-hidden="true" style="font-size:30px;line-height:1">${M.icon}</span>${M.name}<small>${M.blurb} · ${medalSubs(grade,k).length} questions</small></button>`).join('')}</div></div>
    <label class="dc-toggle"><input type="checkbox" id="dcheck" ${doubleCheck?'checked':''}><span><b>Double-check my answers</b><small>Before each Next, you'll get a reminder to check your answer one more time.</small></span></label>
    <p class="muted">One question from each part of the grade's math. Try your best. If you don't know one, tap Skip. You'll see how you did at the end.</p>
    <div><button class="btn btn-primary" id="start">Let's start!</button></div>
    <p style="margin-top:6px"><button class="link" id="toAdmin">Admin page</button></p>`;
  adminMode = false;
  app.querySelectorAll('.gbtn[data-g]').forEach(b => b.onclick = () => { grade = +b.dataset.g; showWelcome(); });
  app.querySelectorAll('.mbtn').forEach(b => b.onclick = () => { medal = b.dataset.m; app.querySelectorAll('.mbtn').forEach(x => x.setAttribute('aria-checked', String(x === b))); });
  const kid = document.getElementById('kid'); kid.oninput = () => { kidName = kid.value.trim(); };
  document.getElementById('dcheck').onchange = e => { doubleCheck = e.target.checked; };
  document.getElementById('start').onclick = () => { kidName = kid.value.trim(); adminMode = false; whenBank(showChoose); };
  document.getElementById('toAdmin').onclick = e => { e.preventDefault(); whenBank(showAdmin); };
  saveState('welcome');
}
// ---------- after "Let's start!": the whole test, or practice chosen sections ----------
let pickSecs = [];
function showChoose(){
  prog.hidden = true; app.classList.remove('wide'); adminMode = false;
  const secs = sectionsFor(grade, medal), t = testSize(grade, medal), M = MEDALS[medal];
  pickSecs = pickSecs.filter(x => secs.some(s => s.topic === x));
  const n = () => secs.filter(s => pickSecs.includes(s.topic)).reduce((a, s) => a + s.qs.length, 0);
  app.innerHTML = `<h1 style="margin-bottom:4px">${kidName ? `${esc(kidName)}, how` : 'How'} do you want to practice?</h1>
    <p class="muted" style="margin-top:0">Grade ${grade} · ${M.icon} ${M.name}</p>
    <div class="choose">
      <section class="ch-card"><h2>🏁 Whole test</h2>
        <p>${t.plain} questions, one from each part of Grade ${grade} math${t.stories ? `, then ${t.stories} story problems (each story has 3–5 questions)` : ''}.</p>
        <button class="btn btn-primary" id="whole">Start the whole test</button></section>
      <section class="ch-card"><h2>🎯 Practice sections</h2>
        <p>Pick one or more sections. You'll get every ${M.name} question in them.</p>
        <div class="ch-list" role="group" aria-label="Sections">${secs.map(s => `<label class="cmp-chk ch-item"><input type="checkbox" data-t="${esc(s.topic)}" ${pickSecs.includes(s.topic) ? 'checked' : ''}><span>${esc(s.topic === 'Story Problems' ? '📖 Story problems' : s.topic)}</span><small>${s.stories ? `${s.stories} stories · ` : ''}${s.qs.length} questions</small></label>`).join('')}</div>
        <div class="ch-acts"><button class="link" id="all">Select all</button><button class="link" id="none">Clear</button></div>
        <button class="btn btn-primary" id="practice" ${n() ? '' : 'disabled'}>${n() ? `Practice ${n()} questions` : 'Pick a section first'}</button></section>
    </div>
    <p><button class="btn btn-soft" id="back">← Back</button></p>`;
  const sync = () => { pickSecs = [...app.querySelectorAll('.ch-item input:checked')].map(i => i.dataset.t); const b = document.getElementById('practice'), k = n();
    b.disabled = !k; b.textContent = k ? `Practice ${k} questions` : 'Pick a section first'; saveState('choose'); };
  app.querySelectorAll('.ch-item input').forEach(i => i.onchange = sync);
  document.getElementById('all').onclick = () => { app.querySelectorAll('.ch-item input').forEach(i => i.checked = true); sync(); };
  document.getElementById('none').onclick = () => { app.querySelectorAll('.ch-item input').forEach(i => i.checked = false); sync(); };
  document.getElementById('whole').onclick = () => begin(pickTest());
  document.getElementById('practice').onclick = () => begin(secs.filter(s => pickSecs.includes(s.topic)).flatMap(s => s.qs));
  document.getElementById('back').onclick = () => showWelcome();
  window.scrollTo(0, 0); saveState('choose');
}
// ---------- Admin page: same screen, plus optional Category and Subcategory ----------
let adminMode = false, adminTopic = '', adminSub = '', adminLevel = '';
// ---------- strands: the same skill followed across grades (used by Admin > Compare grades) ----------
const STRANDS = [
 ['Numbers & counting','Counting & number words',['NC-01','NC-02']],
 ['Numbers & counting','Skip counting & number charts',['NC-03','NC-04','NC-05','G2-SC-01','G2-SC-02','G3-PV-05']],
 ['Numbers & counting','Even & odd',['NC-06']],
 ['Numbers & counting','Patterns',['NP-01','NP-02']],
 ['Place value','Place value (ones to millions)',['TB-01','TB-02','TB-03','PV-01','PV-02','G2-PV-01','G3-PV-01','G4-PV-01','G5-PV-01','G5-PV-02']],
 ['Place value','Expanded form',['PV-03','G2-PV-02','G3-PV-04','G4-PV-04']],
 ['Comparing & rounding','Comparing & ordering numbers',['CN-01','CN-02','G2-PV-03','G3-PV-03','G4-PV-02','G5-PV-05']],
 ['Comparing & rounding','Rounding',['PV-04','G2-PV-04','G3-PV-02','G4-PV-03','G5-PV-03','G5-PV-04']],
 ['Addition','Facts & mental addition',['AD-01','AD-02','AD-03','AD-04','AD-05','AD-06','G2-AD-01','G2-AD-03','G2-AD-08','G3-AD-01','G3-AD-04','G4-AD-01','G5-AS-01']],
 ['Addition','Missing addends',['G2-AD-02']],
 ['Addition','Adding in columns',['AD-07','TB-04','G2-AD-04','G2-AD-05','G2-AD-06','G3-AD-02','G3-AD-03','G4-AD-02','G4-AD-04','G5-AS-02']],
 ['Subtraction','Facts & mental subtraction',['SB-01','SB-02','G2-SB-01','G2-SB-02','G2-SB-07','G3-SB-01','G4-SB-01']],
 ['Subtraction','Subtracting in columns',['SB-03','G2-SB-03','G2-SB-04','G3-SB-02','G3-SB-03','G4-SB-02','G4-SB-03','G5-AS-03']],
 ['Subtraction','Fact families & missing numbers',['SB-04','G2-SB-06','G2-SB-08']],
 ['Multiplication','Meaning: groups & arrays',['G2-MU-01','G3-MU-01']],
 ['Multiplication','Times tables & missing factors',['G2-MU-03','G2-MU-04','G2-MU-05','G3-MU-02','G3-MU-03','G3-MU-04']],
 ['Multiplication','Properties',['G3-MU-06','G4-MU-06']],
 ['Multiplication','Multiplying tens & hundreds',['G3-MU-05','G4-MU-03','G5-MU-01']],
 ['Multiplication','Multi-digit multiplication',['G3-MU-07','G4-MU-04','G4-MU-05','G4-MU-07','G5-MU-02']],
 ['Division','Meaning & division facts',['G3-DV-01','G3-DV-02','G3-DV-03','G4-DV-01','G5-DV-01','G5-DV-03']],
 ['Division','Remainders & long division',['G3-DV-04','G4-DV-02','G4-DV-03','G5-DV-02']],
 ['Division','Dividing by 10, 100 & tens',['G3-DV-06']],
 ['Order of operations','Order of operations',['G3-OO-01','G4-OO-01','G5-OO-01']],
 ['Order of operations','Powers of ten',['G5-EX-01']],
 ['Factors & multiples','Factors, multiples & primes',['G4-FM-01','G4-FM-04','G4-FM-02','G4-FM-03','G5-FC-01','G5-FC-02']],
 ['Fractions','Equal parts & naming fractions',['FR-01','FR-02','G2-FR-01','G2-FR-03','G3-FR-01','G3-FR-02']],
 ['Fractions','Fraction of a set',['G2-FR-04','G3-FR-05']],
 ['Fractions','Fraction word problems',['FR-03','G2-FR-06','G5-FR-07']],
 ['Fractions','Equivalent & simplest form',['G3-FR-03','G3-FR-07','G4-FR-01']],
 ['Fractions','Comparing fractions',['G2-FR-05','G3-FR-04','G4-FR-02']],
 ['Fractions','Adding & subtracting fractions',['G3-FR-08','G3-FR-12','G4-FR-03','G4-FR-06','G4-FR-05','G5-FR-01','G5-FR-02']],
 ['Fractions','Multiplying & dividing fractions',['G5-FR-03','G5-FR-04','G5-FR-05']],
 ['Fractions','Mixed numbers',['G3-FR-09','G4-FR-04','G5-FR-06']],
 ['Decimals','Decimals & fractions',['G3-FR-06','G4-DC-01','G5-FR-08']],
 ['Decimals','Comparing decimals',['G3-FR-10','G4-DC-02']],
 ['Decimals','Adding & subtracting decimals',['G3-FR-11','G4-DC-03','G4-DC-04','G5-DC-01','G5-DC-02']],
 ['Decimals','Multiplying & dividing decimals',['G5-DC-03','G5-DC-04','G5-DC-05','G5-DC-06']],
 ['Measurement','Length',['ME-01','G2-ME-01','G2-ME-02','G2-ME-03','G2-ME-05','G3-ME-02','G3-ME-03','G4-ME-01','G5-ME-01','G5-ME-04']],
 ['Measurement','Weight & capacity',['ME-02','ME-03','G2-ME-06','G2-ME-07','G3-ME-04','G3-ME-05','G4-ME-02','G4-ME-03','G5-ME-02','G5-ME-03']],
 ['Measurement','Temperature',['G2-ME-08','G3-ME-06','G4-ME-05']],
 ['Money','Coins, bills & counting money',['MO-01','MO-02','G2-MO-01','G2-MO-02','G2-MO-05','G3-MO-01','G3-MO-03']],
 ['Money','Making change',['G3-MO-02']],
 ['Time','Telling time',['TM-01','TM-02','G2-TM-01','G2-TM-02','G3-TM-01','G3-TM-06']],
 ['Time','Elapsed time',['TM-03','G2-TM-03','G2-TM-05','G3-TM-02','G3-TM-07','G5-ME-06']],
 ['Time','Calendar',['TM-04','G2-TM-04','G3-TM-03','G3-TM-05']],
 ['Geometry','2D shapes & polygons',['GE-01','G2-GE-01','G3-GE-01','G3-GE-08','G4-GE-03','G5-GE-02']],
 ['Geometry','Symmetry, congruence & reflections',['GE-02','GE-05','G2-GE-04','G3-GE-04','G4-GE-05']],
 ['Geometry','3D shapes & volume',['GE-03','GE-04','G2-GE-03','G4-GE-07','G4-GE-08','G5-GE-06','G5-GE-07']],
 ['Geometry','Area & perimeter',['G2-GE-02','G2-GE-05','G3-GE-05','G3-GE-06','G3-GE-07','G4-GE-04','G5-GE-03','G5-GE-05']],
 ['Geometry','Lines & angles',['G3-GE-03','G3-GE-10','G4-GE-01','G4-GE-02','G5-GE-01']],
 ['Geometry','Coordinate grids',['G4-GE-06','G5-GE-08']],
 ['Data & graphing','Sorting & tally charts',['DG-01','DG-02','G2-DG-04','G3-DG-04']],
 ['Data & graphing','Picture & bar graphs',['DG-03','G2-DG-01','G2-DG-02','G3-DG-01','G3-DG-02','G4-DG-04','G5-DG-01']],
 ['Data & graphing','Line plots & stem-and-leaf',['G2-DG-03','G3-DG-03','G4-DG-01','G5-DG-03']],
 ['Data & graphing','Venn, circle & line graphs',['G2-DG-05','G2-DG-06','G2-DG-07','G3-DG-05','G3-DG-06','G3-DG-07','G4-DG-05','G4-DG-06','G4-DG-07','G5-DG-02','G5-DG-04']],
 ['Data & graphing','Probability',['G4-DG-03']],
 ['Word problems','One-step add & subtract',['AD-08','SB-05','WP-01','G2-AD-07','G2-SB-05','G3-AD-05','G3-SB-04']],
 ['Word problems','Two-step & multi-step',['G4-AD-03','G4-SB-04','G5-AS-04']],
 ['Word problems','Multiply & divide stories',['G3-MU-08','G3-DV-07','G4-MU-08','G4-DV-04','G5-MU-03','G5-DV-04']],
 ['Word problems','Fraction, decimal & estimation stories',['FR-03','G4-PV-05']],
 ['Word problems','Measurement, money & time stories',['ME-04','MO-03','TM-05','G2-MO-03','G3-ME-07','G4-ME-04','G4-ME-06','G5-ME-05','G5-DC-07']],
 ['Algebra','Expressions & equations',['G5-AL-01','G5-AL-03','G5-AL-04']],
 ['Algebra','Patterns & rules',['G5-AL-05']],
 ['Word problems','Story problems (one story, several questions)',['G5-PS-01']],
];

let adminTab = 'levels', cmpGrades = [3,4,5], cmpLevel = '2', cmpTopic = '', cmpStrand = '', cmpFlagged = false, cmpOpen = new Set();
function adminTabs(){
  return `<div class="tabs" role="tablist">${[['levels','Compare levels'],['grades','Compare grades']].map(([k,t]) =>
    `<button class="tab" role="tab" aria-selected="${adminTab===k}" data-tab="${k}">${t}</button>`).join('')}</div>`;
}
function bindTabs(){ app.querySelectorAll('.tab').forEach(b => b.onclick = () => { adminTab = b.dataset.tab; showAdmin(); }); }
// toughness signal for one question: biggest number, how many numbers, how many words
function signal(q){
  const p = q.params || {};
  const txt = q.question + ' ' + [p.nums, p.dividend, p.divisor, p.a, p.b].flat().filter(x => x != null).join(' ');
  const nums = (txt.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(x => +x.replace(/,/g, '')).filter(x => !isNaN(x));
  return { big: nums.length ? Math.max(...nums) : 0, n: nums.length, w: q.question.split(/\s+/).filter(Boolean).length };
}
const median = a => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.floor((b.length - 1) / 2)]; };
function showCompare(){
  prog.hidden = true; adminMode = true; app.classList.add('wide');
  const lv = cmpLevel ? +cmpLevel : 0, grades = [...cmpGrades].sort();
  const cats = [...new Set(STRANDS.map(s => s[0]))];
  const strandsIn = STRANDS.filter(s => !cmpTopic || s[0] === cmpTopic);
  if (cmpStrand && !strandsIn.some(s => s[1] === cmpStrand)) cmpStrand = '';
  const rowsData = strandsIn.filter(s => !cmpStrand || s[1] === cmpStrand).map(([cat, name, ids]) => {
    const cells = grades.map(g => {
      const qs = BANK.filter(q => q.grade === g && ids.includes(q.skill_id) && (!lv || q.difficulty === lv));
      const sg = qs.map(signal);
      return { g, qs, big: median(sg.map(x => x.big)), n: median(sg.map(x => x.n)), w: median(sg.map(x => x.w)), subs: [...new Set(qs.map(q => q.subtopic))] };
    });
    let prev = null;
    cells.forEach(c => { if (!c.qs.length) return; if (prev && prev.big > 0 && c.big <= prev.big && c.n <= prev.n && c.w <= prev.w) c.flag = prev.g; prev = c; });
    return { cat, name, cells, flagged: cells.some(c => c.flag) };
  }).filter(r => r.cells.some(c => c.qs.length) && (!cmpFlagged || r.flagged));
  const nFlag = rowsData.reduce((a, r) => a + r.cells.filter(c => c.flag).length, 0);
  const fmt = n => n.toLocaleString('en-US');
  const cell = (r, c) => {
    if (!c.qs.length) return `<td class="cmp-empty"><span class="muted">No questions${lv ? ' at this level' : ''}</span></td>`;
    const key = r.name + '|' + c.g, open = cmpOpen.has(key), show = open ? c.qs : c.qs.slice(0, 3);
    return `<td class="${c.flag ? 'cmp-flag' : ''}">
      <div class="cmp-sig">${c.flag ? `⚠️ Not harder than Grade ${c.flag} · ` : ''}Largest ${fmt(c.big)} · ${c.n} numbers · ${c.w} words <span class="muted">(typical)</span></div>
      <div class="muted cmp-subs">${c.subs.map(esc).join(' · ')} · ${c.qs.length} q</div>
      ${show.map(q => `<div class="cmp-q"><span class="tag lv${q.difficulty}">L${q.difficulty}</span> ${esc(q.question)} <span class="muted">→ ${esc(correctDisplay(q))}</span> <span class="muted cmp-id">${esc(q.q_id)}</span> ${previewLink(q.q_id)}</div>`).join('')}
      ${c.qs.length > 3 ? `<button class="link cmp-more" data-k="${esc(key)}">${open ? 'Show fewer' : `Show all ${c.qs.length}`}</button>` : ''}</td>`;
  };
  const byCat = []; rowsData.forEach(r => { const last = byCat[byCat.length - 1]; if (last && last.cat === r.cat) last.rows.push(r); else byCat.push({ cat: r.cat, rows: [r] }); });
  const body = byCat.map(gp => gp.rows.map((r, i) => `<tr class="${i===0?'first':''}">${i===0?`<td class="rv-cat" rowspan="${gp.rows.length}">${esc(gp.cat)}</td>`:''}<td class="rv-sub">${esc(r.name)}</td>${r.cells.map(c => cell(r, c)).join('')}</tr>`).join('')).join('');
  const fsel = 'class="rv-filter"';
  app.innerHTML = `<div class="rv-top"><div><h2>Admin page</h2>${adminTabs()}</div><button class="btn btn-soft" id="toKid">← Kid page</button></div>
    <div class="cmp-filters">
      <span class="label">Grades</span>${[1,2,3,4,5].map(g => `<label class="cmp-chk"><input type="checkbox" data-g="${g}" ${grades.includes(g)?'checked':''}> Grade ${g}</label>`).join('')}
      <label class="label">Level <select id="clevel" ${fsel} style="width:auto;display:inline-block;margin-left:6px"><option value="">All levels</option>${[1,2,3].map(l=>`<option value="${l}" ${String(l)===cmpLevel?'selected':''}>Level ${l} (${['Bronze','Silver','Gold'][l-1]})</option>`).join('')}</select></label>
      <label class="cmp-chk"><input type="checkbox" id="cflag" ${cmpFlagged?'checked':''}> Only flagged</label>
    </div>
    <p class="muted" style="margin:0">${rowsData.length} strands · ${nFlag} flagged cell${nFlag===1?'':'s'} (a grade whose typical largest number, count of numbers and length are all no higher than the grade before it)</p>
    <div class="rv-scroll"><table class="rv-table cmp-table"><thead><tr>
      <th class="rv-cat">Category<select id="ctopic" ${fsel}><option value="">All</option>${cats.map(t=>`<option ${t===cmpTopic?'selected':''}>${esc(t)}</option>`).join('')}</select></th>
      <th class="rv-sub">Strand<select id="cstrand" ${fsel}><option value="">All</option>${strandsIn.map(s=>`<option ${s[1]===cmpStrand?'selected':''}>${esc(s[1])}</option>`).join('')}</select></th>
      ${grades.map(g => `<th>Grade ${g}</th>`).join('')}</tr></thead>
      <tbody>${body || `<tr><td colspan="${2+grades.length}" class="muted">Nothing matches these filters.</td></tr>`}</tbody></table></div>`;
  bindTabs();
  document.getElementById('toKid').onclick = () => { adminMode = false; showWelcome(); };
  app.querySelectorAll('.cmp-chk input[data-g]').forEach(b => b.onchange = () => { const g = +b.dataset.g; cmpGrades = b.checked ? [...new Set([...cmpGrades, g])] : cmpGrades.filter(x => x !== g); if (!cmpGrades.length) cmpGrades = [g]; showCompare(); });
  document.getElementById('clevel').onchange = e => { cmpLevel = e.target.value; showCompare(); };
  document.getElementById('cflag').onchange = e => { cmpFlagged = e.target.checked; showCompare(); };
  document.getElementById('ctopic').onchange = e => { cmpTopic = e.target.value; cmpStrand = ''; showCompare(); };
  document.getElementById('cstrand').onchange = e => { cmpStrand = e.target.value; showCompare(); };
  app.querySelectorAll('.cmp-more').forEach(b => b.onclick = () => { const k = b.dataset.k; cmpOpen.has(k) ? cmpOpen.delete(k) : cmpOpen.add(k); showCompare(); });
  saveState('compare');
}

function adminPool(){
  return BANK.filter(q => q.grade === grade && (!adminTopic || q.topic === adminTopic) && (!adminSub || q.skill_id === adminSub));
}
function showAdmin(){
  if (adminTab === 'grades') return showCompare();
  prog.hidden = true; adminMode = true; app.classList.remove('wide');
  const inGrade = BANK.filter(q => q.grade === grade);
  const topics = [...new Set(inGrade.map(q => q.topic))];
  if (!topics.includes(adminTopic)) { adminTopic = ''; adminSub = ''; }
  const subs = [...new Map(inGrade.filter(q => q.topic === adminTopic).map(q => [q.skill_id, q.subtopic])).entries()];
  if (!subs.some(([id]) => id === adminSub)) adminSub = '';
  const pool = adminPool(), n = l => pool.filter(q => q.difficulty === l).length;
  const shown = adminLevel ? n(+adminLevel) : pool.length;
  const where = adminSub ? 'this subcategory' : adminTopic ? esc(adminTopic) : `all of Grade ${grade}`;
  const sel = 'class="namebox" style="font-size:18px;max-width:520px"';
  app.innerHTML = `<div style="font-size:60px;line-height:1" aria-hidden="true">🛠️</div>
    <h1>Admin page</h1>${adminTabs()}
    <div class="field"><span class="label" id="glabel">Grade</span>
      <div class="grades" role="radiogroup" aria-labelledby="glabel">${[1,2,3,4,5].map(g=>`<button class="gbtn" role="radio" aria-checked="${g===grade}" data-g="${g}">Grade ${g}<small>${BANK.filter(q => q.grade === g).length} in the bank</small></button>`).join('')}</div></div>
    <div class="field"><label for="atopic">Category (optional)</label>
      <select id="atopic" ${sel}><option value="">All categories</option>${topics.map(t => `<option value="${esc(t)}" ${t===adminTopic?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
    <div class="field"><label for="asub">Subcategory (optional)</label>
      <select id="asub" ${sel} ${adminTopic?'':'disabled'}><option value="">${adminTopic ? 'All subcategories in this category' : 'Pick a category first'}</option>${subs.map(([id, name]) => `<option value="${id}" ${id===adminSub?'selected':''}>${esc(name)} (${id})</option>`).join('')}</select></div>
    <div class="field"><label for="alevel">Level (optional)</label>
      <select id="alevel" ${sel}><option value="">All levels · ${pool.length} questions</option>${[1,2,3].map(l => `<option value="${l}" ${String(l)===adminLevel?'selected':''}>Level ${l} (${['Bronze','Silver','Gold'][l-1]}) · ${n(l)} questions</option>`).join('')}</select></div>
    <p class="muted">${shown} questions from ${where}${adminLevel ? ` at level ${adminLevel}` : ''}, shown side by side in Level 1, Level 2 and Level 3 columns.</p>
    <div><button class="btn btn-primary" id="review" ${shown?'':'disabled'}>Review questions</button></div>
    <p style="margin-top:6px"><button class="link" id="toKid">Back to the kid page</button></p>`;
  app.querySelectorAll('.gbtn').forEach(b => b.onclick = () => { grade = +b.dataset.g; showAdmin(); });
  document.getElementById('atopic').onchange = e => { adminTopic = e.target.value; adminSub = ''; showAdmin(); };
  document.getElementById('asub').onchange = e => { adminSub = e.target.value; showAdmin(); };
  document.getElementById('alevel').onchange = e => { adminLevel = e.target.value; showAdmin(); };
  document.getElementById('toKid').onclick = e => { e.preventDefault(); adminMode = false; showWelcome(); };
  document.getElementById('review').onclick = showReview;
  bindTabs();
  saveState('admin');
}
// ---------- admin review page: a table, one row per question slot, Level 1 / 2 / 3 side by side ----------
function showReview(){
  prog.hidden = true; app.classList.add('wide');
  const inGrade = BANK.filter(q => q.grade === grade);
  const topics = [...new Set(inGrade.map(q => q.topic))];
  const subsOf = t => [...new Map(inGrade.filter(q => !t || q.topic === t).map(q => [q.skill_id, q.subtopic])).entries()];
  if (adminSub && !subsOf(adminTopic).some(([id]) => id === adminSub)) adminSub = '';
  const pool = inGrade.filter(q => (!adminTopic || q.topic === adminTopic) && (!adminSub || q.skill_id === adminSub));
  const levels = adminLevel ? [+adminLevel] : [1,2,3], total = pool.length;
  const pct = (x, y) => y ? Math.round(x / y * 100) + '%' : '0%';
  const card = q => {
    let opts = '';
    if (q.answer_type === 'choice_text') opts = `<ul class="rv-opts">${q.options.map(o => `<li class="${String(o) === String(q.correct_answer) ? 'right' : ''}">${esc(o)}</li>`).join('')}</ul>`;
    if (q.answer_type === 'choice_picture') opts = `<div class="opts ${q.options.length===3?'three':'four'}">${q.options.map(o=>`<div class="opt" style="cursor:default;${o.id===q.correct_answer?'border-color:#1E9E62':''}">${V(o.visual_type,o.params,true)}<span class="letter">${o.id}</span></div>`).join('')}</div>`;
    return `<div class="rv-card"><div class="meta"><span class="tag">${esc(q.q_id)}</span><span class="tag lv${q.difficulty}">Level ${q.difficulty}</span>${q.is_stretch?'<span class="tag stretch">Stretch</span>':''}${previewLink(q.q_id)}</div>
      ${storyMini(q)}<div class="row-q">${esc(q.question)}</div>${visualOf(q, true)}${opts}
      <div class="rv-ans"><b>Answer</b> ${esc(correctDisplay(q))}${q.params && q.params.unit ? ' ' + esc(q.params.unit) : ''}</div>
      ${q.wrong_answer_notes ? `<div class="rv-note"><b>Note</b> ${esc(q.wrong_answer_notes)}</div>` : ''}</div>`;
  };
  // rows: for each subcategory, row k holds its k-th question at each level
  const bySub = new Map(); pool.forEach(q => { if (!bySub.has(q.skill_id)) bySub.set(q.skill_id, []); bySub.get(q.skill_id).push(q); });
  let n = 0;
  const body = [...bySub.values()].map(list => {
    const at = levels.map(l => list.filter(q => q.difficulty === l)), rows = Math.max(1, ...at.map(x => x.length));
    return Array.from({length: rows}, (_, k) => `<tr class="${k===0?'first':''}">
      <td class="rv-n">${++n}</td>
      ${k===0 ? `<td class="rv-cat" rowspan="${rows}">${esc(list[0].topic)}</td><td class="rv-sub" rowspan="${rows}">${esc(list[0].subtopic)}<div class="muted">${esc(list[0].skill_id)} · ${list.length} q</div></td>` : ''}
      ${at.map(x => `<td>${x[k] ? card(x[k]) : (k===0 ? '<span class="muted">None at this level</span>' : '')}</td>`).join('')}</tr>`).join('');
  }).join('');
  const head = levels.map(l => { const qs = pool.filter(q => q.difficulty === l), st = qs.filter(q => q.is_stretch).length;
    return `<th class="rv-lv"><div class="rv-lvname">Level ${l} · ${['Bronze','Silver','Gold'][l-1]}</div><div><b>${qs.length}</b> q · <b>${pct(qs.length,total)}</b> of all</div><div class="muted">${st} stretch (${pct(st,qs.length)})</div></th>`; }).join('');
  const fsel = 'class="rv-filter"';
  app.innerHTML = `<div class="rv-top"><div><h2>Review · Grade ${grade}</h2><p class="muted">${total} questions · Level 1 ${pct(pool.filter(q=>q.difficulty===1).length,total)} · Level 2 ${pct(pool.filter(q=>q.difficulty===2).length,total)} · Level 3 ${pct(pool.filter(q=>q.difficulty===3).length,total)} · Stretch ${pct(pool.filter(q=>q.is_stretch).length,total)}</p></div>
    <div class="rv-actions"><label class="muted">Grade <select id="rgrade" ${fsel}>${[1,2,3,4,5].map(g=>`<option ${g===grade?'selected':''}>${g}</option>`).join('')}</select></label>
      <label class="muted">Level <select id="rlevel" ${fsel}><option value="">All</option>${[1,2,3].map(l=>`<option value="${l}" ${String(l)===adminLevel?'selected':''}>${l}</option>`).join('')}</select></label>
      <button class="btn btn-soft" id="back">← Back to admin</button></div></div>
    <div class="rv-scroll"><table class="rv-table"><thead><tr>
      <th class="rv-n">Q#</th>
      <th class="rv-cat">Category<select id="rtopic" ${fsel}><option value="">All</option>${topics.map(t=>`<option value="${esc(t)}" ${t===adminTopic?'selected':''}>${esc(t)}</option>`).join('')}</select></th>
      <th class="rv-sub">Subcategory<select id="rsub" ${fsel}><option value="">All</option>${subsOf(adminTopic).map(([id,nm])=>`<option value="${id}" ${id===adminSub?'selected':''}>${esc(nm)}</option>`).join('')}</select></th>
      ${head}</tr></thead><tbody>${body || `<tr><td colspan="${3+levels.length}" class="muted">No questions match these filters.</td></tr>`}</tbody></table></div>`;
  document.getElementById('back').onclick = showAdmin;
  document.getElementById('rgrade').onchange = e => { grade = +e.target.value; adminTopic = ''; adminSub = ''; showReview(); };
  document.getElementById('rlevel').onchange = e => { adminLevel = e.target.value; showReview(); };
  document.getElementById('rtopic').onchange = e => { adminTopic = e.target.value; adminSub = ''; showReview(); };
  document.getElementById('rsub').onchange = e => { adminSub = e.target.value; if (adminSub) adminTopic = inGrade.find(q => q.skill_id === adminSub).topic; showReview(); };
  saveState('review');
}
function renderProgress(){
  prog.hidden = false;
  const done = answers.filter(a => a !== undefined).length, skipped = answers.filter(a => a === null).length;
  prog.innerHTML = `<div class="progress-label"><span>Question ${idx+1} of ${test.length}</span><span class="muted">${done} done${skipped?` · ${skipped} skipped`:''}</span></div>
    <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="${test.length}" aria-valuenow="${idx+1}"><div class="fill" style="width:${(idx+1)/test.length*100}%"></div></div>`;
}
function storyBox(q){ if (!isStory(q)) return ''; const p = q.params;
  return `<div class="story" aria-label="Story"><div class="story-h">📖 ${esc(p.title)} · question ${p.part} of ${p.parts}</div><p>${esc(p.story)}</p></div>`; }
function storyMini(q){ return isStory(q) ? `<details class="story-mini" ${q.params.part === 1 ? 'open' : ''}><summary>📖 ${esc(q.params.title)} · question ${q.params.part} of ${q.params.parts}</summary>${esc(q.params.story)}</details>` : ''; }
function showQuestion(){
  app.classList.remove('wide');
  const q = test[idx]; reached = Math.max(reached, idx); renderProgress();
  const prev = answers[idx];
  cur = { at:q.answer_type, value: prev && q.answer_type!=='multi_number' ? prev : '', parts:[], field:0 };
  if (q.answer_type==='multi_number') cur.parts = prev ? prev.split('|') : q.params.fields.map(()=> '');
  let input = '';
  if (q.answer_type==='choice_text'){
    input = `<div class="opts ${q.options.length===3?'three':''}" role="group" aria-label="Answer choices">${q.options.map((o,i)=>`<button class="opt${/^[^A-Za-z0-9]{1,8}$/u.test(String(o))?' emo':''}" id="opt${i}" aria-pressed="${prev===o}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  } else if (q.answer_type==='choice_picture'){
    input = `<div class="opts ${q.options.length===3?'three':''}" role="group" aria-label="Answer choices">${q.options.map((o,i)=>`<button class="opt" id="opt${i}" aria-pressed="${prev===o.id}" data-v="${o.id}">${V(o.visual_type,o.params,true)}<span class="letter">${o.id}</span></button>`).join('')}</div>`;
  } else if (q.answer_type==='multi_number'){
    const f = q.params.fields, order = q.params.layout === 'order';
    if (q.params.layout === 'remainder') input = `<div class="answer-row"><button class="box small active" id="f0" aria-label="quotient"></button><span>R</span><button class="box small" id="f1" aria-label="remainder"></button></div>${pad(false)}`;
    else input = `<div class="answer-row">${f.map((x,i)=>`${order&&x.label?`<span class="muted">${x.label}</span>`:''}<button class="box small ${i===0?'active':''}" id="f${i}" aria-label="${esc(x.label||'box '+(i+1))}"></button>${!order?`<span>${esc(x.label)}</span>`:''}${order&&i<f.length-1?'<span class="muted">,</span>':''}`).join('')}</div>${pad(false)}`;
  } else {
    const unit = q.params && q.params.unit ? `<span>${esc(q.params.unit)}</span>` : '';
    input = `<div class="answer-row"><div class="box active" id="fv" aria-label="Your answer"></div>${unit}</div>${pad(q.answer_type==='time', q.grade===5 && q.answer_type==='number')}`;
  }
  const qHtml = storyBox(q) + `<p class="q-text">${esc(q.question)}</p>`;
  app.innerHTML = `<span class="topic-tag">Grade ${grade} · ${esc(q.topic)}${previewId ? ` · Preview of ${esc(previewId)} (Level ${q.difficulty})` : ''}</span>${qHtml}${visualOf(q)}${input}
    <div class="nav"><button class="btn btn-soft" id="prev" ${idx===0?'disabled':''}>← Previous</button>
      <div class="right"><button class="btn btn-skip" id="skip">Skip</button><button class="btn btn-primary" id="next" disabled>${idx===test.length-1?'Finish':'Next →'}</button></div></div>
    <div class="exit" id="exitzone"><button class="link" id="exit">Exit test and see results</button></div>`;
  wire(q);
  document.getElementById('prev').onclick = () => { const a = answerNow(); if (a !== '') answers[idx] = a; idx--; showQuestion(); };
  document.getElementById('skip').onclick = () => { answers[idx] = null; go(); };
  document.getElementById('next').onclick = () => { if (doubleCheck && !previewId) return askDoubleCheck(); answers[idx] = answerNow(); go(); };
  document.getElementById('exit').onclick = confirmExit;
  window.scrollTo(0,0);
  saveState('test');
}
// ---------- double-check reminder (optional, chosen on the start page) ----------
let doubleCheck = false;
function askDoubleCheck(){
  const z = document.getElementById('exitzone'), a = answerNow(), q = test[idx];
  const shown = q.answer_type === 'multi_number' ? a.split('|').join(' and ') : a;
  z.innerHTML = `<div class="confirm dc-box" role="alertdialog" aria-labelledby="dcmsg"><span id="dcmsg">🔍 <b>Quick double-check!</b> Read the question again. Is <b>${esc(shown)}</b>${q.params && q.params.unit && !q.answer_type.startsWith('choice') ? ' ' + esc(q.params.unit) : ''} your final answer?</span>
    <span style="display:flex;gap:8px"><button class="btn btn-soft" id="dcagain">Let me check again</button><button class="btn btn-primary" id="dcyes">Yes, next →</button></span></div>`;
  const back = () => { z.innerHTML = '<button class="link" id="exit">Exit test and see results</button>'; document.getElementById('exit').onclick = confirmExit; };
  document.getElementById('dcagain').onclick = back;
  document.getElementById('dcyes').onclick = () => { answers[idx] = answerNow(); go(); };
  document.getElementById('dcagain').focus();
  z.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function go(){ idx++; idx < test.length ? showQuestion() : showResults(); }
function confirmExit(){
  const z = document.getElementById('exitzone');
  z.innerHTML = `<div class="confirm"><span>Stop here and see the results for the questions so far?</span><span style="display:flex;gap:8px"><button class="btn btn-soft" id="stay">Keep going</button><button class="btn btn-primary" id="leave">See results</button></span></div>`;
  document.getElementById('stay').onclick = () => { z.innerHTML = '<button class="link" id="exit">Exit test and see results</button>'; document.getElementById('exit').onclick = confirmExit; };
  document.getElementById('leave').onclick = () => { const a = answerNow(); if (a !== '') answers[idx] = a; exitedAt = idx; showResults(); };
  document.getElementById('stay').focus();
}
function pad(colon, ext){
  return `<div class="pad">${[1,2,3,4,5,6,7,8,9].map(k=>`<button class="key" data-k="${k}">${k}</button>`).join('')}
    <button class="key alt" data-k="${colon?':':'clear'}">${colon?':':'Clear'}</button><button class="key" data-k="0">0</button><button class="key alt" data-k="back" aria-label="Delete">⌫</button>${ext?`<button class="key alt" data-k="." aria-label="Decimal point">.</button><button class="key alt" data-k="-" aria-label="Minus sign">−</button><span></span>`:''}</div>`;
}
function answerNow(){ return cur.at==='multi_number' ? (cur.parts.every(x=>x!=='') ? cur.parts.join('|') : '') : cur.value; }
function refresh(){
  if (cur.at==='multi_number') cur.parts.forEach((v,i)=>{ const el=document.getElementById('f'+i); el.innerHTML = v===''?'<span class="ph">?</span>':esc(v); el.classList.toggle('active', cur.field===i); });
  else if (cur.at==='number' || cur.at==='time') document.getElementById('fv').innerHTML = cur.value===''?'<span class="ph">?</span>':esc(cur.value);
  document.getElementById('next').disabled = answerNow()==='';
}
function wire(q){
  if (cur.at.startsWith('choice')){
    app.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{ app.querySelectorAll('.opt').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); cur.value=b.dataset.v; refresh(); if (!previewId) { const keep = answers[idx]; answers[idx] = cur.value; saveState('test'); answers[idx] = keep; } });
    refresh(); return;
  }
  if (cur.at==='multi_number') cur.parts.forEach((_,i)=>document.getElementById('f'+i).onclick=()=>{cur.field=i; refresh();});
  app.querySelectorAll('.key').forEach(b=>b.onclick=()=>{
    const k=b.dataset.k, multi=cur.at==='multi_number'; let v = multi ? cur.parts[cur.field] : cur.value;
    if (k==='back') v=v.slice(0,-1); else if (k==='clear') v='';
    else if (k===':'){ if(!v.includes(':') && v.length) v+=':'; }
    else if (k==='.'){ if(!v.includes('.')) v+=(v===''||v==='-')?'0.':'.'; }
    else if (k==='-'){ v = v.startsWith('-') ? v.slice(1) : '-'+v; }
    else { const max = multi ? 7 : cur.at==="time" ? 5 : 7; if (v.length<max) v+=k; }
    if (multi){ cur.parts[cur.field]=v; if (/^\d$/.test(k) && v.length>=String((q.correct_answer.split('|')[cur.field])).length && cur.field<cur.parts.length-1 && cur.parts[cur.field+1]==='') cur.field++; }
    else cur.value=v;
    refresh();
  });
  refresh();
}


// ---------- start-up routes: #admin opens the admin page, #q=<question id> previews one question as a kid sees it ----------
function route(){
  const m = location.hash.match(/^#q=([\w-]+)/);
  if (m) {
    return whenBank(() => { const q = BANK.find(x => x.q_id === decodeURIComponent(m[1]));
      if (q) { previewId = q.q_id; adminMode = true; grade = q.grade; kidName = ''; begin([q]); } else showWelcome(); });
  }
  if (restoreState()) return;
  location.hash === '#admin' ? whenBank(showAdmin) : showWelcome();
}
let previewId = null;
// ---------- stay on the same page after a refresh (this browser tab only; closing the tab starts fresh) ----------
const SKEY = 'prepme-state-v1';
function saveState(screen){
  if (previewId) return;
  try {
    const withTest = screen === 'test' || screen === 'results';
    sessionStorage.setItem(SKEY, JSON.stringify({ screen, grade, medal, kidName, doubleCheck, adminMode, adminTab, adminTopic, adminSub, adminLevel,
      cmpGrades, cmpLevel, cmpTopic, cmpStrand, cmpFlagged, onlyMissed, idx, reached, exitedAt, pickSecs,
      answers: withTest ? answers.map(a => a === undefined ? { u: 1 } : a) : [],
      test: withTest ? test.map(q => ({ id: q.q_id, o: q.options, q })) : null }));   // the test's own questions are kept, so a refresh resumes without waiting for the bank
  } catch (e) { /* storage blocked: refresh just goes back to the start page */ }
}
function restoreState(){
  let s; try { s = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch (e) { return false; }
  if (!s || !s.screen) return false;
  ({ grade, medal, kidName, doubleCheck, adminMode, adminTab, adminTopic, adminSub, adminLevel, cmpLevel, cmpTopic, cmpStrand, cmpFlagged, onlyMissed } = s); pickSecs = s.pickSecs || [];
  cmpGrades = s.cmpGrades && s.cmpGrades.length ? s.cmpGrades : cmpGrades;
  if (!MEDALS[medal]) medal = 'silver';
  if (s.test) {
    const byId = new Map(BANK.map(q => [q.q_id, q]));
    const t = s.test.map(x => { const q = byId.get(x.id) || x.q; return q && { ...q, options: x.o != null ? x.o : q.options }; });
    if (!t.length || t.some(x => !x)) { showWelcome(); return true; }     // the bank changed since: start fresh
    test = t; idx = Math.min(s.idx || 0, t.length - 1); reached = s.reached || 0; exitedAt = s.exitedAt;
    answers = s.answers.map(a => a && typeof a === 'object' && a.u ? undefined : a);
  }
  const go_ = { test: showQuestion, results: showResults, review: showReview, compare: () => { adminTab = 'grades'; showCompare(); }, admin: showAdmin, welcome: showWelcome, choose: showChoose }[s.screen];
  if (!go_ || ((s.screen === 'test' || s.screen === 'results') && !s.test)) { showWelcome(); return true; }
  ['review','compare','admin','choose'].includes(s.screen) ? whenBank(go_) : go_(); return true;
}
const previewLink = id => `<a class="qlink" href="#q=${encodeURIComponent(id)}" target="_blank" rel="noopener" title="Open this question as the kid sees it (new tab)">Open ↗</a>`;
// ---------- keyboard during a math test: only 0-9 and Backspace (plus ':' on time questions) ----------
// Every other key is ignored. Enter and Space are blocked so they can't "click" a focused button such as Exit.
function inTest(){ return !!document.getElementById('exitzone'); }
document.addEventListener('keydown', e => {
  if (!inTest()) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const pad = app.querySelector('.pad'); if (!pad) return;
  const tap = el => { if (!el) return false; el.click(); el.classList.add('pressed'); setTimeout(() => el.classList.remove('pressed'), 120); return true; };
  let done = false;
  if (/^[0-9]$/.test(e.key)) done = tap(pad.querySelector(`.key[data-k="${e.key}"]`));
  else if (e.key === 'Backspace') done = tap(pad.querySelector('.key[data-k="back"]'));
  else if (e.key === ':') done = tap(pad.querySelector('.key[data-k=":"]'));   // the ':' key only exists on time questions
  else if (e.key === '.' || e.key === '-') done = tap(pad.querySelector(`.key[data-k="${e.key}"]`));   // only on Grade 5 typed questions
  if (done || e.key === 'Backspace') e.preventDefault();
});
// browser warning on refresh, back or closing the tab while a test is in progress
window.addEventListener('beforeunload', e => { if (inTest() && !previewId) { e.preventDefault(); e.returnValue = ''; } });

// ---------- results ----------
function showResults(){
  prog.hidden = true;
  const last = exitedAt == null ? test.length - 1 : Math.max(reached, exitedAt);
  const seen = test.slice(0, last + 1).map((q,i)=>({q, a:answers[i], i}));
  const st = x => x.a === null || x.a === undefined ? 'skipped' : isCorrect(x.q, x.a) ? 'ok' : 'wrong';
  seen.forEach(x => x.s = st(x));
  const c = k => seen.filter(x=>x.s===k).length;
  const ok = c('ok'), wrong = c('wrong'), sk = c('skipped');
  const byTopic = {}; seen.forEach(x => { const t = (byTopic[x.q.topic] ||= {r:0,n:0}); t.n++; if (x.s==='ok') t.r++; });
  const pct = seen.length ? ok/seen.length : 0;
  const msg = pct>=.9?'Amazing work!':pct>=.7?'Great job!':pct>=.5?'Good effort!':'Nice try! Practice makes it easier.';
  const rows = seen.filter(x => !onlyMissed || x.s!=='ok');
  app.innerHTML = `<div><h2>${kidName ? msg.replace(/!$/, '').replace(/^(Nice try)! .*/, '$1') + `, ${esc(kidName)}!` : msg}</h2><p class="muted">Grade ${grade} ${adminMode ? 'admin' : MEDALS[medal].icon + ' ' + MEDALS[medal].name} check</p>${exitedAt!=null?`<p class="muted">Stopped after question ${last+1} of ${test.length}.</p>`:''}</div>
    ${reportA(seen, byTopic, ok, wrong, sk)}
    <div class="toolbar no-print"><button class="btn btn-soft" id="pdf" style="min-height:48px;padding:10px 18px;font-size:17px">⬇ Download PDF</button><span class="muted" style="font-size:14px">In the print window, choose “Save as PDF”.</span></div>
    <div class="toolbar"><strong>Every question</strong><button class="btn btn-soft no-print" id="filter" style="min-height:48px;padding:10px 18px;font-size:17px">${onlyMissed?'Show all':'Show only missed & skipped'}</button></div>
    <div class="list">${rows.map(x=>row(x)).join('') || '<p class="muted">Nothing missed or skipped.</p>'}</div>
    <div class="no-print"><button class="btn btn-primary" id="again">Take a new test</button></div>`;
  document.getElementById('again').onclick = () => { onlyMissed = false; adminMode ? whenBank(showAdmin) : showWelcome(); };
  document.getElementById('filter').onclick = () => { onlyMissed = !onlyMissed; showResults(); };
  document.getElementById('pdf').onclick = () => downloadPdf();
  window.scrollTo(0,0);
  saveState('results');
}
// ---------- PDF: the browser's print window saves the results page as a PDF (text stays sharp, page breaks between questions) ----------
function downloadPdf(){
  const d = new Date(), day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const who = (kidName || 'Student').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
  const lvl = adminMode ? 'Admin' : MEDALS[medal].name;
  let head = document.getElementById('print-head');
  if (!head) { head = document.createElement('div'); head.id = 'print-head'; app.prepend(head); }
  head.innerHTML = `<b>PrepMe math check</b><span>${esc(kidName || 'Student')} · Grade ${grade} · ${lvl} · ${d.toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' })}</span>`;
  const old = document.title; document.title = `PrepMe-${who}-Grade${grade}-${lvl}-${day}`;   // becomes the PDF file name
  const done = () => { document.title = old; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done); window.print(); setTimeout(done, 1500);
}
// ---------- results report (Option A): score tiles + % correct by category, strongest first ----------
function reportA(seen, byTopic, ok, wrong, sk){
  const p = (r, n) => n ? Math.round(r / n * 100) : 0;
  const band = v => v >= 80 ? 'strong' : v >= 60 ? 'mid' : 'focus';
  const cats = Object.entries(byTopic).map(([t, v]) => ({ t, r: v.r, n: v.n, v: p(v.r, v.n) })).sort((a, b) => b.v - a.v || b.n - a.n || a.t.localeCompare(b.t));
  const strong = cats.filter(c => c.v >= 80).length, practice = cats.length - strong;
  return `<section class="rep" aria-label="Score by category">
    <div class="rep-tiles">
      <div class="rep-tile"><span>Score</span><b>${ok} / ${seen.length}</b></div>
      <div class="rep-tile"><span>Percent</span><b>${p(ok, seen.length)}%</b></div>
      <div class="rep-tile"><span>Strong areas</span><b>${strong}</b></div>
      <div class="rep-tile"><span>Areas to practice</span><b>${practice}</b></div>
    </div>
    <p class="muted rep-sub">${ok} correct · ${wrong} not quite · ${sk} skipped</p>
    <div class="rep-bars">${cats.map(c => `<div class="rep-row"><span class="rep-name">${esc(c.t)}</span><span class="rep-track" role="img" aria-label="${esc(c.t)}: ${c.r} of ${c.n} correct"><span class="rep-bar ${band(c.v)}" style="width:${Math.max(c.v, 2)}%"></span></span><span class="rep-cnt">${c.r}/${c.n} · ${c.v}%</span></div>`).join('')}</div>
    <div class="rep-leg"><span><i class="strong"></i>Strong · 80%+</span><span><i class="mid"></i>Getting there · 60–79%</span><span><i class="focus"></i>Focus · under 60%</span></div>
  </section>`;
}
function correctDisplay(q){
  if (q.answer_type==='choice_picture') return `${q.correct_answer}`;
  return showAnswer(q, q.correct_answer);
}
function row({q,a,i,s}){
  const label = s==='ok'?'✅ Correct':s==='wrong'?'❌ Not quite':'⏭️ Skipped', cls = s==='ok'?'ok':s==='wrong'?'no':'sk';
  const pics = q.answer_type==='choice_picture' ? `<div class="opts ${q.options.length===3?'three':'four'}">${q.options.map(o=>`<div class="opt" style="cursor:default;${o.id===q.correct_answer?'border-color:#1E9E62':''}">${V(o.visual_type,o.params,true)}<span class="letter">${o.id}</span></div>`).join('')}</div>` : '';
  return `<div class="row ${s==='ok'?'':s==='wrong'?'wrong':'skipped'}">
    <div class="row-head"><span class="mark ${cls}">${i+1}. ${label}</span><span class="meta"><span class="tag">${esc(q.topic)} · ${esc(q.subtopic)}</span>${q.is_stretch?'<span class="tag stretch">Stretch</span>':''}<span class="tag lv${q.difficulty}">Level ${q.difficulty}</span><span class="tag">${esc(q.q_id)}</span></span></div>
    ${storyMini(q)}<div class="row-q">${esc(q.question)}</div>${visualOf(q,true)}${pics}
    <div class="ans"><div class="${cls}"><b>Answer given</b>${esc(s==='skipped'?'Skipped':showAnswer(q,a))}</div><div><b>Correct answer</b>${esc(correctDisplay(q))}</div></div>
    ${s!=='ok' && q.wrong_answer_notes ? `<div class="note"><b>${s==='skipped'?'What this checks':'Common mistakes'}:</b> ${esc(q.wrong_answer_notes)}</div>`:''}
  </div>`;
}

// ---------- load the question bank from Supabase (read-only, public) ----------
async function loadBank(){
  const { url, key } = window.PREPME_CFG || {};
  if (!url || !key) throw new Error('Supabase settings are missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  const H = { apikey: key, Authorization: `Bearer ${key}` };
  const once = async path => { const c = new AbortController(), t = setTimeout(() => c.abort(), 25000);
    try { const r = await fetch(`${url}/rest/v1/${path}`, { headers: H, signal: c.signal }); if (!r.ok) throw new Error(`Supabase ${r.status}`); return await r.json(); } finally { clearTimeout(t); } };
  const get = path => once(path).catch(() => once(path));            // one retry per request
  const page = off => get(`questions?select=*&status=neq.rejected&order=q_id&offset=${off}&limit=1000`);
  // all pages are asked for at the same time instead of one after another
  const [subs, ...pages] = await Promise.all([get('subcategories?select=skill_id,sort_order'), ...[0,1,2,3,4,5].map(k => page(k * 1000))]);
  let rows = pages.flat();
  for (let off = 6000; pages[pages.length - 1].length === 1000; off += 1000) { const pg = await page(off); pages.push(pg); rows = rows.concat(pg); }
  const order = Object.fromEntries(subs.map(s => [s.skill_id, s.sort_order]));
  rows.sort((a, b) => (order[a.skill_id] ?? 9999) - (order[b.skill_id] ?? 9999) || a.q_id.localeCompare(b.q_id));
  return rows;
}
loadBank().then(rows => { BANK = rows; bankArrived(); })
  .catch(e => { BANK_ERR = e; console.error(e); if (bankWaiters.length) showBankError(); });
route();
