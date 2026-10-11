const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const VW=640,VH=352,S=2;cv.width=VW*S;cv.height=VH*S;ctx.scale(S,S);
const T=32,W=70,H=11,MAXHP=150;
// ---- Level ----
// Each level: pits (col ranges), plats [row,fromCol,toCol], stairs start col, coins [col,row], enemy cols
const LEVELS=[
 {sky:'#87ceeb',theme:'meadow',par:50,pits:[[16,17],[30,32],[46,47]],plats:[[7,8,10],[6,22,25],[6,36,39],[7,52,54]],stairs:58,
  coins:[[4,8],[5,8],[6,8],[8,6],[9,6],[10,6],[13,8],[14,8],[16,5],[17,5],[22,5],[23,5],[24,5],[25,5],[28,8],[31,5,'h'],[37,5],[38,5],[46,5],[47,5],[53,6],[64,8],[65,8]],enemies:[],flyers:[],boxes:[[20,8],[42,8]]},
 {sky:'#d9822b',theme:'desert',par:60,pits:[[18,20],[40,42]],plats:[[6,10,13],[6,25,28],[4,30,32],[6,47,50]],stairs:58,
  coins:[[11,5],[12,5],[26,5],[27,5],[31,3,'h'],[19,5],[41,5],[48,5,'h'],[49,5]],enemies:[14,33,45,53],
  flyers:[],boxes:[[12,8],[36,8],[28,5]]},
 {sky:'#2a2f6b',theme:'ice',par:80,pits:[[10,11],[18,20],[28,30],[38,39],[46,48],[55,56]],plats:[[7,14,15],[6,23,25],[6,31,33],[7,42,43],[6,50,52]],stairs:59,
  coins:[[14,6],[15,6],[23,5],[24,5],[25,5],[32,4,'h'],[19,5],[42,6],[43,6],[51,5],[47,5,'h']],enemies:[8,16,25,35,44,52],
  flyers:[[5,7,60],[27,8,60],[36,6,70],[53,7,50]],boxes:[[13,8],[35,8],[52,5]]},
 {sky:'#3b1f4a',theme:'crystal',par:115,pits:[[8,9],[16,17],[24,25],[33,35],[41,42],[49,50],[57,58]],plats:[[7,12,14],[6,19,22],[4,23,25],[6,29,31],[7,37,39],[6,44,46],[6,53,55]],stairs:60,
  coins:[[9,5],[13,6],[14,6],[17,5],[20,5],[21,5],[24,3,'h'],[25,3],[30,5],[34,5],[38,6],[41,5],[42,5],[45,5,'h'],[49,5],[50,5],[54,5,'h'],[57,5],[58,5],[64,8],[65,8]],
  enemies:[21,28,32,38,47],
  flyers:[[15,6,60],[28,7,60],[36,6,70],[54,6,60]],boxes:[[5,8],[27,8],[40,8],[55,5]]},
 {sky:'#2b0a0a',theme:'castle',par:130,boss:true,pits:[[10,11],[20,22],[30,31],[36,37]],plats:[[6,13,15],[7,24,26],[6,32,34]],stairs:null,
  coins:[[10,5],[11,5],[14,5,'h'],[21,5],[25,6,'h'],[30,5],[31,5],[33,5],[36,5],[37,5],[42,8,'h']],
  enemies:[17,27,40],
  flyers:[[25,6,60],[34,7,50]],boxes:[[5,8],[17,8],[27,8],[39,8]]}
];
let level=0,g,coinSpots,enemySpots;
function build(){
  const L=LEVELS[level];
  g=[];for(let r=0;r<H;r++)g.push(new Array(W).fill(0));
  for(let c=0;c<W;c++){if(L.pits.some(q=>c>=q[0]&&c<=q[1]))continue;g[9][c]=1;g[10][c]=1;}
  L.plats.forEach(([r,a,b])=>{for(let c=a;c<=b;c++)g[r][c]=1});
  if(L.stairs!=null)for(let i=0;i<4;i++)for(let r=8-i;r<=8;r++)g[r][L.stairs+i]=1;
  coinSpots=L.coins;enemySpots=L.enemies;cv.style.background=L.sky;
  const sel=document.getElementById('lvl');if(sel)sel.value=level;
}
const solid=(c,r)=>c<0||c>=W?true:(r<0||r>=H?false:g[r][c]===1);
const k={l:0,r:0,j:0,c:0,f:0};
let wparts=[],wclouds=[],wt=0,flash=0,fx={armor:0,range:0,dmg:0,speed:0,star:0},boxes=[],hp=150,safeX=64,safeY=200,p,coins,enemies,score,state,camX,pts=0,character='boy',bank=0,clock=0,floats=[],boss=null,fireballs=[],shots=[],cool=0,deaths=0,lastBonus=0,flyers=[],attemptStart=0,finalScore=0,endMode='won',lastTime=0,timeBonus=0,mode='next',prevState='play',lastName='';
function reset(){
  k.l=k.r=k.j=k.c=k.f=0;
  if(state==='dead')deaths++;
  if(state==='win')level=0;
  document.getElementById('modal').hidden=true;
  if(level===0){bank=0;clock=0;}
  attemptStart=clock;
  build();
  p={x:64,y:200,w:24,h:30,vx:0,vy:0,onGround:false,inv:0,kb:0,kbT:0};
  hp=MAXHP;safeX=64;safeY=200;
  coins=coinSpots.map(s=>({x:s[0]*T+8,y:s[1]*T+8,got:false,h:s[2]==='h'}));
  enemies=enemySpots.map(c=>({x:c*T,y:8*T+4,w:28,h:28,vx:-1,vy:0,alive:true}));
  fireballs=[];shots=[];cool=0;
  fx={armor:0,range:0,dmg:0,speed:0,star:0};
  initWeather();
  boxes=(LEVELS[level].boxes||[]).map(b=>({x:b[0]*T+4,y:(b[1]+1)*T-24,w:24,h:24,open:false}));
  boss=LEVELS[level].boss?{x:58*T,y:9*T-64,w:64,h:64,vx:-1.2,vy:0,hp:5,maxhp:5,inv:0,jumpT:90,fireT:140}:null;
  flyers=LEVELS[level].flyers.map((f,i)=>({cx:f[0]*T,cy:f[1]*T,rx:f[2],a:i*1.7,x:f[0]*T,y:f[1]*T,w:28,h:22,alive:true}));
  score=0;pts=0;floats=[];state='play';camX=0;
}
reset();
// ---- Input ----
const map={ArrowLeft:'l',a:'l',ArrowRight:'r',d:'r',ArrowUp:'j',w:'j',ArrowDown:'c',s:'c',' ':'f'};
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(map[e.key]){if(state==='play')k[map[e.key]]=1;e.preventDefault();}if(state==='dead'&&e.key===' ')reset();});
addEventListener('blur',()=>{k.l=k.r=k.j=k.c=k.f=0;});
addEventListener('keyup',e=>{if(map[e.key])k[map[e.key]]=0;});
[['bl','l'],['br','r'],['bj','j'],['bc','c'],['bf','f']].forEach(([id,key])=>{
  const b=document.getElementById(id);
  b.addEventListener('pointerdown',e=>{e.preventDefault();k[key]=1;if(state==='dead'&&key==='j')reset();});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>k[key]=0));
});
cv.addEventListener('pointerdown',()=>{if(state==='dead')reset();});
// ---- Modal ----
const el=id=>document.getElementById(id);
const MAXR=10;
const HSK='miniplat_hs';
function loadHS(){try{return JSON.parse(localStorage.getItem(HSK))||[];}catch(e){return [];}}
function storeHS(l){try{localStorage.setItem(HSK,JSON.stringify(l));}catch(e){}}
function qualifies(sc){const l=loadHS();return l.length<10||sc>l[l.length-1].s;}
function renderHS(hl){
  const ol=el('hs');ol.innerHTML='';
  const l=loadHS();
  if(!l.length){const li=document.createElement('li');li.textContent='No scores yet';ol.appendChild(li);}
  l.forEach((e,i)=>{const li=document.createElement('li');li.textContent=(i===hl?'\u2605 ':'')+e.n+' - '+e.s+' pts ('+fmt(e.t)+')';if(i===hl)li.style.fontWeight='bold';ol.appendChild(li);});
  ol.hidden=false;
}
function recordScore(){
  const l=loadHS();
  if(!(l.length<10||finalScore>l[l.length-1].s))return -1;
  const e={n:player?player.n:'Player',s:finalScore,t:clock};
  l.push(e);l.sort((a,b)=>(b.s-a.s)||(a.t-b.t));
  const top=l.slice(0,10);storeHS(top);return top.indexOf(e);
}
const fmt=ms=>{const s=ms/1000;return Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0');};
function showModal(last){
  k.l=k.r=k.j=k.c=k.f=0;finalScore=bank;endMode='won';
  document.getElementById('mt').textContent=last?"🏆 You're a winner!":'Level '+(level+1)+' complete!';
  document.getElementById('mp').textContent=(last?'You beat every level!\n':'')+'Diamonds: '+score+'/'+coinTotal()+'  |  Bonus: +'+lastBonus+(deaths?' ('+deaths+(deaths>1?' retries':' retry')+')':' (no retries!)')+'\nSpeed bonus: +'+timeBonus+' ('+fmt(lastTime)+')\nScore: '+bank+'  |  Total time: '+fmt(clock);
  hideAll();el('mb').hidden=false;
  if(!last){mode='next';el('mb').textContent='Next level';}
  else{
    const idx=recordScore();mode='won';
    if(idx>=0){el('mt').textContent='New high score!';el('mp').textContent+='\nSaved as '+(player?player.n:'Player')+'!';}
    renderHS(idx);el('mb').textContent='Play again';
  }
  el('modal').hidden=false;
}
function gameOver(){
  k.l=k.r=k.j=k.c=k.f=0;state='over';finalScore=bank+pts;endMode='over';
  el('mt').textContent='Out of retries!';
  el('mp').textContent='You used all '+MAXR+' retries on level '+(level+1)+'.\nFinal score: '+finalScore;
  hideAll();el('mb').hidden=false;
  const idx=recordScore();mode='over';
  if(idx>=0)el('mp').textContent+='\nSaved as '+(player?player.n:'Player')+' on the leaderboard!';
  renderHS(idx);el('mb').textContent='Start over';
  el('modal').hidden=false;
}
el('hsb').addEventListener('click',e=>{
  e.target.blur();
  if(state!=='play'&&state!=='dead')return;
  prevState=state;state='scores';mode='scores';
  k.l=k.r=k.j=k.c=k.f=0;
  el('mt').textContent='High scores';el('mp').textContent='';
  hideAll();el('mb').hidden=false;renderHS();
  el('mb').textContent='Close';el('modal').hidden=false;
});
el('mb').addEventListener('click',()=>{
  if(mode==='scores'){state=prevState;el('modal').hidden=true;return;}
  if(mode==='over'){level=0;deaths=0;state='play';reset();showSelect();return;}
  const wrapped=level>=LEVELS.length-1;
  if(wrapped)level=0;else level++;
  deaths=0;
  state='play';reset();
  if(wrapped)showSelect();
});
// ---- Menu ----
const lvl=el('lvl');
LEVELS.forEach((_,i)=>{const o=document.createElement('option');o.value=i;o.textContent='Level '+(i+1)+(LEVELS[i].boss?' - Boss':'');lvl.appendChild(o);});
lvl.value=level;
lvl.addEventListener('change',()=>{
  if(state==='select'){lvl.value=level;return;}
  level=+lvl.value;bank=0;clock=0;deaths=0;state='play';reset();lvl.blur();
});
document.getElementById('rs').addEventListener('click',e=>{if(state==='select')return;state='play';reset();e.target.blur();});
// ---- Collision ----
function hit(o,axis){
  for(let r=Math.floor(o.y/T);r<=Math.floor((o.y+o.h-1)/T);r++)
    for(let c=Math.floor(o.x/T);c<=Math.floor((o.x+o.w-1)/T);c++)
      if(solid(c,r)){
        if(axis==='x'){o.x=o.vx>0?c*T-o.w:(c+1)*T;}
        else if(o.vy>0){o.y=r*T-o.h;o.onGround=true;o.vy=0;}
        else{o.y=(r+1)*T;o.vy=0;}
        return true;
      }
  return false;
}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
// ---- Update ----
function openBox(b){
  const pool=level===0?[5]:(LEVELS[level].boss?[0,1,2,3,4,5]:[0,1,3,4,5]); // lvl1: bonus only; boss dmg only on boss level
  const r=pool[Math.floor(Math.random()*pool.length)];let msg;
  if(r===0){fx.armor=1800;msg='ARMOR 30s';}
  else if(r===1){fx.range=1800;msg='LONG DAGGERS 30s';}
  else if(r===2){fx.dmg=900;msg='BOSS DAMAGE x2 15s';}
  else if(r===3){fx.speed=900;msg='SPEED UP 15s';}
  else if(r===4){fx.star=480;msg='INVINCIBLE 8s';}
  else{pts+=500;msg='+500 BONUS';}
  floats.push({x:b.x-30,y:b.y-10,t:70,n:70,s:msg,c:'#ffeb3b'});
}
function coinTotal(){return coins.filter(c=>!c.h).length;}
function hurt(d,srcX){
  if(p.inv>0||state!=='play'||fx.star>0)return;
  if(fx.armor>0)d=Math.ceil(d/2);
  hp-=d;p.inv=75;p.vy=-6;p.kb=(p.x+p.w/2<srcX?-1:1)*4;p.kbT=10;
  floats.push({x:p.x,y:p.y,t:40,s:'-'+d,c:'#ff5252'});
  if(hp<=0){hp=0;state='dead';}
}
function onFloor(o){
  const r=Math.floor((o.y+o.h)/T);
  for(let c=Math.floor(o.x/T);c<=Math.floor((o.x+o.w-1)/T);c++)if(solid(c,r))return true;
  return false;
}
function canStand(){
  for(let r=Math.floor((p.y-12)/T);r<=Math.floor((p.y+p.h-1)/T);r++)
    for(let c=Math.floor(p.x/T);c<=Math.floor((p.x+p.w-1)/T);c++)
      if(solid(c,r))return false;
  return true;
}
function hurtBoss(d){
  const b=boss;if(b.inv>0)return;
  const dg=d<1;if(fx.dmg>0)d*=2;
  b.hp-=d;b.inv=dg?20:60;
  const gain=dg?50:250;pts+=gain;floats.push({x:b.x+10,y:b.y,t:40,s:'+'+gain});
  if(b.hp<=0){pts+=1000;fireballs=[];floats.push({x:b.x-40,y:b.y-20,t:70,s:'BOSS DEFEATED +1000'});}
}
function update(){
  if(state!=='play')return;
  if(p.inv>0)p.inv--;
  for(const key in fx)if(fx[key]>0)fx[key]--;
  const wantC=k.c&&p.onGround;
  if(wantC&&p.h===30){p.y+=12;p.h=18;}
  else if(!wantC&&p.h===18&&canStand()){p.y-=12;p.h=30;}
  p.vx=(k.r-k.l)*(p.h<30?1.2:3.2)*(fx.speed>0?1.5:1);
  if(p.vx)p.face=p.vx>0?1:-1;
  if(p.kbT>0){p.vx=p.kb;p.kbT--;}
  if(k.j&&p.onGround&&p.h===30){p.vy=-11.5;p.onGround=false;}
  if(!k.j&&p.vy<-4)p.vy=-4;
  p.vy+=0.6;
  p.x+=p.vx;hit(p,'x');
  p.onGround=false;p.y+=p.vy;hit(p,'y');
  if(p.vy>=0&&!p.onGround&&onFloor(p)){p.y=Math.floor((p.y+p.h)/T)*T-p.h;p.vy=0;p.onGround=true;}
  if(p.onGround&&p.h===30){const fy=Math.floor((p.y+p.h)/T);if(solid(Math.floor((p.x-16)/T),fy)&&solid(Math.floor((p.x+p.w+16)/T),fy)){safeX=p.x;safeY=p.y;}}
  if(p.y>H*T+60){
    const pd=fx.armor>0?20:40;hp-=pd;floats.push({x:safeX,y:safeY,t:40,s:'-'+pd,c:'#ff5252'});
    if(hp<=0){hp=0;state='dead';}
    else{p.x=safeX;p.y=safeY;p.vx=0;p.vy=0;p.inv=90;p.kbT=0;}
  }
  for(const bx of boxes)if(!bx.open&&overlap(p,bx)&&p.vy>0&&p.y+p.h-bx.y<16){bx.open=true;p.vy=-7;openBox(bx);}
  for(const c of coins)if(!c.got&&overlap(p,{x:c.x,y:c.y,w:16,h:16})){c.got=true;if(c.h){hp=Math.min(MAXHP,hp+40);floats.push({x:p.x,y:p.y,t:40,s:'+40 HP',c:'#69f0ae'});}else{score++;pts+=10;}}
  for(const e of enemies){
    if(!e.alive)continue;
    if(e.onGround){const fx=e.vx>0?e.x+e.w+1:e.x-1;if(!solid(Math.floor(fx/T),Math.floor((e.y+e.h+1)/T)))e.vx=-e.vx;}
    const d=e.vx;e.x+=d;if(hit(e,'x'))e.vx=-d;
    e.vy+=0.6;e.onGround=false;e.y+=e.vy;hit(e,'y');
    if(overlap(p,e)){
      if(p.vy>0&&p.y+p.h-e.y<18){e.alive=false;p.vy=-8;pts+=100;floats.push({x:e.x,y:e.y,t:40});}
      else hurt(20,e.x+e.w/2);
    }
  }
  for(const f of flyers){
    if(!f.alive)continue;
    f.a+=0.03;f.x=f.cx+Math.sin(f.a)*f.rx;f.y=f.cy+Math.sin(f.a*2)*20;
    if(overlap(p,f)){
      if(p.vy>0&&p.y+p.h-f.y<18){f.alive=false;p.vy=-8;pts+=200;floats.push({x:f.x,y:f.y,t:40,s:'+200'});}
      else hurt(15,f.x+f.w/2);
    }
  }
  if(boss&&boss.hp>0){
    const b=boss,sp=1.2+(b.maxhp-b.hp)*0.3;
    b.inv=Math.max(0,b.inv-1);
    b.vx=(b.vx>0?1:-1)*sp;b.x+=b.vx;
    if(b.x<44*T){b.x=44*T;b.vx=sp;}
    if(b.x+b.w>65*T){b.x=65*T-b.w;b.vx=-sp;}
    if(--b.jumpT<=0&&b.y+b.h>=9*T){b.vy=-11;b.jumpT=90+Math.floor(Math.random()*80);}
    b.vy+=0.6;b.y+=b.vy;
    if(b.y+b.h>=9*T){b.y=9*T-b.h;b.vy=0;}
    if(--b.fireT<=0&&Math.abs(p.x-b.x)<360){
      const dir=p.x<b.x?-1:1;
      fireballs.push({x0:b.x,x:dir<0?b.x-16:b.x+b.w,y:9*T-34,w:16,h:12,vx:dir*3.5});
      b.fireT=Math.max(70,160-(b.maxhp-b.hp)*20);
    }
    if(overlap(p,b)){
      if(p.vy>0&&p.y+p.h-b.y<26){
        hurtBoss(1);
        p.vy=-10;
      }else if(b.inv===0)hurt(40,b.x+b.w/2);
    }
  }
  if(cool>0)cool--;
  if(k.f&&cool===0&&shots.length<3){shots.push({x0:p.x,x:(p.face||1)>0?p.x+p.w:p.x-14,y:p.y+(p.h===30?12:5),w:14,h:6,vx:(p.face||1)*7});cool=22;}
  for(const sh of shots){
    sh.x+=sh.vx;
    if(Math.abs(sh.x-sh.x0)>(fx.range>0?400:200))sh.dead=true;
    if(sh.x<0||sh.x>W*T||solid(Math.floor((sh.vx>0?sh.x+sh.w:sh.x)/T),Math.floor((sh.y+3)/T)))sh.dead=true;
    for(const e of enemies)if(e.alive&&!sh.dead&&overlap(sh,e)){e.alive=false;sh.dead=true;pts+=50;floats.push({x:e.x,y:e.y,t:40,s:'+50'});}
    for(const f of flyers)if(f.alive&&!sh.dead&&overlap(sh,f)){f.alive=false;sh.dead=true;pts+=50;floats.push({x:f.x,y:f.y,t:40,s:'+50'});}
    for(const fb of fireballs)if(!sh.dead&&overlap(sh,fb)){fb.dead=true;sh.dead=true;pts+=25;}
    if(boss&&boss.hp>0&&!sh.dead&&overlap(sh,boss)){sh.dead=true;hurtBoss(0.5);}
  }
  shots=shots.filter(sh=>!sh.dead);
  for(const fb of fireballs){fb.x+=fb.vx;if(Math.abs(fb.x-fb.x0)>280)fb.dead=true;if(!fb.dead&&overlap(p,fb)){fb.dead=true;hurt(25,fb.x);}}
  fireballs=fireballs.filter(fb=>!fb.dead&&fb.x>0&&fb.x<W*T);
  if(p.x+p.w>67*T&&state==='play'&&!(boss&&boss.hp>0)){const last=level>=LEVELS.length-1;state=last?'win':'modal';lastTime=clock-attemptStart;lastBonus=Math.max(200,1000-200*deaths);timeBonus=Math.max(0,Math.round(500*(1-lastTime/(LEVELS[level].par*1000))));pts+=lastBonus+timeBonus;bank+=pts;pts=0;showModal(last);}
  floats.forEach(f=>f.t--);floats=floats.filter(f=>f.t>0);
  camX=Math.max(0,Math.min(p.x-220,W*T-VW));
}
// ---- Weather / backdrop ----
function initWeather(){
  const W2={meadow:{n:18,clouds:7},desert:{n:45,clouds:3},ice:{n:100,clouds:5},crystal:{n:45,clouds:0},castle:{n:70,clouds:7}};
  const w=W2[LEVELS[level].theme]||W2.meadow;
  wparts=[];wclouds=[];flash=0;
  for(let i=0;i<w.n;i++)wparts.push({x:Math.random()*VW,y:Math.random()*VH,s:Math.random(),p:Math.random()*6.28});
  for(let i=0;i<w.clouds;i++)wclouds.push({x:Math.random()*(VW+300),y:16+Math.random()*90,w:34+Math.random()*34,s:0.1+Math.random()*0.25});
}
function ridge(col,base,amp,freq,par,jag){
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,VH);
  for(let x=0;x<=VW+8;x+=8){
    const wx=x+camX*par;
    const y=jag?base-Math.abs(Math.sin(wx*freq))*amp-Math.abs(Math.sin(wx*freq*2.7))*amp*0.3
              :base+Math.sin(wx*freq)*amp+Math.sin(wx*freq*2.3)*amp*0.4;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(VW+8,VH);ctx.fill();
}
function glow(x,y,r,col){
  const gr=ctx.createRadialGradient(x,y,2,x,y,r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
}
function horizon(col){
  const gr=ctx.createLinearGradient(0,VH*0.35,0,9*T);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,col);
  ctx.fillStyle=gr;ctx.fillRect(0,0,VW,9*T);
}
function drawBackdrop(){
  const th=LEVELS[level].theme||'meadow';wt++;
  // sky bodies
  if(th==='meadow'){glow(540,62,60,'rgba(255,240,150,.8)');ctx.fillStyle='#fff3a0';ctx.beginPath();ctx.arc(540,62,24,0,7);ctx.fill();}
  else if(th==='desert'){horizon('rgba(255,225,150,.55)');glow(470,74,110,'rgba(255,240,170,.9)');ctx.fillStyle='#fff1b8';ctx.beginPath();ctx.arc(470,74,36,0,7);ctx.fill();}
  else if(th==='ice'){
    ctx.lineWidth=14;
    for(let i=0;i<3;i++){
      ctx.strokeStyle=i===1?'rgba(190,120,255,.16)':'rgba(100,255,180,.16)';ctx.beginPath();
      for(let x=0;x<=VW;x+=16){const y=50+i*24+Math.sin((x+wt*0.8)*0.012+i*1.7)*16;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
      ctx.stroke();
    }
    ctx.lineWidth=1;glow(110,62,50,'rgba(220,235,255,.7)');ctx.fillStyle='#e8f0ff';ctx.beginPath();ctx.arc(110,62,18,0,7);ctx.fill();
    horizon('rgba(120,200,255,.25)');
  }
  else if(th==='crystal'){horizon('rgba(180,120,255,.3)');glow(320,110,170,'rgba(190,140,255,.25)');}
  else{horizon('rgba(255,80,20,.3)');glow(520,70,90,'rgba(255,60,40,.35)');ctx.fillStyle='rgba(183,28,28,.85)';ctx.beginPath();ctx.arc(520,70,28,0,7);ctx.fill();}
  // clouds
  const cc={meadow:'rgba(255,255,255,.85)',desert:'rgba(255,235,200,.3)',ice:'rgba(190,205,255,.22)',castle:'rgba(55,18,18,.85)'}[th];
  if(cc){ctx.fillStyle=cc;for(const c of wclouds){
    const L=VW+300,x=(((c.x+wt*c.s-camX*0.1)%L)+L)%L-150;
    ctx.beginPath();ctx.arc(x,c.y,c.w*0.35,0,7);ctx.arc(x+c.w*0.35,c.y-6,c.w*0.42,0,7);ctx.arc(x+c.w*0.75,c.y,c.w*0.33,0,7);ctx.fill();
  }}
  // distant scenery
  if(th==='meadow'){ridge('#8fd08f',250,14,0.006,0.15);ridge('#62b062',270,10,0.01,0.3);}
  else if(th==='desert'){
    ridge('#e0b370',250,16,0.005,0.15);ridge('#c99a55',270,12,0.009,0.3);
    ctx.fillStyle='#4f8a4f';
    for(let i=0;i<4;i++){const x=(((i*230+90-camX*0.45)%(VW+120))+VW+120)%(VW+120)-60;ctx.fillRect(x,246,7,34);ctx.fillRect(x-9,256,9,5);ctx.fillRect(x-9,248,5,13);ctx.fillRect(x+7,262,9,5);ctx.fillRect(x+12,254,5,13);}
  }
  else if(th==='ice'){ridge('#40508f',262,70,0.006,0.12,true);ridge('#2e3b78',278,46,0.011,0.28,true);}
  else if(th==='crystal'){
    ridge('#2a1550',270,60,0.007,0.15,true);ridge('#1d0e3d',282,40,0.012,0.3,true);
    ctx.fillStyle='rgba(120,70,190,.55)';
    for(let i=0;i<7;i++){const x=(((i*110+30-camX*0.4)%(VW+120))+VW+120)%(VW+120)-60,h=40+(i*37)%50;ctx.beginPath();ctx.moveTo(x-12,0);ctx.lineTo(x+12,0);ctx.lineTo(x,h);ctx.fill();}
  }
  else{ridge('#1a0a0a',262,64,0.006,0.12,true);ridge('#0f0505',280,42,0.011,0.28,true);}
  // weather particles
  for(const q of wparts){
    if(th==='ice'){q.y+=0.7+q.s*1.3;q.x+=Math.sin(wt/40+q.p)*0.4-0.25;ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(q.x,q.y,2+q.s*1.5,2+q.s*1.5);}
    else if(th==='desert'){q.x-=1.6+q.s*2.2;q.y+=Math.sin(wt/30+q.p)*0.3;ctx.fillStyle='rgba(240,205,140,.5)';ctx.fillRect(q.x,q.y,2+q.s*2,1.5);}
    else if(th==='crystal'){q.y-=0.25+q.s*0.5;q.x+=Math.sin(wt/50+q.p)*0.3;ctx.globalAlpha=0.35+0.65*Math.abs(Math.sin(wt/25+q.p));ctx.fillStyle=q.s>0.5?'#b388ff':'#80deea';ctx.beginPath();ctx.arc(q.x,q.y,1+q.s*2,0,7);ctx.fill();ctx.globalAlpha=1;}
    else if(th==='castle'){q.y-=0.8+q.s*1.2;q.x+=Math.sin(wt/30+q.p)*0.5+0.3;ctx.fillStyle=q.s>0.5?'#ff9800':'#ff5722';ctx.fillRect(q.x,q.y,2,2);}
    else{q.x+=0.3+q.s*0.4;q.y+=Math.sin(wt/45+q.p)*0.35;ctx.fillStyle='rgba(255,245,170,.8)';ctx.fillRect(q.x,q.y,2,2);}
    if(q.x<-4)q.x=VW+4;if(q.x>VW+4)q.x=-4;if(q.y>VH+4)q.y=-4;if(q.y<-4)q.y=VH+4;
  }
  // lightning
  if(th==='castle'){
    if(flash<=0&&Math.random()<0.004)flash=10;
    if(flash>0){ctx.fillStyle='rgba(255,255,255,'+(flash/18)+')';ctx.fillRect(0,0,VW,VH);flash--;}
  }
}
// ---- Draw ----
function drawAuras(){
  if(fx.star>0){ctx.strokeStyle='hsl('+((clock/4)%360)+',100%,60%)';ctx.lineWidth=3;ctx.strokeRect(p.x-4,p.y-4,p.w+8,p.h+8);ctx.lineWidth=1;}
  else if(fx.armor>0){ctx.strokeStyle='#64b5f6';ctx.lineWidth=2;ctx.strokeRect(p.x-3,p.y-3,p.w+6,p.h+6);ctx.lineWidth=1;}
}
function drawDiamond(cx,cy,seed){
  ctx.fillStyle='#7dd3fc';ctx.beginPath();ctx.moveTo(cx-8,cy-2);ctx.lineTo(cx-4,cy-7);ctx.lineTo(cx+4,cy-7);ctx.lineTo(cx+8,cy-2);ctx.lineTo(cx,cy+8);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e0fbff';ctx.beginPath();ctx.moveTo(cx-4,cy-7);ctx.lineTo(cx-2,cy-2);ctx.lineTo(cx-8,cy-2);ctx.closePath();ctx.fill();
  ctx.fillStyle='#38bdf8';ctx.beginPath();ctx.moveTo(cx+4,cy-7);ctx.lineTo(cx+2,cy-2);ctx.lineTo(cx+8,cy-2);ctx.closePath();ctx.fill();
  ctx.fillStyle='#0ea5e9';ctx.beginPath();ctx.moveTo(cx-2,cy-2);ctx.lineTo(cx+2,cy-2);ctx.lineTo(cx,cy+8);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#0b5f8f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-8,cy-2);ctx.lineTo(cx-4,cy-7);ctx.lineTo(cx+4,cy-7);ctx.lineTo(cx+8,cy-2);ctx.lineTo(cx,cy+8);ctx.closePath();ctx.stroke();
  if(Math.sin(clock/260+seed)>0.92){ctx.fillStyle='#fff';ctx.fillRect(cx-1,cy-10,2,6);ctx.fillRect(cx-4,cy-8,8,2);}
}
function drawHeart(cx,cy){
  ctx.fillStyle='#ff1744';
  ctx.beginPath();ctx.arc(cx-4,cy-2,5,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(cx+4,cy-2,5,0,7);ctx.fill();
  ctx.beginPath();ctx.moveTo(cx-9,cy);ctx.lineTo(cx+9,cy);ctx.lineTo(cx,cy+10);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.75)';ctx.fillRect(cx-7,cy-5,3,3);
}
const THEMES={
 meadow:{g:'#8b5a2b',gt:'#3cb043',gh:6,gs:'#6e4520',gl:'rgba(0,0,0,.2)',kind:'wood'},
 desert:{g:'#c9a15b',gt:'#ecd08e',gh:6,gs:'#b0864a',gl:'rgba(0,0,0,.15)',kind:'sand'},
 ice:{g:'#5c6b8a',gt:'#ffffff',gh:8,gs:'#46557a',gl:'rgba(0,0,0,.2)',kind:'ice'},
 crystal:{g:'#2b1b3f',gt:'#7e57c2',gh:5,gs:'#4a2f6b',gl:'rgba(0,0,0,.3)',kind:'crystal'},
 castle:{g:'#2a1414',gt:'#ff5722',gh:4,gs:'#ff9800',gl:'rgba(0,0,0,.4)',kind:'castle'}
};
function drawTile(c,r){
  const th=THEMES[LEVELS[level].theme]||THEMES.meadow,x=c*T,y=r*T;
  if(r>=9){ // ground
    ctx.fillStyle=th.g;ctx.fillRect(x,y,T,T);
    ctx.fillStyle=th.gs;ctx.fillRect(x+3+(c*7+r*3)%20,y+8+(c*5+r*11)%18,3,3);ctx.fillRect(x+6+(c*11+r*5)%18,y+14+(c*3+r*7)%12,2,2);
    ctx.strokeStyle=th.gl;ctx.strokeRect(x+.5,y+.5,T-1,T-1);
    if(r===9){ctx.fillStyle=th.gt;ctx.fillRect(x,y,T,th.gh);}
    return;
  }
  const top=!(g[r-1]&&g[r-1][c]); // platforms, blocks and stairs
  if(th.kind==='wood'){
    ctx.fillStyle='#b5793a';ctx.fillRect(x,y,T,T);
    ctx.fillStyle='#8a5a28';ctx.fillRect(x,y+10,T,2);ctx.fillRect(x,y+21,T,2);
    ctx.fillStyle='#4e3216';[4,15,26].forEach(o=>{ctx.fillRect(x+3,y+o,2,2);ctx.fillRect(x+T-5,y+o,2,2);});
    if(top){ctx.fillStyle='#d9a05b';ctx.fillRect(x,y,T,3);}
  }else if(th.kind==='sand'){
    ctx.fillStyle='#d8b172';ctx.fillRect(x,y,T,T);
    ctx.fillStyle='#b88f4f';ctx.fillRect(x,y+15,T,2);ctx.fillRect(x+15,y,2,15);ctx.fillRect(x+7,y+17,2,15);ctx.fillRect(x+23,y+17,2,15);
    if(top){ctx.fillStyle='#f0d9a0';ctx.fillRect(x,y,T,4);}
  }else if(th.kind==='ice'){
    ctx.fillStyle='#9fd8f5';ctx.fillRect(x,y,T,T);
    ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillRect(x+5,y+5,3,14);ctx.fillRect(x+10,y+5,2,6);
    ctx.fillStyle='#6bb7e0';ctx.fillRect(x,y+T-3,T,3);
    if(top){ctx.fillStyle='#e8f8ff';ctx.fillRect(x,y,T,5);}
    ctx.strokeStyle='#6bb7e0';ctx.strokeRect(x+.5,y+.5,T-1,T-1);
  }else if(th.kind==='crystal'){
    ctx.fillStyle='#4a2a78';ctx.fillRect(x,y,T,T);
    ctx.fillStyle='#8e5bd6';ctx.beginPath();ctx.moveTo(x+4,y+T-4);ctx.lineTo(x+12,y+6);ctx.lineTo(x+20,y+T-4);ctx.fill();
    ctx.fillStyle='#b388ff';ctx.beginPath();ctx.moveTo(x+16,y+T-4);ctx.lineTo(x+23,y+12);ctx.lineTo(x+29,y+T-4);ctx.fill();
    if(top){ctx.fillStyle='#b388ff';ctx.fillRect(x,y,T,3);}
    ctx.strokeStyle='#2a1550';ctx.strokeRect(x+.5,y+.5,T-1,T-1);
  }else{ // castle
    ctx.fillStyle='#38343f';ctx.fillRect(x,y,T,T);
    ctx.fillStyle='#17141b';ctx.fillRect(x,y+15,T,2);ctx.fillRect(x+15,y,2,15);ctx.fillRect(x+7,y+17,2,15);ctx.fillRect(x+23,y+17,2,15);
    ctx.fillStyle='#ff6d00';ctx.fillRect(x+5,y+9,4,2);ctx.fillRect(x+20,y+24,5,2);
    if(top){ctx.fillStyle='#5b5560';ctx.fillRect(x,y,T,4);}
  }
}
function drawPlayer(){
  if(p.inv>0&&Math.floor(p.inv/4)%2)return;
  const x=p.x,y=p.y+p.h-30,f=p.face||1,girl=character==='girl';
  if(p.h<30){ctx.save();ctx.translate(0,p.y+p.h);ctx.scale(1,p.h/30);ctx.translate(0,-(p.y+p.h));}
  const skin='#f1c27d',hair=girl?'#b5651d':'#4a2c0a';
  if(girl){
    ctx.fillStyle=skin;ctx.fillRect(x+7,y+24,4,5);ctx.fillRect(x+13,y+24,4,5);              // legs
    ctx.fillStyle='#212121';ctx.fillRect(x+6,y+28,5,2);ctx.fillRect(x+13,y+28,5,2);          // shoes
    ctx.fillStyle=skin;ctx.fillRect(x+2,y+12,4,8);ctx.fillRect(x+18,y+12,4,8);               // arms
    ctx.fillStyle='#ec407a';ctx.fillRect(x+5,y+11,14,9);ctx.fillRect(x+3,y+19,18,6);         // dress
    ctx.fillStyle=hair;ctx.fillRect(f>0?x+3:x+17,y+3,4,15);                                  // long hair (back)
    ctx.fillStyle=skin;ctx.fillRect(x+6,y,12,11);                                            // head
    ctx.fillStyle=hair;ctx.fillRect(x+5,y-1,14,4);ctx.fillRect(f>0?x+5:x+16,y,3,8);          // hair top
    ctx.fillStyle='#ffd54f';ctx.fillRect(f>0?x+4:x+17,y+1,3,3);                              // bow
  }else{
    ctx.fillStyle='#37474f';ctx.fillRect(x+6,y+21,5,8);ctx.fillRect(x+13,y+21,5,8);          // legs
    ctx.fillStyle='#212121';ctx.fillRect(x+6,y+28,5,2);ctx.fillRect(x+13,y+28,5,2);          // shoes
    ctx.fillStyle=skin;ctx.fillRect(x+2,y+12,4,8);ctx.fillRect(x+18,y+12,4,8);               // arms
    ctx.fillStyle='#2979ff';ctx.fillRect(x+5,y+11,14,11);                                    // shirt
    ctx.fillStyle=skin;ctx.fillRect(x+6,y,12,11);                                            // head
    ctx.fillStyle=hair;ctx.fillRect(x+5,y-1,14,4);ctx.fillRect(f>0?x+5:x+16,y,3,8);          // hair
  }
  ctx.fillStyle='#212121';ctx.fillRect(x+(f>0?13:9),y+5,2,2);
  if(p.h<30)ctx.restore();                                // eye
}
function draw(){
  ctx.clearRect(0,0,VW,VH);
  drawBackdrop();
  ctx.save();ctx.translate(-Math.floor(camX),0);
  for(let r=0;r<H;r++)for(let c=Math.floor(camX/T);c<=Math.floor((camX+VW)/T);c++){
    if(!g[r]||!g[r][c])continue;
    drawTile(c,r);
  }
  ctx.fillStyle='#fff';ctx.fillRect(67*T+14,3*T,4,6*T);
  ctx.fillStyle=(boss&&boss.hp>0)?'#777':'#2ecc71';ctx.fillRect(67*T+18,3*T,22,16);
  ctx.fillStyle='#ffd700';
  for(const bx of boxes){
    ctx.fillStyle=bx.open?'#8d6e63':'#ffb300';ctx.fillRect(bx.x,bx.y,bx.w,bx.h);
    ctx.strokeStyle=bx.open?'#5d4037':'#b26a00';ctx.lineWidth=2;ctx.strokeRect(bx.x+1,bx.y+1,bx.w-2,bx.h-2);ctx.lineWidth=1;
    if(!bx.open){ctx.fillStyle='#fff';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText('?',bx.x+bx.w/2,bx.y+18);ctx.textAlign='left';}
  }
  for(const c of coins)if(!c.got){
    if(c.h)drawHeart(c.x+8,c.y+8+Math.sin(clock/300+c.x)*2);
    else drawDiamond(c.x+8,c.y+8+Math.sin(clock/400+c.x)*1.5,c.x);
  }
  for(const e of enemies)if(e.alive){
    ctx.fillStyle='#8b4513';ctx.fillRect(e.x,e.y,e.w,e.h);
    ctx.fillStyle='#fff';ctx.fillRect(e.x+5,e.y+7,6,6);ctx.fillRect(e.x+17,e.y+7,6,6);
  }
  if(boss&&boss.hp>0){
    const b=boss;
    if(!(b.inv>0&&Math.floor(b.inv/4)%2)){
      ctx.fillStyle='#4e342e';ctx.fillRect(b.x,b.y+12,b.w,b.h-12);
      ctx.fillStyle='#3e2723';ctx.fillRect(b.x+6,b.y,12,18);ctx.fillRect(b.x+b.w-18,b.y,12,18);
      ctx.fillStyle='#ffca28';ctx.fillRect(b.x+6,b.y+30,b.w-12,8);ctx.fillRect(b.x+6,b.y+48,b.w-12,5);
      ctx.fillStyle='#ff1744';ctx.fillRect(b.x+14,b.y+18,10,8);ctx.fillRect(b.x+b.w-24,b.y+18,10,8);
      ctx.fillStyle='#fff';ctx.fillRect(b.x+16,b.y+40-4,b.w-32,4);
    }
    ctx.fillStyle='#000';ctx.fillRect(b.x,b.y-14,b.w,8);
    ctx.fillStyle='#e53935';ctx.fillRect(b.x+1,b.y-13,(b.w-2)*b.hp/b.maxhp,6);
  }
  for(const fb of fireballs){ctx.fillStyle='#ff6d00';ctx.beginPath();ctx.arc(fb.x+8,fb.y+6,8,0,7);ctx.fill();ctx.fillStyle='#ffd54f';ctx.beginPath();ctx.arc(fb.x+8,fb.y+6,4,0,7);ctx.fill();}
  for(const sh of shots){ctx.fillStyle='#ffd54f';ctx.fillRect(sh.x,sh.y+1,sh.w,4);ctx.fillStyle='#fff8e1';ctx.fillRect(sh.vx>0?sh.x+sh.w-4:sh.x,sh.y,4,6);}
  for(const f of flyers)if(f.alive){
    const fl=Math.sin(f.a*8)*6;
    ctx.fillStyle='#ce93d8';ctx.fillRect(f.x-6,f.y+2-fl,10,6);ctx.fillRect(f.x+24,f.y+2-fl,10,6);
    ctx.fillStyle='#6a1b9a';ctx.fillRect(f.x+2,f.y+4,24,14);
    ctx.fillStyle='#fff';ctx.fillRect(f.x+8,f.y+8,4,4);ctx.fillRect(f.x+16,f.y+8,4,4);
  }
  drawPlayer();drawAuras();
  ctx.font='bold 16px system-ui';floats.forEach(f=>{ctx.fillStyle=f.c||'#fff';ctx.fillText(f.s||'+100',f.x,f.y-((f.n||40)-f.t));});
  ctx.restore();
  ctx.fillStyle='#fff';ctx.font='bold 18px system-ui';ctx.fillText('Level '+(level+1)+'/'+LEVELS.length+'  Diamonds: '+score+'/'+coinTotal(),12,26);
  ctx.textAlign='right';ctx.fillText('Score: '+(bank+pts)+'  Time: '+fmt(clock),VW-12,26);ctx.textAlign='left';
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(12,34,150,12);
  ctx.fillStyle=hp>50?'#4caf50':(hp>25?'#ffb300':'#e53935');ctx.fillRect(12,34,150*hp/MAXHP,12);
  ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(12.5,34.5,149,11);
  ctx.fillStyle='#fff';ctx.font='bold 11px system-ui';ctx.fillText('HP '+Math.ceil(hp)+'/'+MAXHP,18,44);
  ctx.font='14px system-ui';ctx.fillText('Retries left: '+(MAXR-deaths),12,64);
  let ey=82;ctx.font='bold 12px system-ui';
  [['armor','ARMOR','#64b5f6'],['range','LONG DAGGERS','#ffd54f'],['dmg','BOSS DMG x2','#ff8a65'],['speed','SPEED UP','#81c784'],['star','INVINCIBLE','#ce93d8']].forEach(([k2,l,col])=>{
    if(fx[k2]>0){ctx.fillStyle=col;ctx.fillText(l+' '+Math.ceil(fx[k2]/60)+'s',12,ey);ey+=15;}
  });
  if(boss){
    const bw=220,bx=VW-12-bw;
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(bx,34,bw,14);
    ctx.fillStyle='#e53935';ctx.fillRect(bx,34,bw*Math.max(0,boss.hp)/boss.maxhp,14);
    ctx.strokeStyle='#fff';ctx.strokeRect(bx+.5,34.5,bw-1,13);
    ctx.fillStyle='#fff';ctx.font='bold 11px system-ui';ctx.textAlign='center';
    ctx.fillText(boss.hp>0?'GOLD GOLEM  '+Math.max(0,Math.round(boss.hp/boss.maxhp*100))+'/100':'GOLD GOLEM DEFEATED',bx+bw/2,45);
    ctx.textAlign='left';
  }
  if(state==='dead'){
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 36px system-ui';
    ctx.fillText(state==='win'?'You win!':'Game over',VW/2,VH/2-4);
    ctx.font='18px system-ui';ctx.fillText('Tap or press Space to retry ('+(MAXR-deaths)+' left)',VW/2,VH/2+30);
    ctx.textAlign='left';
  }
}
const PK='legends_players',LK='legends_last';
function loadPlayers(){try{return JSON.parse(localStorage.getItem(PK))||[];}catch(e){return [];}}
function storePlayers(l){try{localStorage.setItem(PK,JSON.stringify(l));}catch(e){}}
let player=null,selPrev=null;
function hideAll(){['nm','hs','cs','pl','pb','pc','mb'].forEach(i=>el(i).hidden=true);}
function showSelect(fromGame){
  if(fromGame)selPrev=state;
  state='select';k.l=k.r=k.j=k.c=k.f=0;
  renderSelect();
}
function renderSelect(){
  const l=loadPlayers();
  if(!l.length){showNew();return;}
  hideAll();
  el('mt').textContent="Who's playing?";el('mp').textContent='Pick your player';
  const box=el('pl');box.innerHTML='';
  l.forEach(pl=>{
    const row=document.createElement('div');row.className='row';
    const b=document.createElement('button');b.textContent=pl.n+' ('+(pl.c==='girl'?'Girl':'Boy')+')';b.addEventListener('click',()=>choose(pl));
    const d=document.createElement('button');d.className='del';d.textContent='\u2715';d.title='Delete player';
    d.addEventListener('click',()=>{
      if(d.dataset.arm){storePlayers(loadPlayers().filter(x=>x.n!==pl.n));renderSelect();}
      else{d.dataset.arm='1';d.textContent='Delete?';}
    });
    row.appendChild(b);row.appendChild(d);box.appendChild(row);
  });
  const nb=document.createElement('button');nb.textContent='+ New player';nb.addEventListener('click',showNew);box.appendChild(nb);
  box.hidden=false;el('pc').hidden=!selPrev;el('modal').hidden=false;
}
function showNew(){
  hideAll();
  el('mt').textContent='New player';el('mp').textContent='Type your name, then pick your character';
  el('nm').hidden=false;el('nm').value='';el('cs').hidden=false;
  el('pb').hidden=!loadPlayers().length;el('pc').hidden=!selPrev;
  el('modal').hidden=false;
}
function choose(pl){
  player=pl;character=pl.c;
  try{localStorage.setItem(LK,pl.n);}catch(e){}
  el('swb').textContent=pl.n;
  selPrev=null;hideAll();el('mb').hidden=false;el('modal').hidden=true;
  level=0;bank=0;clock=0;deaths=0;state='play';reset();
}
document.querySelectorAll('#cs button').forEach(b=>b.addEventListener('click',()=>{
  const name=(el('nm').value.trim()||'Player').slice(0,12);
  const l=loadPlayers();const i=l.findIndex(x=>x.n.toLowerCase()===name.toLowerCase());
  const pl={n:name,c:b.dataset.c};
  if(i>=0)l[i]=pl;else l.push(pl);
  storePlayers(l);choose(pl);
}));
el('pb').addEventListener('click',renderSelect);
el('pc').addEventListener('click',()=>{
  if(selPrev){state=selPrev;selPrev=null;k.l=k.r=k.j=k.c=k.f=0;hideAll();el('mb').hidden=false;el('modal').hidden=true;}
});
el('swb').addEventListener('click',e=>{e.target.blur();if(state!=='play'&&state!=='dead')return;showSelect(true);});
showSelect();
let lastT=performance.now();
(function loop(){const now=performance.now();if(state==='play')clock+=Math.min(now-lastT,100);lastT=now;update();if(state==='dead'&&deaths>=MAXR)gameOver();draw();requestAnimationFrame(loop);})();
