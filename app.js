(() => {
  if (!window.ATELIER) {
    document.getElementById("app").innerHTML = "<p class=\"empty-note\">データを読み込めませんでした。ページを再読み込みしてください。</p>";
    return;
  }

  const { RDA, GROUPS, CATEGORIES, INGREDIENTS, MAX_ITEMS } = window.ATELIER;
  const STORE = "atelier-gucchi-recipes";
  const VIEWS = ["home", "blend", "result", "recipes"];
  const TITLES = {
    home: "アトリエ かわぐっち | スムージー栄養計算・五大栄養素チャート",
    blend: "原料を選ぶ | アトリエ かわぐっち",
    result: "栄養チャート | アトリエ かわぐっち",
    recipes: "保存したレシピ | アトリエ かわぐっち"
  };
  const app = document.getElementById("app");
  const toastRoot = document.getElementById("toast-root");
  let toastTimer = 0;

  const EMPTY_N = {
    kcal: 0, carb: 0, protein: 0, fat: 0, sugar: 0, fiber: 0, fructose: 0, glucose: 0, starch: 0, oligo: 0,
    leu: 0, lys: 0, val: 0, ile: 0, gln: 0, arg: 0, sat: 0, mufa: 0, pufa: 0, n3: 0, n6: 0, chol: 0,
    vitA: 0, vitC: 0, vitE: 0, vitB1: 0, vitB6: 0, folate: 0, ca: 0, fe: 0, k: 0, mg: 0, zn: 0, na: 0
  };

  const byId = Object.fromEntries(INGREDIENTS.map((x) => [x.id, x]));

  const state = {
    view: viewFromHash(),
    filter: "all",
    name: "",
    selected: [],
    shareOpen: false,
    editingId: null
  };

  function viewFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "") || "home";
    return VIEWS.includes(raw) ? raw : "home";
  }

  function hashFor(view) {
    return view === "home" ? "#/" : `#/${view}`;
  }

  function absUrl(path) {
    try { return new URL(path, location.href).href; }
    catch { return path; }
  }

  function syncHead() {
    document.title = TITLES[state.view] || TITLES.home;
    document.body.dataset.view = state.view;
    const info = document.getElementById("site-info");
    if (info) info.hidden = state.view !== "home";
    const canonical = document.getElementById("canonical");
    if (canonical) canonical.href = absUrl("./");
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", absUrl("./"));
    else {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:url");
      m.setAttribute("content", absUrl("./"));
      document.head.appendChild(m);
    }
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && !/^https?:/i.test(ogImg.getAttribute("content") || "")) {
      ogImg.setAttribute("content", absUrl("img/kawagucchi-smoothie.png"));
    }
    const twImg = document.querySelector('meta[name="twitter:image"]');
    if (twImg && !/^https?:/i.test(twImg.getAttribute("content") || "")) {
      twImg.setAttribute("content", absUrl("img/kawagucchi-smoothie.png"));
    }
  }

  function go(view, { replace = false, resetScroll = true } = {}) {
    if (view === "result" && !state.selected.length) view = "blend";
    state.view = view;
    state.shareOpen = false;
    const h = hashFor(view);
    if (location.hash !== h) {
      if (replace) history.replaceState({ view }, "", h);
      else history.pushState({ view }, "", h);
    }
    render({ resetScroll });
  }

  function getItem(row) {
    if (!row) return null;
    if (row.custom) {
      return {
        id: row.id,
        name: (row.name || "").trim() || "自由枠",
        custom: true,
        n: { ...EMPTY_N }
      };
    }
    return byId[row.id] || null;
  }

  function loadRecipes() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.filter((r) => r && r.id && typeof r.name === "string" && Array.isArray(r.items));
    } catch {
      return [];
    }
  }

  function saveRecipes(list) {
    try {
      localStorage.setItem(STORE, JSON.stringify(list));
      return true;
    } catch {
      toast("保存できる容量を超えたみたい");
      return false;
    }
  }

  function toast(msg) {
    if (!toastRoot) return;
    toastRoot.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastRoot.innerHTML = ""; }, 1800);
  }

  function scale(n, grams) {
    const f = (Number(grams) || 0) / 100;
    const out = {};
    for (const k of Object.keys(n || {})) out[k] = (Number(n[k]) || 0) * f;
    return out;
  }

  function sumSelected() {
    const total = {};
    for (const row of state.selected) {
      const ing = getItem(row);
      if (!ing) continue;
      const s = scale(ing.n, row.grams);
      for (const [k, v] of Object.entries(s)) total[k] = (total[k] || 0) + v;
    }
    return total;
  }

  function pct(value, target) {
    if (!target) return 0;
    return (value / target) * 100;
  }

  function meanPct(total, keys) {
    if (!keys.length) return 0;
    const vals = keys.map((k) => Math.min(150, pct(total[k] || 0, RDA[k])));
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function analyze() {
    const t = sumSelected();
    const vitKeys = GROUPS.hex.vitamin.items.map((x) => x.key);
    const minKeys = GROUPS.hex.mineral.items.map((x) => x.key);
    const pentagon = {
      carb: pct(t.carb || 0, RDA.carb),
      protein: pct(t.protein || 0, RDA.protein),
      fat: pct(t.fat || 0, RDA.fat),
      vitamin: meanPct(t, vitKeys),
      mineral: meanPct(t, minKeys)
    };
    const hex = {};
    for (const [group, def] of Object.entries(GROUPS.hex)) {
      hex[group] = def.items.map((item) => ({
        ...item,
        value: t[item.key] || 0,
        pct: pct(t[item.key] || 0, RDA[item.key])
      }));
    }
    return { total: t, pentagon, hex };
  }

  function comment(a) {
    const p = a.pentagon;
    const t = a.total;
    const bits = [];
    if ((t.kcal || 0) < 220) bits.push("軽やかで、午前の一杯にぴったり。");
    else if ((t.kcal || 0) > 480) bits.push("これ一杯で、しっかり満たされそう。");
    else bits.push("ちょうどいいボリュームの、ご褒美スムージー。");
    if (p.vitamin >= 40) bits.push("ビタミンがきれいにのっているよ。");
    if ((t.vitC || 0) / RDA.vitC >= 0.5) bits.push("ビタミンCがうれしい。");
    if (p.protein >= 25) bits.push("たんぱく質もちゃんと入ってるね。");
    if ((t.fiber || 0) / RDA.fiber >= 0.3) bits.push("食物繊維も味方してくれる。");
    if ((t.sugar || 0) > 40) bits.push("糖質は少し多め。食後のデザート向きかも。");
    return "かわぐっちより。 " + bits.slice(0, 3).join(" ");
  }

  function fmt(n, digits) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0";
    const abs = Math.abs(x);
    if (digits === 0) return String(Math.round(x));
    if (digits == null) {
      if (abs === 0) return "0";
      if (abs >= 100) return String(Math.round(x));
      if (abs >= 1) digits = 1;
      else if (abs >= 0.1) digits = 2;
      else digits = 3;
    }
    return x.toFixed(digits).replace(/\.?0+$/, "");
  }

  function radarSVG(scores, labels, color, size = 340) {
    const n = scores.length;
    if (!n) return "";
    const cx = size / 2;
    const cy = size / 2 + 6;
    const r = size * 0.28;
    const pt = (i, ratio) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [cx + r * ratio * Math.cos(a), cy + r * ratio * Math.sin(a)];
    };
    const poly = (ratio) =>
      Array.from({ length: n }, (_, i) => pt(i, ratio).join(",")).join(" ");
    const data = scores
      .map((s, i) => pt(i, Math.max(0, Math.min(1.15, (Number(s) || 0) / 100))).join(","))
      .join(" ");
    const grids = [0.25, 0.5, 0.75, 1]
      .map((g) => `<polygon points="${poly(g)}" fill="none" stroke="rgba(74,61,56,0.10)" stroke-width="1"/>`)
      .join("");
    const axes = Array.from({ length: n }, (_, i) => {
      const [x, y] = pt(i, 1);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(74,61,56,0.12)"/>`;
    }).join("");
    const dots = scores
      .map((s, i) => {
        const [x, y] = pt(i, Math.max(0, Math.min(1.15, (Number(s) || 0) / 100)));
        return `<circle cx="${x}" cy="${y}" r="4.2" fill="${color}"/>`;
      })
      .join("");
    const text = labels
      .map((lab, i) => {
        const [x, y] = pt(i, 1.42);
        return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="#4a3d38" font-family="Zen Kaku Gothic New, sans-serif">${esc(lab)}</text>`;
      })
      .join("");
    return `<svg class="radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(labels.join("、"))}のチャート">${grids}${axes}<polygon points="${data}" fill="${color}33" stroke="${color}" stroke-width="2.2"/>${dots}${text}</svg>`;
  }

  function shareText(a) {
    const name = state.name.trim() || "名前のないスムージー";
    const items = state.selected
      .map((s) => `${getItem(s)?.name || "原料"} ${Number(s.grams) || 0}g`)
      .join(" / ");
    const p = GROUPS.pentagon
      .map((g) => `${g.label} ${fmt(a.pentagon[g.key], 0)}%`)
      .join(" ・ ");
    return `【アトリエ かわぐっち】${name}
原料：${items}
エネルギー：${fmt(a.total.kcal || 0, 0)} kcal
五大栄養素（1日の目安に対する割合）
${p}
かわぐっちとつくった、わたしの一杯。`;
  }

  function persistRecipe() {
    const name = state.name.trim();
    if (!name) {
      toast("レシピ名をつけてね");
      return false;
    }
    if (!state.selected.length) {
      toast("原料を選んでね");
      return false;
    }
    const list = loadRecipes();
    const rec = {
      id: state.editingId || "r" + Date.now(),
      name,
      items: state.selected.map((s) => ({ ...s })),
      savedAt: Date.now()
    };
    const idx = list.findIndex((x) => x.id === rec.id);
    if (idx >= 0) list[idx] = rec;
    else list.unshift(rec);
    if (!saveRecipes(list)) return false;
    state.editingId = rec.id;
    toast("レシピを保存したよ");
    return true;
  }

  function openShare() {
    if (!state.selected.length) return toast("先に原料を入れてね");
    state.shareOpen = true;
    render({ resetScroll: false });
    document.querySelector(".modal")?.focus();
  }

  function addIngredient(id) {
    if (state.selected.some((s) => s.id === id)) {
      state.selected = state.selected.filter((s) => s.id !== id);
      return render({ resetScroll: false });
    }
    if (state.selected.length >= MAX_ITEMS) return toast("原料は10種類まで");
    const ing = byId[id];
    if (!ing) return;
    state.selected.push({ id, grams: ing.defaultG });
    render({ resetScroll: false });
  }

  function addCustom() {
    if (state.selected.length >= MAX_ITEMS) return toast("原料は10種類まで");
    const id = "custom-" + Date.now();
    state.selected.push({ id, custom: true, name: "", grams: 50 });
    state.focusCustom = id;
    render({ resetScroll: false });
  }

  function gramsField(id, grams) {
    return `<label class="grams-wrap"><input class="grams" type="number" inputmode="decimal" min="0" max="9999" step="any" value="${grams}" data-g="${id}" aria-label="数量グラム"><span>g</span></label>`;
  }

  function header(extra = "") {
    return `<header class="topbar">
      <button class="brand" type="button" data-go="home">
        <img src="img/kawagucchi-icon.png" width="52" height="52" alt="かわぐっち">
        <span><small>Smoothie Atelier</small><b>アトリエ かわぐっち</b></span>
      </button>
      <nav class="nav-actions" aria-label="ページ">${extra}</nav>
    </header>`;
  }

  function homeView() {
    const recipes = loadRecipes();
    const cards = recipes.length
      ? recipes
          .map(
            (r) => `<button class="recipe-card" type="button" data-open="${esc(r.id)}">
          <b>${esc(r.name)}</b>
          <span>${r.items.length}種 ・ ${r.items.map((i) => getItem(i)?.name).filter(Boolean).slice(0, 3).join("、")}</span>
        </button>`
          )
          .join("")
      : `<p class="empty-note">まだ保存されたレシピはないよ。かわぐっちと、最初の一杯をつくってみよう。</p>`;
    return `${header(`<button class="btn btn-ghost" type="button" data-go="recipes">保存したレシピ</button>`)}
    <section class="hero">
      <div>
        <p class="kicker">for a graceful glass</p>
        <h2 class="hero-title">10の恵みを重ねて、<br>わたしの栄養を見る。</h2>
        <p class="lead">フルーツや野菜、ミルク、こんにゃくを選ぶと、五大栄養素の五角形チャートと、それぞれの代表6栄養素の六角形チャートが立ち上がります。レシピには名前をつけて、メールやLINEでそっと渡せます。</p>
        <div class="row-actions">
          <button class="btn btn-rose" type="button" data-go="blend">一杯つくる</button>
          <button class="btn btn-ghost" type="button" data-sample>いちごヨーグルトを見る</button>
        </div>
      </div>
      <div class="hero-art">
        <img class="mascot" src="img/kawagucchi-smoothie.png" width="340" height="340" alt="スムージーを持つかわぐっち">
      </div>
    </section>
    <h2 class="section-title">保存したレシピ</h2>
    <div class="recipe-grid">${cards}</div>`;
  }

  function blendView() {
    const list = INGREDIENTS.filter((i) => state.filter === "all" || i.cat === state.filter);
    const chips = `<button class="chip ${state.filter === "all" ? "on" : ""}" type="button" data-filter="all">すべて</button>` +
      CATEGORIES.map(
        (c) =>
          `<button class="chip ${state.filter === c.id ? "on" : ""}" type="button" data-filter="${c.id}">${esc(c.label)}</button>`
      ).join("");
    const cards = list
      .map((i) => {
        const on = state.selected.find((s) => s.id === i.id);
        return `<div class="ing-card ${on ? "selected" : ""}">
          <button type="button" class="pick" data-add="${i.id}">
            <span class="ing-dot" style="background:${i.tone}"></span>
            <b>${esc(i.name)}</b>
          </button>
          ${on ? `<span>${on.grams}g</span>` : `<span>${i.defaultG}g〜</span>`}
        </div>`;
      })
      .join("") +
      `<button type="button" class="ing-card free-card" data-add-custom>
          <span class="ing-dot" style="background:#eadfd4"></span>
          <b>自由枠</b>
          <span>リストにない原料を追加</span>
        </button>`;
    const picked = state.selected.length
      ? state.selected
          .map((s) => {
            const item = getItem(s);
            const label = s.custom
              ? `<input class="custom-name" data-custom-name="${s.id}" placeholder="原料名を入力" value="${esc(s.name || "")}">`
              : `<div>${esc(item?.name || "不明な原料")}</div>`;
            return `<div class="picked-row">
            ${label}
            ${gramsField(s.id, s.grams)}
            <button class="x" type="button" data-del="${s.id}" aria-label="外す">×</button>
          </div>`;
          })
          .join("")
      : `<p class="empty-note">左から原料をタップして、10種類まで重ねてね。数量はグラムで数字入力できるよ。リストにないものは「自由枠」から。</p>`;
    return `${header(`<button class="btn btn-ghost" type="button" data-go="home">ホーム</button>`)}
    <div class="workspace">
      <div class="card">
        <p class="kicker">choose up to 10</p>
        <h2 style="font-family:var(--serif);margin:0 0 12px;">原料を選ぶ</h2>
        <div class="filters" role="tablist">${chips}</div>
        <div class="ing-grid">${cards}</div>
      </div>
      <aside class="card tray">
        <img class="mascot" src="img/kawagucchi-blend.png" width="140" height="140" alt="" style="width:140px;display:block;margin:0 auto 8px">
        <h2>今日の一杯</h2>
        <div class="count">${state.selected.length} / ${MAX_ITEMS} 種類</div>
        <label class="muted" style="display:block;margin:12px 0 6px;font-size:12px" for="recipe-name">レシピ名</label>
        <input class="name-input" id="recipe-name" placeholder="例）朝のいちごヨーグルト" value="${esc(state.name)}">
        <div class="picked">${picked}</div>
        <div class="row-actions">
          <button class="btn btn-rose" type="button" data-go="result" ${state.selected.length ? "" : "disabled"}>栄養を見る</button>
          <button class="btn btn-ghost" type="button" data-save ${state.selected.length ? "" : "disabled"}>名前をつけて保存</button>
        </div>
      </aside>
    </div>`;
  }

  function resultView() {
    const a = analyze();
    const pentLabels = GROUPS.pentagon.map((g) => g.label);
    const pentScores = GROUPS.pentagon.map((g) => a.pentagon[g.key]);
    const hexCards = Object.entries(GROUPS.hex)
      .map(([key, def]) => {
        const scores = a.hex[key].map((x) => x.pct);
        const labels = a.hex[key].map((x) => x.label);
        const rows = a.hex[key]
          .map(
            (x) =>
              `<tr><td>${esc(x.label)}</td><td class="num">${fmt(x.value)}${esc(x.unit)}</td><td class="num">${fmt(x.pct, 0)}%</td></tr>`
          )
          .join("");
        return `<article class="hex-card" id="hex-${key}">
          <h3>${esc(def.title)}</h3>
          <p class="sub">1日の目安に対する割合</p>
          ${radarSVG(scores, labels, def.accent, 320)}
          <div class="table-wrap"><table><thead><tr><th>栄養素</th><th class="num">含有</th><th class="num">目安比</th></tr></thead><tbody>${rows}</tbody></table></div>
        </article>`;
      })
      .join("");
    const items = state.selected
      .map((s) => `${esc(getItem(s)?.name || "原料")} ${Number(s.grams) || 0}g`)
      .join(" ・ ");
    return `${header(`<button class="btn btn-ghost" type="button" data-go="blend">原料を直す</button>`)}
    <section class="result-head">
      <img class="mascot" src="img/kawagucchi-welcome.png" width="132" height="132" alt="かわぐっち">
      <div>
        <p class="kicker">your glass</p>
        <h2 style="font-family:var(--serif);margin:0">${esc(state.name.trim() || "名前のないスムージー")}</h2>
        <p class="muted" style="margin:6px 0 0;font-size:13px">${items}</p>
        <div class="bubble">${esc(comment(a))}</div>
      </div>
      <div>
        <div class="kcal">${fmt(a.total.kcal || 0, 0)}<small>kcal</small></div>
        <div class="share-row">
          <button class="btn btn-sage" type="button" data-save>保存</button>
          <button class="btn btn-rose" type="button" data-share>共有する</button>
        </div>
      </div>
    </section>
    <section class="chart-hero">
      <h3>五大栄養素</h3>
      <p class="sub">成人女性の1日の目安量に対する、この一杯の割合</p>
      ${radarSVG(pentScores, pentLabels, "#d9899a", 380)}
      <div class="legend">${GROUPS.pentagon
        .map((g) => `<span><i style="background:${g.color}"></i>${esc(g.label)} ${fmt(a.pentagon[g.key], 0)}%</span>`)
        .join("")}</div>
    </section>
    <h2 class="section-title">代表6栄養素</h2>
    <div class="hex-grid">${hexCards}</div>
    ${state.shareOpen ? shareModal(a) : ""}`;
  }

  function recipesView() {
    const recipes = loadRecipes();
    const cards = recipes.length
      ? recipes
          .map(
            (r) => `<div class="card" style="margin-bottom:10px">
          <b>${esc(r.name)}</b>
          <p class="muted" style="margin:6px 0 12px">${r.items.map((i) => getItem(i)?.name).filter(Boolean).join("、")}</p>
          <div class="share-row">
            <button class="btn btn-rose" type="button" data-open="${esc(r.id)}">開く</button>
            <button class="btn btn-ghost" type="button" data-delrec="${esc(r.id)}">削除</button>
          </div>
        </div>`
          )
          .join("")
      : `<p class="empty-note">まだレシピはないよ。</p>`;
    return `${header(`<button class="btn btn-rose" type="button" data-go="blend">新しくつくる</button>`)}
      <h2 class="section-title">保存したレシピ</h2>${cards}`;
  }

  function shareModal(a) {
    const text = shareText(a);
    const line = "https://line.me/R/msg/text/?" + encodeURIComponent(text);
    const mail =
      "mailto:?subject=" +
      encodeURIComponent("【アトリエ かわぐっち】" + (state.name.trim() || "スムージーレシピ")) +
      "&body=" +
      encodeURIComponent(text);
    const native = navigator.share
      ? `<button class="btn btn-ghost" type="button" data-native-share>ほかのアプリで送る</button>`
      : "";
    return `<div class="modal-bg" data-close-share>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="share-title" tabindex="-1">
        <h3 id="share-title">この一杯を贈る</h3>
        <p class="muted" style="margin-top:0">LINEかメールで、かわぐっちのレシピを渡せます。</p>
        <pre class="share-preview">${esc(text)}</pre>
        <div class="share-row">
          <a class="btn btn-line" href="${line}" target="_blank" rel="noopener noreferrer">LINEで送る</a>
          <a class="btn btn-mail" href="${mail}">メールで送る</a>
          <button class="btn btn-ghost" type="button" data-copy>テキストをコピー</button>
          ${native}
        </div>
        <div class="row-actions"><button class="btn btn-ghost" type="button" data-close-share>閉じる</button></div>
      </div>
    </div>`;
  }

  function footer() {
    return `<p class="muted" style="text-align:center;margin-top:40px;font-size:12px;line-height:1.8">栄養値は日本食品標準成分表などを参考にした目安です。<br>医療・栄養指導の代替ではありません。かわぐっちと、たのしく一杯を。</p>`;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    } finally {
      area.remove();
    }
  }

  function loadRecipe(id) {
    const rec = loadRecipes().find((r) => r.id === id);
    if (!rec) {
      toast("レシピが見つからないよ");
      return;
    }
    state.name = rec.name;
    state.selected = rec.items
      .map((x) => ({ ...x }))
      .filter((x) => x.custom || byId[x.id]);
    state.editingId = rec.id;
    go("result");
  }

  function sample() {
    state.name = "朝のいちごヨーグルト";
    state.selected = [
      { id: "strawberry", grams: 120 },
      { id: "banana", grams: 80 },
      { id: "yogurt", grams: 150 },
      { id: "honey", grams: 10 },
      { id: "chia", grams: 8 },
      { id: "spinach", grams: 30 },
      { id: "kiwi", grams: 50 },
      { id: "lemon", grams: 10 }
    ];
    state.editingId = null;
    go("result");
  }

  function render({ resetScroll = false } = {}) {
    if (state.view === "result" && !state.selected.length) state.view = "blend";
    const y = resetScroll ? 0 : window.scrollY;
    const views = { home: homeView, blend: blendView, result: resultView, recipes: recipesView };
    app.innerHTML = (views[state.view] || homeView)() + footer();
    syncHead();
    if (state.focusCustom) {
      const el = document.querySelector(`[data-custom-name="${state.focusCustom}"]`);
      el?.focus();
      state.focusCustom = null;
    } else {
      window.scrollTo(0, y);
    }
  }

  app.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go],[data-add],[data-del],[data-filter],[data-save],[data-share],[data-close-share],[data-copy],[data-open],[data-sample],[data-delrec],[data-add-custom],[data-native-share]");
    if (!t) return;
    if (t.dataset.go) {
      if (t.dataset.go === "result" && !state.selected.length) return toast("原料を選んでね");
      go(t.dataset.go);
    } else if (t.hasAttribute("data-add-custom")) addCustom();
    else if (t.dataset.add) addIngredient(t.dataset.add);
    else if (t.dataset.del) {
      state.selected = state.selected.filter((s) => s.id !== t.dataset.del);
      render({ resetScroll: false });
    } else if (t.dataset.filter) {
      state.filter = t.dataset.filter;
      render({ resetScroll: false });
    } else if (t.hasAttribute("data-save")) persistRecipe();
    else if (t.hasAttribute("data-share")) openShare();
    else if (t.hasAttribute("data-close-share")) {
      if (t.classList.contains("modal-bg") && e.target !== t) return;
      state.shareOpen = false;
      render({ resetScroll: false });
    } else if (t.hasAttribute("data-copy")) {
      copyText(shareText(analyze())).then(
        () => toast("コピーしたよ"),
        () => toast("コピーできなかったみたい")
      );
    } else if (t.hasAttribute("data-native-share")) {
      const text = shareText(analyze());
      navigator.share({ title: state.name.trim() || "アトリエ かわぐっち", text }).catch(() => {});
    } else if (t.dataset.open) loadRecipe(t.dataset.open);
    else if (t.hasAttribute("data-sample")) sample();
    else if (t.dataset.delrec) {
      if (!window.confirm("このレシピを削除する？")) return;
      saveRecipes(loadRecipes().filter((r) => r.id !== t.dataset.delrec));
      toast("削除したよ");
      render({ resetScroll: false });
    }
  });

  app.addEventListener("input", (e) => {
    if (e.target.id === "recipe-name") state.name = e.target.value;
    if (e.target.dataset.customName) {
      const row = state.selected.find((s) => s.id === e.target.dataset.customName);
      if (row) row.name = e.target.value;
    }
    const gid = e.target.dataset.g;
    if (gid) {
      const raw = e.target.value.trim();
      if (raw === "" || raw === ".") return;
      const v = Number(raw);
      const row = state.selected.find((s) => s.id === gid);
      if (row && Number.isFinite(v) && v >= 0) row.grams = Math.min(9999, v);
    }
  });

  app.addEventListener("blur", (e) => {
    const gid = e.target.dataset?.g;
    if (!gid) return;
    const row = state.selected.find((s) => s.id === gid);
    if (!row) return;
    const v = Number(e.target.value);
    row.grams = Number.isFinite(v) && v >= 0 ? Math.min(9999, v) : 1;
    e.target.value = row.grams;
  }, true);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.shareOpen) {
      state.shareOpen = false;
      render({ resetScroll: false });
    }
  });

  window.addEventListener("popstate", () => {
    state.view = viewFromHash();
    if (state.view === "result" && !state.selected.length) state.view = "blend";
    state.shareOpen = false;
    render({ resetScroll: true });
  });

  if (!location.hash) history.replaceState({ view: state.view }, "", hashFor(state.view));
  syncHead();
  render({ resetScroll: true });
})();
