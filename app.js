(() => {
  if (!window.ATELIER) {
    document.getElementById("app").innerHTML = "<p class=\"empty-note\">データを読み込めませんでした。ページを再読み込みしてください。</p>";
    return;
  }

  const { RDA, GROUPS, CATEGORIES, INGREDIENTS, OTHER_FOODS = [], NUTRIENT_FIELDS = [], MAX_ITEMS = 10, MAX_SAVED = 100 } = window.ATELIER;
  const STORE = "atelier-gucchi-recipes";
  const PROFILE_STORE = "atelier-gucchi-profile";
  const VIEWS = ["home", "blend", "result", "recipes", "profile"];
  const TITLES = {
    home: "アトリエ かわぐっち | スムージー栄養計算・五大栄養素チャート",
    blend: "原料を選ぶ | アトリエ かわぐっち",
    result: "栄養チャート | アトリエ かわぐっち",
    recipes: "保存したスムージー | アトリエ かわぐっち",
    profile: "マイプロフィール | アトリエ かわぐっち"
  };
  const MEDAL_META = {
    gold: { label: "金賞", emoji: "🥇" },
    silver: { label: "銀賞", emoji: "🥈" },
    bronze: { label: "銅賞", emoji: "🥉" }
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
  const otherById = Object.fromEntries((OTHER_FOODS || []).map((x) => [x.id, x]));

  const state = {
    view: viewFromHash(),
    filter: "all",
    name: "",
    selected: [],
    shareOpen: false,
    editingId: null,
    medal: null,
    awardRolled: false,
    customOpen: false,
    customDraft: emptyDraft()
  };

  function emptyDraft() {
    return {
      name: "",
      aliases: "",
      grams: 50,
      source: "",
      note: "",
      extraFields: [{ label: "", value: "" }],
      extraOthers: [{ name: "", grams: 40 }],
      n: { ...EMPTY_N },
      evidenceId: "",
      evidenceLabel: "",
      saveToProfile: true,
      nTouched: false
    };
  }

  function loadProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROFILE_STORE) || "{}");
      const customIngredients = Array.isArray(raw.customIngredients) ? raw.customIngredients : [];
      const pruned = customIngredients.filter((x) => !officialByName(x && x.name));
      const p = {
        name: typeof raw.name === "string" ? raw.name : "",
        favorite: typeof raw.favorite === "string" ? raw.favorite : "",
        customIngredients: pruned
      };
      if (pruned.length !== customIngredients.length) {
        try {
          localStorage.setItem(PROFILE_STORE, JSON.stringify(p));
        } catch {
          /* keep in-memory prune even if write fails */
        }
      }
      return p;
    } catch {
      return { name: "", favorite: "", customIngredients: [] };
    }
  }

  function saveProfile(p) {
    try {
      localStorage.setItem(PROFILE_STORE, JSON.stringify(p));
      return true;
    } catch {
      toast("プロフィールを保存できなかったみたい");
      return false;
    }
  }

  function personalById() {
    return Object.fromEntries(loadProfile().customIngredients.map((x) => [x.id, x]));
  }

  function catalogItem(id) {
    return byId[id] || otherById[id] || personalById()[id] || null;
  }

  function foodNames(item) {
    if (!item) return [];
    return [item.name, ...(item.aliases || [])]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase().replace(/\s+/g, ""));
  }

  function officialCatalog() {
    return [...INGREDIENTS, ...(OTHER_FOODS || [])];
  }

  function officialByName(name) {
    const q = (name || "").trim().toLowerCase().replace(/\s+/g, "");
    if (!q) return null;
    return officialCatalog().find((i) => foodNames(i).some((n) => n === q)) || null;
  }

  function findEvidence(name) {
    const q = (name || "").trim().toLowerCase().replace(/\s+/g, "");
    if (!q) return null;
    const pool = officialCatalog();
    const exact = pool.find((i) => foodNames(i).some((n) => n === q));
    if (exact) return exact;
    if (q.length < 2) return null;
    let best = null;
    let bestLen = Infinity;
    for (const i of pool) {
      for (const n of foodNames(i)) {
        if (n.startsWith(q) && n.length < bestLen) {
          best = i;
          bestLen = n.length;
        }
      }
    }
    return best;
  }

  function catalogCatForName(name) {
    const hit = officialByName(name);
    return (hit && hit.cat) || "other";
  }

  function itemCat(item) {
    if (item && ["fruit", "veg", "base", "plus"].includes(item.cat)) return item.cat;
    return catalogCatForName(item && item.name);
  }

  function estimateAmino(n) {
    const protein = Number(n.protein) || 0;
    if (protein <= 0) return n;
    const fill = (key, perG) => {
      if (!(Number(n[key]) > 0)) n[key] = Math.round(protein * perG);
    };
    fill("leu", 80);
    fill("lys", 60);
    fill("val", 50);
    fill("ile", 45);
    fill("gln", 120);
    fill("arg", 55);
    return n;
  }

  function viewFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "").replace(/\/+$/, "").split("?")[0] || "home";
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
    if (info) {
      const show = state.view === "home";
      info.hidden = !show;
      info.setAttribute("aria-hidden", show ? "false" : "true");
    }
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
    if (view === "result") maybeAward();
    state.view = view;
    state.shareOpen = false;
    const h = hashFor(view);
    if (location.hash !== h) {
      if (replace) history.replaceState({ view }, "", h);
      else history.pushState({ view }, "", h);
    }
    render({ resetScroll });
  }

  function rollAward() {
    if (Math.random() >= 0.01) return null;
    const r = Math.random() * 12;
    if (r < 1) return "gold";
    if (r < 4) return "silver";
    return "bronze";
  }

  function maybeAward() {
    if (state.awardRolled) return;
    state.awardRolled = true;
    if (!state.medal) state.medal = rollAward();
  }

  function getItem(row) {
    if (!row) return null;
    if (row.custom) {
      return {
        id: row.id,
        name: (row.name || "").trim() || "その他",
        custom: true,
        tone: row.tone || "#eadfd4",
        source: row.source || "",
        n: { ...EMPTY_N, ...(row.n || {}) }
      };
    }
    const item = catalogItem(row.id);
    if (!item) {
      return {
        id: row.id,
        name: (row.name || "").trim() || "不明な原料",
        grams: row.grams,
        n: { ...EMPTY_N, ...(row.n || {}) }
      };
    }
    return { ...item, n: { ...EMPTY_N, ...item.n, ...(row.n || {}) } };
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
    return vals.reduce((a, b) => a + b, 0) / keys.length;
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
    const grams = state.selected.reduce((a, s) => a + (Number(s.grams) || 0), 0);
    const kcal100 = grams > 0 ? ((t.kcal || 0) / grams) * 100 : 0;
    return { total: t, pentagon, hex, grams, kcal100 };
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
    const medal = state.medal && MEDAL_META[state.medal]
      ? `\nかわぐっちセレクション${MEDAL_META[state.medal].label}`
      : "";
    return `【アトリエ かわぐっち】${name}
原料：${items}
エネルギー：${fmt(a.total.kcal || 0, 0)} kcal（100mlあたり ${fmt(a.kcal100, 1)} kcal）
五大栄養素（1日の目安に対する割合）
${p}${medal}
かわぐっちとつくった、わたしの一杯。`;
  }

  function persistRecipe() {
    const name = state.name.trim();
    if (!name) {
      toast("一杯の名前をつけてね");
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
      medal: state.medal || null,
      savedAt: Date.now()
    };
    const idx = list.findIndex((x) => x.id === rec.id);
    if (idx >= 0) {
      rec.medal = list[idx].medal || rec.medal;
      list[idx] = rec;
    } else {
      if (list.length >= MAX_SAVED) {
        toast(`保存は${MAX_SAVED}杯までだよ。リストから削除してね`);
        return false;
      }
      list.unshift(rec);
    }
    if (!saveRecipes(list)) return false;
    state.editingId = rec.id;
    state.medal = rec.medal;
    toast("アトリエに保存したよ");
    render({ resetScroll: false });
    return true;
  }

  function openShare() {
    if (!state.selected.length) return toast("先に原料を入れてね");
    state.shareOpen = true;
    render({ resetScroll: false });
    document.querySelector(".modal")?.focus();
  }

  function roomLeft(n = 1) {
    return state.selected.length + n <= MAX_ITEMS;
  }

  function addIngredient(id) {
    if (state.selected.some((s) => s.id === id)) {
      state.selected = state.selected.filter((s) => s.id !== id);
      toast("はずしたよ");
      return render({ resetScroll: false });
    }
    if (!roomLeft()) {
      toast("原料は10種類まで");
      return;
    }
    const ing = catalogItem(id);
    if (!ing) return;
    const row = { id, grams: Number(ing.defaultG) > 0 ? Number(ing.defaultG) : 40 };
    if (ing.custom) {
      row.custom = true;
      row.name = ing.name;
      row.n = { ...EMPTY_N, ...(ing.n || {}) };
      row.source = ing.source || "";
    }
    state.selected.push(row);
    toast(`${ing.name}を入れたよ`);
    render({ resetScroll: false });
  }

  function isEmptyN(n) {
    return Object.values(n || {}).every((v) => !Number(v));
  }

  function readCustomDraftFromDom() {
    if (!state.customOpen) return;
    const d = state.customDraft;
    const name = document.getElementById("custom-name-main");
    if (name) d.name = name.value;
    const aliases = document.getElementById("custom-aliases");
    if (aliases) d.aliases = aliases.value;
    const source = document.getElementById("custom-source");
    if (source) d.source = source.value;
    const note = document.getElementById("custom-note");
    if (note) d.note = note.value;
    const save = document.getElementById("custom-save-profile");
    if (save) d.saveToProfile = !!save.checked;
    const grams = document.querySelector('[data-g="draft-grams"]');
    if (grams) {
      const v = Number(grams.value);
      if (Number.isFinite(v) && v >= 0) d.grams = Math.min(9999, v);
    }
    if (d.nTouched) {
      document.querySelectorAll("[data-nut]").forEach((input) => {
        const key = input.dataset.nut;
        if (!key) return;
        const v = Number(input.value);
        if (Number.isFinite(v) && v >= 0) d.n[key] = v;
      });
    }
    document.querySelectorAll("[data-extra-label]").forEach((el) => {
      const i = Number(el.dataset.extraLabel);
      if (d.extraFields[i]) d.extraFields[i].label = el.value;
    });
    document.querySelectorAll("[data-extra-value]").forEach((el) => {
      const i = Number(el.dataset.extraValue);
      if (d.extraFields[i]) d.extraFields[i].value = el.value;
    });
    document.querySelectorAll("[data-extra-other-name]").forEach((el) => {
      const i = Number(el.dataset.extraOtherName);
      if (d.extraOthers[i]) d.extraOthers[i].name = el.value;
    });
    document.querySelectorAll("[data-extra-other-g]").forEach((el) => {
      const i = Number(el.dataset.extraOtherG);
      const v = Number(el.value);
      if (d.extraOthers[i] && Number.isFinite(v) && v >= 0) d.extraOthers[i].grams = Math.min(9999, v);
    });
  }

  function applyEvidenceToDraft(name) {
    const hit = findEvidence(name);
    const d = state.customDraft;
    if (!hit) {
      d.evidenceId = "";
      d.evidenceLabel = "";
      if (!d.nTouched) d.n = { ...EMPTY_N };
      return;
    }
    d.evidenceId = hit.id;
    d.evidenceLabel = `${hit.name}（${hit.source || "成分表データ"}）`;
    if (d.nTouched) return;
    d.n = { ...EMPTY_N, ...hit.n };
    if (!d.source) d.source = hit.source || "";
    if (!d.aliases && hit.aliases) d.aliases = hit.aliases.join("、");
  }

  function paintEvidence() {
    const d = state.customDraft;
    const slot = document.getElementById("evidence-slot");
    if (slot) {
      if (d.evidenceLabel) {
        slot.className = "evidence-hit";
        slot.textContent = "成分表ヒット：" + d.evidenceLabel;
      } else {
        slot.className = "muted evidence-slot";
        slot.textContent = "名前を入れると、日本食品標準成分表／USDAのデータから栄養を自動で入れます。";
      }
    }
    document.querySelectorAll("[data-nut]").forEach((input) => {
      const key = input.dataset.nut;
      if (key && !d.nTouched) input.value = d.n[key] ?? 0;
    });
    const src = document.getElementById("custom-source");
    if (src && d.source && !src.value) src.value = d.source;
    const aliases = document.getElementById("custom-aliases");
    if (aliases && d.aliases && !aliases.value) aliases.value = d.aliases;
  }

  function makeCustomRow(name, grams, n, extra) {
    return {
      id: "custom-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      custom: true,
      name: name.trim(),
      grams: Number(grams) || 50,
      n: estimateAmino({ ...EMPTY_N, ...(n || {}) }),
      source: extra.source || "",
      aliases: extra.aliases || [],
      note: extra.note || "",
      extraFields: extra.extraFields || [],
      tone: "#eadfd4",
      cat: extra.cat || catalogCatForName(name.trim()),
      defaultG: Number(grams) || 50
    };
  }

  function savePersonalIngredient(row) {
    const p = loadProfile();
    const i = p.customIngredients.findIndex((x) => x.id === row.id || (x.name === row.name && x.custom));
    const stored = {
      id: row.id,
      name: row.name,
      custom: true,
      cat: row.cat || catalogCatForName(row.name),
      tone: row.tone || "#eadfd4",
      defaultG: row.grams || row.defaultG || 50,
      source: row.source || "ユーザー登録（成分表照合）",
      aliases: row.aliases || [],
      note: row.note || "",
      extraFields: row.extraFields || [],
      n: row.n
    };
    if (i >= 0) p.customIngredients[i] = stored;
    else p.customIngredients.push(stored);
    return saveProfile(p);
  }

  function pushOfficial(id, grams) {
    if (state.selected.some((s) => s.id === id)) return "exists";
    if (!roomLeft()) return "full";
    const ing = catalogItem(id);
    if (!ing) return "missing";
    const row = { id, grams: Number(grams) > 0 ? Number(grams) : (Number(ing.defaultG) > 0 ? Number(ing.defaultG) : 40) };
    if (ing.custom) {
      row.custom = true;
      row.name = ing.name;
      row.n = { ...EMPTY_N, ...(ing.n || {}) };
      row.source = ing.source || "";
    }
    state.selected.push(row);
    return "ok";
  }

  function commitCustom() {
    readCustomDraftFromDom();
    const d = state.customDraft;
    const mainName = (d.name || "").trim();
    if (!mainName) {
      toast("原料名を入れてね");
      return;
    }
    if (!d.nTouched || isEmptyN(d.n)) applyEvidenceToDraft(mainName);
    const extras = (d.extraOthers || []).filter((x) => (x.name || "").trim());
    const extraFields = (d.extraFields || []).filter((x) => (x.label || "").trim());
    const aliases = (d.aliases || "").split(/[、,]/).map((s) => s.trim()).filter(Boolean);
    const jobs = [
      { name: mainName, grams: d.grams, n: d.n, nTouched: d.nTouched, extraFields, aliases, note: d.note, source: d.source, evidenceId: d.evidenceId }
    ].concat(extras.map((ex) => ({ name: ex.name.trim(), grams: ex.grams, nTouched: false })));
    const newcomers = jobs.filter((job) => {
      const off = officialByName(job.name);
      if (off && !job.nTouched) return !state.selected.some((s) => s.id === off.id);
      return true;
    }).length;
    if (!roomLeft(newcomers)) {
      toast("原料は10種類まで");
      return;
    }
    let saved = false;
    jobs.forEach((job) => {
      const off = officialByName(job.name);
      if (off && !job.nTouched) {
        pushOfficial(off.id, job.grams);
        return;
      }
      const n = job.n || (off ? { ...EMPTY_N, ...off.n } : { ...EMPTY_N });
      const row = makeCustomRow(job.name, job.grams, n, {
        source: job.source || off?.source || "",
        aliases: job.aliases || off?.aliases || [],
        note: job.note || "",
        extraFields: job.extraFields || [],
        cat: job.nTouched ? "other" : (off?.cat || catalogCatForName(job.name))
      });
      if (job.evidenceId) row.evidenceId = job.evidenceId;
      state.selected.push({
        id: row.id,
        custom: true,
        name: row.name,
        grams: row.grams,
        n: row.n,
        source: row.source,
        extraFields: row.extraFields
      });
      if (d.saveToProfile) {
        savePersonalIngredient(row);
        saved = true;
      }
    });
    state.customOpen = false;
    state.customDraft = emptyDraft();
    toast(saved ? "マイ原料に入れて、カップにも入れたよ" : "カップに入れたよ");
    render({ resetScroll: false });
  }

  function openCustomForm() {
    if (!roomLeft()) {
      toast("原料は10種類まで");
      return;
    }
    state.filter = "other";
    if (state.customOpen) {
      document.getElementById("custom-name-main")?.focus();
      return;
    }
    state.customOpen = true;
    state.customDraft = emptyDraft();
    render({ resetScroll: false });
  }

  function gramsField(id, grams) {
    return `<label class="grams-wrap"><input class="grams" type="number" inputmode="decimal" min="0" max="9999" step="any" value="${grams}" data-g="${id}" aria-label="数量グラム"><span>g</span></label>`;
  }

  function medalBadge(medal, { compact = false } = {}) {
    const m = MEDAL_META[medal];
    if (!m) return "";
    return `<span class="medal medal-${medal}" title="かわぐっちセレクション${m.label}">${m.emoji}${compact ? "" : " " + m.label}</span>`;
  }

  function header(extra = "") {
    const p = loadProfile();
    const who = p.name ? `<span class="who">${esc(p.name)}さん</span>` : "";
    return `<header class="topbar">
      <button class="brand" type="button" data-go="home">
        <img src="img/kawagucchi-icon.png" width="52" height="52" alt="かわぐっち">
        <span><small>Smoothie Atelier</small><b>アトリエ かわぐっち</b></span>
      </button>
      <nav class="nav-actions" aria-label="ページ">${who}${extra}</nav>
    </header>`;
  }

  function homeView() {
    const recipes = loadRecipes();
    const profile = loadProfile();
    const cards = recipes.length
      ? recipes
          .slice(0, 6)
          .map(
            (r) => `<button class="recipe-card" type="button" data-open="${esc(r.id)}">
          <span class="recipe-card-top">${medalBadge(r.medal, { compact: true })}</span>
          <b>${esc(r.name)}</b>
          <span>${r.items.length}種 ・ ${r.items.map((i) => getItem(i)?.name).filter(Boolean).slice(0, 3).join("、")}</span>
        </button>`
          )
          .join("")
      : `<p class="empty-note">まだ保存されたスムージーはないよ。かわぐっちと、最初の一杯をつくってみよう。</p>`;
    const greeting = profile.name
      ? `${esc(profile.name)}さん、今日は何をつくる？`
      : "10の恵みを重ねて、<br>わたしの栄養を見る。";
    const fav = profile.favorite
      ? `<p class="lead">好きなスムージーは「${esc(profile.favorite)}」。かわぐっちと、また一杯重ねよう。</p>`
      : `<p class="lead">フルーツや野菜、ミルク、こんにゃく、その他の原料を選ぶと、五大栄養素の五角形チャートと、それぞれの代表6栄養素の六角形チャートが立ち上がります。保存は100杯まで。LINE、メール、Instagram、X、Facebookで渡せます。</p>`;
    return `${header(`<button class="btn btn-ghost" type="button" data-go="profile">プロフィール</button>
      <button class="btn btn-ghost" type="button" data-go="recipes">保存したスムージー</button>`)}
    <section class="hero">
      <div>
        <p class="kicker">for a graceful glass</p>
        <h2 class="hero-title">${greeting}</h2>
        ${fav}
        <div class="row-actions">
          <button class="btn btn-rose" type="button" data-go="blend">一杯つくる</button>
          <button class="btn btn-ghost" type="button" data-go="recipes">リストを見る</button>
        </div>
      </div>
      <div class="hero-art">
        <img class="mascot" src="img/kawagucchi-smoothie.png" width="340" height="340" alt="スムージーを持つかわぐっち">
      </div>
    </section>
    <h2 class="section-title">保存したスムージー <small class="muted">${recipes.length} / ${MAX_SAVED}</small></h2>
    <div class="recipe-grid">${cards}</div>`;
  }

  function catalogForFilter() {
    const taken = new Set(officialCatalog().flatMap((i) => foodNames(i)));
    const personal = (loadProfile().customIngredients || [])
      .filter((x) => !foodNames(x).some((n) => taken.has(n)))
      .map((x) => ({ ...x, cat: itemCat(x) }));
    const others = OTHER_FOODS || [];
    if (state.filter === "all") return [...INGREDIENTS, ...others, ...personal];
    if (state.filter === "other") return [...others, ...personal.filter((x) => x.cat === "other")];
    return [
      ...INGREDIENTS.filter((i) => i.cat === state.filter),
      ...personal.filter((x) => x.cat === state.filter)
    ];
  }

  function customFormHtml() {
    if (!state.customOpen) return "";
    const d = state.customDraft;
    const fields = (NUTRIENT_FIELDS || []).map((f) =>
      `<label class="nut-field">${esc(f.label)} <small>${esc(f.unit)}/100g</small>
        <input type="number" inputmode="decimal" min="0" step="any" value="${d.n[f.key] ?? 0}" data-nut="${f.key}" aria-label="${esc(f.label)} ${esc(f.unit)}/100g">
      </label>`
    ).join("");
    const extraFields = (d.extraFields || []).map((x, i) =>
      `<div class="extra-row">
        <input placeholder="項目名（産地・品種など）" value="${esc(x.label || "")}" data-extra-label="${i}">
        <input placeholder="内容" value="${esc(x.value || "")}" data-extra-value="${i}">
      </div>`
    ).join("");
    const extraOthers = (d.extraOthers || []).map((x, i) =>
      `<div class="extra-row">
        <input placeholder="追加のその他原料名" value="${esc(x.name || "")}" data-extra-other-name="${i}">
        <label class="grams-wrap"><input class="grams" type="number" min="0" step="any" value="${x.grams || 40}" data-extra-other-g="${i}" aria-label="追加原料のグラム"><span>g</span></label>
      </div>`
    ).join("");
    const ev = d.evidenceLabel
      ? `<p id="evidence-slot" class="evidence-hit">成分表ヒット：${esc(d.evidenceLabel)}</p>`
      : `<p id="evidence-slot" class="muted evidence-slot">名前を入れると、日本食品標準成分表／USDAのデータから栄養を自動で入れます。</p>`;
    return `<div class="custom-form card">
      <h3>その他の原料を登録</h3>
      <p class="muted" style="margin-top:0;font-size:13px">個人プロフィールに保存して、次からも選べます。栄養は100gあたり。成分表にある名前なら自動で正確な値を入れます。</p>
      ${ev}
      <label class="muted" style="display:block;font-size:12px">原料名</label>
      <input class="name-input" id="custom-name-main" placeholder="例）バジル、シナモン、黒糖" value="${esc(d.name)}">
      <label class="muted" style="display:block;margin-top:10px;font-size:12px">別名</label>
      <input class="name-input" id="custom-aliases" placeholder="別名を読点で" value="${esc(d.aliases)}">
      <label class="muted" style="display:block;margin-top:10px;font-size:12px">出典</label>
      <input class="name-input" id="custom-source" placeholder="日本食品標準成分表2020（八訂）など" value="${esc(d.source)}">
      <label class="muted" style="display:block;margin-top:10px;font-size:12px">メモ</label>
      <input class="name-input" id="custom-note" placeholder="好みのメモ" value="${esc(d.note)}">
      <label class="muted" style="display:block;margin-top:10px;font-size:12px">この一杯への量</label>
      ${gramsField("draft-grams", d.grams)}
      <p class="muted" style="font-size:12px;margin:14px 0 6px">100gあたりの栄養（成分表にない場合は手入力）</p>
      <div class="nut-grid">${fields}</div>
      <p class="muted" style="font-size:12px;margin:14px 0 6px">追加のその他項目</p>
      ${extraFields}
      <button class="btn btn-ghost" type="button" data-add-extra-field>項目を足す</button>
      <p class="muted" style="font-size:12px;margin:14px 0 6px">追加でその他の原料を入れる</p>
      ${extraOthers}
      <button class="btn btn-ghost" type="button" data-add-extra-other>その他の原料を足す</button>
      <label class="check-row"><input type="checkbox" id="custom-save-profile" name="saveToProfile" ${d.saveToProfile ? "checked" : ""}> プロフィールのマイ原料に保存する</label>
      <div class="row-actions">
        <button class="btn btn-rose" type="button" data-commit-custom>カップに入れる</button>
        <button class="btn btn-ghost" type="button" data-cancel-custom>やめる</button>
      </div>
    </div>`;
  }

  function blendView() {
    const list = catalogForFilter();
    const chips = `<button class="chip ${state.filter === "all" ? "on" : ""}" type="button" data-filter="all" aria-pressed="${state.filter === "all"}">すべて</button>` +
      CATEGORIES.map(
        (c) =>
          `<button class="chip ${state.filter === c.id ? "on" : ""}" type="button" data-filter="${c.id}" aria-pressed="${state.filter === c.id}">${esc(c.label)}</button>`
      ).join("");
    const cards = list
      .map((i) => {
        const on = state.selected.find((s) => s.id === i.id);
        const mine = i.custom ? `<em class="mine">マイ</em>` : "";
        return `<div class="ing-card ${on ? "selected" : ""}">
          <button type="button" class="pick" data-add="${esc(i.id)}">
            <span class="ing-dot" style="background:${i.tone || "#eadfd4"}"></span>
            ${mine}
            <b>${esc(i.name)}</b>
          </button>
          ${on ? `<span>${on.grams}g</span>` : `<span>${i.defaultG || 50}g〜</span>`}
        </div>`;
      })
      .join("") +
      `<button type="button" class="ing-card free-card" data-add-custom>
          <span class="ing-dot" style="background:#eadfd4"></span>
          <b>その他を追加</b>
          <span>成分表照合・プロフィール保存</span>
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
      : `<p class="empty-note">左から原料をタップして、10種類まで重ねてね。数量はグラムで数字入力できるよ。リストにないものは「その他」から、成分表の値で登録できるよ。</p>`;
    return `${header(`<button class="btn btn-ghost" type="button" data-go="home">ホーム</button>
      <button class="btn btn-ghost" type="button" data-go="profile">プロフィール</button>`)}
    <div class="workspace">
      <div class="card">
        <p class="kicker">choose up to 10</p>
        <h2 style="font-family:var(--serif);margin:0 0 12px;">原料を選ぶ</h2>
        <div class="filters">${chips}</div>
        ${customFormHtml()}
        <div class="ing-grid">${cards}</div>
      </div>
      <aside class="card tray">
        <img class="mascot" src="img/kawagucchi-blend.png" width="140" height="140" alt="" style="width:140px;display:block;margin:0 auto 8px">
        <h2>今日の一杯</h2>
        <div class="count">${state.selected.length} / ${MAX_ITEMS} 種類</div>
        <label class="muted" style="display:block;margin:12px 0 6px;font-size:12px" for="recipe-name">スムージー名</label>
        <input class="name-input" id="recipe-name" placeholder="例）朝のグリーンスムージー" value="${esc(state.name)}">
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
    const award = state.medal && MEDAL_META[state.medal]
      ? `<div class="award-banner award-${state.medal}">${MEDAL_META[state.medal].emoji} かわぐっちセレクション${MEDAL_META[state.medal].label}</div>`
      : "";
    return `${header(`<button class="btn btn-ghost" type="button" data-go="blend">原料を直す</button>`)}
    ${award}
    <section class="result-head">
      <img class="mascot" src="img/kawagucchi-welcome.png" width="132" height="132" alt="かわぐっち">
      <div>
        <p class="kicker">your glass</p>
        <h2 style="font-family:var(--serif);margin:0">${esc(state.name.trim() || "名前のないスムージー")} ${medalBadge(state.medal)}</h2>
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
      <p class="kcal100">100mlあたり ${fmt(a.kcal100, 1)} kcal <small>（1g ≒ 1ml）</small></p>
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
            (r) => `<div class="card recipe-list-card">
          <div class="recipe-list-head">
            <b>${esc(r.name)}</b>
            ${medalBadge(r.medal)}
          </div>
          <p class="muted" style="margin:6px 0 12px">${r.items.map((i) => getItem(i)?.name).filter(Boolean).join("、") || "原料なし"}</p>
          <div class="share-row">
            <button class="btn btn-rose" type="button" data-open="${esc(r.id)}">開く</button>
            <button class="btn btn-ghost" type="button" data-delrec="${esc(r.id)}">削除</button>
          </div>
        </div>`
          )
          .join("")
      : `<p class="empty-note">まだ保存したスムージーはないよ。</p>`;
    return `${header(`<button class="btn btn-rose" type="button" data-go="blend" data-reset-blend>新しくつくる</button>
      <button class="btn btn-ghost" type="button" data-go="profile">プロフィール</button>`)}
      <h2 class="section-title">保存したスムージー <small class="muted">${recipes.length} / ${MAX_SAVED}杯</small></h2>
      ${cards}`;
  }

  function profileView() {
    const p = loadProfile();
    const mine = p.customIngredients.length
      ? p.customIngredients.map((i) =>
          `<div class="picked-row">
            <div>${esc(i.name)} <small class="muted">${i.source ? esc(i.source) : "マイ原料"}</small></div>
            <button class="x" type="button" data-del-ing="${esc(i.id)}" aria-label="マイ原料を削除">×</button>
          </div>`
        ).join("")
      : `<p class="empty-note">その他から登録したマイ原料が、ここに並ぶよ。</p>`;
    return `${header(`<button class="btn btn-ghost" type="button" data-go="home">ホーム</button>`)}
      <section class="card profile-card">
        <p class="kicker">my atelier</p>
        <h2 style="font-family:var(--serif);margin:0 0 12px;">ユーザープロファイル</h2>
        <p class="muted" style="margin-top:0">このブラウザにだけ保存されます。</p>
        <label class="muted" style="display:block;font-size:12px" for="profile-name">名前</label>
        <input class="name-input" id="profile-name" placeholder="お名前" value="${esc(p.name)}">
        <label class="muted" style="display:block;margin-top:12px;font-size:12px" for="profile-fav">好きなスムージー</label>
        <input class="name-input" id="profile-fav" placeholder="例）いちごバナナ" value="${esc(p.favorite)}">
        <div class="row-actions">
          <button class="btn btn-rose" type="button" data-save-profile>プロフィールを保存</button>
        </div>
        <h3 class="section-title" style="margin-top:28px">マイ原料（その他）</h3>
        ${mine}
      </section>`;
  }

  function shareModal(a) {
    const text = shareText(a);
    const line = "https://line.me/R/msg/text/?" + encodeURIComponent(text);
    const mail =
      "mailto:?subject=" +
      encodeURIComponent("【アトリエ かわぐっち】" + (state.name.trim() || "スムージーレシピ")) +
      "&body=" +
      encodeURIComponent(text);
    const tweet = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
    const page = encodeURIComponent(absUrl("./"));
    const fb = "https://www.facebook.com/sharer/sharer.php?u=" + page + "&quote=" + encodeURIComponent(text);
    const native = navigator.share
      ? `<button class="btn btn-ghost" type="button" data-native-share>ほかのアプリで送る</button>`
      : "";
    return `<div class="modal-bg" data-close-share>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="share-title" tabindex="-1">
        <h3 id="share-title">この一杯を贈る</h3>
        <p class="muted" style="margin-top:0">LINE、メール、Instagram、X、Facebookで、かわぐっちのレシピを渡せます。</p>
        <pre class="share-preview">${esc(text)}</pre>
        <div class="share-row">
          <a class="btn btn-line" href="${line}" target="_blank" rel="noopener noreferrer">LINE</a>
          <a class="btn btn-mail" href="${mail}">メール</a>
          <button class="btn btn-ig" type="button" data-ig-share>Instagram</button>
          <a class="btn btn-x" href="${tweet}" target="_blank" rel="noopener noreferrer">X</a>
          <a class="btn btn-fb" href="${fb}" target="_blank" rel="noopener noreferrer">Facebook</a>
          <button class="btn btn-ghost" type="button" data-copy>テキストをコピー</button>
          ${native}
        </div>
        <div class="row-actions"><button class="btn btn-ghost" type="button" data-close-share>閉じる</button></div>
      </div>
    </div>`;
  }

  function footer() {
    return `<p class="muted" style="text-align:center;margin-top:40px;font-size:12px;line-height:1.8">栄養値は日本食品標準成分表2020年版（八訂）および USDA FoodData Central を参考にした目安です。<br>医療・栄養指導の代替ではありません。かわぐっちと、たのしく一杯を。</p>`;
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
      .filter((x) => x.custom || catalogItem(x.id));
    state.editingId = rec.id;
    state.medal = rec.medal || null;
    state.awardRolled = true;
    go("result");
  }

  function captureFocus() {
    const ae = document.activeElement;
    if (!ae || !app.contains(ae)) return null;
    return {
      id: ae.id || "",
      nut: ae.dataset?.nut || "",
      g: ae.dataset?.g || "",
      extraLabel: ae.dataset?.extraLabel,
      extraValue: ae.dataset?.extraValue,
      extraOtherName: ae.dataset?.extraOtherName,
      extraOtherG: ae.dataset?.extraOtherG,
      customName: ae.dataset?.customName || "",
      start: ae.selectionStart,
      end: ae.selectionEnd
    };
  }

  function restoreFocus(snap) {
    if (!snap) return;
    let el = snap.id ? document.getElementById(snap.id) : null;
    const q = (attr, val) => {
      const safe = String(val).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return document.querySelector(`[${attr}="${safe}"]`);
    };
    if (!el && snap.nut) el = q("data-nut", snap.nut);
    if (!el && snap.g) el = q("data-g", snap.g);
    if (!el && snap.extraLabel != null && snap.extraLabel !== "") el = q("data-extra-label", snap.extraLabel);
    if (!el && snap.extraValue != null && snap.extraValue !== "") el = q("data-extra-value", snap.extraValue);
    if (!el && snap.extraOtherName != null && snap.extraOtherName !== "") el = q("data-extra-other-name", snap.extraOtherName);
    if (!el && snap.extraOtherG != null && snap.extraOtherG !== "") el = q("data-extra-other-g", snap.extraOtherG);
    if (!el && snap.customName) el = q("data-custom-name", snap.customName);
    if (!el || typeof el.focus !== "function") return;
    el.focus();
    if (typeof snap.start === "number" && typeof el.setSelectionRange === "function") {
      try { el.setSelectionRange(snap.start, snap.end ?? snap.start); } catch { /* not a text field */ }
    }
  }

  function render({ resetScroll = false } = {}) {
    if (state.customOpen) readCustomDraftFromDom();
    if (state.view === "result" && !state.selected.length) {
      state.view = "blend";
      const h = hashFor("blend");
      if (location.hash !== h) history.replaceState({ view: "blend" }, "", h);
    }
    const y = resetScroll ? 0 : window.scrollY;
    const focus = captureFocus();
    const views = { home: homeView, blend: blendView, result: resultView, recipes: recipesView, profile: profileView };
    app.innerHTML = (views[state.view] || homeView)() + footer();
    syncHead();
    if (resetScroll) window.scrollTo(0, 0);
    else window.scrollTo(0, y);
    restoreFocus(focus);
  }

  function shareInstagram() {
    const text = shareText(analyze());
    copyText(text).then(
      () => {
        toast("コピーしたよ。Instagramに貼ってね");
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      },
      () => toast("コピーできなかったみたい")
    );
  }

  app.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go],[data-add],[data-del],[data-filter],[data-save],[data-share],[data-close-share],[data-copy],[data-open],[data-delrec],[data-add-custom],[data-native-share],[data-commit-custom],[data-cancel-custom],[data-add-extra-field],[data-add-extra-other],[data-save-profile],[data-del-ing],[data-ig-share]");
    if (!t) return;
    if (t.dataset.go) {
      if (t.dataset.go === "result" && !state.selected.length) return toast("原料を選んでね");
      if (t.hasAttribute("data-reset-blend")) {
        state.selected = [];
        state.name = "";
        state.editingId = null;
        state.medal = null;
        state.awardRolled = false;
      }
      go(t.dataset.go);
    } else if (t.hasAttribute("data-add-custom")) openCustomForm();
    else if (t.dataset.add) addIngredient(t.dataset.add);
    else if (t.dataset.del) {
      state.selected = state.selected.filter((s) => s.id !== t.dataset.del);
      toast("はずしたよ");
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
        () => { toast("コピーしたよ"); },
        () => toast("コピーできなかったみたい")
      );
    } else if (t.hasAttribute("data-native-share")) {
      const text = shareText(analyze());
      navigator.share({ title: state.name.trim() || "アトリエ かわぐっち", text }).catch(() => {});
    } else if (t.dataset.open) loadRecipe(t.dataset.open);
    else if (t.dataset.delrec) {
      if (!window.confirm("このスムージーを削除する？")) return;
      saveRecipes(loadRecipes().filter((r) => r.id !== t.dataset.delrec));
      if (state.editingId === t.dataset.delrec) state.editingId = null;
      toast("削除したよ");
      render({ resetScroll: false });
    } else if (t.hasAttribute("data-commit-custom")) commitCustom();
    else if (t.hasAttribute("data-cancel-custom")) {
      state.customOpen = false;
      state.customDraft = emptyDraft();
      render({ resetScroll: false });
    } else if (t.hasAttribute("data-add-extra-field")) {
      state.customDraft.extraFields.push({ label: "", value: "" });
      render({ resetScroll: false });
    } else if (t.hasAttribute("data-add-extra-other")) {
      state.customDraft.extraOthers.push({ name: "", grams: 40 });
      render({ resetScroll: false });
    } else if (t.hasAttribute("data-save-profile")) {
      const p = loadProfile();
      p.name = (document.getElementById("profile-name")?.value || "").trim();
      p.favorite = (document.getElementById("profile-fav")?.value || "").trim();
      if (saveProfile(p)) {
        toast("プロフィールを保存したよ");
        render({ resetScroll: false });
      }
    } else if (t.dataset.delIng) {
      const p = loadProfile();
      p.customIngredients = p.customIngredients.filter((x) => x.id !== t.dataset.delIng);
      saveProfile(p);
      toast("マイ原料を削除したよ");
      render({ resetScroll: false });
    } else if (t.hasAttribute("data-ig-share")) shareInstagram();
  });

  app.addEventListener("input", (e) => {
    if (e.target.id === "recipe-name") state.name = e.target.value;
    if (e.target.id === "profile-name" || e.target.id === "profile-fav") return;
    if (e.target.id === "custom-name-main") {
      state.customDraft.name = e.target.value;
    }
    if (e.target.id === "custom-aliases") state.customDraft.aliases = e.target.value;
    if (e.target.id === "custom-source") state.customDraft.source = e.target.value;
    if (e.target.id === "custom-note") state.customDraft.note = e.target.value;
    if (e.target.id === "custom-save-profile") state.customDraft.saveToProfile = e.target.checked;
    if (e.target.dataset.nut) {
      const v = Number(e.target.value);
      state.customDraft.n[e.target.dataset.nut] = Number.isFinite(v) && v >= 0 ? v : 0;
      state.customDraft.nTouched = true;
    }
    if (e.target.dataset.extraLabel != null) {
      const i = Number(e.target.dataset.extraLabel);
      if (state.customDraft.extraFields[i]) state.customDraft.extraFields[i].label = e.target.value;
    }
    if (e.target.dataset.extraValue != null) {
      const i = Number(e.target.dataset.extraValue);
      if (state.customDraft.extraFields[i]) state.customDraft.extraFields[i].value = e.target.value;
    }
    if (e.target.dataset.extraOtherName != null) {
      const i = Number(e.target.dataset.extraOtherName);
      if (state.customDraft.extraOthers[i]) state.customDraft.extraOthers[i].name = e.target.value;
    }
    if (e.target.dataset.extraOtherG != null) {
      const i = Number(e.target.dataset.extraOtherG);
      const v = Number(e.target.value);
      if (state.customDraft.extraOthers[i] && Number.isFinite(v)) state.customDraft.extraOthers[i].grams = v;
    }
    if (e.target.dataset.customName) {
      const row = state.selected.find((s) => s.id === e.target.dataset.customName);
      if (row) row.name = e.target.value;
    }
    const gid = e.target.dataset.g;
    if (gid === "draft-grams") {
      const v = Number(e.target.value);
      if (Number.isFinite(v) && v >= 0) state.customDraft.grams = Math.min(9999, v);
      return;
    }
    if (gid) {
      const raw = e.target.value.trim();
      if (raw === "" || raw === ".") return;
      const v = Number(raw);
      const row = state.selected.find((s) => s.id === gid);
      if (row && Number.isFinite(v) && v >= 0) row.grams = Math.min(9999, v);
    }
  });

  app.addEventListener("change", (e) => {
    if (e.target.id === "custom-save-profile") state.customDraft.saveToProfile = e.target.checked;
    if (e.target.id === "custom-name-main") {
      state.customDraft.name = e.target.value;
      applyEvidenceToDraft(e.target.value);
      paintEvidence();
    }
    if (e.target.dataset.customName) {
      const row = state.selected.find((s) => s.id === e.target.dataset.customName);
      if (!row) return;
      row.name = e.target.value;
      const hit = findEvidence(e.target.value);
      if (hit) row.n = { ...EMPTY_N, ...hit.n };
    }
  });

  app.addEventListener("blur", (e) => {
    if (e.target.id === "custom-name-main") {
      applyEvidenceToDraft(e.target.value);
      paintEvidence();
    }
    if (e.target.dataset?.customName) {
      const row = state.selected.find((s) => s.id === e.target.dataset.customName);
      if (row) {
        row.name = e.target.value;
        const hit = findEvidence(e.target.value);
        if (hit) row.n = { ...EMPTY_N, ...hit.n };
      }
    }
    const gid = e.target.dataset?.g;
    if (!gid || gid === "draft-grams") return;
    const row = state.selected.find((s) => s.id === gid);
    if (!row) return;
    const v = Number(e.target.value);
    row.grams = Number.isFinite(v) && v >= 0 ? Math.min(9999, v) : 0;
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
    if (state.view === "result" && !state.selected.length) {
      state.view = "blend";
      history.replaceState({ view: "blend" }, "", hashFor("blend"));
    }
    state.shareOpen = false;
    render({ resetScroll: true });
  });

  if (!location.hash) history.replaceState({ view: state.view }, "", hashFor(state.view));
  syncHead();
  render({ resetScroll: true });
})();
