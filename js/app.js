/* SteelCalc UI — depends on steel.js (window.STEEL) and jsPDF (optional, for PDF export). */
(function () {
  'use strict';
  var S = window.STEEL;
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- i18n ---------------- */
  var T = {
    en: {
      tagline: 'Weight & quotation', density: 'Density', inputs: 'Inputs',
      rate: 'Unit rate', currency: 'Currency', addToQuote: 'Add to quotation',
      result: 'Result', totalWeight: 'Total weight', quotation: 'Quotation',
      items: 'items', totalWt: 'Total weight', subtotal: 'Subtotal', tax: 'Tax / VAT',
      grandTotal: 'Grand total', exportPdf: 'Export PDF', exportCsv: 'Export CSV', clear: 'Clear',
      convertedValue: 'Converted value', enterDims: 'Enter dimensions to calculate',
      emptyQuote: 'No items yet — add a calculation above.', pcs: 'pcs', sheets: 'sheets',
      // profiles
      pipe: 'Pipe', rhs: 'RHS', shs: 'SHS', hbeam: 'H-Beam', ibeam: 'I-Beam',
      plate: 'Plate', roundbar: 'Round Bar', converter: 'Converter',
      // fields
      od: 'Outer diameter', thickness: 'Thickness', length: 'Length', qty: 'Quantity',
      width: 'Width', height: 'Height', side: 'Side', flangeWidth: 'Flange width',
      webThk: 'Web thickness', flangeThk: 'Flange thickness', depth: 'Depth',
      diameter: 'Diameter', value: 'Value', from: 'From', to: 'To', category: 'Category',
      // breakdown labels
      sectionArea: 'Section area', weightPerM: 'Weight / metre', weightPerPc: 'Weight / piece',
      areaPerSheet: 'Area / sheet', weightPerM2: 'Weight / m²', weightPerSheet: 'Weight / sheet',
      lineCost: 'Line cost', lengthEach: 'Length (each)',
      catLength: 'Length', catWeight: 'Weight', catArea: 'Area'
    },
    ar: {
      tagline: 'الوزن وعرض السعر', density: 'الكثافة', inputs: 'المدخلات',
      rate: 'سعر الوحدة', currency: 'العملة', addToQuote: 'أضف إلى عرض السعر',
      result: 'النتيجة', totalWeight: 'الوزن الإجمالي', quotation: 'عرض السعر',
      items: 'عناصر', totalWt: 'الوزن الإجمالي', subtotal: 'المجموع الفرعي', tax: 'الضريبة',
      grandTotal: 'الإجمالي', exportPdf: 'تصدير PDF', exportCsv: 'تصدير CSV', clear: 'مسح',
      convertedValue: 'القيمة المحوّلة', enterDims: 'أدخل الأبعاد للحساب',
      emptyQuote: 'لا توجد عناصر بعد — أضف حساباً من الأعلى.', pcs: 'قطعة', sheets: 'لوح',
      pipe: 'أنبوب', rhs: 'مقطع مستطيل', shs: 'مقطع مربع', hbeam: 'كمرة H', ibeam: 'كمرة I',
      plate: 'لوح', roundbar: 'قضيب دائري', converter: 'محوّل الوحدات',
      od: 'القطر الخارجي', thickness: 'السماكة', length: 'الطول', qty: 'الكمية',
      width: 'العرض', height: 'الارتفاع', side: 'الضلع', flangeWidth: 'عرض الجناح',
      webThk: 'سماكة العصب', flangeThk: 'سماكة الجناح', depth: 'العمق',
      diameter: 'القطر', value: 'القيمة', from: 'من', to: 'إلى', category: 'الفئة',
      sectionArea: 'مساحة المقطع', weightPerM: 'الوزن / متر', weightPerPc: 'الوزن / قطعة',
      areaPerSheet: 'المساحة / لوح', weightPerM2: 'الوزن / م²', weightPerSheet: 'الوزن / لوح',
      lineCost: 'تكلفة البند', lengthEach: 'الطول (للقطعة)',
      catLength: 'طول', catWeight: 'وزن', catArea: 'مساحة'
    }
  };
  function t(k) { return (T[state.lang] && T[state.lang][k]) || T.en[k] || k; }

  /* ---------------- state ---------------- */
  var state = load() || {};
  state.lang = state.lang || 'en';
  state.theme = state.theme || 'dark';
  state.density = state.density || S.DEFAULT_DENSITY;
  state.currency = state.currency || 'QAR';
  state.taxRate = state.taxRate != null ? state.taxRate : 0;
  state.profile = state.profile || 'pipe';
  state.items = state.items || [];

  function persist() {
    try {
      localStorage.setItem('steelcalc', JSON.stringify({
        lang: state.lang, theme: state.theme, density: state.density,
        currency: state.currency, taxRate: state.taxRate, profile: state.profile,
        items: state.items
      }));
    } catch (e) {}
  }
  function load() {
    try { return JSON.parse(localStorage.getItem('steelcalc') || 'null'); }
    catch (e) { return null; }
  }

  /* ---------------- number helpers ---------------- */
  function nf(n, dp) {
    if (dp == null) dp = 2;
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function wf(kg) { return nf(kg, kg < 100 ? 2 : 1) + ' kg'; }
  function cf(v) { return nf(v, 2); }

  /* ---------------- profile definitions ---------------- */
  // field: {id, key(label), unit, def, ph}
  var f = function (id, key, unit, def) { return { id: id, key: key, unit: unit, def: def }; };

  var PROFILES = {
    pipe: {
      linear: true,
      fields: [f('od', 'od', 'mm'), f('t', 'thickness', 'mm'), f('len', 'length', 'm', 6), f('qty', 'qty', 'pcs', 1)],
      hint: 'π/4·(OD²−ID²)·ρ',
      run: function (v, rho) {
        var pm = S.pipePerM(v.od, v.t, rho); if (pm == null) return null;
        return { pm: pm, area: S.areaPipe(v.od, v.t), desc: 'Pipe Ø' + v.od + '×' + v.t + ' mm' };
      }
    },
    rhs: {
      linear: true,
      fields: [f('h', 'height', 'mm'), f('b', 'width', 'mm'), f('t', 'thickness', 'mm'), f('len', 'length', 'm', 6), f('qty', 'qty', 'pcs', 1)],
      hint: '[HB−(H−2t)(B−2t)]·ρ',
      run: function (v, rho) {
        var pm = S.rectHollowPerM(v.h, v.b, v.t, rho); if (pm == null) return null;
        return { pm: pm, area: S.areaRectHollow(v.h, v.b, v.t), desc: 'RHS ' + v.h + '×' + v.b + '×' + v.t + ' mm' };
      }
    },
    shs: {
      linear: true,
      fields: [f('a', 'side', 'mm'), f('t', 'thickness', 'mm'), f('len', 'length', 'm', 6), f('qty', 'qty', 'pcs', 1)],
      hint: '[A²−(A−2t)²]·ρ',
      run: function (v, rho) {
        var pm = S.rectHollowPerM(v.a, v.a, v.t, rho); if (pm == null) return null;
        return { pm: pm, area: S.areaRectHollow(v.a, v.a, v.t), desc: 'SHS ' + v.a + '×' + v.a + '×' + v.t + ' mm' };
      }
    },
    hbeam: {
      linear: true,
      fields: [f('d', 'depth', 'mm'), f('b', 'flangeWidth', 'mm'), f('tw', 'webThk', 'mm'), f('tf', 'flangeThk', 'mm'), f('len', 'length', 'm', 12), f('qty', 'qty', 'pcs', 1)],
      hint: '2·B·tf + (D−2tf)·tw',
      run: function (v, rho) {
        var pm = S.beamPerM(v.d, v.b, v.tw, v.tf, rho); if (pm == null) return null;
        return { pm: pm, area: S.areaBeam(v.d, v.b, v.tw, v.tf), desc: 'H-beam ' + v.d + '×' + v.b + ' mm' };
      }
    },
    ibeam: {
      linear: true,
      fields: [f('d', 'depth', 'mm'), f('b', 'flangeWidth', 'mm'), f('tw', 'webThk', 'mm'), f('tf', 'flangeThk', 'mm'), f('len', 'length', 'm', 12), f('qty', 'qty', 'pcs', 1)],
      hint: '2·B·tf + (D−2tf)·tw',
      run: function (v, rho) {
        var pm = S.beamPerM(v.d, v.b, v.tw, v.tf, rho); if (pm == null) return null;
        return { pm: pm, area: S.areaBeam(v.d, v.b, v.tw, v.tf), desc: 'I-beam ' + v.d + '×' + v.b + ' mm' };
      }
    },
    plate: {
      linear: false,
      fields: [f('l', 'length', 'm'), f('w', 'width', 'm'), f('t', 'thickness', 'mm'), f('qty', 'qty', 'sheets', 1)],
      hint: 'L·W·t·ρ',
      run: function (v, rho) {
        var each = S.plateWeight(v.l, v.w, v.t, rho);
        return { each: each, sheetArea: v.l * v.w, perM2: (v.t / 1000) * rho, desc: 'Plate ' + v.l + '×' + v.w + ' m × ' + v.t + ' mm' };
      }
    },
    roundbar: {
      linear: true,
      fields: [f('d', 'diameter', 'mm'), f('len', 'length', 'm', 6), f('qty', 'qty', 'pcs', 1)],
      hint: 'π/4·d²·ρ',
      run: function (v, rho) {
        var pm = S.roundBarPerM(v.d, rho);
        return { pm: pm, area: S.areaRoundBar(v.d), desc: 'Round bar Ø' + v.d + ' mm' };
      }
    }
  };
  var ORDER = ['pipe', 'rhs', 'shs', 'hbeam', 'ibeam', 'plate', 'roundbar', 'converter'];

  /* ---------------- rendering ---------------- */
  var lastInputs = {}; // per-profile field values

  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    $('densityVal').textContent = state.density;
    $('curLabel').textContent = state.currency;
    $('currency').value = state.currency;
    $('taxRate').value = state.taxRate;
    $('themeIcon').style.opacity = state.theme === 'light' ? 0.9 : 1;
  }

  function renderTabs() {
    var nav = $('tabs'); nav.innerHTML = '';
    ORDER.forEach(function (key) {
      var b = document.createElement('button');
      b.className = 'tab'; b.role = 'tab'; b.textContent = t(key);
      b.setAttribute('aria-selected', key === state.profile ? 'true' : 'false');
      b.addEventListener('click', function () { state.profile = key; persist(); renderAll(); });
      nav.appendChild(b);
    });
  }

  function renderFields() {
    var host = $('fields'); host.innerHTML = '';
    if (state.profile === 'converter') { renderConverter(host); return; }
    $('costFields').hidden = false;
    $('profileHint').textContent = PROFILES[state.profile].hint;
    var saved = lastInputs[state.profile] || {};
    PROFILES[state.profile].fields.forEach(function (fd) {
      var wrap = document.createElement('div'); wrap.className = 'field';
      var lab = document.createElement('label'); lab.textContent = t(fd.key);
      var box = document.createElement('div'); box.className = 'input';
      var inp = document.createElement('input');
      inp.type = 'number'; inp.inputMode = 'decimal'; inp.step = 'any'; inp.min = '0';
      inp.id = 'in_' + fd.id; inp.placeholder = fd.def != null ? String(fd.def) : '0';
      if (saved[fd.id] != null) inp.value = saved[fd.id];
      inp.addEventListener('input', compute);
      var u = document.createElement('span'); u.className = 'unit';
      u.textContent = fd.unit === 'pcs' ? t('pcs') : (fd.unit === 'sheets' ? t('sheets') : fd.unit);
      box.appendChild(inp); box.appendChild(u);
      wrap.appendChild(lab); wrap.appendChild(box); host.appendChild(wrap);
    });
  }

  function renderConverter(host) {
    $('costFields').hidden = true;
    $('profileHint').textContent = '';
    var cats = { length: 'catLength', weight: 'catWeight', area: 'catArea' };
    var cat = lastInputs._cvCat || 'length';
    var units = Object.keys(S.UNITS[cat]);
    function sel(id, opts, val) {
      var s = '<select id="' + id + '">';
      opts.forEach(function (o) { s += '<option' + (o[0] === val ? ' selected' : '') + ' value="' + o[0] + '">' + o[1] + '</option>'; });
      return s + '</select>';
    }
    host.innerHTML =
      '<div class="field full"><label>' + t('category') + '</label><div class="input">' +
        sel('cvCat', Object.keys(cats).map(function (c) { return [c, t(cats[c])]; }), cat) + '</div></div>' +
      '<div class="field"><label>' + t('value') + '</label><div class="input"><input id="cvVal" type="number" step="any" inputmode="decimal" value="' + (lastInputs._cvVal != null ? lastInputs._cvVal : 1) + '"></div></div>' +
      '<div class="field"><label>' + t('from') + '</label><div class="input">' + sel('cvFrom', units.map(function (u) { return [u, u]; }), lastInputs._cvFrom || units[0]) + '</div></div>' +
      '<div class="field full"><label>' + t('to') + '</label><div class="input">' + sel('cvTo', units.map(function (u) { return [u, u]; }), lastInputs._cvTo || units[1]) + '</div></div>';
    ['cvVal', 'cvFrom', 'cvTo'].forEach(function (id) { $(id).addEventListener('input', compute); });
    $('cvCat').addEventListener('change', function () {
      lastInputs._cvCat = $('cvCat').value; lastInputs._cvFrom = null; lastInputs._cvTo = null;
      renderFields(); compute();
    });
  }

  /* ---------------- compute ---------------- */
  function readFields() {
    var v = {}; var ok = true;
    PROFILES[state.profile].fields.forEach(function (fd) {
      var el = $('in_' + fd.id);
      var raw = el && el.value !== '' ? parseFloat(el.value) : (fd.def != null ? fd.def : NaN);
      v[fd.id] = raw;
      if (!(raw > 0)) ok = false;
    });
    lastInputs[state.profile] = v;
    return ok ? v : null;
  }

  var current = null; // last valid computation for "add"

  function compute() {
    if (state.profile === 'converter') return computeConverter();
    var kicker = $('gaugeKicker'); kicker.textContent = t('totalWeight');
    var v = readFields();
    if (!v) { showEmpty(); current = null; return; }
    var r = PROFILES[state.profile].run(v, state.density);
    if (!r) { showEmpty(); current = null; return; }

    var qty = v.qty || 1;
    var pieceWeight, rows = [];
    if (PROFILES[state.profile].linear) {
      pieceWeight = r.pm * v.len;
      rows.push([t('sectionArea'), nf(r.area, 1) + ' mm²']);
      rows.push([t('weightPerM'), nf(r.pm, 2) + ' kg/m']);
      rows.push([t('lengthEach'), nf(v.len, 2) + ' m']);
      rows.push([t('weightPerPc'), wf(pieceWeight)]);
    } else { // plate
      pieceWeight = r.each;
      rows.push([t('areaPerSheet'), nf(r.sheetArea, 3) + ' m²']);
      rows.push([t('weightPerM2'), nf(r.perM2, 2) + ' kg/m²']);
      rows.push([t('weightPerSheet'), wf(pieceWeight)]);
    }
    var total = pieceWeight * qty;
    var rate = parseFloat($('rate').value) || 0;
    var cost = total * rate;

    current = {
      desc: r.desc + ' · ' + nf((PROFILES[state.profile].linear ? v.len : 1), 2) +
            (PROFILES[state.profile].linear ? ' m' : '') + (qty > 1 ? ' × ' + qty : ''),
      shortDesc: r.desc, qty: qty, unitWeight: pieceWeight, totalWeight: total,
      rate: rate, amount: cost, currency: state.currency,
      metaLine: (PROFILES[state.profile].linear ? nf(v.len, 2) + ' m each' : 'sheet') +
                ' · ' + qty + ' ' + (PROFILES[state.profile].linear ? t('pcs') : t('sheets'))
    };

    showResult(total, rows, r.desc, rate, cost);
  }

  function computeConverter() {
    $('gaugeKicker').textContent = t('convertedValue');
    $('resultDesc').textContent = '';
    var cat = $('cvCat').value, from = $('cvFrom').value, to = $('cvTo').value;
    var val = parseFloat($('cvVal').value);
    lastInputs._cvCat = cat; lastInputs._cvVal = $('cvVal').value; lastInputs._cvFrom = from; lastInputs._cvTo = to;
    if (isNaN(val)) { showEmpty(); return; }
    var out = S.convert(val, from, to, cat);
    setBig(out, to, function (x) { return nf(x, 4); });
    $('gaugeSub').textContent = nf(val, 4) + ' ' + from + ' = ' + nf(out, 4) + ' ' + to;
    $('segbar').innerHTML = ''; $('breakdown').innerHTML = '';
    var one = S.convert(1, from, to, cat);
    addBrow($('breakdown'), '1 ' + from, nf(one, 6) + ' ' + to);
    addBrow($('breakdown'), '1 ' + to, nf(S.convert(1, to, from, cat), 6) + ' ' + from);
  }

  /* ---------------- readout paint ---------------- */
  function showEmpty() {
    $('bigNum').textContent = '—'; $('bigUnit').textContent = 'kg';
    $('gaugeSub').textContent = t('enterDims');
    $('resultDesc').textContent = '—';
    $('segbar').innerHTML = ''; $('breakdown').innerHTML = '';
  }

  function setBig(num, unit, fmt) {
    var el = $('bigNum'); $('bigUnit').textContent = unit;
    var to = num, from = parseFloat((el.textContent || '0').replace(/,/g, '')) || 0;
    if (reduceMotion || !isFinite(from)) { el.textContent = fmt(to); return; }
    var start = performance.now(), dur = 320;
    (function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  function showResult(total, rows, desc, rate, cost) {
    setBig(total, 'kg', function (x) { return nf(x, x < 100 ? 2 : 1); });
    $('resultDesc').textContent = desc;
    $('gaugeSub').textContent = total >= 1000 ? '= ' + nf(total / 1000, 3) + ' tonnes' : '\u00A0';
    // segbar fills relative to a soft 5000 kg reference (visual only)
    var seg = $('segbar'); seg.innerHTML = '';
    var on = Math.max(1, Math.round(Math.min(1, total / 5000) * 12));
    for (var i = 0; i < 12; i++) { var s = document.createElement('i'); if (i < on) s.className = 'on'; seg.appendChild(s); }
    var bd = $('breakdown'); bd.innerHTML = '';
    rows.forEach(function (r) { addBrow(bd, r[0], r[1]); });
    if (rate > 0) addBrow(bd, t('lineCost') + ' (' + state.currency + ' ' + nf(rate, 2) + '/kg)', state.currency + ' ' + cf(cost), true);
  }

  function addBrow(host, k, v, cost) {
    var row = document.createElement('div'); row.className = 'brow' + (cost ? ' cost' : '');
    var kk = document.createElement('span'); kk.className = 'k'; kk.textContent = k;
    var vv = document.createElement('span'); vv.className = 'v'; vv.textContent = v;
    row.appendChild(kk); row.appendChild(vv); host.appendChild(row);
  }

  /* ---------------- quotation ---------------- */
  function renderQuote() {
    var list = $('qlist'); list.innerHTML = '';
    $('itemCount').textContent = state.items.length;
    if (!state.items.length) {
      list.innerHTML = '<div class="empty">' + t('emptyQuote') + '</div>';
      $('totals').hidden = true; persist(); return;
    }
    var totW = 0, sub = 0;
    state.items.forEach(function (it, i) {
      totW += it.totalWeight; sub += it.amount;
      var row = document.createElement('div'); row.className = 'qitem';
      row.innerHTML =
        '<div class="desc">' + esc(it.shortDesc) + '</div>' +
        '<div class="amt">' + it.currency + ' ' + cf(it.amount) + '</div>' +
        '<button class="del" title="Remove" data-i="' + i + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>' +
        '</button>' +
        '<div class="meta">' + wf(it.totalWeight) + ' · ' + esc(it.metaLine) +
          (it.rate > 0 ? ' · @' + nf(it.rate, 2) + '/kg' : '') + '</div>';
      row.querySelector('.del').addEventListener('click', function () {
        state.items.splice(i, 1); renderQuote();
      });
      list.appendChild(row);
    });
    var tax = (parseFloat($('taxRate').value) || 0) / 100;
    var taxAmt = sub * tax, grand = sub + taxAmt;
    var cur = state.currency;
    $('tWeight').textContent = wf(totW);
    $('tSub').textContent = cur + ' ' + cf(sub);
    $('tTax').textContent = cur + ' ' + cf(taxAmt);
    $('tGrand').textContent = cur + ' ' + cf(grand);
    $('totals').hidden = false;
    persist();
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------------- export ---------------- */
  function quoteRows() {
    return state.items.map(function (it, i) {
      return [i + 1, it.shortDesc, it.qty, nf(it.unitWeight, 2), nf(it.totalWeight, 2), nf(it.rate, 2), cf(it.amount)];
    });
  }

  function exportCsv() {
    if (!state.items.length) return;
    var head = ['#', 'Description', 'Qty', 'Unit wt (kg)', 'Total wt (kg)', 'Rate (' + state.currency + '/kg)', 'Amount (' + state.currency + ')'];
    var lines = [head].concat(quoteRows()).map(function (r) {
      return r.map(function (c) { var s = String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',');
    });
    var sub = state.items.reduce(function (a, b) { return a + b.amount; }, 0);
    var tax = sub * (parseFloat($('taxRate').value) || 0) / 100;
    lines.push('', ',,,,,Subtotal,' + cf(sub), ',,,,,Tax,' + cf(tax), ',,,,,Grand total,' + cf(sub + tax));
    download('steelcalc-quotation.csv', 'text/csv', lines.join('\n'));
  }

  function exportPdf() {
    if (!state.items.length) return;
    var J = window.jspdf && window.jspdf.jsPDF;
    if (!J) { alert('PDF library still loading — try again in a moment, or use Export CSV.'); return; }
    var doc = new J({ unit: 'pt', format: 'a4' });
    var W = doc.internal.pageSize.getWidth(), m = 42, y = 54, cur = state.currency;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('SteelCalc', m, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120);
    doc.text('Steel Weight & Quotation', m, y + 15);
    doc.text(new Date().toLocaleDateString(), W - m, y, { align: 'right' });
    doc.setDrawColor(210); doc.line(m, y + 26, W - m, y + 26);
    y += 48;

    var cols = [m, m + 224, m + 268, m + 336, m + 410, W - m];
    doc.setTextColor(90); doc.setFontSize(8);
    doc.text('DESCRIPTION', cols[0], y);
    doc.text('QTY', cols[1], y); doc.text('UNIT kg', cols[2], y);
    doc.text('TOTAL kg', cols[3], y); doc.text('RATE', cols[4], y);
    doc.text('AMOUNT ' + cur, cols[5], y, { align: 'right' });
    y += 6; doc.line(m, y, W - m, y); y += 14;
    doc.setTextColor(30); doc.setFontSize(9);

    var sub = 0, totW = 0;
    state.items.forEach(function (it) {
      sub += it.amount; totW += it.totalWeight;
      if (y > 760) { doc.addPage(); y = 60; }
      doc.text(String(it.shortDesc).slice(0, 42), cols[0], y);
      doc.text(String(it.qty), cols[1], y);
      doc.text(nf(it.unitWeight, 2), cols[2], y);
      doc.text(nf(it.totalWeight, 2), cols[3], y);
      doc.text(nf(it.rate, 2), cols[4], y);
      doc.text(cf(it.amount), cols[5], y, { align: 'right' });
      y += 16;
    });
    doc.setDrawColor(210); doc.line(m, y, W - m, y); y += 18;
    var tax = sub * (parseFloat($('taxRate').value) || 0) / 100;
    function tot(label, val, bold) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(label, cols[4] - 40, y); doc.text(cur + ' ' + cf(val), W - m, y, { align: 'right' }); y += 16;
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal'); doc.text('Total weight: ' + nf(totW, 2) + ' kg', m, y);
    tot('Subtotal', sub);
    tot('Tax (' + (parseFloat($('taxRate').value) || 0) + '%)', tax);
    doc.setFontSize(11); tot('Grand total', sub + tax, true);

    doc.setFontSize(7.5); doc.setTextColor(150);
    doc.text('Weights are theoretical (cross-section × length × density ' + state.density + ' kg/m³). Verify against mill certificates for critical work.', m, 812);
    doc.save('steelcalc-quotation.pdf');
  }

  function download(name, type, data) {
    var blob = new Blob([data], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------------- wiring ---------------- */
  function renderAll() { renderTabs(); applyStatic(); renderFields(); renderQuote(); compute(); }

  $('addBtn').addEventListener('click', function () {
    if (!current) return;
    state.items.push({
      shortDesc: current.shortDesc, qty: current.qty, unitWeight: current.unitWeight,
      totalWeight: current.totalWeight, rate: current.rate, amount: current.amount,
      currency: current.currency, metaLine: current.metaLine
    });
    renderQuote();
  });
  $('clearBtn').addEventListener('click', function () {
    if (state.items.length && confirm('Clear all ' + state.items.length + ' items?')) { state.items = []; renderQuote(); }
  });
  $('taxRate').addEventListener('input', function () { state.taxRate = parseFloat($('taxRate').value) || 0; renderQuote(); });
  $('rate').addEventListener('input', compute);
  $('currency').addEventListener('change', function () {
    state.currency = $('currency').value; $('curLabel').textContent = state.currency; compute(); renderQuote();
  });
  $('pdfBtn').addEventListener('click', exportPdf);
  $('csvBtn').addEventListener('click', exportCsv);

  $('themeBtn').addEventListener('click', function () {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme); persist();
  });
  $('langBtn').addEventListener('click', function () {
    state.lang = state.lang === 'en' ? 'ar' : 'en'; persist(); renderAll();
  });
  $('densityChip').addEventListener('click', function () {
    var v = prompt('Steel density (kg/m³):', state.density);
    if (v == null) return; var n = parseFloat(v);
    if (n > 0) { state.density = n; $('densityVal').textContent = n; persist(); compute(); }
  });

  // init
  document.documentElement.setAttribute('data-theme', state.theme);
  renderAll();
})();
