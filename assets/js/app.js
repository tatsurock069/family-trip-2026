document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        if (value === null) return fallback;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
  };

  const screens = [...document.querySelectorAll('.screen')];
  const navs = [...document.querySelectorAll('.nav-btn')];

  function scrollTop() {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    requestAnimationFrame(() => { root.style.scrollBehavior = previousBehavior; });
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

  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1800);
  }

  const planTabs = [...document.querySelectorAll('.plan-tab')];
  const baseCost = 28000 + 14800 + 20000;

  function updateTotal() {
    let value = baseCost;
    document.querySelectorAll('.cost:checked').forEach((input) => {
      value += Number(input.dataset.cost || 0);
    });
    const formatted = value.toLocaleString('ja-JP');
    const total = document.getElementById('total');
    const home = document.getElementById('homeTotal');
    const perPerson = document.getElementById('perPerson');
    if (total) total.textContent = formatted + '円';
    if (home) home.textContent = '¥' + formatted;
    if (perPerson) perPerson.textContent = '1人あたり 約' + Math.round(value / 8).toLocaleString('ja-JP') + '円';
  }

  function setPlan(value) {
    const plan = value === 'b' ? 'b' : 'a';
    planTabs.forEach((button) => {
      const active = button.dataset.plan === plan;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.getElementById('planA')?.classList.toggle('active', plan === 'a');
    document.getElementById('planB')?.classList.toggle('active', plan === 'b');
    const course = document.getElementById(plan === 'a' ? 'costA' : 'costB');
    if (course) course.checked = true;
    storage.set('sekiTripPlan', plan);
    updateTotal();
  }

  planTabs.forEach((button) => button.addEventListener('click', () => setPlan(button.dataset.plan)));

  const budgetItems = [...document.querySelectorAll('.cost[data-budget-key]')];
  const savedBudget = storage.get('sekiTripBudget', {});
  if (savedBudget && !Array.isArray(savedBudget)) {
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

  document.querySelectorAll('.cost').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.classList.contains('course-cost')) {
        setPlan(input.id === 'costB' ? 'b' : 'a');
      } else {
        saveBudget();
        updateTotal();
      }
    });
  });

  function paintChecked(items) {
    items.forEach((item) => item.closest('.check-row')?.classList.toggle('is-checked', item.checked));
  }

  function updateCount(items, labelId, barId) {
    const done = items.filter((item) => item.checked).length;
    const label = document.getElementById(labelId);
    const bar = document.getElementById(barId);
    if (label) label.textContent = done + ' / ' + items.length;
    if (bar) bar.style.width = (items.length ? done / items.length * 100 : 0) + '%';
    return done;
  }

  const legacyShoppingGroups = [
    ['salt', 'black-pepper'],
    ['yakiniku-sauce', 'lemon'],
    ['butter', 'garlic'],
    ['olive-oil', 'honey'],
    ['soy-sauce', 'teriyaki-sauce'],
    ['aluminum-tray', 'aluminum-foil'],
    ['kitchen-paper', 'garbage-bags']
  ];

  function persist(selector, key, onUpdate) {
    const items = [...document.querySelectorAll(selector)];
    const saved = storage.get(key, {});
    const state = {};

    if (Array.isArray(saved)) {
      if (key === 'sekiTripShopping') {
        items.slice(0, 20).forEach((item, index) => { state[item.dataset.stateKey] = Boolean(saved[index]); });
        legacyShoppingGroups.forEach((keys, index) => {
          keys.forEach((itemKey) => { state[itemKey] = Boolean(saved[20 + index]); });
        });
      } else {
        items.forEach((item, index) => { state[item.dataset.stateKey] = Boolean(saved[index]); });
      }
    } else if (saved && typeof saved === 'object') {
      Object.assign(state, saved);
    }

    items.forEach((item) => {
      item.checked = Boolean(state[item.dataset.stateKey]);
      item.addEventListener('change', () => {
        storage.set(key, Object.fromEntries(
          items.map((current) => [current.dataset.stateKey, current.checked])
        ));
        paintChecked(items);
        onUpdate?.(items);
      });
    });
    paintChecked(items);
    onUpdate?.(items);
    return items;
  }

  function updateShopping(items) {
    updateCount(items, 'shoppingProgressLabel', 'shoppingProgressBar');
    ['meat', 'seafood', 'vegetables', 'finish', 'supplies'].forEach((category) => {
      const categoryItems = items.filter((item) => item.dataset.category === category);
      updateCount(categoryItems, category + 'Progress');
    });
  }

  const todos = persist('.todo', 'sekiTripTodos', (items) => {
    updateCount(items, 'progressLabel', 'progressBar');
    updateCount(items, 'todoProgress');
  });
  const shopping = persist('.shop-item', 'sekiTripShopping', updateShopping);
  const shooting = persist('.shoot-item', 'sekiTripShooting', (items) => updateCount(items, 'shootProgress'));
  const kids = persist('.kids-item', 'sekiTripKids', (items) => updateCount(items, 'kidsProgress'));

  function clear(items, key, message) {
    if (!window.confirm('チェック済みの項目をすべて解除しますか？')) return;
    items.forEach((item) => { item.checked = false; });
    storage.set(key, Object.fromEntries(items.map((item) => [item.dataset.stateKey, false])));
    paintChecked(items);
    items[0]?.dispatchEvent(new Event('change'));
    showToast(message);
  }

  function bind(id, callback) {
    document.getElementById(id)?.addEventListener('click', callback);
  }

  bind('resetTodos', () => clear(todos, 'sekiTripTodos', '持ち物チェックを解除しました'));
  bind('resetShopping', () => clear(shopping, 'sekiTripShopping', '買い出しチェックを解除しました'));
  bind('resetShoot', () => clear(shooting, 'sekiTripShooting', '撮影チェックを解除しました'));
  bind('resetKids', () => clear(kids, 'sekiTripKids', 'ミッションをリセットしました'));
  bind('saveToast', () => showToast('持ち物は端末に保存済みです'));
  bind('shoppingSaved', () => showToast('買い出しリストは端末に保存済みです'));
  bind('shootSaved', () => showToast('撮影チェックは端末に保存済みです'));
  bind('kidsSaved', () => showToast('ミッション状況は端末に保存済みです'));

  let timerRemaining = 5 * 60;
  let timerEndsAt = 0;
  let timerInterval = 0;
  const timerDisplay = document.getElementById('timerDisplay');
  const timerStatus = document.getElementById('timerStatus');
  const timerStart = document.getElementById('timerStart');

  function renderTimer() {
    const minutes = Math.floor(timerRemaining / 60);
    const seconds = timerRemaining % 60;
    if (timerDisplay) timerDisplay.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  function pauseTimer() {
    if (timerInterval) window.clearInterval(timerInterval);
    timerInterval = 0;
    if (timerStart) timerStart.textContent = 'スタート';
  }

  function tickTimer() {
    timerRemaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
    renderTimer();
    if (timerRemaining === 0) {
      pauseTimer();
      if (timerStatus) timerStatus.textContent = '時間です。焼き加減を確認！';
      showToast('⏱ 時間です。焼き加減を確認！');
      navigator.vibrate?.([200, 100, 200]);
    }
  }

  document.querySelectorAll('.timer-preset').forEach((button) => {
    button.addEventListener('click', () => {
      pauseTimer();
      timerRemaining = Number(button.dataset.seconds);
      if (timerStatus) timerStatus.textContent = button.textContent + 'をセット';
      renderTimer();
    });
  });

  bind('timerStart', () => {
    if (timerInterval) {
      tickTimer();
      pauseTimer();
      if (timerStatus) timerStatus.textContent = '一時停止中';
      return;
    }
    if (timerRemaining <= 0) timerRemaining = 5 * 60;
    timerEndsAt = Date.now() + timerRemaining * 1000;
    timerInterval = window.setInterval(tickTimer, 250);
    if (timerStart) timerStart.textContent = '一時停止';
    if (timerStatus) timerStatus.textContent = '計測中';
    tickTimer();
  });

  bind('timerReset', () => {
    pauseTimer();
    timerRemaining = 5 * 60;
    if (timerStatus) timerStatus.textContent = '5分をセット';
    renderTimer();
  });

  setPlan(storage.get('sekiTripPlan', 'a'));
  updateTotal();
  renderTimer();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', async () => {
      const hadController = Boolean(navigator.serviceWorker.controller);
      try {
        await navigator.serviceWorker.register('./sw.js', { scope: './' });
        if (hadController) {
          let reloading = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloading) return;
            reloading = true;
            location.reload();
          });
        }
      } catch {
        // The app remains fully usable online when registration is unavailable.
      }
    });
  }
});
