/* SoundTune Pro - lab.js
   Đo phòng thật: RT60 theo dải · Kiểm tra pha / đảo cực · Căn trễ (delay) */
(function(){
"use strict";
if(!document.getElementById("rta")) return;
var E=function(id){return document.getElementById(id)};
var SP=343; /* m/s */

/* ================= TAB MỚI ================= */
var css=document.createElement("style");
css.textContent=
"#p5 .sec{border-top:1px solid var(--line);margin-top:16px;padding-top:14px}"+
"#p5 .sec:first-of-type{border-top:0;margin-top:0;padding-top:0}"+
"#p5 h4{margin:0 0 6px;font-size:13.5px;color:#e8eef6}"+
"#p5 .lead{color:var(--dim);font-size:12px;line-height:1.6;margin-bottom:10px}"+
"#p5 .ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}"+
"#p5 .res{margin-top:11px;background:#0d1826;border:1px solid var(--line);border-radius:10px;padding:10px 11px;font-size:12.5px;line-height:1.62;display:none}"+
"#p5 .res.on{display:block}"+
"#p5 .res b{color:var(--acc)}"+
"#p5 .big{font-size:24px;font-weight:800;color:#a5f3fc;font-variant-numeric:tabular-nums}"+
"#p5 .ok{color:#86efac;font-weight:700}#p5 .bad{color:#fca5a5;font-weight:700}#p5 .mid{color:#fde68a;font-weight:700}"+
"#labS{margin-top:10px;font-size:12.5px;min-height:17px;color:#7dd3fc;font-weight:600}"+
"#p5 .slot{background:#0d1826;border:1px solid var(--line);border-radius:10px;padding:9px 10px}"+
"#p5 .slot input[type=text]{font-family:inherit;font-size:12.5px;color:var(--txt);background:#0a121d;border:1px solid var(--line);border-radius:8px;padding:6px 8px;width:100%;margin-bottom:7px}"+
"#p5 .slot .v{font-size:12.5px;color:var(--dim);min-height:34px}"+
"#p5 .g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:9px;margin-top:9px}"+
"#p5 .barw{height:9px;background:#0a121d;border:1px solid var(--line);border-radius:999px;overflow:hidden;margin-top:9px}"+
"#p5 .barw i{display:block;height:100%;width:0;background:linear-gradient(90deg,#0891b2,#22d3ee)}";
document.head.appendChild(css);

var html=
'<h3>Đo phòng thật — RT60 · Pha · Delay</h3>'+
'<div class="hint" style="margin:0 0 12px">Ba phép đo này dùng loại tín hiệu thật phát ra dàn rồi thu lại bằng micro, không phải tính nhẩm theo nhịp. Cần: đã <b>BẬT MIC</b>, điện thoại/laptop đã cắm vào dàn (hoặc để trước loa ~1 m), phòng im lặng trong lúc đo.</div>'+

'<div class="sec">'+
'<h4>6. Đo RT60 thật (thời gian vang của phòng)</h4>'+
'<div class="lead">Máy phát dải nhiễu hồng ~1.8 giây rồi <b>tắt đột ngột</b>, sau đó đo tốc độ tắt năng lượng theo từng dải (phương pháp noise-cut, ISO 3382: lấy T20/T15 rồi quy đổi ra RT60).</div>'+
'<div class="ctl">'+
'<button id="rtGo" class="primary">▶ ĐO RT60 (≈ 6 giây)</button>'+
'<div class="fld"><label>Mức phát</label><input type="range" id="rtLv" min="10" max="90" step="5" value="45"><span class="val" id="rtLvV">45 %</span></div>'+
'</div>'+
'<div class="barw"><i id="rtBar"></i></div>'+
'<div class="res" id="rtRes"></div>'+
'</div>'+

'<div class="sec">'+
'<h4>7. Kiểm tra pha / đảo cực loa</h4>'+
'<div class="lead">Máy phát 6 xung nửa hình sin <b>dương</b> rồi đo dấu của xung thu được. Đo lần lượt <b>từng loa một</b> (tắt loa còn lại), đặt micro <b>y nguyên một chỗ</b> cho cả hai lần. Hai loa cho ra dấu ngược nhau = một loa đấu ngược cực.</div>'+
'<div class="ctl"><div class="fld"><label>Dải đo</label><select id="phB"><option value="full">Loa full / treble (100–900 Hz)</option><option value="sub">Sub / bass (40–140 Hz)</option></select></div></div>'+
'<div class="g2">'+
'<div class="slot"><input type="text" id="phNA" value="Loa trái"><button id="phA">Đo loa này</button><div class="v" id="phVA">Chưa đo</div></div>'+
'<div class="slot"><input type="text" id="phNB" value="Loa phải"><button id="phB2">Đo loa này</button><div class="v" id="phVB">Chưa đo</div></div>'+
'</div>'+
'<div class="res" id="phRes"></div>'+
'</div>'+

'<div class="sec">'+
'<h4>8. Căn trễ (delay) giữa sub – loa full, loa chính – loa phụ</h4>'+
'<div class="lead">Mỗi nguồn phát một xung ngắn, máy dùng <b>tương quan chéo</b> tìm đúng thời điểm xung tới, rồi so hai lần đo để ra độ lệch thời gian. Đo từng nguồn một, micro <b>không được dịch chỗ</b> giữa hai lần đo.</div>'+
'<div class="ctl"><div class="fld"><label>Loại nguồn</label><select id="dlB"><option value="full">Loa full / loa phụ (xung dải rộng)</option><option value="sub">Sub (xung 80 Hz)</option></select></div></div>'+
'<div class="g2">'+
'<div class="slot"><input type="text" id="dlNA" value="Loa chính (full)"><button id="dlA">Đo nguồn này</button><div class="v" id="dlVA">Chưa đo</div></div>'+
'<div class="slot"><input type="text" id="dlNB" value="Sub / loa phụ"><button id="dlB2">Đo nguồn này</button><div class="v" id="dlVB">Chưa đo</div></div>'+
'</div>'+
'<div class="res" id="dlRes"></div>'+
'</div>'+

'<div id="labS"></div>'+
'<div class="ctl" style="margin-top:10px"><button id="labNote">📋 Ghi kết quả vào hồ sơ</button></div>'+
'<div class="hint">Mẹo: đo RT60 và pha khi phòng đóng cửa, không ai nói chuyện. Nếu máy báo “không đủ dải động”, tăng mức phát hoặc đưa điện thoại gần loa hơn. Để nguyên một vị trí micro cho mọi phép đo so sánh.</div>';

var tabs=document.querySelector(".tabs");
var btn=document.createElement("button");
btn.setAttribute("data-t","p5"); btn.textContent="Đo phòng thật (RT60 · Pha · Delay)";
tabs.appendChild(btn);
var pan=document.createElement("div");
pan.id="p5"; pan.className="panel"; pan.innerHTML=html;
var anchor=document.querySelector("a.swBig");
anchor.parentNode.insertBefore(pan,anchor);

tabs.addEventListener("click",function(e){
  var b=e.target; while(b&&b.tagName!=="BUTTON") b=b.parentNode;
  if(!b||!b.getAttribute||!b.getAttribute("data-t")) return;
  var all=tabs.querySelectorAll("button");
  for(var i=0;i<all.length;i++){
    var on=all[i]===b, pe=E(all[i].getAttribute("data-t"));
    all[i].className=on?"act":"";
    if(pe) pe.className=on?"panel show":"panel";
  }
});

E("rtLv").oninput=function(){ E("rtLvV").textContent=this.value+" %" };

/* ================= TIỆN ÍCH ================= */
function note(m,bad){ var e=E("labS"); e.textContent=m||""; e.style.color=bad?"#fca5a5":"#7dd3fc" }
function busy(on){
  var ids=["rtGo","phA","phB2","dlA","dlB2"];
  for(var i=0;i<ids.length;i++) if(E(ids[i])) E(ids[i]).disabled=!!on;
}
function micOK(){
  if(typeof micSrc==="undefined"||!micSrc){ note("Chưa bật micro. Hãy bấm BẬT MIC ở đầu trang rồi đo lại.",1); return false }
  try{ ensureCtx() }catch(e){}
  return true;
}
function fmtS(s){ return s>=1 ? s.toFixed(2)+" s" : Math.round(s*1000)+" ms" }

/* Thu âm thô từ micro bằng ScriptProcessor */
function record(secs,onTick){
  return new Promise(function(res){
    var sr=ac.sampleRate, need=Math.ceil(sr*secs);
    var data=new Float32Array(need), pos=0, fin=false;
    var sp = ac.createScriptProcessor ? ac.createScriptProcessor(2048,1,1) : ac.createJavaScriptNode(2048,1,1);
    var mute=ac.createGain(); mute.gain.value=0;
    try{ micSrc.connect(sp) }catch(e){}
    sp.connect(mute); mute.connect(ac.destination);
    var t0=ac.currentTime;
    function stop(){
      if(fin) return; fin=true;
      try{ sp.onaudioprocess=null; micSrc.disconnect(sp); sp.disconnect(); mute.disconnect() }catch(e){}
      res({d:data,n:pos,sr:sr,t0:t0});
    }
    sp.onaudioprocess=function(e){
      var inp=e.inputBuffer.getChannelData(0), i;
      for(i=0;i<inp.length;i++){ if(pos<need) data[pos++]=inp[i] }
      if(onTick) onTick(pos/need);
      if(pos>=need) stop();
    };
    setTimeout(stop,secs*1000+1200);
  });
}

/* Lọc dải offline (2 tầng bandpass) */
function bandpass(x,n,f,Q,stages){
  return new Promise(function(res){
    var sr=ac.sampleRate;
    var OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    if(!OC||n<64){ res(x); return }
    var oc=new OC(1,n,sr);
    var b=oc.createBuffer(1,n,sr);
    if(b.copyToChannel) b.copyToChannel(x.subarray?x.subarray(0,n):x,0); else b.getChannelData(0).set(x.subarray(0,n));
    var s=oc.createBufferSource(); s.buffer=b;
    var node=s, k=stages||2;
    for(var i=0;i<k;i++){
      var f1=oc.createBiquadFilter(); f1.type="bandpass"; f1.frequency.value=f; f1.Q.value=Q;
      node.connect(f1); node=f1;
    }
    node.connect(oc.destination); s.start();
    var done=function(bb){ res(bb.getChannelData(0)) };
    try{
      var p=oc.startRendering();
      if(p&&p.then) p.then(done); else oc.oncomplete=function(ev){ done(ev.renderedBuffer) };
    }catch(e){ oc.oncomplete=function(ev){ done(ev.renderedBuffer) } }
  });
}

/* Đường bao năng lượng (dB) */
function envelope(x,n,sr){
  var win=Math.round(sr*0.02), hop=Math.round(sr*0.005);
  var t=[],db=[],i,j;
  for(i=0;i+win<=n;i+=hop){
    var s=0; for(j=i;j<i+win;j++) s+=x[j]*x[j];
    db.push(10*Math.log10(s/win+1e-20)); t.push(i/sr);
  }
  return {t:t,db:db};
}

/* ================= 6. RT60 ================= */
var RT_BANDS=[63,125,250,500,1000,2000,4000];

function pinkBuffer(secs){
  var sr=ac.sampleRate, len=Math.ceil(sr*secs), b=ac.createBuffer(1,len,sr), d=b.getChannelData(0);
  var b0=0,b1=0,b2=0,i;
  for(i=0;i<len;i++){
    var w=Math.random()*2-1;
    b0=0.99765*b0+w*0.0990460; b1=0.96300*b1+w*0.2965164; b2=0.57000*b2+w*1.0526913;
    d[i]=(b0+b1+b2+w*0.1848)*0.24;
  }
  return b;
}

/* Tìm thời điểm tắt tiếng.

   Cách cũ (chọn đoạn 60 ms tụt mạnh nhất) SAI: đường tắt của phòng gần như là
   một đường thẳng đều theo dB, nên mọi điểm trong cả đoạn đang tụt đều tụt
   bằng nhau. Chỉ cần nhiễu 0,2 dB là bắt nhầm chỗ, rồi decay() lấy mức chuẩn
   ngay trong đoạn đang tụt, làm RT60 đo ra ngắn hơn thật (phòng 0,6 s báo
   0,37 s — sai 38 %).

   Cách mới: lấy mức ổn định lúc còn phát (plat) và nền im sau khi tắt (flo)
   theo phân vị, rồi dò ngược từ cuối về đầu để tìm khung cuối cùng còn nằm ở
   mức ổn định — đó chính là mép tắt tiếng. Bắt buộc 300 ms sau đó phải tụt
   thật sự, để không bắt nhầm một tiếng động lạ giữa đuôi vang. */
function findCut(e){
  var db=e.db, t=e.t, n=db.length, i, j;
  if(n<80) return {i:-1,drop:0};
  var srt=[]; for(i=0;i<n;i++) srt.push(db[i]);
  srt.sort(function(a,b){return b-a});
  var plat=srt[Math.floor(n*0.10)];
  var flo=srt[n-1-Math.floor(n*0.05)];
  var span=plat-flo;
  if(span<6) return {i:-1,drop:span};
  var need=Math.min(6,span*0.5);
  var dt=(t[1]-t[0])||0.005;
  var K=8, F=Math.max(8,Math.round(0.3/dt));
  for(i=n-1-F;i>=12;i--){
    if(t[i]<0.9) break;
    if(db[i]<plat-1.5) continue;
    var ok=1;
    for(j=i+1;j<=i+K;j++){ if(db[j]>plat-1.5){ ok=0; break } }
    if(!ok) continue;
    if(db[i+F]>plat-need) continue;
    return {i:Math.min(n-1,i+1), drop:span};
  }
  return {i:-1,drop:span};
}

function decay(e,ci){
  var i,l0=0,c=0;
  for(i=Math.max(0,ci-44);i<ci-4;i++){ l0+=e.db[i]; c++ }
  l0=c?l0/c:-100;
  var nf=0,c2=0;
  for(i=Math.max(0,e.db.length-50);i<e.db.length;i++){ nf+=e.db[i]; c2++ }
  nf=c2?nf/c2:-100;
  var dyn=l0-nf;
  function tAt(drop){
    var lim=l0-drop;
    for(var k=ci;k<e.db.length;k++){
      if(e.db[k]<=lim){
        if(k>ci){
          var d0=e.db[k-1], d1=e.db[k];
          if(d0>d1){ var fr=(d0-lim)/(d0-d1); return e.t[k-1]+fr*(e.t[k]-e.t[k-1]) }
        }
        return e.t[k];
      }
    }
    return -1;
  }
  var t5=tAt(5), r=null;
  if(t5>=0){
    var t25=tAt(25), t20=tAt(20), t15=tAt(15);
    if(dyn>=33 && t25>t5) r={rt:(t25-t5)*3,kind:"T20"};
    else if(dyn>=28 && t20>t5) r={rt:(t20-t5)*4,kind:"T15"};
    else if(dyn>=19 && t15>t5) r={rt:(t15-t5)*6,kind:"T10"};
  }
  if(r){ r.dyn=dyn; r.l0=l0 }
  return r;
}

var LAST={rt:null,rtMid:0,pol:{},dly:{}};

function runRT(){
  if(!micOK()) return;
  busy(1); note("Đang phát dải nhiễu… giữ im lặng, đừng chỉnh núm.");
  var wasFrozen = (typeof frozen!=="undefined") && frozen;
  try{ frozen=true }catch(e){}
  var lv=parseInt(E("rtLv").value,10)/100;
  var pre=0.45, hold=1.8, tail=2.8, total=pre+hold+tail;
  var bar=E("rtBar");
  var recP=record(total+0.35,function(p){ bar.style.width=Math.round(p*100)+"%" });
  var t=ac.currentTime+0.15;
  var src=ac.createBufferSource(); src.buffer=pinkBuffer(pre+hold+0.3);
  var gn=ac.createGain(); gn.gain.value=0;
  src.connect(gn); gn.connect(ac.destination);
  gn.gain.setValueAtTime(0,t);
  gn.gain.linearRampToValueAtTime(lv,t+0.18);
  gn.gain.setValueAtTime(lv,t+pre+hold-0.002);
  gn.gain.linearRampToValueAtTime(0,t+pre+hold);
  src.start(t); try{ src.stop(t+pre+hold+0.06) }catch(e){}

  recP.then(function(R){
    bar.style.width="0%";
    try{ frozen=wasFrozen }catch(e){}
    if(R.n<R.sr*1.5){ busy(0); note("Không thu được đủ dữ liệu từ micro. Thử lại.",1); return }
    note("Đang tính RT60 theo từng dải…");
    var wide=envelope(R.d,R.n,R.sr);
    var cut=findCut(wide);
    if(cut.i<0 || cut.drop<6){
      busy(0);
      note("Không nhận ra thời điểm tắt tiếng. Hãy tăng mức phát, để máy gần loa hơn và giữ phòng im lặng.",1);
      return;
    }
    var out=[],k=0;
    (function nextBand(){
      if(k>=RT_BANDS.length){ showRT(out,cut); return }
      var f=RT_BANDS[k++];
      bandpass(R.d,R.n,f,1.6,2).then(function(y){
        var e=envelope(y,R.n,R.sr);
        var ci=cut.i; if(ci>=e.db.length-10) ci=e.db.length-11;
        var r=decay(e,ci);
        out.push({f:f,r:r});
        note("Đang tính dải "+f+" Hz…");
        setTimeout(nextBand,0);
      });
    })();
  });
}

function showRT(out,cut){
  busy(0); note("");
  var h='<div style="margin-bottom:8px">Kết quả đo lúc '+new Date().toLocaleTimeString()+' · dải động thu được <b>'+cut.drop.toFixed(1)+' dB</b></div>';
  h+='<table><thead><tr><th>Dải</th><th>RT60</th><th>Cách tính</th><th>Dải động</th></tr></thead><tbody>';
  var mid=[],bass=[],i;
  for(i=0;i<out.length;i++){
    var o=out[i];
    if(o.r){
      h+="<tr><td>"+(o.f>=1000?(o.f/1000)+" kHz":o.f+" Hz")+"</td><td><b>"+o.r.rt.toFixed(2)+" s</b></td><td>"+o.r.kind+"</td><td>"+o.r.dyn.toFixed(0)+" dB</td></tr>";
      if(o.f===500||o.f===1000||o.f===2000) mid.push(o.r.rt);
      if(o.f===63||o.f===125) bass.push(o.r.rt);
    }else{
      h+="<tr><td>"+(o.f>=1000?(o.f/1000)+" kHz":o.f+" Hz")+"</td><td style=\"color:#8496ad\">không đủ dải động</td><td>—</td><td>—</td></tr>";
    }
  }
  h+="</tbody></table>";

  if(!mid.length){
    h+='<div style="margin-top:9px" class="bad">Chưa đủ dữ liệu ở dải giữa để kết luận. Tăng mức phát rồi đo lại.</div>';
    E("rtRes").className="res on"; E("rtRes").innerHTML=h; return;
  }
  var m=0; for(i=0;i<mid.length;i++) m+=mid[i]; m/=mid.length;
  var bm=0; if(bass.length){ for(i=0;i<bass.length;i++) bm+=bass[i]; bm/=bass.length }
  LAST.rt=out; LAST.rtMid=m;

  var verdict, cls, advice=[];
  if(m<0.45){ verdict="Phòng khô (hút âm nhiều)"; cls="ok";
    advice.push("Có thể dùng vang máy dài hơn: RT60 vang số <b>1.1 – 1.4 s</b>, repeat 35 – 40 %.");
    advice.push("Không cần cắt trung; nếu tiếng mỏng thì bù nhẹ 250 – 400 Hz +1 – 2 dB.");
  }else if(m<0.9){ verdict="Rất tốt cho karaoke / hát live"; cls="ok";
    advice.push("Vang máy đặt <b>"+(1.3-m*0.6).toFixed(2)+" s</b>, pre-delay 20 – 40 ms, repeat 30 – 35 %.");
    advice.push("Không cần cắt trung nhiều, giữ nguyên EQ phẳng.");
  }else if(m<1.4){ verdict="Hơi vang — dễ bị rối lời"; cls="mid";
    advice.push("Giảm vang máy còn <b>"+Math.max(0.5,1.5-m).toFixed(2)+" s</b>, repeat 25 – 30 %, HF damping 6.3 kHz.");
    advice.push("Cắt <b>250 – 400 Hz khoảng 2 – 3 dB</b> (Q ≈ 1.2) để lời thoát ra khỏi tiếng dọi phòng.");
    advice.push("Thêm rèm, thảm hoặc người/ghế để hút bớt.");
  }else{ verdict="Vang quá nhiều (hội trường / nhà thờ trống)"; cls="bad";
    advice.push("Vang máy đặt <b>tối đa 0.5 – 0.7 s</b>, repeat ≤ 20 %, hoặc tắt hẳn vang và chỉ dùng echo ngắn.");
    advice.push("Cắt <b>200 – 400 Hz từ 3 – 5 dB</b>, HPF micro 120 Hz, đặt loa cao và chĩa xuống người nghe để bớt đánh vào tường.");
    advice.push("Ưu tiên loa nhiều điểm công suất nhỏ hơn là một cặp loa to.");
  }
  if(bass.length && bm>m*1.45){
    advice.push("Dải trầm vang <b>"+bm.toFixed(2)+" s</b>, lâu hơn dải giữa nhiều — phòng bị ù bass. Kéo loa/sub ra khỏi góc 30 – 50 cm và cắt 80 – 160 Hz 2 – 4 dB.");
  }
  h+='<div style="margin-top:11px">RT60 dải giữa (500 Hz – 2 kHz): <span class="big">'+m.toFixed(2)+' s</span></div>';
  h+='<div class="'+cls+'" style="margin-top:2px">'+verdict+"</div>";
  h+='<div style="margin-top:8px">Việc cần làm:<ul style="margin:6px 0 0;padding-left:18px">';
  for(i=0;i<advice.length;i++) h+="<li>"+advice[i]+"</li>";
  h+="</ul></div>";
  E("rtRes").className="res on"; E("rtRes").innerHTML=h;
  note("Đo RT60 xong.");
}
E("rtGo").onclick=runRT;

/* ================= 7. PHA / ĐẢO CỰC ================= */
function pulseBuffer(kind){
  var sr=ac.sampleRate, f=(kind==="sub")?70:250;
  var len=Math.max(8,Math.round(sr*0.5/f)), b=ac.createBuffer(1,len,sr), d=b.getChannelData(0);
  for(var i=0;i<len;i++) d[i]=Math.sin(Math.PI*i/len);
  return b;
}

function runPol(slot){
  if(!micOK()) return;
  var kind=E("phB").value, nm=E(slot==="A"?"phNA":"phNB").value||("Loa "+slot);
  busy(1); note("Đang phát xung kiểm tra pha cho “"+nm+"”…");
  var wasFrozen=(typeof frozen!=="undefined")&&frozen;
  try{ frozen=true }catch(e){}
  var N=6, gap=0.25, recSec=0.3+N*gap+0.5;
  var recP=record(recSec);
  var t=ac.currentTime+0.3, buf=pulseBuffer(kind), i;
  for(i=0;i<N;i++){
    var s=ac.createBufferSource(); s.buffer=buf;
    var g=ac.createGain(); g.gain.value=0.9;
    s.connect(g); g.connect(ac.destination);
    s.start(t+i*gap);
  }
  recP.then(function(R){
    try{ frozen=wasFrozen }catch(e){}
    var f=(kind==="sub")?80:320, Q=(kind==="sub")?1.0:0.7;
    bandpass(R.d,R.n,f,Q,2).then(function(y){
      var r=polSign(y,R.n,R.sr,gap,N);
      busy(0);
      var box=E(slot==="A"?"phVA":"phVB");
      if(!r){ box.innerHTML='<span class="bad">Không nghe thấy xung.</span> Tăng volume dàn, để máy gần loa hơn rồi đo lại.'; note("Không đủ tín hiệu để kết luận.",1); return }
      LAST.pol[slot]={name:nm,sign:r.sign,conf:r.conf,snr:r.snr,kind:kind};
      box.innerHTML="Dấu xung thu được: <b>"+(r.sign>0?"DƯƠNG (+)":"ÂM (−)")+"</b><br>Độ tin cậy "+Math.round(r.conf*100)+" % · SNR "+r.snr.toFixed(0)+" dB";
      note("Đo pha “"+nm+"” xong.");
      polVerdict();
    });
  });
}

function polSign(y,n,sr,gap,N){
  var i,mx=0;
  for(i=0;i<n;i++){ var a=Math.abs(y[i]); if(a>mx) mx=a }
  if(mx<1e-4) return null;
  var flo=0,c=0;
  for(i=0;i<Math.min(n,Math.round(sr*0.15));i++){ flo+=y[i]*y[i]; c++ }
  flo=Math.sqrt(flo/(c||1));
  var snr=20*Math.log10(mx/(flo+1e-9));
  if(snr<8) return null;
  var first=-1;
  for(i=0;i<n;i++){ if(Math.abs(y[i])>0.45*mx){ first=i; break } }
  if(first<0) return null;
  var pos=0,neg=0,step=Math.round(gap*sr),wl=Math.round(sr*0.02);
  for(var k=0;k<N;k++){
    var s0=first-Math.round(sr*0.004)+k*step, s1=Math.min(n,s0+wl);
    if(s0<0) s0=0;
    if(s0>=n-8) break;
    var lm=0,li=s0;
    for(i=s0;i<s1;i++){ var a2=Math.abs(y[i]); if(a2>lm){ lm=a2; li=i } }
    if(lm<0.28*mx) continue;
    var th=0.3*lm, sg=0;
    for(i=s0;i<=li;i++){ if(Math.abs(y[i])>=th){ sg=y[i]>0?1:-1; break } }
    if(sg>0) pos++; else if(sg<0) neg++;
  }
  var tot=pos+neg;
  if(!tot) return null;
  return { sign: pos>=neg?1:-1, conf: Math.max(pos,neg)/tot, snr:snr };
}

function polVerdict(){
  var A=LAST.pol.A, B=LAST.pol.B, e=E("phRes");
  if(!A||!B){
    e.className="res on";
    e.innerHTML="Đo nốt loa còn lại để máy so hai dấu xung với nhau. Đừng dịch micro giữa hai lần đo.";
    return;
  }
  var same=A.sign===B.sign, conf=Math.min(A.conf,B.conf);
  var h="";
  if(same){
    h+='<div class="ok" style="font-size:14px">✔ Hai loa CÙNG CỰC — đúng</div>';
    h+='<div style="margin-top:5px">“'+A.name+'” và “'+B.name+'” cho cùng dấu xung ('+(A.sign>0?"+":"−")+'). Không cần đảo dây.</div>';
    h+='<div style="margin-top:6px">Nếu vẫn cảm thấy mất bass khi mở cả hai loa, nguyên nhân là <b>lệch thời gian</b> chứ không phải cực — sang mục 8 để căn trễ.</div>';
  }else{
    h+='<div class="bad" style="font-size:14px">✖ NGƯỢC CỰC — cần sửa ngay</div>';
    h+='<div style="margin-top:5px">“'+A.name+'” cho dấu <b>'+(A.sign>0?"+":"−")+'</b> còn “'+B.name+'” cho dấu <b>'+(B.sign>0?"+":"−")+'</b>. Hai loa đang đẩy ngược chiều nhau nên trầm bị triệt tiêu.</div>';
    h+='<div style="margin-top:6px"><b>Cách sửa (10 giây):</b> đảo hai đầu dây loa (+ và −) của <b>một</b> loa duy nhất — thường là loa vừa được đi lại dây. Nếu là sub có sẵn nút <i>Phase / Polarity 0°–180°</i> thì bật sang 180°. Đo lại để xác nhận.</div>';
  }
  if(conf<0.7) h+='<div class="mid" style="margin-top:6px">Độ tin cậy hơi thấp ('+Math.round(conf*100)+' %). Nên tăng volume, đưa micro gần loa hơn và đo lại để chắc chắn.</div>';
  h+='<div class="hint" style="margin-top:7px">Lưu ý: dấu tuyệt đối (+/−) còn phụ thuộc micro và đường tiếng của máy, nên hãy tin vào <b>việc hai loa giống hay khác dấu</b>, không phải dấu riêng lẻ.</div>';
  e.className="res on"; e.innerHTML=h;
}
E("phA").onclick=function(){ runPol("A") };
E("phB2").onclick=function(){ runPol("B") };

/* ================= 8. CĂN TRỄ (DELAY) ================= */
function burst(kind){
  var sr=ac.sampleRate, len, d, i, b;
  if(kind==="sub"){
    len=Math.round(sr*3/80); b=ac.createBuffer(1,len,sr); d=b.getChannelData(0);
    for(i=0;i<len;i++){ var w=0.5-0.5*Math.cos(2*Math.PI*i/len); d[i]=w*Math.sin(2*Math.PI*80*i/sr) }
  }else{
    len=Math.round(sr*0.006); b=ac.createBuffer(1,len,sr); d=b.getChannelData(0);
    for(i=0;i<len;i++){ var w2=0.5-0.5*Math.cos(2*Math.PI*i/len); d[i]=w2*(Math.random()*2-1) }
  }
  return b;
}

function dec(x,n,D){
  var m=Math.floor(n/D), o=new Float32Array(m), i, j;
  for(i=0;i<m;i++){ var s=0; for(j=0;j<D;j++) s+=x[i*D+j]; o[i]=s/D }
  return o;
}

/* Tương quan chéo: tìm độ trễ của ref trong x */
function xcorr(x,n,ref,nr,sr){
  var D=4;
  var xd=dec(x,n,D), rd=dec(ref,nr,D);
  var nl=xd.length-rd.length, i, j, s, a;
  if(nl<4) return null;
  var bi=0, bv=-1, rms=0;
  for(i=0;i<nl;i++){
    s=0; for(j=0;j<rd.length;j++) s+=xd[i+j]*rd[j];
    a=Math.abs(s);
    rms+=a;
    if(a>bv){ bv=a; bi=i }
  }
  rms/=nl;
  if(bv<rms*4) return null;
  var c0=Math.max(0,bi*D-3*D), c1=Math.min(n-nr-1,bi*D+3*D), best=c0, bv2=-1, sg=1;
  for(i=c0;i<=c1;i++){
    s=0; for(j=0;j<nr;j++) s+=x[i+j]*ref[j];
    if(Math.abs(s)>bv2){ bv2=Math.abs(s); best=i; sg=s<0?-1:1 }
  }
  return { t:best/sr, q:bv/rms, sign:sg };
}

function runDly(slot){
  if(!micOK()) return;
  var kind=E("dlB").value, nm=E(slot==="A"?"dlNA":"dlNB").value||("Nguồn "+slot);
  busy(1); note("Đang phát xung đo trễ cho “"+nm+"”…");
  var wasFrozen=(typeof frozen!=="undefined")&&frozen;
  try{ frozen=true }catch(e){}
  var recSec=1.6, recP=record(recSec);
  var b=burst(kind), ref=b.getChannelData(0).slice(0);
  var t=ac.currentTime+0.35;
  var s=ac.createBufferSource(); s.buffer=b;
  var g=ac.createGain(); g.gain.value=0.9;
  s.connect(g); g.connect(ac.destination); s.start(t);
  recP.then(function(R){
    try{ frozen=wasFrozen }catch(e){}
    var f=(kind==="sub")?80:1200, Q=(kind==="sub")?1.2:0.55;
    bandpass(R.d,R.n,f,Q,1).then(function(y){
      var r=xcorr(y,R.n,ref,ref.length,R.sr);
      busy(0);
      var box=E(slot==="A"?"dlVA":"dlVB");
      if(!r){ box.innerHTML='<span class="bad">Không bắt được xung.</span> Tăng volume dàn rồi đo lại.'; note("Không đủ tín hiệu.",1); return }
      LAST.dly[slot]={name:nm,t:r.t,q:r.q,kind:kind};
      box.innerHTML="Thời điểm thu được: <b>"+(r.t*1000).toFixed(2)+" ms</b><br>Độ rõ tương quan "+r.q.toFixed(1)+"× nền";
      note("Đo “"+nm+"” xong.");
      dlyVerdict();
    });
  });
}

function dlyVerdict(){
  var A=LAST.dly.A, B=LAST.dly.B, e=E("dlRes");
  if(!A||!B){
    e.className="res on";
    e.innerHTML="Đo nốt nguồn còn lại để máy tính độ lệch. Giữ micro đúng một vị trí cho cả hai lần đo.";
    return;
  }
  var dt=(B.t-A.t)*1000, ad=Math.abs(dt);
  var early = dt>0 ? A : B, late = dt>0 ? B : A;
  var dist=ad/1000*SP;
  var h='<div>Độ lệch đo được: <span class="big">'+ad.toFixed(2)+' ms</span> · tương đương <b>'+(dist*100).toFixed(0)+' cm</b> đường âm</div>';
  if(ad<0.35){
    h+='<div class="ok" style="margin-top:5px">Hai nguồn đã tới cùng lúc — không cần đặt delay.</div>';
  }else{
    h+='<div style="margin-top:7px"><b>Cách đặt:</b> “'+early.name+'” tới <b>sớm hơn</b> “'+late.name+'”. Vào DSP, đặt <b>Delay = '+ad.toFixed(2)+' ms</b> cho đường ra của “'+early.name+'” (giữ đường “'+late.name+'” = 0 ms).</div>';
    h+='<div style="margin-top:5px">Nếu DSP chỉ nhận đơn vị mét: đặt <b>'+dist.toFixed(2)+' m</b>. Nếu nhận feet: <b>'+(dist*3.281).toFixed(2)+' ft</b>.</div>';
  }
  if(A.kind==="sub"||B.kind==="sub"){
    h+='<div class="hint" style="margin-top:7px">Với sub, con số này là ước lượng (bước sóng dài nên xung trông “nhòe” hơn). Sau khi đặt delay, nghe thử ở 60 – 120 Hz: đúng thì tiếng trầm gọn và có lực hơn, sai thì rỗng đi.</div>';
  }
  h+='<div class="hint" style="margin-top:6px">Sau khi đặt delay, đo lại cả hai nguồn một lần nữa — độ lệch phải về gần 0 ms.</div>';
  if(Math.min(A.q,B.q)<6) h+='<div class="mid" style="margin-top:6px">Tín hiệu hơi yếu so với ồn phòng, nên đo lại ở chỗ yên hơn hoặc tăng volume.</div>';
  e.className="res on"; e.innerHTML=h;
}
E("dlA").onclick=function(){ runDly("A") };
E("dlB2").onclick=function(){ runDly("B") };

/* ================= GHI VÀO HỒ SƠ ================= */
E("labNote").onclick=function(){
  var box=document.getElementById("stNoteBox");
  if(!box){ note("Không thấy thanh Hồ sơ để ghi.",1); return }
  var L=[], i;
  L.push("— Đo phòng "+new Date().toLocaleString()+" —");
  if(LAST.rt){
    var s=[];
    for(i=0;i<LAST.rt.length;i++){ var o=LAST.rt[i]; if(o.r) s.push((o.f>=1000?(o.f/1000)+"k":o.f)+": "+o.r.rt.toFixed(2)+"s") }
    L.push("RT60 "+s.join(" | "));
    L.push("RT60 dải giữa: "+LAST.rtMid.toFixed(2)+" s");
  }
  if(LAST.pol.A&&LAST.pol.B){
    L.push("Pha: "+LAST.pol.A.name+" ("+(LAST.pol.A.sign>0?"+":"-")+") vs "+LAST.pol.B.name+" ("+(LAST.pol.B.sign>0?"+":"-")+") → "+(LAST.pol.A.sign===LAST.pol.B.sign?"cùng cực":"NGƯỢC CỰC, phải đảo dây 1 loa"));
  }
  if(LAST.dly.A&&LAST.dly.B){
    var dt=(LAST.dly.B.t-LAST.dly.A.t)*1000;
    var early=dt>0?LAST.dly.A.name:LAST.dly.B.name;
    L.push("Delay: lệch "+Math.abs(dt).toFixed(2)+" ms → đặt delay cho “"+early+"”");
  }
  if(L.length<2){ note("Chưa có kết quả nào để ghi.",1); return }
  box.style.display="block";
  box.value=(box.value?box.value+"\n":"")+L.join("\n");
  try{ box.dispatchEvent(new Event("input",{bubbles:true})) }catch(e){
    var ev=document.createEvent("HTMLEvents"); ev.initEvent("input",true,false); box.dispatchEvent(ev);
  }
  note("Đã ghi vào ghi chú hồ sơ — sẽ xuất kèm trong báo cáo.");
};

window.STlab=LAST;
})();
