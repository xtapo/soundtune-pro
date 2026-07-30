/* SoundTune Pro - ring.js : 9. Cảnh báo trước khi hú · 10. Bộ nhớ hú tích luỹ (ring-out) */
(function(){
"use strict";
if(!document.getElementById("rta")) return;
var E=function(id){return document.getElementById(id)};
var KEY="soundtune.ring.v1";

var css=document.createElement("style");
css.textContent=
"#p6 .sec{border-top:1px solid var(--line);margin-top:16px;padding-top:14px}"+
"#p6 .sec:first-of-type{border-top:0;margin-top:0;padding-top:0}"+
"#p6 h4{margin:0 0 6px;font-size:13.5px}"+
"#p6 .lead{color:var(--dim);font-size:12px;line-height:1.6;margin-bottom:10px}"+
"#p6 .ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}"+
"#riseBox,#topBox{margin-top:10px;background:#0d1826;border:1px solid var(--line);border-radius:10px;padding:9px 11px;font-size:12.5px;line-height:1.7}"+
"#riseBox{min-height:62px}"+
"#riseBox .r1{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed #1e2b3d;padding:3px 0}"+
"#riseBox .r1:last-child{border-bottom:0}"+
"#riseBox .f{font-weight:700;color:#e8eef6;font-variant-numeric:tabular-nums}"+
"#riseBox .up{color:#fca5a5;font-weight:700}#riseBox .fl{color:#86efac}"+
"#topBox ol{margin:6px 0 0;padding-left:20px}#topBox b{color:var(--acc)}"+
"#p6 .cnt{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--dim);margin-top:8px}"+
"#p6 .cnt b{color:#e8eef6;font-size:14px}"+
"#preW{position:fixed;left:10px;right:10px;bottom:10px;z-index:88;display:none;background:linear-gradient(180deg,#3b2f05,#221c03);border:2px solid #f59e0b;border-radius:14px;padding:11px 34px 11px 13px;box-shadow:0 0 26px rgba(245,158,11,.35)}"+
"#preW.on{display:block}"+
"#preW .t1{font-weight:800;font-size:14px;color:#fde68a;letter-spacing:.4px}"+
"#preW .t2{font-size:12.5px;color:#fef3c7;margin-top:3px;line-height:1.55}"+
"#preX{position:absolute;top:5px;right:8px;color:#fbbf24;font-weight:700;font-size:15px;background:none;border:0;cursor:pointer}";
document.head.appendChild(css);

var html=
'<h3>Dự đoán hú &amp; Ring-out</h3>'+
'<div class="sec"><h4>9. Cảnh báo trước khi hú</h4>'+
'<div class="lead">Máy theo dõi dải nào đang <b>dâng dần</b> so với nền phổ xung quanh. Dải nào nhô lên liên tục đủ nhanh là sắp thành tiếng hú — máy báo vàng <i>trước</i> khi hú thật để bạn dừng tay.</div>'+
'<div class="ctl"><label class="chk"><input type="checkbox" id="pOn" checked> Bật cảnh báo sớm</label>'+
'<div class="fld"><label>Độ nhạy</label><select id="pSens"><option value="lo">Thấp (ít báo)</option><option value="md" selected>Vừa</option><option value="hi">Cao (báo sớm nhất)</option></select></div>'+
'<label class="chk"><input type="checkbox" id="pVoice" checked> Đọc cảnh báo sớm</label></div>'+
'<div id="riseBox">Chưa có dải nào dâng đáng chú ý.</div></div>'+
'<div class="sec"><h4>10. Bộ nhớ hú cả buổi (ring-out)</h4>'+
'<div class="lead">Mọi lần hú thật và mọi cảnh báo sớm đều được ghi và gộp theo tần số. Cuối buổi máy đưa ra <b>5 điểm cần cắt cố định</b> trên DSP. Dữ liệu lưu theo từng hồ sơ dàn.</div>'+
'<div class="cnt"><div>Hú thật: <b id="cReal">0</b></div><div>Cảnh báo sớm: <b id="cPre">0</b></div><div>Điểm tần số: <b id="cPts">0</b></div><div>Mở từ: <b id="cStart">—</b></div></div>'+
'<div id="topBox">Chưa ghi được điểm hú nào.</div>'+
'<div style="overflow:auto;margin-top:10px"><table id="ringT"><thead><tr><th>Tần số</th><th>Hú</th><th>Sớm</th><th>Vượt max</th><th>Q</th><th>Cắt</th><th>Lần cuối</th></tr></thead><tbody id="ringB"><tr><td colspan="7" style="color:#8496ad">Trống</td></tr></tbody></table></div>'+
'<div class="ctl" style="margin-top:11px"><button id="rgCopy">📋 Sao chép bảng cắt</button><button id="rgNote">🗂 Ghi vào hồ sơ</button><button id="rgNew">↺ Bắt đầu buổi mới</button></div>'+
'<div id="rgMsg" style="margin-top:8px;font-size:12.5px;min-height:17px;color:#86efac"></div>'+
'<details style="margin-top:12px"><summary>Quy trình ring-out chuẩn (làm 1 lần cho mỗi dàn)</summary>'+
'<div class="lead" style="margin-top:8px">1. Đặt micro đúng chỗ và đúng hướng sẽ hát.<br>2. Tắt vang và echo, để EQ phẳng.<br>3. Tăng master mic <b>từ từ</b> tới khi nghe hú nhẹ.<br>4. Máy báo tần số → cắt đúng tần số đó 3 – 6 dB, Q hẹp.<br>5. Tăng tiếp → hú tần số khác → cắt tiếp, lặp 4 – 6 lần.<br>6. Cắt đủ rồi <b>hạ master mic 3 – 6 dB</b> so với điểm hú — đó là mức an toàn.<br>7. Bật lại vang/echo, ghi bảng cắt vào hồ sơ.<br>Đừng cắt quá 6 điểm và đừng sâu hơn 10 dB, tiếng sẽ rỗng.</div></details></div>';

var tabs=document.querySelector(".tabs");
var btn=document.createElement("button");
btn.setAttribute("data-t","p6"); btn.textContent="Dự đoán hú · Ring-out";
tabs.appendChild(btn);
var pan=document.createElement("div");
pan.id="p6"; pan.className="panel"; pan.innerHTML=html;
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

var pw=document.createElement("div");
pw.id="preW";
pw.innerHTML='<button id="preX">✕</button><div class="t1" id="preT1">SẮP HÚ</div><div class="t2" id="preT2"></div>';
document.body.appendChild(pw);
E("preX").onclick=function(){ pw.className="" };

/* ============ LƯU THEO HỒ SƠ ============ */
function pid(){ try{ var d=JSON.parse(localStorage.getItem("soundtune.v1")||"{}"); return d.active||"_" }catch(e){ return "_" } }
var S={items:[],real:0,pre:0,start:Date.now()}, curPid=pid(), saveT=null;
function load(){
  try{ var all=JSON.parse(localStorage.getItem(KEY)||"{}"), s=all[curPid];
    S=(s&&s.items)?s:{items:[],real:0,pre:0,start:Date.now()};
  }catch(e){ S={items:[],real:0,pre:0,start:Date.now()} }
}
function save(){
  clearTimeout(saveT);
  saveT=setTimeout(function(){
    try{ var all=JSON.parse(localStorage.getItem(KEY)||"{}"); all[curPid]=S; localStorage.setItem(KEY,JSON.stringify(all)) }catch(e){}
  },600);
}
load();
setInterval(function(){ var p=pid(); if(p!==curPid){ curPid=p; load(); render() } },2000);

/* ============ GHI ĐIỂM HÚ ============ */
function logHit(f,prom,Q,bw,kind){
  var i,it=null;
  for(i=0;i<S.items.length;i++){ if(Math.abs(S.items[i].f-f)/f<0.035){ it=S.items[i]; break } }
  if(!it){ it={f:f,n:0,np:0,prom:0,Q:Q||8,bw:bw||0,first:Date.now(),last:0}; S.items.push(it) }
  var w=it.n+it.np;
  it.f=(it.f*w+f)/(w+1);
  if(kind==="real"){ it.n++; S.real++ } else { it.np++; S.pre++ }
  if(prom>it.prom) it.prom=prom;
  if(Q) it.Q=Q;
  if(bw) it.bw=bw;
  it.last=Date.now();
  save(); render();
}
function cutOf(it){ return -Math.min(10,Math.max(3,Math.round(it.prom*0.55*2)/2)) }
function sc(it){ return it.n*2+it.np*0.6+it.prom/6 }

function render(){
  E("cReal").textContent=S.real;
  E("cPre").textContent=S.pre;
  E("cPts").textContent=S.items.length;
  E("cStart").textContent=new Date(S.start).toLocaleTimeString();
  var arr=S.items.slice(0).sort(function(a,b){ return sc(b)-sc(a) }), h="", i;
  if(!arr.length){
    E("ringB").innerHTML='<tr><td colspan="7" style="color:#8496ad">Trống</td></tr>';
    E("topBox").innerHTML="Chưa ghi được điểm hú nào. Cứ để máy chạy trong buổi, nó tự ghi.";
    return;
  }
  for(i=0;i<arr.length;i++){
    var it=arr[i];
    h+="<tr><td><b>"+fmtF(it.f)+"</b></td><td>"+it.n+"</td><td>"+it.np+"</td><td>+"+it.prom.toFixed(1)+" dB</td><td>"+it.Q.toFixed(1)+"</td><td>"+cutOf(it).toFixed(1)+" dB</td><td>"+new Date(it.last).toLocaleTimeString()+"</td></tr>";
  }
  E("ringB").innerHTML=h;
  var top=arr.slice(0,5), t="<b>Bảng PEQ cần cắt cố định trên DSP</b><ol>";
  for(i=0;i<top.length;i++){
    var o=top[i];
    t+="<li>"+fmtF(o.f)+" — cắt <b>"+cutOf(o).toFixed(1)+" dB</b>, Q = <b>"+o.Q.toFixed(1)+"</b> <span style=\"color:#8496ad\">("+o.n+" lần hú, "+o.np+" lần sắp hú)</span></li>";
  }
  t+="</ol><div style=\"margin-top:6px;color:#8496ad\">Cắt xong những điểm này rồi hạ master mic 3 – 6 dB là dàn chạy an toàn cả buổi.</div>";
  E("topBox").innerHTML=t;
}
render();

/* nối vào cảnh báo hú thật */
var oldAlert=window.showAlert;
window.showAlert=function(d,spl){
  try{ oldAlert.apply(this,arguments) }catch(e){}
  try{ pw.className=""; if(d&&d.f) logHit(d.f,d.prom||0,Math.round((d.Q||8)*10)/10,d.bw||0,"real") }catch(e){}
};

/* ============ 9. DỰ ĐOÁN ============ */
var SENS={lo:{prom:8.5,slope:5.0,lvl:-56},md:{prom:6.5,slope:3.4,lvl:-62},hi:{prom:5.0,slope:2.2,lvl:-68}};
var HN=22, HDT=120, hp=[], hn=0, cool=[], lastSay=0, lastT=0;
for(var b0=0;b0<NB;b0++){ hp.push(new Float32Array(HN)); cool.push(0) }

function localProm(b){
  var v=[],i;
  for(i=b-5;i<=b+5;i++){ if(i<0||i>=NB||(i>=b-1&&i<=b+1)) continue; v.push(disp[i]) }
  if(!v.length) return 0;
  v.sort(function(x,y){return x-y});
  return disp[b]-v[Math.floor(v.length/2)];
}
function slopeOf(b,n){
  if(hn<n) n=hn;
  if(n<4) return 0;
  var sx=0,sy=0,sxy=0,sxx=0,i,x,y;
  for(i=0;i<n;i++){
    x=(i-(n-1))*HDT/1000;
    y=hp[b][(hn-n+i+HN*4)%HN];
    sx+=x; sy+=y; sxy+=x*y; sxx+=x*x;
  }
  var d=n*sxx-sx*sx;
  return d?(n*sxy-sx*sy)/d:0;
}

function showRise(list){
  var box=E("riseBox");
  if(!list.length){ box.innerHTML="Chưa có dải nào dâng đáng chú ý."; return }
  var h="",i;
  for(i=0;i<list.length&&i<3;i++){
    var o=list[i];
    h+='<div class="r1"><span class="f">'+fmtF(ISO[o.b])+'</span><span>nhô +'+o.p.toFixed(1)+' dB</span><span class="'+(o.s>0.8?"up":"fl")+'">'+(o.s>0?"↑ ":"↓ ")+o.s.toFixed(1)+' dB/s</span></div>';
  }
  box.innerHTML=h;
}

function warn(o,thr){
  var f=ISO[o.b], eta=o.s>0.5?Math.max(0.5,(thr-o.p)/o.s):0;
  E("preT1").textContent="⚠ SẮP HÚ Ở "+fmtF(f);
  E("preT2").innerHTML="Dải này đang dâng <b>"+o.s.toFixed(1)+" dB/giây</b>, đã nhô +"+o.p.toFixed(1)+" dB so với nền."+
    (eta?" Còn khoảng <b>"+eta.toFixed(1)+" giây</b> nủa là hú nếu giữ nguyên.":"")+
    "<br><b>Làm ngay:</b> đừng tăng thêm micro; hạ master mic 1 – 2 dB hoặc cắt "+fmtF(f)+" chừng 3 dB, Q 8 – 12.";
  pw.className="on";
  clearTimeout(warn.t);
  warn.t=setTimeout(function(){ pw.className="" },5000);
  logHit(f,o.p,Math.max(6,Math.min(20,f/Math.max(20,f*0.09))),0,"pre");
  var now=Date.now();
  if(E("pVoice").checked && E("tts").checked && now-lastSay>7000){
    lastSay=now;
    try{ speak("Sắp hú ở "+sayF(f)+". Đừng tăng thêm micro.") }catch(e){}
  }
}

setInterval(function(){
  if(typeof disp==="undefined"||typeof running==="undefined") return;
  if(!ac||!running) return;
  if(typeof frozen!=="undefined"&&frozen) return;
  var now=Date.now();
  if(now-lastT<HDT-15) return;
  lastT=now;
  var b;
  for(b=0;b<NB;b++) hp[b][hn%HN]=localProm(b);
  hn++;
  if(!E("pOn").checked){ showRise([]); return }
  var cf=SENS[E("pSens").value]||SENS.md;
  var thr=parseFloat(E("thr").value)||12;
  var list=[], i;
  for(b=0;b<NB;b++){
    if(ISO[b]<100||ISO[b]>8000) continue;
    var p=hp[b][(hn-1+HN)%HN], s=slopeOf(b,10);
    if(disp[b]<cf.lvl) continue;
    if(p<cf.prom-2) continue;
    list.push({b:b,p:p,s:s});
  }
  list.sort(function(x,y){ return (y.p+y.s*1.6)-(x.p+x.s*1.6) });
  showRise(list);
  for(i=0;i<list.length;i++){
    var o=list[i];
    if(o.p<cf.prom||o.s<cf.slope) continue;
    if(o.p>=thr+2) continue;                 /* đã thành hú thật, để cảnh báo đỏ xử lý */
    if(E("alert").style.display==="block") break;
    if(now-cool[o.b]<9000) continue;
    cool[o.b]=now;
    warn(o,thr);
    break;
  }
},HDT);

/* ============ NÚT ============ */
function msg(m,bad){ var e=E("rgMsg"); e.textContent=m||""; e.style.color=bad?"#fca5a5":"#86efac" }
function textReport(){
  var arr=S.items.slice(0).sort(function(a,b){ return sc(b)-sc(a) }), L=[], i;
  L.push("Bảng cắt PEQ (ring-out) — "+new Date().toLocaleString());
  for(i=0;i<arr.length&&i<8;i++){
    var o=arr[i];
    L.push((i+1)+". "+fmtF(o.f)+" | cắt "+cutOf(o).toFixed(1)+" dB | Q "+o.Q.toFixed(1)+" | "+o.n+" lần hú, "+o.np+" lần sắp hú");
  }
  L.push("Sau khi cắt: hạ master mic 3 - 6 dB so với điểm bắt đầu hú.");
  return L.join("\n");
}
E("rgCopy").onclick=function(){
  if(!S.items.length){ msg("Chưa có gì để sao chép.",1); return }
  var t=textReport();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){ msg("Đã sao chép bảng cắt.") },function(){ msg(t,0) });
  }else{ msg(t,0) }
};
E("rgNote").onclick=function(){
  var box=document.getElementById("stNoteBox");
  if(!box){ msg("Không thấy thanh Hồ sơ.",1); return }
  if(!S.items.length){ msg("Chưa có điểm hú nào.",1); return }
  box.style.display="block";
  box.value=(box.value?box.value+"\n":"")+textReport();
  try{ box.dispatchEvent(new Event("input",{bubbles:true})) }
  catch(e){ var ev=document.createEvent("HTMLEvents"); ev.initEvent("input",true,false); box.dispatchEvent(ev) }
  msg("Đã ghi vào ghi chú hồ sơ — sẽ nằm trong báo cáo PNG.");
};
E("rgNew").onclick=function(){
  if(S.items.length && !confirm("Xoá bộ nhớ hú của hồ sơ này để bắt đầu buổi mới?")) return;
  S={items:[],real:0,pre:0,start:Date.now()};
  save(); render(); msg("Đã bắt đầu buổi mới.");
};

window.STring=function(){ return S };
})();
