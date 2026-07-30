/* SoundTune Pro - dsp.js
   Cac ham toan hoc thuan (khong can Web Audio, khong can DOM) duoc tach ra tu
   lab.js (RT60 / pha / delay) va ring.js (du doan hu / ring-out) de chay unit
   test bang Node. Dung duoc ca trong Node (require) va trong trinh duyet
   (window.STdsp).

   QUAN TRONG: neu sua thuat toan trong lab.js hoac ring.js thi phai sua ca o
   day. test/static.test.mjs se bao do khi hai ben lech nhau. */
(function(){
"use strict";
var SP=343; /* m/s */

/* ================= lab.js - 6. RT60 ================= */

/* Duong bao nang luong theo dB: cua so 20 ms, buoc 5 ms */
function envelope(x,n,sr){
  var win=Math.round(sr*0.02), hop=Math.round(sr*0.005);
  var t=[],db=[],i,j;
  for(i=0;i+win<=n;i+=hop){
    var s=0; for(j=i;j<i+win;j++) s+=x[j]*x[j];
    db.push(10*Math.log10(s/win+1e-20)); t.push(i/sr);
  }
  return {t:t,db:db};
}

/* Tim thoi diem tat tieng.

   Cach cu (chon doan 60 ms tut manh nhat) SAI: duong dang cua phong gan nhu
   la duong thang deu theo dB, nen moi diem trong ca doan dang tut deu tut
   bang nhau. Chi can nhieu 0.2 dB la bat nham cho, roi decay() lay muc chuan
   l0 ngay trong doan dang tut => RT60 do ra ngan hon that (phong 0.6 s bao
   0.37 s, sai 38 %).

   Cach moi: lay muc on dinh luc con phat (plat) va nen im sau khi tat (flo)
   bang phan vi, roi do NGUOC tu cuoi ve dau tim khung cuoi cung con nam o
   muc on dinh - do chinh la mep tat tieng. Bat buoc 300 ms sau do phai tut
   that su de khong bat nham mot tieng dong la giua tail. */
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

/* T20 / T15 / T10 quy doi ra RT60 (ISO 3382) */
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

/* Phan loai phong theo RT60 dai giua */
function rtClass(m){
  if(m<0.45) return "dry";
  if(m<0.9) return "good";
  if(m<1.4) return "live";
  return "toolive";
}
function bassBoom(bassRt,midRt){ return bassRt>midRt*1.45 }

/* ================= lab.js - 7. Pha / dao cuc ================= */
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
function polSame(A,B){ return { same:A.sign===B.sign, conf:Math.min(A.conf,B.conf) } }

/* ================= lab.js - 8. Can tre (delay) ================= */
function dec(x,n,D){
  var m=Math.floor(n/D), o=new Float32Array(m), i, j;
  for(i=0;i<m;i++){ var s=0; for(j=0;j<D;j++) s+=x[i*D+j]; o[i]=s/D }
  return o;
}

/* Tuong quan cheo: tim do tre cua ref trong x */
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

/* Ra cau lenh dat delay tu hai lan do */
function dlyAdvice(A,B){
  var dt=(B.t-A.t)*1000, ad=Math.abs(dt);
  var early = dt>0 ? A : B, late = dt>0 ? B : A;
  var dist=ad/1000*SP;
  return { dt:dt, ms:ad, early:early, late:late,
           cm:dist*100, m:dist, ft:dist*3.281, aligned:ad<0.35 };
}

/* ================= ring.js - 9. Du doan hu ================= */

/* Do nho cua mot bang so voi nen pho xung quanh (bo qua +-1 bang) */
function localProm(disp,b,NB){
  var v=[],i;
  for(i=b-5;i<=b+5;i++){ if(i<0||i>=NB||(i>=b-1&&i<=b+1)) continue; v.push(disp[i]) }
  if(!v.length) return 0;
  v.sort(function(x,y){return x-y});
  return disp[b]-v[Math.floor(v.length/2)];
}

/* Toc do dang cua mot bang: hoi quy tuyen tinh tren n mau, tra ve dB/giay */
function slopeOf(hp,b,n,hn,HN,HDT){
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

/* ================= ring.js - 10. Bo nho hu ================= */
function cutOf(it){ return -Math.min(10,Math.max(3,Math.round(it.prom*0.55*2)/2)) }
function score(it){ return it.n*2+it.np*0.6+it.prom/6 }

/* Gop diem hu theo tan so: lech duoi 3.5 % coi la mot diem */
function mergeHit(items,f,prom,Q,bw,kind){
  var i,it=null;
  for(i=0;i<items.length;i++){ if(Math.abs(items[i].f-f)/f<0.035){ it=items[i]; break } }
  if(!it){ it={f:f,n:0,np:0,prom:0,Q:Q||8,bw:bw||0}; items.push(it) }
  var w=it.n+it.np;
  it.f=(it.f*w+f)/(w+1);
  if(kind==="real") it.n++; else it.np++;
  if(prom>it.prom) it.prom=prom;
  if(Q) it.Q=Q;
  if(bw) it.bw=bw;
  return it;
}

var API={ SP:SP, envelope:envelope, findCut:findCut, decay:decay, rtClass:rtClass,
  bassBoom:bassBoom, polSign:polSign, polSame:polSame, dec:dec, xcorr:xcorr,
  dlyAdvice:dlyAdvice, localProm:localProm, slopeOf:slopeOf, cutOf:cutOf,
  score:score, mergeHit:mergeHit };

if(typeof module!=="undefined" && module.exports) module.exports=API;
if(typeof window!=="undefined") window.STdsp=API;
})();
