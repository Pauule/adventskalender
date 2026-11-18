'use strict';
const YEAR=2026;
const KEY='emma-advent-'+YEAR;
const $=(sel,root=document)=>root.querySelector(sel);
const dialog=$('#door'), inner=$('#doorInner'), grid=$('#calendar');
const pad=n=>String(n).padStart(2,'0');
const normalize=s=>s.trim().toLocaleLowerCase('de-DE').normalize('NFC').replace(/[^\p{L}\p{N}]/gu,'');
function element(tag,cls='',value=''){const n=document.createElement(tag);if(cls)n.className=cls;if(value)n.textContent=value;return n;}
function btn(label,cls,fn){const b=element('button',cls,label);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function unlocked(now=new Date()){
  const parts=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now);
  const y=+parts.find(p=>p.type==='year').value,m=+parts.find(p=>p.type==='month').value,d=+parts.find(p=>p.type==='day').value;
  return y<YEAR||y===YEAR&&m<12?0:y>YEAR?24:Math.min(24,d);
}
let progress={};
try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');if(p&&typeof p==='object'&&!Array.isArray(p))progress=p;}catch{}
let current=0, serial=0, focusFrom=null, viewDay=-1;
function paint(){
  const day=unlocked(), available=day, done=R.reduce((s,_,i)=>s+Number(Boolean(progress[i+1])),0);
  viewDay=day;
  $('#count').textContent=done+' von 24 gefunden';
  $('#progress').setAttribute('aria-valuenow',done);
  $('#progress div').style.width=100*done/24+'%';
  const next=day;
  $('#todayLabel').textContent=day?pad(day)+'. DEZEMBER':'BALD GEHT ES LOS';
  $('#todayTitle').textContent=day?(progress[day]?'Dein Päckchen ist gefunden':R[day-1].title):'Am 1. Dezember öffnet sich das erste Türchen.';
  $('#todayText').textContent=day?(progress[day]?'Hier findest du die Nummer wieder.':'Ein neues Rätsel wartet auf dich.'):'Bis dahin bleiben die Überraschungen noch gut verpackt.';
  const today=$('#todayButton');
  today.hidden=!next;
  today.textContent=(progress[next]?'Zum Päckchen':'Zum Rätsel')+' →';
  today.onclick=()=>openDoor(next,today);
  grid.replaceChildren();
  R.forEach((_,i)=>{
    const d=i+1, ok=d<=available, solved=Boolean(progress[d]);
    const b=btn('', 'tile'+(ok?' open':'')+(solved?' solved':'')+(next===d?' current':''),e=>{if(e.currentTarget.getAttribute('aria-disabled')!=='true')openDoor(d,e.currentTarget)});
    b.dataset.day=d;
    b.append(element('span','door-num',pad(d)),element('span','tile-status',solved?'✓':ok?'◇':'·'));
    b.setAttribute('aria-label',d+'. Dezember, '+(solved?'Päckchen gefunden':ok?'verfügbar':'noch geschlossen'));
    if(!ok){b.setAttribute('aria-disabled','true');b.tabIndex=-1;}
    if(next===d)b.setAttribute('aria-current','date');
    grid.append(b);
  });
}
function openDoor(day,trigger){
  if(!R[day-1]||day>unlocked())return;
  current=day;focusFrom=trigger;
  drawDoor();
  if(!dialog.open)dialog.showModal();
  $('#doorTitle').focus({preventScroll:true});
}
function closeDoor(){
  if(!dialog.open)return;
  dialog.close();
  serial++;const day=current;current=0;
  paint();
  const next=focusFrom?.id==='todayButton'?$('#todayButton'):grid.querySelector('[data-day="'+day+'"]');
  if(next&&!next.hidden)next.focus({preventScroll:true});
}
dialog.addEventListener('cancel',e=>{e.preventDefault();closeDoor();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)closeDoor();}});
function finish(status){
  if(!dialog.open||!current)return;
  progress[current]=status;
  try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{}
  drawDoor();dialog.scrollTop=0;$('#doorTitle').focus({preventScroll:true});
}
function drawDoor(){
  const r=R[current-1], mySerial=++serial;
  inner.replaceChildren($('#doorTemplate').content.cloneNode(true));
  inner.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeDoor);
  const c=$('#doorContent');
  c.append(element('p','meta',pad(current)+'. Dezember · '+r.level));
  const h=element('h2','door-title',r.title);h.id='doorTitle';h.tabIndex=-1;c.append(h);
  if(progress[current]){
    const card=element('section','gift');
    card.append(element('p','gift-label','DEIN PÄCKCHEN'),element('div','gift-number',pad(PAECKCHEN[current-1])),element('p','',progress[current]==='solved'?'Rätsel gelöst! Dieses Päckchen darfst du öffnen.':'Dieses Päckchen darfst du öffnen.'));
    c.append(card);
    if(r.note)c.append(element('p','message',r.note));
    if(current===24&&FINALE)c.append(element('p','hint',FINALE));
    const details=element('details','hint');
    details.append(element('summary','','Rätsellösung ansehen'),element('p','',r.solution));
    if(progress[current]==='revealed')details.open=true;
    c.append(details,btn('Zurück zum Kalender','primary full board-check',closeDoor));
    return;
  }
  c.append(element('p','prompt',r.prompt));
  if(r.feature)c.append(element('div','feature',r.feature));
  if(r.clues){const list=element('ul','clues');for(const clue of r.clues)list.append(element('li','',clue));c.append(list);}
  const zone=element('div','game'), feedback=element('p','feedback');feedback.setAttribute('role','status');
  c.append(zone,feedback);
  const say=s=>{feedback.textContent=s;};
  const win=()=>{if(mySerial===serial)finish('solved');};
  const check=(ok,msg='Noch nicht ganz. Versuch es noch einmal!')=>ok?win():say(msg);
  const makers={text,choice,stars,photo:order,order,memory,map,differences,match};
  makers[r.type](r,zone,check,say,mySerial);
  const help=element('div','help'), hints=element('div','hint'), confirm=element('div','reveal-confirm');
  hints.hidden=true;confirm.hidden=true;
  hints.setAttribute('aria-live','polite');let seen=0;
  const hintBtn=btn('Tipp anzeigen','quiet',()=>{
    const p=element('p','','Tipp '+(seen+1)+' · '+r.hints[seen]);hints.append(p);hints.hidden=false;
    seen++;hintBtn.textContent=seen<r.hints.length?'Zweiten Tipp anzeigen':'Tipps angezeigt';hintBtn.disabled=seen>=r.hints.length;
  });
  const show=btn('Lösung aufdecken','quiet',()=>{confirm.hidden=!confirm.hidden;show.setAttribute('aria-expanded',String(!confirm.hidden));});
  show.setAttribute('aria-expanded','false');
  confirm.append(element('p','','Du kannst das Rätsel überspringen und dein Päckchen trotzdem öffnen.'),btn('Lösung und Päckchen anzeigen','primary full',()=>finish('revealed')));
  help.append(hintBtn,show);c.append(help,hints,confirm);
}
function text(r,z,check){
  const form=element('form','answer-form'), label=element('label','','Deine Antwort'), input=element('input');
  input.id='answer';input.required=true;input.autocomplete='off';input.setAttribute('autocapitalize','none');input.setAttribute('enterkeyhint','go');input.maxLength=90;label.htmlFor=input.id;
  const submit=btn('Antwort prüfen','primary');submit.type='submit';
  form.append(label,input,submit);
  form.onsubmit=e=>{e.preventDefault();check(r.answers.some(a=>normalize(a)===normalize(input.value)));};
  z.append(form);
}
function choice(r,z,check){
  if(r.image){
    const wrap=element('div','zoom-frame'), scene=element('div');
    scene.setAttribute('role','img');scene.setAttribute('aria-label','Bildausschnitt einer Winterszene');
    scene.style.backgroundImage='url('+r.image+')';let stage=0;
    const frames=r.zooms||[[r.zoom,r.pos]];
    const paint=()=>{scene.style.backgroundSize=frames[stage][0];scene.style.backgroundPosition=frames[stage][1];scene.setAttribute('aria-label','Bildausschnitt '+(stage+1)+' von '+frames.length);};
    wrap.append(scene);paint();
    if(frames.length>1)wrap.append(btn('Mehr vom Bild zeigen (1 / '+frames.length+')','quiet',e=>{stage++;paint();e.currentTarget.textContent=stage+1===frames.length?'Ganzes Bild sichtbar':'Mehr vom Bild zeigen ('+(stage+1)+' / '+frames.length+')';e.currentTarget.disabled=stage+1===frames.length;}));
    z.append(wrap);
  }
  const row=element('div','options');
  r.options.forEach((o,i)=>row.append(btn(o,'pick',()=>check(i===r.correct))));z.append(row);
}
function board(cols,cls=''){const n=element('div','board '+cls);n.style.setProperty('--cols',cols);return n;}
function stars(r,z,check){
  const scene=element('div','scene'), stat=element('p','board-note','0 von 5 Sternen gefunden');let found=0;stat.setAttribute('aria-live','polite');
  [[19,23],[53,15],[84,28],[70,55],[30,79]].forEach(([x,y],i)=>{
    const b=btn('✦','target',()=>{b.disabled=true;stat.textContent=++found+' von 5 Sternen gefunden';if(found===5)check(true);});
    b.style.left=x+'%';b.style.top=y+'%';b.setAttribute('aria-label','Versteckter Stern '+(i+1));scene.append(b);
  });
  z.append(scene,stat);
}
function order(r,z,check,say){
  const photo=r.type==='photo', cols=photo?3:r.title==='Die Nikolaus-Kisten'?4:2, seq=[...(photo?r.items:r.start)], area=board(cols), buttons=[];let a=-1;
  const display=()=>buttons.forEach((b,i)=>{
    const item=seq[i];b.setAttribute('aria-pressed',String(a===i));b.disabled=i<(r.fixed||0);
    if(photo){b.style.backgroundImage='url('+r.image+')';b.style.backgroundSize='300% 200%';b.style.backgroundPosition=(item%3)*50+'% '+Math.floor(item/3)*100+'%';b.setAttribute('aria-label','Bildkachel '+(i+1));}
    else b.textContent=(i+1)+'. '+r.items[item];
  });
  seq.forEach((_,i)=>{
    const b=btn('','cell'+(photo?' photo':''),()=>{
      if(a===i)a=-1;else if(a===-1)a=i;else{[seq[a],seq[i]]=[seq[i],seq[a]];a=-1;say('Kacheln getauscht.');}
      display();
    });
    buttons.push(b);area.append(b);
  });
  z.append(area,btn('Reihenfolge prüfen','primary board-check',()=>check(seq.every((v,i)=>v===i),'Die Reihenfolge stimmt noch nicht ganz.')));display();
}
const MOTIFS=['🎄','🎁','⭐','🛷','🕯️','🦌'];
const MOTIF_NAMES=['Tanne','Geschenk','Stern','Schlitten','Kerze','Rentier'];
function shuffled(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function memory(r,z,check,say,token){
  const cards=shuffled([0,1,2,3,4,5,0,1,2,3,4,5]), area=board(4,'memory'), matched=new Set(), buttons=[];let first=-1, pending=false;
  function face(i,up){const b=buttons[i];b.textContent=up?MOTIFS[cards[i]]:'✦';b.setAttribute('aria-label','Karte '+(i+1)+(up?' · '+MOTIF_NAMES[cards[i]]:''));b.setAttribute('aria-pressed',String(up));}
  cards.forEach((v,i)=>{
    const b=btn('','cell',()=>{
      if(pending||matched.has(i)||i===first)return;
      face(i,true);
      if(first<0){first=i;return;}
      const prev=first;first=-1;
      if(cards[prev]===v){
        for(const j of [i,prev]){matched.add(j);buttons[j].disabled=true;}
        say(matched.size/2+' von 6 Paaren gefunden');if(matched.size===12)check(true);
      }else{
        pending=true;say('Kein Paar, die Karten drehen sich wieder um.');
        setTimeout(()=>{if(token===serial){face(prev,false);face(i,false);pending=false;}},720);
      }
    });buttons.push(b);area.append(b);face(i,false);
  });
  z.append(area);say('0 von 6 Paaren gefunden');
}
function map(r,z,check,say){
  const cells=r.map.join('').split(''), cols=r.map[0].length, area=board(cols,'map'), buttons=[];
  const names={S:'Start',Z:'Ziel',K:'Schlüssel',B:'Brücke',H:'Hütte',A:'Aussichtspunkt','.':'Weg','#':'Wand'};
  const start=cells.indexOf('S');let pos=start, track=[start], got=[], visible=new Set();
  const neighbor=(a,b)=>Math.abs(a%cols-b%cols)+Math.abs(Math.floor(a/cols)-Math.floor(b/cols))===1;
  const coordinates=i=>'Zeile '+(Math.floor(i/cols)+1)+', Spalte '+(i%cols+1);
  function paint(){
    cells.forEach((_,i)=>{if(!r.fog||i===pos||neighbor(pos,i))visible.add(i);});
    buttons.forEach((b,i)=>{
      const v=cells[i], seen=visible.has(i), active=seen&&v!=='#'&&neighbor(pos,i);
      b.disabled=!active;
      b.setAttribute('aria-pressed',String(i===pos));
      b.classList.toggle('unknown',!seen);
      b.classList.toggle('wall',seen&&v==='#');
      b.classList.toggle('selected',track.includes(i));
      b.textContent=!seen?'':i===pos?'●':v==='#'?'':v==='.'?'·':v;
      b.setAttribute('aria-label',coordinates(i)+' · '+(!seen?'noch nicht erkundet':names[v])+(i===pos?' · dein Feld':''));
    });
  }
  cells.forEach((v,i)=>{
    const b=btn('','cell',()=>{
      if(!visible.has(i)||v==='#'||!neighbor(pos,i))return;
      if(r.unique&&track.includes(i)){say('Dieses Feld ist schon auf deiner Route. Nutze bei Bedarf „Schritt zurück“.');return;}
      if(r.ordered&&r.needs.includes(v)&&!got.includes(v)&&v!==r.needs[got.length]){say('Diese Wegmarke ist noch nicht dran.');return;}
      if(v==='Z'&&got.length!==r.needs.length){say('Dir fehlt noch etwas, bevor du ans Ziel kannst.');return;}
      pos=i;track.push(i);if(r.needs.includes(v)&&!got.includes(v))got.push(v);
      paint();say(got.length+' von '+r.needs.length+' unterwegs gefunden.');
      if(v==='Z')check(true);
      else if(document.activeElement===b||document.activeElement===document.body){
        const next=buttons.find((x,j)=>!x.disabled&&(!r.unique||!track.includes(j)));
        (next||z.querySelector('.quiet'))?.focus({preventScroll:true});
      }
    });
    buttons.push(b);area.append(b);
  });
  const tools=element('div','options');
  tools.append(btn('Schritt zurück','quiet',()=>{
    if(track.length<2){say('Du bist am Start.');return;}
    track.pop();pos=track.at(-1);got=[...new Set(track.map(i=>cells[i]).filter(v=>r.needs.includes(v)))];paint();say(got.length+' von '+r.needs.length+' unterwegs gefunden.');
  }),btn('Neu starten','quiet',()=>{pos=start;track=[start];got=[];visible=new Set();paint();say('Zurück am Start.');}));
  z.append(element('p','map-key',r.ordered?'B = Brücke · H = Hütte · A = Aussichtspunkt':'K = Schlüssel · ● = dein Feld'),area,tools);paint();
}
function differences(r,z,check,say){
  const top=board(3),bottom=board(3), found=new Set(), names={'🌙':'Mond','⭐':'Stern','☁️':'Wolke','🏠':'Haus','🌲':'Tanne','⛄':'Schneemann','🎁':'Geschenk','🛷':'Schlitten','🕯️':'Kerze','❄️':'Schneeflocke','🦌':'Rentier','🔔':'Glocke'};
  r.items.forEach(v=>{const cell=element('span','cell static-cell',v);cell.setAttribute('aria-label',names[v]);top.append(cell);});
  r.alt.forEach((v,i)=>{
    const b=btn(v,'cell',()=>{
      if(v===r.items[i]){say('Dieses Feld ist gleich geblieben.');return;}
      found.add(i);b.disabled=true;b.setAttribute('aria-pressed','true');
      say(found.size+' von 3 Unterschieden gefunden.');if(found.size===3)check(true);
    });b.setAttribute('aria-label','Feld '+(i+1)+' · '+names[v]);bottom.append(b);
  });
  z.append(element('p','meta','Original'),top,element('p','meta','Unterschiede hier antippen'),bottom);
}
function match(r,z,check){
  const form=element('div','match'), all=[];
  r.rows.forEach((label,i)=>{
    const field=element('fieldset','pair'), inputs=[];field.append(element('legend','',label));
    r.columns.forEach((opts,j)=>{
      const select=element('select','pick'), label=r.columns.length===1?'Satzende':j===0?'Weg':'Fundstück';
      select.setAttribute('aria-label',r.rows[i]+' · '+label);
      const placeholder=element('option','',label+' wählen');placeholder.value='';select.append(placeholder);
      opts.forEach((o,k)=>{const opt=element('option','',o);opt.value=k;select.append(opt);});
      inputs.push(select);field.append(select);
    });all.push(inputs);form.append(field);
  });
  z.append(form,btn('Zuordnung prüfen','primary board-check',()=>check(all.every((row,i)=>row.every((s,j)=>s.value!==''&&Number(s.value)===r.correct[i][j])),'Mindestens eine Zuordnung fehlt oder stimmt noch nicht.')));
}
paint();
function refresh(){if(viewDay!==unlocked())paint();}
document.addEventListener('visibilitychange',refresh);
setInterval(refresh,30000);
