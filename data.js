/* 日本食品標準成分表を参考にした 100g あたりの目安値。アミノ酸は推定値。 */
window.ATELIER = (function () {
  const RDA = {
    kcal: 2000,
    carb: 250,
    protein: 50,
    fat: 50,
    sugar: 50,
    fiber: 18,
    fructose: 25,
    glucose: 25,
    starch: 80,
    oligo: 5,
    leu: 2700,
    lys: 2100,
    val: 1800,
    ile: 1400,
    gln: 3000,
    arg: 2000,
    sat: 16,
    mufa: 20,
    pufa: 11,
    n3: 1.6,
    n6: 8,
    chol: 200,
    vitA: 650,
    vitC: 100,
    vitE: 6.0,
    vitB1: 1.1,
    vitB6: 1.2,
    folate: 240,
    ca: 650,
    fe: 10.5,
    k: 2600,
    mg: 290,
    zn: 8,
    na: 2300
  };

  const GROUPS = {
    pentagon: [
      { key: "carb", label: "炭水化物", unit: "g", color: "#E7A0B2" },
      { key: "protein", label: "たんぱく質", unit: "g", color: "#7EB8A8" },
      { key: "fat", label: "脂質", unit: "g", color: "#E2C36A" },
      { key: "vitamin", label: "ビタミン", unit: "%", color: "#9AA7E0" },
      { key: "mineral", label: "ミネラル", unit: "%", color: "#C9A48A" }
    ],
    hex: {
      carb: {
        title: "炭水化物の内訳",
        accent: "#E7A0B2",
        items: [
          { key: "sugar", label: "糖質", unit: "g" },
          { key: "fiber", label: "食物繊維", unit: "g" },
          { key: "fructose", label: "果糖", unit: "g" },
          { key: "glucose", label: "ブドウ糖", unit: "g" },
          { key: "starch", label: "でんぷん", unit: "g" },
          { key: "oligo", label: "オリゴ糖", unit: "g" }
        ]
      },
      protein: {
        title: "たんぱく質の内訳",
        accent: "#7EB8A8",
        items: [
          { key: "leu", label: "ロイシン", unit: "mg" },
          { key: "lys", label: "リジン", unit: "mg" },
          { key: "val", label: "バリン", unit: "mg" },
          { key: "ile", label: "イソロイシン", unit: "mg" },
          { key: "gln", label: "グルタミン", unit: "mg" },
          { key: "arg", label: "アルギニン", unit: "mg" }
        ]
      },
      fat: {
        title: "脂質の内訳",
        accent: "#E2C36A",
        items: [
          { key: "sat", label: "飽和", unit: "g" },
          { key: "mufa", label: "一価不飽和", unit: "g" },
          { key: "pufa", label: "多価不飽和", unit: "g" },
          { key: "n3", label: "オメガ3", unit: "g" },
          { key: "n6", label: "オメガ6", unit: "g" },
          { key: "chol", label: "コレステロール", unit: "mg" }
        ]
      },
      vitamin: {
        title: "ビタミンの内訳",
        accent: "#9AA7E0",
        items: [
          { key: "vitA", label: "ビタミンA", unit: "μg" },
          { key: "vitC", label: "ビタミンC", unit: "mg" },
          { key: "vitE", label: "ビタミンE", unit: "mg" },
          { key: "vitB1", label: "ビタミンB1", unit: "mg" },
          { key: "vitB6", label: "ビタミンB6", unit: "mg" },
          { key: "folate", label: "葉酸", unit: "μg" }
        ]
      },
      mineral: {
        title: "ミネラルの内訳",
        accent: "#C9A48A",
        items: [
          { key: "ca", label: "カルシウム", unit: "mg" },
          { key: "fe", label: "鉄", unit: "mg" },
          { key: "k", label: "カリウム", unit: "mg" },
          { key: "mg", label: "マグネシウム", unit: "mg" },
          { key: "zn", label: "亜鉛", unit: "mg" },
          { key: "na", label: "ナトリウム", unit: "mg" }
        ]
      }
    }
  };

  const CATEGORIES = [
    { id: "fruit", label: "フルーツ" },
    { id: "veg", label: "ベジタブル" },
    { id: "base", label: "ベース" },
    { id: "plus", label: "プラス" },
    { id: "other", label: "その他" }
  ];

  function n(partial) {
    const base = {
      kcal: 0, carb: 0, protein: 0, fat: 0, sugar: 0, fiber: 0, fructose: 0, glucose: 0, starch: 0, oligo: 0,
      leu: 0, lys: 0, val: 0, ile: 0, gln: 0, arg: 0, sat: 0, mufa: 0, pufa: 0, n3: 0, n6: 0, chol: 0,
      vitA: 0, vitC: 0, vitE: 0, vitB1: 0, vitB6: 0, folate: 0, ca: 0, fe: 0, k: 0, mg: 0, zn: 0, na: 0
    };
    return Object.assign(base, partial);
  }

  /* 100gあたり。出典: 日本食品標準成分表2020年版（八訂）を主とし、表にない食品はUSDA FoodData Centralで補完。アミノ酸はたんぱく質量からの推定。 */
  const OTHER_FOODS = [
    { id: "other-water", name: "水", aliases: ["お水", "ミネラルウォーター"], cat: "other", tone: "#D7EEF5", defaultG: 100, source: "日本食品標準成分表2020（八訂）飲料 水", n: n({ kcal: 0 }) },
    { id: "other-ice", name: "氷", aliases: ["こおり"], cat: "other", tone: "#E8F4F8", defaultG: 80, source: "日本食品標準成分表2020（八訂）飲料 水（凍結）", n: n({ kcal: 0 }) }
  ];

  const INGREDIENTS = [
    { id: "banana", name: "バナナ", cat: "fruit", tone: "#F3D27A", defaultG: 80, n: { kcal: 86, carb: 22.5, protein: 1.1, fat: 0.2, sugar: 18.3, fiber: 1.1, fructose: 5.8, glucose: 5.4, starch: 5.4, oligo: 0.4, leu: 68, lys: 50, val: 47, ile: 35, gln: 90, arg: 49, sat: 0.07, mufa: 0.03, pufa: 0.05, n3: 0.02, n6: 0.03, chol: 0, vitA: 5, vitC: 9, vitE: 0.3, vitB1: 0.05, vitB6: 0.38, folate: 26, ca: 6, fe: 0.3, k: 360, mg: 32, zn: 0.2, na: 1 } },
    { id: "strawberry", name: "いちご", cat: "fruit", tone: "#E89AA8", defaultG: 120, n: { kcal: 34, carb: 8.5, protein: 0.9, fat: 0.1, sugar: 6.1, fiber: 1.4, fructose: 2.5, glucose: 2.0, starch: 0.2, oligo: 0.3, leu: 48, lys: 32, val: 28, ile: 22, gln: 60, arg: 35, sat: 0.02, mufa: 0.02, pufa: 0.05, n3: 0.03, n6: 0.02, chol: 0, vitA: 2, vitC: 62, vitE: 0.4, vitB1: 0.03, vitB6: 0.04, folate: 90, ca: 17, fe: 0.3, k: 170, mg: 13, zn: 0.2, na: 1 } },
    { id: "blueberry", name: "ブルーベリー", cat: "fruit", tone: "#8B8BC9", defaultG: 80, n: { kcal: 49, carb: 12.1, protein: 0.5, fat: 0.1, sugar: 9.1, fiber: 3.3, fructose: 4.0, glucose: 4.0, starch: 0.2, oligo: 0.4, leu: 28, lys: 16, val: 18, ile: 14, gln: 35, arg: 22, sat: 0.02, mufa: 0.02, pufa: 0.06, n3: 0.04, n6: 0.02, chol: 0, vitA: 3, vitC: 9, vitE: 1.1, vitB1: 0.03, vitB6: 0.05, folate: 6, ca: 8, fe: 0.2, k: 70, mg: 5, zn: 0.1, na: 1 } },
    { id: "mango", name: "マンゴー", cat: "fruit", tone: "#F0B15A", defaultG: 100, n: { kcal: 64, carb: 16.9, protein: 0.6, fat: 0.1, sugar: 13.7, fiber: 1.3, fructose: 4.7, glucose: 2.0, starch: 0.8, oligo: 0.5, leu: 32, lys: 28, val: 22, ile: 18, gln: 40, arg: 25, sat: 0.03, mufa: 0.04, pufa: 0.03, n3: 0.02, n6: 0.01, chol: 0, vitA: 54, vitC: 20, vitE: 1.0, vitB1: 0.04, vitB6: 0.13, folate: 43, ca: 15, fe: 0.2, k: 170, mg: 12, zn: 0.1, na: 1 } },
    { id: "kiwi", name: "キウイ", cat: "fruit", tone: "#8FBF6A", defaultG: 90, n: { kcal: 53, carb: 13.5, protein: 1.0, fat: 0.1, sugar: 10.3, fiber: 2.6, fructose: 4.4, glucose: 4.1, starch: 0.3, oligo: 0.4, leu: 52, lys: 40, val: 35, ile: 28, gln: 70, arg: 55, sat: 0.02, mufa: 0.02, pufa: 0.05, n3: 0.03, n6: 0.02, chol: 0, vitA: 5, vitC: 69, vitE: 1.3, vitB1: 0.02, vitB6: 0.12, folate: 36, ca: 33, fe: 0.3, k: 290, mg: 16, zn: 0.1, na: 2 } },
    { id: "apple", name: "りんご", cat: "fruit", tone: "#E8B4B0", defaultG: 100, n: { kcal: 54, carb: 14.6, protein: 0.2, fat: 0.1, sugar: 13.1, fiber: 1.5, fructose: 6.0, glucose: 2.5, starch: 0.2, oligo: 0.3, leu: 12, lys: 10, val: 8, ile: 7, gln: 15, arg: 8, sat: 0.02, mufa: 0.01, pufa: 0.03, n3: 0.01, n6: 0.02, chol: 0, vitA: 2, vitC: 4, vitE: 0.1, vitB1: 0.02, vitB6: 0.03, folate: 2, ca: 3, fe: 0.1, k: 110, mg: 5, zn: 0.0, na: 0 } },
    { id: "pineapple", name: "パイナップル", cat: "fruit", tone: "#E8C96A", defaultG: 80, n: { kcal: 54, carb: 13.7, protein: 0.6, fat: 0.1, sugar: 11.9, fiber: 1.2, fructose: 2.1, glucose: 2.3, starch: 0.1, oligo: 0.3, leu: 28, lys: 24, val: 20, ile: 16, gln: 30, arg: 22, sat: 0.01, mufa: 0.01, pufa: 0.04, n3: 0.02, n6: 0.02, chol: 0, vitA: 3, vitC: 27, vitE: 0.1, vitB1: 0.08, vitB6: 0.09, folate: 11, ca: 12, fe: 0.2, k: 150, mg: 12, zn: 0.1, na: 1 } },
    { id: "orange", name: "オレンジ", cat: "fruit", tone: "#F0A45A", defaultG: 100, n: { kcal: 46, carb: 11.8, protein: 0.9, fat: 0.1, sugar: 8.9, fiber: 1.0, fructose: 2.4, glucose: 2.2, starch: 0.1, oligo: 0.3, leu: 23, lys: 31, val: 21, ile: 17, gln: 40, arg: 45, sat: 0.02, mufa: 0.02, pufa: 0.03, n3: 0.01, n6: 0.02, chol: 0, vitA: 10, vitC: 40, vitE: 0.3, vitB1: 0.08, vitB6: 0.06, folate: 32, ca: 24, fe: 0.2, k: 180, mg: 11, zn: 0.1, na: 1 } },
    { id: "avocado", name: "アボカド", cat: "fruit", tone: "#A3C47A", defaultG: 70, n: { kcal: 187, carb: 6.2, protein: 2.5, fat: 18.7, sugar: 0.7, fiber: 5.3, fructose: 0.1, glucose: 0.1, starch: 0.1, oligo: 0.2, leu: 143, lys: 132, val: 128, ile: 95, gln: 250, arg: 106, sat: 2.1, mufa: 9.8, pufa: 1.8, n3: 0.11, n6: 1.67, chol: 0, vitA: 7, vitC: 15, vitE: 3.3, vitB1: 0.08, vitB6: 0.29, folate: 42, ca: 9, fe: 0.6, k: 590, mg: 52, zn: 0.5, na: 7 } },
    { id: "peach", name: "もも", cat: "fruit", tone: "#F0B8B0", defaultG: 100, n: { kcal: 40, carb: 10.2, protein: 0.6, fat: 0.1, sugar: 8.3, fiber: 1.1, fructose: 1.5, glucose: 1.2, starch: 0.2, oligo: 0.4, leu: 28, lys: 22, val: 22, ile: 16, gln: 35, arg: 18, sat: 0.02, mufa: 0.03, pufa: 0.04, n3: 0.01, n6: 0.03, chol: 0, vitA: 12, vitC: 8, vitE: 0.7, vitB1: 0.02, vitB6: 0.02, folate: 5, ca: 4, fe: 0.2, k: 180, mg: 8, zn: 0.1, na: 1 } },
    { id: "grape", name: "ぶどう", cat: "fruit", tone: "#B48BC4", defaultG: 80, n: { kcal: 59, carb: 15.7, protein: 0.4, fat: 0.1, sugar: 15.2, fiber: 0.5, fructose: 7.5, glucose: 7.0, starch: 0.1, oligo: 0.2, leu: 16, lys: 14, val: 12, ile: 10, gln: 20, arg: 14, sat: 0.03, mufa: 0.01, pufa: 0.03, n3: 0.01, n6: 0.02, chol: 0, vitA: 3, vitC: 2, vitE: 0.1, vitB1: 0.04, vitB6: 0.04, folate: 2, ca: 6, fe: 0.1, k: 130, mg: 6, zn: 0.0, na: 1 } },
    { id: "other-dates", name: "デーツ（乾燥）", aliases: ["なつめやし", "dates"], cat: "fruit", tone: "#8A4E2A", defaultG: 20, source: "日本食品標準成分表2020（八訂）なつめやし 乾", n: n({ kcal: 276, carb: 66.8, protein: 2.2, fat: 0.5, sugar: 63.0, fiber: 7.1, fructose: 22, glucose: 25, starch: 0, oligo: 1, leu: 150, lys: 80, val: 110, ile: 80, gln: 200, arg: 90, sat: 0.2, mufa: 0.1, pufa: 0.1, n3: 0, n6: 0.1, vitA: 1, vitC: 0, vitE: 0.1, vitB1: 0.07, vitB6: 0.17, folate: 13, ca: 64, fe: 1.0, k: 650, mg: 50, zn: 0.3, na: 2 }) },
    { id: "other-raisin", name: "レーズン", aliases: ["ほしぶどう"], cat: "fruit", tone: "#6B3A4A", defaultG: 15, source: "日本食品標準成分表2020（八訂）ぶどう 干しぶどう", n: n({ kcal: 301, carb: 77.5, protein: 2.7, fat: 0.4, sugar: 70.0, fiber: 3.7, fructose: 33, glucose: 32, leu: 170, lys: 80, val: 120, ile: 80, gln: 220, arg: 120, sat: 0.1, vitC: 1, vitB1: 0.10, vitB6: 0.19, folate: 4, ca: 56, fe: 2.3, k: 740, mg: 31, zn: 0.2, na: 13 }) },
    { id: "other-papaya", name: "パパイヤ", aliases: ["papaya"], cat: "fruit", tone: "#F0A45A", defaultG: 80, source: "日本食品標準成分表2020（八訂）パパイヤ 果実 生", n: n({ kcal: 38, carb: 9.5, protein: 0.5, fat: 0.1, sugar: 7.2, fiber: 1.5, fructose: 3.7, glucose: 3.3, leu: 25, lys: 20, val: 18, ile: 14, gln: 30, arg: 18, vitA: 47, vitC: 81, vitE: 0.7, vitB1: 0.03, vitB6: 0.02, folate: 38, ca: 21, fe: 0.2, k: 210, mg: 21, zn: 0.1, na: 4 }) },
    { id: "spinach", name: "ほうれん草", cat: "veg", tone: "#6EAE7A", defaultG: 50, n: { kcal: 20, carb: 3.1, protein: 2.2, fat: 0.4, sugar: 0.4, fiber: 2.8, fructose: 0.1, glucose: 0.1, starch: 0.1, oligo: 0.2, leu: 174, lys: 141, val: 125, ile: 96, gln: 280, arg: 141, sat: 0.06, mufa: 0.01, pufa: 0.17, n3: 0.14, n6: 0.03, chol: 0, vitA: 350, vitC: 35, vitE: 2.1, vitB1: 0.11, vitB6: 0.14, folate: 210, ca: 49, fe: 2.0, k: 690, mg: 69, zn: 0.7, na: 16 } },
    { id: "kale", name: "ケール", cat: "veg", tone: "#5A9A6A", defaultG: 40, n: { kcal: 28, carb: 5.1, protein: 2.1, fat: 0.4, sugar: 0.8, fiber: 3.7, fructose: 0.3, glucose: 0.3, starch: 0.1, oligo: 0.2, leu: 150, lys: 120, val: 110, ile: 85, gln: 240, arg: 130, sat: 0.05, mufa: 0.03, pufa: 0.18, n3: 0.12, n6: 0.06, chol: 0, vitA: 500, vitC: 81, vitE: 1.5, vitB1: 0.11, vitB6: 0.27, folate: 141, ca: 150, fe: 1.5, k: 490, mg: 47, zn: 0.4, na: 38 } },
    { id: "carrot", name: "にんじん", cat: "veg", tone: "#E89A5A", defaultG: 60, n: { kcal: 37, carb: 8.7, protein: 0.6, fat: 0.1, sugar: 6.5, fiber: 2.5, fructose: 0.6, glucose: 0.6, starch: 0.3, oligo: 0.3, leu: 37, lys: 28, val: 32, ile: 26, gln: 50, arg: 40, sat: 0.02, mufa: 0.01, pufa: 0.06, n3: 0.01, n6: 0.05, chol: 0, vitA: 735, vitC: 4, vitE: 0.5, vitB1: 0.05, vitB6: 0.10, folate: 21, ca: 28, fe: 0.2, k: 300, mg: 9, zn: 0.2, na: 24 } },
    { id: "cucumber", name: "きゅうり", cat: "veg", tone: "#9DC97A", defaultG: 80, n: { kcal: 14, carb: 3.0, protein: 1.0, fat: 0.1, sugar: 1.8, fiber: 1.1, fructose: 0.8, glucose: 0.7, starch: 0.1, oligo: 0.1, leu: 29, lys: 29, val: 22, ile: 18, gln: 40, arg: 40, sat: 0.01, mufa: 0.00, pufa: 0.03, n3: 0.02, n6: 0.01, chol: 0, vitA: 22, vitC: 14, vitE: 0.1, vitB1: 0.03, vitB6: 0.05, folate: 25, ca: 26, fe: 0.3, k: 200, mg: 15, zn: 0.2, na: 1 } },
    { id: "beet", name: "ビーツ", cat: "veg", tone: "#C45A7A", defaultG: 60, n: { kcal: 41, carb: 9.6, protein: 1.6, fat: 0.2, sugar: 6.8, fiber: 2.8, fructose: 0.2, glucose: 0.2, starch: 0.2, oligo: 0.3, leu: 68, lys: 58, val: 56, ile: 48, gln: 90, arg: 42, sat: 0.03, mufa: 0.04, pufa: 0.06, n3: 0.01, n6: 0.05, chol: 0, vitA: 2, vitC: 4, vitE: 0.0, vitB1: 0.03, vitB6: 0.07, folate: 109, ca: 16, fe: 0.8, k: 325, mg: 23, zn: 0.4, na: 78 } },
    { id: "komatsuna", name: "小松菜", cat: "veg", tone: "#6AAA6A", defaultG: 50, n: { kcal: 13, carb: 1.4, protein: 1.5, fat: 0.2, sugar: 0.4, fiber: 1.9, fructose: 0.1, glucose: 0.1, starch: 0.0, oligo: 0.1, leu: 110, lys: 90, val: 80, ile: 65, gln: 180, arg: 90, sat: 0.02, mufa: 0.01, pufa: 0.08, n3: 0.06, n6: 0.02, chol: 0, vitA: 260, vitC: 39, vitE: 0.9, vitB1: 0.09, vitB6: 0.12, folate: 110, ca: 170, fe: 2.8, k: 500, mg: 12, zn: 0.2, na: 15 } },
    { id: "other-tomato", name: "トマト", aliases: ["とまと"], cat: "veg", tone: "#E86A5A", defaultG: 80, source: "日本食品標準成分表2020（八訂）トマト 果実 生", n: n({ kcal: 19, carb: 4.7, protein: 0.7, fat: 0.1, sugar: 3.0, fiber: 1.0, fructose: 1.4, glucose: 1.2, leu: 40, lys: 30, val: 25, ile: 20, gln: 80, arg: 25, sat: 0.02, pufa: 0.04, n3: 0.01, n6: 0.03, vitA: 45, vitC: 15, vitE: 0.9, vitB1: 0.05, vitB6: 0.07, folate: 22, ca: 7, fe: 0.2, k: 210, mg: 9, zn: 0.1, na: 3 }) },
    { id: "other-broccoli", name: "ブロッコリー", aliases: ["broccoli"], cat: "veg", tone: "#5A9A4A", defaultG: 40, source: "日本食品標準成分表2020（八訂）ブロッコリー 花序 生", n: n({ kcal: 33, carb: 5.2, protein: 4.3, fat: 0.5, sugar: 1.5, fiber: 4.4, leu: 280, lys: 220, val: 200, ile: 160, gln: 450, arg: 230, sat: 0.07, pufa: 0.2, n3: 0.1, n6: 0.1, vitA: 67, vitC: 120, vitE: 2.2, vitB1: 0.14, vitB6: 0.18, folate: 120, ca: 38, fe: 0.8, k: 360, mg: 26, zn: 0.6, na: 21 }) },
    { id: "other-pumpkin", name: "かぼちゃ", aliases: ["西洋かぼちゃ"], cat: "veg", tone: "#E8A03A", defaultG: 60, source: "日本食品標準成分表2020（八訂）西洋かぼちゃ 果実 生", n: n({ kcal: 49, carb: 13.0, protein: 1.6, fat: 0.1, sugar: 6.0, fiber: 3.5, starch: 4, leu: 90, lys: 70, val: 70, ile: 55, gln: 140, arg: 90, vitA: 330, vitC: 16, vitE: 2.2, vitB1: 0.07, vitB6: 0.12, folate: 26, ca: 20, fe: 0.5, k: 400, mg: 15, zn: 0.2, na: 1 }) },
    { id: "other-sweetpot", name: "さつまいも", aliases: ["薩摩芋"], cat: "veg", tone: "#D48A6A", defaultG: 50, source: "日本食品標準成分表2020（八訂）さつまいも 塊根 生", n: n({ kcal: 132, carb: 31.5, protein: 1.2, fat: 0.2, sugar: 5.7, fiber: 2.3, starch: 22, fructose: 0.5, glucose: 0.6, leu: 70, lys: 50, val: 60, ile: 45, gln: 120, arg: 55, vitA: 2, vitC: 29, vitE: 0.5, vitB1: 0.11, vitB6: 0.28, folate: 49, ca: 40, fe: 0.7, k: 470, mg: 24, zn: 0.2, na: 4 }) },
    { id: "other-parsley", name: "パセリ", aliases: ["parsley"], cat: "veg", tone: "#4A8A3A", defaultG: 5, source: "日本食品標準成分表2020（八訂）パセリ 葉 生", n: n({ kcal: 43, carb: 8.8, protein: 3.7, fat: 0.7, sugar: 0.9, fiber: 6.8, leu: 250, lys: 200, val: 180, ile: 140, gln: 350, arg: 180, vitA: 420, vitC: 120, vitE: 3.0, vitB1: 0.12, vitB6: 0.20, folate: 200, ca: 150, fe: 4.0, k: 1000, mg: 42, zn: 0.9, na: 33 }) },
    { id: "other-mint", name: "ミント", aliases: ["スペアミント", "ミントの葉"], cat: "veg", tone: "#6AAA7A", defaultG: 4, source: "USDA FoodData Central spearmint, fresh", n: n({ kcal: 44, carb: 8.4, protein: 3.3, fat: 0.7, sugar: 0, fiber: 6.8, leu: 200, lys: 140, val: 150, ile: 120, gln: 280, arg: 140, vitA: 203, vitC: 13, vitE: 0.3, vitB1: 0.08, vitB6: 0.16, folate: 114, ca: 199, fe: 11.9, k: 458, mg: 63, zn: 1.1, na: 31 }) },
    { id: "konnyaku-ko-kuro", name: "板こんにゃく（黒）", aliases: ["板こんにゃく黒", "粉こんにゃく（黒）", "粉こんにゃく黒"], cat: "veg", tone: "#5C4F46", defaultG: 40, n: { kcal: 7, carb: 2.8, protein: 0.1, fat: 0.1, sugar: 0.1, fiber: 2.5, fructose: 0, glucose: 0, starch: 0, oligo: 0, leu: 5, lys: 4, val: 4, ile: 3, gln: 6, arg: 4, sat: 0.02, mufa: 0.01, pufa: 0.04, n3: 0.01, n6: 0.03, chol: 0, vitA: 0, vitC: 0, vitE: 0, vitB1: 0.00, vitB6: 0.01, folate: 1, ca: 68, fe: 0.5, k: 44, mg: 5, zn: 0.1, na: 10 } },
    { id: "konnyaku-ko-shiro", name: "板こんにゃく（白）", aliases: ["板こんにゃく白", "粉こんにゃく（白）", "粉こんにゃく白", "粉コンニャク白"], cat: "veg", tone: "#E8E2D8", defaultG: 40, n: { kcal: 5, carb: 2.3, protein: 0.1, fat: 0.1, sugar: 0.1, fiber: 2.2, fructose: 0, glucose: 0, starch: 0, oligo: 0, leu: 4, lys: 3, val: 3, ile: 2, gln: 5, arg: 3, sat: 0.02, mufa: 0.01, pufa: 0.03, n3: 0.01, n6: 0.02, chol: 0, vitA: 0, vitC: 0, vitE: 0, vitB1: 0.00, vitB6: 0.01, folate: 1, ca: 43, fe: 0.6, k: 28, mg: 3, zn: 0.1, na: 10 } },
    { id: "konnyaku", name: "生芋こんにゃく", cat: "veg", tone: "#C9C2B8", defaultG: 40, n: { kcal: 7, carb: 2.8, protein: 0.1, fat: 0.1, sugar: 0.1, fiber: 2.5, fructose: 0, glucose: 0, starch: 0, oligo: 0, leu: 5, lys: 4, val: 4, ile: 3, gln: 6, arg: 4, sat: 0.02, mufa: 0.01, pufa: 0.04, n3: 0.01, n6: 0.03, chol: 0, vitA: 0, vitC: 0, vitE: 0, vitB1: 0.00, vitB6: 0.01, folate: 1, ca: 68, fe: 0.5, k: 44, mg: 5, zn: 0.1, na: 10 } },
    { id: "shirataki", name: "しらたき", cat: "veg", tone: "#F2EEE8", defaultG: 40, n: { kcal: 6, carb: 2.9, protein: 0.2, fat: 0, sugar: 0.1, fiber: 2.9, fructose: 0, glucose: 0, starch: 0, oligo: 0, leu: 8, lys: 6, val: 6, ile: 5, gln: 10, arg: 7, sat: 0, mufa: 0, pufa: 0, n3: 0, n6: 0, chol: 0, vitA: 0, vitC: 0, vitE: 0, vitB1: 0.00, vitB6: 0.01, folate: 1, ca: 75, fe: 0.6, k: 8, mg: 6, zn: 0.1, na: 8 } },
    { id: "aka-konnyaku", name: "赤こんにゃく", cat: "veg", tone: "#C45A58", defaultG: 40, n: { kcal: 7, carb: 2.7, protein: 0.2, fat: 0.1, sugar: 0.1, fiber: 2.4, fructose: 0, glucose: 0, starch: 0, oligo: 0, leu: 6, lys: 5, val: 5, ile: 4, gln: 8, arg: 5, sat: 0.02, mufa: 0.01, pufa: 0.04, n3: 0.01, n6: 0.03, chol: 0, vitA: 2, vitC: 0, vitE: 0, vitB1: 0.00, vitB6: 0.01, folate: 1, ca: 55, fe: 2.8, k: 35, mg: 6, zn: 0.2, na: 15 } },
    { id: "milk", name: "牛乳", cat: "base", tone: "#F4EEE4", defaultG: 200, n: { kcal: 67, carb: 4.8, protein: 3.3, fat: 3.8, sugar: 4.8, fiber: 0, fructose: 0, glucose: 0, starch: 0, oligo: 0, leu: 330, lys: 270, val: 220, ile: 180, gln: 700, arg: 120, sat: 2.3, mufa: 0.9, pufa: 0.1, n3: 0.03, n6: 0.07, chol: 12, vitA: 38, vitC: 1, vitE: 0.1, vitB1: 0.04, vitB6: 0.04, folate: 5, ca: 110, fe: 0.0, k: 150, mg: 10, zn: 0.4, na: 41 } },
    { id: "soymilk", name: "無調整豆乳", cat: "base", tone: "#E8DFC9", defaultG: 200, n: { kcal: 46, carb: 3.1, protein: 3.6, fat: 2.0, sugar: 1.0, fiber: 0.2, fructose: 0.2, glucose: 0.2, starch: 0.4, oligo: 0.5, leu: 280, lys: 220, val: 180, ile: 170, gln: 620, arg: 260, sat: 0.3, mufa: 0.4, pufa: 1.1, n3: 0.13, n6: 0.97, chol: 0, vitA: 0, vitC: 0, vitE: 0.2, vitB1: 0.07, vitB6: 0.06, folate: 28, ca: 15, fe: 1.2, k: 190, mg: 25, zn: 0.3, na: 2 } },
    { id: "almondmilk", name: "アーモンドミルク", cat: "base", tone: "#E8D4B8", defaultG: 200, n: { kcal: 24, carb: 3.0, protein: 0.6, fat: 1.1, sugar: 2.4, fiber: 0.2, fructose: 0, glucose: 0, starch: 0.1, oligo: 0, leu: 40, lys: 15, val: 28, ile: 22, gln: 80, arg: 70, sat: 0.1, mufa: 0.7, pufa: 0.3, n3: 0.00, n6: 0.28, chol: 0, vitA: 0, vitC: 0, vitE: 1.5, vitB1: 0.01, vitB6: 0.01, folate: 1, ca: 80, fe: 0.2, k: 35, mg: 12, zn: 0.1, na: 50 } },
    { id: "yogurt", name: "プレーンヨーグルト", cat: "base", tone: "#F7F1E6", defaultG: 150, n: { kcal: 62, carb: 4.9, protein: 3.6, fat: 3.0, sugar: 4.9, fiber: 0, fructose: 0, glucose: 0, starch: 0, oligo: 0, leu: 350, lys: 290, val: 240, ile: 200, gln: 720, arg: 130, sat: 1.9, mufa: 0.7, pufa: 0.1, n3: 0.03, n6: 0.06, chol: 12, vitA: 33, vitC: 1, vitE: 0.1, vitB1: 0.04, vitB6: 0.04, folate: 12, ca: 120, fe: 0.0, k: 170, mg: 12, zn: 0.4, na: 48 } },
    { id: "greek", name: "ギリシャヨーグルト", cat: "base", tone: "#F3EBDC", defaultG: 150, n: { kcal: 73, carb: 3.6, protein: 6.9, fat: 3.5, sugar: 3.6, fiber: 0, fructose: 0, glucose: 0, starch: 0, oligo: 0, leu: 680, lys: 560, val: 450, ile: 380, gln: 1200, arg: 230, sat: 2.2, mufa: 0.8, pufa: 0.1, n3: 0.03, n6: 0.07, chol: 13, vitA: 30, vitC: 0, vitE: 0.1, vitB1: 0.04, vitB6: 0.06, folate: 14, ca: 110, fe: 0.1, k: 141, mg: 11, zn: 0.5, na: 36 } },
    { id: "coco", name: "ココナッツウォーター", cat: "base", tone: "#EDE4D4", defaultG: 200, n: { kcal: 19, carb: 3.7, protein: 0.7, fat: 0.2, sugar: 2.6, fiber: 1.1, fructose: 1.0, glucose: 1.2, starch: 0, oligo: 0.1, leu: 35, lys: 28, val: 26, ile: 20, gln: 50, arg: 80, sat: 0.18, mufa: 0.01, pufa: 0.00, n3: 0, n6: 0, chol: 0, vitA: 0, vitC: 2, vitE: 0, vitB1: 0.03, vitB6: 0.03, folate: 3, ca: 24, fe: 0.3, k: 250, mg: 25, zn: 0.1, na: 105 } },
    { id: "other-tofu", name: "絹ごし豆腐", aliases: ["豆腐"], cat: "base", tone: "#F4F0E6", defaultG: 80, source: "日本食品標準成分表2020（八訂）大豆 豆腐 絹ごし", n: n({ kcal: 56, carb: 2.0, protein: 4.9, fat: 3.0, sugar: 1.0, fiber: 0.3, leu: 380, lys: 310, val: 240, ile: 230, gln: 900, arg: 360, sat: 0.4, mufa: 0.6, pufa: 1.6, n3: 0.2, n6: 1.4, vitA: 0, vitE: 0.3, vitB1: 0.07, vitB6: 0.05, folate: 12, ca: 43, fe: 0.8, k: 150, mg: 40, zn: 0.5, na: 3 }) },
    { id: "other-cocmilk", name: "ココナッツミルク", aliases: ["coconut milk"], cat: "base", tone: "#F3E6D4", defaultG: 80, source: "日本食品標準成分表2020（八訂）／USDA FoodData Central coconut milk", n: n({ kcal: 150, carb: 3.3, protein: 1.4, fat: 15.0, sugar: 2.5, fiber: 0.2, leu: 90, lys: 50, val: 70, ile: 50, gln: 180, arg: 150, sat: 13.0, mufa: 0.7, pufa: 0.2, n3: 0, n6: 0.2, vitC: 1, vitE: 0.2, vitB1: 0.02, vitB6: 0.03, folate: 14, ca: 16, fe: 1.6, k: 170, mg: 37, zn: 0.6, na: 15 }) },
    { id: "other-skim", name: "スキムミルク（粉末）", aliases: ["脱脂粉乳"], cat: "base", tone: "#F2EDE4", defaultG: 10, source: "日本食品標準成分表2020（八訂）乳類 脱脂粉乳", n: n({ kcal: 359, carb: 53.3, protein: 34.0, fat: 0.9, sugar: 53.3, leu: 3300, lys: 2700, val: 2200, ile: 1800, gln: 7000, arg: 1200, sat: 0.6, mufa: 0.2, pufa: 0.02, chol: 18, vitA: 8, vitC: 6, vitB1: 0.24, vitB6: 0.30, folate: 37, ca: 1100, fe: 0.4, k: 1800, mg: 110, zn: 4.0, na: 410 }) },
    { id: "honey", name: "はちみつ", cat: "plus", tone: "#D4A84A", defaultG: 15, n: { kcal: 329, carb: 81.9, protein: 0.2, fat: 0, sugar: 81.9, fiber: 0, fructose: 40.0, glucose: 35.0, starch: 0, oligo: 4.0, leu: 8, lys: 6, val: 6, ile: 5, gln: 10, arg: 5, sat: 0, mufa: 0, pufa: 0, n3: 0, n6: 0, chol: 0, vitA: 0, vitC: 0, vitE: 0, vitB1: 0.00, vitB6: 0.02, folate: 2, ca: 2, fe: 0.2, k: 13, mg: 2, zn: 0.1, na: 2 } },
    { id: "chia", name: "チアシード", cat: "plus", tone: "#8A7A6A", defaultG: 10, n: { kcal: 486, carb: 42.1, protein: 16.5, fat: 30.7, sugar: 0, fiber: 34.4, fructose: 0, glucose: 0, starch: 7.7, oligo: 0, leu: 1200, lys: 800, val: 900, ile: 700, gln: 1800, arg: 1600, sat: 3.3, mufa: 2.3, pufa: 23.7, n3: 17.8, n6: 5.8, chol: 0, vitA: 0, vitC: 1, vitE: 0.5, vitB1: 0.62, vitB6: 0.00, folate: 49, ca: 631, fe: 7.7, k: 407, mg: 335, zn: 4.6, na: 16 } },
    { id: "oats", name: "オートミール", cat: "plus", tone: "#D4B896", defaultG: 20, n: { kcal: 380, carb: 69.1, protein: 13.7, fat: 5.7, sugar: 1.0, fiber: 9.4, fructose: 0.1, glucose: 0.1, starch: 55.0, oligo: 0.5, leu: 980, lys: 520, val: 720, ile: 520, gln: 2200, arg: 850, sat: 1.0, mufa: 1.8, pufa: 2.1, n3: 0.11, n6: 1.98, chol: 0, vitA: 0, vitC: 0, vitE: 0.7, vitB1: 0.47, vitB6: 0.12, folate: 32, ca: 47, fe: 3.9, k: 340, mg: 138, zn: 3.1, na: 2 } },
    { id: "peanut", name: "ピーナッツバター", cat: "plus", tone: "#C49A5A", defaultG: 15, n: { kcal: 598, carb: 18.8, protein: 25.4, fat: 50.4, sugar: 6.2, fiber: 6.1, fructose: 0.1, glucose: 0.1, starch: 3.5, oligo: 0.3, leu: 1700, lys: 900, val: 1100, ile: 900, gln: 3500, arg: 2800, sat: 9.5, mufa: 23.6, pufa: 14.4, n3: 0.03, n6: 14.3, chol: 0, vitA: 0, vitC: 0, vitE: 9.1, vitB1: 0.14, vitB6: 0.54, folate: 92, ca: 49, fe: 1.9, k: 650, mg: 160, zn: 2.9, na: 350 } },
    { id: "matcha", name: "抹茶", cat: "plus", tone: "#6AAA5A", defaultG: 3, n: { kcal: 331, carb: 38.5, protein: 30.6, fat: 5.3, sugar: 0, fiber: 38.5, fructose: 0, glucose: 0, starch: 0, oligo: 0, leu: 1800, lys: 1400, val: 1400, ile: 1100, gln: 2500, arg: 1600, sat: 0.7, mufa: 0.4, pufa: 2.2, n3: 0.4, n6: 1.8, chol: 0, vitA: 2400, vitC: 60, vitE: 28.1, vitB1: 0.60, vitB6: 0.96, folate: 220, ca: 420, fe: 17, k: 2700, mg: 230, zn: 6.3, na: 6 } },
    { id: "lemon", name: "レモン汁", cat: "plus", tone: "#E8D45A", defaultG: 15, n: { kcal: 27, carb: 8.6, protein: 0.4, fat: 0.2, sugar: 2.5, fiber: 0.1, fructose: 1.1, glucose: 1.0, starch: 0, oligo: 0.1, leu: 18, lys: 16, val: 14, ile: 10, gln: 20, arg: 12, sat: 0.03, mufa: 0.01, pufa: 0.05, n3: 0.01, n6: 0.04, chol: 0, vitA: 1, vitC: 50, vitE: 0.2, vitB1: 0.04, vitB6: 0.04, folate: 13, ca: 7, fe: 0.0, k: 100, mg: 8, zn: 0.1, na: 1 } },
    { id: "ginger", name: "しょうが", cat: "plus", tone: "#D4B07A", defaultG: 8, n: { kcal: 30, carb: 6.6, protein: 0.9, fat: 0.3, sugar: 1.7, fiber: 2.0, fructose: 0.6, glucose: 0.6, starch: 1.2, oligo: 0.1, leu: 40, lys: 30, val: 28, ile: 22, gln: 50, arg: 35, sat: 0.2, mufa: 0.04, pufa: 0.05, n3: 0.01, n6: 0.04, chol: 0, vitA: 0, vitC: 2, vitE: 0, vitB1: 0.03, vitB6: 0.16, folate: 9, ca: 12, fe: 0.5, k: 270, mg: 26, zn: 0.2, na: 6 } },
    { id: "whey", name: "ホエイプロテイン", cat: "plus", tone: "#D8C8B0", defaultG: 20, n: { kcal: 396, carb: 6.5, protein: 82.0, fat: 5.0, sugar: 4.0, fiber: 0, fructose: 0, glucose: 0, starch: 0, oligo: 0, leu: 10500, lys: 9500, val: 5500, ile: 6000, gln: 14000, arg: 2200, sat: 2.0, mufa: 1.2, pufa: 0.6, n3: 0.1, n6: 0.5, chol: 70, vitA: 0, vitC: 0, vitE: 0, vitB1: 0.20, vitB6: 0.20, folate: 20, ca: 500, fe: 1.0, k: 500, mg: 80, zn: 3.0, na: 180 } },
    { id: "other-kinako", name: "きなこ", aliases: ["きな粉"], cat: "plus", tone: "#D4B46A", defaultG: 10, source: "日本食品標準成分表2020（八訂）大豆 きな粉 全粒大豆", n: n({ kcal: 451, carb: 31.0, protein: 35.5, fat: 23.4, sugar: 7.0, fiber: 18.1, starch: 6, oligo: 4, leu: 2700, lys: 2100, val: 1700, ile: 1600, gln: 5500, arg: 2400, sat: 3.2, mufa: 5.0, pufa: 13.0, n3: 1.4, n6: 11.5, vitA: 1, vitE: 3.0, vitB1: 0.73, vitB6: 0.52, folate: 250, ca: 250, fe: 8.0, k: 1900, mg: 240, zn: 3.5, na: 3 }) },
    { id: "other-walnut", name: "くるみ", aliases: ["walnut"], cat: "plus", tone: "#A06A3A", defaultG: 10, source: "日本食品標準成分表2020（八訂）くるみ いり", n: n({ kcal: 650, carb: 13.5, protein: 14.6, fat: 68.8, sugar: 2.6, fiber: 7.5, starch: 1, leu: 1100, lys: 400, val: 700, ile: 600, gln: 2500, arg: 2100, sat: 6.3, mufa: 9.0, pufa: 49.0, n3: 9.0, n6: 40.0, vitA: 1, vitE: 3.5, vitB1: 0.26, vitB6: 0.49, folate: 91, ca: 85, fe: 2.6, k: 540, mg: 150, zn: 2.8, na: 3 }) },
    { id: "other-almond", name: "アーモンド", aliases: ["almond"], cat: "plus", tone: "#C9A06A", defaultG: 10, source: "日本食品標準成分表2020（八訂）アーモンド いり 無塩", n: n({ kcal: 598, carb: 20.9, protein: 18.6, fat: 54.1, sugar: 4.2, fiber: 11.0, leu: 1400, lys: 550, val: 800, ile: 700, gln: 3500, arg: 2100, sat: 4.0, mufa: 34.0, pufa: 13.0, n3: 0.01, n6: 13.0, vitA: 0, vitE: 31.2, vitB1: 0.20, vitB6: 0.10, folate: 44, ca: 250, fe: 3.6, k: 740, mg: 310, zn: 3.6, na: 1 }) },
    { id: "other-cocoa", name: "ココアパウダー", aliases: ["カカオパウダー", "純ココア"], cat: "plus", tone: "#5A3A2A", defaultG: 6, source: "日本食品標準成分表2020（八訂）ココア ピュアココア", n: n({ kcal: 286, carb: 44.8, protein: 18.5, fat: 21.6, sugar: 1.0, fiber: 23.9, leu: 1100, lys: 900, val: 900, ile: 700, gln: 2500, arg: 1100, sat: 12.8, mufa: 7.0, pufa: 0.6, n3: 0.1, n6: 0.5, vitA: 0, vitE: 0.3, vitB1: 0.08, vitB6: 0.12, folate: 38, ca: 140, fe: 14.0, k: 2000, mg: 500, zn: 6.5, na: 16 }) },
    { id: "other-maple", name: "メープルシロップ", aliases: ["maple"], cat: "plus", tone: "#C47A2A", defaultG: 15, source: "日本食品標準成分表2020（八訂）／USDA maple syrup", n: n({ kcal: 257, carb: 67.0, protein: 0, fat: 0, sugar: 60.5, fructose: 1, glucose: 2, oligo: 0, vitB1: 0.07, vitB6: 0.00, ca: 102, fe: 0.1, k: 212, mg: 21, zn: 1.5, na: 12 }) },
    { id: "other-flax", name: "亜麻仁（いり）", aliases: ["フラックスシード", "あまに"], cat: "plus", tone: "#7A6A4A", defaultG: 8, source: "日本食品標準成分表2020（八訂）あまに いり", n: n({ kcal: 550, carb: 29.0, protein: 20.6, fat: 43.0, sugar: 1.5, fiber: 27.8, leu: 1200, lys: 800, val: 1000, ile: 800, gln: 3200, arg: 1800, sat: 3.7, mufa: 7.5, pufa: 29.0, n3: 23.0, n6: 5.9, vitE: 0.3, vitB1: 0.53, vitB6: 0.47, folate: 87, ca: 210, fe: 7.4, k: 680, mg: 380, zn: 4.3, na: 30 }) },
    { id: "other-sesame", name: "いりごま（白）", aliases: ["ごま", "白ごま"], cat: "plus", tone: "#E8D8B0", defaultG: 6, source: "日本食品標準成分表2020（八訂）ごま いり", n: n({ kcal: 603, carb: 18.8, protein: 20.3, fat: 54.1, sugar: 0.3, fiber: 12.6, leu: 1400, lys: 550, val: 1000, ile: 800, gln: 3300, arg: 2500, sat: 7.5, mufa: 20.0, pufa: 23.0, n3: 0.3, n6: 22.5, vitE: 0.2, vitB1: 0.40, vitB6: 0.64, folate: 83, ca: 1200, fe: 9.6, k: 400, mg: 370, zn: 5.5, na: 2 }) },
    { id: "other-lime", name: "ライム汁", aliases: ["ライム"], cat: "plus", tone: "#C6D45A", defaultG: 15, source: "日本食品標準成分表2020（八訂）ライム 果汁", n: n({ kcal: 27, carb: 9.1, protein: 0.4, fat: 0.1, sugar: 1.7, fiber: 0.4, fructose: 0.8, glucose: 0.8, leu: 18, lys: 14, val: 14, ile: 10, gln: 20, arg: 10, vitA: 1, vitC: 30, vitE: 0.2, vitB1: 0.03, vitB6: 0.04, folate: 8, ca: 14, fe: 0.1, k: 120, mg: 8, zn: 0.1, na: 1 }) }
  ];

  const NUTRIENT_FIELDS = [
    { key: "kcal", label: "エネルギー", unit: "kcal" },
    { key: "carb", label: "炭水化物", unit: "g" },
    { key: "protein", label: "たんぱく質", unit: "g" },
    { key: "fat", label: "脂質", unit: "g" },
    { key: "sugar", label: "糖質", unit: "g" },
    { key: "fiber", label: "食物繊維", unit: "g" },
    { key: "vitC", label: "ビタミンC", unit: "mg" },
    { key: "vitA", label: "ビタミンA", unit: "μg" },
    { key: "ca", label: "カルシウム", unit: "mg" },
    { key: "fe", label: "鉄", unit: "mg" },
    { key: "k", label: "カリウム", unit: "mg" },
    { key: "mg", label: "マグネシウム", unit: "mg" }
  ];

  return { RDA, GROUPS, CATEGORIES, INGREDIENTS, OTHER_FOODS, NUTRIENT_FIELDS, MAX_ITEMS: 10, MAX_SAVED: 100 };
})();
