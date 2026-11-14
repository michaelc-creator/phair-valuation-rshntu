(function () {
  "use strict";

  var STORAGE_KEY = "phair-dash-v1";
  var RATE = 125;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { done: {}, missing: {} };
      var parsed = JSON.parse(raw);
      return {
        done: parsed.done && typeof parsed.done === "object" ? parsed.done : {},
        missing: parsed.missing && typeof parsed.missing === "object" ? parsed.missing : {},
      };
    } catch (e) {
      return { done: {}, missing: {} };
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* private mode / quota */ }
  }

  var state = load();

  function money(v) {
    var n = Math.round(Number(v) || 0);
    return "$" + n.toLocaleString("en-US");
  }
  function hrs(v) {
    return Number(v).toFixed(1);
  }

  function setChecked(el, on) {
    el.checked = !!on;
    var row = el.closest("tr") || el.closest(".chk");
    if (row) row.classList.toggle("done", !!on);
  }

  function restoreChecks() {
    document.querySelectorAll("input[data-step]").forEach(function (el) {
      setChecked(el, !!state.done[el.getAttribute("data-step")]);
    });
    document.querySelectorAll("input[data-missing]").forEach(function (el) {
      setChecked(el, !!state.missing[el.getAttribute("data-missing")]);
    });
  }

  function bindChecks() {
    document.querySelectorAll("input[data-step]").forEach(function (el) {
      el.addEventListener("change", function () {
        var id = el.getAttribute("data-step");
        if (el.checked) state.done[id] = true;
        else delete state.done[id];
        save(state);
        setChecked(el, el.checked);
        updateProgress();
      });
    });
    document.querySelectorAll("input[data-missing]").forEach(function (el) {
      el.addEventListener("change", function () {
        var id = el.getAttribute("data-missing");
        if (el.checked) state.missing[id] = true;
        else delete state.missing[id];
        save(state);
        setChecked(el, el.checked);
      });
    });
  }

  function collectSteps(scope) {
    var root = scope || document;
    var steps = [];
    root.querySelectorAll("input[data-step]").forEach(function (el) {
      steps.push({
        id: el.getAttribute("data-step"),
        hours: parseFloat(el.getAttribute("data-hours") || "0") || 0,
        done: !!state.done[el.getAttribute("data-step")],
        company: el.getAttribute("data-company"),
      });
    });
    return steps;
  }

  function updateProgress() {
    // Company-page metrics
    var pageCo = document.body.getAttribute("data-company");
    if (pageCo) {
      var steps = collectSteps();
      var doneS = 0, doneH = 0, totalH = 0;
      steps.forEach(function (s) {
        totalH += s.hours;
        if (s.done) { doneS += 1; doneH += s.hours; }
      });
      var elSteps = document.querySelector("[data-metric='done-steps']");
      var elDet = document.querySelector("[data-metric='done-detail']");
      if (elSteps) elSteps.textContent = doneS + " / " + steps.length;
      if (elDet) elDet.textContent = hrs(doneH) + " hrs · as of Nov 13, 2026";
    }

    // Overview metrics (index has hidden inventory of all steps)
    var inv = document.getElementById("step-inventory");
    if (inv) {
      var all = collectSteps(inv);
      var byCo = { bella: { steps: 0, hours: 0, doneS: 0, doneH: 0 }, green: { steps: 0, hours: 0, doneS: 0, doneH: 0 }, fund: { steps: 0, hours: 0, doneS: 0, doneH: 0 } };
      var totalSteps = 0, totalHours = 0, doneSteps = 0, doneHours = 0;
      all.forEach(function (s) {
        totalSteps += 1;
        totalHours += s.hours;
        if (s.done) { doneSteps += 1; doneHours += s.hours; }
        if (byCo[s.company]) {
          byCo[s.company].steps += 1;
          byCo[s.company].hours += s.hours;
          if (s.done) { byCo[s.company].doneS += 1; byCo[s.company].doneH += s.hours; }
        }
      });
      var top = document.querySelector("[data-metric='overview-done']");
      var topDet = document.querySelector("[data-metric='overview-done-detail']");
      if (top) top.textContent = doneSteps + " / " + totalSteps;
      if (topDet) {
        var pct = totalHours ? Math.round((doneHours / totalHours) * 100) : 0;
        topDet.textContent = hrs(doneHours) + " of " + hrs(totalHours) + " hrs · " + pct + "% · as of Nov 13, 2026";
      }
      Object.keys(byCo).forEach(function (k) {
        var cell = document.querySelector("[data-done-cell='" + k + "']");
        if (cell) cell.textContent = byCo[k].doneS + " / " + byCo[k].steps;
      });
      var tot = document.querySelector("[data-done-cell='total']");
      if (tot) tot.textContent = doneSteps + " / " + totalSteps;
    }
  }

  function applyFilters() {
    var cat = document.getElementById("filter-cat");
    var q = document.getElementById("filter-q");
    var atk = document.getElementById("filter-atk");
    if (!cat && !q && !atk) return;
    var catVal = cat ? cat.value : "all";
    var ql = q ? q.value.trim().toLowerCase() : "";
    var showAtk = atk ? atk.checked : true;

    document.querySelectorAll("th.atk, td.atk").forEach(function (el) {
      el.style.display = showAtk ? "" : "none";
    });

    document.querySelectorAll("details.cat").forEach(function (sec) {
      var n = sec.getAttribute("data-cat");
      var catOk = catVal === "all" || catVal === n;
      var visibleRows = 0;
      sec.querySelectorAll("tbody tr").forEach(function (tr) {
        var hay = (tr.getAttribute("data-search") || "").toLowerCase();
        var match = catOk && (ql === "" || hay.indexOf(ql) >= 0);
        tr.classList.toggle("is-hidden", !match);
        if (match) visibleRows += 1;
      });
      sec.classList.toggle("is-hidden", !catOk || visibleRows === 0);
    });
  }

  function bindFilters() {
    ["filter-cat", "filter-q", "filter-atk"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", applyFilters);
      el.addEventListener("change", applyFilters);
    });
    applyFilters();
  }

  window.PhairDash = {
    money: money,
    hrs: hrs,
    RATE: RATE,
    refresh: function () {
      restoreChecks();
      updateProgress();
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    restoreChecks();
    bindChecks();
    bindFilters();
    updateProgress();
  });
})();
