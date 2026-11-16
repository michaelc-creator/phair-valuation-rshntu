/* Property 1 conventional for-sale development model — calculation engine.
   Pure functions, no DOM. Works in the browser (window.ConvModel) and in Node (module.exports).
   Draft work product, Nov 14 2026. Every default is cited in DEFAULT_SOURCES / the page's Sources panel. */
(function (root) {
  'use strict';

  // Site-work study totals (166-unit base, 2026 $, incl. horizontal soft + contingency) [11] §0.2.
  var SITE = {
    low:  { total: 16700000, premium: 4300000 },   // study Low cost  (= "High value" case)
    mid:  { total: 26800000, premium: 11200000 },  // study Mid
    high: { total: 45200000, premium: 22100000 }   // study High cost (= "Low value" case)
  };
  var HARD = { low: 250, mid: 335, high: 420 };   // conventional vertical $/sf [17]

  function cat(key, name, units, sf, price, hard, defect, src) {
    return { key: key, name: name, units: units, sf: sf, price: price, hard: hard, defect: defect, src: src || {} };
  }

  // Category defaults. Prices are the anchor inputs.
  function baseCats() {
    return [
      cat('th',  'Townhome (for-sale)',            0, 1687, 650000, 335, 13200),
      cat('sfd', 'Single-family detached',          0, 2000, 800000, 240, 0),
      cat('flat','Condo / stacked flat',            0, 1028, 411200, 335, 13200),
      cat('aff', 'Affordable / deed-restricted',    0,  758, 151600, 335, 13200)
    ];
  }

  function baseInputs() {
    return {
      preset: '380',
      cats: baseCats(),
      acres: 14.62,
      land: 19500000,
      landClosePct: 0.03,
      siteCase: 'mid',
      siteScale: 'acre',        // 'acre' = fixed footprint (v1 A-6); 'unit' = premium fixed + in-tract x units/166 (v1 A-9)
      siteBaseUnits: 166,
      feePerUnit: 56827,
      softPct: 0.15,
      contPct: 0,
      sellPct: 0.05,
      marginPct: 0.12,
      taxPerYr: 29729,
      constrMonths: 24,
      siteFrontPct: 0.4,
      drawCurve: 's',           // 's' | 'straight'
      salesStart: 12,
      pace: 15,
      escalPct: 0,
      ltc: 0.80,
      rate: 0.10,
      feePct: 0.01,
      reserve: true,
      releasePct: 1.15
    };
  }

  // Presets. Mix and program per the record; see Sources panel.
  function applyPreset(S, name) {
    var c = baseCats();
    S.preset = name;
    S.land = 19500000;
    if (name === '166') {
      c[0].units = 166; c[0].sf = 1750; c[0].price = 800000;   // v1 166 TH tab Mid: 1,750 sf, $800K [36][V]
    } else { // '380' (the only unit count used for valuation; unknown names also land here)
      S.preset = '380';
      c[2].units = 280; c[3].units = 100;                       // 280 market + 100 affordable [6][7]
    }
    S.cats = c;
    return S;
  }

  function totalUnits(S) { return S.cats.reduce(function (a, c) { return a + (+c.units || 0); }, 0); }

  // Rescale category counts to a new total, keeping proportions (largest remainder).
  function setTotal(S, n) {
    n = Math.max(0, Math.round(n));
    var cur = totalUnits(S);
    if (cur === 0) { S.cats[0].units = n; return S; }
    var raw = S.cats.map(function (c) { return c.units * n / cur; });
    var fl = raw.map(Math.floor);
    var rem = n - fl.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (r, i) { return [r - fl[i], i]; }).sort(function (a, b) { return b[0] - a[0]; });
    for (var k = 0; k < rem; k++) fl[order[k % order.length][1]]++;
    S.cats.forEach(function (c, i) { c.units = fl[i]; });
    return S;
  }

  // Move n units from category i to j; total unchanged.
  function moveUnits(S, from, to, n) {
    if (from === to) return S;
    n = Math.max(0, Math.min(Math.round(n), S.cats[from].units));
    S.cats[from].units -= n; S.cats[to].units += n;
    return S;
  }

  // Set one category's count while keeping the total: the difference is taken from / given to the others pro rata.
  function setCatUnits(S, i, v) {
    var total = totalUnits(S);
    v = Math.max(0, Math.min(Math.round(v), total));
    var diff = v - S.cats[i].units;
    S.cats[i].units = v;
    var others = S.cats.map(function (c, k) { return k; }).filter(function (k) { return k !== i; });
    while (diff !== 0) {
      var pool = others.filter(function (k) { return diff > 0 ? S.cats[k].units > 0 : true; });
      if (!pool.length) break;
      // largest first when taking, smallest-first not needed when giving: give to largest too
      pool.sort(function (a, b) { return S.cats[b].units - S.cats[a].units; });
      var k = pool[0];
      if (diff > 0) { S.cats[k].units--; diff--; } else { S.cats[k].units++; diff++; }
    }
    return S;
  }

  function weights(n, curve) {
    var w = [], i;
    if (n <= 0) return w;
    if (curve === 'straight') { for (i = 0; i < n; i++) w.push(1 / n); return w; }
    // S-curve: differences of a smoothstep CDF 3x^2 - 2x^3
    var F = function (x) { return 3 * x * x - 2 * x * x * x; };
    for (i = 0; i < n; i++) w.push(F((i + 1) / n) - F(i / n));
    return w;
  }

  function irrMonthly(cf) {
    var pos = cf.some(function (x) { return x > 1e-6; }), neg = cf.some(function (x) { return x < -1e-6; });
    if (!pos || !neg) return null;
    var npv = function (r) { var s = 0, d = 1; for (var t = 0; t < cf.length; t++) { s += cf[t] / d; d *= (1 + r); } return s; };
    // scan for the first sign change from a low rate upward, then bisect
    var grid = [-0.95, -0.8, -0.6, -0.4, -0.25, -0.15, -0.1, -0.06, -0.03, -0.015, -0.005, 0, 0.005, 0.01, 0.02, 0.035, 0.05, 0.08, 0.12, 0.2, 0.35, 0.6, 1, 2, 5];
    // pick the sign-change bracket closest to 0% (avoids spurious roots near -100% on multi-sign flows)
    var lo = null, hi = null, best = Infinity;
    for (var g = 0; g < grid.length - 1; g++) {
      var a = npv(grid[g]), b = npv(grid[g + 1]);
      if (a === 0) return grid[g];
      var dist0 = Math.min(Math.abs(grid[g]), Math.abs(grid[g + 1]));
      if (a * b < 0 && dist0 < best) { lo = grid[g]; hi = grid[g + 1]; best = dist0; }
    }
    if (lo === null) return null;
    var flo = npv(lo);
    for (var it = 0; it < 200; it++) {
      var mid = (lo + hi) / 2, fm = npv(mid);
      if (Math.abs(hi - lo) < 1e-12) break;
      if (flo * fm <= 0) { hi = mid; } else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }
  function annualize(m) { return m === null ? null : Math.pow(1 + m, 12) - 1; }

  // Static budget (no financing).
  function budget(S, priceFactor) {
    priceFactor = priceFactor || 1;
    var U = 0, R = 0, sfTot = 0, hard = 0, defect = 0;
    S.cats.forEach(function (c) {
      var u = +c.units || 0;
      U += u; R += u * c.price * priceFactor; sfTot += u * c.sf; hard += u * c.sf * c.hard; defect += u * c.defect;
    });
    var site = SITE[S.siteCase] || SITE.mid;
    var siteCost = S.siteScale === 'unit'
      ? site.premium + (site.total - site.premium) * (U / S.siteBaseUnits)
      : site.total;
    if (U === 0) siteCost = 0;
    var soft = S.softPct * hard, cont = S.contPct * hard, fees = S.feePerUnit * U;
    var landClose = S.land * S.landClosePct;
    var B = S.land + landClose + hard + soft + cont + defect + fees + siteCost; // financeable budget
    return { U: U, R: R, sf: sfTot, hard: hard, soft: soft, cont: cont, defect: defect, fees: fees, site: siteCost,
             landClose: landClose, land: S.land, budget: B, avgPrice: U ? R / U : 0 };
  }

  // Monthly cash-flow engine. Land + equity first, then loan; interest on drawn balance;
  // sales with release-price paydown; residual proceeds to equity.
  function run(S, priceFactor) {
    var b = budget(S, priceFactor);
    var N = Math.max(1, Math.round(S.constrMonths));
    var commit = S.ltc * b.budget, eqReq = b.budget - commit;
    var loanFee = S.feePct * commit;
    var w = weights(N, S.drawCurve);
    var siteN = Math.max(1, Math.round(N * S.siteFrontPct));
    var r = S.rate / 12, taxM = S.taxPerYr / 12;
    var vertical = b.hard + b.soft + b.cont + b.defect;
    var start = Math.max(1, Math.round(S.salesStart));
    var pace = Math.max(0.0001, +S.pace);
    var rows = [];
    var cash = 0;
    var sched = []; for (var q = 0; q <= N; q++) sched.push(q === 0 ? 0 : vertical * w[q - 1] + (q <= siteN ? b.site / siteN : 0));
    var bal = 0, drawn = 0, eqIn = 0, remaining = b.U, sold = 0;
    var tot = { contrib: 0, dist: 0, draws: 0, capInt: 0, cashInt: 0, repay: 0, rev: 0, sell: 0, costs: 0, tax: 0, overrun: 0, shortfall: 0 };
    var peakLoan = 0, peakEq = 0, cumEq = 0, payoffMonth = null, lastSale = null, everDrawn = false;
    for (var t = 0; t <= 600; t++) {
      var cost = 0, row = { t: t };
      if (t === 0) cost += b.land + b.landClose;
      if (t === 1) cost += b.fees + loanFee;
      if (t >= 1 && t <= N) cost += vertical * w[t - 1];
      if (t >= 1 && t <= siteN) cost += b.site / siteN;
      var tax = 0;
      if (t >= 1 && (remaining > 1e-9 || t <= N)) { tax = taxM; cost += tax; }
      var fin = (t === 1 ? loanFee : 0);
      // interest on opening balance
      var interest = t >= 1 ? bal * r : 0, capInt = 0, cashInt = 0;
      if (S.reserve) { capInt = interest; bal += interest; } else { cashInt = interest; cost += interest; }
      // sales
      var units = 0, rev = 0;
      if (t >= start && remaining > 1e-9) {
        units = Math.min(pace, remaining);
        var esc = Math.pow(1 + S.escalPct, t / 12);
        rev = units * b.avgPrice * esc;
        remaining -= units; sold += units; lastSale = t;
      }
      var sell = rev * S.sellPct, net = rev - sell;
      var release = 0;
      if (net > 0 && bal > 1e-6) {
        var rel = S.releasePct * commit * (b.U ? units / b.U : 0);
        if (remaining <= 1e-9) rel = bal;          // final closings sweep the loan
        release = Math.min(bal, rel, net);
      }
      bal -= release;
      var avail = cash + net - release, need = cost;
      cash = 0;
      var fromSales = Math.min(avail, need); avail -= fromSales; need -= fromSales;
      var eq = 0, draw = 0;
      if (need > 1e-9) {
        var e1 = Math.min(need, Math.max(0, eqReq - eqIn)); eq += e1; eqIn += e1; need -= e1;
        if (need > 1e-9 && remaining > 1e-9) {
          draw = Math.min(need, Math.max(0, commit - drawn)); drawn += draw; bal += draw; need -= draw;
          if (draw > 0) everDrawn = true;
        }
        if (need > 1e-9) { eq += need; tot.overrun += need; need = 0; }
      }
      // after the last sale: any loan left is repaid from remaining cash, then equity
      var extraRepay = 0;
      if (remaining <= 1e-9 && bal > 1e-6) {
        var p = Math.min(avail, bal); avail -= p; bal -= p; extraRepay += p;
        if (bal > 1e-6) { eq += bal; tot.shortfall += bal; extraRepay += bal; bal = 0; }
      }
      // hold back cash for scheduled construction costs still to come (cost-to-complete reserve)
      var ctc = 0; for (var q2 = t + 1; q2 <= N; q2++) ctc += sched[q2];
      var hold = Math.min(avail, ctc); cash = hold;
      var dist = avail - hold;
      cumEq += eq - dist;
      peakEq = Math.max(peakEq, cumEq);
      peakLoan = Math.max(peakLoan, bal);
      if (everDrawn && payoffMonth === null && bal <= 1e-6 && t > 0) payoffMonth = t;
      tot.contrib += eq; tot.dist += dist; tot.draws += draw; tot.capInt += capInt; tot.cashInt += cashInt;
      tot.repay += release + extraRepay; tot.rev += rev; tot.sell += sell; tot.costs += cost - cashInt; tot.tax += tax;
      row.cost = cost - cashInt - fin; row.fin = fin; row.interest = interest; row.units = units; row.rev = rev; row.sell = sell;
      row.release = release + extraRepay; row.draw = draw; row.eq = eq; row.dist = dist; row.bal = bal; row.cash = cash; row.cumEq = cumEq;
      row.levCF = dist - eq;
      row.unlevCF = net - (cost - cashInt - fin);
      rows.push(row);
      if (t > N && remaining <= 1e-9 && bal <= 1e-6) break;
    }
    var lev = rows.map(function (x) { return x.levCF; });
    var unl = rows.map(function (x) { return x.unlevCF; });
    var sum = function (a) { return a.reduce(function (s, x) { return s + x; }, 0); };
    var levProfit = sum(lev), unlevProfit = sum(unl);
    var interestTot = tot.capInt + tot.cashInt;
    var out = {
      b: b, rows: rows, commit: commit, eqReq: eqReq, loanFee: loanFee, tot: tot, interest: interestTot,
      levProfit: levProfit, unlevProfit: unlevProfit,
      margin: tot.rev ? levProfit / tot.rev : null,
      peakLoan: peakLoan, peakEquity: peakEq,
      equityMultiple: tot.contrib ? tot.dist / tot.contrib : null,
      roe: peakEq ? levProfit / peakEq : null,
      cashOnCash: tot.contrib ? levProfit / tot.contrib : null,
      levIRR: annualize(irrMonthly(lev)), unlevIRR: annualize(irrMonthly(unl)),
      payoffMonth: payoffMonth, lastSaleMonth: lastSale, duration: rows.length - 1,
      endBalance: bal, endCash: cash
    };
    out.totalCost = b.budget + tot.tax + interestTot + loanFee + tot.sell; // all-in incl. selling
    return out;
  }

  function compute(S) {
    var o = run(S, 1);
    var b = o.b;
    // Residual land value. Pre-finance = v1 workbook method (sales - selling - margin - hard - soft - defect - site - fees).
    var rlvPre = b.R * (1 - S.sellPct - S.marginPct) - b.hard - b.soft - b.cont - b.defect - b.site - b.fees;
    var rlv = (rlvPre - o.interest - o.loanFee - o.tot.tax) / (1 + S.landClosePct);
    o.rlvPre = rlvPre; o.rlv = rlv;
    o.rlvPerUnit = b.U ? rlv / b.U : null; o.rlvPerAcre = S.acres ? rlv / S.acres : null;
    o.rlvVsLand = rlv - S.land;
    // Break-even: price factor where levered profit = 0 (all-in, incl. financing; no margin).
    var f = function (k) { return run(S, k).levProfit; };
    var lo = 0.05, hi = 5, flo = f(lo), fhi = f(hi), be = null;
    if (flo < 0 && fhi > 0) {
      for (var i = 0; i < 50; i++) { var m = (lo + hi) / 2, fm = f(m); if (fm < 0) lo = m; else hi = m; }
      be = (lo + hi) / 2;
    }
    o.breakEvenFactor = be;
    o.breakEvenAvgPrice = be === null ? null : b.avgPrice * be;
    return o;
  }

  // Cap table. basis: 'rlv' | 'net' | 'profit' | 'unlev' | 'dist'
  function capTable(o, owners, opt) {
    opt = opt || {};
    var basisVal;
    switch (opt.basis) {
      case 'net': basisVal = o.rlv - (+opt.debt || 0); break;
      case 'profit': basisVal = o.levProfit; break;
      case 'unlev': basisVal = o.unlevProfit; break;
      case 'dist': basisVal = o.tot.dist; break;
      default: basisVal = o.rlv;
    }
    var dloc = +opt.dloc || 0, dlom = +opt.dlom || 0;
    var totPct = 0, totVal = 0, totAdj = 0;
    var rows = owners.map(function (w) {
      var pct = +w.pct || 0; totPct += pct;
      var pro = basisVal * pct / 100;
      var minority = pct < 50;
      var adj = pro * (1 - (minority ? dloc : 0)) * (1 - dlom);
      // discounts only reduce positive values
      if (pro < 0) adj = pro;
      totVal += pro; totAdj += adj;
      return { name: w.name, pct: pct, value: pro, minority: minority, adjusted: adj };
    });
    return { basis: opt.basis || 'rlv', basisValue: basisVal, rows: rows, totalPct: totPct, totalValue: totVal,
             totalAdjusted: totAdj, pctOk: Math.abs(totPct - 100) < 1e-6 };
  }

  var api = { SITE: SITE, HARD: HARD, baseInputs: baseInputs, applyPreset: applyPreset, totalUnits: totalUnits,
              setTotal: setTotal, moveUnits: moveUnits, setCatUnits: setCatUnits, budget: budget, run: run,
              compute: compute, capTable: capTable, weights: weights, irrMonthly: irrMonthly };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ConvModel = api;
})(typeof window !== 'undefined' ? window : this);
