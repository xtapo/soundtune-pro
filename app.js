/* SoundTune Pro - app.js */
/* ================= HANG SO ================= */
var ISO=[20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
var ZONES=[["SUB",20,63,"#8b5cf6"],["BASS",80,160,"#3b82f6"],["LOW MID",200,400,"#06b6d4"],["MID",500,1000,"#22c55e"],["MID HI",1250,2500,"#eab308"],["HI",3150,6300,"#f97316"],["TREBLE",8000,12500,"#ef4444"],["AIR",16000,20000,"#ec4899"]];
var SPEED={
  slow:{up:0.30,dn:0.045,sm:0.86,fft:16384,hold:8},
  med :{up:0.50,dn:0.100,sm:0.66,fft:16384,hold:6},
  fast:{up:0.80,dn:0.220,sm:0.34,fft:8192 ,hold:4},
  fb  :{up:1.00,dn:0.450,sm:0.00,fft:16384,hold:2}
};
var SNAPCOL=["#22d3ee","#a3e635","#f472b6","#fbbf24","#60a5fa","#fb7185"];
var NB=ISO.length, R6=Math.pow(2,1/6);
var DBMIN=-100, DBMAX=0;

/* ================= TRANG THAI ================= */
var ac=null,analyser=null,micSrc=null,sumBus=null,simBus=null,spkGain=null,buf=null;
var bandBins=[],binHz=1,cfg=SPEED.med;
var bands=new Float32Array(NB),disp=new Float32Array(NB),peaks=new Float32Array(NB),pAge=new Int16Array(NB);
var running=false,frozen=false;
var snaps=[null,null,null,null,null,null],snapOn=[true,true,true,true,true,true];
var cur={x:-1,y:-1,on:false};
var det={f:0,cnt:0,last:0,lastF:0,t0:0,hit:0,hits:0,pmin:99,pmax:-99,k0:0,hist:[]};
var simOsc=null,simGain=null,simFreq=0;
var viVoice=null;
for(var i=0;i<NB;i++){disp[i]=DBMIN;peaks[i]=DBMIN;bands[i]=DBMIN;}

var $=function(id){return document.getElementById(id)};

/* ================= AUDIO ================= */
function buildBins(){
  var n=analyser.frequencyBinCount; binHz=(ac.sampleRate/2)/n; bandBins=[];
  for(var b=0;b<NB;b++){
    var lo=ISO[b]/R6, hi=ISO[b]*R6;
    var i0=Math.max(1,Math.round(lo/binHz)), i1=Math.min(n-1,Math.round(hi/binHz));
    if(i1<i0)i1=i0;
    bandBins.push([i0,i1]);
  }
  buf=new Float32Array(n);
}

function startMic(){
  if(running){return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    alert("Trình duyệt không hỗ trợ truy cập micro. Hãy dùng Chrome/Edge/Safari bản mới.");return;
  }
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}})
  .then(function(stream){
    ensureCtx();
    micSrc=ac.createMediaStreamSource(stream);
    micSrc.connect(sumBus);
    running=true;
    $("stt").textContent="Micro: ĐANG ĐO"; $("stt").className="badge on";
    $("srate").textContent=Math.round(ac.sampleRate/1000)+" kHz · FFT "+analyser.fftSize;
    $("btnMic").textContent="ĐANG ĐO"; $("btnMic").disabled=true;
  })
  .catch(function(e){ alert("Không truy cập được micro: "+e.message); });
}

function ensureCtx(){
  if(ac){ if(ac.state==="suspended"){ac.resume()} return }
  ac=new (window.AudioContext||window.webkitAudioContext)();
  sumBus=ac.createGain(); sumBus.gain.value=1;
  analyser=ac.createAnalyser();
  analyser.fftSize=cfg.fft; analyser.smoothingTimeConstant=cfg.sm;
  analyser.minDecibels=-120; analyser.maxDecibels=0;
  sumBus.connect(analyser);
  simBus=ac.createGain(); simBus.gain.value=1; simBus.connect(sumBus);
  spkGain=ac.createGain(); spkGain.gain.value=0; simBus.connect(spkGain); spkGain.connect(ac.destination);
  buildBins();
  $("srate").textContent=Math.round(ac.sampleRate/1000)+" kHz · FFT "+analyser.fftSize;
}

function nfComp(f){ return -10/(1+Math.pow(f/90,2)); }

function analyze(){
  analyser.getFloatFrequencyData(buf);
  var nfOn=$("nf").checked, totP=0;
  for(var b=0;b<NB;b++){
    var r=bandBins[b],s=0;
    for(var i=r[0];i<=r[1];i++){ var v=buf[i]; if(v>-150) s+=Math.pow(10,v/10); }
    var db = s>0 ? 10*Math.log10(s) : DBMIN;
    if(nfOn) db+=nfComp(ISO[b]);
    if(db<DBMIN) db=DBMIN;
    bands[b]=db; totP+=Math.pow(10,db/10);
    var k = db>disp[b] ? cfg.up : cfg.dn;
    disp[b]=disp[b]+(db-disp[b])*k;
    if(disp[b]>=peaks[b]){ peaks[b]=disp[b]; pAge[b]=0; }
    else { pAge[b]++; if(pAge[b]>20) peaks[b]=Math.max(DBMIN,peaks[b]-0.55); }
  }
  return totP>0 ? 10*Math.log10(totP) : DBMIN;
}

/* ================= PHAT HIEN HU RIT (v2) =================
   Ban cu bao SAI tan so vi no lay DINH TO NHAT trong dai 70 Hz - 9 kHz.
   Tieng bass, tieng trong, tieng dan luon to hon vach hu nen may bao ra tan so
   cua nhac chu khong phai tan so hu. Khi hu bi meo tieng thi hoa am bac 2 - 3
   con co the to hon ca tan so goc.

   Ban nay sua 5 diem:
     1. Xep hang dinh theo DO NHO so voi nen pho (prominence) chu khong theo do
        to. Nen pho tinh bang TRUNG VI tren luoi 1/6 octave nen mot vach hu don
        doc khong the tu keo nen cua chinh no len.
     2. Lui ve tan so goc: neu dinh dang xet dung bang m lan (m = 2..5) mot dinh
        thap hon ma dinh do cung con manh thi lay dinh thap hon.
     3. Noi suy parabol CHI chay khi that su la dinh (dao ham bac hai am) va gioi
        han lech toi da nua bin.
     4. Khoa tan so bang TRUNG VI cua 15 khung gan nhat, dung sai bam 1.5 %, nen
        so bao dung yen thay vi troi dan.
     5. Mo rong dai quet len 60 Hz - 12 kHz de bat ca hu tren loa horn.

   Ba dieu kien de ket luan la hu van giu nguyen:
     a. Nhon hon nen pho >= nguong bao (prominence)
     b. KHONG phai mot bac trong chuoi hai am cua giong noi / nhac (voiceComb)
     c. Giu nguyen tan so VA nguyen do lon lien tuc >= 0.85 s (che do "nhan manh
        hu": 0.45 s) */

var FMIN=60, FMAX=12000, FSTEP=Math.pow(2,1/6), FLOG=Math.log(FSTEP);
var FLOORF=[], FLOORV=[];
for(var _ff=40;_ff<=16000;_ff*=FSTEP) FLOORF.push(_ff);

function medOf(a){
  if(!a.length) return 0;
  a.sort(function(x,y){return x-y});
  var m=a.length>>1;
  return (a.length%2) ? a[m] : (a[m-1]+a[m])/2;
}

/* Nen pho theo luoi 1/6 octave. Dung TRUNG VI chu khong dung trung binh: mot
   vach hu don doc chi chiem vai bin nen khong keo noi trung vi cua ca o len. */
function calcFloor(n){
  FLOORV.length=0;
  for(var g=0;g<FLOORF.length;g++){
    var fc=FLOORF[g];
    var i0=Math.max(1,Math.round(fc/FSTEP/binHz));
    var i1=Math.min(n-1,Math.round(fc*FSTEP/binHz));
    if(i1<i0) i1=i0;
    var st=Math.max(1,Math.floor((i1-i0+1)/48)), v=[];
    for(var i=i0;i<=i1;i+=st){ if(buf[i]>-190) v.push(buf[i]) }
    FLOORV.push(v.length?medOf(v):-120);
  }
}

/* Noi suy nen pho tai tan so bat ky - tra ve trong thoi gian hang so */
function floorAt(f){
  var m=FLOORV.length;
  if(!m) return -120;
  var g=Math.log(f/FLOORF[0])/FLOG;
  if(g<=0) return FLOORV[0];
  if(g>=m-1) return FLOORV[m-1];
  var g0=Math.floor(g);
  return FLOORV[g0]+(FLOORV[g0+1]-FLOORV[g0])*(g-g0);
}

function binPeak(f){
  var n=analyser.frequencyBinCount, c=Math.round(f/binHz);
  if(c<3||c>n-4) return -300;
  var m=-300;
  for(var i=c-2;i<=c+2;i++){ if(buf[i]>m) m=buf[i] }
  return m;
}

/* Giong noi (va moi nhac cu co cao do) phat ra mot DAY vach cach nhau dung
   mot khoang F0 = tan so day thanh, thuong 80 - 400 Hz. Neu canh dinh dang xet
   con thay hai vach anh em cach deu nhau thi day la tieng noi/hat chu khong phai hu. */
function voiceComb(f,pv,med){
  var lim=Math.max(med+8,pv-13), k, F0, dn, up;
  for(k=2;k<=12;k++){
    F0=f/k;
    if(F0<80) break;
    if(F0>400) continue;
    dn=f-F0; up=f+F0;
    if(dn<60) continue;
    if(binPeak(dn)>=lim && binPeak(up)>=lim) return true;
    if(binPeak(dn)>=lim && dn-F0>=60 && binPeak(dn-F0)>=lim) return true;
  }
  return false;
}

/* Tim trong danh sach ung vien mot dinh nam quanh tan so f */
function peakNear(top,f,tol){
  var bi=-1,bp=-999;
  for(var k=0;k<top.length;k++){
    if(Math.abs(top[k].f-f)/f<=tol && top[k].prom>bp){ bp=top[k].prom; bi=k }
  }
  return bi;
}

function detect(){
  if(!analyser||!buf) return null;
  var n=analyser.frequencyBinCount;
  if(!n) return null;
  calcFloor(n);

  var a=Math.max(3,Math.round(FMIN/binHz)), z=Math.min(n-3,Math.round(FMAX/binHz));
  var top=[], i, v, fl, pr;

  /* B1 - gom moi dinh NHON, cham diem bang do nho so voi nen pho */
  for(i=a;i<=z;i++){
    v=buf[i];
    if(v<-95) continue;
    if(v<buf[i-1]||v<buf[i+1]||v<=buf[i-2]||v<=buf[i+2]) continue;
    fl=floorAt(i*binHz); pr=v-fl;
    if(pr<4) continue;
    top.push({i:i,f:i*binHz,v:v,prom:pr});
  }
  if(!top.length) return null;
  top.sort(function(x,y){return y.prom-x.prom});
  if(top.length>8) top.length=8;

  /* B2 - lui ve tan so goc neu dinh dang xet chi la hoa am */
  var best=top[0], pass, m, k, moved, fs;
  for(pass=0;pass<3;pass++){
    moved=0;
    for(m=2;m<=5;m++){
      fs=best.f/m;
      if(fs<FMIN) break;
      k=peakNear(top,fs,0.02);
      if(k>=0 && top[k]!==best && top[k].prom>=Math.max(4,best.prom*0.35)){ best=top[k]; moved=1; break }
    }
    if(!moved) break;
  }

  /* B3 - noi suy parabol chi khi that su la dinh */
  var pi=best.i, l=buf[pi-1], c=buf[pi], r=buf[pi+1], dd=l-2*c+r, off=0;
  if(dd<0){ off=0.5*(l-r)/dd; if(!isFinite(off)||Math.abs(off)>0.5) off=0 }
  var f=(pi+off)*binHz;

  /* B4 - do rong -3 dB, Q va danh sach nghi ngo de doi chieu */
  var base=floorAt(f), prom=best.v-base;
  var th=best.v-3, li=pi, ri=pi;
  var lo=Math.max(1,pi-600), hi=Math.min(n-2,pi+600);
  while(li>lo && buf[li]>th) li--;
  while(ri<hi && buf[ri]>th) ri++;
  var bw=Math.max(binHz*2,(ri-li)*binHz);
  var Q=Math.min(60,Math.max(2,f/bw));
  var alts=[];
  for(i=0;i<top.length&&alts.length<3;i++) alts.push({f:top[i].f,prom:top[i].prom});

  return {f:f,peak:best.v,prom:prom,bw:bw,Q:Q,alts:alts,voice:voiceComb(f,best.v,base)};
}

function fmtF(f){ return f>=1000 ? (f/1000).toFixed(2)+" kHz" : Math.round(f)+" Hz"; }
function bwOct(Q){ return (2/Math.LN2)*Math.log(1/(2*Q)+Math.sqrt(1/(4*Q*Q)+1)); }

function trkStart(now,d){
  det.f=d.f; det.t0=now; det.hit=now; det.hits=1;
  det.pmin=d.prom; det.pmax=d.prom; det.k0=d.peak;
  det.hist=[d.f];
}

function showTop(d){
  var tp=$("fbTop");
  if(!tp) return;
  if(d&&d.alts&&d.alts.length){
    var s=[],i;
    for(i=0;i<d.alts.length;i++) s.push(fmtF(d.alts[i].f)+" +"+d.alts[i].prom.toFixed(0));
    tp.textContent=s.join("  ·  ");
  }else{
    tp.textContent="—";
  }
}

function handleDetect(spl){
  var d=detect(), now=Date.now();
  var thr=parseFloat($("thr").value);
  var need=($("speed").value==="fb")?450:850;

  showTop(d);

  /* Khong co dinh, chua du nhon, hoac dung la tieng noi -> quen di */
  if(!d || d.prom<thr || d.voice){
    if(det.f>0 && now-det.hit>260){ det.f=0; det.hits=0; det.hist.length=0 }
    return;
  }

  /* Cung mot tan so (lech < 1.5 %) va khong bi dut qua 260 ms thi tinh la ke tiep.
     Khoa tan so bang trung vi 15 khung gan nhat: mot khung nhieu khong keo lech duoc. */
  if(det.f>0 && Math.abs(d.f-det.f)/det.f<0.015 && now-det.hit<=260){
    det.hits++; det.hit=now;
    if(d.prom<det.pmin) det.pmin=d.prom;
    if(d.prom>det.pmax) det.pmax=d.prom;
    det.hist.push(d.f);
    if(det.hist.length>15) det.hist.shift();
    det.f=medOf(det.hist.slice());
  }else{
    trkStart(now,d);
    return;
  }

  var dur=now-det.t0;
  var loud=(d.prom>=thr+10 && dur>=350 && det.hits>=4);
  if(dur<need && !loud) return;
  if(det.hits<6 && !loud) return;
  if(det.pmax-det.pmin>10) return;   /* len xuong that thuong nhu tieng noi */
  if(d.peak<det.k0-5) return;        /* dang tat dan, hu that thi khong tat */

  d.f=det.f;                         /* bao ra tan so DA KHOA, khong phai khung le */
  d.dur=dur/1000;
  showAlert(d,spl);
}

function showAlert(d,spl){
  var sev = d.prom>=18?"NGHIÊM TRỌNG" : d.prom>=11?"NẶNG" : "NHẸ";
  var cut = -Math.min(12,Math.max(3,Math.round(d.prom*0.6*2)/2));
  var Q=Math.round(d.Q*10)/10;
  $("aF").textContent=fmtF(d.f);
  $("aSev").textContent="MỨC ĐỘ: "+sev;
  $("aP").textContent="+"+d.prom.toFixed(1)+" dB so với nền phổ"+(d.dur?" · đứng yên "+d.dur.toFixed(1)+" s":"");
  $("aSpl").textContent=spl.toFixed(1)+" dB SPL (ước tính)";
  $("aFc").textContent=(d.f>=1000?(d.f/1000).toFixed(3)+" kHz":d.f.toFixed(1)+" Hz");
  $("aBw").textContent=Math.round(d.bw)+" Hz ("+bwOct(Q).toFixed(2)+" oct)";
  $("aQ").textContent=Q.toFixed(1);
  $("aG").textContent=cut.toFixed(1)+" dB";
  $("aFix").innerHTML="<b>Xử lý:</b> Vào PEQ của DSP, tạo 1 filter <b>Bell/Notch</b> tại <b>"+fmtF(d.f)+"</b>, Q = <b>"+Q.toFixed(1)+"</b>, Gain = <b>"+cut.toFixed(1)+" dB</b>. Sau đó giảm 1–2 dB Master Mic, kiểm tra lại. Nếu vẫn hú: hạ mic khỏi trục loa, tăng khoảng cách mic–loa, hoặc bật High-Pass 100 Hz cho mic.";
  $("alert").style.display="block";
  var now=Date.now();
  var changed = Math.abs(d.f-det.lastF)/(det.lastF||1)>0.05;
  if($("tts").checked && (now-det.last>4200 || changed)){
    det.last=now; det.lastF=d.f;
    speak("Cảnh báo hú rít tại "+sayF(d.f)+". Mức độ "+sev.toLowerCase()+". Đề nghị cắt "+Math.abs(cut).toFixed(0)+" đê xi ben, Q bằng "+Q.toFixed(0)+".");
  }
  clearTimeout(showAlert.t);
  showAlert.t=setTimeout(function(){ $("alert").style.display="none" },5000);
}

function sayF(f){
  if(f>=1000){ return (f/1000).toFixed(2).replace("."," phẩy ")+" ki lô héc" }
  return Math.round(f)+" héc";
}

/* ================= GIONG DOC (TTS) ================= */
var ttsReady=false, ttsUnlocked=false, ttsTries=0;

function ttsSupported(){ return typeof window!=="undefined" && !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance!=="undefined" }
function allVoices(){ try{ return window.speechSynthesis.getVoices()||[] }catch(e){ return [] } }
function ttsNote(m,warn){
  var e=$("voiceMsg"); if(!e) return;
  e.textContent=m||"";
  e.style.display=m?"block":"none";
  e.style.color=warn?"#fca5a5":"#86efac";
}
function setVoiceNm(t){ var e=$("voiceNm"); if(e) e.textContent=t }

function pickVoice(){
  if(!ttsSupported()){ setVoiceNm("trình duyệt không hỗ trợ"); return }
  var vs=allVoices(), i;
  if(!vs.length){
    setVoiceNm("đang tải danh sách giọng…");
    if(ttsTries++<12) setTimeout(pickVoice,400);
    return;
  }
  ttsReady=true; viVoice=null;
  for(i=0;i<vs.length;i++){ if((vs[i].lang||"").toLowerCase().replace("_","-").indexOf("vi")===0){ viVoice=vs[i]; break } }
  if(!viVoice) for(i=0;i<vs.length;i++){ if((vs[i].name||"").toLowerCase().indexOf("viet")>=0){ viVoice=vs[i]; break } }
  if(viVoice){
    setVoiceNm(viVoice.name+" · "+viVoice.lang);
    ttsNote("");
  }else{
    setVoiceNm("CHƯA CÓ giọng tiếng Việt ("+vs.length+" giọng khác)");
    ttsNote("Máy chưa cài giọng tiếng Việt nên sẽ đọc bằng giọng mặc định (nghe hơi lơ lớ). Muốn giọng Việt chuẩn: Windows → Settings › Time & language › Language › thêm Tiếng Việt (kèm Speech); Android → Settings › Cài đặt bổ sung › Văn bản thành giọng nói › tải tiếng Việt; iPhone → Cài đặt › Trợ năng › Nội dung đọc › Giọng nói › Tiếng Việt.",true);
  }
}

function unlockTTS(){
  if(ttsUnlocked||!ttsSupported()) return;
  ttsUnlocked=true;
  try{
    var u=new SpeechSynthesisUtterance(" ");
    u.volume=0; u.rate=2;
    window.speechSynthesis.speak(u);
  }catch(e){}
  pickVoice();
}

function speak(t){
  if(!ttsSupported()){
    ttsNote("Trình duyệt này không có bộ đọc giọng nói (Web Speech). Hãy mở bằng Chrome hoặc Edge.",true);
    return;
  }
  var ss=window.speechSynthesis;
  try{
    if(!ttsReady) pickVoice();
    if(ss.paused){ ss.resume() }
    if(ss.speaking||ss.pending){
      ss.cancel();
      setTimeout(function(){ doSpeak(t) },170);
    }else{
      doSpeak(t);
    }
  }catch(e){ ttsNote("Lỗi giọng đọc: "+e.message,true) }
}

function doSpeak(t){
  var ss=window.speechSynthesis, started=false;
  var u=new SpeechSynthesisUtterance(t);
  u.rate=1.02; u.pitch=1; u.volume=1;
  if(viVoice){ u.voice=viVoice; u.lang=viVoice.lang }
  else{
    var vs=allVoices();
    if(vs.length){ u.voice=vs[0]; u.lang=vs[0].lang }
  }
  u.onstart=function(){ started=true };
  u.onend=function(){ if(viVoice) ttsNote("") };
  u.onerror=function(e){
    var er=(e&&e.error)?e.error:"lỗi";
    if(er==="interrupted"||er==="canceled") return;
    ttsNote("Không đọc được ("+er+"). Kiểm tra âm lượng hệ thống, hoặc máy chưa cài giọng đọc.",true);
  };
  try{ ss.speak(u) }catch(e){ ttsNote("Lỗi giọng đọc: "+e.message,true); return }
  setTimeout(function(){
    if(started) return;
    try{ if(ss.paused) ss.resume() }catch(e){}
    setTimeout(function(){
      if(started) return;
      ttsNote("Đã gửi lệnh đọc nhưng hệ thống không phát ra tiếng. Nguyên nhân thường gặp: (1) máy chưa cài giọng tiếng Việt, (2) loa/âm lượng hệ thống đang tắt hoặc đang xuất ra thiết bị khác, (3) trình duyệt Safari/Firefox hạn chế Web Speech — hãy thử Chrome hoặc Edge, (4) trang đang mở bằng file:// — hãy mở bằng địa chỉ https.",true);
    },1500);
  },1200);
}

if(ttsSupported()){
  try{ window.speechSynthesis.onvoiceschanged=pickVoice }catch(e){}
  pickVoice();
  setTimeout(pickVoice,300);
  setTimeout(pickVoice,1500);
}
document.addEventListener("click",unlockTTS,true);
document.addEventListener("touchstart",unlockTTS,true);

/* ================= VE DO THI ================= */
var cv=$("rta"), cx=cv.getContext("2d");
var PAD={l:46,r:14,t:16,b:48};
function W(){return cv.clientWidth-PAD.l-PAD.r}
function H(){return cv.clientHeight-PAD.t-PAD.b}
function fx(f){return PAD.l+(Math.log10(f/20)/3)*W()}
function xf(x){return 20*Math.pow(10,((x-PAD.l)/W())*3)}
function fy(db){return PAD.t+(DBMAX-db)/(DBMAX-DBMIN)*H()}
function yd(y){return DBMAX-((y-PAD.t)/H())*(DBMAX-DBMIN)}

function resize(){
  var dpr=window.devicePixelRatio||1;
  cv.width=Math.round(cv.clientWidth*dpr);
  cv.height=Math.round(cv.clientHeight*dpr);
  cx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize",resize);

function draw(total,spl){
  var w=cv.clientWidth,h=cv.clientHeight;
  cx.clearRect(0,0,w,h);
  cx.fillStyle="#0a121d"; cx.fillRect(0,0,w,h);

  for(var z=0;z<ZONES.length;z++){
    var Z=ZONES[z], x0=fx(Z[1]/R6), x1=fx(Z[2]*R6);
    cx.globalAlpha=0.07; cx.fillStyle=Z[3]; cx.fillRect(x0,PAD.t,x1-x0,H()); cx.globalAlpha=1;
    cx.strokeStyle="rgba(255,255,255,.06)"; cx.beginPath(); cx.moveTo(x1,PAD.t); cx.lineTo(x1,PAD.t+H()); cx.stroke();
    cx.fillStyle=Z[3]; cx.globalAlpha=.9; cx.font="700 9.5px Segoe UI,Arial"; cx.textAlign="center";
    cx.fillText(Z[0],(x0+x1)/2,PAD.t+11); cx.globalAlpha=1;
    cx.fillStyle=Z[3]; cx.fillRect(x0+1,PAD.t+H()+26,x1-x0-2,3);
  }

  cx.font="10px Segoe UI,Arial"; cx.textAlign="right";
  for(var db=DBMAX;db>=DBMIN;db-=10){
    var y=fy(db);
    cx.strokeStyle = db===DBMAX?"#2b3d52":"rgba(255,255,255,.055)";
    cx.beginPath(); cx.moveTo(PAD.l,y); cx.lineTo(PAD.l+W(),y); cx.stroke();
    cx.fillStyle="#7c8ea6"; cx.fillText(db+"",PAD.l-6,y+3.5);
  }
  cx.save(); cx.translate(12,PAD.t+H()/2); cx.rotate(-Math.PI/2);
  cx.textAlign="center"; cx.fillStyle="#7c8ea6"; cx.fillText("dBFS",0,0); cx.restore();

  var labs=[20,31.5,50,80,125,200,315,500,800,1250,2000,3150,5000,8000,12500,20000];
  cx.textAlign="center";
  for(var i=0;i<labs.length;i++){
    var f=labs[i],x=fx(f);
    cx.strokeStyle="rgba(255,255,255,.05)"; cx.beginPath(); cx.moveTo(x,PAD.t); cx.lineTo(x,PAD.t+H()); cx.stroke();
    cx.fillStyle="#7c8ea6"; cx.font="9.5px Segoe UI,Arial";
    cx.fillText(f>=1000?(f/1000)+"k":String(f),x,PAD.t+H()+14);
  }

  for(var s=0;s<6;s++){
    if(!snaps[s]||!snapOn[s]) continue;
    cx.strokeStyle=SNAPCOL[s]; cx.lineWidth=1.4; cx.globalAlpha=.85; cx.beginPath();
    for(var b=0;b<NB;b++){ var x=fx(ISO[b]),y=fy(snaps[s][b]); b?cx.lineTo(x,y):cx.moveTo(x,y) }
    cx.stroke(); cx.globalAlpha=1;
  }

  var mode=$("mode").value;

  if(mode==="bars"||mode==="both"){
    for(var b=0;b<NB;b++){
      var x0=fx(ISO[b]/R6)+1, x1=fx(ISO[b]*R6)-1, bw=Math.max(2,x1-x0);
      var y=fy(disp[b]), hh=PAD.t+H()-y;
      if(hh>0){
        var g=cx.createLinearGradient(0,PAD.t,0,PAD.t+H());
        g.addColorStop(0,"#ff4d4d"); g.addColorStop(.25,"#facc15"); g.addColorStop(.6,"#22c55e"); g.addColorStop(1,"#0e7490");
        cx.fillStyle=g; cx.fillRect(x0,y,bw,hh);
      }
      var py=fy(peaks[b]);
      cx.fillStyle="#ffffff"; cx.fillRect(x0,py-1.5,bw,2);
    }
  }

  if(mode==="line"||mode==="both"){
    cx.beginPath();
    for(var b=0;b<NB;b++){ var x=fx(ISO[b]),y=fy(disp[b]); b?cx.lineTo(x,y):cx.moveTo(x,y) }
    cx.strokeStyle="#22d3ee"; cx.lineWidth=2.2; cx.shadowColor="#22d3ee"; cx.shadowBlur=9; cx.stroke(); cx.shadowBlur=0;
    for(var b=0;b<NB;b++){ cx.fillStyle="#a5f3fc"; cx.beginPath(); cx.arc(fx(ISO[b]),fy(disp[b]),1.8,0,7); cx.fill() }
  }

  if(cur.on && cur.x>PAD.l && cur.x<PAD.l+W()){
    cx.strokeStyle="rgba(250,204,21,.75)"; cx.setLineDash([4,3]); cx.lineWidth=1;
    cx.beginPath(); cx.moveTo(cur.x,PAD.t); cx.lineTo(cur.x,PAD.t+H()); cx.stroke();
    cx.beginPath(); cx.moveTo(PAD.l,cur.y); cx.lineTo(PAD.l+W(),cur.y); cx.stroke();
    cx.setLineDash([]);
  }

  cx.strokeStyle="#22314a"; cx.lineWidth=1; cx.strokeRect(PAD.l,PAD.t,W(),H());
}

/* ================= VONG LAP ================= */
function loop(){
  requestAnimationFrame(loop);
  if(!ac||!analyser) return;
  var total=DBMIN;
  if(!frozen){
    total=analyze();
    var spl=total+parseFloat($("cal").value);
    handleDetect(spl);
    var mi=0; for(var b=1;b<NB;b++) if(disp[b]>disp[mi]) mi=b;
    $("pk").textContent=fmtF(ISO[mi])+" / "+disp[mi].toFixed(1)+" dBFS";
    var best=null,bv=-999;
    for(var z=0;z<ZONES.length;z++){
      var Z=ZONES[z],s=0,c=0;
      for(var b=0;b<NB;b++) if(ISO[b]>=Z[1]&&ISO[b]<=Z[2]){ s+=Math.pow(10,disp[b]/10); c++ }
      var v=c?10*Math.log10(s/c):-999; if(v>bv){bv=v;best=Z[0]}
    }
    $("zn").textContent=best+" ("+bv.toFixed(1)+" dBFS)";
    $("lvl").textContent=total.toFixed(1)+" dBFS";
    $("spl").textContent=spl.toFixed(1)+" dB";
    loop.spl=spl;
  }
  draw(total,loop.spl||0);
}

/* ================= CON TRO ================= */
function ptr(e){
  var r=cv.getBoundingClientRect();
  var p=(e.touches&&e.touches[0])?e.touches[0]:e;
  cur.x=p.clientX-r.left; cur.y=p.clientY-r.top; cur.on=true;
  var f=xf(cur.x), db=yd(cur.y);
  if(f<20)f=20; if(f>20000)f=20000;
  $("cF").textContent=fmtF(f);
  $("cD").textContent=db.toFixed(1)+" dBFS";
  var mi=0,md=1e9;
  for(var b=0;b<NB;b++){ var d=Math.abs(Math.log(ISO[b]/f)); if(d<md){md=d;mi=b} }
  $("cB").textContent=fmtF(ISO[mi])+" → "+disp[mi].toFixed(1)+" dBFS";
}
cv.addEventListener("mousemove",ptr);
cv.addEventListener("touchstart",function(e){ptr(e);e.preventDefault()},{passive:false});
cv.addEventListener("touchmove",function(e){ptr(e);e.preventDefault()},{passive:false});
cv.addEventListener("mouseleave",function(){cur.on=false});

/* ================= SNAPSHOT ================= */
function buildSnaps(){
  var h="";
  for(var s=0;s<6;s++){
    h+='<div class="snap" style="border-left-color:'+SNAPCOL[s]+'">'+
       '<div class="nm" style="color:'+SNAPCOL[s]+'">DSP '+(s+1)+'</div>'+
       '<div class="st" id="ss'+s+'">Trống</div>'+
       '<div class="row"><button class="small cap" data-s="'+s+'">Lưu</button>'+
       '<button class="small vis" data-s="'+s+'">Ẩn/Hiện</button>'+
       '<button class="small clr" data-s="'+s+'">Xoá</button></div></div>';
  }
  $("snaps").innerHTML=h;
  var caps=document.querySelectorAll(".cap");
  for(var i=0;i<caps.length;i++) caps[i].onclick=function(){ capSnap(+this.getAttribute("data-s")) };
  var vs=document.querySelectorAll(".vis");
  for(var i=0;i<vs.length;i++) vs[i].onclick=function(){ var s=+this.getAttribute("data-s"); snapOn[s]=!snapOn[s]; updSnap(s) };
  var cs=document.querySelectorAll(".clr");
  for(var i=0;i<cs.length;i++) cs[i].onclick=function(){ var s=+this.getAttribute("data-s"); snaps[s]=null; updSnap(s) };
}
function capSnap(s){
  if(!ac){ alert("Hãy bật mic hoặc phát tín hiệu mô phỏng trước khi lưu snapshot."); return }
  snaps[s]=Array.prototype.slice.call(disp);
  snapOn[s]=true; updSnap(s);
}
function updSnap(s){
  var el=$("ss"+s);
  if(!snaps[s]){ el.textContent="Trống"; el.style.color="var(--dim)"; return }
  var t=new Date();
  el.textContent=(snapOn[s]?"Hiện":"Ẩn")+" · "+t.getHours()+":"+("0"+t.getMinutes()).slice(-2);
  el.style.color=snapOn[s]?SNAPCOL[s]:"var(--dim)";
}
buildSnaps();

$("btnClrAll").onclick=function(){ for(var s=0;s<6;s++){snaps[s]=null;updSnap(s)} };

$("btnPng").onclick=function(){
  var w=cv.clientWidth,h=cv.clientHeight,o=document.createElement("canvas");
  o.width=w*2; o.height=(h+56)*2;
  var g=o.getContext("2d"); g.setTransform(2,0,0,2,0,0);
  g.fillStyle="#080b11"; g.fillRect(0,0,w,h+56);
  g.fillStyle="#e8eef6"; g.font="700 14px Segoe UI,Arial";
  g.fillText("SoundTune Pro - RTA 31 band ISO",12,22);
  g.fillStyle="#8496ad"; g.font="11px Segoe UI,Arial";
  g.fillText(new Date().toLocaleString()+"  |  Speed: "+$("speed").options[$("speed").selectedIndex].text+"  |  NearField Sub: "+($("nf").checked?"ON":"OFF")+"  |  Nguong bao: "+$("thr").value+" dB",12,38);
  g.drawImage(cv,0,46,w,h);
  var x=12;
  for(var s=0;s<6;s++){ if(!snaps[s])continue;
    g.fillStyle=SNAPCOL[s]; g.fillRect(x,h+50,16,3);
    g.fillStyle="#cbd5e1"; g.font="10px Segoe UI,Arial"; g.fillText("DSP "+(s+1),x+20,h+54); x+=68;
  }
  var a=document.createElement("a");
  a.download="soundtune-rta-"+Date.now()+".png";
  a.href=o.toDataURL("image/png"); a.click();
};

/* ================= TEMPOSYNC ================= */
var taps=[];
function calcTempo(){
  var bpm=parseFloat($("bpm").value)||120;
  var beat=60000/bpm;
  var divs=[["1/1 (Whole)",4],["1/2 (Half)",2],["1/4 (Quarter)",1],["1/8 (Eighth)",0.5],["1/16 (Sixteenth)",0.25],["1/32",0.125]];
  var h="";
  for(var i=0;i<divs.length;i++){
    var ms=beat*divs[i][1];
    h+="<tr><td>"+divs[i][0]+"</td><td><b>"+ms.toFixed(1)+"</b></td><td>"+(ms*1.5).toFixed(1)+"</td><td>"+(ms*2/3).toFixed(1)+"</td><td>"+(1000/ms).toFixed(2)+"</td></tr>";
  }
  $("tempoBody").innerHTML=h;
  var mul=parseFloat($("rtMul").value);
  var rt60=beat*mul;
  var pre=beat*0.25;
  var r="";
  r+="<tr><td>Total Reverb Time (RT60)</td><td><b>"+rt60.toFixed(0)+" ms</b> ("+(rt60/1000).toFixed(2)+" s)</td></tr>";
  r+="<tr><td>Pre-Delay đề nghị</td><td><b>"+pre.toFixed(0)+" ms</b> (1/16 nốt)</td></tr>";
  r+="<tr><td>Echo Delay chuẩn (1/8)</td><td><b>"+(beat*0.5).toFixed(0)+" ms</b></td></tr>";
  r+="<tr><td>Echo Repeat / Feedback</td><td><b>"+(rt60>900?"25 - 30 %":"30 - 40 %")+"</b></td></tr>";
  r+="<tr><td>HF Damping</td><td><b>"+(rt60>1200?"6.3 kHz":"8 kHz")+"</b> (cắt đuôi vang cho sạch tiếng)</td></tr>";
  r+="<tr><td>Low Cut vang</td><td><b>160 - 200 Hz</b> (tránh ù đục)</td></tr>";
  r+="<tr><td>BPM đang dùng</td><td><b>"+bpm.toFixed(1)+"</b> · 1 phách = "+beat.toFixed(1)+" ms</td></tr>";
  $("revBody").innerHTML=r;
}
$("bpm").oninput=calcTempo; $("rtMul").onchange=calcTempo;
$("btnTap").onclick=function(){
  var t=Date.now();
  if(taps.length && t-taps[taps.length-1]>2600) taps=[];
  taps.push(t); if(taps.length>8) taps.shift();
  if(taps.length>=2){
    var sum=0; for(var i=1;i<taps.length;i++) sum+=taps[i]-taps[i-1];
    var avg=sum/(taps.length-1);
    var bpm=60000/avg;
    while(bpm<60) bpm*=2; while(bpm>200) bpm/=2;
    $("bpm").value=bpm.toFixed(1); calcTempo();
  }
  $("tapInfo").textContent=taps.length+" lần";
};
calcTempo();

/* ================= MO PHONG HU RIT ================= */
function simStart(f){
  ensureCtx(); simStop();
  simOsc=ac.createOscillator(); simOsc.type="sine"; simOsc.frequency.value=f;
  simGain=ac.createGain();
  simGain.gain.value=Math.pow(10,parseFloat($("simG").value)/20);
  simOsc.connect(simGain); simGain.connect(simBus);
  simOsc.start(); simFreq=f;
  if(!running){ $("stt").textContent="Chế độ mô phỏng"; $("stt").className="badge on" }
  var bs=document.querySelectorAll(".sim");
  for(var i=0;i<bs.length;i++) bs[i].className = (+bs[i].getAttribute("data-f")===f) ? "sim act" : "sim";
}
function simStop(){
  if(simOsc){ try{simOsc.stop()}catch(e){} try{simOsc.disconnect();simGain.disconnect()}catch(e){} simOsc=null;simGain=null;simFreq=0 }
  var bs=document.querySelectorAll(".sim");
  for(var i=0;i<bs.length;i++) bs[i].className="sim";
}
var simBtns=document.querySelectorAll(".sim");
for(var i=0;i<simBtns.length;i++) simBtns[i].onclick=function(){ simStart(+this.getAttribute("data-f")) };
$("btnSimStop").onclick=simStop;
$("simG").oninput=function(){
  $("simGV").textContent=this.value+" dB";
  if(simGain) simGain.gain.value=Math.pow(10,parseFloat(this.value)/20);
};
$("simSpk").onchange=function(){ if(spkGain) spkGain.gain.value=this.checked?0.25:0 };
$("btnVoice").onclick=function(){
  unlockTTS();
  ttsNote("Đang gửi lệnh đọc…");
  speak("Xin chào. Hệ thống kiểm tra âm thanh Sound Tune Pro đã sẵn sàng. Đang giám sát hú rít.");
};
if($("btnVoiceList")) $("btnVoiceList").onclick=function(){
  var vs=allVoices();
  if(!vs.length){ ttsNote("Máy chưa nạp được giọng nào. Hãy thử Chrome/Edge và tải lại trang.",true); return }
  var n=[]; for(var i=0;i<vs.length&&i<40;i++) n.push(vs[i].name+" ["+vs[i].lang+"]");
  ttsNote("Có "+vs.length+" giọng: "+n.join(" · "));
};
$("btnAlertDemo").onclick=function(){ showAlert({f:1730,peak:-22,prom:16.4,bw:145,Q:11.9},96.3) };
$("alertX").onclick=function(){ $("alert").style.display="none" };

/* ================= DIEU KHIEN ================= */
$("btnMic").onclick=startMic;
$("btnFreeze").onclick=function(){ frozen=!frozen; this.textContent=frozen?"Tiếp tục":"Tạm dừng"; this.className=frozen?"small act":"small" };
$("thr").oninput=function(){ $("thrV").textContent=parseFloat(this.value).toFixed(1)+" dB" };
$("cal").oninput=function(){ $("calV").textContent=this.value+" dB" };
$("speed").onchange=function(){
  cfg=SPEED[this.value];
  if(analyser){
    analyser.smoothingTimeConstant=cfg.sm;
    if(analyser.fftSize!==cfg.fft){ analyser.fftSize=cfg.fft; buildBins() }
    $("srate").textContent=Math.round(ac.sampleRate/1000)+" kHz · FFT "+analyser.fftSize;
  }
  for(var b=0;b<NB;b++){ peaks[b]=DBMIN; pAge[b]=0 }
  det.f=0; det.hits=0; det.hist.length=0;
};
var tabs=document.querySelectorAll(".tabs button");
for(var i=0;i<tabs.length;i++) tabs[i].onclick=function(){
  for(var j=0;j<tabs.length;j++){ tabs[j].className=""; $(tabs[j].getAttribute("data-t")).className="panel" }
  this.className="act"; $(this.getAttribute("data-t")).className="panel show";
};

/* Chip "Nghi hu" - chen bang JS de khong phai sua index.html */
(function(){
  var ro=document.querySelector(".readout");
  if(!ro || $("fbTop")) return;
  var s=document.createElement("span");
  s.className="chip";
  s.style.gridColumn="1/-1";
  s.innerHTML='<i>Nghi hú — 3 đỉnh nhô nhất so với nền phổ (dB)</i><b id="fbTop">—</b>';
  ro.appendChild(s);
})();

resize(); loop();
