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
  const baseCost = 28000 + 14800 + 20000;
  let estimatedTotal = 85800;
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
      ['2026-08-03T14:30:00+09:00', '14:30', 'ヴィラへチェックイン', '冷蔵品を入れて、プールとBBQ準備。'],
      ['2026-08-03T17:30:00+09:00', '17:30', 'BBQスタート', '前菜から。サーロインは全員が揃ってから。'],
      ['2026-08-04T10:00:00+09:00', '10:00', 'ヴィラを出発', '忘れ物、冷蔵庫、充電器を確認。'],
      ['2026-08-04T11:30:00+09:00', '11:30', '美山かやぶきの里', '赤いポストと家族の後ろ姿を撮影。'],
      ['2026-08-04T16:00:00+09:00', '16:00', '大阪へ帰着', '車内でベストシーンと感想を収録。']
    ],
    b: [
      ['2026-08-03T07:00:00+09:00', '07:00', '湊町を出発', '飲み物・酔い止め・モバイルバッテリーを最終確認。'],
      ['2026-08-03T09:45:00+09:00', '09:45', '伊根湾めぐり遊覧船', '乗船前に家族の集合カット。出航動画も忘れずに。'],
      ['2026-08-03T10:30:00+09:00', '10:30', '伊根の舟屋散策', 'ワイド、家族、路地のディテールを撮影。'],
      ['2026-08-03T11:00:00+09:00', '11:00', '舟屋食堂でランチ', '現金を用意。食後は府中地区へ。'],
      ['2026-08-03T12:45:00+09:00', '12:45', '元伊勢籠神社', '参拝、御朱印、鳥居から歩く家族を撮る。'],
      ['2026-08-03T13:10:00+09:00', '13:10', '天橋立傘松公園', '股のぞきとリアクション動画を撮影。'],
      ['2026-08-03T14:30:00+09:00', '14:30', 'ヴィラへチェックイン', 'プールとBBQ準備。'],
      ['2026-08-03T17:30:00+09:00', '17:30', 'BBQスタート', '前菜から。サーロインは全員が揃ってから。'],
      ['2026-08-04T10:00:00+09:00', '10:00', 'ヴィラを出発', '忘れ物、冷蔵庫、充電器を確認。'],
      ['2026-08-04T11:30:00+09:00', '11:30', '美山かやぶきの里', '赤いポストと家族の後ろ姿を撮影。'],
      ['2026-08-04T16:00:00+09:00', '16:00', '大阪へ帰着', '車内でベストシーンと感想を収録。']
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
    finish: ['締め・デザート', 'FINISH & DESSERT'],
    supplies: ['調味料・消耗品', 'SEASONING & TOOLS']
  };

  const SHOP_CATALOG = [
    ['beef-tongue','meat','厚切り牛タン','700g','🥩'],['sirloin','meat','みなもと牛サーロイン','800g','🥩'],['harami','meat','ハラミ','1.2kg','🥩'],['pork-belly','meat','厚切り豚バラ','500g','🐖'],['chicken-thigh','meat','鶏もも','600g','🐓'],['sausage','meat','大容量ソーセージ','800g','🌭'],
    ['shrimp','seafood','エビ','16尾','🦐'],['scallops','seafood','ホタテ','12個','🦪'],['camembert','seafood','カマンベール','2個','🧀'],['baguette','seafood','バゲット','2本','🥖'],
    ['onion','vegetables','玉ねぎ','2個','🧅'],['zucchini','vegetables','ズッキーニ','2本','🥒'],['paprika','vegetables','パプリカ','3個','🫑'],['asparagus','vegetables','アスパラ','2束','🌱'],['eringi','vegetables','エリンギ','2パック','🍄'],['corn','vegetables','とうもろこし','4本','🌽'],
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
      const rows = items.filter((item) => item.category === category).map((item) => {
        const qty = shoppingQuantities[item.key] || item.qty;
        return '<div class="shop-item-row ' + (shoppingState[item.key] ? 'checked' : '') + '" data-shop-key="' + escapeHTML(item.key) + '">' +
          '<label><input class="shop-item" data-state-key="' + escapeHTML(item.key) + '" type="checkbox" ' + (shoppingState[item.key] ? 'checked' : '') + '>' +
          '<span class="item-copy"><b>' + escapeHTML(item.name) + '</b><small>' + escapeHTML(qty) + '</small></span></label>' +
          '<button type="button" class="qty-edit" data-qty-key="' + escapeHTML(item.key) + '">数量変更</button>' +
          (item.custom ? '<button type="button" class="delete-item" data-delete-shop="' + escapeHTML(item.key) + '" aria-label="' + escapeHTML(item.name) + 'を削除">×</button>' : '<span class="shop-emoji">' + item.emoji + '</span>') +
          '</div>';
      }).join('');
      return '<section class="shop-category"><div class="shop-category-head"><div><p class="kicker dark">' + english + '</p><h2>' + title + '</h2></div><span id="shop-progress-' + category + '">0 / 0</span></div><div class="shop-list">' + (rows || '<p class="empty-note">項目なし</p>') + '</div></section>';
    }).join('');

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
    ['find-seagull','ine','🕊️','カモメを見つける',10],['boat-captain','ine','🚢','遊覧船の船長ポーズ',10],
    ['count-funaya','ine','🏘️','舟屋を10軒見つける',15],['record-waves','ine','🎙️','伊根の波音を録音する',10],
    ['seafood-reporter','ine','🐟','ランチを食レポする',15],
    ['help-bbq','bbq','🍖','BBQで一品手伝う',20],['veggie-hero','bbq','🥦','焼き野菜をひとつ食べる',15],
    ['timer-captain','bbq','⏱️','BBQタイマー係になる',15],['grill-sound','bbq','🎬','焼ける音を動画に撮る',15],
    ['table-setter','bbq','🍽️','お皿をみんなに配る',10],
    ['family-jump','family','🕴️','家族全員でジャンプ写真',15],['dad-photo','family','📸','お父さんとツーショット',15],
    ['mom-photo','family','💐','お母さんとツーショット',15],['grandma-smile','family','😊','おばあちゃんを笑顔にする',15],
    ['thank-you','family','🤝','家族の誰かにありがとうを言う',15],
    ['find-red-post','miyama','📮','美山の赤いポストを発見',15],['count-roofs','miyama','🏠','茅葺き屋根を5軒見つける',15],
    ['quiet-walk','miyama','🤫','1分間静かに里を歩く',15],['nature-sound','miyama','🌿','美山の自然音を録音する',10],
    ['best-memory','miyama','🏆','旅の一番を発表する',20]
  ].map(([key,category,emoji,title,xp]) => ({key,category,emoji,title,xp}));
  const legacyMissionKeys = ['find-seagull','family-jump','dad-photo','help-bbq','find-red-post'];
  let missionState = migrateState(storage.get('sekiTripKids', {}), legacyMissionKeys);
  let activeMissionCategory = 'all';

  function updateMissions() {
    const completed = MISSIONS.filter((mission) => missionState[mission.key]);
    const xp = completed.reduce((sum, mission) => sum + mission.xp, 0);
    const maxXp = MISSIONS.reduce((sum, mission) => sum + mission.xp, 0);
    document.getElementById('kidsXp').textContent = xp;
    document.getElementById('kidsProgress').textContent = completed.length + ' / ' + MISSIONS.length + ' ミッション';
    document.getElementById('homeKidsProgress').textContent = xp + ' XP';
    document.getElementById('missionRing').style.setProperty('--mission-progress', (xp / maxXp * 360) + 'deg');
    document.getElementById('kidsRank').textContent =
      xp >= 250 ? 'トリップマスター' : xp >= 160 ? '家族の冒険家' : xp >= 80 ? '海の探検家' : 'かけだし旅人';
    document.querySelectorAll('#badgeRow [data-level]').forEach((badge) => {
      badge.classList.toggle('unlocked', xp >= Number(badge.dataset.level));
    });
  }

  function renderMissions() {
    const grid = document.getElementById('kidsMissionGrid');
    const visibleMissions = MISSIONS.filter((mission) => activeMissionCategory === 'all' || mission.category === activeMissionCategory);
    grid.innerHTML = visibleMissions.map((mission) =>
      '<label class="mission-card ' + (missionState[mission.key] ? 'completed' : '') + '">' +
        '<input class="kids-item" data-state-key="' + mission.key + '" type="checkbox" ' + (missionState[mission.key] ? 'checked' : '') + '>' +
        '<span class="mission-emoji">' + mission.emoji + '</span><b>' + mission.title + '</b><small>+' + mission.xp + ' XP</small></label>'
    ).join('');
    grid.querySelectorAll('.kids-item').forEach((input) => {
      input.addEventListener('change', () => {
        missionState[input.dataset.stateKey] = input.checked;
        storage.set('sekiTripKids', missionState);
        input.closest('.mission-card').classList.toggle('completed', input.checked);
        updateMissions();
        if (input.checked) showToast('ミッションクリア！ XP獲得');
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

  document.getElementById('resetKids').addEventListener('click', () => {
    if (!window.confirm('ミッションをすべてリセットしますか？')) return;
    MISSIONS.forEach((mission) => { missionState[mission.key] = false; });
    storage.set('sekiTripKids', missionState);
    renderMissions();
    showToast('ミッションをリセットしました');
  });

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
