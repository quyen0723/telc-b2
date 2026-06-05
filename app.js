/* ============================================================
   App logic: render active screen, tab + module switching,
   answer selection. UI-only — no scoring, no network.
   ============================================================ */
(function () {
  var DATA = window.EXAM_DATA;
  var state = {
    mod: 0,
    part: [0, 0, 0],          // active part per module
    answers: {},              // key -> value
    done: {},                 // "mod.part" -> true once interacted
    activeText: {}            // heading-match: active text idx per part
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function curMod() { return DATA.modules[state.mod]; }
  function curPart() { return curMod().parts[state.part[state.mod]]; }
  function markDone() { state.done[state.mod + "." + state.part[state.mod]] = true; }

  /* -------------------- HEADER -------------------- */
  function renderHeader() {
    var m = curMod();
    var brand = $("#brand-slot");
    if (!brand.dataset.built) {
      brand.appendChild(el("div", "logo",
        '<span class="logo-mark">df</span><span class="logo-sub">SPRACHTRAINING</span>'));
      brand.dataset.built = "1";
    }

    // audio player (only modules with audio)
    var audioSlot = $("#audio-slot");
    audioSlot.innerHTML = "";
    if (m.audio) {
      var ap = el("div", "audio-player",
        '<button class="play" aria-label="Abspielen">▶</button>' +
        '<span>' + esc(m.audio) + '</span>' +
        '<span style="opacity:.5">━━━━━━━</span>' +
        '<span style="font-size:15px">🔊</span>');
      audioSlot.appendChild(ap);
      ap.querySelector(".play").addEventListener("click", function () {
        this.textContent = this.textContent === "▶" ? "⏸" : "▶";
      });
    }

    // tabs
    var tabs = $("#tabs");
    tabs.innerHTML = "";
    m.parts.forEach(function (p, i) {
      var active = i === state.part[state.mod];
      var done = state.done[state.mod + "." + i];
      var b = el("button", "tab" + (active ? " is-active" : "") + (done ? " is-done" : ""));
      b.innerHTML =
        '<span>' + esc(p.tab[0]) + '<br>' + esc(p.tab[1]) + '</span>' +
        '<span class="tab-points">' + esc(p.tab[2]) + '</span>' +
        '<span class="tab-check">✓</span>';
      b.addEventListener("click", function () {
        state.part[state.mod] = i;
        render();
      });
      tabs.appendChild(b);
    });

    // meta
    $("#meta-info").innerHTML =
      '<div><strong>' + esc(DATA.level) + '</strong></div>' +
      '<div>Verbleibende Zeit: ' + esc(m.timeTotal) + '</div>' +
      '<div>Restzeit:</div>';

    // module switch
    var ms = $("#module-switch");
    ms.innerHTML = "";
    DATA.modules.forEach(function (mod, i) {
      var b = el("button", "mod-pill" + (i === state.mod ? " is-active" : ""), esc(mod.name));
      b.addEventListener("click", function () {
        state.mod = i;
        render();
      });
      ms.appendChild(b);
    });
  }

  /* -------------------- SECTION BAR -------------------- */
  function renderSection() {
    var p = curPart();
    $("#section-title").innerHTML =
      '<strong>' + esc(p.title[0]) + '</strong><span class="sub">, ' + esc(p.title[1]) + '</span>';
  }

  /* -------------------- SCREEN -------------------- */
  function aKey(group) { return state.mod + "." + state.part[state.mod] + "." + group; }

  function renderScreen() {
    var p = curPart();
    var c = $("#content-body");
    c.innerHTML = "";

    var instr = el("div", "instruction", "<p>" + p.instruction + "</p>");
    c.appendChild(instr);

    var builder = {
      "heading-match": buildHeadingMatch,
      "multiple-choice": buildMultipleChoice,
      "situation-match": buildSituationMatch,
      "gap-radio": buildGapRadio,
      "word-bank": buildWordBank,
      "richtig-falsch": buildRichtigFalsch,
      "writing": buildWriting
    }[p.type];
    if (builder) c.appendChild(builder(p));
  }

  /* ---- Teil 1: heading match ---- */
  function buildHeadingMatch(p) {
    var work = el("div", "work");

    // which heading is assigned to each text
    function letterFor(idx) { return state.answers[aKey("t" + idx)]; }
    function textForLetter(L) {
      var o = p.options.find(function (x) { return x[0] === L; });
      return o ? o[1] : "";
    }
    // currently active text (the one a heading click will fill)
    var activeKey = aKey("active");
    function activeIdx() {
      var v = state.activeText[activeKey];
      return v == null ? -1 : v;
    }

    var reader = el("div", "reader");
    p.texts.forEach(function (t, idx) {
      if (idx > 0) reader.appendChild(el("hr", "mail-divider"));
      var L = letterFor(idx);
      var head = el("div", "mail-head");
      if (L) {
        head.classList.add("is-selected");
        head.innerHTML = '<span class="head-letter">' + L + '</span> ' + esc(textForLetter(L));
      } else {
        head.textContent = t.n;
        if (idx === activeIdx()) head.classList.add("is-active");
      }
      head.addEventListener("click", function () {
        if (letterFor(idx)) {
          // clear assignment and make this the active target
          delete state.answers[aKey("t" + idx)];
        }
        state.activeText[activeKey] = idx;
        renderScreen(); renderHeader();
      });
      reader.appendChild(head);

      var f = el("div", "mail-fields",
        '<label>An:</label><div class="field"></div>' +
        '<label>CC:</label><div class="field"></div>' +
        '<label>Betreff:</label><div class="field"></div>');
      reader.appendChild(f);
      reader.appendChild(el("p", null, esc(t.body)));
    });
    work.appendChild(reader);

    // set of letters already used
    var used = {};
    p.texts.forEach(function (t, idx) {
      var L = letterFor(idx);
      if (L) used[L] = idx;
    });

    var panel = el("div", "panel");
    var list = el("div", "opt-list");
    p.options.forEach(function (o) {
      var row = el("div", "opt");
      row.innerHTML = '<div class="opt-letter">' + o[0] + '</div>';
      var box = el("div", "opt-box", esc(o[1]));
      if (used[o[0]] != null) box.classList.add("is-selected");
      box.addEventListener("click", function () {
        // if this heading is already placed, clicking it removes it
        if (used[o[0]] != null) {
          delete state.answers[aKey("t" + used[o[0]])];
          state.activeText[activeKey] = used[o[0]];
          renderScreen(); renderHeader();
          return;
        }
        // target = active text, else first unassigned text
        var target = activeIdx();
        if (target < 0 || letterFor(target)) {
          target = -1;
          for (var i = 0; i < p.texts.length; i++) {
            if (!letterFor(i)) { target = i; break; }
          }
        }
        if (target < 0) return; // all texts already filled
        state.answers[aKey("t" + target)] = o[0];
        // advance active pointer to next empty text
        var next = -1;
        for (var j = 0; j < p.texts.length; j++) {
          if (!letterFor(j) && j !== target) { next = j; break; }
        }
        state.activeText[activeKey] = next;
        markDone();
        renderScreen(); renderHeader();
      });
      row.appendChild(box);
      list.appendChild(row);
    });
    panel.appendChild(list);
    work.appendChild(panel);
    return work;
  }

  /* ---- Teil 2: multiple choice ---- */
  function buildMultipleChoice(p) {
    var work = el("div", "work");

    var reader = el("div", "reader cols");
    var cols = el("div", "reader-cols");
    cols.appendChild(el("div", null, p.readerCols[0]));
    cols.appendChild(el("div", null, p.readerCols[1]));
    reader.appendChild(cols);
    work.appendChild(reader);

    var panel = el("div", "panel");
    var list = el("div", "q-list");
    p.questions.forEach(function (q, qi) {
      var card = el("div", "q-card");
      card.appendChild(el("div", "q-title",
        '<span class="q-num">' + (qi + 1) + '.</span>' + esc(q.q)));
      q.a.forEach(function (ans, ai) {
        var opt = el("div", "q-opt");
        opt.innerHTML = '<span class="radio"></span>';
        opt.appendChild(el("span", null, esc(ans)));
        if (state.answers[aKey("q" + qi)] === ai) opt.classList.add("is-selected");
        opt.addEventListener("click", function () {
          state.answers[aKey("q" + qi)] = ai;
          markDone();
          renderScreen(); renderHeader();
        });
        card.appendChild(opt);
      });
      list.appendChild(card);
    });
    panel.appendChild(list);
    work.appendChild(panel);
    return work;
  }

  /* ---- Teil 3: situation match ---- */
  function buildSituationMatch(p) {
    var work = el("div", "work");

    var reader = el("div", "reader");
    var grid = el("div", "match-grid");
    p.cards.forEach(function (cd) {
      var card = el("div", "match-card");
      card.appendChild(el("div", "tag" + (cd.tag ? "" : " empty"), cd.tag ? esc(cd.tag) : ""));
      if (cd.head) card.appendChild(el("h5", null, esc(cd.head)));
      card.appendChild(el("div", null, cd.body));
      grid.appendChild(card);
    });
    reader.appendChild(grid);
    work.appendChild(reader);

    var panel = el("div", "panel");
    var list = el("div", "sit-list");
    p.situations.forEach(function (s, si) {
      var row = el("div", "sit");
      row.appendChild(el("div", "sit-num", (si + 1) + "."));
      var choice = el("div", "sit-choice");
      var radio = el("span", "radio");
      var x = el("span", "x", "x");
      if (state.answers[aKey("sit" + si)] === "o") radio.classList.add("is-selected");
      if (state.answers[aKey("sit" + si)] === "x") x.style.fontWeight = "700";
      radio.addEventListener("click", function () {
        state.answers[aKey("sit" + si)] = "o"; markDone(); renderScreen(); renderHeader();
      });
      x.addEventListener("click", function () {
        state.answers[aKey("sit" + si)] = "x"; markDone(); renderScreen(); renderHeader();
      });
      choice.appendChild(radio); choice.appendChild(x);
      row.appendChild(choice);
      row.appendChild(el("div", "sit-box", esc(s)));
      list.appendChild(row);
    });
    panel.appendChild(list);
    work.appendChild(panel);
    return work;
  }

  /* ---- Sprachbausteine Teil 1: gap radio grid ---- */
  function buildGapRadio(p) {
    var work = el("div", "work");

    var reader = el("div", "reader");
    var html = p.letter.replace(/@(\d+)/g, function (_, n) {
      var sel = state.answers[aKey("g" + (n - 1))];
      var label = sel != null ? p.rows[n - 1][sel] : n;
      var cls = sel != null ? "gap" : "gap placeholder";
      return '<span class="' + cls + '" data-gap="' + n + '">' + esc(label) + '</span>';
    });
    reader.innerHTML = html;
    work.appendChild(reader);

    var panel = el("div", "panel");
    var sb1 = el("div", "sb1");
    p.rows.forEach(function (opts, ri) {
      var row = el("div", "sb1-row");
      row.appendChild(el("div", "sb1-num", (ri + 1) + "."));
      opts.forEach(function (w, oi) {
        var opt = el("div", "row-opt");
        opt.innerHTML = '<span class="radio"></span>';
        opt.appendChild(el("span", null, esc(w)));
        if (state.answers[aKey("g" + ri)] === oi) {
          opt.classList.add("is-selected");
          row.classList.add("is-active");
        }
        opt.addEventListener("click", function () {
          state.answers[aKey("g" + ri)] = oi; markDone(); renderScreen(); renderHeader();
        });
        row.appendChild(opt);
      });
      sb1.appendChild(row);
    });
    panel.appendChild(sb1);
    work.appendChild(panel);
    return work;
  }

  /* ---- Sprachbausteine Teil 2: word bank ---- */
  function buildWordBank(p) {
    var work = el("div", "work");

    var used = {};
    Object.keys(state.answers).forEach(function (k) {
      if (k.indexOf(aKey("w")) === 0) used[state.answers[k]] = true;
    });

    var reader = el("div", "reader");
    if (p.heading) reader.appendChild(el("h4", null, esc(p.heading)));
    var holder = el("div");
    holder.innerHTML = p.letter.replace(/@(\d+)/g, function (_, n) {
      var sel = state.answers[aKey("w" + (n - 1))];
      var bankItem = sel != null ? p.bank.find(function (b) { return b[0] === sel; }) : null;
      var label = bankItem ? bankItem[1] : "...".concat(n, "...");
      var cls = bankItem ? "gap" : "gap placeholder";
      return '<span class="' + cls + '" data-slot="' + n + '">' + esc(label) + '</span>';
    });
    reader.appendChild(holder);
    work.appendChild(reader);

    // clicking a slot clears it
    holder.querySelectorAll(".gap[data-slot]").forEach(function (g) {
      g.style.cursor = "pointer";
      g.addEventListener("click", function () {
        delete state.answers[aKey("w" + (this.dataset.slot - 1))];
        renderScreen(); renderHeader();
      });
    });

    var panel = el("div", "panel");
    var bank = el("div", "bank");
    p.bank.forEach(function (b) {
      var item = el("div", "bank-item");
      item.innerHTML = '<div class="bank-letter">' + b[0] + '</div>';
      var box = el("div", "bank-box" + (used[b[0]] ? " is-used" : ""), esc(b[1]));
      box.addEventListener("click", function () {
        // assign to first empty gap
        for (var i = 0; i < 10; i++) {
          if (state.answers[aKey("w" + i)] == null) {
            state.answers[aKey("w" + i)] = b[0];
            break;
          }
        }
        markDone();
        renderScreen(); renderHeader();
      });
      item.appendChild(box);
      bank.appendChild(item);
    });
    panel.appendChild(bank);
    work.appendChild(panel);
    return work;
  }

  /* ---- Hörverstehen Teil 1: richtig/falsch ---- */
  function buildRichtigFalsch(p) {
    var wrap = el("div", "rf-wrap");
    var table = el("table", "rf-table");
    table.innerHTML = '<thead><tr><th></th><th>RICHTIG</th><th>FALSCH</th><th></th></tr></thead>';
    var tb = el("tbody");
    p.statements.forEach(function (s, si) {
      var tr = el("tr");
      tr.appendChild(el("td", "rf-num", (si + 1) + "."));
      ["r", "f"].forEach(function (val) {
        var td = el("td", "rf-pick");
        td.innerHTML = '<span class="radio"></span>';
        if (state.answers[aKey("rf" + si)] === val) td.classList.add("is-selected");
        td.addEventListener("click", function () {
          state.answers[aKey("rf" + si)] = val; markDone(); renderScreen(); renderHeader();
        });
        tr.appendChild(td);
      });
      tr.appendChild(el("td", null, esc(s)));
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(table);
    return wrap;
  }

  /* ---- Schreiben Teil 1: writing ---- */
  function buildWriting(p) {
    var grid = el("div", "write-grid");
    grid.appendChild(el("div", "write-task", p.task));
    var ta = el("textarea", "write-area");
    ta.placeholder = "Schreiben Sie hier Ihren Text …";
    ta.value = state.answers[aKey("text")] || "";
    ta.addEventListener("input", function () {
      state.answers[aKey("text")] = this.value;
      if (this.value) markDone();
    });
    grid.appendChild(ta);
    return grid;
  }

  /* -------------------- RESET / FOOTER -------------------- */
  function renderFooterFixed() {
    $("#foot-user").textContent = DATA.candidate;
  }

  /* -------------------- RENDER -------------------- */
  function render() {
    renderHeader();
    renderSection();
    renderScreen();

    // reset button (only for interactive answer screens)
    var rf = $("#work-footer");
    rf.innerHTML = "";
    var p = curPart();
    if (p.type !== "writing") {
      var btn = el("button", "btn-reset", "Zurücksetzen");
      btn.addEventListener("click", function () {
        var prefix = state.mod + "." + state.part[state.mod] + ".";
        Object.keys(state.answers).forEach(function (k) {
          if (k.indexOf(prefix) === 0) delete state.answers[k];
        });
        delete state.done[state.mod + "." + state.part[state.mod]];
        render();
      });
      rf.appendChild(btn);
    }
  }

  /* -------------------- PRINT EXPORT HOOK -------------------- */
  // Lets the print page reuse the exact same builders, statically.
  window.EXAM_BUILD_PART = function (modIdx, partIdx) {
    state.mod = modIdx;
    state.part[modIdx] = partIdx;
    var p = DATA.modules[modIdx].parts[partIdx];
    var builder = {
      "heading-match": buildHeadingMatch,
      "multiple-choice": buildMultipleChoice,
      "situation-match": buildSituationMatch,
      "gap-radio": buildGapRadio,
      "word-bank": buildWordBank,
      "richtig-falsch": buildRichtigFalsch,
      "writing": buildWriting
    }[p.type];
    return { part: p, node: builder ? builder(p) : el("div") };
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (window.EXAM_PRINT_MODE) return; // print page drives its own render
    renderFooterFixed();
    render();
  });
})();
