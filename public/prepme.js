let BANK = [];
const app = document.getElementById('app'), prog = document.getElementById('progress');
let test = [], idx = 0, answers = [], reached = 0, exitedAt = null, cur = null, onlyMissed = false, grade = 1, kidName = '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const INK='#1D2A44', SKY='#2E7BD6', ACC='#FF7A2F', LINE='#D6DEEA', PAPER='#EEF3F8';
const T = (x,y,s,o='') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="800" ${o}>${s}</text>`;

// ---------- pick one question per subcategory of the chosen grade, in bank order ----------
function subsFor(g){ const m = new Map(); BANK.filter(q => q.grade === g).forEach(q => { if (!m.has(q.skill_id)) m.set(q.skill_id, []); m.get(q.skill_id).push(q); }); return m; }
function pickTest(){ return [...subsFor(grade).values()].map(list => shuffle(list)[0]); }

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
    case 'column': return `<div class="colsum"><span>${p.a}</span><span>${p.op} ${p.b}</span><span class="ln"></span></div>`;
    case 'fraction_shape': return fraction(p, small);
    case 'bars': return bars(p);
    case 'units': return units(p);
    case 'ruler': return ruler(p);
    case 'coins': return coins(p);
    case 'calendar': return calendarV(p);
    case 'shape': return p.scale ? shapeSized(p) : shape2d(p.shape, small);
    case 'balance': return balanceV(p);
    case 'measuring_cup': return cupV(p);
    case 'thermometer': return thermoV(p);
    case 'venn': return vennV(p);
    case 'pie': return pieV(p);
    case 'line_graph': return lineGraphV(p);
    case 'protractor': return protractorV(p);
    case 'shape3d': return shape3d(p.shape, small);
    case 'emoji_pic': return emojiPic(p, small);
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
  const s=52,o=[]; let left=p.filled;
  for(let f=0;f<p.frames;f++){const ox=f*(5*s+24); const k=Math.min(10,left); left-=k;
    for(let i=0;i<10;i++){const x=ox+(i%5)*s,y=Math.floor(i/5)*s;o.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#fff" stroke="${INK}" stroke-width="3"/>`); if(i<k)o.push(`<circle cx="${x+s/2}" cy="${y+s/2}" r="17" fill="${SKY}"/>`);}}
  const W=p.frames*5*s+(p.frames-1)*24; return `<svg viewBox="-2 -2 ${W+4} ${2*s+4}" width="${W+4}" height="${2*s+4}" role="img" aria-label="Ten frame">${o.join('')}</svg>`;
}
function baseTen(p){
  const H=p.hundreds||0, u=H?9:16, o=[]; let x=0;
  for(let h=0;h<H;h++){for(let r=0;r<10;r++)for(let c=0;c<10;c++)o.push(`<rect x="${x+c*u}" y="${r*u}" width="${u}" height="${u}" fill="#9CC3F0" stroke="${INK}" stroke-width="1"/>`); x+=10*u+10;}
  for(let t=0;t<p.tens;t++){for(let k=0;k<10;k++)o.push(`<rect x="${x}" y="${k*u}" width="${u}" height="${u}" fill="#7FB2EC" stroke="${INK}" stroke-width="1.5"/>`); x+=u+6;}
  x+=12; for(let k=0;k<p.ones;k++){const cx=x+(k%3)*(u+5),cy=10*u-u-(Math.floor(k/3))*(u+5);o.push(`<rect x="${cx}" y="${cy}" width="${u}" height="${u}" fill="#FFB98A" stroke="${INK}" stroke-width="1.5"/>`);}
  const W=x+3*(u+5); return `<svg viewBox="-2 -2 ${W+4} ${10*u+4}" width="${W+4}" height="${10*u+4}" role="img" aria-label="Base ten blocks">${o.join('')}</svg>`;
}
function fraction(p, small){
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
  if(p.quarters){ const u=96,n=6,W=n*u+30; let o=`<rect x="14" y="6" width="${p.length_q/4*u}" height="28" rx="6" fill="#8BD3A8" stroke="${INK}" stroke-width="2"/><rect x="14" y="44" width="${n*u}" height="50" fill="#FFF4D6" stroke="${INK}" stroke-width="2"/>`;
    for(let k=0;k<=n*4;k++){const x=14+k*u/4,L=k%4===0?24:k%2===0?16:10;o+=`<line x1="${x}" y1="44" x2="${x}" y2="${44+L}" stroke="${INK}" stroke-width="${k%4?1.5:2.5}"/>`; if(k%4===0)o+=T(x,88,k/4,`font-size="16" fill="${INK}"`);}
    o+=T(W-40,24,'inches',`font-size="15" fill="#5D6B85"`);
    return `<svg viewBox="0 0 ${W} 100" width="${W}" height="100" role="img" aria-label="Ruler in quarter inches">${o}</svg>`; }
  const u=56,W=10*u+20; let o=`<rect x="10" y="6" width="${p.length*u}" height="28" rx="6" fill="#8BD3A8" stroke="${INK}" stroke-width="2"/><rect x="10" y="44" width="${10*u}" height="46" fill="#FFF4D6" stroke="${INK}" stroke-width="2"/>`;
  for(let i=0;i<=10;i++){o+=`<line x1="${10+i*u}" y1="44" x2="${10+i*u}" y2="64" stroke="${INK}" stroke-width="2"/>`+T(10+i*u,84,i,`font-size="16" fill="${INK}"`); if(i<10)o+=`<line x1="${10+i*u+u/2}" y1="44" x2="${10+i*u+u/2}" y2="56" stroke="${INK}" stroke-width="1.5"/>`;}
  o+=T(W-30,22,p.unit==='cm'?'cm':'inches',`font-size="15" fill="#5D6B85"`);
  return `<svg viewBox="0 0 ${W} 96" width="${W}" height="96" role="img" aria-label="Ruler">${o}</svg>`;
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
    for(let k=0;k<r.count/key;k++)o+=T(166+k*44,y+38,icon,'font-size="30"');});
  o+=T(W/2,48+p.rows.length*rh+22,`Each picture = ${key} vote${key>1?'s':''}`,`font-size="16" fill="#5D6B85"`);
  return `<svg viewBox="0 0 ${W} ${80+p.rows.length*rh}" width="${W}" height="${80+p.rows.length*rh}" role="img" aria-label="Pictograph">${o}</svg>`;}
function barChart(p){const n=p.bars.length,step=p.step||1,W=Math.max(460,90+n*100),H=330,l=50,b=270,top=40,u=(b-top)/p.max,bw=Math.min(80,(W-l-40)/n-30);let o=T(W/2,24,esc(p.title),`font-size="20" fill="${INK}"`);
  for(let v=0;v<=p.max;v+=step){const y=b-v*u;o+=`<line x1="${l}" y1="${y}" x2="${W-10}" y2="${y}" stroke="${v?LINE:INK}" stroke-width="${v?1:3}"/>`+T(l-20,y+6,v,`font-size="14" fill="${INK}"`);}
  p.bars.forEach((r,i)=>{const x=l+30+i*(bw+30),h=r.value*u;o+=`<rect x="${x}" y="${b-h}" width="${bw}" height="${h}" fill="${['#FF9F66','#7FB2EC','#8BD3A8','#F2C14E'][i%4]}" stroke="${INK}" stroke-width="2"/>`+T(x+bw/2,b+26,[...r.label][0],'font-size="24"')+T(x+bw/2,b+50,esc(r.label.split(' ').slice(1).join(' ')),`font-size="14" fill="${INK}"`);});
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Bar chart">${o}</svg>`;}
function arrayV(p){ return `<div class="objs"><div class="grp" style="grid-template-columns:repeat(${p.cols},auto)">${Array(p.rows*p.cols).fill(`<span>${p.emoji||'🔵'}</span>`).join('')}</div></div>`; }
function areaGrid(p){const c=40,o=[];const on=p.cells?new Set(p.cells.map(x=>x[0]+','+x[1])):null;
  for(let r=0;r<p.rows;r++)for(let k=0;k<p.cols;k++){const f=!on||on.has(r+','+k); if(f)o.push(`<rect x="${k*c+2}" y="${r*c+2}" width="${c}" height="${c}" fill="#BFD9F7" stroke="${INK}" stroke-width="2"/>`);}
  return `<svg viewBox="0 0 ${p.cols*c+4} ${p.rows*c+4}" width="${p.cols*c+4}" height="${p.rows*c+4}" role="img" aria-label="Grid of squares">${o.join('')}</svg>`;}
function rectV(p){const sc=Math.min(320/p.w,170/p.h),w=p.w*sc,h=p.h*sc,W=w+120,H=h+70;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Rectangle"><rect x="20" y="10" width="${w}" height="${h}" fill="#BFD9F7" stroke="${INK}" stroke-width="4"/>${T(20+w/2,h+42,`${p.w} ${p.unit}`,`font-size="20" fill="${INK}"`)}${T(w+62,10+h/2+7,`${p.h} ${p.unit}`,`font-size="20" fill="${INK}"`)}</svg>`;}
function fractionLine(p){const W=600,l=40,r=W-40,y=50,s=(r-l)/p.parts;let o=`<line x1="${l}" y1="${y}" x2="${r}" y2="${y}" stroke="${INK}" stroke-width="3"/>`;
  for(let k=0;k<=p.parts;k++){const x=l+k*s;o+=`<line x1="${x}" y1="${y-12}" x2="${x}" y2="${y+12}" stroke="${INK}" stroke-width="${k%p.parts?2:3}"/>`;}
  o+=T(l,y+40,'0',`font-size="20" fill="${INK}"`)+T(r,y+40,'1',`font-size="20" fill="${INK}"`)+`<circle cx="${l+p.point*s}" cy="${y}" r="11" fill="${ACC}"/>`;
  return `<svg viewBox="0 0 ${W} 100" width="${W}" height="100" role="img" aria-label="Number line from 0 to 1">${o}</svg>`;}
function linePlot(p){const xs=p.values.map(v=>v.x),n=xs.length,W=Math.max(420,n*70+60),step=(W-80)/(n-1),y0=60+Math.max(...p.values.map(v=>v.count))*26;let o='';
  o+=`<line x1="20" y1="${y0}" x2="${W-20}" y2="${y0}" stroke="${INK}" stroke-width="3"/>`;
  p.values.forEach((v,i)=>{const x=40+i*step;o+=`<line x1="${x}" y1="${y0-8}" x2="${x}" y2="${y0+8}" stroke="${INK}" stroke-width="2"/>`+T(x,y0+30,v.x,`font-size="18" fill="${INK}"`);
    for(let k=0;k<v.count;k++)o+=T(x,y0-16-k*26,'✕',`font-size="22" fill="${SKY}"`);});
  o+=T(W/2,y0+58,esc(p.title),`font-size="16" fill="#5D6B85"`);
  return `<svg viewBox="0 0 ${W} ${y0+70}" width="${W}" height="${y0+70}" role="img" aria-label="Line plot">${o}</svg>`;}
function angleV(p){const rot=Math.min(p.rotate||0,180-p.degrees),cx=110,cy=140,L=95,a1=-rot*Math.PI/180,a2=a1-p.degrees*Math.PI/180;
  const P=a=>[cx+L*Math.cos(a),cy+L*Math.sin(a)],[x1,y1]=P(a1),[x2,y2]=P(a2),ar=34,[ax1,ay1]=[cx+ar*Math.cos(a1),cy+ar*Math.sin(a1)],[ax2,ay2]=[cx+ar*Math.cos(a2),cy+ar*Math.sin(a2)];
  return `<svg viewBox="0 0 220 180" width="220" height="180" role="img" aria-label="Angle"><line x1="${cx}" y1="${cy}" x2="${x1}" y2="${y1}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${ax1},${ay1} A${ar},${ar} 0 ${p.degrees>180?1:0} 0 ${ax2},${ay2}" fill="none" stroke="${ACC}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="5" fill="${INK}"/></svg>`;}
function linesV(p){const t=p.tilt||0;let g;
  if(p.kind==='parallel') g=`<line x1="20" y1="70" x2="220" y2="70" stroke="${INK}" stroke-width="5"/><line x1="20" y1="130" x2="220" y2="130" stroke="${SKY}" stroke-width="5"/>`;
  else if(p.kind==='perpendicular') g=`<line x1="20" y1="100" x2="220" y2="100" stroke="${INK}" stroke-width="5"/><line x1="120" y1="10" x2="120" y2="190" stroke="${SKY}" stroke-width="5"/>`;
  else g=`<line x1="20" y1="100" x2="220" y2="100" stroke="${INK}" stroke-width="5"/><line x1="50" y1="180" x2="190" y2="20" stroke="${SKY}" stroke-width="5"/>`;
  return `<svg viewBox="0 0 240 200" width="240" height="200" role="img" aria-label="Two lines"><g transform="rotate(${t} 120 100)">${g}</g></svg>`;}
function symmetryV(p){const S=180,c=S/2,st=`fill="#BFD9F7" stroke="${INK}" stroke-width="4" stroke-linejoin="round"`;
  const ln=p.line==='vertical'?`<line x1="${c}" y1="0" x2="${c}" y2="${S}"/>`:p.line==='horizontal'?`<line x1="0" y1="${c}" x2="${S}" y2="${c}"/>`:
    (p.shape==='rectangle'?`<line x1="8" y1="${c-41}" x2="${S-8}" y2="${c+41}"/>`:`<line x1="${c-62}" y1="${c-62}" x2="${c+62}" y2="${c+62}"/>`);
  return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="Shape with a dashed line">${shapeInner(p.shape,S,st)}<g stroke="${ACC}" stroke-width="4" stroke-dasharray="10 7">${ln}</g></svg>`;}

function emojiPic(p, small){const S=small?110:170, f=p.flip==='h'?'scale(-1 1)':p.flip==='v'?'scale(1 -1)':'';
  return `<svg viewBox="0 0 120 120" width="${S}" height="${S}" role="img" aria-label="Picture"><g transform="translate(60 60) rotate(${p.rotate||0}) ${f}"><text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="84">${p.e}</text></g></svg>`;}
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
  for(let k=0;k<p.total;k++){const [x,y]=pt(k);o+=`<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="${INK}" stroke-width="1.2" stroke-opacity=".55"/>`;}
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
  const a=p.degrees*Math.PI/180;o+=`<line x1="${cx}" y1="${cy}" x2="${cx+ri*1.2}" y2="${cy}" stroke="${SKY}" stroke-width="5" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${cx+ri*1.2*Math.cos(a)}" y2="${cy-ri*1.2*Math.sin(a)}" stroke="${SKY}" stroke-width="5" stroke-linecap="round"/>`;
  o+=`<path d="M${cx+40},${cy} A40,40 0 0 0 ${cx+40*Math.cos(a)},${cy-40*Math.sin(a)}" fill="none" stroke="${ACC}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="6" fill="${INK}"/>`;
  return `<svg viewBox="0 0 440 230" width="440" height="230" role="img" aria-label="Angle on a protractor">${o}</svg>`;}
const visualOf = (q, small) => q.visual_type && q.visual_type !== 'none' && q.visual_type !== 'column' ? `<div class="visual">${V(q.visual_type, q.params, small)}</div>` :
                               q.visual_type === 'column' ? `<div class="visual">${V('column', q.params)}</div>` : '';

// ---------- screens ----------
function showWelcome(){
  prog.hidden = true;
  const counts = [1,2,3].map(g => subsFor(g).size);
  app.innerHTML = `<div style="font-size:60px;line-height:1" aria-hidden="true">🧮</div>
    <h1>Hi there! Ready for your math challenge?</h1>
    <div class="field"><label for="kid">What's your name?</label><input id="kid" class="namebox" maxlength="20" autocomplete="off" placeholder="Type your name" value="${esc(kidName)}"></div>
    <div class="field"><span class="label" id="glabel">Which grade are you in?</span>
      <div class="grades" role="radiogroup" aria-labelledby="glabel">${[1,2,3].map(g=>`<button class="gbtn" role="radio" aria-checked="${g===grade}" data-g="${g}">Grade ${g}<small>${counts[g-1]} questions</small></button>`).join('')}</div></div>
    <p class="muted">One question from each part of the grade's math. Try your best. If you don't know one, tap Skip. You'll see how you did at the end.</p>
    <div><button class="btn btn-primary" id="start">Let's start!</button></div>`;
  app.querySelectorAll('.gbtn').forEach(b => b.onclick = () => { grade = +b.dataset.g; app.querySelectorAll('.gbtn').forEach(x => x.setAttribute('aria-checked', String(x === b))); });
  const kid = document.getElementById('kid'); kid.oninput = () => { kidName = kid.value.trim(); };
  document.getElementById('start').onclick = () => { kidName = kid.value.trim(); test = pickTest(); idx = 0; reached = 0; exitedAt = null; answers = Array(test.length).fill(undefined); showQuestion(); };
}
function renderProgress(){
  prog.hidden = false;
  const done = answers.filter(a => a !== undefined).length, skipped = answers.filter(a => a === null).length;
  prog.innerHTML = `<div class="progress-label"><span>Question ${idx+1} of ${test.length}</span><span class="muted">${done} done${skipped?` · ${skipped} skipped`:''}</span></div>
    <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="${test.length}" aria-valuenow="${idx+1}"><div class="fill" style="width:${(idx+1)/test.length*100}%"></div></div>`;
}
function showQuestion(){
  const q = test[idx]; reached = Math.max(reached, idx); renderProgress();
  const prev = answers[idx];
  cur = { at:q.answer_type, value: prev && q.answer_type!=='multi_number' ? prev : '', parts:[], field:0 };
  if (q.answer_type==='multi_number') cur.parts = prev ? prev.split('|') : q.params.fields.map(()=> '');
  let input = '';
  if (q.answer_type==='choice_text'){
    input = `<div class="opts ${q.options.length===3?'three':''}" role="group" aria-label="Answer choices">${q.options.map((o,i)=>`<button class="opt" id="opt${i}" aria-pressed="${prev===o}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  } else if (q.answer_type==='choice_picture'){
    input = `<div class="opts ${q.options.length===3?'three':''}" role="group" aria-label="Answer choices">${q.options.map((o,i)=>`<button class="opt" id="opt${i}" aria-pressed="${prev===o.id}" data-v="${o.id}">${V(o.visual_type,o.params,true)}<span class="letter">${o.id}</span></button>`).join('')}</div>`;
  } else if (q.answer_type==='multi_number'){
    const f = q.params.fields, order = q.params.layout === 'order';
    if (q.params.layout === 'remainder') input = `<div class="answer-row"><button class="box small active" id="f0" aria-label="quotient"></button><span>R</span><button class="box small" id="f1" aria-label="remainder"></button></div>${pad(false)}`;
    else input = `<div class="answer-row">${f.map((x,i)=>`${order&&x.label?`<span class="muted">${x.label}</span>`:''}<button class="box small ${i===0?'active':''}" id="f${i}" aria-label="${esc(x.label||'box '+(i+1))}"></button>${!order?`<span>${esc(x.label)}</span>`:''}${order&&i<f.length-1?'<span class="muted">,</span>':''}`).join('')}</div>${pad(false)}`;
  } else {
    const unit = q.params && q.params.unit ? `<span>${esc(q.params.unit)}</span>` : '';
    input = `<div class="answer-row"><div class="box active" id="fv" aria-label="Your answer"></div>${unit}</div>${pad(q.answer_type==='time')}`;
  }
  const qHtml = q.visual_type==='column' ? `<p class="q-text">${esc(q.question)}</p>` : `<p class="q-text">${esc(q.question)}</p>`;
  app.innerHTML = `<span class="topic-tag">Grade ${grade} · ${esc(q.topic)}</span>${qHtml}${visualOf(q)}${input}
    <div class="nav"><button class="btn btn-soft" id="prev" ${idx===0?'disabled':''}>← Previous</button>
      <div class="right"><button class="btn btn-skip" id="skip">Skip</button><button class="btn btn-primary" id="next" disabled>${idx===test.length-1?'Finish':'Next →'}</button></div></div>
    <div class="exit" id="exitzone"><button class="link" id="exit">Exit test and see results</button></div>`;
  wire(q);
  document.getElementById('prev').onclick = () => { const a = answerNow(); if (a !== '') answers[idx] = a; idx--; showQuestion(); };
  document.getElementById('skip').onclick = () => { answers[idx] = null; go(); };
  document.getElementById('next').onclick = () => { answers[idx] = answerNow(); go(); };
  document.getElementById('exit').onclick = confirmExit;
  window.scrollTo(0,0);
}
function go(){ idx++; idx < test.length ? showQuestion() : showResults(); }
function confirmExit(){
  const z = document.getElementById('exitzone');
  z.innerHTML = `<div class="confirm"><span>Stop here and see the results for the questions so far?</span><span style="display:flex;gap:8px"><button class="btn btn-soft" id="stay">Keep going</button><button class="btn btn-primary" id="leave">See results</button></span></div>`;
  document.getElementById('stay').onclick = () => { z.innerHTML = '<button class="link" id="exit">Exit test and see results</button>'; document.getElementById('exit').onclick = confirmExit; };
  document.getElementById('leave').onclick = () => { const a = answerNow(); if (a !== '') answers[idx] = a; exitedAt = idx; showResults(); };
}
function pad(colon){
  return `<div class="pad">${[1,2,3,4,5,6,7,8,9].map(k=>`<button class="key" data-k="${k}">${k}</button>`).join('')}
    <button class="key alt" data-k="${colon?':':'clear'}">${colon?':':'Clear'}</button><button class="key" data-k="0">0</button><button class="key alt" data-k="back" aria-label="Delete">⌫</button></div>`;
}
function answerNow(){ return cur.at==='multi_number' ? (cur.parts.every(x=>x!=='') ? cur.parts.join('|') : '') : cur.value; }
function refresh(){
  if (cur.at==='multi_number') cur.parts.forEach((v,i)=>{ const el=document.getElementById('f'+i); el.innerHTML = v===''?'<span class="ph">?</span>':esc(v); el.classList.toggle('active', cur.field===i); });
  else if (cur.at==='number' || cur.at==='time') document.getElementById('fv').innerHTML = cur.value===''?'<span class="ph">?</span>':esc(cur.value);
  document.getElementById('next').disabled = answerNow()==='';
}
function wire(q){
  if (cur.at.startsWith('choice')){
    app.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{ app.querySelectorAll('.opt').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); cur.value=b.dataset.v; refresh(); });
    refresh(); return;
  }
  if (cur.at==='multi_number') cur.parts.forEach((_,i)=>document.getElementById('f'+i).onclick=()=>{cur.field=i; refresh();});
  app.querySelectorAll('.key').forEach(b=>b.onclick=()=>{
    const k=b.dataset.k, multi=cur.at==='multi_number'; let v = multi ? cur.parts[cur.field] : cur.value;
    if (k==='back') v=v.slice(0,-1); else if (k==='clear') v='';
    else if (k===':'){ if(!v.includes(':') && v.length) v+=':'; }
    else { const max = multi ? 4 : cur.at==='time' ? 5 : 5; if (v.length<max) v+=k; }
    if (multi){ cur.parts[cur.field]=v; if (/^\d$/.test(k) && v.length>=String((q.correct_answer.split('|')[cur.field])).length && cur.field<cur.parts.length-1 && cur.parts[cur.field+1]==='') cur.field++; }
    else cur.value=v;
    refresh();
  });
  refresh();
}

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
  app.innerHTML = `<div><h2>${msg}${kidName?`, ${esc(kidName)}`:''}</h2><p class="muted">Grade ${grade} check</p><p class="muted">${exitedAt!=null?`Stopped after question ${last+1} of ${test.length}. `:''}${ok} of ${seen.length} correct.</p></div>
    <div class="summary"><div class="tile"><b>${seen.length}</b>Questions</div><div class="tile ok"><b>${ok}</b>Correct</div><div class="tile no"><b>${wrong}</b>Not quite</div><div class="tile sk"><b>${sk}</b>Skipped</div></div>
    <div class="topics">${Object.entries(byTopic).map(([t,v])=>`<span class="chip ${v.r/v.n<.5?'low':''}">${esc(t)}: ${v.r} of ${v.n}</span>`).join('')}</div>
    <div class="toolbar"><strong>Every question</strong><button class="btn btn-soft" id="filter" style="min-height:48px;padding:10px 18px;font-size:17px">${onlyMissed?'Show all':'Show only missed & skipped'}</button></div>
    <div class="list">${rows.map(x=>row(x)).join('') || '<p class="muted">Nothing missed or skipped.</p>'}</div>
    <div><button class="btn btn-primary" id="again">Take a new test</button></div>`;
  document.getElementById('again').onclick = () => { onlyMissed = false; showWelcome(); };
  document.getElementById('filter').onclick = () => { onlyMissed = !onlyMissed; showResults(); };
  window.scrollTo(0,0);
}
function correctDisplay(q){
  if (q.answer_type==='choice_picture') return `${q.correct_answer}`;
  return showAnswer(q, q.correct_answer);
}
function row({q,a,i,s}){
  const label = s==='ok'?'✅ Correct':s==='wrong'?'❌ Not quite':'⏭️ Skipped', cls = s==='ok'?'ok':s==='wrong'?'no':'sk';
  const pics = q.answer_type==='choice_picture' ? `<div class="opts ${q.options.length===3?'three':'four'}">${q.options.map(o=>`<div class="opt" style="cursor:default;${o.id===q.correct_answer?'border-color:#1E9E62':''}">${V(o.visual_type,o.params,true)}<span class="letter">${o.id}</span></div>`).join('')}</div>` : '';
  return `<div class="row ${s==='ok'?'':s==='wrong'?'wrong':'skipped'}">
    <div class="row-head"><span class="mark ${cls}">${i+1}. ${label}</span><span class="meta"><span class="tag">${esc(q.topic)} · ${esc(q.subtopic)}</span>${q.is_stretch?'<span class="tag stretch">Stretch</span>':''}<span class="tag">${esc(q.q_id)}</span></span></div>
    <div class="row-q">${esc(q.question)}</div>${visualOf(q,true)}${pics}
    <div class="ans"><div class="${cls}"><b>Answer given</b>${esc(s==='skipped'?'Skipped':showAnswer(q,a))}</div><div><b>Correct answer</b>${esc(correctDisplay(q))}</div></div>
    ${s!=='ok' && q.wrong_answer_notes ? `<div class="note"><b>${s==='skipped'?'What this checks':'Common mistakes'}:</b> ${esc(q.wrong_answer_notes)}</div>`:''}
  </div>`;
}

// ---------- load the question bank from Supabase (read-only, public) ----------
async function loadBank(){
  const { url, key } = window.PREPME_CFG || {};
  if (!url || !key) throw new Error('Supabase settings are missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  const H = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async path => { const r = await fetch(`${url}/rest/v1/${path}`, { headers: H }); if (!r.ok) throw new Error(`Supabase ${r.status}`); return r.json(); };
  const subs = await get('subcategories?select=skill_id,sort_order');
  const order = Object.fromEntries(subs.map(s => [s.skill_id, s.sort_order]));
  let rows = [];
  for (let off = 0; ; off += 1000) {
    const page = await get(`questions?select=*&status=neq.rejected&order=q_id&offset=${off}&limit=1000`);
    rows = rows.concat(page); if (page.length < 1000) break;
  }
  rows.sort((a, b) => (order[a.skill_id] ?? 9999) - (order[b.skill_id] ?? 9999) || a.q_id.localeCompare(b.q_id));
  return rows;
}
app.innerHTML = '<p style="text-align:center;padding:40px 0;color:#5D6B85">Loading questions…</p>';
loadBank().then(rows => { BANK = rows; showWelcome(); })
  .catch(e => { app.innerHTML = `<p style="text-align:center;padding:40px 0">Couldn't load the questions. ${esc(e.message)}</p><p style="text-align:center"><button class="btn" onclick="location.reload()">Try again</button></p>`; });
