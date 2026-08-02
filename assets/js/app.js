document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        if (value === null) return fallback;
        try { return JSON.parse(value); } catch { return value; }
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch { return false; }
    }
  };

  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const screens = [...document.querySelectorAll('.screen')];
  const navs = [...document.querySelectorAll('.nav-btn')];
  let toastTimer;
  let editingQuantityKey = null;

  function scrollTop() {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    requestAnimationFrame(() => { root.style.scrollBehavior = previous; });
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1900);
  }

  function showSubview(id) {
    document.querySelectorAll('#more .subview').forEach((view) => {
      const active = view.id === id;
      view.classList.toggle('active', active);
      view.setAttribute('aria-hidden', String(!active));
    });
    scrollTop();
  }

  function showScreen(id, resetMore = true) {
    if (!document.getElementById(id)) return;
    screens.forEach((screen) => {
      const active = screen.id === id;
      screen.classList.toggle('active', active);
      screen.setAttribute('aria-hidden', String(!active));
    });
    navs.forEach((nav) => {
      const active = nav.dataset.screen === id;
      nav.classList.toggle('active', active);
      nav.setAttribute('aria-current', active ? 'page' : 'false');
    });
    if (id === 'more' && resetMore) showSubview('moreTop');
    scrollTop();
  }

  navs.forEach((nav) => nav.addEventListener('click', () => showScreen(nav.dataset.screen)));
  document.querySelectorAll('[data-go]').forEach((button) => {
    button.addEventListener('click', () => {
      showScreen(button.dataset.go, !button.dataset.subview);
      if (button.dataset.subview) showSubview(button.dataset.subview);
    });
  });
  document.querySelectorAll('[data-subview]:not([data-go])').forEach((button) => {
    button.addEventListener('click', () => showSubview(button.dataset.subview));
  });
  document.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => showSubview('moreTop'));
  });

  const planTabs = [...document.querySelectorAll('.plan-tab')];
  const baseCost = 28360 + 14800 + 20000;
  let estimatedTotal = 86160;
  let selectedPlan = 'a';

  const budgetItems = [...document.querySelectorAll('.cost[data-budget-key]')];
  const savedBudget = storage.get('sekiTripBudget', {});
  if (savedBudget && typeof savedBudget === 'object' && !Array.isArray(savedBudget)) {
    budgetItems.forEach((input) => {
      if (Object.prototype.hasOwnProperty.call(savedBudget, input.dataset.budgetKey)) {
        input.checked = Boolean(savedBudget[input.dataset.budgetKey]);
      }
    });
  }

  function saveBudget() {
    storage.set('sekiTripBudget', Object.fromEntries(
      budgetItems.map((input) => [input.dataset.budgetKey, input.checked])
    ));
  }

  function updateTotal() {
    let value = baseCost;
    document.querySelectorAll('.cost:checked').forEach((input) => {
      value += Number(input.dataset.cost || 0);
    });
    estimatedTotal = value;
    const formatted = value.toLocaleString('ja-JP');
    document.getElementById('total').textContent = formatted + '円';
    document.getElementById('perPerson').textContent =
      '1人あたり 約' + Math.round(value / 8).toLocaleString('ja-JP') + '円';
    updateExpenseSummary();
  }

  function setPlan(value, notify = false) {
    selectedPlan = value === 'b' ? 'b' : 'a';
    planTabs.forEach((button) => {
      const active = button.dataset.plan === selectedPlan;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.getElementById('planA').classList.toggle('active', selectedPlan === 'a');
    document.getElementById('planB').classList.toggle('active', selectedPlan === 'b');
    document.getElementById(selectedPlan === 'a' ? 'costA' : 'costB').checked = true;
    document.getElementById('heroPlanName').textContent =
      selectedPlan === 'a' ? 'PLAN A · 海水浴' : 'PLAN B · 神社・絶景';
    storage.set('sekiTripPlan', selectedPlan);
    updateTotal();
    renderShots();
    updateNextAction();
    if (notify) showToast(selectedPlan === 'a' ? 'プランAに切り替えました' : 'プランBに切り替えました');
  }

  planTabs.forEach((button) => button.addEventListener('click', () => setPlan(button.dataset.plan, true)));
  document.querySelectorAll('.cost').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.classList.contains('course-cost')) setPlan(input.id === 'costB' ? 'b' : 'a', true);
      else { saveBudget(); updateTotal(); }
    });
  });

  const TRIP_EVENTS = {
    a: [
      ['2026-08-03T07:00:00+09:00', '07:00', '湊町を出発', '飲み物・酔い止め・モバイルバッテリーを最終確認。'],
      ['2026-08-03T09:45:00+09:00', '09:45', '伊根湾めぐり遊覧船', '乗船前に家族の集合カット。出航動画も忘れずに。'],
      ['2026-08-03T10:30:00+09:00', '10:30', '伊根の舟屋散策', 'ワイド、家族、路地のディテールを撮影。'],
      ['2026-08-03T11:00:00+09:00', '11:00', '舟屋食堂でランチ', '現金を用意。海鮮の寄りと食べる表情を撮る。'],
      ['2026-08-03T12:20:00+09:00', '12:20', '泊海水浴場', '水着・タオル・日焼け止め。約60分。'],
      ['2026-08-03T14:00:00+09:00', '14:00', '10号館で鍵を受け取る', 'チェックインは14:00〜15:00。鍵を受け取ってから「はなもみじ」へ。'],
      ['2026-08-03T17:30:00+09:00', '17:30', 'BBQスタート', '前菜から。サーロインは全員が揃ってから。'],
      ['2026-08-04T11:00:00+09:00', '11:00', 'はなもみじをチェックアウト', '忘れ物、冷蔵庫、充電器、ゴミ、鍵を確認。'],
      ['2026-08-04T12:30:00+09:00', '12:30', '美山の前に昼食', '道の駅や軽食で先に昼食を済ませる。'],
      ['2026-08-04T13:30:00+09:00', '13:30', '美山かやぶきの里', '赤いポストと家族の後ろ姿を撮影。'],
      ['2026-08-04T17:30:00+09:00', '17:30', '大阪へ帰着', '車内でベストシーンと感想を収録。']
    ],
    b: [
      ['2026-08-03T07:00:00+09:00', '07:00', '湊町を出発', '飲み物・酔い止め・モバイルバッテリーを最終確認。'],
      ['2026-08-03T09:45:00+09:00', '09:45', '伊根湾めぐり遊覧船', '乗船前に家族の集合カット。出航動画も忘れずに。'],
      ['2026-08-03T10:30:00+09:00', '10:30', '伊根の舟屋散策', 'ワイド、家族、路地のディテールを撮影。'],
      ['2026-08-03T11:00:00+09:00', '11:00', '舟屋食堂でランチ', '現金を用意。食後は府中地区へ。'],
      ['2026-08-03T12:45:00+09:00', '12:45', '元伊勢籠神社', '参拝、御朱印、鳥居から歩く家族を撮る。'],
      ['2026-08-03T13:10:00+09:00', '13:10', '天橋立傘松公園', '股のぞきとリアクション動画を撮影。'],
      ['2026-08-03T14:00:00+09:00', '14:00', '10号館で鍵を受け取る', 'チェックインは14:00〜15:00。鍵を受け取ってから「はなもみじ」へ。'],
      ['2026-08-03T17:30:00+09:00', '17:30', 'BBQスタート', '前菜から。サーロインは全員が揃ってから。'],
      ['2026-08-04T11:00:00+09:00', '11:00', 'はなもみじをチェックアウト', '忘れ物、冷蔵庫、充電器、ゴミ、鍵を確認。'],
      ['2026-08-04T12:30:00+09:00', '12:30', '美山の前に昼食', '道の駅や軽食で先に昼食を済ませる。'],
      ['2026-08-04T13:30:00+09:00', '13:30', '美山かやぶきの里', '赤いポストと家族の後ろ姿を撮影。'],
      ['2026-08-04T17:30:00+09:00', '17:30', '大阪へ帰着', '車内でベストシーンと感想を収録。']
    ]
  };

  function updateNextAction() {
    const now = new Date();
    const events = TRIP_EVENTS[selectedPlan].map(([iso, time, title, meta]) => ({
      date: new Date(iso), time, title, meta
    }));
    const next = events.find((event) => event.date > now);
    const label = document.getElementById('nextActionLabel');
    const countdown = document.getElementById('nextCountdown');
    const time = document.getElementById('nextActionTime');
    const title = document.getElementById('nextActionTitle');
    const meta = document.getElementById('nextActionMeta');

    if (!next) {
      label.textContent = 'MEMORIES';
      countdown.textContent = 'TRIP COMPLETE';
      time.textContent = '2026';
      title.textContent = '旅の記録を見返そう';
      meta.textContent = '家族でベストショットとミッションの結果を振り返る。';
      return;
    }

    const diffMinutes = Math.max(0, Math.floor((next.date - now) / 60000));
    let text;
    if (diffMinutes >= 1440) text = 'あと' + Math.ceil(diffMinutes / 1440) + '日';
    else if (diffMinutes >= 60) text = 'あと' + Math.floor(diffMinutes / 60) + '時間' + (diffMinutes % 60) + '分';
    else text = 'あと' + diffMinutes + '分';
    label.textContent = now < events[0].date ? 'NEXT TRIP' : 'NEXT';
    countdown.textContent = text;
    time.textContent = next.time;
    title.textContent = next.title;
    meta.textContent = next.meta;
  }

  const CATEGORY_INFO = {
    meat: ['肉', 'MEAT'],
    seafood: ['海鮮・前菜', 'SEAFOOD & STARTERS'],
    vegetables: ['野菜', 'VEGETABLES'],
    hotdog: ['ホットドッグ', 'HOT DOG'],
    drinks: ['飲み物', 'DRINKS'],
    finish: ['締め・デザート', 'FINISH & DESSERT'],
    supplies: ['調味料・消耗品', 'SEASONING & TOOLS']
  };

  const SHOP_CATALOG = [
    ['beef-tongue','meat','厚切り牛タン','700g','🥩'],['sirloin','meat','みなもと牛サーロイン','800g','🥩'],['harami','meat','ハラミ','1.2kg','🥩'],['pork-belly','meat','厚切り豚バラ','500g','🐖'],['chicken-thigh','meat','鶏もも','600g','🐓'],['sausage','meat','大容量ソーセージ','800g','🌭'],
    ['shrimp','seafood','エビ','16尾','🦐'],['scallops','seafood','ホタテ','12個','🦪'],['camembert','seafood','カマンベール','2個','🧀'],['baguette','seafood','バゲット','2本','🥖'],
    ['onion','vegetables','玉ねぎ','2個','🧅'],['zucchini','vegetables','ズッキーニ','2本','🥒'],['paprika','vegetables','パプリカ','3個','🫑'],['asparagus','vegetables','アスパラ','2束','🌱'],['eringi','vegetables','エリンギ','4パック','🍄'],['corn','vegetables','とうもろこし','4本','🌽'],
    ['hotdog-buns','hotdog','ホットドッグ用パン','1袋','🥖'],['mustard','hotdog','マスタード','1本','🟡'],['pickles','hotdog','ピクルス','1瓶','🥒'],
    ['chuhai','drinks','チューハイ','10缶','🥫'],['beer','drinks','ビール','6缶','🍺'],['non-alcohol','drinks','ノンアルコール飲料','6缶','🥫'],['makers-mark','drinks','メイカーズマーク','小瓶 1本','🥃'],['juice','drinks','ジュース','2L × 2本','🧃'],['tea','drinks','お茶','2L × 2本','🍵'],['milk','drinks','牛乳','1本','🥛'],['sparkling-water','drinks','炭酸水','6本','🫧'],
    ['grilled-rice-ball','finish','焼きおにぎり','12個','🍙'],['yakisoba','finish','焼きそば','4玉','🍜'],['vanilla-ice-cream','finish','バニラアイス','2L','🍨'],
    ['salt','supplies','塩','1個','🧂'],['black-pepper','supplies','黒こしょう','1個','⚫'],['yakiniku-sauce','supplies','焼肉のタレ','1本','🥣'],['lemon','supplies','レモン','適量','🍋'],['butter','supplies','バター','1個','🧈'],['garlic','supplies','にんにく','1個','🧄'],['olive-oil','supplies','オリーブオイル','1本','🫒'],['honey','supplies','はちみつ','1本','🍯'],['soy-sauce','supplies','醤油','1本','🥣'],['teriyaki-sauce','supplies','照り焼きソース','1本','🥣'],['aluminum-tray','supplies','アルミ皿','数枚','🍽️'],['aluminum-foil','supplies','アルミホイル','1本','📦'],['kitchen-paper','supplies','キッチンペーパー','1個','🧻'],['garbage-bags','supplies','ゴミ袋','1組','🗑️'],['parsley','supplies','パセリ','1パック','🌿']
  ].map(([key, category, name, qty, emoji]) => ({ key, category, name, qty, emoji, custom: false }));

  const legacyShoppingGroups = [
    ['salt','black-pepper'],['yakiniku-sauce','lemon'],['butter','garlic'],
    ['olive-oil','honey'],['soy-sauce','teriyaki-sauce'],
    ['aluminum-tray','aluminum-foil'],['kitchen-paper','garbage-bags']
  ];

  function migrateShopping(saved) {
    if (!Array.isArray(saved)) return saved && typeof saved === 'object' ? saved : {};
    const state = {};
    SHOP_CATALOG.slice(0, 20).forEach((item, index) => { state[item.key] = Boolean(saved[index]); });
    legacyShoppingGroups.forEach((keys, index) => {
      keys.forEach((key) => { state[key] = Boolean(saved[20 + index]); });
    });
    return state;
  }

  let shoppingState = migrateShopping(storage.get('sekiTripShopping', {}));
  let shoppingQuantities = storage.get('sekiTripShoppingQuantities', {});
  if (!shoppingQuantities || typeof shoppingQuantities !== 'object' || Array.isArray(shoppingQuantities)) shoppingQuantities = {};
  let customShopping = storage.get('sekiTripCustomShopping', []);
  if (!Array.isArray(customShopping)) customShopping = [];
  let shoppingCollapsed = storage.get('sekiTripShoppingCollapsed', {});
  if (!shoppingCollapsed || typeof shoppingCollapsed !== 'object' || Array.isArray(shoppingCollapsed)) shoppingCollapsed = {};

  function allShoppingItems() {
    return [...SHOP_CATALOG, ...customShopping.map((item) => ({ ...item, custom: true, emoji: item.emoji || '＋' }))];
  }

  function updateShoppingProgress() {
    const items = allShoppingItems();
    const done = items.filter((item) => shoppingState[item.key]).length;
    document.getElementById('shoppingProgressLabel').textContent = done + ' / ' + items.length;
    document.getElementById('shoppingProgressBar').style.width = (items.length ? done / items.length * 100 : 0) + '%';
    Object.keys(CATEGORY_INFO).forEach((category) => {
      const categoryItems = items.filter((item) => item.category === category);
      const categoryDone = categoryItems.filter((item) => shoppingState[item.key]).length;
      const label = document.getElementById('shop-progress-' + category);
      if (label) label.textContent = categoryDone + ' / ' + categoryItems.length;
    });
  }

  function renderShopping() {
    const container = document.getElementById('shopCategories');
    const items = allShoppingItems();
    container.innerHTML = Object.entries(CATEGORY_INFO).map(([category, [title, english]]) => {
      const collapsed = Boolean(shoppingCollapsed[category]);
      const rows = items.filter((item) => item.category === category).map((item) => {
        const qty = shoppingQuantities[item.key] || item.qty;
        return '<div class="shop-item-row ' + (shoppingState[item.key] ? 'checked' : '') + '" data-shop-key="' + escapeHTML(item.key) + '">' +
          '<label><input class="shop-item" data-state-key="' + escapeHTML(item.key) + '" type="checkbox" ' + (shoppingState[item.key] ? 'checked' : '') + '>' +
          '<span class="item-copy"><b>' + escapeHTML(item.name) + '</b><small>' + escapeHTML(qty) + '</small></span></label>' +
          '<button type="button" class="qty-edit" data-qty-key="' + escapeHTML(item.key) + '">数量変更</button>' +
          (item.custom ? '<button type="button" class="delete-item" data-delete-shop="' + escapeHTML(item.key) + '" aria-label="' + escapeHTML(item.name) + 'を削除">×</button>' : '<span class="shop-emoji">' + item.emoji + '</span>') +
          '</div>';
      }).join('');
      return '<section class="shop-category ' + (collapsed ? 'collapsed' : '') + '" data-shop-category="' + category + '">' +
        '<button type="button" class="shop-category-head" data-shop-category-toggle="' + category + '" aria-expanded="' + String(!collapsed) + '"><div><p class="kicker dark">' + english + '</p><h2>' + title + '</h2></div><span class="shop-category-progress" id="shop-progress-' + category + '">0 / 0</span><i class="shop-category-chevron" aria-hidden="true">›</i></button>' +
        '<div class="shop-list"' + (collapsed ? ' hidden' : '') + '>' + (rows || '<p class="empty-note">項目なし</p>') + '</div></section>';
    }).join('');

    container.querySelectorAll('[data-shop-category-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const category = button.dataset.shopCategoryToggle;
        const section = button.closest('.shop-category');
        const list = section.querySelector('.shop-list');
        const collapsed = !section.classList.contains('collapsed');
        shoppingCollapsed[category] = collapsed;
        storage.set('sekiTripShoppingCollapsed', shoppingCollapsed);
        section.classList.toggle('collapsed', collapsed);
        list.hidden = collapsed;
        button.setAttribute('aria-expanded', String(!collapsed));
      });
    });

    container.querySelectorAll('.shop-item').forEach((input) => {
      input.addEventListener('change', () => {
        shoppingState[input.dataset.stateKey] = input.checked;
        storage.set('sekiTripShopping', shoppingState);
        input.closest('.shop-item-row').classList.toggle('checked', input.checked);
        updateShoppingProgress();
      });
    });
    container.querySelectorAll('[data-qty-key]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.qtyKey;
        const item = items.find((entry) => entry.key === key);
        const current = shoppingQuantities[key] || item.qty;
        editingQuantityKey = key;
        document.getElementById('quantityModalTitle').textContent = item.name + 'の数量';
        const input = document.getElementById('quantityModalInput');
        input.value = current;
        const modal = document.getElementById('quantityModal');
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        window.setTimeout(() => { input.focus(); input.select(); }, 50);
      });
    });
    container.querySelectorAll('[data-delete-shop]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.deleteShop;
        const item = customShopping.find((entry) => entry.key === key);
        if (!item || !window.confirm('「' + item.name + '」を削除しますか？')) return;
        customShopping = customShopping.filter((entry) => entry.key !== key);
        delete shoppingState[key];
        delete shoppingQuantities[key];
        storage.set('sekiTripCustomShopping', customShopping);
        storage.set('sekiTripShopping', shoppingState);
        storage.set('sekiTripShoppingQuantities', shoppingQuantities);
        renderShopping();
      });
    });
    updateShoppingProgress();
  }

  function closeQuantityModal() {
    const modal = document.getElementById('quantityModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    editingQuantityKey = null;
  }

  document.querySelectorAll('[data-close-quantity]').forEach((button) => button.addEventListener('click', closeQuantityModal));
  document.getElementById('saveQuantity').addEventListener('click', () => {
    if (!editingQuantityKey) return;
    const item = allShoppingItems().find((entry) => entry.key === editingQuantityKey);
    const trimmed = document.getElementById('quantityModalInput').value.trim().slice(0, 20);
    if (!trimmed || !item) return;
    shoppingQuantities[editingQuantityKey] = trimmed;
    storage.set('sekiTripShoppingQuantities', shoppingQuantities);
    closeQuantityModal();
    renderShopping();
    showToast(item.name + 'を「' + trimmed + '」に変更');
  });
  document.getElementById('quantityModalInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') document.getElementById('saveQuantity').click();
    if (event.key === 'Escape') closeQuantityModal();
  });

  document.getElementById('addShoppingItem').addEventListener('click', () => {
    const nameInput = document.getElementById('customItemName');
    const qtyInput = document.getElementById('customItemQty');
    const name = nameInput.value.trim();
    const qty = qtyInput.value.trim() || '数量未定';
    if (!name) { showToast('商品名を入力してください'); nameInput.focus(); return; }
    const key = 'custom-' + Date.now().toString(36);
    customShopping.push({
      key, name: name.slice(0, 40), qty: qty.slice(0, 20),
      category: document.getElementById('customItemCategory').value, emoji: '＋'
    });
    storage.set('sekiTripCustomShopping', customShopping);
    nameInput.value = '';
    qtyInput.value = '';
    renderShopping();
    showToast(name + 'を追加しました');
  });

  document.getElementById('resetShopping').addEventListener('click', () => {
    if (!window.confirm('買い出しチェックをすべて解除しますか？')) return;
    allShoppingItems().forEach((item) => { shoppingState[item.key] = false; });
    storage.set('sekiTripShopping', shoppingState);
    renderShopping();
    showToast('買い出しチェックを解除しました');
  });

  const SHOT_CATEGORIES = {
    opening:['旅のはじまり','OPENING'], ine:['伊根・舟屋','INE'], lunch:['海鮮ランチ','LUNCH'],
    beach:['海水浴','PLAN A'], planb:['神社・絶景','PLAN B'], villa:['ヴィラ到着','VILLA'],
    bbq:['BBQ','DINNER'], miyama:['美山','DAY 2'], ending:['旅の終わり','ENDING']
  };
  const SHOTS = [
    ['departure-family','opening','出発前、家族全員集合','家を背景に横位置。全員の足元まで入れる。','W','横写真'],
    ['loading-car','opening','荷物を積む手元','トランク越しに、バッグと手の動きを寄りで。','C','横動画'],
    ['first-road','opening','高速へ向かう車窓','フロントガラス越し。標識と朝の光を5秒固定。','V','縦動画'],
    ['boat-departure','ine','遊覧船が岸を離れる瞬間','船尾側から岸が遠ざかる画。10秒固定。','W','横動画'],
    ['seagull-track','ine','カモメを追う','鳥を画面中央に置かず、進行方向に余白。','M','60fps動画'],
    ['boat-reaction','ine','船上の家族リアクション','海を背景に斜め45度。笑顔は自然に。','C','横動画'],
    ['funaya-wide','ine','舟屋の全景','水面を下1/3、舟屋を中央、山を上に。','W','横写真'],
    ['funaya-family','ine','舟屋を背景に家族全員','舟屋を隠さない位置で人物は画面の1/3。','W','横写真'],
    ['ine-walk','ine','舟屋の路地を歩く後ろ姿','腰の高さからゆっくり追いかける。','M','横動画'],
    ['ine-details','ine','舟屋のディテール3点','木の扉、舟、波紋を各3秒ずつ。','C','素材動画'],
    ['seafood-top','lunch','海鮮を真上から','料理が揃ってから。箸を入れる前に1枚。','C','縦写真'],
    ['first-bite','lunch','最初のひと口リアクション','食べる人→料理の順で短く。','C','横動画'],
    ['kids-at-sea','beach','子どもが海へ走る後ろ姿','波打ち際まで低い位置から追う。','M','60fps動画','a'],
    ['splash-slow','beach','水しぶきの瞬間','太陽を斜め後ろに。短いスロー素材。','M','60fps動画','a'],
    ['feet-wave','beach','家族の足元と波','全員の足を横一列。波が来るまで固定。','C','横動画','a'],
    ['beach-wide','beach','海と家族の引き','人物を小さく、夏の景色を主役に。','W','横写真','a'],
    ['shrine-approach','planb','鳥居へ歩く家族','鳥居を額縁にして中央奥へ歩く。','W','横動画','b'],
    ['prayer-detail','planb','参拝する手元','鈴、手、礼の動きを静かに寄る。','C','縦動画','b'],
    ['kasamatsu-view','planb','天橋立のパノラマ','最初と最後を3秒止めてゆっくり振る。','W','横動画','b'],
    ['matanozoki','planb','股のぞきリアクション','先に景色、次に表情。撮り直しは1回だけ。','M','横動画','b'],
    ['villa-reaction','villa','ヴィラ初見リアクション','扉の内側から入ってくる家族を撮る。','W','横動画'],
    ['pool-wide','villa','プールとヴィラ全景','建物の縦線をまっすぐ。人物は小さめ。','W','横写真'],
    ['room-details','villa','部屋のディテール','鍵、ベッド、テラスを各3秒。','C','素材動画'],
    ['grill-opening','bbq','グリルのフタを開ける','湯気が出る瞬間。逆光気味で寄る。','C','60fps動画'],
    ['steak-sear','bbq','サーロインの焼き目','置く瞬間→音→焼き目の3カット。','C','横動画'],
    ['steak-hands','bbq','ステーキを切り分ける手元','包丁の斜め前から。断面にピント。','C','60fps動画'],
    ['sunset-toast','bbq','夕方の乾杯','グラスを中央、夕空を背景に。2テイク。','C','横動画'],
    ['family-table','bbq','食卓を囲む家族全員','テーブル端から広角。食べ始めの自然な会話。','W','横動画'],
    ['miyama-walk','miyama','茅葺きの里を歩く後ろ姿','道をリード線にして、ゆっくり追う。','M','横動画'],
    ['red-post','miyama','赤いポストと子ども','ポストを左1/3、茅葺きを奥に。','W','縦写真'],
    ['kayabuki-wide','miyama','茅葺き屋根の全景','空を入れすぎず、屋根と田園を主役に。','W','横写真'],
    ['miyama-details','miyama','美山の素材3点','屋根、草、水路を各3秒固定。','C','素材動画'],
    ['car-comments','ending','車内で旅の感想','1人ひと言。「一番よかったのは？」','C','横動画'],
    ['best-moment','ending','子どものベスト場面','本人に今日のNo.1を選んでもらう。','C','縦動画'],
    ['last-road','ending','帰り道のラストカット','夕方の車窓を10秒固定。','W','横動画']
  ].map(([key,category,title,composition,frame,format,plan]) => ({key,category,title,composition,frame,format,plan}));

  const legacyShotKeys = ['departure-family','boat-departure','funaya-family','kids-at-sea','villa-reaction','steak-hands','sunset-toast','miyama-walk'];
  function migrateState(saved, legacyKeys) {
    if (Array.isArray(saved)) return Object.fromEntries(legacyKeys.map((key, index) => [key, Boolean(saved[index])]));
    return saved && typeof saved === 'object' ? saved : {};
  }
  let shotState = migrateState(storage.get('sekiTripShooting', {}), legacyShotKeys);

  function visibleShots() {
    return SHOTS.filter((shot) => !shot.plan || shot.plan === selectedPlan);
  }

  function updateShotProgress() {
    const shots = visibleShots();
    const done = shots.filter((shot) => shotState[shot.key]).length;
    document.getElementById('shootProgress').textContent = done + ' / ' + shots.length;
    document.getElementById('shootProgressBar').style.width = (shots.length ? done / shots.length * 100 : 0) + '%';
    Object.keys(SHOT_CATEGORIES).forEach((category) => {
      const categoryShots = shots.filter((shot) => shot.category === category);
      const label = document.getElementById('shot-progress-' + category);
      if (label) label.textContent = categoryShots.filter((shot) => shotState[shot.key]).length + ' / ' + categoryShots.length;
    });
  }

  function renderShots() {
    const container = document.getElementById('shotList');
    if (!container) return;
    const shots = visibleShots();
    container.innerHTML = Object.entries(SHOT_CATEGORIES).map(([category, [title, english]]) => {
      const entries = shots.filter((shot) => shot.category === category);
      if (!entries.length) return '';
      const cards = entries.map((shot) =>
        '<label class="shot-card ' + (shotState[shot.key] ? 'checked' : '') + '">' +
          '<span class="shot-frame">' + shot.frame + '</span>' +
          '<span class="shot-copy"><b>' + shot.title + '</b><p>' + shot.composition + '</p><small>' + shot.format + '</small></span>' +
          '<input class="shoot-item" data-state-key="' + shot.key + '" type="checkbox" ' + (shotState[shot.key] ? 'checked' : '') + '>' +
        '</label>'
      ).join('');
      return '<section class="shot-category"><div class="shot-category-head"><div><p class="kicker dark">' + english + '</p><h2>' + title + '</h2></div><span id="shot-progress-' + category + '">0 / 0</span></div>' + cards + '</section>';
    }).join('');
    container.querySelectorAll('.shoot-item').forEach((input) => {
      input.addEventListener('change', () => {
        shotState[input.dataset.stateKey] = input.checked;
        storage.set('sekiTripShooting', shotState);
        input.closest('.shot-card').classList.toggle('checked', input.checked);
        updateShotProgress();
      });
    });
    updateShotProgress();
  }

  document.getElementById('resetShoot').addEventListener('click', () => {
    if (!window.confirm('撮影チェックをすべて解除しますか？')) return;
    SHOTS.forEach((shot) => { shotState[shot.key] = false; });
    storage.set('sekiTripShooting', shotState);
    renderShots();
    showToast('撮影チェックを解除しました');
  });

  function persistStatic(selector, key, legacyKeys, onUpdate) {
    const items = [...document.querySelectorAll(selector)];
    const state = migrateState(storage.get(key, {}), legacyKeys);
    items.forEach((input) => {
      input.checked = Boolean(state[input.dataset.stateKey]);
      input.closest('label')?.classList.toggle('checked', input.checked);
      input.addEventListener('change', () => {
        state[input.dataset.stateKey] = input.checked;
        storage.set(key, state);
        input.closest('label')?.classList.toggle('checked', input.checked);
        onUpdate(items);
      });
    });
    onUpdate(items);
    return {items, state};
  }

  const todoData = persistStatic('.todo', 'sekiTripTodos',
    ['cash-card','mobile-battery','sunscreen','sunglasses','dji-mic','cooler-bag','swimwear-towels','black-apron'],
    (items) => {
      const done = items.filter((item) => item.checked).length;
      document.getElementById('todoProgress').textContent = done + ' / ' + items.length;
      document.getElementById('homePackingProgress').textContent = done + ' / ' + items.length;
    }
  );

  document.getElementById('resetTodos').addEventListener('click', () => {
    if (!window.confirm('持ち物チェックをすべて解除しますか？')) return;
    todoData.items.forEach((item) => {
      item.checked = false;
      todoData.state[item.dataset.stateKey] = false;
      item.closest('label')?.classList.remove('checked');
    });
    storage.set('sekiTripTodos', todoData.state);
    document.getElementById('todoProgress').textContent = '0 / ' + todoData.items.length;
    document.getElementById('homePackingProgress').textContent = '0 / ' + todoData.items.length;
    showToast('持ち物チェックを解除しました');
  });

  const MISSIONS = [
    ['listen-sea-sounds','ine','👂','海から聞こえる音を3つ探す',10],['boat-captain','ine','🚢','遊覧船の船長ポーズ',10],
    ['notice-funaya-detail','ine','🏘️','舟屋の好きな形を一つ説明する',15],['record-waves','ine','🎙️','伊根の波音を録音する',10],
    ['seafood-reporter','ine','🐟','ランチを食レポする',15],['remember-boat-guide','ine','💡','遊覧船の案内を一つ覚える',10],
    ['share-ine-impression','ine','💬','きょうだいと伊根の感想を交換する',15],['share-window-view','ine','🤝','船の窓際を譲り合う',15],
    ['funaya-question','ine','❓','舟屋の不思議を一つ考える',15],['sea-color-name','ine','🎨','海の色に名前をつける',10],
    ['wave-to-boat','ine','👋','すれ違う船に手を振る',10],['listen-waves-ten','ine','🌊','波音を静かに10秒聞く',15],
    ['ine-greeting','ine','☀️','伊根で元気にあいさつする',10],['favorite-funaya','ine','❤️','お気に入りの舟屋を決める',10],
    ['quiet-funaya','ine','🤫','舟屋の町を静かに10分歩く',20],
    ['help-bbq','bbq','🍖','BBQで一品手伝う',20],['veggie-hero','bbq','🥦','焼き野菜をひとつ食べる',15],
    ['grill-color-change','bbq','🎨','食材の焼く前後の違いを見つける',15],['listen-grill-sound','bbq','👂','食材が焼ける音を静かに聞く',15],
    ['prepare-own-dish','bbq','🍽️','自分の食器を準備する',10],['observe-sausage','bbq','🌭','ソーセージの焼き加減を観察する',10],
    ['clear-plates','bbq','🧹','食べ終わった皿を片付ける',15],['favorite-dish-reason','bbq','💬','好きだった料理と理由を伝える',10],
    ['wash-vegetables','bbq','💧','野菜を洗う',15],['carry-tableware','bbq','🥄','食器を安全に運ぶ',10],
    ['hotdog-builder','bbq','🌭','ホットドッグを完成させる',15],['manage-own-drink','bbq','🥤','自分の飲み物を管理する',10],
    ['remember-heat-setting','bbq','🔥','食材の火加減を一つ覚える',10],['wait-grill','bbq','⌛','焼けるまでつまみ食いせず待つ',15],
    ['sort-bbq-trash','bbq','♻️','BBQのゴミを分別する',20],
    ['family-jump','family','🕴️','家族全員でジャンプ写真',15],['dad-photo','family','📸','お父さんとツーショット',15],
    ['mom-photo','family','💐','お母さんとツーショット',15],['grandma-talk-together','family','😊','おばあちゃんの話を一緒に聞く',15],
    ['thank-you','family','🤝','家族の誰かにありがとうを言う',15],['siblings-together-photo','family','👧','きょうだい5人で写真に入る',15],
    ['manage-own-bag','family','🎒','自分の荷物を自分で管理する',10],['wait-for-family','family','🚶','遅れている家族を待つ',20],
    ['family-good-morning','family','☀️','家族全員におはようを言う',10],['sibling-high-five','family','🙌','きょうだい全員とハイタッチ',10],
    ['grandma-question-together','family','📖','おばあちゃんの話を聞いて質問する',15],['family-compliment','family','✨','家族の良いところを伝える',15],
    ['family-funny-face','family','😆','家族で変顔写真を撮る',10],['join-family-photo','family','🎬','声をかけられたら家族写真に集まる',20],
    ['listen-to-family','family','😄','家族の話を最後まで聞く',15],
    ['red-post-turn','miyama','📮','赤いポスト前で順番を守る',15],['favorite-roof-reason','miyama','🏠','好きな茅葺き屋根と理由を話す',15],
    ['quiet-walk','miyama','🤫','1分間静かに里を歩く',15],['nature-sound','miyama','🌿','美山の自然音を録音する',10],
    ['best-memory','miyama','🏆','旅の一番を発表する',20],['observe-insect-gently','miyama','🐞','虫を触らず静かに観察する',15],
    ['no-litter','miyama','🍃','ゴミを出さずに散策する',15],['describe-green','miyama','🎨','好きな緑色を言葉で表す',10],
    ['roof-sketch','miyama','✏️','茅葺き屋根を絵に描く',20],['miyama-greeting','miyama','☀️','美山で元気にあいさつする',10],
    ['listen-water','miyama','💧','水の音を静かに聞く',15],['protect-flowers','miyama','🌼','花を採らずに観察する',10],
    ['discuss-roof-difference','miyama','🔍','屋根の違いをみんなで一つ考える',15],['miyama-siblings-photo','miyama','📷','茅葺き屋根と5人で撮る',15],
    ['slow-village-walk','miyama','🚶','走らずゆっくり里を一周する',15],
    ['grandma-checkin','common','🎒','おばあちゃんに「大丈夫？」と声をかける',20],['offer-help','common','🤲','困っている人に一度声をかける',20],
    ['seatbelt-check','common','✅','シートベルトを声かけ確認する',10],['keep-car-clean','common','🧹','車内をきれいに保つ',15],
    ['own-drink-check','common','🥤','自分の飲み物を忘れず持つ',10],['remember-next-plan','common','📣','次の予定を聞いて覚える',10],
    ['thank-driver','common','🚙','運転ありがとうを伝える',15],['kind-word','common','🕊️','きょうだいに優しい言葉をかける',20],
    ['remember-window-view','common','⛰️','車窓の景色を一つ覚える',10],['car-song','common','🎵','車内でみんなと一曲歌う',10],
    ['travel-quiz','common','❓','旅行クイズを一問出す',15],['own-seat-check','common','👀','出発前に自分の席まわりを確認する',15],
    ['rest-stretch','common','🙆','休憩でみんなとストレッチする',10],['view-reporter','common','⛰️','車窓の発見を一つ発表する',10],
    ['smile-greeting','common','😊','自分から笑顔であいさつする',15]
  ].map(([key,category,emoji,title,xp]) => ({key,category,emoji,title,xp}));
  const TODDLER_MISSION_TITLES = {
    'listen-sea-sounds':'うみのおとを みっつ きこう','boat-captain':'ふねのせんちょうの ぽーずをしよう',
    'notice-funaya-detail':'すきな ふなやのかたちを はなそう','record-waves':'いねの なみのおとを とろう',
    'seafood-reporter':'おひるごはんの おいしさを はなそう','remember-boat-guide':'ふねのおはなしを ひとつ おぼえよう',
    'share-ine-impression':'きょうだいと いねのおはなしをしよう','share-window-view':'ふねのまどを じゅんばんにつかおう',
    'funaya-question':'ふなやの ふしぎを ひとつ かんがえよう','sea-color-name':'うみのいろに なまえをつけよう',
    'wave-to-boat':'ほかのふねに てをふろう','listen-waves-ten':'なみのおとを じゅうびょう きこう',
    'ine-greeting':'いねで げんきに あいさつしよう','favorite-funaya':'すきな ふなやを ひとつ えらぼう',
    'quiet-funaya':'ふなやのまちを しずかに あるこう',
    'help-bbq':'おりょうりを ひとつ てつだおう','veggie-hero':'やさいを ひとつ たべよう',
    'grill-color-change':'やくまえと あとの いろをみよう','listen-grill-sound':'やけるおとを きこう',
    'prepare-own-dish':'じぶんのおさらを じゅんびしよう','observe-sausage':'そーせーじが やけるのをみよう',
    'clear-plates':'じぶんのおさらを かたづけよう','favorite-dish-reason':'すきなおりょうりを はなそう',
    'wash-vegetables':'やさいを あらおう','carry-tableware':'おさらを ゆっくり はこぼう',
    'hotdog-builder':'ぱんに そーせーじを はさもう','manage-own-drink':'じぶんののみものを もとう',
    'remember-heat-setting':'ひのつよさを ひとつ おぼえよう','wait-grill':'やけるまで まとう',
    'sort-bbq-trash':'ごみを わけよう',
    'family-jump':'みんなで じゃんぷしゃしんを とろう','dad-photo':'おとうさんと ふたりで しゃしん',
    'mom-photo':'おかあさんと ふたりで しゃしん','grandma-talk-together':'おばあちゃんの おはなしを いっしょに きこう',
    'thank-you':'かぞくに ありがとうを いおう','siblings-together-photo':'きょうだい ごにんで しゃしん',
    'manage-own-bag':'じぶんのにもつを じぶんでもとう','wait-for-family':'おくれているひとを まとう',
    'family-good-morning':'みんなに おはようを いおう','sibling-high-five':'きょうだいみんなと はいたっち',
    'grandma-question-together':'おばあちゃんに ひとつ きいてみよう','family-compliment':'かぞくの すてきなところを いおう',
    'family-funny-face':'みんなで おもしろいかおの しゃしん','join-family-photo':'しゃしんだよと いわれたら あつまろう',
    'listen-to-family':'かぞくの おはなしを さいごまで きこう',
    'red-post-turn':'あかいぽすとの まえで じゅんばんをまとう','favorite-roof-reason':'すきな かやぶきやねを はなそう',
    'quiet-walk':'いっぷん しずかに あるこう','nature-sound':'みやまのおとを とろう',
    'best-memory':'たびで いちばん たのしかったことを はなそう','observe-insect-gently':'むしを さわらず そっとみよう',
    'no-litter':'ごみを おとさず あるこう','describe-green':'すきな みどりいろを はなそう',
    'roof-sketch':'かやぶきやねの えを かこう','miyama-greeting':'みやまで げんきに あいさつしよう',
    'listen-water':'みずのおとを きこう','protect-flowers':'はなを とらずに みよう',
    'discuss-roof-difference':'やねの ちがいを みんなで さがそう','miyama-siblings-photo':'かやぶきやねと ごにんで しゃしん',
    'slow-village-walk':'はしらず ゆっくり あるこう',
    'grandma-checkin':'おばあちゃんに だいじょうぶと きこう','offer-help':'こまっているひとに こえをかけよう',
    'seatbelt-check':'しーとべるとを つけたか きこう','keep-car-clean':'くるまのなかを きれいにしよう',
    'own-drink-check':'じぶんののみものを わすれずにもとう','remember-next-plan':'つぎにいくところを おぼえよう',
    'thank-driver':'うんてん ありがとうを いおう','kind-word':'きょうだいに やさしいことばを いおう',
    'remember-window-view':'くるまからみえた けしきを おぼえよう','car-song':'くるまで みんなとうたおう',
    'travel-quiz':'たびの もんだいを ひとつ だそう','own-seat-check':'じぶんのいすのまわりを みよう',
    'rest-stretch':'おやすみで からだを のばそう','view-reporter':'くるまからみつけたものを はなそう',
    'smile-greeting':'じぶんから にこにこ あいさつしよう'
  };
  const AGE_MISSION_TITLES = {
    'eldest-son': {
      'remember-boat-guide':'遊覧船の案内を要約して年下に伝える','share-window-view':'船の席を見て年下を窓側へ案内する','quiet-funaya':'年下へ声をかけて静かに舟屋を歩く',
      'help-bbq':'BBQの一品を準備から配膳まで担当する','remember-heat-setting':'食材に合う火加減を一つ説明する','sort-bbq-trash':'分別場所を作り、最後まで確認する',
      'manage-own-bag':'自分の荷物に加えて年下の忘れ物も確認する','wait-for-family':'最後尾を確認して家族を誘導する','grandma-question-together':'おばあちゃんの話を聞き、話題を広げる質問をする',
      'favorite-roof-reason':'茅葺き屋根の特徴を調べて家族に説明する','discuss-roof-difference':'屋根の違いと理由をみんなで考える','slow-village-walk':'歩くペースを見て年下と一緒に里を一周する',
      'grandma-checkin':'おばあちゃんの体調と荷物を気にかける','seatbelt-check':'出発前に全員のシートベルトを声かけ確認する','remember-next-plan':'次の予定と集合時刻を確認して家族へ伝える'
    },
    'eldest-daughter': {
      'notice-funaya-detail':'舟屋らしさが伝わる細部を一つ撮影する','record-waves':'波音を10秒、雑音を避けて録音する','seafood-reporter':'料理の見た目と味を短く食レポする',
      'grill-color-change':'焼く前後の色と質感の違いを写真に残す','favorite-dish-reason':'好きだった料理を理由つきで家族に紹介する','carry-tableware':'年下へ声をかけながら食器を安全に運ぶ',
      'family-jump':'全員が入るジャンプ写真の撮影を手伝う','siblings-together-photo':'きょうだい5人の自然な写真を残す','family-compliment':'家族の良いところを具体的に一つ伝える',
      'nature-sound':'美山らしい自然音を10秒きれいに録音する','describe-green':'美山の緑を自分らしい言葉で表現する','miyama-siblings-photo':'茅葺き屋根が入るきょうだい写真の構図を決める',
      'offer-help':'困っている家族に気づいて先に声をかける','remember-window-view':'車窓で見つけた景色を写真か言葉で残す','view-reporter':'車窓の発見を家族に分かりやすく紹介する'
    },
    'second-son': {
      'notice-funaya-detail':'形の違う舟屋を3軒見つける','remember-boat-guide':'船の案内を一つ覚えてクイズにする','funaya-question':'舟屋の「どうして？」を一つ見つける',
      'help-bbq':'安全にできるBBQの仕事を一つ担当する','observe-sausage':'ソーセージの食べごろを色で見つける','remember-heat-setting':'強火と弱火を見分ける',
      'manage-own-bag':'出発前に自分の荷物を3点確認する','wait-for-family':'家族が揃ったか一緒に数える','listen-to-family':'家族の話を途中でさえぎらず聞く',
      'favorite-roof-reason':'形の違う茅葺き屋根を2つ見つける','observe-insect-gently':'虫を驚かせず30秒観察する','discuss-roof-difference':'屋根の違うところを一つ発見する',
      'grandma-checkin':'おばあちゃんに荷物を持とうか聞く','remember-next-plan':'次に行く場所を覚えて答える','own-seat-check':'降りる前に自分の席の忘れ物を確認する'
    },
    'second-daughter': TODDLER_MISSION_TITLES,
    'third-daughter': {
      'listen-sea-sounds':'うみの おとを きこう','boat-captain':'せんちょう ぽーずを しよう','notice-funaya-detail':'すきな おうちを ゆびさそう','record-waves':'おとなと なみのおとを とろう','seafood-reporter':'おいしい！と いおう','remember-boat-guide':'ふねの おはなしを きこう','share-ine-impression':'きょうだいに にこっと しよう','share-window-view':'まどを じゅんばんこ しよう','funaya-question':'ふしぎな おうちを みつけよう','sea-color-name':'うみの いろを いおう','wave-to-boat':'おふねに てを ふろう','listen-waves-ten':'なみのおとを いっしょに きこう','ine-greeting':'こんにちはを いおう','favorite-funaya':'すきな おうちを えらぼう','quiet-funaya':'おとなと ゆっくり あるこう',
      'help-bbq':'おさらを ひとつ ならべよう','veggie-hero':'やさいを ひとくち たべよう','grill-color-change':'おにくの いろを みよう','listen-grill-sound':'じゅーの おとを きこう','prepare-own-dish':'じぶんの おさらを もとう','observe-sausage':'そーせーじを みつけよう','clear-plates':'おさらを おとなに わたそう','favorite-dish-reason':'すきな ごはんを ゆびさそう','wash-vegetables':'おとなと やさいを あらおう','carry-tableware':'からのおさらを ゆっくり はこぼう','hotdog-builder':'ぱんに そーせーじを はさもう','manage-own-drink':'じぶんの のみものを もとう','remember-heat-setting':'あついから はなれて みよう','wait-grill':'やけるまで まとう','sort-bbq-trash':'ごみを おとなに わたそう',
      'family-jump':'みんなと じゃんぷしよう','dad-photo':'おとうさんと しゃしんを とろう','mom-photo':'おかあさんと しゃしんを とろう','grandma-talk-together':'おばあちゃんの となりで きこう','thank-you':'ありがとうを いおう','siblings-together-photo':'きょうだいと しゃしんを とろう','manage-own-bag':'じぶんの かばんを もとう','wait-for-family':'みんなを まとう','family-good-morning':'おはようを いおう','sibling-high-five':'きょうだいと はいたっち','grandma-question-together':'おばあちゃんに おはなししてもらおう','family-compliment':'だいすきを つたえよう','family-funny-face':'おもしろい かおを しよう','join-family-photo':'しゃしんだよで あつまろう','listen-to-family':'おはなしを きこう',
      'red-post-turn':'あかい ぽすとを みつけよう','favorite-roof-reason':'すきな やねを ゆびさそう','quiet-walk':'そーっと あるこう','nature-sound':'とりや みずの おとを きこう','best-memory':'たのしかった えを えらぼう','observe-insect-gently':'むしを そっと みよう','no-litter':'ごみを おとなに わたそう','describe-green':'みどりを みつけよう','roof-sketch':'おうちの えを かこう','miyama-greeting':'こんにちはを いおう','listen-water':'みずの おとを きこう','protect-flowers':'おはなを そっと みよう','discuss-roof-difference':'ちがう やねを みつけよう','miyama-siblings-photo':'みんなと しゃしんを とろう','slow-village-walk':'おとなと てをつないで あるこう',
      'grandma-checkin':'おばあちゃんに だいじょうぶ？と きこう','offer-help':'おてつだい する？と きこう','seatbelt-check':'べるとを かちっと しよう','keep-car-clean':'ごみを ふくろに いれよう','own-drink-check':'のみものを もとう','remember-next-plan':'つぎは どこ？と きこう','thank-driver':'うんてん ありがとうを いおう','kind-word':'きょうだいに やさしく しよう','remember-window-view':'まどから すきなものを みつけよう','car-song':'くるまで うたおう','travel-quiz':'これなあに？と きこう','own-seat-check':'いすの まわりを おとなと みよう','rest-stretch':'ぐーっと のびよう','view-reporter':'みつけたものを ゆびさそう','smile-greeting':'にこにこ あいさつしよう'
    }
  };
  const MISSION_PROFILES = [
    ['eldest-son','優典','中学2年'],['eldest-daughter','綾菜','小学6年'],['second-son','慶典','小学3年'],
    ['second-daughter','杏菜','年長'],['third-daughter','波瑠菜','年少']
  ].map(([key,label,grade]) => ({key,label,grade}));
  const MISSION_RANKS = [
    'はじめての旅人','旅の見習い','発見ハンター','海の探検員',
    '舟屋ウォーカー','BBQルーキー','BBQサポーター','家族のムードメーカー',
    '旅のチームメイト','美山ネイチャー隊','思いやり名人','頼れる旅仲間',
    '海の京都マスター','家族旅エース','関家の旅名人','トリップマスター'
  ];
  const TODDLER_RANKS = [
    'はじめての たびびと','たびの みならい','はっけん めいじん','うみの たんけんたい',
    'ふなや さんぽたい','ばーべきゅー るーきー','ばーべきゅー おたすけたい','かぞくの にんきもの',
    'たびの なかま','みやまの しぜんたい','おもいやり めいじん','たよれる たびなかま',
    'うみのきょうと めいじん','かぞくたびの えーす','せきけの たびめいじん','たびの だいめいじん'
  ];
  const profileLabel = (key) => MISSION_PROFILES.find((profile) => profile.key === key)?.label || '優典';
  const profileKeys = new Set(MISSION_PROFILES.map((profile) => profile.key));
  const legacyMissionKeys = ['find-seagull','family-jump','dad-photo','help-bbq','find-red-post'];
  const oldMissionState = migrateState(storage.get('sekiTripKids', {}), legacyMissionKeys);
  const savedProfileStates = storage.get('sekiTripKidsByProfile', null);
  let missionStates = savedProfileStates && typeof savedProfileStates === 'object' && !Array.isArray(savedProfileStates)
    ? savedProfileStates : {family: oldMissionState};
  MISSION_PROFILES.forEach((profile) => {
    if (!missionStates[profile.key] || typeof missionStates[profile.key] !== 'object' || Array.isArray(missionStates[profile.key])) {
      missionStates[profile.key] = {};
    }
  });
  storage.set('sekiTripKidsByProfile', missionStates);

  let missionDevice = storage.get('sekiTripMissionDevice', null);
  if (['personal','toddler'].includes(missionDevice?.mode) && profileKeys.has(missionDevice.profile)) {
    missionDevice = {mode:'profile', profile:missionDevice.profile};
    storage.set('sekiTripMissionDevice', missionDevice);
  }
  if (!missionDevice || !['manager','profile'].includes(missionDevice.mode)) missionDevice = null;
  if (missionDevice?.mode === 'profile' && !profileKeys.has(missionDevice.profile)) missionDevice = null;
  let activeMissionProfile = missionDevice?.mode === 'profile' ? missionDevice.profile
    : (profileKeys.has(missionDevice?.activeProfile) ? missionDevice.activeProfile : 'eldest-son');
  let activeMissionCategory = 'all';

  const openModal = (modal) => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); };
  const closeModal = (modal) => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); };
  const currentMissionState = () => missionStates[activeMissionProfile];
  const isPreschoolProfile = (profileKey = activeMissionProfile) => ['second-daughter','third-daughter'].includes(profileKey);
  const isAssistedProfileMode = () => missionDevice?.mode === 'profile' && activeMissionProfile === 'third-daughter';
  const missionTitle = (mission, profileKey = activeMissionProfile) => AGE_MISSION_TITLES[profileKey]?.[mission.key] || mission.title;
  const rankIndexForCount = (count) => Math.min(Math.floor(count / 5), MISSION_RANKS.length - 1);
  const rankForCount = (count, profileKey = activeMissionProfile) => (isPreschoolProfile(profileKey) ? TODDLER_RANKS : MISSION_RANKS)[rankIndexForCount(count)];

  const rankUpModal = document.getElementById('rankUpModal');
  function showRankUp(profileList) {
    const uniqueProfiles = [...new Set(profileList)];
    document.getElementById('rankUpKicker').textContent = isPreschoolProfile() ? 'らんくあっぷ' : 'RANK UP';
    document.getElementById('rankUpTitle').textContent = uniqueProfiles.length === 1
      ? profileLabel(uniqueProfiles[0]) + (isPreschoolProfile(uniqueProfiles[0]) ? ' らんくあっぷ！' : ' ランクアップ！')
      : uniqueProfiles.length + '人がランクアップ！';
    document.getElementById('rankUpList').innerHTML = uniqueProfiles.map((profileKey) => {
      const count = missionStats(profileKey).completed.length;
      return '<div><span>' + escapeHTML(profileLabel(profileKey)) + '</span><strong>' + escapeHTML(rankForCount(count, profileKey)) + '</strong></div>';
    }).join('');
    openModal(rankUpModal);
  }
  document.querySelectorAll('[data-close-rank-up]').forEach((button) => {
    button.addEventListener('click', () => closeModal(rankUpModal));
  });

  function saveMissionStates() {
    storage.set('sekiTripKidsByProfile', missionStates);
  }

  function missionStats(profileKey) {
    const completed = MISSIONS.filter((mission) => missionStates[profileKey]?.[mission.key]);
    return {completed, xp: completed.reduce((sum, mission) => sum + mission.xp, 0)};
  }

  function updateMissionResult() {
    const result = missionStats(activeMissionProfile);
    const preschool = isPreschoolProfile();
    document.getElementById('missionResultTitle').textContent = profileLabel(activeMissionProfile) + (preschool ? 'の きろく' : 'の記録');
    document.getElementById('missionResultScore').textContent = result.completed.length + (preschool ? ' できた' : ' CLEAR');
    document.getElementById('missionResultSummary').textContent = rankForCount(result.completed.length) + ' · ' + result.xp + (preschool ? ' ぽいんと' : ' XP');
    document.getElementById('missionResultList').innerHTML = result.completed.length
      ? result.completed.map((mission) => '<span>' + mission.emoji + ' ' + escapeHTML(missionTitle(mission)) + '</span>').join('')
      : '<p>' + (preschool ? 'まだ できたものは ないよ。' : 'まだ達成したミッションはありません。') + '</p>';
    document.querySelector('.mission-result-note').textContent = isAssistedProfileMode()
      ? 'できたら おとなに おしえてね。きろくは かんりしゃが つけます。'
      : preschool && missionDevice?.mode === 'profile'
        ? 'このがめんを おやに みせよう。'
      : missionDevice?.mode === 'profile'
        ? 'この画面を親に見せて、家族の公式記録へ反映してもらおう。'
      : 'この端末の記録が家族の公式結果です。';
  }

  function updateMissions() {
    const {completed, xp} = missionStats(activeMissionProfile);
    const completedCount = completed.length;
    const rankIndex = rankIndexForCount(completedCount);
    const nextRankAt = Math.min((rankIndex + 1) * 5, MISSIONS.length);
    const rankProgress = completedCount >= MISSIONS.length ? 1 : (completedCount % 5) / 5;
    const label = profileLabel(activeMissionProfile);
    document.getElementById('kidsXp').textContent = xp;
    const preschool = isPreschoolProfile();
    document.getElementById('kidsProgress').textContent = completedCount + ' / ' + MISSIONS.length + (preschool ? ' できた' : ' ミッション');
    document.getElementById('rankNext').textContent = completedCount >= MISSIONS.length
      ? (preschool ? 'ぜんぶ できた！' : '全ミッションクリア！')
      : 'あと' + (nextRankAt - completedCount) + (preschool ? 'こで らんくあっぷ' : '個でランクアップ');
    document.getElementById('homeKidsProgress').textContent = label + ' ' + completedCount + ' / ' + MISSIONS.length;
    document.getElementById('missionRing').style.setProperty('--mission-progress', (rankProgress * 360) + 'deg');
    document.getElementById('kidsRank').textContent = rankForCount(completedCount);
    updateMissionResult();
  }

  function updateMissionDeviceUI() {
    const personal = missionDevice?.mode === 'profile';
    const preschool = isPreschoolProfile();
    const assisted = isAssistedProfileMode();
    document.getElementById('mission').classList.toggle('toddler-mode', preschool);
    document.getElementById('mission').classList.toggle('assisted-mode', assisted);
    document.getElementById('missionModeBadge').textContent = assisted ? 'おとなと いっしょ' : personal ? (preschool ? 'じぶんの きろく' : '自己記録') : '公式記録';
    document.getElementById('activeMissionProfileLabel').textContent = profileLabel(activeMissionProfile);
    document.getElementById('missionDeviceNote').textContent = assisted
      ? 'できたら おとなに おしえてね'
      : personal ? (preschool ? 'できたら おやに みせよう' : '達成後、結果画面を親に見せよう') : 'この端末が家族の公式記録です';
    document.getElementById('missionProfileTabs').hidden = personal;
    document.getElementById('openBatchMission').hidden = personal;
    document.querySelector('.mission-action-row').classList.toggle('personal', personal);
    document.getElementById('missionHeroTitle').innerHTML = preschool ? 'たびを あそびに<br>かえよう。' : '旅を遊びに<br>変えよう。';
    document.getElementById('missionKicker').textContent = preschool ? 'こども みっしょん' : 'KIDS QUEST';
    document.getElementById('missionHeroDescription').textContent = assisted
      ? 'みつけたら おとなに おしえてね。'
      : preschool ? 'みつける、てつだう、たのしむ。できたを あつめよう。'
      : '見つける、手伝う、笑わせる。家族でXPを集めよう。';
    document.getElementById('missionRankKicker').textContent = preschool ? 'いまの らんく' : 'YOUR RANK';
    document.getElementById('missionResultKicker').textContent = preschool ? 'けっか' : 'RESULT';
    document.getElementById('kidsXpLabel').textContent = preschool ? 'ぽいんと' : 'XP';
    document.getElementById('changeMissionMode').textContent = preschool ? 'つかうひとを かえる' : '端末設定';
    const categoryLabels = preschool
      ? {all:'すべて',common:'どこでも',ine:'いね',bbq:'ばーべきゅー',family:'かぞく',miyama:'みやま'}
      : {all:'すべて',common:'どこでも',ine:'伊根',bbq:'BBQ',family:'家族',miyama:'美山'};
    document.querySelectorAll('[data-mission-category]').forEach((button) => {
      button.textContent = categoryLabels[button.dataset.missionCategory];
    });
    document.getElementById('missionResultToggleLabel').textContent = missionResult.hidden
      ? (preschool ? 'できたものを みる' : '達成状況を確認')
      : (preschool ? 'できたものを とじる' : '達成状況を閉じる');
    document.getElementById('toggleMissionResult').setAttribute('aria-expanded', String(!missionResult.hidden));
    document.querySelectorAll('[data-mission-profile]').forEach((button) => {
      const active = button.dataset.missionProfile === activeMissionProfile;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.getElementById('resetKids').hidden = assisted;
    document.getElementById('resetKids').textContent = profileLabel(activeMissionProfile) + (preschool ? 'の みっしょんを やりなおす' : 'のミッションをリセット');
  }

  function renderMissions() {
    updateMissionDeviceUI();
    const state = currentMissionState();
    const assisted = isAssistedProfileMode();
    const grid = document.getElementById('kidsMissionGrid');
    const visibleMissions = MISSIONS.filter((mission) => activeMissionCategory === 'all' || mission.category === activeMissionCategory);
    grid.innerHTML = visibleMissions.map((mission) =>
      '<label class="mission-card ' + (state[mission.key] ? 'completed' : '') + '">' +
        '<input class="kids-item" data-state-key="' + mission.key + '" type="checkbox" ' + (state[mission.key] ? 'checked' : '') + (assisted ? ' disabled' : '') + '>' +
        '<span class="mission-emoji">' + mission.emoji + '</span><b>' + escapeHTML(missionTitle(mission)) + '</b><small>' + (assisted ? 'おとなに おしえてね' : '+' + mission.xp + (isPreschoolProfile() ? ' ぽいんと' : ' XP')) + '</small></label>'
    ).join('');
    grid.querySelectorAll('.kids-item').forEach((input) => {
      input.addEventListener('change', () => {
        const beforeCount = missionStats(activeMissionProfile).completed.length;
        currentMissionState()[input.dataset.stateKey] = input.checked;
        saveMissionStates();
        input.closest('.mission-card').classList.toggle('completed', input.checked);
        updateMissions();
        const afterCount = missionStats(activeMissionProfile).completed.length;
        if (input.checked && rankIndexForCount(afterCount) > rankIndexForCount(beforeCount)) {
          showRankUp([activeMissionProfile]);
        } else if (input.checked) {
          showToast(profileLabel(activeMissionProfile) + (isPreschoolProfile() ? ' できた！' : ' ミッションクリア！'));
        }
      });
    });
    updateMissions();
  }

  document.querySelectorAll('[data-mission-category]').forEach((button) => {
    button.addEventListener('click', () => {
      activeMissionCategory = button.dataset.missionCategory;
      document.querySelectorAll('[data-mission-category]').forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-pressed', String(active));
      });
      renderMissions();
    });
  });

  document.querySelectorAll('[data-mission-profile]').forEach((button) => {
    button.addEventListener('click', () => {
      if (missionDevice?.mode !== 'manager') return;
      activeMissionProfile = button.dataset.missionProfile;
      missionDevice = {mode:'manager', activeProfile:activeMissionProfile};
      storage.set('sekiTripMissionDevice', missionDevice);
      renderMissions();
    });
  });

  const missionModeModal = document.getElementById('missionModeModal');
  const cancelMissionMode = document.getElementById('cancelMissionMode');
  function showMissionModeSettings(firstRun = false) {
    cancelMissionMode.hidden = firstRun;
    openModal(missionModeModal);
  }
  document.getElementById('changeMissionMode').addEventListener('click', () => showMissionModeSettings(false));
  cancelMissionMode.addEventListener('click', () => closeModal(missionModeModal));
  document.querySelectorAll('[data-device-profile]').forEach((button) => {
    button.addEventListener('click', () => {
      const selected = button.dataset.deviceProfile;
      if (selected === 'manager') {
        missionDevice = {mode:'manager', activeProfile:profileKeys.has(activeMissionProfile) ? activeMissionProfile : 'eldest-son'};
        activeMissionProfile = missionDevice.activeProfile;
      } else {
        activeMissionProfile = selected;
        missionDevice = {mode:'profile', profile:activeMissionProfile};
      }
      storage.set('sekiTripMissionDevice', missionDevice);
      closeModal(missionModeModal);
      renderMissions();
    });
  });

  const missionResult = document.getElementById('missionResult');
  document.getElementById('toggleMissionResult').addEventListener('click', (event) => {
    missionResult.hidden = !missionResult.hidden;
    document.getElementById('missionResultToggleLabel').textContent = missionResult.hidden
      ? (isPreschoolProfile() ? 'できたものを みる' : '達成状況を確認')
      : (isPreschoolProfile() ? 'できたものを とじる' : '達成状況を閉じる');
    event.currentTarget.setAttribute('aria-expanded', String(!missionResult.hidden));
    if (!missionResult.hidden) missionResult.scrollIntoView({behavior:'smooth', block:'nearest'});
  });

  const batchModal = document.getElementById('batchMissionModal');
  document.getElementById('batchMissionSelect').innerHTML = MISSIONS.map((mission) =>
    '<option value="' + mission.key + '">' + escapeHTML(mission.title) + '</option>'
  ).join('');
  document.getElementById('batchProfileGrid').innerHTML = MISSION_PROFILES.map((profile) =>
    '<label><input type="checkbox" value="' + profile.key + '"><span>' + profile.label + '</span></label>'
  ).join('');
  document.getElementById('openBatchMission').addEventListener('click', () => {
    document.querySelectorAll('#batchProfileGrid input').forEach((input) => { input.checked = false; });
    openModal(batchModal);
  });
  document.querySelectorAll('[data-close-batch]').forEach((button) => button.addEventListener('click', () => closeModal(batchModal)));
  document.getElementById('saveBatchMission').addEventListener('click', () => {
    const selected = [...document.querySelectorAll('#batchProfileGrid input:checked')];
    if (!selected.length) { showToast('達成したメンバーを選んでください'); return; }
    const missionKey = document.getElementById('batchMissionSelect').value;
    const beforeCounts = Object.fromEntries(selected.map((input) => [input.value, missionStats(input.value).completed.length]));
    selected.forEach((input) => { missionStates[input.value][missionKey] = true; });
    saveMissionStates();
    closeModal(batchModal);
    renderMissions();
    const rankedUp = selected.map((input) => input.value).filter((profileKey) =>
      rankIndexForCount(missionStats(profileKey).completed.length) > rankIndexForCount(beforeCounts[profileKey])
    );
    if (rankedUp.length) showRankUp(rankedUp);
    else showToast(selected.length + '人分を公式記録に反映しました');
  });

  document.getElementById('resetKids').addEventListener('click', () => {
    const label = profileLabel(activeMissionProfile);
    if (isAssistedProfileMode()) return;
    if (!window.confirm(label + (isPreschoolProfile() ? 'の みっしょんを ぜんぶ やりなおす？' : 'のミッションをすべてリセットしますか？'))) return;
    missionStates[activeMissionProfile] = {};
    saveMissionStates();
    renderMissions();
    showToast(label + (isPreschoolProfile() ? 'の きろくを やりなおしたよ' : 'のミッションをリセットしました'));
  });

  if (!missionDevice) showMissionModeSettings(true);

  let expenses = storage.get('sekiTripExpenses', []);
  if (!Array.isArray(expenses)) expenses = [];

  function updateExpenseSummary() {
    const actual = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const remaining = estimatedTotal - actual;
    const actualEl = document.getElementById('actualTotal');
    const remainingEl = document.getElementById('budgetRemaining');
    if (!actualEl || !remainingEl) return;
    actualEl.textContent = actual.toLocaleString('ja-JP') + '円';
    remainingEl.textContent = (remaining < 0 ? '−' : '') + Math.abs(remaining).toLocaleString('ja-JP') + '円';
    remainingEl.style.color = remaining < 0 ? '#f3a297' : '';
  }

  function renderExpenses() {
    const list = document.getElementById('expenseList');
    if (!expenses.length) {
      list.innerHTML = '<p class="source-note">まだ支出はありません。支払ったらその場で追加できます。</p>';
    } else {
      list.innerHTML = expenses.slice().reverse().map((expense) =>
        '<article class="expense-item"><div><b>' + escapeHTML(expense.name) + '</b><small>' + escapeHTML(expense.category) + '</small></div>' +
        '<strong>' + Number(expense.amount).toLocaleString('ja-JP') + '円</strong>' +
        '<button type="button" data-delete-expense="' + escapeHTML(expense.id) + '" aria-label="' + escapeHTML(expense.name) + 'を削除">×</button></article>'
      ).join('');
      list.querySelectorAll('[data-delete-expense]').forEach((button) => {
        button.addEventListener('click', () => {
          expenses = expenses.filter((expense) => expense.id !== button.dataset.deleteExpense);
          storage.set('sekiTripExpenses', expenses);
          renderExpenses();
        });
      });
    }
    updateExpenseSummary();
  }

  document.getElementById('addExpense').addEventListener('click', () => {
    const nameInput = document.getElementById('expenseName');
    const amountInput = document.getElementById('expenseAmount');
    const name = nameInput.value.trim();
    const amount = Number(amountInput.value);
    if (!name) { showToast('支出内容を入力してください'); nameInput.focus(); return; }
    if (!Number.isFinite(amount) || amount <= 0) { showToast('金額を入力してください'); amountInput.focus(); return; }
    expenses.push({
      id: 'expense-' + Date.now().toString(36), name: name.slice(0, 40),
      amount: Math.round(amount), category: document.getElementById('expenseCategory').value,
      createdAt: new Date().toISOString()
    });
    storage.set('sekiTripExpenses', expenses);
    nameInput.value = '';
    amountInput.value = '';
    renderExpenses();
    showToast('支出を記録しました');
  });

  const bbqTabs = [...document.querySelectorAll('.bbq-tab')];
  function showBbqView(id) {
    bbqTabs.forEach((button) => button.classList.toggle('active', button.dataset.bbqView === id));
    document.querySelectorAll('.bbq-view').forEach((view) => {
      view.classList.toggle('active', view.id === 'bbq' + id.charAt(0).toUpperCase() + id.slice(1));
    });
    scrollTop();
  }
  bbqTabs.forEach((button) => button.addEventListener('click', () => showBbqView(button.dataset.bbqView)));

  let timerRemaining = 5 * 60;
  let timerEndsAt = 0;
  let timerInterval = 0;
  const timerDisplay = document.getElementById('timerDisplay');
  const timerStatus = document.getElementById('timerStatus');
  const timerStart = document.getElementById('timerStart');

  function renderTimer() {
    const minutes = Math.floor(timerRemaining / 60);
    const seconds = timerRemaining % 60;
    timerDisplay.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }
  function pauseTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = 0;
    timerStart.textContent = 'スタート';
  }
  function tickTimer() {
    timerRemaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
    renderTimer();
    if (timerRemaining === 0) {
      pauseTimer();
      timerStatus.textContent = '時間です。焼き加減を確認！';
      showToast('⏱ 時間です。焼き加減を確認！');
      navigator.vibrate?.([200, 100, 200]);
    }
  }
  document.querySelectorAll('[data-seconds]').forEach((button) => {
    button.addEventListener('click', () => {
      pauseTimer();
      timerRemaining = Number(button.dataset.seconds);
      timerStatus.textContent = button.childNodes[0].textContent.trim() + 'をセット';
      renderTimer();
    });
  });
  timerStart.addEventListener('click', () => {
    if (timerInterval) {
      tickTimer(); pauseTimer(); timerStatus.textContent = '一時停止中'; return;
    }
    if (timerRemaining <= 0) timerRemaining = 5 * 60;
    timerEndsAt = Date.now() + timerRemaining * 1000;
    timerInterval = setInterval(tickTimer, 250);
    timerStart.textContent = '一時停止';
    timerStatus.textContent = '計測中';
    tickTimer();
  });
  document.getElementById('timerReset').addEventListener('click', () => {
    pauseTimer(); timerRemaining = 5 * 60; timerStatus.textContent = '5分をセット'; renderTimer();
  });

  renderShopping();
  renderMissions();
  renderExpenses();
  setPlan(storage.get('sekiTripPlan', 'a'));
  updateNextAction();
  setInterval(updateNextAction, 60000);
  renderTimer();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', async () => {
      const hadController = Boolean(navigator.serviceWorker.controller);
      try {
        await navigator.serviceWorker.register('./sw.js', {scope:'./'});
        if (hadController) {
          let reloading = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloading) return;
            reloading = true;
            location.reload();
          });
        }
      } catch {
        // Online use remains available if registration is unavailable.
      }
    });
  }
});
