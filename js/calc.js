(function () {
  "use strict";

  function n(s) {
    var v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }
  function money(v) {
    return "$" + Math.round(Number(v) || 0).toLocaleString("en-US");
  }
  function mShort(v) {
    return "$" + (Number(v) / 1e6).toFixed(2) + "M";
  }

  function compute() {
    var priceA = n(document.getElementById("priceA").value);
    var pA = n(document.getElementById("pA").value);
    var priceB = n(document.getElementById("priceB").value);
    var pB = n(document.getElementById("pB").value);
    var rate = n(document.getElementById("rate").value);
    var years = n(document.getElementById("years").value);
    var extraMo = n(document.getElementById("extraMo").value);
    var pct = n(document.getElementById("pct").value);
    var dloc = n(document.getElementById("dloc").value);
    var dlom = n(document.getElementById("dlom").value);
    var compUnit = n(document.getElementById("compUnit").value);
    var units = n(document.getElementById("units").value);

    var RT = 2650000;
    var BASIS = 8250000;
    var CAP = 14000000;
    var LOAN = 2272710;
    var INT20 = 637495;
    var perMo = INT20 / 20;
    var interest = INT20 + perMo * Math.max(0, extraMo);

    function wf(P) {
      var base = Math.min(BASIS, Math.max(0, P - RT));
      var lift1 = Math.max(0, Math.min(P, CAP) - (RT + BASIS)) * 0.3;
      var lift2 = Math.max(0, P - CAP) * 0.5;
      var gross = base + lift1 + lift2 - 0.0125 * P;
      return { gross: gross, net: Math.max(0, gross - LOAN - interest) };
    }

    var share = pct / 100;
    var disc = Math.pow(1 + rate / 100, Math.max(0, years));
    var a = wf(priceA);
    var b = wf(priceB);
    var probA = pA / 100;
    var probB = pB / 100;
    var probC = Math.max(0, 1 - probA - probB);
    var pvA = (a.net * share) / disc;
    var pvB = (b.net * share) / disc;
    var weighted = probA * pvA + probB * pvB;
    var keep = (1 - dloc / 100) * (1 - dlom / 100);
    var combined = 1 - keep;
    var finalV = weighted * keep;
    var over = probA + probB > 1.0001;
    var compInd = compUnit * units;

    return {
      a: a, b: b, probA: probA, probB: probB, probC: probC,
      pvA: pvA, pvB: pvB, weighted: weighted, keep: keep,
      combined: combined, final: finalV, interest: interest,
      over: over, compInd: compInd, share: share, disc: disc,
      priceA: priceA, priceB: priceB, pct: pct, dloc: dloc, dlom: dlom,
    };
  }

  function render() {
    var c = compute();
    var overEl = document.getElementById("prob-over");
    if (overEl) overEl.hidden = !c.over;

    function set(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    set("m-weighted", money(c.weighted));
    set("m-weighted-det", "Phair " + c.pct + "% share, before discounts");
    set("m-combined", (c.combined * 100).toFixed(1) + "%");
    set("m-final", money(c.final));
    set("m-comp", mShort(c.compInd));

    set("r-a-p", (c.probA * 100).toFixed(0) + "%");
    set("r-a-price", money(c.priceA));
    set("r-a-gross", money(c.a.gross));
    set("r-a-net", money(c.a.net));
    set("r-a-share", money(c.a.net * c.share));
    set("r-a-pv", money(c.pvA));

    set("r-b-p", (c.probB * 100).toFixed(0) + "%");
    set("r-b-price", money(c.priceB));
    set("r-b-gross", money(c.b.gross));
    set("r-b-net", money(c.b.net));
    set("r-b-share", money(c.b.net * c.share));
    set("r-b-pv", money(c.pvB));

    set("r-c-p", (c.probC * 100).toFixed(0) + "%");
    set("r-w-pv", money(c.weighted));
    set("r-final-label", "After DLOC " + c.dloc + "% and DLOM " + c.dlom + "%");
    set("r-keep", "× " + c.keep.toFixed(3));
    set("r-final", money(c.final));
    set("eq-pct", c.pct + "%");

    var interestNote = document.getElementById("waterfall-note");
    if (interestNote) {
      interestNote.textContent =
        "Waterfall (Phair's “SD Hollister Entitlement Splits”, Doc 362 p.101): Phair basis $8.25M after Red Tail costs $2.65M; lift up to $14M split 70% Red Tail / 30% Phair; above $14M 50/50; 2.5% closing costs split 50/50; less Hollister loan $2,272,710 and interest " +
        money(c.interest) +
        " (about $31,875 a month). Net is floored at $0.";
    }

    // Value bridge bars — scale to Doc 62 equity
    var max = 14815114;
    function bar(idFill, idAmt, value, short) {
      var fill = document.getElementById(idFill);
      var amt = document.getElementById(idAmt);
      if (fill) fill.style.width = Math.max(0, Math.min(100, (value / max) * 100)) + "%";
      if (amt) amt.textContent = short ? mShort(value) : money(value);
    }
    bar("bar-a", "bar-a-amt", c.a.net * c.share, true);
    bar("bar-w", "bar-w-amt", c.weighted, true);
    bar("bar-f", "bar-f-amt", c.final, true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("priceA")) return;
    var ids = ["priceA","pA","priceB","pB","rate","years","extraMo","pct","dloc","dlom","compUnit","units"];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", render);
        el.addEventListener("change", render);
      }
    });
    render();
  });
})();
