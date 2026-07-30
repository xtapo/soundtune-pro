/* Unit test cho phan DSP: RT60, pha/dao cuc, can tre, du doan hu, bo nho hu.
   Chay: npm test   (hoac: node --test test/) */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dsp = require("../dsp.js");

/* PRNG co dinh hat giong => test khong bao gio flaky */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Tao ban thu gia lap: nhieu day 2.25 s roi tat dot ngot, duoi tat theo RT60 cho truoc */
function synthRT(rt60, floorAmp = 1e-4, sr = 48000) {
  const pre = 2.25, tail = 3.0, n = Math.round(sr * (pre + tail));
  const x = new Float32Array(n), r = rng(7);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const a = t < pre ? 1 : Math.pow(10, (-3 * (t - pre)) / rt60);
    x[i] = (r() * 2 - 1) * a + (r() * 2 - 1) * floorAmp;
  }
  return { x, n, sr };
}

/* ================= 6. RT60 ================= */

test("envelope: dung so khung va buoc 5 ms", () => {
  const sr = 48000, n = sr; // 1 giay
  const x = new Float32Array(n).fill(0.1);
  const e = dsp.envelope(x, n, sr);
  assert.equal(e.t.length, e.db.length);
  assert.ok(e.t.length > 190 && e.t.length < 200, `so khung = ${e.t.length}`);
  assert.ok(Math.abs(e.t[1] - e.t[0] - 0.005) < 1e-9);
  assert.ok(Math.abs(e.db[10] - 10 * Math.log10(0.01)) < 0.1);
});

test("findCut: bat dung thoi diem tat tieng (2.25 s)", () => {
  const { x, n, sr } = synthRT(1.2);
  const e = dsp.envelope(x, n, sr);
  const cut = dsp.findCut(e);
  assert.ok(cut.i > 0, "khong tim ra diem tat");
  assert.ok(Math.abs(e.t[cut.i] - 2.25) < 0.12, `t_cut = ${e.t[cut.i]}`);
  assert.ok(cut.drop > 6, `bien do tat = ${cut.drop}`);
});

for (const rt of [0.6, 1.2, 2.2]) {
  test(`decay: doi lai dung RT60 = ${rt} s (sai so < 15 %)`, () => {
    const { x, n, sr } = synthRT(rt);
    const e = dsp.envelope(x, n, sr);
    const cut = dsp.findCut(e);
    const r = dsp.decay(e, cut.i);
    assert.ok(r, "decay tra ve null");
    const err = Math.abs(r.rt - rt) / rt;
    assert.ok(err < 0.15, `do duoc ${r.rt.toFixed(3)} s (${r.kind}), lech ${(err * 100).toFixed(1)} %`);
    assert.ok(r.dyn > 19, `dai dong = ${r.dyn}`);
  });
}

test("decay: tra null khi phong on qua, khong du dai dong", () => {
  const { x, n, sr } = synthRT(1.2, 0.25);
  const e = dsp.envelope(x, n, sr);
  const cut = dsp.findCut(e);
  assert.equal(dsp.decay(e, cut.i), null);
});

test("rtClass + bassBoom: phan loai phong dung nguong", () => {
  assert.equal(dsp.rtClass(0.30), "dry");
  assert.equal(dsp.rtClass(0.44), "dry");
  assert.equal(dsp.rtClass(0.70), "good");
  assert.equal(dsp.rtClass(1.10), "live");
  assert.equal(dsp.rtClass(2.00), "toolive");
  assert.equal(dsp.bassBoom(1.5, 1.0), true);
  assert.equal(dsp.bassBoom(1.4, 1.0), false);
});

/* ================= 7. Pha / dao cuc ================= */

function synthPulses(sign, amp = 0.9, noise = 0.01, sr = 48000) {
  const gap = 0.25, N = 6, n = Math.round(sr * (0.3 + N * gap + 0.5));
  const x = new Float32Array(n), r = rng(3);
  for (let i = 0; i < n; i++) x[i] = (r() * 2 - 1) * noise;
  const plen = Math.max(8, Math.round((sr * 0.5) / 250));
  for (let k = 0; k < N; k++) {
    const s0 = Math.round(sr * (0.3 + k * gap));
    for (let i = 0; i < plen; i++) x[s0 + i] += sign * amp * Math.sin((Math.PI * i) / plen);
  }
  return { x, n, sr, gap, N };
}

test("polSign: xung duong => dau DUONG, tin cay 100 %", () => {
  const p = synthPulses(1);
  const r = dsp.polSign(p.x, p.n, p.sr, p.gap, p.N);
  assert.ok(r, "polSign tra null");
  assert.equal(r.sign, 1);
  assert.ok(r.conf > 0.99, `conf = ${r.conf}`);
  assert.ok(r.snr > 20, `snr = ${r.snr}`);
});

test("polSign: dao cuc loa => dau AM (day la loi can bat)", () => {
  const p = synthPulses(-1);
  const r = dsp.polSign(p.x, p.n, p.sr, p.gap, p.N);
  assert.ok(r);
  assert.equal(r.sign, -1);
  assert.ok(r.conf > 0.99);
});

test("polSign: tra null khi qua on (SNR < 8 dB) thay vi ket luan bua", () => {
  const p = synthPulses(1, 0.02, 0.3);
  assert.equal(dsp.polSign(p.x, p.n, p.sr, p.gap, p.N), null);
});

test("polSame: hai loa cung dau = dung, khac dau = nguoc cuc", () => {
  assert.equal(dsp.polSame({ sign: 1, conf: 1 }, { sign: 1, conf: 0.8 }).same, true);
  assert.equal(dsp.polSame({ sign: 1, conf: 1 }, { sign: -1, conf: 0.8 }).same, false);
  assert.equal(dsp.polSame({ sign: 1, conf: 1 }, { sign: -1, conf: 0.6 }).conf, 0.6);
});

/* ================= 8. Can tre (delay) ================= */

function synthBurst(lagSamples, polarity = 1, noise = 0.002, sr = 48000) {
  const n = Math.round(sr * 0.5), nr = Math.round(sr * 0.006);
  const r = rng(11), ref = new Float32Array(nr);
  for (let i = 0; i < nr; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / nr);
    ref[i] = w * (r() * 2 - 1);
  }
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = (r() * 2 - 1) * noise;
  for (let i = 0; i < nr; i++) x[lagSamples + i] += polarity * 0.5 * ref[i];
  return { x, n, ref, nr, sr };
}

for (const lag of [480, 1200, 3333]) {
  test(`xcorr: tim dung do tre ${lag} mau (${((lag / 48) ).toFixed(2)} ms)`, () => {
    const s = synthBurst(lag);
    const r = dsp.xcorr(s.x, s.n, s.ref, s.nr, s.sr);
    assert.ok(r, "xcorr tra null");
    const got = Math.round(r.t * s.sr);
    assert.ok(Math.abs(got - lag) <= 2, `do duoc ${got} mau, that la ${lag}`);
    assert.equal(r.sign, 1);
  });
}

test("xcorr: nhan ra xung bi dao dau (sign = -1)", () => {
  const s = synthBurst(960, -1);
  const r = dsp.xcorr(s.x, s.n, s.ref, s.nr, s.sr);
  assert.ok(r);
  assert.equal(r.sign, -1);
  assert.ok(Math.abs(Math.round(r.t * s.sr) - 960) <= 2);
});

test("xcorr: chi co nhieu => do ro thap hon nhieu so voi khi co xung that", () => {
  const good = dsp.xcorr(...(() => { const s = synthBurst(960); return [s.x, s.n, s.ref, s.nr, s.sr] })());
  const s = synthBurst(960, 1, 0.002);
  for (let i = 0; i < s.n; i++) s.x[i] = (i * 2654435761 % 1000) / 1000 - 0.5; // nhieu, khong co xung
  const bad = dsp.xcorr(s.x, s.n, s.ref, s.nr, s.sr);
  assert.ok(good && good.q > 8, `q khi co xung = ${good && good.q}`);
  assert.ok(bad === null || bad.q < good.q / 3, `q khi chi co nhieu = ${bad && bad.q}`);
});

test("dlyAdvice: ra dung so ms va dung loa can dat delay", () => {
  const A = { t: 0.0100, name: "Loa chinh" }, B = { t: 0.0224, name: "Loa phu" };
  const r = dsp.dlyAdvice(A, B);
  assert.ok(Math.abs(r.ms - 12.4) < 0.01, `ms = ${r.ms}`);
  assert.equal(r.early.name, "Loa chinh");
  assert.equal(r.late.name, "Loa phu");
  assert.ok(Math.abs(r.cm - 425.3) < 1, `cm = ${r.cm}`);
  assert.ok(Math.abs(r.ft - 13.95) < 0.1, `ft = ${r.ft}`);
  assert.equal(r.aligned, false);
});

test("dlyAdvice: lech duoi 0.35 ms coi nhu da trung, khong can delay", () => {
  const r = dsp.dlyAdvice({ t: 0.01, name: "A" }, { t: 0.0102, name: "B" });
  assert.equal(r.aligned, true);
});

test("dlyAdvice: doi thu tu do van ra cung mot ket luan", () => {
  const A = { t: 0.0224, name: "Loa phu" }, B = { t: 0.0100, name: "Loa chinh" };
  const r = dsp.dlyAdvice(A, B);
  assert.ok(Math.abs(r.ms - 12.4) < 0.01);
  assert.equal(r.early.name, "Loa chinh");
});

/* ================= 9. Du doan hu ================= */

test("localProm: dinh nhon nho len => do nho dung bang chenh lech", () => {
  const NB = 31, d = new Array(NB).fill(-70);
  d[15] = -58;
  assert.ok(Math.abs(dsp.localProm(d, 15, NB) - 12) < 1e-9);
});

test("localProm: ca vung rong deu cao thi KHONG tinh la dinh nhon", () => {
  const NB = 31, d = new Array(NB).fill(-70);
  for (let i = 10; i <= 20; i++) d[i] = -58;
  assert.ok(Math.abs(dsp.localProm(d, 15, NB)) < 1e-9);
});

test("localProm: chay dung o hai bien (khong loi index)", () => {
  const NB = 31, d = new Array(NB).fill(-70);
  d[0] = -60; d[NB - 1] = -60;
  assert.ok(Math.abs(dsp.localProm(d, 0, NB) - 10) < 1e-9);
  assert.ok(Math.abs(dsp.localProm(d, NB - 1, NB) - 10) < 1e-9);
});

test("slopeOf: doc dung toc do dang 3.0 dB/giay", () => {
  const NB = 31, HN = 22, HDT = 120, rate = 3.0;
  const hp = [];
  for (let b = 0; b < NB; b++) hp.push(new Float32Array(HN));
  let hn = 0;
  for (let i = 0; i < 40; i++) { hp[5][hn % HN] = -20 + rate * ((i * HDT) / 1000); hn++ }
  const s = dsp.slopeOf(hp, 5, 10, hn, HN, HDT);
  assert.ok(Math.abs(s - rate) < 0.05, `slope = ${s}`);
});

test("slopeOf: dai dang xuong ra so am, dai phang ra 0", () => {
  const NB = 31, HN = 22, HDT = 120;
  const hp = [];
  for (let b = 0; b < NB; b++) hp.push(new Float32Array(HN));
  let hn = 0;
  for (let i = 0; i < 40; i++) {
    hp[1][hn % HN] = -20 - 4 * ((i * HDT) / 1000);
    hp[2][hn % HN] = -30;
    hn++;
  }
  assert.ok(Math.abs(dsp.slopeOf(hp, 1, 10, hn, HN, HDT) + 4) < 0.05);
  assert.ok(Math.abs(dsp.slopeOf(hp, 2, 10, hn, HN, HDT)) < 1e-6);
});

test("slopeOf: chua du mau thi tra 0 (khong doan bua luc moi bat mic)", () => {
  const HN = 22, HDT = 120, hp = [new Float32Array(HN)];
  hp[0][0] = -30; hp[0][1] = -20;
  assert.equal(dsp.slopeOf(hp, 0, 10, 2, HN, HDT), 0);
});

/* ================= 10. Bo nho hu ================= */

test("cutOf: muc cat theo do nho, kep trong khoang 3 - 10 dB", () => {
  assert.equal(dsp.cutOf({ prom: 2 }), -3);
  assert.equal(dsp.cutOf({ prom: 6.5 }), -3.5);
  assert.equal(dsp.cutOf({ prom: 12 }), -6.5);
  assert.equal(dsp.cutOf({ prom: 30 }), -10);
});

test("score: hu that nang hon canh bao som", () => {
  assert.ok(Math.abs(dsp.score({ n: 2, np: 3, prom: 12 }) - 7.8) < 1e-9);
  assert.ok(dsp.score({ n: 3, np: 0, prom: 10 }) > dsp.score({ n: 0, np: 3, prom: 10 }));
});

test("mergeHit: lech duoi 3.5 % thi gop, xa hon thi tach diem moi", () => {
  const items = [];
  dsp.mergeHit(items, 1000, 10, 8, 0, "real");
  assert.equal(items.length, 1);
  dsp.mergeHit(items, 1020, 12, 9, 0, "pre");
  assert.equal(items.length, 1);
  assert.ok(Math.abs(items[0].f - 1010) < 1e-9, `f = ${items[0].f}`);
  assert.equal(items[0].n, 1);
  assert.equal(items[0].np, 1);
  assert.equal(items[0].prom, 12);
  assert.equal(items[0].Q, 9);
  dsp.mergeHit(items, 1200, 8, 10, 0, "real");
  assert.equal(items.length, 2);
});

test("mergeHit: chi giu do nho lon nhat, khong bi ghi de bang so nho hon", () => {
  const items = [];
  dsp.mergeHit(items, 2000, 15, 8, 0, "real");
  dsp.mergeHit(items, 2000, 5, 8, 0, "real");
  assert.equal(items[0].prom, 15);
  assert.equal(items[0].n, 2);
});

test("mergeHit: TOP 5 sap dung thu tu uu tien", () => {
  const items = [];
  dsp.mergeHit(items, 375, 20, 9, 0, "real");
  dsp.mergeHit(items, 375, 20, 9, 0, "real");
  dsp.mergeHit(items, 1730, 8, 11, 0, "pre");
  dsp.mergeHit(items, 2500, 6, 11, 0, "pre");
  const top = items.slice(0).sort((a, b) => dsp.score(b) - dsp.score(a));
  assert.ok(Math.abs(top[0].f - 375) < 1);
  assert.ok(Math.abs(top[top.length - 1].f - 2500) < 1);
});
