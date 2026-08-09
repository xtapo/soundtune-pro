/* ================= VOCAL RANGE - DO TAM GIONG =================
   Y tuong lay tu vocalrangetest.org: tach "tam giong THOAI MAI" (not giu vung
   duoc ~2 giay) khoi "not CUC HAN" (dinh chop nhoang). Cao do do bang NSDF.
   Yeu cau app.js: ac, pAnal, pbuf, running, startMic, ensureCtx, speak. */

var NOTE_EN=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
var NOTE_VI=["\u0110\xf4","\u0110\xf4#","R\xea","R\xea#","Mi","Fa","Fa#","Sol","Sol#","La","La#","Si"];
var VTYPES=[["Nam tr\u1ea7m","Bass",40,64],["Nam trung","Baritone",45,69],["Nam cao","Tenor",48,72],["Ph\u1ea3n nam cao","Countertenor",55,76],["N\u1eef tr\u1ea7m","Alto / Contralto",53,74],["N\u1eef trung","Mezzo-soprano",57,81],["N\u1eef cao","Soprano",60,84]];
var VRK0=36,VRK1=84,vrRefT=null;
var VR={rec:false,t0:0,last:0,hold:2000,gate:-42,cLo:null,cHi:null,eLo:null,eHi:null,
        cand:null,candMs:0,gap:0,acc:{},trail:[],timer:null,ps:null,ref:null,refG:null};

function f2m(f){return 69+12*Math.log(f/440)/Math.LN2}
function m2f(m){return 440*Math.pow(2,(m-69)/12)}
function nName(m){var r=Math.round(m);return NOTE_EN[((r%12)+12)%12]+(Math.floor(r/12)-1)}
function nNameVi(m){var r=Math.round(m);return NOTE_VI[((r%12)+12)%12]+(Math.floor(r/12)-1)}
function sayNote(m){var r=Math.round(m);return NOTE_VI[((r%12)+12)%12]+" qu\u00e3ng "+(Math.floor(r/12)-1)}
function fmtS(s){return s.toFixed(1).replace(".",",")}
function isBlack(m){var i=((m%12)+12)%12;return i===1||i===3||i===6||i===8||i===10}
function parseNote(s){
  var q=/^([A-Ga-g])\s*([#b]?)\s*(-?\d{1,2})$/.exec((""+(s||"")).trim());
  if(!q)return null;
  var base={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[q[1].toUpperCase()];
  var acc=(q[2]==="#")?1:(q[2]==="b"?-1:0);
  return base+acc+(parseInt(q[3],10)+1)*12;
}

/* --- DRO CAO DO: NSDF autocorrelation --- */
function vrPitch(){
  if(!window.ac||!window.pAnal||!window.pbuf)return null;
  pAnal.getFloatTimeDomainData(pbuf);
  var n=pbuf.length,sr=ac.sampleRate,i;
  var mean=0;for(i=0;i<n;i++)mean+=pbuf[i];mean/=n;
  var en=0;for(i=0;i<n;i++){pbuf[i]-=mean;en+=pbuf[i]*pbuf[i]}
  var db=10*Math.log10(en/n+1e-12);
  if(db<VR.gate)return{db:db};
  var maxLag=Math.floor(sr/55),minLag=Math.max(2,Math.floor(sr/1200));
  var wl=Math.min(2048,n-maxLag);
  if(wl<400)return{db:db};
  if(!VR.ps||VR.ps.length!==n+1)VR.ps=new Float64Array(n+1);
  var ps=VR.ps;ps[0]=0;
  for(i=0;i<n;i++)ps[i+1]=ps[i]+pbuf[i]*pbuf[i];
  var e1=ps[wl],vals=[],lag,s,e2,v,bv=-2,bl=minLag,k;
  for(lag=minLag;lag<=maxLag;lag++){
    s=0;
    for(i=0;i<wl;i++)s+=pbuf[i]*pbuf[i+lag];
    e2=ps[lag+wl]-ps[lag];
    v=s/Math.sqrt(e1*e2+1e-12);
    vals.push(v);
    if(v>bv){bv=v;bl=lag}
  }
  if(bv<0.62)return{db:db};
  var pick=bl-minLag,th=bv*0.92;
  for(k=1;k<vals.length-1;k++){
    if(vals[k]>=th&&vals[k]>=vals[k-1]&&vals[k]>=vals[k+1]){pick=k;break}
  }
  var l=(pick>0)?vals[pick-1]:vals[pick],c=vals[pick],r=(pick<vals.length-1)?vals[pick+1]:vals[pick];
  var dd=l-2*c+r,off=0;
  if(dd<0){off=0.5*(l-r)/dd;if(!isFinite(off)||Math.abs(off)>1)off=0}
  var f=sr/((pick+minLag)+off);
  if(!(f>=50&&f<=1400))return{db:db};
  return{f:f,clar:c,db:db,m:f2m(f)};
}

function vrMark(kind,m){
  if(kind===0){
    if(VR.eLo===null||m<VR.eLo)VR.eLo=m;
    if(VR.eHi===null||m>VR.eHi)VR.eHi=m;
  }else{
    if(VR.cLo===null||m<VR.cLo)VR.cLo=m;
    if(VR.cHi===null||m>VR.cHi)VR.cHi=m;
  }
}
function vrScore(T){
  if(VR.cLo===null)return 0;
  var ov=Math.min(VR.cHi,T[3])-Math.max(VR.cLo,T[2]);
  var un=Math.max(VR.cHi,T[3])-Math.min(VR.cLo,T[2]);
  return un>0?Math.max(0,ov)/un:0;
}
function vrBestType(){
  if(VR.cLo===null)return null;
  var bt=null,bs=-1,i,s;
  for(i=0;i<VTYPES.length;i++){s=vrScore(VTYPES[i]);if(s>bs){bs=s;bt=VTYPES[i]}}
  return bt?{t:bt,s:bs}:null;
}

function vrResult(){
  var e;
  if(VR.cLo===null){
    e=$("vrComf");if(e)e.textContent="\u2014";
    e=$("vrComfSub");if(e)e.textContent="Gi\u1eef m\u1ed7i n\u1ed1t \u2265 "+fmtS(VR.hold/1000)+" s m\u1edbi \u0111\u01b0\u1ee3c t\xednh";
  }else{
    var st=Math.round(VR.cHi)-Math.round(VR.cLo);
    e=$("vrComf");if(e)e.textContent=nName(VR.cLo)+" \u2192 "+nName(VR.cHi);
    e=$("vrComfSub");if(e)e.textContent=st+" n\u1eeda cung \u2248 "+fmtS(st/12)+" qu\u00e3ng t\xe1m \xb7 "+nNameVi(VR.cLo)+" \u2192 "+nNameVi(VR.cHi);
  }
  e=$("vrExt");if(e)e.textContent=VR.eLo===null?"\u2014":nName(VR.eLo)+" \u2192 "+nName(VR.eHi);
  if(VR.eLo!==null){e=$("vrExtSub");if(e)e.textContent=m2f(VR.eLo).toFixed(1)+" Hz \u2192 "+m2f(VR.eHi).toFixed(1)+" Hz \xb7 ch\u1ec9 tham kh\u1ea3o";}
  var bk=null,bv=0,k;
  for(k in VR.acc){if(VR.acc[k]>bv){bv=VR.acc[k];bk=+k}}
  if(bk!==null){
    e=$("vrBest");if(e)e.textContent=nName(bk);
    e=$("vrBestSub");if(e)e.textContent="gi\u1eef t\u1ed5ng "+fmtS(bv/1000)+" s \xb7 "+m2f(bk).toFixed(1)+" Hz";
  }
  var rows="",i,sc,b=vrBestType();
  for(i=0;i<VTYPES.length;i++){
    sc=Math.round(vrScore(VTYPES[i])*100);
    rows+="<tr"+((b&&b.t===VTYPES[i])?' style="background:rgba(94,159,232,.12)"':"")+"><td>"+VTYPES[i][0]+" ("+VTYPES[i][1]+")</td><td>"+nName(VTYPES[i][2])+" \u2013 "+nName(VTYPES[i][3])+"</td><td><b>"+sc+" %</b></td></tr>";
  }
  e=$("vrTypeBody");if(e)e.innerHTML=rows;
  if(b){
    e=$("vrType");if(e)e.textContent=b.t[0];
    e=$("vrTypeSub");if(e)e.textContent=b.t[1]+" \xb7 kh\u1edbp "+Math.round(b.s*100)+" % \xb7 t\u1ea7m m\u1eabu "+nName(b.t[2])+"\u2013"+nName(b.t[3]);
    e=$("vrTypeBar");if(e)e.style.width=Math.round(b.s*100)+"%";
  }
}

function vrDrawKeys(nowM){
  var c=$("vrKeys");if(!c||!c.clientWidth)return;
  var g=c.getContext("2d"),w=c.clientWidth,h=c.clientHeight,m,i,j;
  g.clearRect(0,0,w,h);g.fillStyle="#0d131a";g.fillRect(0,0,w,h);
  var whites=[];for(m=VRK0;m<=VRK1;m++)if(!isBlack(m))whites.push(m);
  var pad=8,ww=(w-pad*2)/whites.length,top=22,kh=h-top-16;
  function tint(mm){
    if(VR.cLo!==null&&mm>=Math.round(VR.cLo)&&mm<=Math.round(VR.cHi))return 2;
    if(VR.eLo!==null&&mm>=Math.round(VR.eLo)&&mm<=Math.round(VR.eHi))return 1;
    return 0;
  }
  for(i=0;i<whites.length;i++){
    m=whites[i];var t=tint(m),x=pad+i*ww;
    g.fillStyle=t===2?"#72bc8f":t===1?"#eac26b":"#c8d3de";
    g.fillRect(x+0.5,top,ww-1,kh);
    g.strokeStyle="#0b0f14";g.lineWidth=1;g.strokeRect(x+0.5,top,ww-1,kh);
    if(nowM!==null&&nowM!==undefined&&Math.round(nowM)===m){g.strokeStyle="#5e9fe8";g.lineWidth=2.5;g.strokeRect(x+1.5,top+1,ww-3,kh-2)}
    if(((m%12)+12)%12===0){g.fillStyle="#9aa8b6";g.font="9.5px Segoe UI,Arial";g.textAlign="center";g.fillText(nName(m),x+ww/2,h-4)}
  }
  for(m=VRK0;m<=VRK1;m++){
    if(!isBlack(m))continue;
    j=-1;for(i=0;i<whites.length;i++)if(whites[i]===m-1){j=i;break}
    if(j<0)continue;
    var t2=tint(m),bw2=ww*0.62,bx=pad+(j+1)*ww-bw2/2,bh=kh*0.6;
    g.fillStyle=t2===2?"#2f6b4d":t2===1?"#8a6a24":"#101822";
    g.fillRect(bx,top,bw2,bh);
    g.strokeStyle="#0b0f14";g.lineWidth=1;g.strokeRect(bx,top,bw2,bh);
    if(nowM!==null&&nowM!==undefined&&Math.round(nowM)===m){g.strokeStyle="#5e9fe8";g.lineWidth=2.5;g.strokeRect(bx+1,top+1,bw2-2,bh-2)}
  }
  g.textAlign="left";g.font="10px Segoe UI,Arial";
  g.fillStyle="#72bc8f";g.fillRect(pad,9,11,3);g.fillText("Tho\u1ea3i m\u00e1i",pad+16,13);
  g.fillStyle="#eac26b";g.fillRect(pad+88,9,11,3);g.fillText("C\u1ef1c h\u1ea1n",pad+104,13);
  g.fillStyle="#9aa8b6";g.fillText("B\u00e0n ph\xedm C2 \u2192 C6",Math.max(pad+170,w-pad-96),13);
}

function vrDrawTrack(nowM){
  var c=$("vrTrack");if(!c||!c.clientWidth)return;
  var g=c.getContext("2d"),w=c.clientWidth,h=c.clientHeight,i,m;
  g.clearRect(0,0,w,h);g.fillStyle="#0d131a";g.fillRect(0,0,w,h);
  var pl=36,pr=10,pt=10,pb=18,lo=VRK0,hi=VRK1,win=20000,now=Date.now(),t0=now-win;
  function X(t){return pl+(t-t0)/win*(w-pl-pr)}
  function Y(mm){if(mm<lo)mm=lo;if(mm>hi)mm=hi;return pt+(hi-mm)/(hi-lo)*(h-pt-pb)}
  if(VR.cLo!==null){g.fillStyle="rgba(114,188,143,.13)";g.fillRect(pl,Y(VR.cHi),w-pl-pr,Y(VR.cLo)-Y(VR.cHi))}
  g.font="9.5px Segoe UI,Arial";g.textAlign="right";
  for(m=Math.ceil(lo/12)*12;m<=hi;m+=12){
    var y=Y(m);
    g.strokeStyle="rgba(255,255,255,.07)";g.beginPath();g.moveTo(pl,y);g.lineTo(w-pr,y);g.stroke();
    g.fillStyle="#7c8ea6";g.fillText(nName(m),pl-5,y+3.5);
  }
  g.lineWidth=2;g.strokeStyle="#5e9fe8";g.beginPath();
  var pen=false,p;
  for(i=0;i<VR.trail.length;i++){
    p=VR.trail[i];
    if(p[0]<t0)continue;
    if(p[1]===null){pen=false;continue}
    if(!pen){g.moveTo(X(p[0]),Y(p[1]));pen=true}else g.lineTo(X(p[0]),Y(p[1]));
  }
  g.stroke();
  if(nowM!==null&&nowM!==undefined){g.fillStyle="#bcdcff";g.beginPath();g.arc(X(now),Y(nowM),3.2,0,7);g.fill()}
  g.strokeStyle="#26313d";g.lineWidth=1;g.strokeRect(pl,pt,w-pl-pr,h-pt-pb);
  g.textAlign="left";g.fillStyle="#7c8ea6";g.fillText("Cao \u0111\u1ed9 theo th\u1eddi gian \u2014 20 s g\u1ea7n nh\u1ea5t",pl+6,h-5);
}

function vrTick(){
  if(!window.ac||!window.pAnal)return;
  var now=Date.now(),dt=Math.min(250,now-(VR.last||now));
  VR.last=now;
  var p=vrPitch(),good=!!(p&&p.f&&p.clar>=0.7),ct,e;
  if(good){
    e=$("vrNow");if(e)e.textContent=nName(p.m)+" \xb7 "+p.f.toFixed(1)+" Hz";
    ct=Math.round((p.m-Math.round(p.m))*100);
    e=$("vrCents");if(e)e.textContent=(ct>0?"+":"")+ct+" cent";
    e=$("vrClar");if(e)e.textContent=Math.round(p.clar*100)+" %";
  }else{
    e=$("vrNow");if(e)e.textContent="\u2014";
    e=$("vrCents");if(e)e.textContent="\u2014";
    e=$("vrClar");if(e)e.textContent=(p&&p.db!==undefined)?("nh\u1ecf \xb7 "+p.db.toFixed(0)+" dB"):"\u2014";
  }
  if(VR.rec){
    e=$("vrTime");if(e)e.textContent=fmtS((now-VR.t0)/1000)+" s";
    if(good){
      VR.trail.push([now,p.m]);
      var key=Math.round(p.m);
      VR.acc[key]=(VR.acc[key]||0)+dt;
      if(VR.cand!==null&&Math.abs(p.m-VR.cand)<=0.75){VR.cand+=(p.m-VR.cand)*0.3;VR.candMs+=dt}
      else{VR.cand=p.m;VR.candMs=dt}
      VR.gap=0;
      if(VR.candMs>=180)vrMark(0,VR.cand);
      if(VR.candMs>=VR.hold)vrMark(1,VR.cand);
      e=$("vrHoldNow");if(e)e.textContent=nName(VR.cand)+" \xb7 "+fmtS(VR.candMs/1000)+" s"+(VR.candMs>=VR.hold?" \u2713":"");
    }else{
      VR.trail.push([now,null]);
      VR.gap+=dt;
      if(VR.gap>260){VR.cand=null;VR.candMs=0;e=$("vrHoldNow");if(e)e.textContent="\u2014"}
    }
    if(VR.trail.length>2400)VR.trail.splice(0,VR.trail.length-2400);
    vrResult();
  }else if(good){
    VR.trail.push([now,p.m]);
    if(VR.trail.length>600)VR.trail.splice(0,VR.trail.length-600);
  }
  vrDrawKeys(good?p.m:null);vrDrawTrack(good?p.m:null);
}

function vrSize(){
  var dpr=window.devicePixelRatio||1,ids=["vrKeys","vrTrack"],i,c;
  for(i=0;i<ids.length;i++){
    c=$(ids[i]);if(!c||!c.clientWidth)continue;
    c.width=Math.round(c.clientWidth*dpr);c.height=Math.round(c.clientHeight*dpr);
    c.getContext("2d").setTransform(dpr,0,0,dpr,0,0);
  }
}
function vrStartLive(){if(!VR.timer){VR.last=Date.now();VR.timer=setInterval(vrTick,60)}}
function vrStopLive(){if(VR.timer&&!VR.rec){clearInterval(VR.timer);VR.timer=null}}
function vrTabSync(t){
  if(t==="p5"){vrSize();vrDrawKeys(null);vrDrawTrack(null);vrStartLive()}
  else vrStopLive();
}
window.addEventListener("resize",function(){vrSize();vrDrawKeys(null);vrDrawTrack(null)});

function vrText(){
  var b=vrBestType(),s="SoundTune Pro \u2014 Vocal Range Test\n";
  s+="Th\u1eddi \u0111i\u1ec3m: "+new Date().toLocaleString()+"\n";
  s+="T\u1ea7m tho\u1ea3i m\u00e1i: "+(VR.cLo===null?"\u2014":nName(VR.cLo)+" \u2192 "+nName(VR.cHi)+" ("+(Math.round(VR.cHi)-Math.round(VR.cLo))+" n\u1eeda cung)")+"\n";
  s+="N\u1ed1t c\u1ef1c h\u1ea1n: "+(VR.eLo===null?"\u2014":nName(VR.eLo)+" \u2192 "+nName(VR.eHi))+"\n";
  s+="Lo\u1ea1i gi\u1ecdng: "+(b?b.t[0]+" ("+b.t[1]+") \u2014 kh\u1edbp "+Math.round(b.s*100)+" %":"\u2014")+"\n";
  s+="Ng\u01b0\u1ee1ng gi\u1eef n\u1ed1t: "+fmtS(VR.hold/1000)+" s";
  return s;
}
function vrSpeak(){
  if(!$("vrTts")||!$("vrTts").checked)return;
  if(typeof speak!=="function")return;
  if(VR.cLo===null){speak("Ch\u01b0a ghi \u0111\u01b0\u1ee3c n\u1ed1t n\u00e0o gi\u1eef \u0111\u1ee7 l\u00e2u. H\u00e3y h\u00e1t to h\u01a1n v\u00e0 gi\u1eef n\u1ed1t l\u00e2u h\u01a1n.");return}
  var b=vrBestType();
  speak("K\u1ebft qu\u1ea3 \u0111o t\u1ea7m gi\u1ecdng. V\u00f9ng tho\u1ea3i m\u00e1i t\u1eeb "+sayNote(VR.cLo)+" \u0111\u1ebfn "+sayNote(VR.cHi)+", r\u1ed9ng "+(Math.round(VR.cHi)-Math.round(VR.cLo))+" n\u1eeda cung. Lo\u1ea1i gi\u1ecdng g\u1ea7n nh\u1ea5t: "+(b?b.t[0]:"ch\u01b0a r\xf5")+".");
}
function vrRefStop(){
  if(VR.ref){try{VR.ref.stop()}catch(e){}try{VR.ref.disconnect();VR.refG.disconnect()}catch(e){}VR.ref=null;VR.refG=null}
  clearTimeout(vrRefT);vrRefT=null;
}

(function initVR(){
  var e;
  e=$("vrGate");if(e)e.oninput=function(){VR.gate=parseFloat(this.value);var v=$("vrGateV");if(v)v.textContent=this.value+" dB"};
  e=$("vrHold");if(e)e.onchange=function(){VR.hold=parseFloat(this.value);vrResult()};
  e=$("vrRec");if(e)e.onclick=function(){
    if(!VR.rec){
      if(typeof ensureCtx==="function")ensureCtx();
      if(typeof running!=="undefined"&&!running&&typeof startMic==="function")startMic();
      VR.rec=true;VR.t0=Date.now();VR.last=Date.now();VR.cand=null;VR.candMs=0;VR.gap=0;
      this.textContent="D\u1eebng & xem k\u1ebft qu\u1ea3";this.className="danger";
      vrStartLive();
    }else{
      VR.rec=false;
      this.textContent="\u0110o ti\u1ebfp";this.className="primary";
      vrResult();vrSpeak();
    }
  };
  e=$("vrReset");if(e)e.onclick=function(){
    VR.cLo=null;VR.cHi=null;VR.eLo=null;VR.eHi=null;
    VR.cand=null;VR.candMs=0;VR.gap=0;VR.acc={};VR.trail=[];VR.t0=Date.now();
    var v;
    v=$("vrTime");if(v)v.textContent="0,0 s";
    v=$("vrHoldNow");if(v)v.textContent="\u2014";
    v=$("vrType");if(v)v.textContent="\u2014";
    v=$("vrTypeSub");if(v)v.textContent="\u2014";
    v=$("vrTypeBar");if(v)v.style.width="0%";
    v=$("vrBest");if(v)v.textContent="\u2014";
    v=$("vrKeyOut");if(v)v.textContent="\u2014";
    vrResult();vrDrawKeys(null);vrDrawTrack(null);
  };
  e=$("vrKeyCalc");if(e)e.onclick=function(){
    var inp=$("vrSongTop");if(!inp)return;
    var m=parseNote(inp.value),o=$("vrKeyOut");if(!o)return;
    if(m===null){o.textContent="N\u1ed1t kh\xf4ng h\u1ee3p l\u1ec7 (v\xed d\u1ee5 A4, C#5, Bb3)";return}
    if(VR.cHi===null){o.textContent="H\u00e3y \u0111o t\u1ea7m gi\u1ecdng tr\u01b0\u1edbc";return}
    var safe=Math.round(VR.cHi)-1,d=safe-Math.round(m);
    if(d>=0)o.textContent="H\u00e1t nguy\xean t\xf4ng \u0111\u01b0\u1ee3c \xb7 c\xf2n d\u01b0 "+d+" n\u1eeda cung (tr\u1ea7n an to\u00e0n "+nName(safe)+")";
    else o.textContent="H\u1ea1 "+Math.abs(d)+" n\u1eeda cung (key "+d+") \u2192 n\u1ed1t cao nh\u1ea5t c\xf2n "+nName(m+d);
  };
  e=$("vrRefPlay");if(e)e.onclick=function(){
    var inp=$("vrRefNote");if(!inp)return;
    var m=parseNote(inp.value);
    if(m===null){alert("N\u1ed1t m\u1eabu kh\xf4ng h\u1ee3p l\u1ec7. V\xed d\u1ee5: C4, A3, F#4");return}
    if(typeof ensureCtx==="function")ensureCtx();vrRefStop();
    VR.ref=ac.createOscillator();VR.ref.type="triangle";VR.ref.frequency.value=m2f(m);
    VR.refG=ac.createGain();
    VR.refG.gain.setValueAtTime(0.0001,ac.currentTime);
    VR.refG.gain.exponentialRampToValueAtTime(0.13,ac.currentTime+0.03);
    VR.ref.connect(VR.refG);VR.refG.connect(ac.destination);
    VR.ref.start();
    vrRefT=setTimeout(vrRefStop,2200);
  };
  e=$("vrRefStop");if(e)e.onclick=vrRefStop;
  e=$("vrCopy");if(e)e.onclick=function(){
    var s=vrText();
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(s).then(function(){alert("\u0110\u00e3 copy k\u1ebft qu\u1ea3 v\u00e0o clipboard.")},function(){prompt("Copy th\u1ee7 c\xf4ng:",s)});
    }else prompt("Copy th\u1ee7 c\xf4ng:",s);
  };
  e=$("vrPng");if(e)e.onclick=function(){
    var k=$("vrKeys");
    if(!k||!k.clientWidth){alert("H\u00e3y m\u1edf tab Vocal Range tr\u01b0\u1edbc khi xu\u1ea5t \u1ea3nh.");return}
    var w=Math.max(680,k.clientWidth),kh=k.clientHeight,h=kh+126;
    var o=document.createElement("canvas");o.width=w*2;o.height=h*2;
    var g=o.getContext("2d");g.setTransform(2,0,0,2,0,0);
    g.fillStyle="#0b0f14";g.fillRect(0,0,w,h);
    g.fillStyle="#f3f6f9";g.font="700 15px Segoe UI,Arial";g.fillText("SoundTune Pro - Vocal Range Test",14,24);
    g.fillStyle="#9aa8b6";g.font="11px Segoe UI,Arial";g.fillText(new Date().toLocaleString(),14,42);
    var b=vrBestType();
    g.font="700 13px Segoe UI,Arial";
    g.fillStyle="#8fd3ae";g.fillText("Comfortable: "+(VR.cLo===null?"-":nName(VR.cLo)+" - "+nName(VR.cHi)),14,66);
    g.fillStyle="#eac26b";g.fillText("Extreme: "+(VR.eLo===null?"-":nName(VR.eLo)+" - "+nName(VR.eHi)),14,84);
    g.fillStyle="#bcdcff";g.fillText("Voice type: "+(b?b.t[1]+" ("+Math.round(b.s*100)+"%)":"-"),14,102);
    g.drawImage(k,14,112,w-28,kh);
    var a=document.createElement("a");
    a.download="soundtune-vocal-range-"+Date.now()+".png";
    a.href=o.toDataURL("image/png");a.click();
  };
  var gv=$("vrGate");if(gv){VR.gate=parseFloat(gv.value);var gl=$("vrGateV");if(gl)gl.textContent=gv.value+" dB"}
  var hv=$("vrHold");if(hv)VR.hold=parseFloat(hv.value);
  vrResult();
})();
