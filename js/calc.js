(function () {
  "use strict";

  function n(s) {
    var v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }

  function render() {
    var dloc = n(document.getElementById("dloc").value);
    var dlom = n(document.getElementById("dlom").value);
    var keep = (1 - dloc / 100) * (1 - dlom / 100);
    var combined = 1 - keep;
    function set(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    }
    set("m-combined", (combined * 100).toFixed(1) + "%");
    set("m-keep", (keep * 100).toFixed(1) + "%");
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("dloc") || !document.getElementById("dlom")) return;
    ["dloc", "dlom"].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });
    render();
  });
})();
