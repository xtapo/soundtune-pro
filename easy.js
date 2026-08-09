/* SoundTune Easy - easy.js */
var ISO=[20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
var ZI=[[0,5],[6,9],[10,13],[14,17],[18,21],[22,25],[26,28],[29,30]];
var ZC=['#8b5cf6','#3b82f6','#06b6d4','#22c55e','#eab308','#f97316','#ef4444','#ec4899'];
var ZN=['Tiếng trầm sâu (20–63 Hz)','Tiếng trầm (80–160 Hz)','Trung thấp (200–400 Hz)','Trung – thân giọng (500 Hz–1 kHz)','Trung cao – rõ chữ (1.25–2.5 kHz)','Tiếng cao (3–6.3 kHz)','Tiếng rất cao (8–12.5 kHz)','Siêu cao (16–20 kHz)'];
var KNOB=['núm SUB / SUBWOOFER (hoặc EQ 31–63 Hz)','núm LOW / BASS (hoặc EQ 80–160 Hz)','EQ 200–400 Hz (một số amply ghi là MID thấp)','núm MID (hoặc EQ 500 Hz–1 kHz)','EQ 1.25–2.5 kHz (vùng rõ chữ)','EQ 3–6.3 kHz (hoặc núm HI của amply karaoke)','núm HI / TREBLE (hoặc EQ 8–12.5 kHz)','EQ 16–20 kHz (vùng độ mở)'];
var MANY=['Tiếng trầm lùng bùng, rung ầm ầm, nghe lâu bị mệt','Tiếng bị ù, nặng đầu, lời hát bị lấp','Tiếng đục như bịt chăn, giọng bị nghẹt','Giọng nghe như nói trong thùng, bị dội','Giọng gắt và chóe, nghe lâu nhức tai','Tiếng xé rát tai, chữ S/CH bị rít, rất dễ hú','Tiếng leng keng, mỏng, dễ hú micro','Nhiều tiếng xì lao xao'];
var FEW=['Thiếu hơi trầm, nhạc không có lực','Tiếng mỏng, khô, thiếu ấm','Giọng bị hụt, thiếu dày','Giọng bị lõm, nghe xa, chìm dưới nhạc','Nghe không rõ chữ, lời hát bị mờ','Thiếu độ sáng, tiếng bị tối','Thiếu chi tiết, tiếng bí','Thiếu độ thoáng, không gian hẹp'];
var SHORT=['trầm sâu','tiếng trầm','trung thấp','trung','trung cao','tiếng cao','tiếng rất cao','siêu cao'];
var PRE=[{n:'Karaoke gia đình',d:'Phòng nhỏ, hát nhạc trẻ và bolero',t:[-3,2,-2,0,1,0,1,-1]},{n:'Loa kéo / di động',d:'Loa kéo, loa bluetooth, sân nhỏ ngoài trời',t:[-6,3,-3,1,2,1,0,-2]},{n:'Hội trường / Sân khấu',d:'Đám cưới, sự kiện, ban nhạc',t:[1,2,-2,0,1,1,1,0]},{n:'Họp / Nhà thờ (giọng nói)',d:'Chủ yếu là nói, cần rõ chữ',t:[-12,-5,-3,2,3,1,0,-3]},{n:'Cafe / Nhạc nền',d:'Nghe nhẹ, mở lâu không mệt',t:[-2,1,-1,0,0,0,1,1]}];
var SENS={off:null,lo:{th:21,hold:1500,hits:40},md:{th:17,hold:1000,hits:26},hi:{th:14,hold:600,hits:16}};
var pk=0,mode='pink',sens='md';
var ctx=null,an=null,freq=null,bins=null,micOn=false;
var measuring=false,acc=null,accN=0,tEnd=0;
var noiseNode=null,noiseGain=null,noiseOn=false;
var prevScore=null,speakText='',lastFb=0;
var fbBand=-1,fbSince=0,fbHits=0,fbShown=false;
function el(i){return document.getElementById(i)}
function fmtF(f){return f>=1000?(f/1000).toFixed(f>=10000?1:2)+' kHz':(f>=100?Math.round(f):Math.round(f*10)/10)+' Hz'}

var ph='';
for(var i=0;i<PRE.length;i++)ph+='<button class="pz'+(i===0?' on':'')+'" data-i="'+i+'"><b>'+PRE[i].n+'</b><span>'+PRE[i].d+'</span></button>';
el('presets').innerHTML=ph;
function pick(box,attr,cb){
 el(box).onclick=function(e){
  var b=e.target.closest('.pz');if(!b)return;
  var a=el(box).querySelectorAll('.pz');
  for(var j=0;j<a.length;j++)a[j].classList.toggle('on',a[j]===b);
  cb(b.getAttribute(attr));
 };
}
pick('presets','data-i',function(v){pk=+v});
pick('modes','data-m',function(v){
 mode=v;
 el('pinkBox').style.display=(v==='pink')?'block':'none';
 el('btnMeasure').textContent=(v==='pink')?'⏺ ĐO (10 giây)':'⏺ ĐO (25 giây)';
});
pick('sens','data-s',function(v){sens=v;clearFb()});

function ensureCtx(){if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();return ctx}
function startMic(){
 if(micOn)return;
 ensureCtx();
 ctx.resume().then(function(){
  return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});
 }).then(function(st){
  var s=ctx.createMediaStreamSource(st);
  an=ctx.createAnalyser();an.fftSize=16384;an.smoothingTimeConstant=0;an.minDecibels=-110;an.maxDecibels=0;
  s.connect(an);freq=new Float32Array(an.frequencyBinCount);buildBins();micOn=true;
  el('btnMic').textContent='✅ MICRO ĐANG BẬT';el('btnMic').className='big go';
  el('btnMeasure').disabled=false;loop();
 }).catch(function(e){
  el('lvlT').textContent='Không bật được micro: '+e.message+'. Hãy cho phép quyền micro và mở trang bằng https.';
 });
}
function buildBins(){var df=ctx.sampleRate/an.fftSize,R=Math.pow(2,1/6),nb=an.frequencyBinCount;bins=[];for(var i=0;i<31;i++){var lo=Math.floor(ISO[i]/R/df),hi=Math.ceil(ISO[i]*R/df);if(lo<1)lo=1;if(hi>nb-1)hi=nb-1;if(hi<lo)hi=lo;bins.push([lo,hi])}}
function bandPow(){var o=[];for(var i=0;i<31;i++){var a=bins[i][0],b=bins[i][1],s=0,n=0;for(var k=a;k<=b;k++){s+=Math.pow(10,freq[k]/10);n++}o.push(n?s/n:1e-20)}return o}

function loop(){
 requestAnimationFrame(loop);
 if(!an)return;
 an.getFloatFrequencyData(freq);
 var p=bandPow(),db=[],tot=0,i;
 for(i=0;i<31;i++){db.push(10*Math.log10(p[i]+1e-20));tot+=p[i]}
 var bb=10*Math.log10(tot+1e-20);
 drawLive(db);
 el('lvl').style.width=Math.max(0,Math.min(100,(bb+85)/75*100))+'%';
 guard(db,bb);
 if(measuring){
  for(i=0;i<31;i++)acc[i]+=p[i];
  accN++;
  var left=Math.ceil((tEnd-performance.now())/1000);
  el('btnMeasure').textContent='⏺ ĐANG ĐO… '+Math.max(0,left)+'s';
  el('lvlT').textContent='Đang đo — giữ nguyên âm lượng và để yên máy.';
  if(performance.now()>=tEnd)finish();
 }else{
  el('lvlT').textContent=lvlText(bb);
 }
}
function lvlText(bb){
 var v=bb.toFixed(0);
 if(bb<-72)return 'Rất yên tĩnh ('+v+' dB). Hãy phát tiếng qua dàn trước khi đo.';
 if(bb<-58)return 'Còn nhỏ ('+v+' dB). Mở to như lúc dùng thật rồi hãy đo.';
 if(bb<-24)return 'Mức đang tốt ('+v+' dB) — đo được.';
 return 'To quá ('+v+' dB), dễ bị rè. Hãy giảm một chút.';
}
function prom(db,i){
 if(i<0||i>30)return 0;
 var arr=[],k;
 for(k=Math.max(0,i-4);k<=Math.min(30,i+4);k++)if(Math.abs(k-i)>1)arr.push(db[k]);
 if(!arr.length)return 0;
 arr.sort(function(a,b){return a-b});
 return db[i]-arr[Math.floor(arr.length/2)];
}

/* Tan so THUC trong mot bang 1/3 octave.
   Truoc day bao ra ISO[band] tuc tam bang, lech toi 12 % (vi du hu 1730 Hz bi bao
   la 1600 Hz) nen cat notch theo so do la cat lech. Ham nay tim dinh nhon nhat
   bang bin FFT trong bang do roi noi suy parabol de ra tan so chinh xac. */
function fineF(b){
 if(!an||!freq||!bins||b<0||b>30)return ISO[b]||0;
 var df=ctx.sampleRate/an.fftSize,nb=an.frequencyBinCount;
 var i0=Math.max(2,bins[b][0]),i1=Math.min(nb-3,bins[b][1]);
 var pi=-1,pv=-300,i,v;
 for(i=i0;i<=i1;i++){
  v=freq[i];
  if(v<freq[i-1]||v<freq[i+1])continue;
  if(v>pv){pv=v;pi=i}
 }
 if(pi<0)return ISO[b];
 var l=freq[pi-1],c=freq[pi],r=freq[pi+1],dd=l-2*c+r,off=0;
 if(dd<0){off=0.5*(l-r)/dd;if(!isFinite(off)||Math.abs(off)>0.5)off=0}
 var f=(pi+off)*df;
 if(f<ISO[b]/1.3||f>ISO[b]*1.3)return ISO[b];
 return f;
}
function clearFb(){fbBand=-1;fbHits=0;fbShown=false;el('warn').classList.remove('on')}
function guard(db,bb){
 var cfg=SENS[sens];
 if(!cfg||measuring||noiseOn||bb<-68){if(fbHits||fbShown)clearFb();return}
 var best=-1,bp=0,i;
 for(i=6;i<29;i++){
  var pr=prom(db,i);
  if(db[i]>-62&&pr>bp){bp=pr;best=i}
 }
 /* Lui ve tan so goc: neu bang dang xet chi la hoa am (x2 = -3 bang, x3 = -5 bang)
    cua mot bang thap hon cung nhon thi lay bang thap hon, do moi la cho hu that. */
 var moved=0;
 if(best>=0){
  for(var pass=0;pass<2;pass++){
   var m2=best-3,m3=best-5,mv=0;
   if(m2>=6&&db[m2]>-62&&prom(db,m2)>=Math.max(6,bp*0.45)){best=m2;bp=prom(db,best);mv=1}
   else if(m3>=6&&db[m3]>-62&&prom(db,m3)>=Math.max(6,bp*0.45)){best=m3;bp=prom(db,best);mv=1}
   if(!mv)break;
   moved=1;
  }
 }
 /* Con thay hoa am phia tren thi kha nang la giong hat / nhac cu chu khong phai hu.
    Neu vua lui hoa am o tren thi giam nhe hinh phat de khong bo sot hu that co meo tieng. */
 if(best>=0){
  var h2=Math.max(prom(db,best+3),prom(db,best+4));
  var h3=Math.max(prom(db,best+5),prom(db,best+6));
  if(h2>7)bp-=moved?3:7;
  if(h3>7)bp-=moved?2:5;
 }
 var now=performance.now();
 if(best>=0&&bp>=cfg.th){
  if(fbBand<0||Math.abs(best-fbBand)>1){fbBand=best;fbSince=now;fbHits=1}
  else{fbBand=best;fbHits++}
  if(now-fbSince>=cfg.hold&&fbHits>=cfg.hits)showFb(fineF(fbBand),bp,now);
 }else{
  fbHits-=2;
  if(fbHits<=0)clearFb();
 }
}
function showFb(f,bp,now){
 var cut=-Math.min(12,Math.max(3,Math.round(bp*0.6*2)/2));
 el('warnT').innerHTML='Đang hú ở <b>'+fmtF(f)+'</b>.<br>1) Hạ nhỏ <b>ECHO</b> rồi <b>VOL micro</b> một chút.<br>2) Kéo micro ra xa loa, đừng chĩa vào loa.<br>3) Nếu có DSP: cắt tại <b>Fc '+fmtF(f)+' · Q = 8 · '+cut+' dB</b>.<br><span style="color:#c9b26a">Không nghe hú? Hãy chọn “Ít nhạy” hoặc “Tắt” ở mục Cảnh báo hú rít (bước 2).</span>';
 el('warn').classList.add('on');
 if(!fbShown||now-lastFb>7000){lastFb=now;say('Đang hú rít ở '+fmtF(f)+'. Hãy giảm núm ê cô hoặc âm lượng micro.')}
 fbShown=true;
}

/* ============ GIONG DOC (TTS) ============ */
var viVoice=null,ttsReady=false,ttsUnlocked=false,ttsTries=0;
function ttsSupported(){return !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance!=='undefined'}
function allVoices(){try{return window.speechSynthesis.getVoices()||[]}catch(e){return []}}
function ttsNote(m,warn){
 var e=el('sayMsg');if(!e)return;
 e.textContent=m||'';
 e.style.display=m?'block':'none';
 e.style.color=warn?'#fca5a5':'#86efac';
}
function pickVoice(){
 if(!ttsSupported())return;
 var vs=allVoices(),i;
 if(!vs.length){if(ttsTries++<12)setTimeout(pickVoice,400);return}
 ttsReady=true;viVoice=null;
 for(i=0;i<vs.length;i++){if((vs[i].lang||'').toLowerCase().replace('_','-').indexOf('vi')===0){viVoice=vs[i];break}}
 if(!viVoice)for(i=0;i<vs.length;i++){if((vs[i].name||'').toLowerCase().indexOf('viet')>=0){viVoice=vs[i];break}}
}
function unlockTTS(){
 if(ttsUnlocked||!ttsSupported())return;
 ttsUnlocked=true;
 try{var u=new SpeechSynthesisUtterance(' ');u.volume=0;u.rate=2;window.speechSynthesis.speak(u)}catch(e){}
 pickVoice();
}
function say(t){
 if(!ttsSupported()){ttsNote('Trình duyệt này không đọc được bằng giọng nói. Hãy dùng Chrome hoặc Edge.',true);return}
 var ss=window.speechSynthesis;
 try{
  if(!ttsReady)pickVoice();
  if(ss.paused)ss.resume();
  if(ss.speaking||ss.pending){ss.cancel();setTimeout(function(){doSay(t)},170)}
  else doSay(t);
 }catch(e){ttsNote('Lỗi giọng đọc: '+e.message,true)}
}
function doSay(t){
 var ss=window.speechSynthesis,started=false;
 var u=new SpeechSynthesisUtterance(t);
 u.rate=1;u.pitch=1;u.volume=1;
 if(viVoice){u.voice=viVoice;u.lang=viVoice.lang}
 else{var vs=allVoices();if(vs.length){u.voice=vs[0];u.lang=vs[0].lang}}
 u.onstart=function(){started=true;if(viVoice)ttsNote('')};
 u.onerror=function(e){
  var er=(e&&e.error)?e.error:'lỗi';
  if(er==='interrupted'||er==='canceled')return;
  ttsNote('Không đọc được ('+er+'). Kiểm tra âm lượng hệ thống.',true);
 };
 try{ss.speak(u)}catch(e){ttsNote('Lỗi giọng đọc: '+e.message,true);return}
 if(!viVoice)ttsNote('Máy chưa có giọng tiếng Việt nên đang đọc bằng giọng mặc định. Muốn giọng Việt: cài thêm tiếng Việt trong phần Giọng đọc / Text-to-speech của máy.',true);
 setTimeout(function(){
  if(started)return;
  try{if(ss.paused)ss.resume()}catch(e){}
  setTimeout(function(){
   if(started)return;
   ttsNote('Đã gửi lệnh đọc nhưng không có tiếng. Thường do: máy chưa cài giọng đọc, âm lượng đang tắt, hoặc trình duyệt không phải Chrome/Edge.',true);
  },1500);
 },1200);
}
if(ttsSupported()){
 try{window.speechSynthesis.onvoiceschanged=pickVoice}catch(e){}
 pickVoice();setTimeout(pickVoice,300);setTimeout(pickVoice,1500);
}
document.addEventListener('click',unlockTTS,true);
document.addEventListener('touchstart',unlockTTS,true);

/* ============ TIENG RE CHUAN ============ */
function pinkBuf(){
 var len=Math.floor(ctx.sampleRate*4),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);
 var b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
 for(var i=0;i<len;i++){
  var w=Math.random()*2-1;
  b0=0.99886*b0+w*0.0555179;b1=0.99332*b1+w*0.0750759;b2=0.969*b2+w*0.153852;
  b3=0.8665*b3+w*0.3104856;b4=0.55*b4+w*0.5329522;b5=-0.7616*b5-w*0.016898;
  d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;b6=w*0.115926;
 }
 return b;
}
function toggleNoise(){
 ensureCtx();
 ctx.resume();
 if(noiseOn){try{noiseNode.stop()}catch(e){}noiseNode=null;noiseOn=false;el('btnNoise').textContent='▶️ PHÁT TIẾNG RÈ CHUẨN';el('btnNoise').className='';return}
 noiseNode=ctx.createBufferSource();noiseNode.buffer=pinkBuf();noiseNode.loop=true;
 noiseGain=ctx.createGain();noiseGain.gain.value=(+el('nv').value)/100;
 noiseNode.connect(noiseGain);noiseGain.connect(ctx.destination);noiseNode.start();
 noiseOn=true;clearFb();
 el('btnNoise').textContent='⏹ DỪNG TIẾNG RÈ';el('btnNoise').className='big rec';
}

function measure(){
 if(!micOn||measuring)return;
 acc=[];for(var i=0;i<31;i++)acc.push(0);
 accN=0;measuring=true;tEnd=performance.now()+(mode==='pink'?10000:25000);
 clearFb();
 el('btnMeasure').className='big rec';
}
function finish(){
 measuring=false;el('btnMeasure').className='big';el('btnMeasure').textContent='⏺ ĐO LẠI';
 var db=[];for(var i=0;i<31;i++)db.push(10*Math.log10(acc[i]/Math.max(1,accN)+1e-20));
 analyze(db);
 el('result').scrollIntoView({behavior:'smooth',block:'start'});
}
function analyze(db){
 var t=PRE[pk].t,tb=[],i,z,k;
 for(i=0;i<31;i++)tb.push(0);
 for(z=0;z<8;z++)for(i=ZI[z][0];i<=ZI[z][1];i++)tb[i]=t[z];
 var err=[];for(i=0;i<31;i++)err.push(db[i]-tb[i]);
 var s=0,n=0;for(i=6;i<=28;i++){s+=err[i];n++}
 var ref=s/n,d=[];for(i=0;i<31;i++)d.push(err[i]-ref);
 var zd=[];for(z=0;z<8;z++){var a=0,c=0;for(i=ZI[z][0];i<=ZI[z][1];i++){a+=d[i];c++}zd.push(a/c)}
 var res=[];
 for(i=3;i<=15;i++){
  var arr=[];for(k=Math.max(0,i-3);k<=Math.min(30,i+3);k++)if(k!==i)arr.push(d[k]);
  arr.sort(function(x,y){return x-y});
  var ex=d[i]-arr[Math.floor(arr.length/2)];
  if(ex>=6)res.push({f:ISO[i],ex:ex});
 }
 var pen=0;for(z=0;z<8;z++)pen+=Math.min(20,Math.max(0,(Math.abs(zd[z])-2)*3.2));
 pen+=res.length*6;
 render(Math.max(0,Math.min(100,Math.round(100-pen))),zd,res,d);
}
function render(score,zd,res,d){
 el('result').style.display='block';
 var col=score>=80?'#22c55e':score>=60?'#a3e635':score>=40?'#eab308':'#ef4444';
 var st=score>=80?'Đang rất tốt — cứ hát thôi':score>=60?'Tạm ổn — chỉnh thêm sẽ hay hơn':score>=40?'Cần chỉnh':'Cần chỉnh ngay';
 el('gauge').style.background=col;
 el('gauge').innerHTML='<b>'+score+'</b><span>ĐIỂM</span>';
 var cmp='';
 if(prevScore!==null){var dd=score-prevScore;cmp=' · Lần đo trước: '+prevScore+' điểm → '+(dd>0?'<b style="color:#22c55e">tốt hơn +'+dd+'</b>':dd<0?'<b style="color:#ef4444">kém hơn '+dd+'</b>':'không đổi')}
 el('status').innerHTML='<b style="font-size:19px">'+st+'</b><div class="hint" style="margin-top:4px">Dàn: '+PRE[pk].n+cmp+'</div>';
 prevScore=score;
 var items=[],z,i;
 for(z=0;z<8;z++)if(Math.abs(zd[z])>=2)items.push({z:z,v:zd[z]});
 items.sort(function(a,b){return Math.abs(b.v)-Math.abs(a.v)});
 var h='',sp=[];
 if(!items.length&&!res.length){h='<li style="border-left-color:#22c55e"><b>Không cần chỉnh gì thêm 🎉</b><small>Các dải âm đang cân so với kiểu dàn bạn chọn. Giữ nguyên như vậy.</small></li>';sp.push('Dàn của bạn đang cân, không cần chỉnh thêm')}
 for(i=0;i<items.length&&i<5;i++){
  var zz=items[i].z,v=items[i].v,amt=Math.min(8,Math.round(Math.abs(v)*2)/2),up=v<0;
  var c=Math.abs(v)>=5?'#ef4444':Math.abs(v)>=3?'#eab308':'#38bdf8';
  h+='<li style="border-left-color:'+c+'"><b>'+(i+1)+'. '+ZN[zz]+'</b><small>Nghe thấy: '+(up?FEW[zz]:MANY[zz])+'</small><div class="do">➜ '+(up?'TĂNG':'GIẢM')+' khoảng <b>'+amt+' dB</b> ở '+KNOB[zz]+'</div></li>';
  sp.push((up?'Tăng':'Giảm')+' khoảng '+amt+' đê xi ben ở '+SHORT[zz]);
 }
 for(i=0;i<res.length&&i<3;i++){
  var f=res[i].f,cut=-Math.min(9,Math.max(3,Math.round(res[i].ex*0.6)));
  h+='<li style="border-left-color:#a855f7"><b>Phòng bị dội (ù từng chỗ) ở '+fmtF(f)+'</b><small>Một tần số trầm bị phòng cộng hưởng, làm tiếng ù lên nghe rất khó chịu.</small><div class="do">➜ Cắt hẹp tại DSP/EQ: <b>Fc '+fmtF(f)+' · Q = 6 · '+cut+' dB</b>. Không có DSP thì kéo loa xa tường/góc phòng 30–50 cm.</div></li>';
 }
 el('todo').innerHTML=h;
 speakText='Điểm '+score+' trên 100. '+st+'. '+sp.join('. ')+'.';
 drawRes(d);
}
function cw(c){var r=c.getBoundingClientRect(),dp=window.devicePixelRatio||1;c.width=Math.max(320,r.width*dp);c.height=r.height*dp;var g=c.getContext('2d');g.setTransform(dp,0,0,dp,0,0);return{g:g,w:r.width||320,h:r.height}}
function labels(g,bw,h){
 g.fillStyle='#8ea3bf';g.font='9px system-ui';g.textAlign='center';
 var lab=[0,6,10,14,18,22,26,30];
 for(var k=0;k<lab.length;k++){var ii=lab[k];g.fillText(ISO[ii]>=1000?(ISO[ii]/1000)+'k':''+ISO[ii],ii*bw+bw/2,h-3)}
}
function drawLive(db){
 var c=el('live');if(!c)return;
 var o=cw(c),g=o.g,w=o.w,h=o.h,bw=w/31,i,j;
 g.clearRect(0,0,w,h);
 for(i=0;i<31;i++){
  var v=Math.max(0,Math.min(1,(db[i]+90)/80)),bh=v*(h-18),z=0;
  for(j=0;j<8;j++)if(i>=ZI[j][0]&&i<=ZI[j][1])z=j;
  g.fillStyle=ZC[z];
  g.fillRect(i*bw+1,h-14-bh,bw-2,bh);
 }
 labels(g,bw,h);
}
function drawRes(d){
 var c=el('res');if(!c)return;
 var o=cw(c),g=o.g,w=o.w,h=o.h,top=8,bot=h-16,mid=(top+bot)/2,sc=(bot-top)/2/14,bw=w/31,v,y,i;
 g.clearRect(0,0,w,h);
 g.strokeStyle='#22314a';g.lineWidth=1;g.font='9px system-ui';g.textAlign='left';
 for(v=-12;v<=12;v+=6){
  y=mid-v*sc;
  g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();
  g.fillStyle='#5c7192';g.fillText((v>0?'+':'')+v,2,y-2);
 }
 for(i=0;i<31;i++){
  var val=Math.max(-14,Math.min(14,d[i])),y2=mid-val*sc,av=Math.abs(val);
  g.fillStyle=av<2?'#22c55e':av<5?'#eab308':'#ef4444';
  g.fillRect(i*bw+1.5,Math.min(mid,y2),bw-3,Math.max(1,Math.abs(mid-y2)));
 }
 g.strokeStyle='#7ee2a8';g.lineWidth=1.5;
 g.beginPath();g.moveTo(0,mid);g.lineTo(w,mid);g.stroke();
 labels(g,bw,h);
}

var EP=[{n:'Nhạc trẻ / sôi động',dly:'1/8',rpt:'2–3',rt:'1.0–1.2 s',lo:'120 Hz',hi:'8 kHz'},{n:'Bolero / trữ tình',dly:'1/4',rpt:'3–4',rt:'1.6–1.9 s',lo:'100 Hz',hi:'7 kHz'},{n:'Karaoke gia đình',dly:'1/8',rpt:'3',rt:'1.2–1.4 s',lo:'120 Hz',hi:'8 kHz'},{n:'Nói chuyện / MC / nhà thờ',dly:'off',rpt:'1',rt:'0.4–0.6 s',lo:'150 Hz',hi:'6 kHz'}];
function calcEcho(){
 var bpm=+el('bpm').value||120,q=60000/bpm,e=q/2;
 var h='<tr><th>Kiểu hát</th><th>DLY (Delay)</th><th>RPT (Lặp)</th><th>Vang RT60</th><th>LO cut</th><th>HI cut</th></tr>';
 for(var i=0;i<EP.length;i++){
  var ms=EP[i].dly==='1/4'?Math.round(q)+' ms':EP[i].dly==='1/8'?Math.round(e)+' ms':'Tắt hoặc 60–100 ms';
  h+='<tr><td>'+EP[i].n+'</td><td><b>'+ms+'</b></td><td>'+EP[i].rpt+'</td><td>'+EP[i].rt+'</td><td>'+EP[i].lo+'</td><td>'+EP[i].hi+'</td></tr>';
 }
 el('echoT').innerHTML=h;
}
var taps=[];
function tap(){
 var now=performance.now();
 if(taps.length&&now-taps[taps.length-1]>2500)taps=[];
 taps.push(now);
 if(taps.length>8)taps.shift();
 if(taps.length>=2){
  var d=(taps[taps.length-1]-taps[0])/(taps.length-1),bpm=Math.round(60000/d);
  if(bpm>=40&&bpm<=220){el('bpm').value=bpm;calcEcho();el('tapT').textContent='Đã bấm '+taps.length+' lần → '+bpm+' BPM (1/4 nhịp = '+Math.round(60000/bpm)+' ms)'}
 }else{el('tapT').textContent='Bấm tiếp theo nhạc…'}
}

el('btnMic').onclick=startMic;
el('btnMeasure').onclick=measure;
el('btnNoise').onclick=toggleNoise;
el('btnSay').onclick=function(){if(speakText){ttsNote('Đang gửi lệnh đọc…');say(speakText)}};
el('btnPng').onclick=function(){
 try{
  var a=document.createElement('a');
  a.download='soundtune-ketqua.png';
  a.href=el('res').toDataURL('image/png');
  a.click();
 }catch(e){}
};
el('nv').oninput=function(){el('nvV').textContent=el('nv').value;if(noiseGain)noiseGain.gain.value=(+el('nv').value)/100};
el('bpm').oninput=calcEcho;
el('btnTap').onclick=tap;
el('warnX').onclick=clearFb;
calcEcho();
