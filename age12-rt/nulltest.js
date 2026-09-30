// Null test: the ORIGINAL offline chain (extracted verbatim from age12-v1_4.html)
// vs. the streaming C++ implementation. Usage: node nulltest.js <path-to-age12_cli>
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const cli = process.argv[2];
const html = fs.readFileSync(path.join(__dirname, '..', 'age12-v1_4.html'), 'utf8');
const a = html.indexOf('function resample(');
const b = html.indexOf('function mixDryWet(');
const { ageSample, MODELS } = new Function(html.slice(a, b) + '\nreturn {ageSample, MODELS};')();

// deterministic test material: sweep + kick + hat bursts + noise bursts, peak ~0.9
function material(rate, seconds) {
  const n = Math.floor(rate * seconds), x = new Float32Array(n);
  let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const f = 50 * Math.pow(15000 / 50, (t % 1.5) / 1.5);       // repeating log sweep
    ph += 2 * Math.PI * f / rate;
    let v = 0.25 * Math.sin(ph);
    const tk = t % 0.5;                                           // kick every 0.5 s
    v += 0.6 * Math.exp(-tk * 18) * Math.sin(2 * Math.PI * (45 + 120 * Math.exp(-tk * 30)) * tk);
    const th = (t + 0.25) % 0.5;                                  // hat between kicks
    v += 0.2 * Math.exp(-th * 60) * rnd();
    v += (t % 1.0 > 0.9 ? 0.3 : 0.01) * rnd();                    // noise burst + floor
    x[i] = v;
  }
  let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  for (let i = 0; i < n; i++) x[i] *= 0.9 / pk;
  return x;
}

const cases = [
  { name: 'SP-1200  +12st  44.1k', rate: 44100, st: 12, m: 'sp1200',  pre: 0.0 },
  { name: 'SP-1200  +12st  48k  pre=.3', rate: 48000, st: 12, m: 'sp1200', pre: 0.3 },
  { name: 'SP-1200  +7st   48k', rate: 48000, st: 7,  m: 'sp1200',  pre: 0.0 },
  { name: 'MPC60    +19st  44.1k (companded)', rate: 44100, st: 19, m: 'mpc60', pre: 0.15 },
  { name: 'MPC60    +5.5st 96k (fractional)', rate: 96000, st: 5.5, m: 'mpc60', pre: 0.0 },
  { name: 'MPC3000  +0st   44.1k (no pitch trick)', rate: 44100, st: 0, m: 'mpc3000', pre: 0.0 },
  { name: 'SP-1200  +24st  48k (extreme)', rate: 48000, st: 24, m: 'sp1200', pre: 0.0 },
];
const tmp = process.env.TMPDIR || '/tmp';
let worst = -999;
for (const c of cases) {
  const x = material(c.rate, 3.0), M = MODELS[c.m];
  const ref = ageSample(x, c.rate, c.st, M.rate, M.bits, c.pre, M.quant, M.filtCut, M.filtRes, M.sat, M.noise, M.asym).buffer;
  const fin = path.join(tmp, 'age12_in.f32'), fout = path.join(tmp, 'age12_out.f32');
  fs.writeFileSync(fin, Buffer.from(x.buffer));
  const L = parseInt(cp.execFileSync(cli, [fin, fout, c.rate, c.st, M.rate, M.bits, c.pre, M.quant === 'companded' ? 1 : 0,
    M.filtCut, M.filtRes, M.sat, M.noise, M.asym, 24]).toString().trim(), 10);
  const raw = fs.readFileSync(fout); const got = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  let maxd = 0, se = 0, sr = 0, cnt = 0, big = 0;
  const end = Math.min(got.length, ref.length + L) - 200;           // skip tail: offline clamps at buffer end
  for (let n = L; n < end; n++) {
    const d = got[n] - ref[n - L]; maxd = Math.max(maxd, Math.abs(d)); se += d * d; sr += ref[n - L] ** 2; cnt++;
    if (Math.abs(d) > 1e-4) big++;
  }
  const db = 10 * Math.log10((se / cnt + 1e-30) / (sr / cnt));
  worst = Math.max(worst, db);
  console.log(`${c.name.padEnd(42)} latency=${String(L).padStart(2)} smp  max|diff|=${maxd.toExponential(2)}  error=${db.toFixed(1).padStart(7)} dB  samples>1e-4: ${big}/${cnt}`);
}
console.log(`\nworst-case error vs. original offline chain: ${worst.toFixed(1)} dB`);

// CPU cost: 60 s of audio at 48 kHz, SP-1200 +12st
{
  const x = material(48000, 60), M = MODELS.sp1200;
  fs.writeFileSync(path.join(tmp, 'age12_in.f32'), Buffer.from(x.buffer));
  const t0 = process.hrtime.bigint();
  cp.execFileSync(cli, [path.join(tmp, 'age12_in.f32'), path.join(tmp, 'age12_out.f32'), 48000, 12, M.rate, M.bits, 0, 0, M.filtCut, M.filtRes, M.sat, M.noise, M.asym, 24]);
  const s = Number(process.hrtime.bigint() - t0) / 1e9;
  console.log(`CPU: 60 s of audio processed in ${s.toFixed(2)} s  ->  ~${(s / 60 * 100).toFixed(2)} % of one core (incl. file I/O)`);
}
