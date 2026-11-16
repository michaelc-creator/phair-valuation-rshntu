(function () {
  'use strict';
  var M = window.ConvModel;
  var SRC = {
    '1': 'National homebuilder LOI (exhibit in case document), 9/15/2025: $19.5M for ~14.6244 ac / 166 residences; non-binding, expired; buyer must re-entitle.',
    '4': '2025 property tax bill (case document): $29,729/yr.',
    '6': 'Property 1 LLC periodic report 3/31/2025 and case documents: 380 apartments = 280 market + 100 affordable.',
    '7': 'City planning commission staff report (8/14/2025): 14.62 ac; Lot 1 280 market-rate units, Lot 2 100 affordable.',
    '8': 'Broker marketing brochure, 2020 (via Property 1 v1 workbook [8]): market avg 1,028 sf; affordable 573/738/963 sf (simple avg 758 sf).',
    '9': 'Multifamily market research memo 2026, section 3: 15–20 units/month lease-up. Used here as a PROXY for for-sale closings; no for-sale absorption source in the file.',
    '11': 'Property 1 site-work cost study, section 0.2: total horizontal $16.7M / $26.8M / $45.2M incl. soft + contingency; site-specific premium $4.3M / $11.2M / $22.1M. Section 0.3: fees $56,827/unit (single-family ~1,800 sf schedule, likely overstated for flats).',
    '14': 'Redfin sold export, new attached homes built 2023+, market-area ZIP, sold 1/2024–11/2026 (comps research memo): n=49, median $650,000, $400/sf, 1,687 sf.',
    '16': 'Regional REALTOR association Sept-2026 market-area detached median $800,000, quoted by a broker page (secondary). Comps research memo; v1 SFD tab.',
    '17': 'Submarket vertical hard costs (valuation strategy brief section 4, via v1 [17]): townhomes $250 / $335 / $420 per sf; tract SFD $200–280 (mid $240). Townhome range is a PROXY for flats.',
    '19': 'Terner Center (2025) construction-defect liability report: +$8,100–$18,300/unit for CA for-sale townhome/condo (mid $13,200). v1 sets 0 for detached.',
    '36': 'Client call 11/13/2026: $800–850K sale price; 1,500–2,000 sf (v1 166 TH tab Mid = $800K, 1,750 sf).',
    'D': 'Bespoke Underwriting core demo (core-model.js DEFAULTS): 3% land closing, 80% LTC, 10% construction rate.',
    'V': 'Property 1 Underwriting Model v1: A-1 margin 12% Mid; A-2 selling 5%; A-3 vertical soft 15% Mid; A-4 affordable = 50% of market; A-6 same-footprint site work; A-9 in-tract scaling; A-16 DLOC/DLOM picks.',
    'M1': 'Property 1 Model 1 (companion dev-cost workbook): 24-month construction (Mid, assumption); 1% loan fee (assumption).',
    'X': 'Examiner report, case document (tax-return table): Property 1 LLC owned by the Sponsor 75% and a minority member 25%. Claims in case document: secured lender $2,272,710, NOD lien $31,606, development-partner claim $2,559,917.',
    'U': 'User voice requests 11/14/2026: 166/380 presets; release price 110–120% of allocated loan; cap table.',
    'P': 'USPAP land appraisal checklist (analysis file).',
    'A': 'ASSUMPTION: no source in the file; editable.'
  };
  function tag(ids) {
    return ids.split(',').map(function (id) {
      id = id.trim();
      return '<span class="src' + (id === 'A' ? ' as' : '') + '" tabindex="0" title="[' + id + '] ' + (SRC[id] || '').replace(/"/g, '&quot;') + '">[' + id + ']</span>';
    }).join('');
  }

  var S = M.applyPreset(M.baseInputs(), '380');
  var cap = { basis: 'rlv', debt: 0, dloc: 0, dlom: 0, owners: [
    { name: 'Majority member (Sponsor)', pct: 75 },
    { name: 'Minority member', pct: 25 }
  ] };
  var CAT_SRC = {
    th:   { sf: '14', price: '14', hard: '17', defect: '19' },
    sfd:  { sf: '36', price: '16', hard: '17', defect: 'V' },
    flat: { sf: '8', price: '14,8', hard: '17', defect: '19' },
    aff:  { sf: '8', price: 'V,A', hard: '17', defect: '19' }
  };
  var PRESET_NOTE = {
    '166': 'Homebuilder plan: 166 for-sale townhomes at the v1 Mid case ($800K, 1,750 sf, which is the user\'s range [36]; the market-area comps median is $650K [14]), with land at the $19.5M homebuilder LOI [1]. The LOI requires the buyer to re-entitle.',
    '380': '380 units matches the entitled count (280 market + 100 affordable [6][7]), but as a hypothetical for-sale build. Flats are 1,028 sf [8] at $400/sf [14]. Affordable units are 758 sf at 50% of market $/sf (assumption adapted from v1 A-4). No 300-unit plan exists in the record.'
  };

  var $ = function (id) { return document.getElementById(id); };
  var fmt$ = function (v) { if (v === null || v === undefined || !isFinite(v)) return 'n/a'; var s = Math.round(Math.abs(v)).toLocaleString('en-US'); return (v < 0 ? '($' + s + ')' : '$' + s); };
  var fmtM = function (v) { if (v === null || !isFinite(v)) return 'n/a'; var a = Math.abs(v) / 1e6; var s = '$' + a.toFixed(a >= 100 ? 1 : 2) + 'M'; return v < 0 ? '(' + s + ')' : s; };
  var pct = function (v, d) { return (v === null || v === undefined || !isFinite(v)) ? 'n/a' : (v * 100).toFixed(d === undefined ? 1 : d) + '%'; };
  var cls = function (v) { return (v !== null && v < 0) ? ' neg' : ''; };

  // ---------- field definitions ----------
  var COST_FIELDS = [
    ['land', 'Land basis', 'money', '$', '1'],
    ['landClosePct', 'Land closing cost', 'pct', '% of land', 'D'],
    ['acres', 'Site area (gross)', 'num', 'ac', '7'],
    ['siteCase', 'Site-work case', 'sel', '', '11', [['low', 'Low cost $16.7M'], ['mid', 'Mid $26.8M'], ['high', 'High cost $45.2M']]],
    ['siteScale', 'Site-work scaling', 'sel', '', 'V,A', [['acre', 'Fixed footprint (A-6)'], ['unit', 'Scale in-tract by units ÷ 166 (A-9)']]],
    ['feePerUnit', 'Impact / permit / capacity fees', 'money', '$/unit', '11'],
    ['softPct', 'Vertical soft costs', 'pct', '% of hard', 'V'],
    ['contPct', 'Vertical hard-cost contingency', 'pct', '% of hard', 'A'],
    ['sellPct', 'Sales commissions / closing / marketing', 'pct', '% of sales', 'V'],
    ['marginPct', 'Developer profit target (for residual)', 'pct', '% of sales', 'V'],
    ['taxPerYr', 'Property tax carry', 'money', '$/yr', '4']
  ];
  var FIN_FIELDS = [
    ['ltc', 'Loan-to-cost', 'pct', '%', 'D'],
    ['rate', 'Construction loan rate', 'pct', '%/yr', 'D'],
    ['feePct', 'Origination fee', 'pct', '% of loan', 'M1,A'],
    ['reserve', 'Interest reserve (capitalize interest)', 'sel', '', 'A', [['1', 'On: interest capitalized into loan'], ['0', 'Off: equity pays interest monthly']]],
    ['constrMonths', 'Construction term', 'num', 'months', 'M1,A'],
    ['drawCurve', 'Draw schedule (vertical)', 'sel', '', 'A', [['s', 'S-curve'], ['straight', 'Straight-line']]],
    ['siteFrontPct', 'Site work spread over first', 'pct', '% of term', 'A'],
    ['salesStart', 'First closing month', 'num', 'month', 'A'],
    ['pace', 'Absorption (all categories)', 'num', 'units/mo', '9,A'],
    ['escalPct', 'Sale price escalation', 'pct', '%/yr', 'A'],
    ['releasePct', 'Release price', 'pct', '% of loan/unit', 'U,A']
  ];

  function fieldHtml(f) {
    var id = 'in_' + f[0], v = S[f[0]];
    var lbl = '<label for="' + id + '">' + f[1] + tag(f[4]) + '</label>';
    if (f[2] === 'sel') {
      var cur = f[0] === 'reserve' ? (S.reserve ? '1' : '0') : String(v);
      return '<div class="fld">' + lbl + '<div class="row"><select id="' + id + '" data-k="' + f[0] + '" data-t="sel">' +
        f[5].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>';
    }
    var shown = f[2] === 'pct' ? +(v * 100).toFixed(4) : v;
    var step = f[2] === 'pct' ? '0.5' : (f[2] === 'money' ? '1000' : (f[0] === 'acres' ? '0.01' : '1'));
    return '<div class="fld">' + lbl + '<div class="row"><input type="number" inputmode="decimal" id="' + id + '" data-k="' + f[0] + '" data-t="' + f[2] + '" step="' + step + '" value="' + shown + '"><span class="unit">' + f[3] + '</span></div></div>';
  }
  function buildFields() {
    $('fCost').innerHTML = COST_FIELDS.map(fieldHtml).join('');
    $('fFin').innerHTML = FIN_FIELDS.map(fieldHtml).join('');
  }
  function onField(e) {
    var el = e.target, k = el.dataset.k; if (!k) return;
    var t = el.dataset.t;
    if (t === 'sel') { S[k] = k === 'reserve' ? el.value === '1' : el.value; }
    else { var n = parseFloat(el.value); if (!isFinite(n)) return; S[k] = t === 'pct' ? n / 100 : n; }
    if (k === 'land') markPreset(null);
    recalc();
  }

  // ---------- categories ----------
  function buildCats() {
    $('catBody').innerHTML = S.cats.map(function (c, i) {
      var s = CAT_SRC[c.key];
      return '<tr data-i="' + i + '"><td>' + c.name + '</td>' +
        '<td class="u"><button class="btn sm" data-a="dec">−</button> <input type="number" data-c="units" min="0" step="1" value="' + c.units + '" aria-label="' + c.name + ' units"> <button class="btn sm" data-a="inc">+</button></td>' +
        '<td class="num"><input type="number" data-c="sf" step="10" value="' + c.sf + '">' + tag(s.sf) + '</td>' +
        '<td class="num"><input type="number" data-c="price" step="5000" value="' + c.price + '">' + tag(s.price) + '</td>' +
        '<td class="num"><input type="number" data-c="psf" step="5" value="' + (c.price / c.sf).toFixed(0) + '"></td>' +
        '<td class="num"><input type="number" data-c="hard" step="5" value="' + c.hard + '">' + tag(s.hard) + '</td>' +
        '<td class="num"><input type="number" data-c="defect" step="500" value="' + c.defect + '">' + tag(s.defect) + '</td>' +
        '<td class="num" data-o="rev"></td></tr>';
    }).join('');
    var opts = S.cats.map(function (c, i) { return '<option value="' + i + '">' + c.name + '</option>'; }).join('');
    $('mvFrom').innerHTML = opts; $('mvTo').innerHTML = opts;
    $('mvFrom').value = '2'; $('mvTo').value = '0';
  }
  function syncCatInputs(skip) {
    Array.prototype.forEach.call($('catBody').rows, function (tr) {
      var c = S.cats[+tr.dataset.i];
      tr.querySelectorAll('input[data-c]').forEach(function (inp) {
        if (inp === skip) return;
        var k = inp.dataset.c;
        var v = k === 'psf' ? (c.sf ? (c.price / c.sf).toFixed(0) : 0) : c[k];
        if (String(inp.value) !== String(v)) inp.value = v;
      });
    });
  }
  function onCatInput(e) {
    var inp = e.target, tr = inp.closest('tr'); if (!tr || !inp.dataset.c) return;
    var c = S.cats[+tr.dataset.i], k = inp.dataset.c, n = parseFloat(inp.value);
    if (!isFinite(n)) return;
    if (k === 'units') {
      var tot = M.totalUnits(S);
      if (tot === 0) { c.units = Math.max(0, Math.round(n)); } else M.setCatUnits(S, +tr.dataset.i, n);
      markPreset(null);
    } else if (k === 'psf') { c.price = Math.round(n * c.sf); }
    else { c[k] = n; if (k === 'price' || k === 'sf') markPreset(null); }
    syncCatInputs(inp); recalc();
  }
  function onCatClick(e) {
    var b = e.target.closest('button[data-a]'); if (!b) return;
    var i = +b.closest('tr').dataset.i, c = S.cats[i];
    M.setCatUnits(S, i, c.units + (b.dataset.a === 'inc' ? 1 : -1));
    markPreset(null); syncCatInputs(); recalc();
  }

  // ---------- presets / slider ----------
  function markPreset(p) {
    if (p !== undefined) S.preset = p;
    document.querySelectorAll('#presets .btn').forEach(function (b) { b.classList.toggle('on', b.dataset.preset === S.preset); });
    $('presetNote').innerHTML = S.preset ? PRESET_NOTE[S.preset] : 'Custom mix (edited from a preset). Each category keeps its own price, size and cost inputs.';
  }
  function setPreset(p) {
    M.applyPreset(S, p); buildCats(); buildFields(); markPreset(p); recalc();
  }
  function onSlider(v) {
    v = Math.max(100, Math.min(380, Math.round(v)));
    M.setTotal(S, v); markPreset(null); syncCatInputs(); recalc();
  }

  // ---------- cap table ----------
  var BASIS_LABEL = { rlv: 'Residual land value', net: 'Land value net of debt/liens', unlev: 'Project profit (unlevered)', profit: 'Levered profit (after financing)', dist: 'Total equity distributions' };
  function buildCapFields() {
    $('fCap').innerHTML =
      '<div class="fld"><label for="capDebt">Debt / liens deducted (net basis only)' + tag('X') + '</label><div class="row"><input type="number" id="capDebt" step="1000" value="' + cap.debt + '"><span class="unit">$</span></div>' +
      '<div style="margin-top:4px"><button class="btn sm" id="capDebtFill" title="Secured lender $2,272,710 + NOD lien $31,606 + development-partner claim $2,559,917 (case document)">Use known claims $4,864,233</button> <button class="btn sm" id="capDebt0">Reset to 0</button></div></div>' +
      '<div class="fld"><label for="capDloc">DLOC (minority holders &lt;50%, draft)' + tag('V,A') + '</label><div class="row"><input type="number" id="capDloc" step="1" value="' + cap.dloc * 100 + '"><span class="unit">%</span></div></div>' +
      '<div class="fld"><label for="capDlom">DLOM (all holders, draft)' + tag('V,A') + '</label><div class="row"><input type="number" id="capDlom" step="1" value="' + cap.dlom * 100 + '"><span class="unit">%</span></div></div>';
  }
  function buildCapRows() {
    $('capBody').innerHTML = cap.owners.map(function (w, i) {
      return '<tr data-i="' + i + '"><td><input type="text" data-w="name" value="' + w.name.replace(/"/g, '&quot;') + '" aria-label="Owner name"></td>' +
        '<td class="num"><input type="number" data-w="pct" step="0.5" value="' + w.pct + '" aria-label="Ownership percent"></td>' +
        '<td class="num" data-o="val"></td><td class="num" data-o="adj"></td><td><button class="btn sm" data-a="rm" title="Remove owner">×</button></td></tr>';
    }).join('');
  }
  function renderCap(o) {
    var ct = M.capTable(o, cap.owners, cap);
    document.querySelectorAll('#basisToggle button').forEach(function (b) { b.classList.toggle('on', b.dataset.b === cap.basis); });
    Array.prototype.forEach.call($('capBody').rows, function (tr, i) {
      var r = ct.rows[i]; if (!r) return;
      var v = tr.querySelector('[data-o=val]'), a = tr.querySelector('[data-o=adj]');
      v.textContent = fmt$(r.value); v.className = 'num' + cls(r.value);
      a.textContent = fmt$(r.adjusted) + (r.minority && cap.dloc > 0 ? ' (minority)' : ''); a.className = 'num' + cls(r.adjusted);
    });
    $('capPct').textContent = ct.totalPct.toFixed(2) + '%';
    $('capVal').textContent = fmt$(ct.totalValue); $('capVal').className = 'num' + cls(ct.totalValue);
    $('capAdj').textContent = fmt$(ct.totalAdjusted); $('capAdj').className = 'num' + cls(ct.totalAdjusted);
    $('capWarn').innerHTML = (ct.pctOk ? '' : '<div class="warnbox">Ownership adds to ' + ct.totalPct.toFixed(2) + '%, not 100%. Values are pro-rata to each entered %.</div>') +
      '<p class="note" style="margin:0 0 8px">Basis: <b>' + BASIS_LABEL[cap.basis] + '</b> = <b class="' + cls(ct.basisValue) + '">' + fmt$(ct.basisValue) + '</b>' + (ct.basisValue < 0 ? '. The basis is negative at these inputs, so the owners\' shares are negative (a deficit, not a value).' : '') + '</p>';
  }

  // ---------- outputs ----------
  function metric(lbl, val, sub, neg) { return '<div class="metric"><div class="lbl">' + lbl + '</div><div class="val' + (neg ? ' neg' : '') + '">' + val + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>'; }
  function trow(l, v, n, strong) { return '<tr><td>' + (strong ? '<b>' + l + '</b>' : l) + '</td><td class="num' + cls(n) + '">' + (strong ? '<b>' + v + '</b>' : v) + '</td></tr>'; }

  var last = null;
  function recalc() {
    var o = M.compute(S); last = o; window.__convLast = o;
    var b = o.b, U = b.U;
    $('totU').textContent = U;
    if (document.activeElement !== $('unitSlider')) $('unitSlider').value = U;
    if (document.activeElement !== $('unitNum')) $('unitNum').value = U;
    // categories
    Array.prototype.forEach.call($('catBody').rows, function (tr) { var c = S.cats[+tr.dataset.i]; tr.querySelector('[data-o=rev]').textContent = fmt$(c.units * c.price); });
    $('catU').textContent = U; $('catSf').textContent = U ? Math.round(b.sf / U).toLocaleString() : '–';
    $('catAvg').textContent = fmt$(b.avgPrice); $('catPsf').textContent = b.sf ? '$' + (b.R / b.sf).toFixed(0) : '–'; $('catRev').textContent = fmt$(b.R);
    // metrics
    $('metrics').innerHTML =
      metric('Gross sales revenue', fmtM(o.tot.rev), U + ' units · avg ' + fmt$(b.avgPrice)) +
      metric('Total development cost', fmtM(o.totalCost), 'incl. land, financing, carry, selling') +
      metric('Profit (levered) · margin', fmtM(o.levProfit), 'margin ' + pct(o.margin) + ' of sales', o.levProfit < 0) +
      metric('Residual land value', fmtM(o.rlv), 'at ' + pct(S.marginPct, 0) + ' profit target · vs $' + (S.land / 1e6).toFixed(1) + 'M basis: ' + fmtM(o.rlvVsLand), o.rlv < 0) +
      metric('Land value per unit / per acre', fmt$(o.rlvPerUnit), fmt$(o.rlvPerAcre) + ' per acre (' + S.acres + ' ac)', o.rlv < 0) +
      metric('Break-even avg sale price', o.breakEvenAvgPrice ? fmt$(o.breakEvenAvgPrice) : 'n/a', o.breakEvenFactor ? (pct(o.breakEvenFactor - 1, 0) + ' vs. current anchor (zero profit, all-in)') : '') +
      metric('Levered IRR · unlevered IRR', pct(o.levIRR), 'unlevered ' + pct(o.unlevIRR) + (o.levIRR === null ? ' · n/a = no positive return' : ''), o.levIRR !== null && o.levIRR < 0) +
      metric('Peak equity · peak loan', fmtM(o.peakEquity), 'peak loan ' + fmtM(o.peakLoan) + ' · duration ' + o.duration + ' mo');
    // cost stack
    $('stack').innerHTML =
      trow('Gross sales revenue', fmt$(o.tot.rev), 1, true) +
      trow('Less: selling costs (' + pct(S.sellPct) + ')', fmt$(-o.tot.sell), -1) +
      trow('Land basis', fmt$(b.land)) + trow('Land closing', fmt$(b.landClose)) +
      trow('Site work (' + S.siteCase + ', ' + (S.siteScale === 'acre' ? 'fixed footprint' : 'scaled in-tract') + ')', fmt$(b.site)) +
      trow('Impact / permit fees', fmt$(b.fees)) +
      trow('Vertical hard cost (' + Math.round(b.sf).toLocaleString() + ' sf)', fmt$(b.hard)) +
      trow('Vertical soft costs', fmt$(b.soft)) + trow('Hard-cost contingency', fmt$(b.cont)) +
      trow('Defect-liability cost', fmt$(b.defect)) +
      trow('Loan budget (land + costs)', fmt$(b.budget), 1, true) +
      trow('Construction interest', fmt$(o.interest)) + trow('Loan origination fee', fmt$(o.loanFee)) + trow('Property-tax carry', fmt$(o.tot.tax)) +
      trow('Total development cost (incl. selling)', fmt$(o.totalCost), 1, true) +
      trow('Profit (levered)', fmt$(o.levProfit), o.levProfit, true) +
      trow('Residual land value, pre-finance (v1 method)', fmt$(o.rlvPre), o.rlvPre) +
      trow('Residual land value, after financing and carry', fmt$(o.rlv), o.rlv, true);
    // financing
    $('finOut').innerHTML =
      trow('Loan commitment (LTC × budget)', fmt$(o.commit)) +
      trow('Required equity first (budget − loan)', fmt$(o.eqReq)) +
      trow('Peak loan balance', fmt$(o.peakLoan)) + trow('Peak equity outstanding', fmt$(o.peakEquity)) +
      trow('Total equity contributed', fmt$(o.tot.contrib)) +
      trow('  of which costs above loan budget', fmt$(o.tot.overrun)) +
      trow('  of which loan shortfall paid by equity', fmt$(o.tot.shortfall), o.tot.shortfall > 0 ? -1 : 0) +
      trow('Total equity distributions', fmt$(o.tot.dist)) +
      trow('Profit (levered)', fmt$(o.levProfit), o.levProfit, true) +
      trow('Profit (unlevered, before interest and loan fee)', fmt$(o.unlevProfit), o.unlevProfit) +
      trow('Equity multiple', o.equityMultiple === null ? 'n/a' : o.equityMultiple.toFixed(2) + 'x') +
      trow('Return on peak equity', pct(o.roe), o.roe) +
      trow('Cash-on-cash (profit ÷ equity contributed)', pct(o.cashOnCash), o.cashOnCash) +
      trow('Levered IRR (annualized)', pct(o.levIRR), o.levIRR) + trow('Unlevered IRR (annualized)', pct(o.unlevIRR), o.unlevIRR) +
      trow('Loan payoff month', o.payoffMonth === null ? 'n/a' : 'month ' + o.payoffMonth) +
      trow('Last closing month · project duration', (o.lastSaleMonth === null ? 'n/a' : 'month ' + o.lastSaleMonth) + ' · ' + o.duration + ' mo');
    renderCap(o);
    drawChart(o);
  }

  function drawChart(o) {
    var cv = $('chart'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = cv.clientHeight || 260;
    cv.width = W * dpr; cv.height = H * dpr;
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var rows = o.rows, n = rows.length; if (n < 2) return;
    var L = 64, R = 40, T = 12, B = 26, pw = W - L - R, ph = H - T - B;
    var bal = rows.map(function (r) { return r.bal; }), eq = rows.map(function (r) { return -r.cumEq; });
    var cu = 0, units = rows.map(function (r) { cu += r.units; return cu; });
    var mx = Math.max.apply(null, bal.concat(eq, [1])), mn = Math.min.apply(null, eq.concat([0]));
    var x = function (i) { return L + pw * i / (n - 1); }, y = function (v) { return T + ph * (mx - v) / (mx - mn || 1); };
    g.font = '11px system-ui,sans-serif'; g.fillStyle = '#9aa0a0'; g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1;
    for (var k = 0; k <= 4; k++) { var v = mn + (mx - mn) * k / 4, yy = y(v); g.beginPath(); g.moveTo(L, yy); g.lineTo(W - R, yy); g.stroke(); g.fillText((v / 1e6).toFixed(0) + 'M', 4, yy + 4); }
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(L, y(0)); g.lineTo(W - R, y(0)); g.stroke();
    var step = Math.max(1, Math.ceil(n / 12));
    for (var i = 0; i < n; i += step) g.fillText('m' + i, x(i) - 8, H - 8);
    function line(arr, col, sc) { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); arr.forEach(function (v, i) { var yy = sc ? sc(v) : y(v); if (i) g.lineTo(x(i), yy); else g.moveTo(x(i), yy); }); g.stroke(); }
    line(bal, '#359BC5'); line(eq, '#f0c46c');
    var U = o.b.U || 1; line(units, '#8fd6a5', function (v) { return T + ph * (1 - v / U); });
    g.fillStyle = '#8fd6a5'; g.fillText(U + 'u', W - R + 4, T + 8); g.fillText('0', W - R + 4, T + ph);
  }

  function buildSources() {
    $('srcList').innerHTML = Object.keys(SRC).map(function (k) { return '<li><b>[' + k + ']</b> ' + SRC[k] + '</li>'; }).join('');
  }

  // ---------- wire ----------
  document.addEventListener('DOMContentLoaded', function () {
    buildCats(); buildFields(); buildCapFields(); buildCapRows(); buildSources(); markPreset('380');
    $('presets').addEventListener('click', function (e) { var b = e.target.closest('[data-preset]'); if (b) setPreset(b.dataset.preset); });
    $('unitSlider').addEventListener('input', function (e) { onSlider(+e.target.value); });
    $('unitNum').addEventListener('input', function (e) { var v = +e.target.value; if (v >= 100 && v <= 380) onSlider(v); });
    $('unitNum').addEventListener('change', function (e) { onSlider(+e.target.value); });
    $('catBody').addEventListener('input', onCatInput);
    $('catBody').addEventListener('click', onCatClick);
    $('mvGo').addEventListener('click', function () { M.moveUnits(S, +$('mvFrom').value, +$('mvTo').value, +$('mvN').value); markPreset(null); syncCatInputs(); recalc(); });
    $('fCost').addEventListener('input', onField); $('fCost').addEventListener('change', onField);
    $('fFin').addEventListener('input', onField); $('fFin').addEventListener('change', onField);
    $('basisToggle').addEventListener('click', function (e) { var b = e.target.closest('[data-b]'); if (b) { cap.basis = b.dataset.b; renderCap(last); } });
    $('fCap').addEventListener('input', function (e) {
      var n = parseFloat(e.target.value); if (!isFinite(n)) return;
      if (e.target.id === 'capDebt') cap.debt = n; if (e.target.id === 'capDloc') cap.dloc = n / 100; if (e.target.id === 'capDlom') cap.dlom = n / 100;
      renderCap(last);
    });
    $('fCap').addEventListener('click', function (e) {
      if (e.target.id === 'capDebtFill') { cap.debt = 4864233; $('capDebt').value = 4864233; cap.basis = 'net'; renderCap(last); }
      if (e.target.id === 'capDebt0') { cap.debt = 0; $('capDebt').value = 0; renderCap(last); }
    });
    $('capBody').addEventListener('input', function (e) {
      var tr = e.target.closest('tr'), w = cap.owners[+tr.dataset.i];
      if (e.target.dataset.w === 'name') w.name = e.target.value; else { var n = parseFloat(e.target.value); w.pct = isFinite(n) ? n : 0; }
      renderCap(last);
    });
    $('capBody').addEventListener('click', function (e) { var b = e.target.closest('[data-a=rm]'); if (!b) return; cap.owners.splice(+b.closest('tr').dataset.i, 1); buildCapRows(); renderCap(last); });
    $('capAdd').addEventListener('click', function () { cap.owners.push({ name: 'New owner', pct: 0 }); buildCapRows(); renderCap(last); });
    window.addEventListener('resize', function () { if (last) drawChart(last); });
    recalc();
  });
  window.__conv = { S: S, cap: cap, recalc: recalc, setPreset: setPreset, onSlider: onSlider };
})();
