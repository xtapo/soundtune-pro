/* SoundTune - extras.js
   Hồ sơ theo địa điểm · Lưu cài đặt · Xuất báo cáo · Đánh dấu tần số · PWA */
(function(){
"use strict";
var g=function(id){return document.getElementById(id)};
var IS_PRO=!!g("rta"), IS_EASY=!!g("presets");
if(!IS_PRO&&!IS_EASY) return;
var KEY="soundtune.v1";

/* ================= LƯU TRỮ ================= */
var DB={profiles:[],active:null};
function uid(){return "p"+Date.now().toString(36)+Math.floor(Math.random()*999).toString(36)}
function blank(n){return{id:uid(),name:n,note:"",created:Date.now(),updated:Date.now(),pro:{},easy:{},snaps:[],marks:[],peq:[],hist:[]}}
function cur(){for(var i=0;i<DB.profiles.length;i++)if(DB.profiles[i].id===DB.active)return DB.profiles[i];return null}
function save(){try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}}
function load(){
  try{var s=localStorage.getItem(KEY); if(s)DB=JSON.parse(s)||DB}catch(e){}
  if(!DB.profiles||!DB.profiles.length){var p=blank("Hồ sơ mặc định");DB={profiles:[p],active:p.id}}
  if(!cur())DB.active=DB.profiles[0].id;
}
var sT=null;
function saveSoon(){clearTimeout(sT);sT=setTimeout(function(){collect();msg("Đã lưu")},700)}
function msg(t,bad){var e=g("stMsg");if(!e)return;e.textContent=t||"";e.style.color=bad?"#fca5a5":"#86efac";clearTimeout(msg.t);msg.t=setTimeout(function(){e.textContent=""},2600)}

/* ================= GIAO DIỆN CHUNG ================= */
var css=document.createElement("style");
css.textContent=
"#stBar{display:flex;flex-wrap:wrap;gap:7px;align-items:center;background:#111c2b;border:1px solid #22314a;border-radius:12px;padding:9px 11px;margin-bottom:11px}"+
"#stBar .lb{font-size:10.5px;letter-spacing:.5px;text-transform:uppercase;color:#8ea3bf;font-weight:700}"+
"#stBar select{font-family:inherit;font-size:13px;color:#eaf1f9;background:#0d1826;border:1px solid #22314a;border-radius:9px;padding:7px 9px;max-width:190px;flex:1 1 130px}"+
"#stBar button{font-family:inherit;font-size:12px;color:#eaf1f9;background:#1a2739;border:1px solid #22314a;border-radius:9px;padding:7px 10px;cursor:pointer;white-space:nowrap}"+
"#stBar button:hover{background:#24374f}"+
"#stBar button.acc{background:linear-gradient(180deg,#0891b2,#0369a1);border-color:#38bdf8;font-weight:700}"+
"#stBar button.ins{background:linear-gradient(180deg,#16a34a,#15803d);border-color:#22c55e;font-weight:700}"+
"#stMsg{font-size:11.5px;margin-left:auto;min-height:14px}"+
"#stNoteBox{display:none;width:100%;margin-top:8px;font-family:inherit;font-size:13px;color:#eaf1f9;background:#0d1826;border:1px solid #22314a;border-radius:10px;padding:9px 10px;min-height:64px;resize:vertical}"+
"#mkBar{display:flex;flex-wrap:wrap;gap:7px;align-items:center;background:#111c2b;border:1px solid #22314a;border-radius:12px;padding:8px 10px;margin-top:10px}"+
"#mkBar button{font-family:inherit;font-size:12px;color:#eaf1f9;background:#1a2739;border:1px solid #22314a;border-radius:9px;padding:6px 10px;cursor:pointer}"+
"#mkBar .mk{font-size:11.5px;background:#3f1d33;border:1px solid #f472b6;color:#fbcfe8;border-radius:999px;padding:3px 8px;cursor:pointer}"+
"#mkBar .tip{font-size:11px;color:#8ea3bf}";
document.head.appendChild(css);

var bar=document.createElement("div");
bar.id="stBar";
bar.innerHTML='<span class="lb">Hồ sơ</span>'+
  '<select id="stSel" title="Chọn địa điểm / dàn"></select>'+
  '<button id="stNew">+ Mới</button>'+
  '<button id="stRen">Đổi tên</button>'+
  '<button id="stDel">Xoá</button>'+
  '<button id="stNoteB">Ghi chú</button>'+
  '<button id="stRep" class="acc">📄 Xuất báo cáo</button>'+
  '<button id="stIns" class="ins" style="display:none">⬇ Cài vào máy</button>'+
  '<span id="stMsg"></span>'+
  '<textarea id="stNoteBox" placeholder="Ghi chú cho địa điểm này: vị trí loa, số máy DSP, đã cắt tần số nào, hẹn quay lại…"></textarea>';
var wrap=document.querySelector(".wrap");
if(wrap) wrap.insertBefore(bar,wrap.firstChild);

function fillSel(){
  var s=g("stSel"),h="";
  for(var i=0;i<DB.profiles.length;i++){
    var p=DB.profiles[i];
    h+='<option value="'+p.id+'"'+(p.id===DB.active?" selected":"")+">"+p.name.replace(/</g,"")+"</option>";
  }
  s.innerHTML=h;
}

/* ================= THU THẬP / ÁP DỤNG ================= */
var marks=[],peq=[],lastEasy=null;

function collect(){
  var p=cur(); if(!p) return;
  if(IS_PRO){
    p.pro={mode:g("mode").value,speed:g("speed").value,nf:g("nf").checked,thr:g("thr").value,
           cal:g("cal").value,tts:g("tts").checked,bpm:g("bpm").value,rtMul:g("rtMul").value};
    p.snaps=[];
    for(var s=0;s<6;s++) p.snaps.push(snaps[s]?{d:Array.prototype.slice.call(snaps[s]),on:snapOn[s]!==false}:null);
    p.marks=marks.slice(0);
    p.peq=peq.slice(-14);
  }
  if(IS_EASY){
    p.easy={pk:onIdx("#presets"),mode:onIdx("#modes"),sens:onIdx("#sens"),bpm:g("bpm").value,nv:g("nv").value};
  }
  var nb=g("stNoteBox"); if(nb) p.note=nb.value;
  p.updated=Date.now();
  save();
}
function onIdx(sel){var a=document.querySelectorAll(sel+" .pz");for(var i=0;i<a.length;i++)if(a[i].className.indexOf("on")>=0)return i;return 0}
function clickIdx(sel,i){var a=document.querySelectorAll(sel+" .pz");if(a[i])a[i].click()}
function fire(e,t){try{e.dispatchEvent(new Event(t,{bubbles:true}))}catch(x){var ev=document.createEvent("HTMLEvents");ev.initEvent(t,true,false);e.dispatchEvent(ev)}}

function apply(){
  var p=cur(); if(!p) return;
  var nb=g("stNoteBox"); if(nb) nb.value=p.note||"";
  if(IS_PRO){
    var s=p.pro||{};
    if(s.mode) g("mode").value=s.mode;
    if(s.speed){ g("speed").value=s.speed; if(g("speed").onchange) g("speed").onchange.call(g("speed")) }
    if(typeof s.nf==="boolean") g("nf").checked=s.nf;
    if(s.thr){ g("thr").value=s.thr; g("thrV").textContent=parseFloat(s.thr).toFixed(1)+" dB" }
    if(s.cal){ g("cal").value=s.cal; g("calV").textContent=s.cal+" dB" }
    if(typeof s.tts==="boolean") g("tts").checked=s.tts;
    if(s.bpm) g("bpm").value=s.bpm;
    if(s.rtMul) g("rtMul").value=s.rtMul;
    try{ calcTempo() }catch(e){}
    for(var i=0;i<6;i++){
      var q=(p.snaps||[])[i];
      if(q&&q.d&&q.d.length){ snaps[i]=q.d.slice(0); snapOn[i]=q.on!==false } else snaps[i]=null;
      try{ updSnap(i) }catch(e){}
    }
    marks=(p.marks||[]).slice(0);
    peq=(p.peq||[]).slice(0);
    drawMkList();
  }
  if(IS_EASY){
    var q2=p.easy||{};
    if(typeof q2.pk==="number") clickIdx("#presets",q2.pk);
    if(typeof q2.mode==="number") clickIdx("#modes",q2.mode);
    if(typeof q2.sens==="number") clickIdx("#sens",q2.sens);
    if(q2.bpm){ g("bpm").value=q2.bpm; fire(g("bpm"),"input") }
    if(q2.nv){ g("nv").value=q2.nv; fire(g("nv"),"input") }
  }
}

/* ================= NÚT HỒ SƠ ================= */
g("stSel").onchange=function(){ collect(); DB.active=this.value; save(); apply(); msg("Đã mở hồ sơ: "+(cur()?cur().name:"")) };
g("stNew").onclick=function(){
  var n=prompt("Tên địa điểm / dàn mới:","Quán "+(DB.profiles.length+1));
  if(!n) return;
  collect();
  var p=blank(n.substring(0,40)); DB.profiles.push(p); DB.active=p.id; save();
  fillSel(); apply(); msg("Đã tạo hồ sơ mới");
};
g("stRen").onclick=function(){
  var p=cur(); if(!p) return;
  var n=prompt("Đổi tên hồ sơ:",p.name); if(!n) return;
  p.name=n.substring(0,40); save(); fillSel(); msg("Đã đổi tên");
};
g("stDel").onclick=function(){
  if(DB.profiles.length<2){ msg("Phải còn ít nhất 1 hồ sơ",true); return }
  var p=cur(); if(!p||!confirm('Xoá hồ sơ "'+p.name+'"? Không lấy lại được.')) return;
  for(var i=0;i<DB.profiles.length;i++) if(DB.profiles[i].id===p.id){ DB.profiles.splice(i,1); break }
  DB.active=DB.profiles[0].id; save(); fillSel(); apply(); msg("Đã xoá hồ sơ");
};
g("stNoteB").onclick=function(){
  var b=g("stNoteBox");
  b.style.display = b.style.display==="block" ? "none" : "block";
  if(b.style.display==="block") b.focus();
};
g("stNoteBox").oninput=saveSoon;

/* ================= PWA ================= */
if("serviceWorker" in navigator && location.protocol.indexOf("http")===0){
  window.addEventListener("load",function(){ navigator.serviceWorker.register("sw.js").catch(function(){}) });
}
var dp=null;
window.addEventListener("beforeinstallprompt",function(e){ e.preventDefault(); dp=e; g("stIns").style.display="" });
window.addEventListener("appinstalled",function(){ g("stIns").style.display="none"; msg("Đã cài vào máy") });
g("stIns").onclick=function(){
  if(!dp){ alert("Trình duyệt chưa cho cài tự động.\n\niPhone (Safari): nút Chia sẻ › Thêm vào MH chính.\nAndroid (Chrome): menu ⋮ › Cài đặt ứng dụng."); return }
  dp.prompt(); dp=null; g("stIns").style.display="none";
};
window.addEventListener("offline",function(){ msg("Mất mạng — app vẫn chạy bình thường") });

/* ================= ĐÁNH DẤU TẦN SỐ (bản Chuyên) ================= */
function nearBand(f){var mi=0,md=1e9;for(var b=0;b<NB;b++){var d=Math.abs(Math.log(ISO[b]/f));if(d<md){md=d;mi=b}}return mi}
function drawMkList(){
  var e=g("mkList"); if(!e) return;
  if(!marks.length){ e.innerHTML='<span class="tip">Chưa có dấu nào</span>'; return }
  var h="";
  for(var i=0;i<marks.length;i++) h+='<span class="mk" data-i="'+i+'" title="Bấm để xoá dấu này">'+fmtF(marks[i])+' ✕</span> ';
  e.innerHTML=h;
  var a=e.querySelectorAll(".mk");
  for(var j=0;j<a.length;j++) a[j].onclick=function(){ marks.splice(+this.getAttribute("data-i"),1); drawMkList(); saveSoon() };
}
function addMark(f){
  if(!isFinite(f)||f<20||f>20000) return;
  for(var i=0;i<marks.length;i++) if(Math.abs(marks[i]-f)/f<0.04){ marks.splice(i,1); drawMkList(); saveSoon(); return }
  if(marks.length>=8) marks.shift();
  marks.push(Math.round(f*10)/10);
  drawMkList(); saveSoon();
}

if(IS_PRO){
  var mk=document.createElement("div");
  mk.id="mkBar";
  mk.innerHTML='<button id="mkLock">📌 Khoá đỉnh hiện tại</button>'+
    '<button id="mkCur">Đánh dấu chỗ con trỏ</button>'+
    '<button id="mkClr">Xoá hết dấu</button>'+
    '<span id="mkList"></span>'+
    '<span class="tip">Chạm giữ (hoặc bấm đúp) trên đồ thị để đánh dấu tần số</span>';
  var cb=document.querySelector(".chartbox");
  if(cb&&cb.parentNode) cb.parentNode.insertBefore(mk,cb.nextSibling);

  g("mkLock").onclick=function(){
    var mi=0; for(var b=1;b<NB;b++) if(disp[b]>disp[mi]) mi=b;
    addMark(ISO[mi]); msg("Đã khoá đỉnh "+fmtF(ISO[mi]));
  };
  g("mkCur").onclick=function(){
    if(!cur_ok()){ msg("Hãy rê chuột hoặc chạm lên đồ thị trước",true); return }
    addMark(xf(window.cur.x));
  };
  function cur_ok(){ return window.cur && window.cur.on && window.cur.x>0 }
  g("mkClr").onclick=function(){ marks=[]; drawMkList(); saveSoon() };

  var cvv=g("rta"), holdT=null;
  function pos(e){ var r=cvv.getBoundingClientRect(); var p=(e.touches&&e.touches[0])?e.touches[0]:e; return p.clientX-r.left }
  function startHold(e){ var x=pos(e); clearTimeout(holdT); holdT=setTimeout(function(){ addMark(xf(x)); msg("Đã đánh dấu "+fmtF(xf(x))) },550) }
  function endHold(){ clearTimeout(holdT) }
  cvv.addEventListener("touchstart",startHold,{passive:true});
  cvv.addEventListener("touchend",endHold);
  cvv.addEventListener("touchmove",endHold);
  cvv.addEventListener("mousedown",startHold);
  cvv.addEventListener("mouseup",endHold);
  cvv.addEventListener("mouseleave",endHold);
  cvv.addEventListener("dblclick",function(e){ addMark(xf(pos(e))) });

  var _draw=window.draw;
  window.draw=function(t,s){
    _draw(t,s);
    for(var i=0;i<marks.length;i++){
      var f=marks[i], x=fx(f);
      if(x<PAD.l||x>PAD.l+W()) continue;
      cx.strokeStyle="rgba(244,114,182,.85)"; cx.lineWidth=1.3; cx.setLineDash([3,3]);
      cx.beginPath(); cx.moveTo(x,PAD.t); cx.lineTo(x,PAD.t+H()); cx.stroke(); cx.setLineDash([]);
      var mi=nearBand(f), lb=fmtF(f)+"  "+disp[mi].toFixed(1)+" dB";
      cx.font="700 10px Segoe UI,Arial"; cx.textAlign="left";
      var w=cx.measureText(lb).width+9, bx=Math.min(PAD.l+W()-w,Math.max(PAD.l,x-w/2)), by=PAD.t+3+(i%3)*15;
      cx.fillStyle="rgba(244,114,182,.93)"; cx.fillRect(bx,by,w,13);
      cx.fillStyle="#2b0a1c"; cx.fillText(lb,bx+4.5,by+10);
    }
  };

  var _sa=window.showAlert;
  window.showAlert=function(d,spl){
    _sa(d,spl);
    var cut=-Math.min(12,Math.max(3,Math.round(d.prom*0.6*2)/2));
    for(var i=0;i<peq.length;i++) if(Math.abs(peq[i].f-d.f)/d.f<0.05){
      if(d.prom>peq[i].prom){ peq[i]={f:d.f,Q:d.Q,bw:d.bw,cut:cut,prom:d.prom,t:Date.now(),n:peq[i].n+1} } else peq[i].n++;
      saveSoon(); return;
    }
    peq.push({f:d.f,Q:d.Q,bw:d.bw,cut:cut,prom:d.prom,t:Date.now(),n:1});
    saveSoon();
  };

  var _us=window.updSnap;
  window.updSnap=function(s){ _us(s); saveSoon() };

  var ids=["mode","speed","nf","thr","cal","tts","bpm","rtMul"];
  for(var k=0;k<ids.length;k++){
    var e2=g(ids[k]); if(!e2) continue;
    e2.addEventListener("change",saveSoon);
    e2.addEventListener("input",saveSoon);
  }
}

/* ================= EASY: lưu kết quả để làm báo cáo ================= */
if(IS_EASY){
  var _rd=window.render;
  window.render=function(score,zd,res,d){
    _rd(score,zd,res,d);
    var items=[],li=document.querySelectorAll("#todo li");
    for(var i=0;i<li.length;i++){
      var b=li[i].querySelector("b"), sm=li[i].querySelector("small"), dv=li[i].querySelector(".do");
      items.push({t:b?b.textContent:"",s:sm?sm.textContent:"",d:dv?dv.textContent:""});
    }
    var st=document.querySelector("#status b");
    lastEasy={score:score,status:st?st.textContent:"",items:items,when:Date.now()};
    var p=cur();
    if(p){ p.hist=(p.hist||[]); p.hist.push({t:Date.now(),s:score}); if(p.hist.length>24)p.hist.shift(); }
    collect();
  };
  var cs=["#presets","#modes","#sens"];
  for(var c=0;c<cs.length;c++){ var e3=document.querySelector(cs[c]); if(e3) e3.addEventListener("click",saveSoon,true) }
  var e4=g("bpm"); if(e4) e4.addEventListener("input",saveSoon);
  var e5=g("nv");  if(e5) e5.addEventListener("input",saveSoon);
}

/* ================= XUẤT BÁO CÁO PNG ================= */
function wrapTxt(x,ctx2,t,X,Y,maxW,lh){
  var words=(t||"").split(" "),line="",y=Y;
  for(var i=0;i<words.length;i++){
    var test=line?line+" "+words[i]:words[i];
    if(ctx2.measureText(test).width>maxW && line){ ctx2.fillText(line,X,y); y+=lh; line=words[i] }
    else line=test;
  }
  if(line){ ctx2.fillText(line,X,y); y+=lh }
  return y;
}
function dt(ms){
  var d=new Date(ms||Date.now()),p=function(n){return("0"+n).slice(-2)};
  return p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear()+" "+p(d.getHours())+":"+p(d.getMinutes());
}
function dl(canvas,name){
  try{ var a=document.createElement("a"); a.download=name; a.href=canvas.toDataURL("image/png"); a.click(); msg("Đã tải báo cáo PNG") }
  catch(e){ msg("Không lưu được ảnh: "+e.message,true) }
}
function head(x,W2,title,p){
  x.fillStyle="#0a121d"; x.fillRect(0,0,W2,74);
  x.fillStyle="#22d3ee"; x.fillRect(0,0,W2,4);
  x.fillStyle="#e8eef6"; x.font="800 21px Segoe UI,Arial"; x.textAlign="left";
  x.fillText(title,26,34);
  x.fillStyle="#8ea3bf"; x.font="13px Segoe UI,Arial";
  x.fillText("Địa điểm: "+p.name+"     ·     Lập lúc "+dt(),26,57);
}

function reportPro(){
  var p=cur()||blank("—"), cvs=g("rta");
  var W2=1000, chartW=W2-52, chartH=Math.round(chartW*cvs.clientHeight/cvs.clientWidth);
  var rows=peq.length, mrk=marks.length;
  var H2=74+40+chartH+52+ (rows?rows*24+56:34) + (mrk?46:0) + 150;
  var o=document.createElement("canvas"), s=2;
  o.width=W2*s; o.height=H2*s;
  var x=o.getContext("2d"); x.setTransform(s,0,0,s,0,0);
  x.fillStyle="#0d1521"; x.fillRect(0,0,W2,H2);
  head(x,W2,"BÁO CÁO CÂN CHỈNH ÂM THANH — SoundTune Pro",p);

  var y=100;
  x.fillStyle="#8ea3bf"; x.font="12.5px Segoe UI,Arial";
  x.fillText("Tốc độ đo: "+g("speed").options[g("speed").selectedIndex].text+
    "   ·   NearField Sub: "+(g("nf").checked?"BẬT":"tắt")+
    "   ·   Ngưỡng báo hú: "+g("thr").value+" dB"+
    "   ·   Hiệu chuẩn SPL: "+g("cal").value+" dB",26,y);
  y+=18;
  x.drawImage(cvs,26,y,chartW,chartH);
  x.strokeStyle="#22314a"; x.strokeRect(26,y,chartW,chartH);
  y+=chartH+26;

  var lx=26;
  for(var i2=0;i2<6;i2++){
    if(!snaps[i2]) continue;
    x.fillStyle=SNAPCOL[i2]; x.fillRect(lx,y-8,18,3);
    x.fillStyle="#cbd5e1"; x.font="11.5px Segoe UI,Arial"; x.fillText("DSP "+(i2+1),lx+23,y-4);
    lx+=86;
  }
  y+=18;

  x.fillStyle="#22d3ee"; x.font="800 14px Segoe UI,Arial";
  x.fillText("THÔNG SỐ CẮT PEQ ĐỀ NGHỊ (từ các lần phát hiện hú rít)",26,y); y+=8;
  if(!rows){
    x.fillStyle="#8ea3bf"; x.font="12.5px Segoe UI,Arial";
    x.fillText("Chưa ghi nhận lần hú rít nào trong phiên này.",26,y+18); y+=34;
  }else{
    y+=14;
    var cols=[26,190,330,470,610,780], hd=["Tần số trung tâm","Q-Factor","Dải tần (BW)","Mức cắt","Vượt ngưỡng","Số lần"];
    x.fillStyle="#8ea3bf"; x.font="700 11px Segoe UI,Arial";
    for(var c2=0;c2<hd.length;c2++) x.fillText(hd[c2].toUpperCase(),cols[c2],y);
    y+=6; x.strokeStyle="#22314a"; x.beginPath(); x.moveTo(26,y); x.lineTo(W2-26,y); x.stroke(); y+=18;
    for(var r=0;r<rows;r++){
      var q=peq[r];
      x.font="700 13px Segoe UI,Arial"; x.fillStyle="#22d3ee"; x.fillText(fmtF(q.f),cols[0],y);
      x.font="13px Segoe UI,Arial"; x.fillStyle="#e8eef6";
      x.fillText(q.Q.toFixed(1),cols[1],y);
      x.fillText(Math.round(q.bw)+" Hz",cols[2],y);
      x.fillStyle="#fca5a5"; x.fillText(q.cut.toFixed(1)+" dB",cols[3],y);
      x.fillStyle="#e8eef6"; x.fillText("+"+q.prom.toFixed(1)+" dB",cols[4],y);
      x.fillStyle="#8ea3bf"; x.fillText(String(q.n),cols[5],y);
      y+=24;
      x.strokeStyle="rgba(255,255,255,.05)"; x.beginPath(); x.moveTo(26,y-16); x.lineTo(W2-26,y-16); x.stroke();
    }
    y+=10;
  }

  if(mrk){
    x.fillStyle="#f472b6"; x.font="800 13px Segoe UI,Arial";
    var ms=[]; for(var m=0;m<marks.length;m++) ms.push(fmtF(marks[m]));
    x.fillText("Tần số đã đánh dấu theo dõi: "+ms.join("  ·  "),26,y+16); y+=40;
  }

  x.fillStyle="#22d3ee"; x.font="800 14px Segoe UI,Arial"; x.fillText("GHI CHÚ",26,y+14);
  x.fillStyle="#cbd5e1"; x.font="12.5px Segoe UI,Arial";
  y=wrapTxt(0,x,(p.note||"(không có ghi chú)"),26,y+36,W2-52,18);

  x.fillStyle="#5c7192"; x.font="11px Segoe UI,Arial";
  x.fillText("SoundTune Pro · Số đo dBFS mang tính tương đối theo micro sử dụng, dùng để so sánh và cân chỉnh.",26,H2-18);
  dl(o,"baocao-"+p.name.replace(/[^\w]+/g,"_")+"-"+Date.now()+".png");
}

function reportEasy(){
  var p=cur()||blank("—");
  if(!lastEasy){ msg("Hãy bấm ĐO trước khi xuất báo cáo",true); return }
  var W2=880, resC=g("res");
  var chartW=W2-52, chartH=Math.round(chartW*resC.clientHeight/Math.max(1,resC.clientWidth));
  var it=lastEasy.items, hist=(p.hist||[]).slice(-10);
  var H2=74+150+it.length*74+chartH+ (hist.length?60:0) +140;
  var o=document.createElement("canvas"), s=2;
  o.width=W2*s; o.height=H2*s;
  var x=o.getContext("2d"); x.setTransform(s,0,0,s,0,0);
  x.fillStyle="#0a0f16"; x.fillRect(0,0,W2,H2);
  head(x,W2,"BÁO CÁO CÂN CHỈNH ÂM THANH",p);

  var y=112, sc=lastEasy.score;
  var col= sc>=80?"#22c55e": sc>=60?"#a3e635": sc>=40?"#eab308":"#ef4444";
  x.fillStyle=col; x.beginPath(); x.arc(70,y+18,44,0,7); x.fill();
  x.fillStyle="#04202b"; x.textAlign="center";
  x.font="900 31px Segoe UI,Arial"; x.fillText(String(sc),70,y+26);
  x.font="800 10px Segoe UI,Arial"; x.fillText("ĐIỂM",70,y+42);
  x.textAlign="left";
  x.fillStyle="#eaf1f9"; x.font="800 19px Segoe UI,Arial"; x.fillText(lastEasy.status||"",132,y+10);
  x.fillStyle="#8ea3bf"; x.font="13px Segoe UI,Arial";
  var pname=(typeof PRE!=="undefined"&&PRE[onIdx("#presets")])?PRE[onIdx("#presets")].n:"—";
  x.fillText("Kiểu dàn: "+pname+"     ·     Đo lúc "+dt(lastEasy.when),132,y+34);
  x.fillText("Mức cảnh báo hú: "+["Tắt","Ít nhạy","Vừa","Nhạy"][onIdx("#sens")]+"     ·     BPM: "+g("bpm").value,132,y+54);
  y+=100;

  x.fillStyle="#38bdf8"; x.font="800 14px Segoe UI,Arial"; x.fillText("VIỆC CẦN LÀM",26,y); y+=14;
  for(var i=0;i<it.length;i++){
    x.fillStyle="#0d1622"; x.fillRect(26,y,W2-52,64);
    x.fillStyle="#38bdf8"; x.fillRect(26,y,4,64);
    x.fillStyle="#eaf1f9"; x.font="700 13.5px Segoe UI,Arial";
    x.fillText(it[i].t.substring(0,90),42,y+20);
    x.fillStyle="#8ea3bf"; x.font="12px Segoe UI,Arial";
    x.fillText(it[i].s.substring(0,110),42,y+38);
    x.fillStyle="#7dd3fc"; x.font="700 12.5px Segoe UI,Arial";
    x.fillText(it[i].d.substring(0,110),42,y+56);
    y+=74;
  }

  x.fillStyle="#38bdf8"; x.font="800 14px Segoe UI,Arial"; x.fillText("ĐỘ LỆCH SO VỚI CHUẨN",26,y+4); y+=16;
  x.drawImage(resC,26,y,chartW,chartH);
  x.strokeStyle="#22314a"; x.strokeRect(26,y,chartW,chartH);
  y+=chartH+30;

  if(hist.length){
    x.fillStyle="#38bdf8"; x.font="800 13px Segoe UI,Arial"; x.fillText("LỊCH SỬ ĐIỂM",26,y);
    x.font="12.5px Segoe UI,Arial"; x.fillStyle="#cbd5e1";
    var hs=[]; for(var h2=0;h2<hist.length;h2++) hs.push(dt(hist[h2].t)+": "+hist[h2].s+" điểm");
    y=wrapTxt(0,x,hs.join("   ·   "),26,y+20,W2-52,17)+12;
  }

  x.fillStyle="#38bdf8"; x.font="800 13px Segoe UI,Arial"; x.fillText("GHI CHÚ",26,y);
  x.fillStyle="#cbd5e1"; x.font="12.5px Segoe UI,Arial";
  y=wrapTxt(0,x,(p.note||"(không có ghi chú)"),26,y+20,W2-52,18);

  x.fillStyle="#5c7192"; x.font="11px Segoe UI,Arial";
  x.fillText("SoundTune Easy · Đo bằng micro thiết bị, dùng để so sánh trước/sau khi chỉnh.",26,H2-18);
  dl(o,"baocao-"+p.name.replace(/[^\w]+/g,"_")+"-"+Date.now()+".png");
}

g("stRep").onclick=function(){ collect(); if(IS_PRO) reportPro(); else reportEasy() };

/* ================= KHỞI ĐỘNG ================= */
load(); fillSel(); apply();
window.addEventListener("pagehide",collect);
document.addEventListener("visibilitychange",function(){ if(document.visibilityState==="hidden") collect() });
msg("Hồ sơ: "+(cur()?cur().name:""));
})();
