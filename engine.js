/* SatCom Exercise Generator — engine (no DOM). */
(function (root) {
'use strict';
const lg = Math.log10, db = x => 10 * lg(x), lin = x => Math.pow(10, x / 10);
const C = 3e8, K_DB = -228.6, RE = 6378, R0 = 35786, RS = 42164;
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const invsum = (...xs) => -db(xs.reduce((s, x) => s + lin(-x), 0));
function erfc(x) { const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r; }
const Q = x => 0.5 * erfc(x / Math.SQRT2);
function Qinv(p) { let lo = 0, hi = 10; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (Q(m) > p) lo = m; else hi = m; } return (lo + hi) / 2; }
function erlangB(c, A) { let b = 1; for (let k = 1; k <= c; k++) b = A * b / (k + A * b); return b; }
function bisect(f, lo, hi, n = 200) { let flo = f(lo); for (let i = 0; i < n; i++) { const m = (lo + hi) / 2, fm = f(m); if ((fm > 0) === (flo > 0)) { lo = m; flo = fm; } else hi = m; } return (lo + hi) / 2; }
function fx(x, d = 3) { if (typeof x !== 'number' || !isFinite(x)) return String(x);
  const a = Math.abs(x); if (a !== 0 && (a < 1e-2 || a >= 1e9)) return x.toExponential(d); return x.toFixed(d); }
const F = fx;
function mkRng(seed) { let s = seed >>> 0; const r = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  return { r, u(a, b, st = 1) { const n = Math.round((b - a) / st); return +(a + st * Math.floor(r() * (n + 1))).toFixed(10); }, pick(arr) { return arr[Math.floor(r() * arr.length)]; } }; }

const GENS = [];
function reg(g) { GENS.push(g); }
// q(label, value, unit, decimals, opts)
const q = (k, v, u = '', d = 3, o = {}) => Object.assign({ k, v, u, d }, o);
const qi = (k, v, u = '') => ({ k, v, u, d: 0, int: true });
const qc = (k, v, opts) => ({ k, v, opts, choice: true });
const frac = r => ({ 0.5: '1/2', [2 / 3]: '2/3', 0.75: '3/4', [5 / 6]: '5/6', [7 / 8]: '7/8', [1 / 3]: '1/3', 1: '1' })[r] || F(r, 3);

/* ======================= CH3 ======================= */
reg({ id: 'dsi', ch: 3, title: 'DSI concentration gain & IP voice symbol rate', topic: 'Speech interpolation, packetization',
  rand(R) { return { N: R.u(240, 1200, 60), a: R.pick([0.35, 0.4, 0.45]), k: R.pick([1.2, 1.3, 1.4]), asg: R.pick([1, 2, 3]), T: R.pick([10, 20, 30]), hdr: 40, m: R.pick([2, 3, 4]), rho: R.pick([1 / 2, 2 / 3, 3 / 4]) }; },
  practice: { N: 500, a: 0.4, k: 1.3, asg: 2, T: 20, hdr: 40, m: 3, rho: 2 / 3 },
  build(p) { const mean = p.a * p.N, bear = Math.ceil(p.k * mean - 1e-9), tot = bear + p.asg, gain = p.N / tot;
    const pay = 64000 * p.T / 1000 / 8, rch = (pay + p.hdr) * 8 / (p.T / 1000), agg = tot * rch, coded = agg / p.rho, Rs = coded / p.m;
    const mod = { 2: 'QPSK', 3: '8PSK', 4: '16APSK' }[p.m];
    return { st: `A satellite trunk must carry <b>${p.N}</b> terrestrial voice channels (PCM, 8 kHz × 8 bit = 64 kb/s). Speech activity factor α = <b>${p.a}</b>. Bearer channels = <b>${p.k}</b> × mean number of active channels (round up), plus <b>${p.asg}</b> assignment channel(s). Each allocated channel is packetized: <b>${p.T} ms</b> of voice per packet + <b>${p.hdr}-byte</b> IP/UDP/RTP header. The link uses <b>${mod}</b> with FEC rate <b>${frac(p.rho)}</b>.`,
      qs: [q('Concentration gain', gain, '', 3), q('Bit rate per allocated channel', rch / 1e3, 'kb/s', 1), q('Required symbol rate', Rs / 1e6, 'Msps', 3)],
      steps: [`Mean active = α·N = ${p.a}×${p.N} = ${F(mean, 1)}; bearers = ⌈${p.k}×${F(mean, 1)}⌉ = ${bear}; total = ${bear}+${p.asg} = <b>${tot}</b>.`,
        `Gain = N / total = ${p.N}/${tot} = <b>${F(gain)}</b>.`,
        `Payload = 64 kb/s × ${p.T} ms = ${pay} bytes; packet = ${pay}+${p.hdr} = ${pay + p.hdr} bytes every ${p.T} ms → ${F(rch / 1e3, 1)} kb/s per channel.`,
        `Multiplex = ${tot} × ${F(rch / 1e3, 1)} kb/s = ${F(agg / 1e6)} Mb/s; ÷ρ → ${F(coded / 1e6)} Mb/s coded; ÷m=${p.m} → <b>Rs = ${F(Rs / 1e6)} Msps</b>.`],
      fm: ['G = N_terr/(N_bearer+N_assign)', 'R_ch = (payload+header)·8/T_pkt', 'Rs = R_b/(ρ·m)'] }; } });

reg({ id: 'swarq', ch: 3, title: 'Stop-and-Wait ARQ over GEO: cycle time & throughput', topic: 'ARQ, delay',
  rand(R) { return { R: R.pick([1, 2, 4, 8]), d: R.u(36000, 40000, 500), L: R.pick([500, 1000, 1500, 2000]), A: R.pick([40, 50, 64]), proc: R.pick([0, 10, 20]), p: R.u(0.01, 0.1, 0.01), Tout: R.pick([600, 700, 800]) }; },
  practice: { R: 2, d: 38000, L: 1500, A: 50, proc: 20, p: 0.05, Tout: 600 },
  build(p) { const Td = p.L * 8 / (p.R * 1e3), Ta = p.A * 8 / (p.R * 1e3), tp = 2 * p.d / 3e5 * 1e3, Ts = Td + tp + p.proc + Ta + tp + p.proc, ET = Ts + p.Tout * p.p / (1 - p.p), thr = p.L * 8 / ET;
    return { st: `GEO single-hop link at <b>${p.R} Mb/s</b>; both stations have slant range <b>${p.d} km</b> (c = 3·10⁵ km/s). Data packets of <b>${p.L} bytes</b>, ACK of <b>${p.A} bytes</b> (error-free). Processing delay <b>${p.proc} ms</b> per direction. Data PER = <b>${p.p}</b>. Stop-and-Wait, timeout T<sub>out</sub> = <b>${p.Tout} ms</b> (a lost frame waits the full timeout).`,
      qs: [q('One-hop propagation delay t_p', tp, 'ms', 3), q('Successful cycle T_success', Ts, 'ms', 3), q('Expected delivery time E[T]', ET, 'ms', 3), q('Effective throughput', thr, 'kb/s', 3)],
      steps: [`T_data = ${p.L}×8/${p.R} Mb/s = ${F(Td)} ms; T_ACK = ${F(Ta)} ms.`, `One hop (up+down) t_p = 2×${p.d}/3·10⁵ = <b>${F(tp)} ms</b>.`,
        `T_success = T_data + t_p + T_proc + T_ACK + t_p + T_proc = <b>${F(Ts)} ms</b>.`, `E[T] = T_success + T_out·p/(1−p) = ${F(Ts)} + ${p.Tout}×${p.p}/${F(1 - p.p, 2)} = <b>${F(ET)} ms</b>.`,
        `Throughput = ${p.L * 8} bits / ${F(ET)} ms = <b>${F(thr)} kb/s</b> (vs ${p.R * 1000} kb/s link → Stop-and-Wait is very inefficient on GEO).`],
      fm: ['E[T] = T_success + T_out·p/(1−p)', 'throughput = bits / E[T]'] }; } });

reg({ id: 'avail', ch: 3, title: 'Multi-cause availability & rain outage budget', topic: 'Availability',
  rand(R) { for (;;) { const p = { tgt: R.pick([99.5, 99.7, 99.8, 99.9]), down: R.pick([2.19, 4.38, 8.76, 13.14]), Ag: R.pick([99.9, 99.95, 99.98]) };
      if ((1 - p.down / 8760) * p.Ag / 100 > p.tgt / 100 + 2e-4) return p; } },
  practice: { tgt: 99.8, down: 8.76, Ag: 99.95 },
  build(p) { const As = 1 - p.down / 8760, Ahw = As * p.Ag / 100, Ap = (p.tgt / 100) / Ahw, out = (1 - Ap) * 8760;
    return { st: `Target annual availability <b>${p.tgt}%</b>. Three independent causes: satellite payload failures (<b>${p.down} h</b> of downtime per 8760 h), earth station equipment (availability <b>${p.Ag}%</b>), and rain fades.`,
      qs: [q('Satellite availability', As * 100, '%', 4, { abs: 6e-4 }), q('Combined hardware availability', Ahw * 100, '%', 4, { abs: 6e-4 }), q('Minimum propagation availability', Ap * 100, '%', 4, { abs: 6e-4 }), q('Max rain outage', out, 'h/year', 3)],
      steps: [`A_sat = 1 − ${p.down}/8760 = <b>${F(As * 100, 4)}%</b>.`, `Independent in series → multiply: A_hw = ${F(As, 6)}×${p.Ag / 100} = <b>${F(Ahw * 100, 4)}%</b>.`,
        `A_prop = A_target/A_hw = ${p.tgt / 100}/${F(Ahw, 6)} = <b>${F(Ap * 100, 4)}%</b>.`, `Outage = (1 − A_prop)×8760 = <b>${F(out)} h/year</b>.`],
      fm: ['A = ΠA_i', 'A_prop = A_target / A_hw', 'outage = (1−A)·8760 h'] }; } });

reg({ id: 'dvbsmux', ch: 3, title: 'DVB-S MPEG-2 multiplex in a transponder', topic: 'DVB-S, TS multiplexing',
  rand(R) { return { n: R.u(4, 10), v: R.pick([3, 4, 5, 6, 8]), a: R.pick([192, 256, 384]), ovh: R.pick([3, 4, 5]), r: R.pick([1 / 2, 2 / 3, 3 / 4, 5 / 6, 7 / 8]), al: R.pick([0.2, 0.25, 0.35]), B: R.pick([27, 33, 36, 54]) }; },
  practice: { n: 8, v: 6, a: 384, ovh: 4, r: 5 / 6, al: 0.2, B: 36 },
  build(p) { const es = p.n * (p.v + p.a / 1000), ts = es * (1 + p.ovh / 100), rs = ts * 204 / 188, ch = rs / p.r, Rs = ch / 2, BW = Rs * (1 + p.al), per = ch / p.n, mx = Math.floor((p.B / (1 + p.al)) * 2 / per + 1e-9);
    return { st: `<b>${p.n}</b> TV programmes, each <b>${p.v} Mb/s</b> video + <b>${p.a} kb/s</b> audio. PES/TS/PSI overhead <b>${p.ovh}%</b> of the ES payload. DVB-S: RS(204,188), inner convolutional code <b>${frac(p.r)}</b>, QPSK, roll-off <b>${p.al}</b>. Transponder bandwidth <b>${p.B} MHz</b>.`,
      qs: [q('Bit rate entering the modulator', ch, 'Mb/s', 3), q('Symbol rate', Rs, 'Msps', 3), q('Occupied bandwidth', BW, 'MHz', 3), qc('Does the multiplex fit?', BW <= p.B ? 'Yes' : 'No', ['Yes', 'No']), qi('Max number of programmes', mx)],
      steps: [`ES = ${p.n}×(${p.v}+${p.a / 1000}) = ${F(es)} Mb/s → ×${1 + p.ovh / 100} = ${F(ts)} Mb/s (TS).`, `×204/188 = ${F(rs)} Mb/s → ÷${frac(p.r)} = <b>${F(ch)} Mb/s</b>.`,
        `QPSK: Rs = ${F(ch)}/2 = <b>${F(Rs)} Msps</b>; B = (1+α)Rs = <b>${F(BW)} MHz</b> ${BW <= p.B ? '≤' : '>'} ${p.B} MHz.`,
        `Max: Rs,max = ${p.B}/${1 + p.al} = ${F(p.B / (1 + p.al))} Msps → ${F(2 * p.B / (1 + p.al))} Mb/s; one programme needs ${F(per)} Mb/s → ⌊…⌋ = <b>${mx}</b>.`],
      fm: ['R = ES·(1+ovh)·204/188 / r', 'Rs = R/2 (QPSK)', 'B = (1+α)Rs'] }; } });

reg({ id: 'qos', ch: 3, title: '5QI packet delay budget & jitter buffer', topic: '5G QoS',
  rand(R) { return { fx: R.pick([20, 40, 60, 240, 250, 260]), mu: R.pick([5, 10, 15]), sg: R.pick([2, 3, 5]), q5: R.pick([1, 2, 3, 4]) }; },
  practice: { fx: 240, mu: 10, sg: 5, q5: 1 },
  build(p) { const pdb = { 1: 100, 2: 150, 3: 50, 4: 300 }[p.q5], d = p.fx + p.mu + 2 * p.sg;
    return { st: `A voice/data bearer has fixed propagation+processing delay <b>${p.fx} ms</b> plus random queuing X ~ N(μ = <b>${p.mu} ms</b>, σ = <b>${p.sg} ms</b>). The PDB criterion covers 97.7% of packets (μ+2σ). The bearer is assigned <b>5QI = ${p.q5}</b> (TS 23.501: 5QI 1 → 100 ms, 2 → 150 ms, 3 → 50 ms, 4 → 300 ms).`,
      qs: [q('97.7% one-way delay', d, 'ms', 1), qc('Compliant with the 5QI PDB?', d <= pdb ? 'Yes' : 'No', ['Yes', 'No']), q('De-jitter buffer depth (queuing to absorb)', p.mu + 2 * p.sg, 'ms', 1)],
      steps: [`Delay = fixed + μ + 2σ = ${p.fx}+${p.mu}+${2 * p.sg} = <b>${d} ms</b>.`, `5QI ${p.q5} → PDB = ${pdb} ms → <b>${d <= pdb ? 'compliant' : 'NOT compliant'}</b>.`, `Buffer must absorb queuing up to μ+2σ = <b>${p.mu + 2 * p.sg} ms</b> above the fixed floor.`],
      fm: ['delay₉₇.₇% = fixed + μ + 2σ'] }; } });

/* ======================= CH4 ======================= */
const RHOTAB = [[1, 10.5], [7 / 8, 6.9], [3 / 4, 5.9], [2 / 3, 5.5], [1 / 2, 5.0]];
reg({ id: 'coderate', ch: 4, title: 'Code rate under power and bandwidth limits', topic: 'Power vs bandwidth',
  rand(R) { const t = R.pick(RHOTAB); return { cn0: R.u(74, 86), B: R.pick([27, 36, 54]), al: R.pick([0.2, 0.25, 0.35]), rho: t[0], eb: t[1], M: 1 }; },
  practice: { cn0: 80, B: 36, al: 0.35, rho: 0.5, eb: 5.0, M: 1 },
  build(p) { const Li = 0.6 + 20 * (0.35 - p.al) ** 2, rbw = 2 * p.rho * p.B / (1 + p.al), rpw = lin(p.cn0 - (p.eb + Li + p.M)) / 1e6, rb = Math.min(rbw, rpw), ebr = p.cn0 - db(rb * 1e6), Bocc = (1 + p.al) * rb / (2 * p.rho), cn = p.cn0 - db(Bocc * 1e6);
    return { st: `QPSK link: B<sub>max</sub> = <b>${p.B} MHz</b>, C/N₀ = <b>${p.cn0} dBHz</b>. Code rate ρ = <b>${frac(p.rho)}</b> needs E<sub>b</sub>/N₀ = <b>${p.eb} dB</b> (ideal). Roll-off α = <b>${p.al}</b>; implementation loss L<sub>imp</sub> = 0.6 + 20(0.35 − α)² dB; operating margin <b>${p.M} dB</b>.`,
      qs: [q('Implementation loss', Li, 'dB', 3), q('Bandwidth-limited R_b', rbw, 'Mb/s', 3), q('Power-limited R_b', rpw, 'Mb/s', 3), q('Achievable R_b', rb, 'Mb/s', 3), qc('Binding constraint', rpw < rbw ? 'Power' : 'Bandwidth', ['Power', 'Bandwidth']), q('Received Eb/N0 at that rate', ebr, 'dB', 3), q('C/N in the occupied bandwidth', cn, 'dB', 3)],
      steps: [`L_imp = 0.6 + 20(0.35−${p.al})² = <b>${F(Li)} dB</b>.`, `Bandwidth: R_b ≤ 2ρB/(1+α) = 2×${F(p.rho, 3)}×${p.B}/${1 + p.al} = <b>${F(rbw)} Mb/s</b>.`,
        `Power: R_b ≤ 10^[(C/N₀ − Eb/N₀ − L_imp − M)/10] = 10^[(${p.cn0} − ${p.eb} − ${F(Li)} − ${p.M})/10] = <b>${F(rpw)} Mb/s</b>.`, `R_b = min = <b>${F(rb)} Mb/s</b> → ${rpw < rbw ? 'power' : 'bandwidth'}-limited.`,
        `Eb/N₀ = C/N₀ − 10log R_b = <b>${F(ebr)} dB</b>; B_occ = (1+α)R_b/(2ρ) = ${F(Bocc)} MHz → C/N = C/N₀ − 10log B = <b>${F(cn)} dB</b>.`],
      fm: ['R_b,BW = 2ρB/(1+α)', 'R_b,P = 10^[(C/N₀−Eb/N₀,req−L−M)/10]', 'C/N = C/N₀ − 10log B'] }; } });

const QINV = { 1e-4: 3.719016, 1e-5: 4.264891, 1e-6: 4.753424 };
reg({ id: 'bpsk', ch: 4, title: 'Coherent BPSK with phase offset vs DE-BPSK', topic: 'BER, synchronization',
  rand(R) { return { Rb: R.pick([2, 5, 10, 20, 50]), ph: R.pick([10, 15, 20, 25, 30, 35]), ber: R.pick([1e-4, 1e-5, 1e-6]), al: R.pick([0.2, 0.25, 0.35]) }; },
  practice: { Rb: 20, ph: 25, ber: 1e-5, al: 0.25 },
  build(p) { const qi_ = QINV[p.ber], g = qi_ * qi_ / (2 * Math.cos(rad(p.ph)) ** 2), g0 = qi_ * qi_ / 2, gde = Math.log(1 / (2 * p.ber)), r = db(p.Rb * 1e6);
    return { st: `Uncoded BPSK at R<sub>b</sub> = <b>${p.Rb} Mb/s</b>. Coherent receiver with fixed phase offset φ = <b>${p.ph}°</b>: P<sub>b</sub> = Q(√(2γ<sub>b</sub>)·cos φ). Target BER = <b>${p.ber.toExponential(0)}</b>, Q⁻¹(${p.ber.toExponential(0)}) = ${qi_}. DE-BPSK: P<sub>b</sub> = ½e<sup>−γb</sup>. Roll-off α = <b>${p.al}</b>.`,
      qs: [q('Required Eb/N0 (coherent, φ)', db(g), 'dB', 3), q('Required C/N0 (coherent, φ)', db(g) + r, 'dBHz', 3), q('Penalty vs φ = 0', db(g) - db(g0), 'dB', 3), q('Required Eb/N0 (DE-BPSK)', db(gde), 'dB', 3), qc('Which needs less power at this φ?', gde < g ? 'DE-BPSK' : 'Coherent', ['Coherent', 'DE-BPSK']), q('Occupied bandwidth', (1 + p.al) * p.Rb, 'MHz', 3)],
      steps: [`γ_b = [Q⁻¹(P_b)]²/(2cos²φ) = ${qi_}²/(2×${F(Math.cos(rad(p.ph)) ** 2, 4)}) = ${F(g)} → <b>${F(db(g))} dB</b>.`, `C/N₀ = Eb/N₀ + 10log R_b = ${F(db(g))} + ${F(r)} = <b>${F(db(g) + r)} dBHz</b>.`,
        `φ = 0: γ_b = ${F(g0)} (${F(db(g0))} dB) → penalty = −20log(cos φ) = <b>${F(db(g) - db(g0))} dB</b>.`, `DE-BPSK: γ_b = ln(1/(2P_b)) = ${F(gde)} → <b>${F(db(gde))} dB</b>.`,
        `BPSK: Rs = Rb → B = (1+α)Rs = <b>${F((1 + p.al) * p.Rb)} MHz</b> for both.`],
      fm: ['γ_b = [Q⁻¹(P_b)]²/(2cos²φ)', 'penalty = −20log cosφ', 'DE-BPSK: γ_b = ln(1/(2P_b))'] }; } });

reg({ id: 'rsint', ch: 4, title: 'RS(204,188) block interleaver depth', topic: 'Coding, interleaving',
  rand(R) { for (;;) { const p = { b: R.u(40, 200), e: R.u(1, 4), e2: R.pick([1, 2]), s: R.pick([2, 4, 6]), Rb: R.pick([10, 20, 24, 40]), T: R.pick([1, 1.5, 2, 3]) };
      if ((16 - p.s) / 2 - p.e2 >= 1) return p; } },
  practice: { b: 95, e: 3, e2: 2, s: 4, Rb: 24, T: 1.6 },
  build(p) { const d1 = Math.ceil(p.b / 8), x2 = 8 - p.e, d2 = Math.ceil(p.b / x2), x3 = Math.floor((16 - p.s) / 2 - p.e2), d3 = Math.ceil(p.b / x3), Rby = p.Rb * 1e6 / 8 * 204 / 188, dmax = Math.floor(p.T * 1e-3 * Rby / 204 + 1e-9);
    return { st: `RS(204,188) corrects t = 8 byte errors per codeword (2e + s ≤ 16 with erasures). Block interleaver D × 204, written by rows (codewords), read by columns. A burst of <b>${p.b}</b> consecutive bytes occurs (any start position). Information rate <b>${p.Rb} Mb/s</b>; collection time T = 204D/R<sub>byte,RS</sub> must not exceed <b>${p.T} ms</b>.`,
      qs: [qi('Min D (burst only)', d1), qi(`Min D (burst + ${p.e} background errors/codeword)`, d2), qi(`Min D (burst + ${p.e2} unknown errors + ${p.s} erasures)`, d3), qi('Max D allowed by the latency limit', dmax)],
      steps: [`A burst of b bytes puts at most ⌈b/D⌉ bytes in any row. Burst only: ⌈${p.b}/D⌉ ≤ 8 → <b>D = ${d1}</b>.`, `With ${p.e} background: ⌈${p.b}/D⌉ ≤ ${x2} → <b>D = ${d2}</b> (check D−1 gives ${Math.ceil(p.b / (d2 - 1 || 1))} > ${x2}).`,
        `Errors+erasures: 2(x+${p.e2}) + ${p.s} ≤ 16 → x ≤ ${x3} → ⌈${p.b}/D⌉ ≤ ${x3} → <b>D = ${d3}</b>.`, `R_byte,RS = ${p.Rb}·10⁶/8 × 204/188 = ${F(Rby / 1e6, 4)}·10⁶ B/s → D ≤ T·R/204 = ${F(p.T * 1e-3 * Rby / 204)} → <b>D_max = ${dmax}</b>.`],
      fm: ['bytes per row ≤ ⌈b/D⌉', '⌈b/D⌉ + e ≤ 8', '2e + s ≤ 16', 'T = 204D / R_byte,RS'] }; } });

reg({ id: 'qam64', ch: 4, title: 'Strong / weak bits in Gray 64-QAM', topic: 'Modulation, BER',
  rand(R) { return { x: R.pick([2.5, 2.75, 3, 3.25, 3.5]), tg: R.pick([1e-3, 1e-4, 1e-5]) }; },
  practice: { x: 3, tg: 1e-4 },
  build(p) { const Qx = +Q(p.x).toPrecision(4), qinv = +Qinv(p.tg).toFixed(3), g = 3.5 * p.x * p.x, g2 = 3.5 * qinv * qinv;
    return { st: `Uncoded Gray 64-QAM, levels ±a, ±3a, ±5a, ±7a per axis; noise σ² = N₀/2; x = a/σ; E<sub>s</sub> = 6E<sub>b</sub>. Nearest-neighbour approximation: each boundary crossing = Q(x). Part 1: x = <b>${p.x}</b>, Q(${p.x}) = ${Qx.toExponential(3)}. Part 2: each weak bit must have BER ≤ <b>${p.tg.toExponential(0)}</b> (Q⁻¹ = ${qinv}).`,
      qs: [q('Eb/N0 at x', db(g), 'dB', 3), q('Strong-bit BER', Qx / 4, '', 3, { rel: 0.01 }), q('Intermediate-bit BER', Qx / 2, '', 3, { rel: 0.01 }), q('Weak-bit BER', Qx, '', 3, { rel: 0.01 }), q('Average BER', 7 * Qx / 12, '', 3, { rel: 0.01 }), q('Eb/N0 for the weak-bit target', db(g2), 'dB', 3)],
      steps: [`Per axis b1 flips at 1 boundary, b2 at 2, b3 at 4 → P = Q/4, Q/2, Q (2 crossings per boundary ÷ 8 levels).`, `E_s = 42a² → x² = 2a²/N₀ = E_s/(21N₀) = 2γ_b/7 → γ_b = 3.5x² = ${F(g)} → <b>${F(db(g))} dB</b>.`,
        `BERs: ${(Qx / 4).toExponential(3)} / ${(Qx / 2).toExponential(3)} / ${Qx.toExponential(3)}; average 7Q/12 = <b>${(7 * Qx / 12).toExponential(3)}</b>.`, `Weak target: x = ${qinv} → γ_b = 3.5×${qinv}² = ${F(g2)} → <b>${F(db(g2))} dB</b>.`],
      fm: ['P = Q/4, Q/2, Q (strong, mid, weak)', 'avg = 7Q/12', 'x = √(2γ_b/7)'] }; } });

const MODES = [['QPSK 1/2', 2, 32208, 1.00], ['QPSK 3/4', 2, 48408, 4.03], ['8PSK 2/3', 3, 43040, 6.62], ['8PSK 3/4', 3, 48408, 7.91], ['16APSK 3/4', 4, 48408, 10.21]];
function plf(m, K, Rs) { const Nd = 64800 / m, Np = 36 * Math.floor((Nd - 1) / 1440), N = 90 + Nd + Np; return { Nd, Np, N, T: Rs * (K - 80) / N }; }
reg({ id: 'dvbs2', ch: 4, title: 'DVB-S2 PLFRAME length & useful throughput', topic: 'DVB-S2',
  rand(R) { return { mi: R.u(0, 4), B: R.pick([27, 36, 54]), al: R.pick([0.2, 0.25, 0.35]) }; },
  practice: { mi: 0, B: 36, al: 0.2 },
  build(p) { const [nm, m, K] = MODES[p.mi], Rs = p.B / (1 + p.al), f = plf(m, K, Rs);
    return { st: `DVB-S2 normal FECFRAME (64 800 bits), mode <b>${nm}</b> (K<sub>BCH</sub> = ${K}). B = <b>${p.B} MHz</b>, α = <b>${p.al}</b>. 80-bit BBFRAME header, 90-symbol PLFRAME header, 36 pilots after each 1440 data symbols: N<sub>pilot</sub> = 36⌊(N<sub>data</sub>−1)/1440⌋.`,
      qs: [q('Max symbol rate', Rs, 'Msps', 3), qi('Data symbols', f.Nd), qi('Pilot symbols', f.Np), qi('PLFRAME length', f.N, 'symbols'), q('Useful throughput', f.T, 'Mb/s', 3)],
      steps: [`Rs = B/(1+α) = ${p.B}/${1 + p.al} = <b>${F(Rs)} Msps</b>.`, `N_data = 64800/${m} = <b>${f.Nd}</b>; N_pilot = 36⌊${f.Nd - 1}/1440⌋ = <b>${f.Np}</b>.`, `PLFRAME = 90 + ${f.Nd} + ${f.Np} = <b>${f.N}</b> symbols.`, `Throughput = Rs × (K−80)/N = ${F(Rs)} × ${K - 80}/${f.N} = <b>${F(f.T)} Mb/s</b>.`],
      fm: ['N_d = 64800/m', 'N_p = 36⌊(N_d−1)/1440⌋', 'R = Rs(K_BCH−80)/(90+N_d+N_p)'] }; } });

reg({ id: 'acm', ch: 4, title: 'DVB-S2 ACM: time-averaged throughput', topic: 'DVB-S2, ACM',
  rand(R) { for (;;) { const p = { B: 36, al: 0.2, c1: R.u(84, 90), c2: R.u(80, 84), c3: R.u(76, 80), f1: R.pick([0.5, 0.6, 0.7]), f2: R.pick([0.2, 0.25, 0.3]) };
      const Rs = p.B / (1 + p.al); if (p.c3 - db(Rs * 1e6) >= 2.5) return p; } },
  practice: { B: 36, al: 0.2, c1: 87, c2: 83, c3: 78, f1: 0.6, f2: 0.3 },
  build(p) { const Rs = p.B / (1 + p.al), off = db(Rs * 1e6), f3 = +(1 - p.f1 - p.f2).toFixed(2), tbl = MODES.map(([n, m, K, e]) => ({ n, thr: e + 1.5, T: plf(m, K, Rs).T }));
    const pick = es => tbl.filter(t => t.thr <= es).reduce((a, b) => b.T > a.T ? b : a), st = [p.c1, p.c2, p.c3].map(c => ({ c, es: c - off })); st.forEach(s => s.m = pick(s.es));
    const avg = p.f1 * st[0].m.T + p.f2 * st[1].m.T + f3 * st[2].m.T, fixed = pick(st[2].es), gain = (avg / fixed.T - 1) * 100;
    return { st: `DVB-S2, B = ${p.B} MHz, α = ${p.al}. Modes (ideal Es/N₀ + 1.5 dB losses/margin): QPSK 1/2 (2.50 dB), QPSK 3/4 (5.53), 8PSK 2/3 (8.12), 8PSK 3/4 (9.41), 16APSK 3/4 (11.71). Channel states: C/N₀ = <b>${p.c1}</b> dBHz (${p.f1 * 100}% of time), <b>${p.c2}</b> (${p.f2 * 100}%), <b>${p.c3}</b> (${F(f3 * 100, 0)}%). A mode delivers its full rate if its threshold is met.`,
      qs: [q('Es/N0 in the best state', st[0].es, 'dB', 3), qc('Mode in the best state', st[0].m.n, tbl.map(t => t.n)), qc('Mode in the worst state', st[2].m.n, tbl.map(t => t.n)), q('ACM average throughput', avg, 'Mb/s', 3), q('Best fixed mode throughput', fixed.T, 'Mb/s', 3), q('ACM gain', gain, '%', 2, { abs: 0.2 })],
      steps: [`Rs = ${F(Rs)} Msps → Es/N₀ = C/N₀ − ${F(off)}: ${st.map(s => F(s.es, 2)).join(', ')} dB.`, `Fastest mode meeting each threshold: ${st.map(s => s.m.n + ' (' + F(s.m.T) + ' Mb/s)').join('; ')}.`,
        `Average = ${p.f1}×${F(st[0].m.T)} + ${p.f2}×${F(st[1].m.T)} + ${F(f3, 2)}×${F(st[2].m.T)} = <b>${F(avg)} Mb/s</b>.`, `Fixed mode must work in the worst state → ${fixed.n} = ${F(fixed.T)} Mb/s → gain = <b>${F(gain, 2)}%</b>.`],
      fm: ['Es/N₀ = C/N₀ − 10log Rs', 'avg = Σ p_i·R_i'] }; } });

/* ======================= CH5 ======================= */
reg({ id: 'antenna', ch: 5, title: 'Array beamwidth, equivalent dish & off-axis gain', topic: 'Antennas',
  rand(R) { for (;;) { const p = { N: R.u(4, 16), f: R.pick([4, 12, 14, 20, 30]), eta: R.pick([0.55, 0.6, 0.65, 0.7]), th: 0 }; p.th = R.u(0.5, 4, 0.5); const b = deg(Math.asin(1.772 / p.N)); if (p.th < b / 2) return p; } },
  practice: { N: 12, f: 14, eta: 0.6, th: 3 },
  build(p) { const b = deg(Math.asin(1.772 / p.N)), lam = C / (p.f * 1e9), D = 70 * lam / b, G = db(p.eta * (Math.PI * 70 / b) ** 2), Gt = G - 12 * (p.th / b) ** 2;
    return { st: `A uniform linear array of <b>N = ${p.N}</b> isotropic elements, d = λ/2, broadside. Use θ<sub>3dB</sub> ≈ arcsin(0.886λ/(Nd)). A parabolic dish at <b>${p.f} GHz</b> (η = <b>${p.eta}</b>, θ<sub>3dB</sub> = 70λ/D, G<sub>max</sub> = η(π·70/θ<sub>3dB</sub>)²) must match this beamwidth. Off-axis gain G(θ) = G<sub>max</sub> − 12(θ/θ<sub>3dB</sub>)² at θ = <b>${p.th}°</b>.`,
      qs: [q('Array beamwidth θ3dB', b, '°', 3), q('Dish diameter', D * 100, 'cm', 3), q('Dish gain Gmax', G, 'dBi', 3), q(`Gain at ${p.th}° off axis`, Gt, 'dBi', 3)],
      steps: [`λ/d = 2 → θ3dB = arcsin(1.772/${p.N}) = <b>${F(b)}°</b>.`, `λ = c/f = ${F(lam * 100, 4)} cm → D = 70λ/θ = <b>${F(D * 100)} cm</b>.`, `G = ${p.eta}×(π·70/${F(b)})² = ${F(lin(G), 1)} → <b>${F(G)} dBi</b>.`, `G(θ) = ${F(G)} − 12(${p.th}/${F(b)})² = <b>${F(Gt)} dBi</b>.`],
      fm: ['θ3dB ≈ arcsin(0.886λ/(Nd))', 'θ3dB = 70λ/D', 'G = η(π70/θ3dB)²', 'G(θ) = Gmax − 12(θ/θ3dB)²'] }; } });

reg({ id: 'friis', ch: 5, title: 'Receiver noise cascade (Friis) & G/T', topic: 'Noise, G/T',
  rand(R) { return { G1: R.u(20, 30), Te1: R.u(35, 90, 5), G2: R.u(-8, -4), F2: R.u(5, 9), F3: R.u(6, 12), LF: R.u(0.5, 2, 0.25), TA: R.u(25, 60, 5), Gm: R.u(40, 56, 0.5), LR: R.u(0.2, 0.8, 0.1), LP: R.u(0.1, 0.5, 0.1) }; },
  practice: { G1: 23, Te1: 55, G2: -6, F2: 7, F3: 10, LF: 1.5, TA: 35, Gm: 52.5, LR: 0.5, LP: 0.3 },
  build(p) { const g1 = lin(p.G1), g2 = lin(p.G2), te2 = (lin(p.F2) - 1) * 290, te3 = (lin(p.F3) - 1) * 290, trx = p.Te1 + te2 / g1 + te3 / (g1 * g2), L = lin(p.LF), T = p.TA / L + 290 * (1 - 1 / L) + trx, G = p.Gm - p.LR - p.LP - p.LF, gt = G - db(T);
    return { st: `Earth station receiver: antenna G<sub>Rmax</sub> = <b>${p.Gm} dBi</b>, pointing loss <b>${p.LR} dB</b>, polarization loss <b>${p.LP} dB</b>, T<sub>A</sub> = <b>${p.TA} K</b>. Feeder loss L<sub>F</sub> = <b>${p.LF} dB</b> at 290 K. LNA: G₁ = <b>${p.G1} dB</b>, T<sub>e1</sub> = <b>${p.Te1} K</b>. Mixer: gain <b>${p.G2} dB</b>, F₂ = <b>${p.F2} dB</b>. IF amplifier: F₃ = <b>${p.F3} dB</b>. Reference plane: receiver input.`,
      qs: [q('Mixer noise temperature Te2', te2, 'K', 1), q('IF amp noise temperature Te3', te3, 'K', 1), q('Receiver noise temperature TeRX', trx, 'K', 3), q('System noise temperature T', T, 'K', 3), q('G/T', gt, 'dB/K', 3)],
      steps: [`Te = (F−1)·290 with F linear: Te2 = (10^${p.F2 / 10}−1)×290 = <b>${F(te2, 1)} K</b>; Te3 = <b>${F(te3, 1)} K</b>.`, `Friis: TeRX = ${p.Te1} + ${F(te2, 1)}/${F(g1, 2)} + ${F(te3, 1)}/(${F(g1, 2)}×${F(g2, 4)}) = <b>${F(trx)} K</b>.`,
        `T = T_A/L + 290(1−1/L) + TeRX = ${F(p.TA / L)} + ${F(290 * (1 - 1 / L))} + ${F(trx)} = <b>${F(T)} K</b> (${F(db(T))} dBK).`, `G = ${p.Gm} − ${p.LR} − ${p.LP} − ${p.LF} = ${F(G, 2)} dBi → G/T = <b>${F(gt)} dB/K</b>.`],
      fm: ['Te = (F−1)·290', 'Te = Te1 + Te2/G1 + Te3/(G1G2)', 'T = T_A/L_F + 290(1−1/L_F) + TeRX', 'G/T = G − 10log T'] }; } });

reg({ id: 'rain', ch: 5, title: 'Rain: antenna temperature, G/T and C/N0 degradation', topic: 'Rain, noise',
  rand(R) { return { TA: R.u(20, 60, 5), LF: R.u(0.5, 2, 0.25), trx: R.u(50, 200, 10), g: R.u(0.2, 2, 0.1), Le: R.u(2, 8, 0.5), Tm: R.pick([270, 275, 280]) }; },
  practice: { TA: 35, LF: 1.5, trx: 112.907, g: 0.8, Le: 5, Tm: 275 },
  build(p) { const A = p.g * p.Le, t = lin(-A), TAr = p.TA * t + p.Tm * (1 - t), L = lin(p.LF), Tc = p.TA / L + 290 * (1 - 1 / L) + p.trx, Tr = TAr / L + 290 * (1 - 1 / L) + p.trx, dgt = db(Tr / Tc);
    return { st: `Downlink receiver: clear-sky T<sub>A</sub> = <b>${p.TA} K</b>, feeder L<sub>F</sub> = <b>${p.LF} dB</b> (290 K), T<sub>eRX</sub> = <b>${p.trx} K</b>. Rain: γ<sub>R</sub> = <b>${p.g} dB/km</b> over L<sub>e</sub> = <b>${p.Le} km</b>, medium temperature T<sub>m</sub> = <b>${p.Tm} K</b>.`,
      qs: [q('Rain attenuation A', A, 'dB', 3), q('Antenna temperature in rain', TAr, 'K', 3), q('Clear-sky system temperature', Tc, 'K', 3), q('Rain system temperature', Tr, 'K', 3), q('Δ(G/T)', dgt, 'dB', 3), q('Downlink C/N0 reduction', A + dgt, 'dB', 3)],
      steps: [`A = γ_R·L_e = <b>${F(A)} dB</b> → 10^(−A/10) = ${F(t, 4)}.`, `T_A,rain = ${p.TA}×${F(t, 4)} + ${p.Tm}×${F(1 - t, 4)} = <b>${F(TAr)} K</b>.`, `T = T_A/L + 290(1−1/L) + TeRX: clear <b>${F(Tc)} K</b>, rain <b>${F(Tr)} K</b>.`, `Δ(G/T) = 10log(T_rain/T_clear) = <b>${F(dgt)} dB</b>; ΔC/N₀ = A + Δ(G/T) = <b>${F(A + dgt)} dB</b>.`],
      fm: ['T_A,rain = T_A·10^(−A/10) + T_m(1−10^(−A/10))', 'ΔC/N₀(DL) = A + Δ(G/T)'] }; } });

reg({ id: 'budget', ch: 5, title: 'Downlink power budget & site diversity', topic: 'Link budget',
  rand(R) { for (;;) { const p = { P: R.u(5, 20, 0.5), Lt: R.u(0.5, 2, 0.5), Gt: R.u(25, 45, 0.2), Ld: R.u(195, 212, 0.2), Gr: R.u(30, 55, 0.2), Lr: R.u(0.3, 1, 0.1), N0: R.u(-208, -202, 0.2), Am: R.u(6, 16, 0.5), Ad: R.u(2, 6, 0.1), dg1: R.u(1, 3, 0.1), dg2: R.u(0.5, 1.5, 0.1) }; if (p.Ad < p.Am) return p; } },
  practice: { P: 10, Lt: 1, Gt: 35.2, Ld: 206.4, Gr: 51.2, Lr: 0.5, N0: -206.4, Am: 11.5, Ad: 4.2, dg1: 2.3, dg2: 1.1 },
  build(p) { const eirp = p.P - p.Lt + p.Gt, PR = eirp - p.Ld + p.Gr, Cc = PR - p.Lr, cn0 = Cc - p.N0, T = lin(p.N0 - K_DB), M1 = p.Am + p.dg1, M2 = p.Ad + p.dg2;
    return { st: `Satellite: P<sub>Tx</sub> = <b>${p.P} dBW</b>, feeder <b>${p.Lt} dB</b>, G<sub>T</sub> = <b>${p.Gt} dBi</b>. Path loss L<sub>D</sub> = <b>${p.Ld} dB</b>. Earth station: G<sub>R</sub> = <b>${p.Gr} dBi</b>, feeder <b>${p.Lr} dB</b>, N₀ = <b>${p.N0} dBW/Hz</b> (k = −228.6 dBW/K/Hz). At p = 0.01%: single-site A = <b>${p.Am} dB</b>, diversity A<sub>D</sub> = <b>${p.Ad} dB</b>; Δ(G/T) = <b>${p.dg1} dB</b> (single), <b>${p.dg2} dB</b> (diversity).`,
      qs: [q('EIRP', eirp, 'dBW', 2), q('Carrier power at receiver input C', Cc, 'dBW', 2), q('Clear-sky C/N0', cn0, 'dBHz', 2), q('System noise temperature', T, 'K', 2), q('Diversity gain', p.Am - p.Ad, 'dB', 2), q('C/N0 in rain, single site', cn0 - M1, 'dBHz', 2), q('C/N0 in rain, diversity', cn0 - M2, 'dBHz', 2)],
      steps: [`EIRP = ${p.P} − ${p.Lt} + ${p.Gt} = <b>${F(eirp, 2)} dBW</b>; P_R = EIRP − L + G_R = ${F(PR, 2)} dBW; C = P_R − ${p.Lr} = <b>${F(Cc, 2)} dBW</b>.`, `C/N₀ = C − N₀ = <b>${F(cn0, 2)} dBHz</b>; T = N₀ − k = ${F(p.N0 - K_DB, 2)} dBK = <b>${F(T, 2)} K</b>.`,
        `G_D = A_M − A_D = <b>${F(p.Am - p.Ad, 2)} dB</b>; margins M = A + Δ(G/T): ${F(M1, 2)} / ${F(M2, 2)} dB.`, `Rain C/N₀ = <b>${F(cn0 - M1, 2)}</b> (single) and <b>${F(cn0 - M2, 2)} dBHz</b> (diversity).`],
      fm: ['EIRP = P − L_FTX + G_T', 'C/N₀ = C − N₀', 'T = N₀ − k (dB)', 'G_D = A_M − A_D', 'M = A + Δ(G/T)'] }; } });

reg({ id: 'totcn0', ch: 5, title: 'Transparent link: back-off, IM and interference', topic: 'Overall C/N0',
  rand(R) { return { Us: R.u(90, 100), Ds: R.u(86, 95), ibo: R.u(2, 8, 0.5), obo: R.u(0.5, 4, 0.5), im: R.u(86, 98), iu: R.u(88, 100), id: R.u(86, 98), Rs: R.pick([10, 20, 25, 30, 36]), m: R.pick([2, 3]) }; },
  practice: { Us: 96, Ds: 91, ibo: 6, obo: 2.5, im: 93, iu: 95, id: 92, Rs: 25, m: 2 },
  build(p) { if (p.obo > p.ibo) p.obo = p.ibo; const U = p.Us - p.ibo, D = p.Ds - p.obo, th = invsum(U, D), T = invsum(U, D, p.im, p.iu, p.id), eb = T - db(p.m * p.Rs * 1e6);
    return { st: `Transparent repeater. At saturation: (C/N₀)<sub>U,sat</sub> = <b>${p.Us}</b>, (C/N₀)<sub>D,sat</sub> = <b>${p.Ds} dBHz</b>. Operating point: IBO = <b>${p.ibo} dB</b>, OBO = <b>${p.obo} dB</b>. (C/N₀)<sub>IM</sub> = <b>${p.im}</b>, (C/N₀)<sub>I,U</sub> = <b>${p.iu}</b>, (C/N₀)<sub>I,D</sub> = <b>${p.id} dBHz</b>. Carrier: ${p.m === 2 ? 'QPSK' : '8PSK'} at R<sub>s</sub> = <b>${p.Rs} Msps</b>.`,
      qs: [q('Uplink (C/N0)U', U, 'dBHz', 2), q('Downlink (C/N0)D', D, 'dBHz', 2), q('Thermal-only (C/N0)', th, 'dBHz', 3), q('Overall (C/N0)T', T, 'dBHz', 3), q('Overall Eb/N0', eb, 'dB', 3)],
      steps: [`U = ${p.Us} − IBO = <b>${F(U, 2)}</b>; D = ${p.Ds} − OBO = <b>${F(D, 2)} dBHz</b>.`, `Add inverses in linear: 1/T = 10^(−U/10)+10^(−D/10)+… → thermal only <b>${F(th)}</b>, all five terms <b>${F(T)} dBHz</b>.`, `R_b = ${p.m}×${p.Rs} = ${p.m * p.Rs} Mb/s → Eb/N₀ = ${F(T)} − ${F(db(p.m * p.Rs * 1e6))} = <b>${F(eb)} dB</b>.`],
      fm: ['(C/N₀)_U = sat − IBO; (C/N₀)_D = sat − OBO', '1/T = Σ 1/(C/N₀)_i (linear)', 'Eb/N₀ = C/N₀ − 10log R_b'] }; } });

reg({ id: 'regen', ch: 5, title: 'Transparent vs regenerative repeater at constant BEP', topic: 'Regenerative payload',
  rand(R) { return { ber: R.pick([1e-4, 1e-5, 1e-6]) }; },
  practice: { ber: 1e-4 },
  build(p) { const g1 = Qinv(p.ber) ** 2 / 2, g2 = Qinv(p.ber / 2) ** 2 / 2, tr = db(2 * g1), rg = db(g2);
    return { st: `Coherent QPSK, P<sub>b</sub> = Q(√(2E<sub>b</sub>/N₀)). Target end-to-end BEP = <b>${p.ber.toExponential(0)}</b>. Given: BEP = ${p.ber.toExponential(0)} needs E<sub>b</sub>/N₀ = ${F(g1, 4)} (${F(db(g1), 2)} dB); BEP = ${(p.ber / 2).toExponential(1)} needs ${F(g2, 4)} (${F(rg, 2)} dB). Balanced link: (E<sub>b</sub>/N₀)<sub>U</sub> = (E<sub>b</sub>/N₀)<sub>D</sub>.`,
      qs: [q('Required per-link Eb/N0, transparent', tr, 'dB', 2), q('Required per-link Eb/N0, regenerative', rg, 'dB', 2), q('Regenerative gain', tr - rg, 'dB', 2)],
      steps: [`Transparent: 1/T = 1/U + 1/D with U = D → U = 2T = 2×${F(g1, 4)} = ${F(2 * g1, 3)} → <b>${F(tr, 2)} dB</b>.`, `Regenerative: BEP = BEP_U + BEP_D → each link at ${(p.ber / 2).toExponential(1)} → <b>${F(rg, 2)} dB</b>.`, `Gain = <b>${F(tr - rg, 2)} dB</b>: on-board decisions stop uplink noise from reaching the downlink.`],
      fm: ['transparent: (Eb/N₀)_T⁻¹ = U⁻¹ + D⁻¹', 'regenerative: BEP = BEP_U + BEP_D'] }; } });

reg({ id: 'isl', ch: 5, title: 'Optical ISL: lead-ahead angle & quantum-limited receiver', topic: 'Intersatellite links',
  rand(R) { return { d: R.u(2000, 8000, 250), v1: R.u(2, 7, 0.5), v2: -R.u(1, 6, 0.5), bw: R.pick([2, 5, 10]), lam: R.pick([0.85, 1.06, 1.55]), eta: R.pick([0.7, 0.8, 0.85, 0.9]), BN: R.pick([1, 2.5, 5]), snr: R.pick([10, 12, 15, 18]), b1: R.u(1, 5, 0.5), b2: R.u(0.1, 1, 0.1), b3: R.u(1, 5, 0.5) }; },
  practice: { d: 4500, v1: 5.5, v2: -3.5, bw: 5, lam: 1.06, eta: 0.85, BN: 2.5, snr: 15, b1: 1.5, b2: 0.1, b3: 2.5 },
  build(p) { const tp = p.d / 3e5 * 1e3, dv = Math.abs(p.v1 - p.v2), beta = 2 * dv / 3e5 * 1e6, f = C / (p.lam * 1e-6), hf = 6.626e-34 * f, Ps = lin(p.snr) * 2 * p.BN * 1e9 * hf / p.eta, bep = (p.b1 + p.b2 + p.b3) * 1e-6;
    return { st: `Optical ISL over <b>${p.d} km</b> at λ = <b>${p.lam} µm</b>, beamwidth <b>${p.bw} µrad</b>. Transverse velocities V<sub>T1</sub> = <b>${p.v1}</b>, V<sub>T2</sub> = <b>${p.v2} km/s</b>. Heterodyne, quantum-limited (η<sub>m</sub> = L<sub>P</sub> = f(G) = 1, B<sub>IF</sub> = 2B<sub>N</sub>), η<sub>D</sub> = <b>${p.eta}</b>, B<sub>N</sub> = <b>${p.BN} GHz</b>, target SNR <b>${p.snr} dB</b> (h = 6.626·10⁻³⁴). Chain BEPs: uplink <b>${p.b1}·10⁻⁶</b>, ISL <b>${p.b2}·10⁻⁶</b>, downlink <b>${p.b3}·10⁻⁶</b> (regenerative).`,
      qs: [q('Propagation time', tp, 'ms', 3), q('Lead-ahead angle β', beta, 'µrad', 3), q('β in beamwidths', beta / p.bw, '×', 3), q('Min received power P_S', Ps * 1e9, 'nW', 3), q('P_S in dBm', db(Ps / 1e-3), 'dBm', 3), q('End-to-end BEP', bep, '', 3, { rel: 0.01 })],
      steps: [`t_p = d/c = <b>${F(tp)} ms</b>; β = 2|V_T1 − V_T2|/c = 2×${dv}/3·10⁵ = <b>${F(beta)} µrad</b> = ${F(beta / p.bw)} beamwidths (must aim ahead or the link is lost).`,
        `f = c/λ = ${F(f, 3)} Hz → hf = ${hf.toExponential(3)} J; P_S = SNR·B_IF·hf/η_D = ${F(lin(p.snr))}×${2 * p.BN}·10⁹×${hf.toExponential(3)}/${p.eta} = <b>${F(Ps * 1e9)} nW</b> = <b>${F(db(Ps / 1e-3))} dBm</b>.`, `Regenerative chain: BEP = sum = <b>${bep.toExponential(3)}</b>.`],
      fm: ['β = 2|V_T1−V_T2|/c', 'P_S = SNR·B_IF·hf/η_D', 'BEP = Σ BEP_i'] }; } });

/* ======================= CH6 ======================= */
reg({ id: 'fdmabo', ch: 6, title: 'FDMA optimum output back-off & Shannon efficiency', topic: 'FDMA, intermodulation',
  rand(R) { for (;;) { const p = { a: R.u(14, 22), c: R.u(4, 12), k: R.pick([1.5, 2, 3]), N: R.u(4, 12), Bn: R.pick([2, 2.5, 3, 4]), Bt: 36 }; const b = (p.a - p.c + 10 * lg(p.k)) / (1 + p.k); if (b > 0 && b < 8 && p.N * p.Bn <= 32) return p; } },
  practice: { a: 18, c: 8, k: 2, N: 8, Bn: 3, Bt: 36 },
  build(p) { const b = (p.a - p.c + 10 * lg(p.k)) / (1 + p.k), cn = p.a - b, ci = p.c + p.k * b, g = invsum(cn, ci), r = p.N * p.Bn * Math.log2(1 + lin(g)), r0 = p.Bt * Math.log2(1 + lin(p.a)), g0 = invsum(p.a, p.c), rb0 = p.N * p.Bn * Math.log2(1 + lin(g0));
    return { st: `<b>${p.N}</b> equal FDMA carriers, noise bandwidth B<sub>n</sub> = <b>${p.Bn} MHz</b> each. With output back-off b (dB): (C/N)<sub>th</sub> = <b>${p.a} − b</b>, (C/I)<sub>IM</sub> = <b>${p.c} + ${p.k}b</b>. Rate bound r = B<sub>n</sub>log₂(1+γ). Reference: single carrier at saturation, B = <b>${p.Bt} MHz</b>, C/N = <b>${p.a} dB</b>.`,
      qs: [q('Optimum back-off b', b, 'dB', 3), q('γ at the optimum', g, 'dB', 3), q('Aggregate rate bound', r, 'Mb/s', 3), q('Efficiency vs single carrier', r / r0 * 100, '%', 2, { abs: 0.1 }), q('Rate lost if b = 0', r - rb0, 'Mb/s', 3)],
      steps: [`Minimize 10^(−(a−b)/10)+10^(−(c+kb)/10) → b* = [(a−c)+10log k]/(1+k) = (${p.a - p.c}+${F(10 * lg(p.k), 3)})/${1 + p.k} = <b>${F(b)} dB</b> (at the optimum N = k·I).`,
        `C/N = ${F(cn)}, C/I = ${F(ci)} → γ = <b>${F(g)} dB</b>.`, `r = ${p.N}×${p.Bn}×log₂(1+${F(lin(g), 2)}) = <b>${F(r)} Mb/s</b>; single: ${p.Bt}×log₂(1+${F(lin(p.a), 1)}) = ${F(r0)} → η = <b>${F(r / r0 * 100, 2)}%</b>.`,
        `b = 0: γ = ${F(g0)} dB → ${F(rb0)} Mb/s → loss <b>${F(r - rb0)} Mb/s</b>.`],
      fm: ['b* = [(a−c)+10log k]/(1+k)', '1/γ = 1/(C/N) + 1/(C/I)', 'r = B log₂(1+γ)'] }; } });

reg({ id: 'tdma', ch: 6, title: 'TDMA integer frame design', topic: 'TDMA',
  rand(R) { for (;;) { const p = { Rs: R.pick([30, 40, 60, 90, 120]), rho: R.pick([1 / 2, 2 / 3, 3 / 4, 7 / 8]), TF: R.pick([1, 2, 4, 5]), Rq: R.pick([1, 2, 4, 6, 8]), pre: R.pick([176, 280]) }; const Ns = p.Rs * 1e3 * p.TF, bits = 64 * 2 * p.rho, n = Math.ceil(p.Rq * 1e3 * p.TF / bits - 1e-9); if (Math.floor((Ns - 704) / (p.pre + 64 + 64 * n)) >= 2) return p; } },
  practice: { Rs: 60, rho: 3 / 4, TF: 2, Rq: 4, pre: 280 },
  build(p) { const Ns = p.Rs * 1e3 * p.TF, ref = 2 * (288 + 64), bits = 64 * 2 * p.rho, need = p.Rq * 1e3 * p.TF, n = Math.ceil(need / bits - 1e-9), ovh = p.pre + 64, burst = ovh + 64 * n, P = Math.floor((Ns - ref) / burst), blk = Math.floor((Ns - ref - P * ovh) / (64 * P)), tot = P * blk * bits / (p.TF * 1e-3) / 1e6, eff = P * blk * 64 / Ns * 100, idle = Ns - ref - P * (ovh + 64 * blk);
    return { st: `QPSK TDMA, R<sub>s</sub> = <b>${p.Rs} Msym/s</b>, FEC <b>${frac(p.rho)}</b>, frame T<sub>F</sub> = <b>${p.TF} ms</b>. Two reference bursts of 288 symbols. Each traffic burst: <b>${p.pre}</b>-symbol preamble + integer number of 64-symbol coded blocks. One 64-symbol guard per burst (references included). Each station sends one burst per frame and needs <b>${p.Rq} Mb/s</b>.`,
      qs: [q('Information bits per block', bits, 'bits', 0), qi('Blocks needed per station', n), qi('Max number of stations P', P), qi('Max equal blocks per station', blk), q('Total information rate', tot, 'Mb/s', 3), q('Payload-symbol efficiency', eff, '%', 2, { abs: 0.05 }), qi('Idle symbols', idle)],
      steps: [`N_s = R_s·T_F = <b>${Ns}</b> symbols; references 2×(288+64) = ${ref}; bits/block = 64×2×${frac(p.rho)} = <b>${bits}</b>.`, `Need ${need} bits/frame → n = ⌈${need}/${bits}⌉ = <b>${n}</b>; burst = ${ovh}+64×${n} = ${burst}.`,
        `P = ⌊(${Ns}−${ref})/${burst}⌋ = <b>${P}</b> (P+1 would need ${ref + (P + 1) * burst} > ${Ns}).`, `Blocks = ⌊(${Ns}−${ref}−${P}×${ovh})/(64×${P})⌋ = <b>${blk}</b> → total ${P}×${blk}×${bits}/T_F = <b>${F(tot)} Mb/s</b>; η = <b>${F(eff, 2)}%</b>; idle = <b>${idle}</b>.`],
      fm: ['N_s = R_s·T_F', 'bits/block = 64·m·ρ', 'n = ⌈need/bits⌉', 'P = ⌊(N_s−ref)/(pre+g+64n)⌋'] }; } });

reg({ id: 'sync', ch: 6, title: 'TDMA guard time & closed-loop synchronization', topic: 'TDMA synchronization',
  rand(R) { for (;;) { const p = { e0: R.pick([0.05, 0.1, 0.15]), dr: R.pick([10, 20, 30]), L: R.u(0.3, 1, 0.05), g: R.pick([0.8, 1, 1.5, 2]), T: R.pick([5, 10, 15]), Rs: R.pick([30, 60, 90]), K: R.pick([0.5, 0.8, 1.2, 1.5]), d: R.u(0.005, 0.02, 0.001), x0: R.u(0.2, 0.5, 0.05) };
      if ((p.g - 2 * p.e0) / (2 * p.dr / 1000) - p.L > 1) return p; } },
  practice: { e0: 0.1, dr: 20, L: 0.55, g: 1, T: 10, Rs: 60, K: 1.5, d: 0.011, x0: 0.4 },
  build(p) { const dr = p.dr / 1000, Tm = (p.g - 2 * p.e0) / (2 * dr) - p.L, gm = 2 * p.e0 + 2 * dr * (p.T + p.L), sym = Math.ceil(gm * p.Rs - 1e-9), e1 = (1 - p.K) * p.x0 + p.d, e2 = (1 - p.K) * e1 + p.d;
    return { st: `Adjacent TDMA bursts, guard g = <b>${p.g} µs</b>. After an update each station's timing error is within ±<b>${p.e0} µs</b>; each drifts up to <b>${p.dr} ns/s</b> toward the other. Updates every T s, effective after L = <b>${p.L} s</b>. Symbol rate <b>${p.Rs} Msym/s</b>. Sampled loop: e[j+1] = (1−K)e[j] + d with K = <b>${p.K}</b>, d = <b>${p.d} µs</b>, e[0] = <b>${p.x0} µs</b>.`,
      qs: [q('Max update period T', Tm, 's', 3), q(`Min guard for T = ${p.T} s`, gm, 'µs', 3), qi('Guard in symbols', sym), q('Steady-state error e∞', p.d / p.K, 'µs', 4), q('e[1]', e1, 'µs', 4), q('e[2]', e2, 'µs', 4)],
      steps: [`Worst case: 2e₀ + 2·drift·(T+L) ≤ g → T ≤ (g−2e₀)/(2·drift) − L = (${p.g}−${2 * p.e0})/${2 * dr} − ${p.L} = <b>${F(Tm)} s</b>.`, `T = ${p.T}: g ≥ ${2 * p.e0} + ${2 * dr}×${p.T + p.L} = <b>${F(gm)} µs</b> → ×${p.Rs} = ${F(gm * p.Rs, 2)} → <b>${sym} symbols</b>.`,
        `Stable if 0 < K < 2; e∞ = d/K = <b>${F(p.d / p.K, 4)} µs</b>.`, `e[1] = (1−${p.K})×${p.x0} + ${p.d} = <b>${F(e1, 4)}</b>; e[2] = <b>${F(e2, 4)} µs</b>${p.K > 1 ? ' (oscillating convergence)' : ''}.`],
      fm: ['g ≥ 2e₀ + 2·drift·(T+L)', 'e[j+1] = (1−K)e[j] + d', 'stable: 0<K<2, e∞ = d/K'] }; } });

reg({ id: 'cdma', ch: 6, title: 'DS-CDMA admission & near-far', topic: 'CDMA',
  rand(R) { for (;;) { const p = { Bn: R.pick([3.84, 5, 10, 16.384]), Rb: R.pick([8, 16, 32, 64]), rho: R.pick([1 / 3, 1 / 2, 1]), g: R.u(3, 8, 0.5), tau: R.pick([0.35, 0.4, 0.5]), N: 0 };
      const G = p.Bn * 1e3 / (p.Rb / p.rho), bud = G / lin(p.g); if (bud > 10) { p.N = Math.max(2, Math.floor(0.5 * bud / p.tau)); return p; } } },
  practice: { Bn: 16.384, Rb: 32, rho: 0.5, g: 5, tau: 0.4, N: 100 },
  build(p) { const Rc = p.Rb / p.rho, G = p.Bn * 1e3 / Rc, bud = G / lin(p.g), n1 = Math.floor(bud + 1e-9) + 1, n2 = Math.floor(bud / p.tau + 1e-9) + 1, qm = bud - p.tau * (p.N - 2);
    return { st: `DS-CDMA, B<sub>n</sub> = R<sub>c</sub> = <b>${p.Bn} Mchip/s</b>. Each user: R<sub>b</sub> = <b>${p.Rb} kb/s</b>, code rate <b>${frac(p.rho)}</b>. Required coded-bit γ = <b>${p.g} dB</b>. No thermal noise; perfect power control (all received at C). Voice activity τ = <b>${p.tau}</b> (mean-interference model). Near-far: with N = <b>${p.N}</b> users, one interferer arrives at q·C.`,
      qs: [q('Spreading factor Bn/Rcoded', G, '', 2), q('Interference budget ΣP/C', bud, '', 3), qi('N_max (continuous activity)', n1), qi('N_max (mean activity)', n2), q('Max near-far factor q', db(qm), 'dB', 3)],
      steps: [`R_coded = ${p.Rb}/${frac(p.rho)} = ${F(Rc, 2)} kb/s → B_n/R_coded = <b>${F(G, 2)}</b>.`, `γ = (B_n/R_coded)/(ΣP/C) ≥ ${F(lin(p.g), 3)} → ΣP/C ≤ <b>${F(bud)}</b>.`,
        `Continuous: N−1 ≤ ${F(bud)} → <b>${n1}</b>; mean activity: τ(N−1) ≤ ${F(bud)} → <b>${n2}</b> (mean ≠ guarantee: outage when more users are active).`, `q + τ(N−2) ≤ budget → q ≤ ${F(bud)} − ${p.tau}×${p.N - 2} = ${F(qm)} → <b>${F(db(qm))} dB</b>.`],
      fm: ['γ = (B_n/R_coded)/(ΣP_i/C)', 'N_max = 1 + budget/τ', 'q ≤ budget − τ(N−2)'] }; } });

reg({ id: 'erlang', ch: 6, title: 'Fixed assignment vs DAMA (Erlang B)', topic: 'DAMA',
  rand(R) { return { pairs: R.pick([12, 20, 30]), A: R.u(0.8, 2.5, 0.1), h: R.pick([90, 120, 180, 240]), cpp: R.u(3, 6) }; },
  practice: { pairs: 30, A: 1.5, h: 120, cpp: 4 },
  build(p) { const At = p.pairs * p.A, lam = At / p.h, Bf = erlangB(p.cpp, p.A), car = At * (1 - Bf); let cp = 1; while (erlangB(cp, At) > 0.01) cp++; let cq = 1; while (erlangB(cq, p.A) > 0.01) cq++; const save = p.pairs * cq - cp;
    return { st: `<b>${p.pairs}</b> directed station pairs, each offering <b>${p.A} erlang</b> (Poisson arrivals, mean holding <b>${p.h} s</b>). Fixed assignment gives <b>${p.cpp}</b> channels per pair; DAMA pools all ${p.pairs * p.cpp} channels. Blocked calls are cleared. Target blocking ≤ 1%. Erlang B: B(0)=1, B(c) = A·B(c−1)/(c + A·B(c−1)).`,
      qs: [q('Total call arrival rate', lam, 'calls/s', 4), q('Fixed-assignment blocking', Bf * 100, '%', 3, { abs: 0.01 }), q('Carried traffic (fixed)', car, 'E', 3), qi('Min pooled channels for 1%', cp), qi('Min channels per pair for 1%', cq), qi('Channels saved by DAMA', save)],
      steps: [`A_tot = ${p.pairs}×${p.A} = ${F(At, 1)} E; λ = A/h = <b>${F(lam, 4)} calls/s</b>.`, `B(${p.cpp}, ${p.A}) by recursion = <b>${F(Bf * 100)}%</b>; carried = A(1−B) = <b>${F(car)} E</b>.`,
        `Pool: B(${cp - 1}, ${F(At, 1)}) = ${F(erlangB(cp - 1, At) * 100, 3)}% > 1%, B(${cp}) = ${F(erlangB(cp, At) * 100, 3)}% → <b>${cp}</b>.`, `Per pair: B(${cq}, ${p.A}) = ${F(erlangB(cq, p.A) * 100, 3)}% → ${cq}×${p.pairs} = ${cq * p.pairs}; saving <b>${save}</b> channels.`],
      fm: ['B(c) = A·B(c−1)/(c + A·B(c−1))', 'λ = A/h', 'carried = A(1−B)'] }; } });

function alohaLow(S, k) { let G = S; for (let i = 0; i < 500; i++) G = S * Math.exp(k * G); return G; }
reg({ id: 'aloha', ch: 6, title: 'Pure vs slotted ALOHA: equilibrium & delay', topic: 'Random access',
  rand(R) { for (;;) { const p = { L: R.pick([200, 500, 1000, 1500]), R: R.pick([0.5, 1, 2]), S: R.u(0.03, 0.16, 0.01), tp: R.pick([250, 270]), To: R.pick([500, 600, 800]), bo: R.pick([100, 200, 300]) }; return p; } },
  practice: { L: 1000, R: 1, S: 0.15, tp: 250, To: 600, bo: 200 },
  build(p) { const tau = p.L * 8 / (p.R * 1e3), lam = p.S / (tau / 1e3), G1 = alohaLow(p.S, 2), G2 = alohaLow(p.S, 1), p1 = Math.exp(-2 * G1), p2 = Math.exp(-G2), D1 = tau + p.tp + (1 / p1 - 1) * (p.To + p.bo), D2 = tau + p.tp + (1 / p2 - 1) * (p.To + p.bo);
    return { st: `Random access channel: <b>${p.L}-byte</b> packets at <b>${p.R} Mb/s</b>; new packets λ = <b>${F(lam, 3)} packets/s</b>. Pure ALOHA S = Ge<sup>−2G</sup>, slotted S = Ge<sup>−G</sup>. A success delivers after τ<sub>p</sub> + <b>${p.tp} ms</b>; each failure costs a <b>${p.To} ms</b> timeout + <b>${p.bo} ms</b> mean backoff. Use the low-load equilibrium, p = e<sup>−kG</sup>.`,
      qs: [q('Packet duration τp', tau, 'ms', 3), q('Throughput S', p.S, '', 3), q('G (pure, low root)', G1, '', 3), q('Success probability p (pure)', p1, '', 3), q('E[D] pure', D1, 'ms', 2), q('G (slotted, low root)', G2, '', 3), q('E[D] slotted', D2, 'ms', 2)],
      steps: [`τ_p = ${p.L * 8}/${p.R} Mb/s = <b>${F(tau)} ms</b>; S = λτ_p = <b>${F(p.S)}</b> (< 0.184 pure, < 0.368 slotted → supportable).`, `Low root by iteration G = S·e^(kG): pure <b>${F(G1)}</b>, slotted <b>${F(G2)}</b>.`,
        `p = e^(−kG): pure ${F(p1)} (${F(1 / p1)} attempts), slotted ${F(p2)}.`, `E[D] = (τ_p + ${p.tp}) + (1/p − 1)(${p.To}+${p.bo}): pure <b>${F(D1, 2)} ms</b>, slotted <b>${F(D2, 2)} ms</b>.`],
      fm: ['S = G e^(−2G) (pure), G e^(−G) (slotted)', 'p = e^(−kG), attempts = 1/p', 'E[D] = (τ_p+t_p) + (1/p−1)(T_out+backoff)'] }; } });

/* ======================= CH7 ======================= */
reg({ id: 'mesh', ch: 7, title: 'Mesh vs star: links, EIRP saving, delay', topic: 'Network topologies',
  rand(R) { return { N: R.u(10, 100, 5), d: R.u(36000, 40000, 500), T: R.u(65, 80), at: R.pick([7, 10, 13]), ar: R.pick([1, 2, 3]), hub: R.pick([10, 15, 20]), obp: R.pick([2, 5, 8]) }; },
  practice: { N: 50, d: 38000, T: 75, at: 10, ar: 2, hub: 15, obp: 5 },
  build(p) { const D = p.T + db(1 + 1 / lin(p.at)), U = D + p.at, Ur = p.T + p.ar, hop = 2 * p.d / 3e5 * 1e3, star = 2 * hop + p.hub, mesh = hop + p.obp;
    return { st: `<b>${p.N}</b> VSATs via GEO (slant range <b>${p.d} km</b>). Mesh link target (C/N₀)<sub>T</sub> = <b>${p.T} dBHz</b>. Transparent repeater needs α = (C/N₀)<sub>U</sub>/(C/N₀)<sub>D</sub> = <b>${p.at} dB</b>; regenerative needs (C/N₀)<sub>D</sub> = ${p.T} dBHz and α = <b>${p.ar} dB</b>. Hub switching <b>${p.hub} ms</b> (star, 2 hops), on-board switching <b>${p.obp} ms</b> (mesh, 1 hop).`,
      qs: [qi('Mesh bidirectional links', p.N * (p.N - 1) / 2), q('Transparent (C/N0)D', D, 'dBHz', 3), q('Transparent (C/N0)U', U, 'dBHz', 3), q('EIRP reduction with OBP', U - Ur, 'dB', 3), q('Star one-way delay', star, 'ms', 3), q('Mesh one-way delay', mesh, 'ms', 3)],
      steps: [`Links = N(N−1)/2 = <b>${p.N * (p.N - 1) / 2}</b> (star: ${p.N}).`, `Transparent: D = T(1 + 1/α) → ${p.T} + 10log(1+10^(−${p.at}/10)) = <b>${F(D)}</b>; U = D + α = <b>${F(U)} dBHz</b>.`,
        `Regenerative U = ${p.T}+${p.ar} = ${Ur} → saving <b>${F(U - Ur)} dB</b>.`, `Hop = 2d/c = ${F(hop)} ms → star <b>${F(star)}</b>, mesh <b>${F(mesh)} ms</b> (RTT ×2).`],
      fm: ['links = N(N−1)/2', 'D = T + 10log(1+1/α)', 'delay = hops·2d/c + processing'] }; } });

reg({ id: 'sstdma', ch: 7, title: 'SS-TDMA frame efficiency & capacity', topic: 'On-board switching',
  rand(R) { return { M: R.pick([4, 8, 12, 16]), TF: R.pick([2, 10, 20]), sync: R.pick([100, 200, 400]), nb: 0, tb: R.pick([15, 25, 40]), ts: R.pick([10, 15, 20]), un: R.u(200, 1500, 100), so: R.u(100, 600, 20), gr: R.pick([2, 5, 8]), Rm: R.pick([60, 120, 240]) }; },
  practice: { M: 16, TF: 20, sync: 400, nb: 32, tb: 25, ts: 15, un: 1500, so: 560, gr: 5, Rm: 120 },
  build(p) { if (!p.nb) p.nb = 2 * p.M; const tf = p.TF * 1000, un = Math.min(p.un, tf * 0.1), so = Math.min(p.so, tf * 0.05); const sum = p.sync + p.nb * p.tb + p.M * p.ts + un + so + p.gr / 100 * tf, eta = 1 - sum / tf, cap = p.M * p.Rm * eta / 1000;
    return { st: `M = <b>${p.M}</b> spot beams. Transponder hopping vs SS-TDMA (${p.M}×${p.M} switch). Frame T<sub>F</sub> = <b>${p.TF} ms</b>. Dead time: sync <b>${p.sync} µs</b>; <b>${p.nb}</b> bursts × <b>${p.tb} µs</b> header/guard; <b>${p.M}</b> switch transitions × <b>${p.ts} µs</b>; unbalanced traffic <b>${un} µs</b>; sub-optimal BTP <b>${so} µs</b>; growth reserve <b>${p.gr}%</b> of T<sub>F</sub>. Burst rate <b>${p.Rm} Mb/s</b> per beam.`,
      qs: [qi('Filters for transponder hopping', p.M * p.M), q('Total dead time', sum / 1000, 'ms', 3), q('Frame efficiency', eta * 100, '%', 2, { abs: 0.05 }), q('Aggregate capacity', cap, 'Gb/s', 3)],
      steps: [`Hopping needs M² = <b>${p.M * p.M}</b> filters (SS-TDMA: ${p.M} repeaters + ${p.M}×${p.M} matrix).`, `Σt = ${p.sync} + ${p.nb}×${p.tb} + ${p.M}×${p.ts} + ${un} + ${so} + ${p.gr}%×${tf} = <b>${F(sum / 1000)} ms</b>.`, `η = 1 − Σt/T_F = <b>${F(eta * 100, 2)}%</b>; capacity = M·R·η = <b>${F(cap)} Gb/s</b>.`],
      fm: ['η = 1 − Σt_i/T_F', 'capacity = M·R·η'] }; } });

reg({ id: 'scan', ch: 7, title: 'Regenerative scanning beam buffer', topic: 'Scanning beams',
  rand(R) { return { K: R.u(4, 12), Tc: R.pick([20, 30, 45, 60]), tsw: R.pick([0.2, 0.5, 1]), Ra: R.pick([5, 10, 20, 50]) }; },
  practice: { K: 9, Tc: 45, tsw: 0.5, Ra: 20 },
  build(p) { const ram = p.K * p.Ra * p.Tc / 1000, dw = (p.Tc - p.K * p.tsw) / p.K, rb = p.Ra * p.Tc / dw;
    return { st: `A single regenerative scanning beam visits <b>K = ${p.K}</b> areas in a cycle of <b>${p.Tc} ms</b> (K transitions, each with a <b>${p.tsw} ms</b> switching guard). Each area needs an average <b>${p.Ra} Mb/s</b>.`,
      qs: [q('On-board RAM for one cycle', ram, 'Mbit', 3), q('Dwell time per area', dw, 'ms', 3), q('Burst rate while illuminating', rb, 'Mb/s', 3)],
      steps: [`RAM = K·R·T_cycle = ${p.K}×${p.Ra}×${p.Tc / 1000} = <b>${F(ram)} Mbit</b>.`, `t_dwell = (T − K·t_sw)/K = (${p.Tc} − ${F(p.K * p.tsw, 1)})/${p.K} = <b>${F(dw)} ms</b>.`, `R_burst = R·T_cycle/t_dwell = <b>${F(rb)} Mb/s</b>.`],
      fm: ['RAM = K·R·T_cycle', 't_dwell = (T_cycle − K·t_sw)/K', 'R_burst = R·T_cycle/t_dwell'] }; } });

reg({ id: 'rcs', ch: 7, title: 'DVB-RCS MF-TDMA burst & capacity requests', topic: 'DVB-RCS',
  rand(R) { for (;;) { const p = { np: R.pick([4, 8, 12, 24]), rho: R.pick([1 / 2, 2 / 3, 3 / 4]), al: R.pick([0.2, 0.25, 0.35]), ov: R.pick([32, 64]), Ts: R.pick([2, 4, 5, 8]), cra: R.pick([128, 256, 512]), rbdc: R.pick([256, 512, 1024, 2048]), Tsf: R.pick([250, 500]), bl: R.u(300, 1500, 50) };
      if (p.bl > (p.cra + p.rbdc) * p.Tsf / 1000) return p; } },
  practice: { np: 24, rho: 3 / 4, al: 0.35, ov: 64, Ts: 5, cra: 512, rbdc: 1024, Tsf: 250, bl: 650 },
  build(p) { const bits = p.np * 188 * 8, sym = bits / p.rho / 2 + p.ov, Rs = sym / (p.Ts * 1e-3) / 1e6, B = (1 + p.al) * Rs, vol = (p.cra + p.rbdc) * p.Tsf / 1000, vb = p.bl - vol, nb = Math.ceil(p.bl * 1000 / bits - 1e-9);
    return { st: `DVB-RCS return link: each TRF burst carries <b>${p.np}</b> MPEG-2 TS packets (188 bytes), FEC <b>${frac(p.rho)}</b>, QPSK, α = <b>${p.al}</b>, +<b>${p.ov}</b> overhead symbols, slot <b>${p.Ts} ms</b>. Terminal has CRA = <b>${p.cra} kb/s</b>, RBDC = <b>${p.rbdc} kb/s</b>, superframe <b>${p.Tsf} ms</b>, backlog <b>${p.bl} kbit</b>.`,
      qs: [q('Symbol rate', Rs, 'Msps', 3), q('Carrier bandwidth', B, 'MHz', 3), q('Volume served by CRA+RBDC', vol, 'kbit', 1), q('VBDC request', vb, 'kbit', 1), qi('Total bursts to clear the backlog', nb)],
      steps: [`Bits = ${p.np}×188×8 = ${bits} → /ρ/2 + ${p.ov} = ${F(sym, 0)} symbols in ${p.Ts} ms → <b>R_s = ${F(Rs)} Msps</b>; B = (1+α)R_s = <b>${F(B)} MHz</b>.`, `Rate grants: (${p.cra}+${p.rbdc})×${p.Tsf / 1000} s = <b>${F(vol, 1)} kbit</b> → VBDC = <b>${F(vb, 1)} kbit</b>.`, `Bursts = ⌈${p.bl}·10³/${bits}⌉ = <b>${nb}</b>.`],
      fm: ['R_s = (bits/ρ/m + ovh)/T_slot', 'vol = (CRA+RBDC)·T_SF', 'VBDC = backlog − vol'] }; } });

reg({ id: 'tcp', ch: 7, title: 'TCP slow start & congestion avoidance over GEO', topic: 'TCP, PEP',
  rand(R) { return { R: R.pick([2, 5, 10, 20, 50]), RTT: R.u(500, 650, 10), ss: R.pick([8, 16, 32, 64]), n: R.u(4, 10) }; },
  practice: { R: 20, RTT: 560, ss: 32, n: 8 },
  build(p) { const bdp = p.R * 1e6 * p.RTT / 1000 / 8 / 1000, peak = p.ss + p.n, thr = peak * 8 / (p.RTT / 1000) / 1000, k = Math.log2(p.ss), steps = k + p.n, tpk = steps * p.RTT / 1000;
    let vol = 0; for (let c = 1; c <= p.ss; c *= 2) vol += c; for (let i = 1; i <= p.n; i++) vol += p.ss + i; const ss2 = Math.floor(peak / 2); let c = 1, r = 0; while (c < ss2) { c = Math.min(2 * c, ss2); r++; }
    return { st: `GEO link at <b>${p.R} Mb/s</b>, RTT = <b>${p.RTT} ms</b>, MSS = 1 kB. Slow start from cwnd = 1 kB (×2 per RTT) up to ssthresh = <b>${p.ss} kB</b>, then +1 kB per RTT. After <b>${p.n}</b> RTTs of congestion avoidance a timeout occurs (ssthresh₂ = cwnd/2, cwnd → 1 kB).`,
      qs: [q('Bandwidth-delay product', bdp, 'kB', 1), q('Throughput at the peak window', thr, 'Mb/s', 3), q('Link utilization at the peak', thr / p.R * 100, '%', 3), q('Time from RTT 1 to the peak', tpk, 's', 3), q('Volume sent up to the peak', vol, 'kB', 0), q('New ssthresh', ss2, 'kB', 0), q('Recovery time to ssthresh₂', r * p.RTT / 1000, 's', 3)],
      steps: [`BDP = R·RTT = ${p.R}·10⁶×${p.RTT / 1000}/8 = <b>${F(bdp, 1)} kB</b>.`, `Peak cwnd = ${p.ss}+${p.n} = ${peak} kB → throughput = cwnd/RTT = <b>${F(thr)} Mb/s</b> (${F(thr / p.R * 100)}%).`,
        `Intervals to peak = log₂${p.ss} + ${p.n} = ${steps} → <b>${F(tpk)} s</b>; volume = (1+2+…+${p.ss}) + (${p.ss + 1}+…+${peak}) = <b>${vol} kB</b>.`, `ssthresh₂ = ${peak}/2 = <b>${ss2} kB</b>; 1 → … → ${ss2} takes ${r} RTT = <b>${F(r * p.RTT / 1000)} s</b>.`],
      fm: ['BDP = R·RTT', 'throughput = cwnd/RTT', 'timeout: ssthresh = cwnd/2, cwnd = 1'] }; } });

/* ======================= CH8 ======================= */
reg({ id: 'dopt', ch: 8, title: 'EIRP optimization with a fixed pointing error', topic: 'Earth station antenna',
  rand(R) { return { f: R.pick([6, 14, 18, 30]), eta: R.pick([0.6, 0.65, 0.7]), tp: R.u(0.05, 0.2, 0.01), D: R.pick([2, 3, 4, 5]), P: R.pick([100, 200, 300, 400]), obo: R.pick([0, 1, 3]), LF: R.pick([0.5, 1, 1.5]), tg: R.u(65, 80) }; },
  practice: { f: 14, eta: 0.65, tp: 0.12, D: 4, P: 200, obo: 3, LF: 1, tg: 75 },
  build(p) { const lam = C / (p.f * 1e9), th = 70 * lam / p.D, G = db(p.eta * (Math.PI * p.D / lam) ** 2), Lp = 12 * (p.tp / th) ** 2, Pa = db(p.P) - p.obo - p.LF, E = Pa + G - Lp, Do = (70 * lam / p.tp) * Math.sqrt(5 / (6 * Math.LN10)), Go = db(p.eta * (Math.PI * Do / lam) ** 2), Lo = 10 / Math.LN10, Eo = Pa + Go - Lo, Ps = lin(p.tg - Go + Lo + p.obo + p.LF);
    return { st: `Earth station at <b>${p.f} GHz</b>, η = <b>${p.eta}</b>, residual pointing error θ<sub>p</sub> = <b>${p.tp}°</b>. θ<sub>3dB</sub> = 70λ/D, G = η(πD/λ)², L<sub>p</sub> = 12(θ<sub>p</sub>/θ<sub>3dB</sub>)² dB. HPA P<sub>sat</sub> = <b>${p.P} W</b>, output back-off <b>${p.obo} dB</b>, feeder <b>${p.LF} dB</b>. Test diameter D = <b>${p.D} m</b>; target EIRP <b>${p.tg} dBW</b>.`,
      qs: [q('Beamwidth at D', th, '°', 3), q('Boresight gain at D', G, 'dBi', 3), q('Pointing loss at D', Lp, 'dB', 3), q('EIRP at D', E, 'dBW', 3), q('Optimum diameter', Do, 'm', 3), q('Max EIRP (at D_opt)', Eo, 'dBW', 3), q('Min Psat for the target at D_opt', Ps, 'W', 2, { rel: 0.005 })],
      steps: [`λ = ${F(lam * 100, 4)} cm; θ3dB = 70λ/D = <b>${F(th)}°</b>; G = <b>${F(G)} dBi</b>; L_p = 12(${p.tp}/${F(th)})² = <b>${F(Lp)} dB</b>.`, `P at antenna = 10log${p.P} − ${p.obo} − ${p.LF} = ${F(Pa)} dBW → EIRP = <b>${F(E)} dBW</b>.`,
        `dEIRP/dD = 0 → D_opt = (70λ/θ_p)·√(5/(6 ln10)) = ${F(70 * lam / p.tp)}×0.6016 = <b>${F(Do)} m</b>; there L_p = 10/ln10 = 4.343 dB.`, `G(D_opt) = ${F(Go)} dBi → EIRP_max = <b>${F(Eo)} dBW</b>; P_sat ≥ 10^[(${p.tg} − ${F(Go)} + 4.343 + ${p.obo + p.LF})/10] = <b>${F(Ps, 2)} W</b>.`],
      fm: ['D_opt = 0.602·70λ/θ_p', 'L_p,opt = 4.343 dB', 'EIRP = P − OBO − L_F + G − L_p'] }; } });

reg({ id: 'offaxis', ch: 8, title: 'Off-axis EIRP density limits', topic: 'Sidelobes, regulation',
  rand(R) { return { D: R.pick([1.2, 1.8, 2.4, 3.7]), f: R.pick([14, 30]), eta: R.pick([0.6, 0.65, 0.7]), B: R.pick([1, 2, 5, 10]), t1: R.pick([2, 2.5, 3]), l1: R.pick([-33, -30, -27]), t2: R.pick([3.5, 4, 6]), l2: R.pick([-38, -35, -32]), tg: R.u(55, 68) }; },
  practice: { D: 2.4, f: 14, eta: 0.65, B: 5, t1: 2, l1: -30, t2: 3.5, l2: -35, tg: 65 },
  build(p) { const lam = C / (p.f * 1e9), tmin = Math.max(1, 100 * lam / p.D), G0 = db(p.eta * (Math.PI * p.D / lam) ** 2), g1 = 29 - 25 * lg(p.t1), g2 = 29 - 25 * lg(p.t2), b = db(p.B * 1e6), P1 = p.l1 + b - g1, P2 = p.l2 + b - g2, Pm = Math.min(P1, P2), Em = Pm + G0, ex = p.tg - Em, Bn = p.B * Math.pow(10, Math.max(0, ex) / 10);
    return { st: `<b>${p.D} m</b> antenna at <b>${p.f} GHz</b>, η = <b>${p.eta}</b>; flat spectrum over B = <b>${p.B} MHz</b>. Sidelobe envelope G<sub>off</sub>(θ) = 29 − 25 log θ dBi for θ<sub>min</sub> = max(1°, 100λ/D) ≤ θ ≤ 20°. Limits: <b>${p.l1} dBW/Hz</b> at <b>${p.t1}°</b>, <b>${p.l2} dBW/Hz</b> at <b>${p.t2}°</b>. Desired on-axis EIRP <b>${p.tg} dBW</b>.`,
      qs: [q('θmin', tmin, '°', 3), q('Boresight gain', G0, 'dBi', 3), q(`Max P from the ${p.t1}° limit`, P1, 'dBW', 3), q(`Max P from the ${p.t2}° limit`, P2, 'dBW', 3), q('Max on-axis EIRP', Em, 'dBW', 3), qc('Is the target feasible?', ex <= 0 ? 'Yes' : 'No', ['Yes', 'No']), q('Min bandwidth for the target', Bn, 'MHz', 3)],
      steps: [`θ_min = max(1, ${F(100 * lam / p.D)}) = <b>${F(tmin)}°</b>; G₀ = <b>${F(G0)} dBi</b>.`, `G_off: ${F(g1)} dBi at ${p.t1}°, ${F(g2)} dBi at ${p.t2}°; 10log B = ${F(b)}.`,
        `P ≤ limit + 10log B − G_off: <b>${F(P1)}</b> and <b>${F(P2)} dBW</b> → binding ${P1 < P2 ? p.t1 : p.t2}° → EIRP_max = ${F(Pm)} + ${F(G0)} = <b>${F(Em)} dBW</b>.`, `Excess = ${F(ex)} dB → ${ex > 0 ? `B_min = ${p.B}×10^(${F(ex)}/10) = <b>${F(Bn)} MHz</b>` : 'feasible at the current bandwidth'}.`],
      fm: ['density = P − 10log B + G_off(θ)', 'G_off = 29 − 25log θ', 'B_min = B·10^(excess/10)'] }; } });

reg({ id: 'xpd', ch: 8, title: 'Cross-polar interference budget', topic: 'Polarization',
  rand(R) { for (;;) { const p = { cn: R.u(16, 24), ci: R.u(20, 30), x: R.pick([0, 3, 6]), tg: 0, xp: R.u(25, 40) }; p.tg = +(invsum(p.cn, p.ci) - R.u(0.3, 1.5, 0.1)).toFixed(1); if (lin(-p.tg) - lin(-p.cn) - lin(-p.ci) > 0) return p; } },
  practice: { cn: 20, ci: 25, x: 3, tg: 18.5, xp: 30 },
  build(p) { const tot = invsum(p.cn, p.ci, p.xp - p.x), rq = -db(lin(-p.tg) - lin(-p.cn) - lin(-p.ci)), xm = rq + p.x;
    return { st: `Receive side: C/N = <b>${p.cn} dB</b>, C/I<sub>adj</sub> = <b>${p.ci} dB</b>. A cochannel orthogonally polarized interferer is <b>${p.x} dB</b> stronger than the carrier before isolation: C/I<sub>pol</sub> = XPD − ${p.x} dB. Requirement: C/(N+I) ≥ <b>${p.tg} dB</b>.`,
      qs: [q(`Total C/(N+I) with XPD = ${p.xp} dB`, tot, 'dB', 3), q('Required C/Ipol', rq, 'dB', 3), q('Minimum XPD', xm, 'dB', 3)],
      steps: [`Linear inverses: 10^(−${p.cn}/10) + 10^(−${p.ci}/10) + 10^(−${p.xp - p.x}/10) → total = <b>${F(tot)} dB</b>.`, `C/I_pol ≥ −10log(10^(−${p.tg}/10) − 10^(−${p.cn}/10) − 10^(−${p.ci}/10)) = <b>${F(rq)} dB</b>.`, `XPD_min = ${F(rq)} + ${p.x} = <b>${F(xm)} dB</b>.`],
      fm: ['C/I_pol = XPD − x', '1/total = Σ 1/(C/X)_i'] }; } });

function enu(beta, lonS, phi, lonE) { const b = rad(beta), ph = rad(phi), dl = rad(lonS - lonE); return [RS * Math.cos(b) * Math.sin(dl), RS * (Math.sin(b) * Math.cos(ph) - Math.cos(b) * Math.cos(dl) * Math.sin(ph)), RS * (Math.sin(b) * Math.sin(ph) + Math.cos(b) * Math.cos(dl) * Math.cos(ph)) - RE]; }
reg({ id: 'look', ch: 8, title: 'GEO look angles (azimuth, elevation, range)', topic: 'Look angles',
  rand(R) { for (;;) { const p = { phi: R.u(-55, 55, 0.1), lon: R.u(0, 179, 1), dl: R.u(-60, 60, 1) }; if (Math.abs(p.phi) < 2 || p.dl === 0) continue; const v = enu(0, p.lon + p.dl, p.phi, p.lon); if (v[2] > 3000) return p; } },
  practice: { phi: 24.8, lon: 121, dl: -21 },
  build(p) { const ls = p.lon + p.dl, [E, N, U] = enu(0, ls, p.phi, p.lon), A = (deg(Math.atan2(E, N)) + 360) % 360, h = Math.hypot(E, N), el = deg(Math.atan2(U, h)), Rg = Math.hypot(E, N, U), quad = (N >= 0 ? 'N' : 'S') + (E >= 0 ? 'E' : 'W');
    return { st: `Earth station at latitude <b>${F(Math.abs(p.phi), 1)}° ${p.phi >= 0 ? 'N' : 'S'}</b>, longitude <b>${p.lon}° E</b>. GEO satellite at longitude <b>${ls}° E</b> (β = 0). Spherical Earth R<sub>E</sub> = 6378 km, r<sub>s</sub> = 42164 km. E = r<sub>s</sub>cosβ sinΔλ, N = r<sub>s</sub>(sinβ cosφ − cosβ cosΔλ sinφ), U = r<sub>s</sub>(sinβ sinφ + cosβ cosΔλ cosφ) − R<sub>E</sub>, Δλ = λ<sub>sat</sub> − λ<sub>sta</sub>.`,
      qs: [q('East component E', E, 'km', 1, { abs: 1 }), q('North component N', N, 'km', 1, { abs: 1 }), q('Up component U', U, 'km', 1, { abs: 1 }), q('Azimuth', A, '°', 2, { abs: 0.02 }), q('Elevation', el, '°', 2, { abs: 0.02 }), q('Slant range', Rg, 'km', 1, { abs: 1 })],
      steps: [`Δλ = ${p.dl}°, φ = ${p.phi}°: E = <b>${F(E, 1)}</b>, N = <b>${F(N, 1)}</b>, U = <b>${F(U, 1)} km</b>.`, `Quadrant ${quad}: A = atan2(E, N) mod 360 = <b>${F(A, 2)}°</b> (Casio: Pol(N, E), add 360 if negative).`, `ε = atan(U/√(E²+N²)) = atan(${F(U, 1)}/${F(h, 1)}) = <b>${F(el, 2)}°</b>; R = √(E²+N²+U²) = <b>${F(Rg, 1)} km</b>.`],
      fm: ['A = atan2(E, N) mod 360', 'ε = atan2(U, √(E²+N²))', 'R = √(E²+N²+U²)'] }; } });

reg({ id: 'track', ch: 8, title: 'Mean pointing loss with tracking residuals', topic: 'Tracking',
  rand(R) { return { D: R.pick([3, 4.5, 6, 9]), f: R.pick([12, 20, 30]), el: R.u(15, 75, 0.5), sa: R.u(0.01, 0.05, 0.005), se: R.u(0.01, 0.04, 0.005), lim: R.pick([0.3, 0.5, 1]) }; },
  practice: { D: 6, f: 30, el: 52.677, sa: 0.025, se: 0.02, lim: 0.5 },
  build(p) { const th = 70 * (C / (p.f * 1e9)) / p.D, c = Math.cos(rad(p.el)), m = 12 * ((p.sa * c) ** 2 + p.se ** 2) / th ** 2;
    return { st: `<b>${p.D} m</b> antenna at <b>${p.f} GHz</b> (θ<sub>3dB</sub> = 70λ/D, L<sub>p</sub> = 12(δ/θ<sub>3dB</sub>)²) tracks a satellite at elevation <b>${p.el}°</b>. Independent zero-mean residuals: σ<sub>A</sub> = <b>${p.sa}°</b> (azimuth), σ<sub>ε</sub> = <b>${p.se}°</b> (elevation). Mean-loss limit <b>${p.lim} dB</b>.`,
      qs: [q('Beamwidth', th, '°', 4), q('Mean pointing loss', m, 'dB', 3), qc('Meets the limit?', m <= p.lim ? 'Yes' : 'No', ['Yes', 'No'])],
      steps: [`θ3dB = 70λ/D = <b>${F(th, 4)}°</b>.`, `On-sky azimuth error = ΔA·cos ε (cos ${p.el}° = ${F(c, 4)}); E[δ²] = σ_A²cos²ε + σ_ε².`, `E[L_p] = 12(${F((p.sa * c) ** 2, 6)} + ${F(p.se ** 2, 6)})/${F(th ** 2, 5)} = <b>${F(m)} dB</b> → ${m <= p.lim ? 'meets' : 'exceeds'} ${p.lim} dB.`],
      fm: ['E[L_p] = 12(σ_A²cos²ε + σ_ε²)/θ3dB²'] }; } });

/* ======================= CH9 ======================= */
reg({ id: 'gteirp', ch: 9, title: 'Joint optimization of satellite G/T and EIRP', topic: 'Payload trade-off',
  rand(R) { for (;;) { const p = { U: R.u(78, 86), D: R.u(74, 82), T: 0, cu: R.u(1, 4), cv: R.u(1, 4) }; p.T = R.u(Math.ceil(invsum(p.U, p.D)) , Math.min(p.U, p.D)); const a = lin(p.T - p.U), b = lin(p.T - p.D), u = a + Math.sqrt(a * b * p.cv / p.cu), v = b + Math.sqrt(a * b * p.cu / p.cv); if (u >= 1 && v >= 1 && u < 3 && v < 4) return p; } },
  practice: { U: 80, D: 78, T: 78, cu: 3, cv: 2 },
  build(p) { const base = invsum(p.U, p.D), a = lin(p.T - p.U), b = lin(p.T - p.D), u = a + Math.sqrt(a * b * p.cv / p.cu), v = b + Math.sqrt(a * b * p.cu / p.cv), J = p.cu * (u - 1) + p.cv * (v - 1);
    return { st: `Transparent link: (C/N₀)<sub>U0</sub> = <b>${p.U}</b>, (C/N₀)<sub>D0</sub> = <b>${p.D} dBHz</b>. Improving satellite G/T by u multiplies the uplink ratio by u; increasing EIRP by v multiplies the downlink by v. Cost J = <b>${p.cu}</b>(u−1) + <b>${p.cv}</b>(v−1). Target (C/N₀)<sub>T</sub> ≥ <b>${p.T} dBHz</b>.`,
      qs: [q('Baseline overall C/N0', base, 'dBHz', 3), q('a = Γ*/ΓU0', a, '', 4), q('b = Γ*/ΓD0', b, '', 4), q('Optimal u', u, '', 3), q('Optimal v', v, '', 3), q('G/T improvement', db(u), 'dB', 3), q('EIRP improvement', db(v), 'dB', 3), q('Minimum cost J', J, '', 3)],
      steps: [`Baseline = −10log(10^(−${p.U}/10)+10^(−${p.D}/10)) = <b>${F(base)} dBHz</b>.`, `a = 10^((${p.T}−${p.U})/10) = <b>${F(a, 4)}</b>, b = <b>${F(b, 4)}</b>; constraint a/u + b/v ≤ 1.`,
        `Lagrange: u = a + √(ab·c_v/c_u) = <b>${F(u)}</b>, v = b + √(ab·c_u/c_v) = <b>${F(v)}</b>.`, `+${F(db(u))} dB G/T, +${F(db(v))} dB EIRP, J = <b>${F(J)}</b>.`],
      fm: ['a/u + b/v ≤ 1', 'u* = a + √(ab c_v/c_u)', 'v* = b + √(ab c_u/c_v)'] }; } });

reg({ id: 'twotone', ch: 9, title: 'Two-tone intermodulation in a cubic amplifier', topic: 'Nonlinearity',
  rand(R) { return { a1: R.u(5, 20), a3: R.u(0.5, 4, 0.5), ci: R.u(25, 45, 5) }; },
  practice: { a1: 10, a3: 2, ci: 35 },
  build(p) { const r = Math.pow(10, p.ci / 20), A = Math.sqrt(p.a1 / (2.25 * p.a3 + 0.75 * p.a3 * r)), Fv = p.a1 * A - 2.25 * p.a3 * A ** 3, M = 0.75 * p.a3 * A ** 3, cg = -20 * lg(Fv / (p.a1 * A)), A1 = Math.sqrt(p.a1 * (1 - Math.pow(10, -1 / 20)) / (0.75 * p.a3));
    return { st: `Memoryless amplifier y = <b>${p.a1}</b>x − <b>${p.a3}</b>x³ (1 Ω, volts). Two equal input tones of amplitude A at f₁, f₂ (products 2f₁−f₂, 2f₂−f₁ fall in-band). Require C/IM ≥ <b>${p.ci} dB</b>. Power = V²/2.`,
      qs: [q('Max amplitude A', A, 'V', 4), q('Wanted output amplitude F', Fv, 'V', 3), q('IM3 amplitude M', M, 'V', 4), q('Output power per tone', Fv * Fv / 2, 'W', 3), q('IM power per product', M * M / 2 * 1000, 'mW', 3), q('Gain compression', cg, 'dB', 3), q('Single-tone 1 dB compression amplitude', A1, 'V', 3)],
      steps: [`Two tones: F = a₁A − (9/4)a₃A³, M = (3/4)a₃A³.`, `(F/M) ≥ 10^(${p.ci}/20) = ${F(r)} → A = √(a₁/((9/4)a₃ + (3/4)a₃·${F(r)})) = <b>${F(A, 4)} V</b>.`,
        `F = <b>${F(Fv)} V</b>, M = <b>${F(M, 4)} V</b>; P_C = F²/2 = <b>${F(Fv * Fv / 2)} W</b>, P_IM = <b>${F(M * M / 2 * 1000)} mW</b>; compression = −20log(F/(a₁A)) = <b>${F(cg)} dB</b>.`, `One tone: a₁A − (3/4)a₃A³; 1 dB → A₁dB = √(a₁(1−10^(−1/20))/(0.75a₃)) = <b>${F(A1)} V</b> ≫ two-tone limit.`],
      fm: ['F = a₁A − (9/4)a₃A³', 'M = (3/4)a₃A³', 'C/IM = (F/M)²', 'A₁dB = √(a₁(1−10^(−1/20))/(0.75a₃))'] }; } });

reg({ id: 'obobal', ch: 9, title: 'Output back-off balancing thermal noise and IM', topic: 'Multicarrier transponder',
  rand(R) { for (;;) { const p = { U: R.u(20, 30), a: R.u(20, 28), c: R.u(8, 16), k: 2, P: R.pick([50, 100, 150, 250]), LF: R.pick([0.5, 1, 1.5]), G: R.u(30, 45) }; const b = (p.a - p.c + 10 * lg(p.k)) / (1 + p.k); if (b > 0.5 && b < 7.5) return p; } },
  practice: { U: 25, a: 24, c: 12, k: 2, P: 150, LF: 1, G: 42 },
  build(p) { const b = (p.a - p.c + 10 * lg(p.k)) / (1 + p.k), cd = p.a - b, ci = p.c + p.k * b, Qv = invsum(p.U, cd, ci), Po = p.P * Math.pow(10, -b / 10), E = db(p.P) - b - p.LF + p.G;
    return { st: `Multicarrier transparent transponder, output back-off B (dB): (C/N)<sub>U</sub> = <b>${p.U}</b>, (C/N)<sub>D</sub> = <b>${p.a} − B</b>, (C/I)<sub>IM</sub> = <b>${p.c} + ${p.k}B</b>. HPA saturated output <b>${p.P} W</b>, feeder <b>${p.LF} dB</b>, antenna <b>${p.G} dBi</b>.`,
      qs: [q('Optimum back-off', b, 'dB', 3), q('(C/N)D at the optimum', cd, 'dB', 3), q('(C/I)IM at the optimum', ci, 'dB', 3), q('Overall C/(N+I)', Qv, 'dB', 3), q('Total HPA output power', Po, 'W', 3), q('Aggregate EIRP', E, 'dBW', 3)],
      steps: [`Constant uplink does not move the optimum: B* = [(${p.a}−${p.c})+10log${p.k}]/${1 + p.k} = <b>${F(b)} dB</b> (downlink noise = ${p.k}× IM).`, `(C/N)_D = <b>${F(cd)}</b>, (C/I) = <b>${F(ci)}</b> → overall = <b>${F(Qv)} dB</b>.`, `P_out = ${p.P}×10^(−B/10) = <b>${F(Po)} W</b>; EIRP = 10log${p.P} − B − ${p.LF} + ${p.G} = <b>${F(E)} dBW</b> (aggregate, all carriers).`],
      fm: ['B* = [(a−c)+10log k]/(1+k)', '1/Q = Σ 1/(C/X)_i'] }; } });

function alphaMax(r, cap, S) { const cand = []; r.forEach(row => row.forEach(x => { for (let k = 1; k <= S; k++) cand.push(k * cap / x); })); cand.sort((a, b) => a - b);
  const ok = al => { const n = r.map(row => row.map(x => Math.ceil(al * x / cap - 1e-9))); const rs = n.map(row => row.reduce((a, b) => a + b, 0)), cs = [0, 1, 2].map(j => n.reduce((a, row) => a + row[j], 0)); return Math.max(...rs, ...cs) <= S; };
  let best = 0; for (const c of cand) { if (ok(c)) best = c; else break; } return best; }
reg({ id: 'switch', ch: 9, title: 'Buffered 3×3 switching with integer slots', topic: 'On-board switching',
  rand(R) { const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]].map(row => row.map(() => R.u(2, 30))); return { r, Rc: 100, Ts: 1, g: 0.02, S: 20 }; },
  practice: { r: [[19, 24, 10], [14, 9, 29], [24, 19, 5]], Rc: 100, Ts: 1, g: 0.02, S: 20 },
  build(p) { const bits = p.Rc * 1e6 * (p.Ts - p.g) * 1e-3, cap = bits / (p.S * p.Ts * 1e-3) / 1e6, n = p.r.map(row => row.map(x => Math.ceil(x / cap - 1e-9))), rs = n.map(row => row.reduce((a, b) => a + b, 0)), cs = [0, 1, 2].map(j => n.reduce((a, row) => a + row[j], 0)), mn = Math.max(...rs, ...cs);
    const lineR = Math.max(...p.r.map(row => row.reduce((a, b) => a + b, 0)), ...[0, 1, 2].map(j => p.r.reduce((a, row) => a + row[j], 0))), ac = p.S * cap / lineR, am = alphaMax(p.r, cap, p.S);
    return { st: `Regenerative 3×3 buffered switch. Frame = <b>${p.S}</b> slots of <b>${p.Ts} ms</b>; each connection sends <b>${p.Rc} Mb/s</b> during the slot minus a <b>${p.g} ms</b> guard. Each port: one connection per slot. Requested rates (Mb/s), rows = uplinks, columns = downlinks: <b>${p.r.map(r => '(' + r.join(', ') + ')').join(', ')}</b>. Integer slots per pair.`,
      qs: [q('Bits per slot', bits, 'bits', 0), q('Average rate per slot per frame', cap, 'Mb/s', 3), qi('Minimum active slots', mn), q('Max common scaling α (integer slots)', am, '', 3), q('Continuous scaling limit', ac, '', 3)],
      steps: [`Bits/slot = ${p.Rc}·10⁶×${F(p.Ts - p.g, 3)}·10⁻³ = <b>${bits}</b> → 1 slot/frame = <b>${F(cap)} Mb/s</b>.`, `n_ij = ⌈r/${F(cap)}⌉: ${n.map(r => '(' + r.join(', ') + ')').join(', ')}; row sums ${rs.join(', ')}, column sums ${cs.join(', ')}.`,
        `A port carries one connection per slot → min slots = max line sum = <b>${mn}</b> (achievable by permutation decomposition).`, `Largest α with every ⌈αr/${F(cap)}⌉ line sum ≤ ${p.S}: <b>${F(am)}</b>; continuous ${p.S}×${F(cap)}/${lineR} = <b>${F(ac)}</b>.`],
      fm: ['bits/slot = R(T_slot − t_g)', 'min slots = max row/column sum', 'α_cont = S·cap/max line rate'] }; } });

reg({ id: 'cover', ch: 9, title: 'Coverage geometry & worst-case pointing allowance', topic: 'Antenna coverage',
  rand(R) { return { l: R.u(1, 5, 0.5), L: R.u(1, 6, 0.5), e1: R.pick([0.05, 0.08, 0.1]), e2: R.pick([0.02, 0.04, 0.05]), eta: R.pick([0.65, 0.7, 0.75]), f: R.pick([12, 20, 30]), obo: R.pick([1, 2, 3]), LF: R.pick([0.5, 1]), E: R.u(45, 56) }; },
  practice: { l: 3, L: 4, e1: 0.08, e2: 0.04, eta: 0.75, f: 20, obo: 2, LF: 1, E: 52 },
  build(p) { const x = RE * Math.sin(rad(p.l)), y = RE * Math.cos(rad(p.l)) * Math.sin(rad(p.L)), z = R0 + RE * (1 - Math.cos(rad(p.l)) * Math.cos(rad(p.L))), t0 = deg(Math.atan(Math.hypot(x, y) / z)), te = t0 + p.e1 + p.e2, t3 = 2 * te, lam = C / (p.f * 1e9), D = 70 * lam / t3, G = db(24180 * p.eta / t3 ** 2), Ps = lin(p.E + p.obo + p.LF - G);
    return { st: `GEO satellite (sub-satellite point 0°). Coverage = 4 points at latitudes ±<b>${p.l}°</b> and longitude offsets ±<b>${p.L}°</b>. Satellite frame: x = R<sub>E</sub>sin l, y = R<sub>E</sub>cos l sin L, z = R₀ + R<sub>E</sub>(1 − cos l cos L), R<sub>E</sub> = 6378, R₀ = 35786 km. Bounded pointing errors <b>${p.e1}°</b> and <b>${p.e2}°</b> (unknown directions). G<sub>EOC</sub> = 24180η/θ<sub>3dB</sub>², η = <b>${p.eta}</b>; θ<sub>3dB</sub> = 70λ/D at <b>${p.f} GHz</b>. HPA back-off <b>${p.obo} dB</b>, feeder <b>${p.LF} dB</b>; EIRP ≥ <b>${p.E} dBW</b> at every point.`,
      qs: [q('|x|', x, 'km', 2, { abs: 0.05 }), q('|y|', y, 'km', 2, { abs: 0.05 }), q('z', z, 'km', 2, { abs: 0.05 }), q('Nominal angular radius θ0', t0, '°', 3), q('Required θ3dB', t3, '°', 3), q('Reflector diameter', D, 'm', 3), q('Edge-of-coverage gain', G, 'dBi', 3), q('Min saturated HPA power', Ps, 'W', 2, { rel: 0.005 })],
      steps: [`|x| = <b>${F(x, 2)}</b>, |y| = <b>${F(y, 2)}</b>, z = <b>${F(z, 2)} km</b>; boresight at the centre (symmetry) → θ₀ = atan(√(x²+y²)/z) = <b>${F(t0)}°</b>.`, `Bounded errors add (no RSS): θ_edge = ${F(t0)} + ${p.e1} + ${p.e2} = ${F(te)}° → θ3dB = 2θ_edge = <b>${F(t3)}°</b>.`,
        `λ = ${F(lam, 4)} m → D = 70λ/θ3dB = <b>${F(D)} m</b>; G_EOC = 24180×${p.eta}/${F(t3)}² → <b>${F(G)} dBi</b>.`, `P_sat = 10^[(${p.E} + ${p.obo} + ${p.LF} − ${F(G)})/10] = <b>${F(Ps, 2)} W</b>.`],
      fm: ['θ = atan(√(x²+y²)/z)', 'θ3dB = 2(θ₀ + Σ errors)', 'G_EOC = 24180η/θ²', 'P_sat = EIRP + losses − G'] }; } });

root.SatGen = { GENS, mkRng, fx, check(qq, input) {
  if (qq.choice) return String(input).trim().toLowerCase() === String(qq.v).toLowerCase();
  const x = parseFloat(String(input).trim().replace(',', '.').replace(/\s*[×x\*]\s*10\^?/i, 'e')); if (!isFinite(x)) return null;
  if (qq.int) return Math.abs(x - qq.v) < 1e-9;
  let tol; if (qq.abs !== undefined) tol = qq.abs; else if (/dB/.test(qq.u)) tol = 0.05; else tol = (qq.rel !== undefined ? qq.rel : 0.01) * Math.abs(qq.v);
  return Math.abs(x - qq.v) <= tol + 1e-12; } };
})(typeof window !== 'undefined' ? window : globalThis);
