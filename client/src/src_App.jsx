import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// dataviz 驗證過嘅 categorical palette（固定次序，唔好循環生色）
const CHART_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'];
const CHART_GREY = '#898781';

const STR = {
  zh: {
    title: '🍽 我的食譜',
    tab_recipes: '食譜',
    tab_plan: '餐單',
    tab_shopping: '購物清單',
    tab_insights: '統計',
    summaryTotal: '食譜總數',
    summaryTop: '最多食譜嘅分類',
    chartByCategory: '分類分佈',
    chartIngredients: '每個食譜材料數',
    uncategorized: '未分類',
    other: '其他',
    noInsights: '仲未有數據，加幾個食譜先啦！',
    chartCalories: '卡路里（每份）',
    chartMacros: '營養素（克／每份）',
    protein: '蛋白質',
    carbs: '碳水化合物',
    fat: '脂肪',
    nutritionNote: '＊AI 估算值，僅供參考',
    scanBtn: '📷 影相掃描',
    uploadBtn: '🖼 上載圖片',
    scanning: '辨識中⋯⋯',
    scanFailedPrefix: '掃描失敗：',
    scan_failed: '掃描失敗',
    busy: 'AI 而家太多人用，等一陣再試',
    unrecognized: '無法辨識呢張相',
    importPh: '貼上食譜網址（IG / 食譜網站）',
    importBtn: '匯入',
    importing: '匯入中⋯',
    importFailedPrefix: '匯入失敗：',
    invalid_url: '網址唔正確',
    fetch_failed: '開唔到呢個網址',
    gemini_failed: 'AI 抽取唔到食譜',
    all: '全部',
    name: '名稱',
    category: '分類',
    imageUrl: '圖片網址',
    recipeUrl: '食譜連結',
    ingredients: '原料（用逗號分隔）',
    description: '描述',
    add: '新增食譜',
    update: '更新食譜',
    cancelEdit: '取消編輯',
    edit: '編輯',
    del: '刪除',
    confirmDelete: '確定要刪除這筆食譜嗎？',
    categoryLabel: '分類：',
    link: '食譜連結',
    loading: '載入中...',
    empty: '仲未有食譜，掃描或者新增一個啦！',
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    choose: '＋ 揀食譜',
    generate: '🛒 生成購物清單',
    generating: '生成中⋯',
    clearList: '清空',
    shopHint: '剔選食譜，然後生成合併購物清單（AI 會依超市走道分類）',
    list_failed: '生成失敗',
    listFailedPrefix: '購物清單生成失敗：',
    login: '登入',
    register: '註冊',
    username: '用戶名',
    password: '密碼（最少 6 位）',
    logout: '登出',
    invalid_input: '輸入唔正確',
    password_too_short: '密碼最少要 6 位',
    username_taken: '用戶名已被使用',
    bad_credentials: '用戶名或密碼錯誤',
    server_error: '伺服器錯誤，請再試',
  },
  en: {
    title: '🍽 My Recipes',
    tab_recipes: 'Recipes',
    tab_plan: 'Meal Plan',
    tab_shopping: 'Shopping',
    tab_insights: 'Insights',
    summaryTotal: 'Total recipes',
    summaryTop: 'Top category',
    chartByCategory: 'Recipes by category',
    chartIngredients: 'Ingredients per recipe',
    uncategorized: 'Uncategorized',
    other: 'Other',
    noInsights: 'No data yet — add some recipes first!',
    chartCalories: 'Calories (per serving)',
    chartMacros: 'Macros (g per serving)',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    nutritionNote: '* AI estimates, for reference only',
    scanBtn: '📷 Take a photo',
    uploadBtn: '🖼 Upload a photo',
    scanning: 'Identifying…',
    scanFailedPrefix: 'Scan failed: ',
    scan_failed: 'Scan failed',
    busy: 'AI is busy right now, try again in a moment',
    unrecognized: "Couldn't recognize this photo",
    importPh: 'Paste a recipe URL (IG / recipe sites)',
    importBtn: 'Import',
    importing: 'Importing…',
    importFailedPrefix: 'Import failed: ',
    invalid_url: 'Invalid URL',
    fetch_failed: "Couldn't open this URL",
    gemini_failed: "AI couldn't extract a recipe",
    all: 'All',
    name: 'Name',
    category: 'Category',
    imageUrl: 'Image URL',
    recipeUrl: 'Recipe link',
    ingredients: 'Ingredients (comma separated)',
    description: 'Description',
    add: 'Add recipe',
    update: 'Update recipe',
    cancelEdit: 'Cancel edit',
    edit: 'Edit',
    del: 'Delete',
    confirmDelete: 'Delete this recipe?',
    categoryLabel: 'Category: ',
    link: 'Recipe link',
    loading: 'Loading...',
    empty: 'No recipes yet — scan or add one!',
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    choose: '＋ Pick a recipe',
    generate: '🛒 Generate shopping list',
    generating: 'Generating…',
    clearList: 'Clear',
    shopHint: 'Tick recipes, then generate a merged list (AI groups by supermarket aisle)',
    list_failed: 'Failed to generate',
    listFailedPrefix: 'Shopping list failed: ',
    login: 'Log in',
    register: 'Sign up',
    username: 'Username',
    password: 'Password (min 6 chars)',
    logout: 'Log out',
    invalid_input: 'Invalid input',
    password_too_short: 'Password must be at least 6 characters',
    username_taken: 'Username already taken',
    bad_credentials: 'Wrong username or password',
    server_error: 'Server error, please try again',
  },
};

const DAYS = {
  zh: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
const MEALS = ['breakfast', 'lunch', 'dinner'];
const DEFAULT_CATS = {
  zh: ['中式', '西式', '日式', '韓式', '泰式', '意式', '甜品', '湯水', '小食'],
  en: ['Chinese', 'Western', 'Japanese', 'Korean', 'Thai', 'Italian', 'Dessert', 'Soup', 'Snacks'],
};

const emptyRecipe = {
  name: '',
  description: '',
  image: '',
  ingredients: '',
  url: '',
  category: '',
};

// 縮到最長邊 1024px 再轉 base64，避免 request body 過大
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

const applyToken = (token) => {
  if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete axios.defaults.headers.common.Authorization;
};
applyToken(localStorage.getItem('token'));

const getMonday = (d) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shortDate = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

const loadJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const App = () => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'zh');
  const t = STR[lang];
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authUser, setAuthUser] = useState('');
  const [authPwd, setAuthPwd] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [tab, setTab] = useState('recipes');
  const [recipes, setRecipes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(emptyRecipe);
  const [editId, setEditId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [plan, setPlan] = useState({});

  const [insights, setInsights] = useState(null);
  const [insightsBusy, setInsightsBusy] = useState(false);

  const [shopSel, setShopSel] = useState(() => loadJson('shopSel', []));
  const [shopList, setShopList] = useState(() => loadJson('shopList', null));
  const [shopChecked, setShopChecked] = useState(() => loadJson('shopChecked', {}));
  const [genBusy, setGenBusy] = useState(false);

  useEffect(() => localStorage.setItem('shopSel', JSON.stringify(shopSel)), [shopSel]);
  useEffect(() => localStorage.setItem('shopList', JSON.stringify(shopList)), [shopList]);
  useEffect(() => localStorage.setItem('shopChecked', JSON.stringify(shopChecked)), [shopChecked]);

  const toggleLang = () => {
    const next = lang === 'zh' ? 'en' : 'zh';
    setLang(next);
    localStorage.setItem('lang', next);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    applyToken(null);
    setToken(null);
    setRecipes([]);
    setLoaded(false);
  };

  const errMsg = (err) => STR[lang][err.response?.data?.error] || err.message;

  const handleAuth = async (action) => {
    setAuthErr('');
    setAuthBusy(true);
    try {
      const { data } = await axios.post('/api/auth', { action, username: authUser, password: authPwd });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      applyToken(data.token);
      setToken(data.token);
      setAuthPwd('');
    } catch (err) {
      setAuthErr(STR[lang][err.response?.data?.error] || t.server_error);
    } finally {
      setAuthBusy(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      const response = await axios.get('/api/recipes');
      setRecipes(response.data);
      setLoaded(true);
    } catch (err) {
      if (err.response?.status === 401) logout(); // token 過期
    }
  };

  useEffect(() => {
    if (token) fetchRecipes();
  }, [token]);

  const loadPlan = async (start) => {
    try {
      const { data } = await axios.get('/api/meal-plan', { params: { start: fmtDate(start) } });
      setPlan(Object.fromEntries(data.map((r) => [`${r.date}|${r.meal}`, r])));
    } catch (err) {
      if (err.response?.status === 401) logout();
    }
  };

  useEffect(() => {
    if (token && tab === 'plan') loadPlan(weekStart);
  }, [token, tab, weekStart]);

  useEffect(() => {
    if (token && tab === 'insights') {
      setInsightsBusy(true);
      axios
        .get('/api/insights')
        .then(({ data }) => setInsights(data))
        .catch((err) => {
          if (err.response?.status === 401) logout();
        })
        .finally(() => setInsightsBusy(false));
    }
  }, [token, tab]);

  const setSlot = async (date, meal, rid) => {
    if (!rid) return;
    await axios.post('/api/meal-plan', { date, meal, recipe_id: Number(rid) });
    loadPlan(weekStart);
  };

  const clearSlot = async (date, meal) => {
    await axios.delete('/api/meal-plan', { params: { date, meal } });
    loadPlan(weekStart);
  };

  const fillForm = (data, sourceUrl = '') => {
    setForm({
      ...emptyRecipe,
      name: data.name,
      category: data.category,
      description: data.description,
      ingredients: data.ingredients.join(', '),
      url: sourceUrl,
    });
    setEditId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScan = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setScanning(true);
    try {
      const image = await compressImage(file);
      const { data } = await axios.post('/api/scan-dish', { image, media_type: 'image/jpeg', lang });
      fillForm(data);
    } catch (err) {
      alert(t.scanFailedPrefix + errMsg(err));
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const source = importUrl.trim();
      const { data } = await axios.post('/api/import-url', { url: source, lang });
      fillForm(data, source);
      setImportUrl('');
    } catch (err) {
      alert(t.importFailedPrefix + errMsg(err));
    } finally {
      setImporting(false);
    }
  };

  const toggleShopSel = (id) =>
    setShopSel((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));

  const generateList = async () => {
    if (shopSel.length === 0) return;
    setGenBusy(true);
    try {
      const { data } = await axios.post('/api/shopping-list', { recipe_ids: shopSel, lang });
      setShopList(data);
      setShopChecked({});
    } catch (err) {
      alert(t.listFailedPrefix + errMsg(err));
    } finally {
      setGenBusy(false);
    }
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = {
      ...form,
      ingredients: form.ingredients.split(',').map(s => s.trim()),
    };
    if (editId) {
      await axios.put(`/api/recipes/${editId}`, payload);
    } else {
      await axios.post('/api/recipes', payload);
    }
    setForm(emptyRecipe);
    setEditId(null);
    fetchRecipes();
  };

  const handleEdit = recipe => {
    setTab('recipes');
    setForm({
      ...recipe,
      ingredients: Array.isArray(recipe.ingredients)
        ? recipe.ingredients.join(', ')
        : recipe.ingredients,
    });
    setEditId(recipe.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    await axios.delete(`/api/recipes/${id}`);
    setShopSel((sel) => sel.filter((x) => x !== id));
    fetchRecipes();
  };

  const handleCancel = () => {
    setEditId(null);
    setForm(emptyRecipe);
  };

  const langButton = (
    <button
      type="button"
      onClick={toggleLang}
      className="border border-gray-400 text-gray-600 text-sm font-bold py-1 px-3 rounded hover:bg-gray-100"
    >
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  );

  if (!token) {
    return (
      <div className="max-w-sm mx-auto p-6 mt-16 font-sans">
        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{t.title}</h1>
            {langButton}
          </div>
          <input
            value={authUser}
            onChange={(e) => setAuthUser(e.target.value)}
            placeholder={t.username}
            className="w-full p-2 border rounded mb-3"
          />
          <input
            type="password"
            value={authPwd}
            onChange={(e) => setAuthPwd(e.target.value)}
            placeholder={t.password}
            className="w-full p-2 border rounded mb-4"
          />
          {authErr && <p className="text-red-600 text-sm mb-3">{authErr}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => handleAuth('login')}
              disabled={authBusy}
              className="flex-1 bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
            >
              {t.login}
            </button>
            <button
              onClick={() => handleAuth('register')}
              disabled={authBusy}
              className="flex-1 bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
            >
              {t.register}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cats = [...new Set(recipes.map((r) => r.category).filter(Boolean))];
  const shownRecipes = catFilter ? recipes.filter((r) => r.category === catFilter) : recipes;

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="flex gap-2 items-center">
          {langButton}
          <button
            type="button"
            onClick={logout}
            className="border border-red-400 text-red-500 text-sm font-bold py-1 px-3 rounded hover:bg-red-50"
          >
            {t.logout}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['recipes', 'plan', 'shopping', 'insights'].map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 py-2 rounded font-bold text-sm sm:text-base ${
              tab === k ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            {t['tab_' + k]}
          </button>
        ))}
      </div>

      {tab === 'recipes' && (
        <>
          <div className="flex gap-2 mb-4">
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder={t.importPh}
              className="flex-1 p-2 border rounded"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="bg-purple-500 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
            >
              {importing ? t.importing : t.importBtn}
            </button>
          </div>
          <div className="flex gap-2 mb-6">
            <label className={`flex-1 text-center py-3 px-2 rounded font-bold text-white cursor-pointer ${scanning ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-700'}`}>
              {scanning ? t.scanning : t.scanBtn}
              <input type="file" accept="image/*" capture="environment" onChange={handleScan} disabled={scanning} className="hidden" />
            </label>
            <label className={`flex-1 text-center py-3 px-2 rounded font-bold text-white cursor-pointer ${scanning ? 'bg-gray-400' : 'bg-sky-500 hover:bg-sky-600'}`}>
              {scanning ? t.scanning : t.uploadBtn}
              <input type="file" accept="image/*" onChange={handleScan} disabled={scanning} className="hidden" />
            </label>
          </div>
          <form onSubmit={handleSubmit} className="mb-8 bg-white p-6 rounded shadow">
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">{t.name}</label>
              <input
                name="name"
                placeholder={t.name}
                value={form.name}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">{t.category}</label>
              <input
                name="category"
                placeholder={t.category}
                value={form.category}
                onChange={handleChange}
                list="cat-options"
                className="w-full p-2 border rounded"
              />
              <datalist id="cat-options">
                {[...new Set([...DEFAULT_CATS[lang], ...cats])].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">{t.imageUrl}</label>
              <input
                name="image"
                placeholder={t.imageUrl}
                value={form.image}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">{t.recipeUrl}</label>
              <input
                name="url"
                placeholder={t.recipeUrl}
                value={form.url}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">{t.ingredients}</label>
              <input
                name="ingredients"
                placeholder={t.ingredients}
                value={form.ingredients}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">{t.description}</label>
              <input
                name="description"
                placeholder={t.description}
                value={form.description}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                {editId ? t.update : t.add}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  {t.cancelEdit}
                </button>
              )}
            </div>
          </form>

          {cats.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {['', ...cats].map((c) => (
                <button
                  key={c || '__all'}
                  onClick={() => setCatFilter(c)}
                  className={`text-sm font-bold py-1 px-3 rounded-full border ${
                    catFilter === c ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600'
                  }`}
                >
                  {c || t.all}
                </button>
              ))}
            </div>
          )}

          {!loaded ? (
            <p>{t.loading}</p>
          ) : shownRecipes.length === 0 ? (
            <p>{t.empty}</p>
          ) : (
            shownRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white border rounded p-4 mb-4 shadow">
                <h2 className="text-lg font-bold">{recipe.name}</h2>
                <p><strong>{t.categoryLabel}</strong>{recipe.category}</p>
                <p>{recipe.description}</p>
                <ul className="list-disc ml-6">
                  {Array.isArray(recipe.ingredients)
                    ? recipe.ingredients.map((item, idx) => <li key={idx}>{item}</li>)
                    : null}
                </ul>
                {recipe.image && (
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="max-w-full h-auto mt-2 rounded"
                  />
                )}
                {recipe.url && (
                  <p>
                    🔗 <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{t.link}</a>
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(recipe)}
                    className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-1 px-3 rounded"
                  >
                    {t.edit}
                  </button>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                  >
                    {t.del}
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === 'plan' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="bg-white border font-bold py-1 px-4 rounded hover:bg-gray-100"
            >
              ‹
            </button>
            <span className="font-bold">
              {shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}
            </span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="bg-white border font-bold py-1 px-4 rounded hover:bg-gray-100"
            >
              ›
            </button>
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const day = addDays(weekStart, i);
            const date = fmtDate(day);
            const isToday = date === fmtDate(new Date());
            return (
              <div key={date} className={`bg-white border rounded p-4 mb-3 shadow ${isToday ? 'border-orange-400 border-2' : ''}`}>
                <p className="font-bold mb-2">
                  {DAYS[lang][i]} <span className="text-gray-500">{shortDate(day)}</span>
                </p>
                {MEALS.map((meal) => {
                  const entry = plan[`${date}|${meal}`];
                  return (
                    <div key={meal} className="flex items-center gap-2 mb-1">
                      <span className="w-14 text-sm text-gray-500">{t[meal]}</span>
                      {entry ? (
                        <>
                          <span className="flex-1">{entry.name}</span>
                          <button
                            onClick={() => clearSlot(date, meal)}
                            className="text-red-500 font-bold px-2 hover:bg-red-50 rounded"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <select
                          value=""
                          onChange={(e) => setSlot(date, meal, e.target.value)}
                          className="flex-1 p-1 border rounded text-gray-500 text-sm"
                        >
                          <option value="">{t.choose}</option>
                          {recipes.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}

      {tab === 'shopping' && (
        <>
          <p className="text-gray-500 text-sm mb-3">{t.shopHint}</p>
          <div className="bg-white border rounded p-4 mb-4 shadow">
            {recipes.map((r) => (
              <label key={r.id} className="flex items-center gap-2 mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shopSel.includes(r.id)}
                  onChange={() => toggleShopSel(r.id)}
                />
                <span>{r.name}</span>
              </label>
            ))}
            <button
              onClick={generateList}
              disabled={genBusy || shopSel.length === 0}
              className="mt-3 w-full bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
            >
              {genBusy ? t.generating : t.generate}
            </button>
          </div>
          {shopList && (
            <div className="bg-white border rounded p-4 shadow">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => { setShopList(null); setShopChecked({}); }}
                  className="text-sm text-red-500 font-bold hover:bg-red-50 py-1 px-3 rounded"
                >
                  {t.clearList}
                </button>
              </div>
              {shopList.map((group) => (
                <div key={group.aisle} className="mb-4">
                  <p className="font-bold text-orange-600 mb-1">{group.aisle}</p>
                  {group.items.map((item) => {
                    const key = `${group.aisle}|${item}`;
                    const done = !!shopChecked[key];
                    return (
                      <label key={key} className="flex items-center gap-2 mb-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => setShopChecked({ ...shopChecked, [key]: !done })}
                        />
                        <span className={done ? 'line-through text-gray-400' : ''}>{item}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'insights' && (
        insightsBusy || !insights ? (
          <p>{t.loading}</p>
        ) : insights.byCategory.length === 0 ? (
          <p>{t.noInsights}</p>
        ) : (() => {
          const total = insights.byCategory.reduce((s, c) => s + c.count, 0);
          const catData = insights.byCategory.map((c) => ({
            name: c.category || t.uncategorized,
            value: c.count,
          }));
          const donut =
            catData.length > 8
              ? [
                  ...catData.slice(0, 7),
                  { name: t.other, value: catData.slice(7).reduce((s, x) => s + x.value, 0) },
                ]
              : catData;
          return (
            <>
              <p className="mb-4 font-bold">
                {t.summaryTotal}：{total} ・ {t.summaryTop}：{catData[0].name}（{catData[0].value}）
              </p>
              <div className="bg-white border rounded p-4 mb-4 shadow">
                <p className="font-bold mb-2">{t.chartByCategory}</p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={donut}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="50%"
                      outerRadius="75%"
                      paddingAngle={2}
                      label={(e) => `${e.name} ${e.value}`}
                    >
                      {donut.map((d, i) => (
                        <Cell
                          key={d.name}
                          fill={d.name === t.other ? CHART_GREY : CHART_COLORS[i % CHART_COLORS.length]}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white border rounded p-4 mb-4 shadow">
                <p className="font-bold mb-2">{t.chartIngredients}</p>
                <ResponsiveContainer width="100%" height={Math.max(200, insights.ingredientCounts.length * 36)}>
                  <BarChart data={insights.ingredientCounts} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <XAxis type="number" allowDecimals={false} stroke="#898781" />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} stroke="#898781" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2a78d6" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {insights.nutrition && insights.nutrition.length > 0 && (
                <>
                  <div className="bg-white border rounded p-4 mb-4 shadow">
                    <p className="font-bold mb-2">{t.chartCalories}</p>
                    <ResponsiveContainer width="100%" height={Math.max(200, insights.nutrition.length * 36)}>
                      <BarChart data={insights.nutrition} layout="vertical" margin={{ left: 8, right: 24 }}>
                        <XAxis type="number" allowDecimals={false} stroke="#898781" />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} stroke="#898781" />
                        <Tooltip />
                        <Bar dataKey="calories" name="kcal" fill="#eb6834" radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white border rounded p-4 shadow">
                    <p className="font-bold mb-2">{t.chartMacros}</p>
                    <ResponsiveContainer width="100%" height={Math.max(200, insights.nutrition.length * 36)}>
                      <BarChart data={insights.nutrition} layout="vertical" margin={{ left: 8, right: 24 }}>
                        <XAxis type="number" allowDecimals={false} stroke="#898781" />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} stroke="#898781" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="protein" name={t.protein} stackId="m" fill="#2a78d6" barSize={18} />
                        <Bar dataKey="carbs" name={t.carbs} stackId="m" fill="#1baf7a" barSize={18} />
                        <Bar dataKey="fat" name={t.fat} stackId="m" fill="#eda100" radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-gray-400 text-xs mt-2">{t.nutritionNote}</p>
                  </div>
                </>
              )}
            </>
          );
        })()
      )}
    </div>
  );
};

export default App;
