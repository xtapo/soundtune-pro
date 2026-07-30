/* Test tinh: bat cac loi tung xay ra that voi du an nay
   - lech thuat toan giua dsp.js va lab.js / ring.js
   - goi getElementById voi id khong ton tai
   - dung bien global cua app.js ma app.js khong con dinh nghia
   - file bi cat mat mot doan khi push (kiem tra bang cu phap + duoi file)
   - viet tieng Viet bang HTML numeric entity (&#7871;) lam hong chu
   - index.html nap thieu hoac sai thu tu script
   - sw.js chua cache het file can chay offline */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const lab = read("lab.js");
const ring = read("ring.js");
const dsp = read("dsp.js");
const app = read("app.js");
const extras = read("extras.js");
const index = read("index.html");
const sw = read("sw.js");

/* ---------- 1. dsp.js phai giong het thuat toan dang chay ---------- */
const PARITY = [
  ["envelope: cua so 20 ms", lab, "Math.round(sr*0.02)"],
  ["envelope: buoc 5 ms", lab, "Math.round(sr*0.005)"],
  ["RT60: nguong T20", lab, "dyn>=33"],
  ["RT60: nguong T15", lab, "dyn>=28"],
  ["RT60: nguong T10", lab, "dyn>=19"],
  ["RT60: T20 x3", lab, "(t25-t5)*3"],
  ["RT60: T15 x4", lab, "(t20-t5)*4"],
  ["RT60: T10 x6", lab, "(t15-t5)*6"],
  ["pha: nguong SNR 8 dB", lab, "if(snr<8) return null;"],
  ["pha: nguong bat xung 0.45", lab, "0.45*mx"],
  ["pha: nguong xung hop le 0.28", lab, "0.28*mx"],
  ["delay: giam mau 4 lan", lab, "var D=4;"],
  ["delay: loai bo khi dinh yeu", lab, "if(bv<rms*4) return null;"],
  ["delay: toc do am thanh 343", lab, "SP=343"],
  ["du doan: cua so lan can +-5 bang", ring, "for(i=b-5;i<=b+5;i++)"],
  ["du doan: bo qua +-1 bang", ring, "(i>=b-1&&i<=b+1)"],
  ["du doan: vong dem lich su", ring, "hp[b][(hn-n+i+HN*4)%HN]"],
  ["du doan: buoc thoi gian", ring, "x=(i-(n-1))*HDT/1000;"],
  ["bo nho hu: gop trong 3.5 %", ring, "/f<0.035"],
  ["bo nho hu: cong thuc muc cat", ring, "Math.round(it.prom*0.55*2)/2"],
  ["bo nho hu: cong thuc diem uu tien", ring, "it.n*2+it.np*0.6+it.prom/6"],
];
for (const [name, src, needle] of PARITY) {
  test(`parity: ${name}`, () => {
    assert.ok(src.includes(needle), `file dang chay khong con chua: ${needle}`);
    assert.ok(dsp.includes(needle), `dsp.js bi lech, thieu: ${needle}`);
  });
}

test("parity: bang do nhay va thoi gian cho van dung", () => {
  assert.ok(ring.includes("md:{prom:6.5,slope:3.4,lvl:-62}"), "bang SENS da doi");
  assert.ok(ring.includes("HN=22, HDT=120"), "chu ky do da doi");
  assert.ok(ring.includes("now-cool[o.b]<9000"), "thoi gian cho 9 s da doi");
  assert.ok(lab.includes("RT_BANDS=[63,125,250,500,1000,2000,4000]"), "danh sach dai RT60 da doi");
});

/* ---------- 2. Moi id duoc goi phai ton tai o dau do ---------- */
function idsIn(src) {
  const out = new Set();
  for (const m of src.matchAll(/id=\\?["']([A-Za-z][\w-]*)/g)) out.add(m[1]);
  for (const m of src.matchAll(/\.id\s*=\s*["']([A-Za-z][\w-]*)["']/g)) out.add(m[1]);
  return out;
}
function refsIn(src) {
  const out = new Set();
  for (const m of src.matchAll(/\bE\(["']([A-Za-z][\w-]*)["']\)/g)) out.add(m[1]);
  for (const m of src.matchAll(/getElementById\(["']([A-Za-z][\w-]*)["']\)/g)) out.add(m[1]);
  return out;
}
for (const [name, src] of [["lab.js", lab], ["ring.js", ring]]) {
  test(`${name}: moi id duoc goi deu co that`, () => {
    const own = idsIn(src);
    const outside = index + "\n" + app + "\n" + extras;
    const missing = [];
    for (const id of refsIn(src)) {
      if (own.has(id)) continue;
      if (outside.includes('"' + id + '"') || outside.includes("'" + id + "'")) continue;
      missing.push(id);
    }
    assert.deepEqual(missing, [], `id khong tim thay o dau ca: ${missing.join(", ")}`);
  });
}

/* ---------- 3. Global cua app.js ma lab.js / ring.js dua vao ---------- */
const GLOBALS = ["ac", "micSrc", "ensureCtx", "frozen", "running", "disp", "ISO", "NB", "fmtF", "sayF", "speak", "showAlert"];
for (const g of GLOBALS) {
  test(`app.js van con dinh nghia "${g}"`, () => {
    const re = new RegExp("(function\\s+" + g + "\\b)|(\\b" + g + "\\s*=[^=])|(\\b" + g + "\\s*,)");
    assert.ok(re.test(app), `app.js khong con "${g}" - lab.js/ring.js se hong`);
  });
}

/* ---------- 4. File khong bi cat mat doan khi push ---------- */
for (const [name, src] of [["lab.js", lab], ["ring.js", ring], ["extras.js", extras], ["dsp.js", dsp]]) {
  test(`${name}: dong goi kin (khong bi cat giua file)`, () => {
    assert.ok(src.trimEnd().endsWith("})();") || src.trimEnd().endsWith("}"), "duoi file khong dung");
    let bal = 0;
    for (const ch of src) { if (ch === "{") bal++; else if (ch === "}") bal--; }
    assert.ok(Math.abs(bal) <= 8, `so ngoac lech ${bal} - co the file bi cat`);
  });
}

/* ---------- 5. Khong viet tieng Viet bang HTML numeric entity ---------- */
for (const [name, src] of [["lab.js", lab], ["ring.js", ring], ["index.html", index], ["extras.js", extras]]) {
  test(`${name}: khong dung HTML numeric entity cho tieng Viet`, () => {
    const bad = src.match(/&#\d{3,5};/g);
    assert.equal(bad, null, `tim thay: ${bad && bad.slice(0, 5).join(" ")}`);
  });
}

/* ---------- 6. index.html nap du va dung thu tu script ---------- */
test("index.html: nap du 4 script va dung thu tu", () => {
  const order = ["app.js", "extras.js", "lab.js", "ring.js"].map((f) => index.indexOf('src="' + f + '"'));
  for (let i = 0; i < order.length; i++) assert.ok(order[i] > -1, `index.html khong nap ${["app.js", "extras.js", "lab.js", "ring.js"][i]}`);
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], "thu tu script bi sai");
});

test("index.html: co canvas#rta va cac o dieu khien lab/ring can", () => {
  for (const id of ["rta", "thr", "tts", "alert", "mode", "speed"]) {
    assert.ok(index.includes('id="' + id + '"'), `thieu id="${id}"`);
  }
});

/* ---------- 7. sw.js phai cache het file can chay offline ---------- */
test("sw.js: cache du moi script ma index.html nap", () => {
  const missing = [];
  for (const m of index.matchAll(/src="([\w.-]+\.js)"/g)) {
    if (!sw.includes(m[1])) missing.push(m[1]);
  }
  assert.deepEqual(missing, [], `sw.js chua cache: ${missing.join(", ")} - mo offline se loi`);
});
