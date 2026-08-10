import React, { useEffect, useState, lazy, Suspense } from 'react';
import axios from 'axios';
import SquareCrop from './SquareCrop.jsx';

const GlobeView = lazy(() => import('./GlobeView.jsx'));

// 菜系 → 地圖座標（西式擺美國、甜品擺法國、湯水擺廣州、小食擺台北）
const CAT_GEO = {
  chinese: [35.9, 104.2],
  western: [39.8, -98.6],
  japanese: [36.2, 138.3],
  korean: [36.5, 127.9],
  thai: [15.9, 101.0],
  italian: [42.8, 12.5],
  dessert: [46.6, 2.35],
  soup: [23.1, 113.3],
  snack: [25.05, 121.5],
};
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// dataviz 驗證過嘅 categorical palette（固定次序，唔好循環生色）
const CHART_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'];
const CHART_GREY = '#898781';

const STR = {
  zh: {
    title: '🍽 我的食譜',
    tab_home: '主頁',
    tab_recipes: '食譜',
    tab_plan: '餐單',
    tab_shopping: '購物清單',
    tab_insights: '統計',
    tagline: '食遍全世界',
    globeHint: '撳個標記即刻去嗰個菜系嘅食譜',
    settings: '設定',
    language: '語言',
    themeLabel: '主題',
    converter: '⚖️ 單位換算',
    convAmount: '數量',
    convNote: '＊g↔ml 視乎材料密度，記得揀返啱嘅材料',
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
    addRecipe: '＋ 新增食譜',
    sortNewest: '最新',
    sortOldest: '最舊',
    sortName: '名稱 A-Z',
    sortTime: '需時（短到長）',
    searchPh: '🔍 搜尋食譜',
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
    imageRequiredHint: '新增食譜要有一張圖片（掃描/上載/匯入會自動填，或者自己貼網址）',
    prepMinLabel: '準備（分鐘）',
    cookMinLabel: '製作（分鐘）',
    servingsLabel: '份量（人）',
    minutesAbbrev: '分鐘',
    itemsLabel: '項材料',
    servingsUnit: '人份',
    changeThumbnail: '🖼 更改縮圖',
    thumbUpdating: '更新緊⋯⋯',
    thumbFailed: '更改縮圖失敗',
    cropTitle: '裁剪成正方形',
    cropCancel: '取消',
    cropConfirm: '確定',
    recipeUrl: '食譜連結',
    ingredients: '原料（用逗號分隔）',
    description: '描述',
    stepsHeading: '做法',
    notesHeading: '備注',
    addNote: '➕ 加備注',
    saveNote: '儲存',
    cancelNote: '取消',
    noteText: '寫低你今次改良嘅心得⋯',
    noNotes: '仲未有備注，下次改良食譜就記低啦！',
    add: '新增食譜',
    update: '更新食譜',
    cancelEdit: '取消編輯',
    edit: '編輯',
    del: '刪除',
    confirmDelete: '確定要刪除這筆食譜嗎？',
    categoryLabel: '分類：',
    ingredientsHeading: '材料',
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
    tab_home: 'Home',
    tab_recipes: 'Recipes',
    tab_plan: 'Meal Plan',
    tab_shopping: 'Shopping',
    tab_insights: 'Insights',
    tagline: 'A world of flavour at your fingertips',
    globeHint: 'Tap a marker to jump to that cuisine',
    settings: 'Settings',
    language: 'Language',
    themeLabel: 'Theme',
    converter: '⚖️ Unit converter',
    convAmount: 'Amount',
    convNote: '* g↔ml depends on ingredient density — pick the right one',
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
    addRecipe: '＋ Add Recipe',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    sortName: 'Name A-Z',
    sortTime: 'Time (shortest first)',
    searchPh: '🔍 Search recipes',
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
    imageRequiredHint: 'New recipes need a photo (scan/upload/import auto-fills this, or paste a URL)',
    prepMinLabel: 'Prep (min)',
    cookMinLabel: 'Cook (min)',
    servingsLabel: 'Servings',
    minutesAbbrev: 'min',
    itemsLabel: 'items',
    servingsUnit: 'servings',
    changeThumbnail: '🖼 Change thumbnail',
    thumbUpdating: 'Updating…',
    thumbFailed: 'Failed to update thumbnail',
    cropTitle: 'Crop to square',
    cropCancel: 'Cancel',
    cropConfirm: 'Confirm',
    recipeUrl: 'Recipe link',
    ingredients: 'Ingredients (comma separated)',
    description: 'Description',
    stepsHeading: 'Method',
    notesHeading: 'Notes',
    addNote: '➕ Add note',
    saveNote: 'Save',
    cancelNote: 'Cancel',
    noteText: 'Jot down what you learned this time…',
    noNotes: 'No notes yet — jot one down next time you improve this recipe!',
    add: 'Add recipe',
    update: 'Update recipe',
    cancelEdit: 'Cancel edit',
    edit: 'Edit',
    del: 'Delete',
    confirmDelete: 'Delete this recipe?',
    categoryLabel: 'Category: ',
    ingredientsHeading: 'Ingredients',
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

// 分類：DB 統一存代碼，顯示先按語言翻譯；自訂分類照存原文
const CATS = [
  { code: 'chinese', zh: '中式', en: 'Chinese' },
  { code: 'western', zh: '西式', en: 'Western' },
  { code: 'japanese', zh: '日式', en: 'Japanese' },
  { code: 'korean', zh: '韓式', en: 'Korean' },
  { code: 'thai', zh: '泰式', en: 'Thai' },
  { code: 'italian', zh: '意式', en: 'Italian' },
  { code: 'dessert', zh: '甜品', en: 'Dessert' },
  { code: 'soup', zh: '湯水', en: 'Soup' },
  { code: 'snack', zh: '小食', en: 'Snacks' },
  { code: 'other', zh: '其他', en: 'Other' },
];
const catLabel = (v, lang) => (CATS.find((c) => c.code === v) || {})[lang] || v;
// 冇相嗰啲食譜，縮圖用分類 emoji 頂住
const CAT_EMOJI = {
  chinese: '🥢', western: '🍝', japanese: '🍣', korean: '🍲', thai: '🌶️',
  italian: '🍕', dessert: '🍰', soup: '🍜', snack: '🍟', other: '🍽️',
};

// 部分食譜（尤其舊掃描）成段做法冧埋一齊冇換行；偵測遞增編號步驟（1. 2. 3.…）自動拆行顯示
const formatSteps = (text) => {
  if (!text) return text;
  const re = /(^|[。.!?！？\n:：])\s*(\d{1,2})[.、)]\s*/g;
  let expected = 1;
  const marks = [];
  let m;
  while ((m = re.exec(text))) {
    if (Number(m[2]) === expected) {
      marks.push(m.index + m[1].length);
      expected++;
    }
  }
  if (marks.length < 2) return text; // 唔似編號步驟，原文照顯示
  let result = text;
  for (let i = marks.length - 1; i >= 0; i--) {
    result = result.slice(0, marks[i]) + '\n' + result.slice(marks[i]);
  }
  return result.replace(/\n{2,}/g, '\n').trim();
};

// 單位換算：g↔ml 靠密度（g/ml），cup=240ml tbsp=15ml tsp=5ml
const DENSITY = { water: 1, milk: 1.03, oil: 0.92, flour: 0.53, sugar: 0.85, rice: 0.85, butter: 0.95, honey: 1.42 };
const CONV_TYPES = [
  { code: 'water', zh: '水／湯', en: 'Water / liquid' },
  { code: 'milk', zh: '奶', en: 'Milk' },
  { code: 'oil', zh: '油', en: 'Oil' },
  { code: 'flour', zh: '麵粉', en: 'Flour' },
  { code: 'sugar', zh: '糖', en: 'Sugar' },
  { code: 'rice', zh: '米', en: 'Rice' },
  { code: 'butter', zh: '牛油', en: 'Butter' },
  { code: 'honey', zh: '蜜糖', en: 'Honey' },
];
// 地球標記：有食譜就顯示數量，冇就全部菜系做裝飾
const buildGlobePoints = (recipes, lang) => {
  const counts = {};
  recipes.forEach((r) => {
    if (CAT_GEO[r.category]) counts[r.category] = (counts[r.category] || 0) + 1;
  });
  const codes = Object.keys(counts).length ? Object.keys(counts) : Object.keys(CAT_GEO);
  return codes.map((code) => ({
    code,
    count: counts[code] || 0,
    name: catLabel(code, lang),
    lat: CAT_GEO[code][0],
    lng: CAT_GEO[code][1],
  }));
};
const normalizeCat = (input) => {
  const s = (input || '').trim();
  if (!s) return '';
  const hit = CATS.find(
    (c) => c.code === s.toLowerCase() || c.zh === s || c.en.toLowerCase() === s.toLowerCase()
  );
  return hit ? hit.code : s;
};

const emptyRecipe = {
  name: '',
  description: '',
  image: '',
  ingredients: '',
  url: '',
  category: '',
  prep_minutes: '',
  cook_minutes: '',
  servings: '',
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
if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');

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
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authUser, setAuthUser] = useState('');
  const [authPwd, setAuthPwd] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [tab, setTab] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(emptyRecipe);
  const [editId, setEditId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [viewRecipe, setViewRecipe] = useState(null);
  const [detailTab, setDetailTab] = useState('steps');
  const [thumbBusy, setThumbBusy] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [addingNote, setAddingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [editingNoteIdx, setEditingNoteIdx] = useState(null);
  const [editNoteDraft, setEditNoteDraft] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [convVal, setConvVal] = useState('');
  const [convUnit, setConvUnit] = useState('g');
  const [convType, setConvType] = useState('water');

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
      category: catLabel(data.category, lang),
      description: data.description,
      ingredients: data.ingredients.join(', '),
      image: data.image || '',
      prep_minutes: Number.isFinite(data.prep_minutes) ? String(data.prep_minutes) : '',
      cook_minutes: Number.isFinite(data.cook_minutes) ? String(data.cook_minutes) : '',
      servings: Number.isFinite(data.servings) ? String(data.servings) : '',
      url: sourceUrl,
    });
    setEditId(null);
    setAddOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScan = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setScanning(true);
    try {
      const image = await compressImage(file);
      // 認食譜同存相同時做；存相失敗都唔緊要，淨係冇縮圖，唔阻食譜辨識
      const [scanRes, uploadRes] = await Promise.allSettled([
        axios.post('/api/scan-dish', { image, media_type: 'image/jpeg', lang }),
        axios.post('/api/upload-image', { image, media_type: 'image/jpeg' }),
      ]);
      if (scanRes.status !== 'fulfilled') throw scanRes.reason;
      const uploadedUrl = uploadRes.status === 'fulfilled' ? uploadRes.value.data.url : '';
      fillForm({ ...scanRes.value.data, image: uploadedUrl });
    } catch (err) {
      alert(t.scanFailedPrefix + errMsg(err));
    } finally {
      setScanning(false);
    }
  };

  // 表單入面（新增/編輯都用得）上載相片做縮圖：先裁做正方形，確定先真正上載，
  // 淨係填返 form.image，實際儲存要撳「新增/更新食譜」先算數
  const handleFormPhotoPick = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setCropFile(file);
  };

  const handleFormCropConfirm = async (image) => {
    setCropFile(null);
    setThumbBusy(true);
    try {
      const { data: uploaded } = await axios.post('/api/upload-image', { image, media_type: 'image/jpeg' });
      setForm((f) => ({ ...f, image: uploaded.url }));
    } catch (err) {
      alert(t.thumbFailed + '：' + errMsg(err));
    } finally {
      setThumbBusy(false);
    }
  };

  // 帶埋 viewRecipe 其餘欄位一齊 PUT 返個新 notes 陣列（後端 COALESCE 會保留除 notes 外嘅其他欄位不變）
  const putRecipeNotes = async (newNotes) => {
    if (!viewRecipe) return;
    setNoteBusy(true);
    try {
      const { data: updated } = await axios.put(`/api/recipes/${viewRecipe.id}`, {
        name: viewRecipe.name,
        description: viewRecipe.description,
        ingredients: viewRecipe.ingredients,
        image: viewRecipe.image,
        url: viewRecipe.url,
        category: viewRecipe.category,
        prep_minutes: viewRecipe.prep_minutes,
        cook_minutes: viewRecipe.cook_minutes,
        servings: viewRecipe.servings,
        notes: newNotes,
      });
      setViewRecipe(updated);
      fetchRecipes();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setNoteBusy(false);
    }
  };

  const handleAddNote = async () => {
    const text = noteDraft.trim();
    if (!text || !viewRecipe) return;
    const newNotes = [
      { date: new Date().toISOString().slice(0, 10), text },
      ...(Array.isArray(viewRecipe.notes) ? viewRecipe.notes : []),
    ];
    await putRecipeNotes(newNotes);
    setNoteDraft('');
    setAddingNote(false);
  };

  const handleSaveEditNote = async () => {
    const text = editNoteDraft.trim();
    if (!text || !viewRecipe || editingNoteIdx === null) return;
    const newNotes = viewRecipe.notes.map((n, i) => (i === editingNoteIdx ? { ...n, text } : n));
    await putRecipeNotes(newNotes);
    setEditingNoteIdx(null);
    setEditNoteDraft('');
  };

  const handleDeleteNote = async (idx) => {
    if (!viewRecipe || !window.confirm(t.confirmDelete)) return;
    const newNotes = viewRecipe.notes.filter((_, i) => i !== idx);
    await putRecipeNotes(newNotes);
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
      category: normalizeCat(form.category),
      ingredients: form.ingredients.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
      prep_minutes: form.prep_minutes === '' ? null : Number(form.prep_minutes),
      cook_minutes: form.cook_minutes === '' ? null : Number(form.cook_minutes),
      servings: form.servings === '' ? null : Number(form.servings),
    };
    if (editId) {
      await axios.put(`/api/recipes/${editId}`, payload);
    } else {
      await axios.post('/api/recipes', payload);
    }
    setForm(emptyRecipe);
    setEditId(null);
    setAddOpen(false);
    fetchRecipes();
  };

  const handleEdit = recipe => {
    setTab('recipes');
    // notes 唔喺表單度改（有自己嘅日誌式流程），刻意由 spread 剔走，唔好帶去 PUT payload
    const { notes: _notes, ...recipeFields } = recipe;
    setForm({
      ...recipeFields,
      category: catLabel(recipe.category, lang),
      ingredients: Array.isArray(recipe.ingredients)
        ? recipe.ingredients.join(', ')
        : recipe.ingredients,
      prep_minutes: Number.isFinite(recipe.prep_minutes) ? String(recipe.prep_minutes) : '',
      cook_minutes: Number.isFinite(recipe.cook_minutes) ? String(recipe.cook_minutes) : '',
      servings: Number.isFinite(recipe.servings) ? String(recipe.servings) : '',
    });
    setEditId(recipe.id);
    setAddOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.confirmDelete)) return false;
    await axios.delete(`/api/recipes/${id}`);
    setShopSel((sel) => sel.filter((x) => x !== id));
    fetchRecipes();
    return true;
  };

  const handleCancel = () => {
    setEditId(null);
    setForm(emptyRecipe);
    setAddOpen(false);
  };

  const langButton = (
    <button
      type="button"
      onClick={toggleLang}
      className="border border-gray-400 text-gray-600 dark:text-gray-300 text-sm font-bold py-1 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  );

  if (!token) {
    return (
      <div className="min-h-screen starfield font-sans text-white">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex justify-end pt-2">{langButton}</div>
          <div className="text-center mt-4">
            <h1 className="text-4xl font-bold">{t.title}</h1>
            <p className="text-gray-300 mt-2">{t.tagline}</p>
          </div>
          <Suspense fallback={<div style={{ height: 360 }} />}>
            <GlobeView points={buildGlobePoints([], lang)} height={360} />
          </Suspense>
          <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-xl shadow-xl max-w-sm mx-auto relative -mt-4">
          <input
            value={authUser}
            onChange={(e) => setAuthUser(e.target.value)}
            placeholder={t.username}
            className="w-full p-2 border dark:border-gray-600 rounded mb-3"
          />
          <input
            type="password"
            value={authPwd}
            onChange={(e) => setAuthPwd(e.target.value)}
            placeholder={t.password}
            className="w-full p-2 border dark:border-gray-600 rounded mb-4"
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
      </div>
    );
  }

  const cats = [...new Set(recipes.map((r) => r.category).filter(Boolean))];
  const searchQ = searchQuery.trim().toLowerCase();
  const shownRecipes = recipes
    .filter((r) => !catFilter || r.category === catFilter)
    .filter(
      (r) =>
        !searchQ ||
        r.name.toLowerCase().includes(searchQ) ||
        (Array.isArray(r.ingredients) && r.ingredients.some((i) => i.toLowerCase().includes(searchQ)))
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'oldest') return a.id - b.id;
      if (sortBy === 'time') return ((a.prep_minutes || 0) + (a.cook_minutes || 0)) - ((b.prep_minutes || 0) + (b.cook_minutes || 0));
      return b.id - a.id; // newest
    });

  const convNum = parseFloat(convVal);
  let conv = null;
  if (!isNaN(convNum)) {
    const d = DENSITY[convType];
    const ml =
      convUnit === 'g' ? convNum / d
      : convUnit === 'ml' ? convNum
      : convUnit === 'cup' ? convNum * 240
      : convUnit === 'tbsp' ? convNum * 15
      : convNum * 5;
    const r = (x, p = 1) => Math.round(x * 10 ** p) / 10 ** p;
    conv = { g: r(ml * d), ml: r(ml), cup: r(ml / 240, 2), tbsp: r(ml / 15, 1), tsp: r(ml / 5, 1) };
  }

  return (
    <div className="min-h-screen bg-gray-50 starfield-app text-gray-900 dark:text-gray-100 font-sans">
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6 relative">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="border border-gray-400 dark:border-gray-500 text-xl font-bold py-1 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="menu"
        >
          ☰
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-12 z-20 w-60 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow-xl p-2">
              {['home', 'recipes', 'plan', 'shopping', 'insights'].map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setTab(k);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left py-2 px-3 rounded-lg font-bold ${
                    tab === k ? 'bg-orange-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {t['tab_' + k]}
                </button>
              ))}
              <hr className="my-2 border-gray-200 dark:border-gray-600" />
              <p className="px-3 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t.settings}</p>
              <div className="flex items-center justify-between py-1 px-3">
                <span className="text-sm">{t.language}</span>
                {langButton}
              </div>
              <div className="flex items-center justify-between py-1 px-3">
                <span className="text-sm">{t.themeLabel}</span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="border border-gray-400 text-sm font-bold py-1 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
              </div>
              <hr className="my-2 border-gray-200 dark:border-gray-600" />
              <button
                type="button"
                onClick={logout}
                className="w-full text-left py-2 px-3 rounded-lg font-bold text-red-500 hover:bg-red-50 dark:hover:bg-gray-700"
              >
                {t.logout}
              </button>
            </div>
          </>
        )}
      </div>

      {tab === 'home' && (
        <div>
          <p className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">{t.tagline}</p>
          <Suspense fallback={<div style={{ height: 420 }} className="flex items-center justify-center text-gray-400">{t.loading}</div>}>
            <GlobeView
              points={buildGlobePoints(recipes, lang)}
              height={420}
              onSelect={(code) => {
                setCatFilter(code);
                setTab('recipes');
              }}
            />
          </Suspense>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t.globeHint}</p>
        </div>
      )}

      {tab === 'recipes' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm flex-shrink-0"
            >
              <option value="">{t.all}</option>
              {cats.map((c) => (
                <option key={c} value={c}>{catLabel(c, lang)}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm flex-shrink-0"
            >
              <option value="newest">{t.sortNewest}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="name">{t.sortName}</option>
              <option value="time">{t.sortTime}</option>
            </select>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPh}
              className="flex-1 min-w-0 p-2 border dark:border-gray-600 rounded text-sm"
            />
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              aria-label={t.addRecipe}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold leading-none"
            >
              ＋
            </button>
          </div>
          {addOpen && (
          <>
          <div className="flex gap-2 mb-4">
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder={t.importPh}
              className="flex-1 p-2 border dark:border-gray-600 rounded"
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
          <form onSubmit={handleSubmit} className="mb-8 bg-white dark:bg-gray-800 p-6 rounded shadow">
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-1">{t.name}</label>
              <input
                name="name"
                placeholder={t.name}
                value={form.name}
                onChange={handleChange}
                required
                className="w-full p-2 border dark:border-gray-600 rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-1">{t.category}</label>
              <input
                name="category"
                placeholder={t.category}
                value={form.category}
                onChange={handleChange}
                list="cat-options"
                className="w-full p-2 border dark:border-gray-600 rounded"
              />
              <datalist id="cat-options">
                {[...new Set([...CATS.map((c) => c[lang]), ...cats.map((v) => catLabel(v, lang))])].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-1">
                {t.imageUrl}{!editId && ' *'}
              </label>
              <input
                name="image"
                placeholder={t.imageUrl}
                value={form.image}
                onChange={handleChange}
                required={!editId}
                className="w-full p-2 border dark:border-gray-600 rounded"
              />
              {!editId && <p className="text-xs text-gray-400 mt-1">{t.imageRequiredHint}</p>}
              <label className={`inline-block mt-2 text-xs font-bold py-1 px-3 rounded-full border dark:border-gray-600 cursor-pointer ${thumbBusy ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {thumbBusy ? t.thumbUpdating : t.changeThumbnail}
                <input type="file" accept="image/*" onChange={handleFormPhotoPick} disabled={thumbBusy} className="hidden" />
              </label>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm">{t.prepMinLabel}</label>
                <input
                  type="number"
                  min="0"
                  name="prep_minutes"
                  value={form.prep_minutes}
                  onChange={handleChange}
                  className="w-full p-2 border dark:border-gray-600 rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm">{t.cookMinLabel}</label>
                <input
                  type="number"
                  min="0"
                  name="cook_minutes"
                  value={form.cook_minutes}
                  onChange={handleChange}
                  className="w-full p-2 border dark:border-gray-600 rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm">{t.servingsLabel}</label>
                <input
                  type="number"
                  min="0"
                  name="servings"
                  value={form.servings}
                  onChange={handleChange}
                  className="w-full p-2 border dark:border-gray-600 rounded"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-1">{t.recipeUrl}</label>
              <input
                name="url"
                placeholder={t.recipeUrl}
                value={form.url}
                onChange={handleChange}
                className="w-full p-2 border dark:border-gray-600 rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-1">{t.ingredients}</label>
              <textarea
                name="ingredients"
                placeholder={t.ingredients}
                value={form.ingredients}
                onChange={handleChange}
                required
                rows={3}
                className="w-full p-2 border dark:border-gray-600 rounded resize-y"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-1">{t.description}</label>
              <textarea
                name="description"
                placeholder={t.description}
                value={form.description}
                onChange={handleChange}
                required
                rows={5}
                className="w-full p-2 border dark:border-gray-600 rounded resize-y"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                {editId ? t.update : t.add}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                {t.cancelEdit}
              </button>
            </div>
          </form>
          </>
          )}

          {!loaded ? (
            <p>{t.loading}</p>
          ) : shownRecipes.length === 0 ? (
            <p>{t.empty}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {shownRecipes.map((recipe) => {
                const count = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;
                const totalMin = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);
                return (
                  <button
                    key={recipe.id}
                    onClick={() => {
                      setViewRecipe(recipe);
                      setDetailTab('steps');
                      setAddingNote(false);
                      setNoteDraft('');
                      setEditingNoteIdx(null);
                      setEditNoteDraft('');
                    }}
                    className="text-left bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl overflow-hidden shadow"
                  >
                    {recipe.image ? (
                      <img src={recipe.image} alt={recipe.name} className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-gradient-to-br from-orange-300 to-orange-500 dark:from-gray-600 dark:to-gray-800">
                        <span className="text-4xl">{CAT_EMOJI[recipe.category] || '🍽️'}</span>
                      </div>
                    )}
                    <div className="p-2">
                      <p className="font-bold text-sm line-clamp-2">{recipe.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {totalMin ? `⏱ ${totalMin} ${t.minutesAbbrev} ・ ` : ''}
                        🛒 {count} {t.itemsLabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {viewRecipe && (
            <>
              <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setViewRecipe(null)} />
              <div className="fixed inset-x-4 top-10 bottom-10 z-40 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-y-auto p-6">
                <div className="flex justify-end gap-1.5 mb-2">
                  <button
                    onClick={() => {
                      const r = viewRecipe;
                      setViewRecipe(null);
                      handleEdit(r);
                    }}
                    aria-label={t.edit}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-600 dark:border dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-100"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={async () => {
                      if (await handleDelete(viewRecipe.id)) setViewRecipe(null);
                    }}
                    aria-label={t.del}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-600 dark:border dark:border-gray-500 hover:bg-red-100 dark:hover:bg-red-900 text-gray-700 dark:text-gray-100"
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() => setViewRecipe(null)}
                    aria-label="close"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-600 dark:border dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-100 text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>
                <div className="mb-3">
                  {viewRecipe.image ? (
                    <img src={viewRecipe.image} alt={viewRecipe.name} className="w-full aspect-square object-cover rounded" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center rounded bg-gradient-to-br from-orange-300 to-orange-500 dark:from-gray-600 dark:to-gray-800">
                      <span className="text-5xl">{CAT_EMOJI[viewRecipe.category] || '🍽️'}</span>
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-bold">{viewRecipe.name}</h2>
                {catLabel(viewRecipe.category, lang) && (
                  <span className="inline-block bg-orange-100 dark:bg-gray-700 text-orange-700 dark:text-orange-300 text-xs font-bold px-2 py-1 rounded-full mt-1">
                    {catLabel(viewRecipe.category, lang)}
                  </span>
                )}
                {(viewRecipe.prep_minutes || viewRecipe.cook_minutes || viewRecipe.servings) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {viewRecipe.prep_minutes ? `⏱ ${t.prepMinLabel} ${viewRecipe.prep_minutes} ${t.minutesAbbrev}　` : ''}
                    {viewRecipe.cook_minutes ? `🍳 ${t.cookMinLabel} ${viewRecipe.cook_minutes} ${t.minutesAbbrev}　` : ''}
                    {viewRecipe.servings ? `🍽 ${viewRecipe.servings} ${t.servingsUnit}` : ''}
                  </p>
                )}

                <div className="flex gap-4 mt-4 mb-3 border-b dark:border-gray-600">
                  {['steps', 'ingredients', 'notes'].map((k) => (
                    <button
                      key={k}
                      onClick={() => setDetailTab(k)}
                      className={`pb-2 px-1 font-bold text-sm border-b-2 -mb-px ${
                        detailTab === k
                          ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {k === 'steps' ? t.stepsHeading : k === 'ingredients' ? t.ingredientsHeading : t.notesHeading}
                    </button>
                  ))}
                </div>

                {detailTab === 'steps' && (
                  <p className="whitespace-pre-line">{formatSteps(viewRecipe.description)}</p>
                )}
                {detailTab === 'ingredients' && (
                  <>
                    {Array.isArray(viewRecipe.ingredients) && (
                      <ul className="list-disc ml-6">
                        {viewRecipe.ingredients.map((item, idx) => <li key={idx}>{item}</li>)}
                      </ul>
                    )}
                    <details className="mt-4 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded p-3">
                      <summary className="font-bold cursor-pointer text-sm">{t.converter}</summary>
                      <div className="flex gap-2 mt-3 flex-wrap items-center">
                        <input
                          type="number"
                          value={convVal}
                          onChange={(e) => setConvVal(e.target.value)}
                          placeholder={t.convAmount}
                          className="w-24 p-2 border dark:border-gray-600 rounded"
                        />
                        <select value={convUnit} onChange={(e) => setConvUnit(e.target.value)} className="p-2 border dark:border-gray-600 rounded">
                          {['g', 'ml', 'cup', 'tbsp', 'tsp'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <select value={convType} onChange={(e) => setConvType(e.target.value)} className="p-2 border dark:border-gray-600 rounded">
                          {CONV_TYPES.map((c) => (
                            <option key={c.code} value={c.code}>{c[lang]}</option>
                          ))}
                        </select>
                      </div>
                      {conv && (
                        <p className="mt-3 text-gray-800 dark:text-gray-100 font-bold text-sm">
                          {conv.g} g ・ {conv.ml} ml ・ {conv.cup} cup ・ {conv.tbsp} tbsp ・ {conv.tsp} tsp
                        </p>
                      )}
                      <p className="text-gray-400 text-xs mt-2">{t.convNote}</p>
                    </details>
                  </>
                )}
                {detailTab === 'notes' && (
                  <>
                    {!addingNote ? (
                      <button
                        type="button"
                        onClick={() => setAddingNote(true)}
                        className="text-sm font-bold py-1 px-3 rounded-full border dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t.addNote}
                      </button>
                    ) : (
                      <div className="mb-3">
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder={t.noteText}
                          rows={3}
                          autoFocus
                          className="w-full p-2 border dark:border-gray-600 rounded resize-y"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={handleAddNote}
                            disabled={noteBusy || !noteDraft.trim()}
                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-bold text-sm py-1 px-3 rounded"
                          >
                            {t.saveNote}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingNote(false);
                              setNoteDraft('');
                            }}
                            className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold text-sm py-1 px-3 rounded"
                          >
                            {t.cancelNote}
                          </button>
                        </div>
                      </div>
                    )}

                    {Array.isArray(viewRecipe.notes) && viewRecipe.notes.length > 0 ? (
                      <ul className="mt-3 space-y-3">
                        {viewRecipe.notes.map((n, idx) => (
                          <li key={idx} className="border-l-2 border-orange-300 dark:border-orange-600 pl-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-gray-400">{n.date}</p>
                              {editingNoteIdx !== idx && (
                                <div className="flex gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingNoteIdx(idx);
                                      setEditNoteDraft(n.text);
                                    }}
                                    aria-label={`${t.edit} note`}
                                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(idx)}
                                    aria-label={`${t.del} note`}
                                    className="text-xs text-gray-400 hover:text-red-500"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>
                            {editingNoteIdx === idx ? (
                              <div className="mt-1">
                                <textarea
                                  value={editNoteDraft}
                                  onChange={(e) => setEditNoteDraft(e.target.value)}
                                  rows={3}
                                  autoFocus
                                  className="w-full p-2 border dark:border-gray-600 rounded resize-y text-sm"
                                />
                                <div className="flex gap-2 mt-1">
                                  <button
                                    onClick={handleSaveEditNote}
                                    disabled={noteBusy || !editNoteDraft.trim()}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-bold text-xs py-1 px-2 rounded"
                                  >
                                    {t.saveNote}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingNoteIdx(null);
                                      setEditNoteDraft('');
                                    }}
                                    className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold text-xs py-1 px-2 rounded"
                                  >
                                    {t.cancelNote}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">{n.text}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 text-sm mt-3">{t.noNotes}</p>
                    )}

                    {viewRecipe.url && (
                      <p className="mt-4">
                        🔗 <a href={viewRecipe.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{t.link}</a>
                      </p>
                    )}
                  </>
                )}

              </div>
            </>
          )}

          <SquareCrop
            file={cropFile}
            onCancel={() => setCropFile(null)}
            onConfirm={handleFormCropConfirm}
            title={t.cropTitle}
            cancelLabel={t.cropCancel}
            confirmLabel={t.cropConfirm}
          />
        </>
      )}

      {tab === 'plan' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="bg-white dark:bg-gray-800 border font-bold py-1 px-4 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ‹
            </button>
            <span className="font-bold">
              {shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}
            </span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="bg-white dark:bg-gray-800 border font-bold py-1 px-4 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ›
            </button>
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const day = addDays(weekStart, i);
            const date = fmtDate(day);
            const isToday = date === fmtDate(new Date());
            return (
              <div key={date} className={`bg-white dark:bg-gray-800 border dark:border-gray-600 rounded p-4 mb-3 shadow ${isToday ? 'border-orange-400 border-2' : ''}`}>
                <p className="font-bold mb-2">
                  {DAYS[lang][i]} <span className="text-gray-500 dark:text-gray-400">{shortDate(day)}</span>
                </p>
                {MEALS.map((meal) => {
                  const entry = plan[`${date}|${meal}`];
                  return (
                    <div key={meal} className="flex items-center gap-2 mb-1">
                      <span className="w-14 text-sm text-gray-500 dark:text-gray-400">{t[meal]}</span>
                      {entry ? (
                        <>
                          <span className="flex-1">{entry.name}</span>
                          <button
                            onClick={() => clearSlot(date, meal)}
                            className="text-red-500 font-bold px-2 hover:bg-red-50 dark:hover:bg-gray-700 rounded"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <select
                          value=""
                          onChange={(e) => setSlot(date, meal, e.target.value)}
                          className="flex-1 p-1 border dark:border-gray-600 rounded text-gray-500 dark:text-gray-400 text-sm"
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
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{t.shopHint}</p>
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded p-4 mb-4 shadow">
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
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded p-4 shadow">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => { setShopList(null); setShopChecked({}); }}
                  className="text-sm text-red-500 font-bold hover:bg-red-50 dark:hover:bg-gray-700 py-1 px-3 rounded"
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
            name: catLabel(c.category, lang) || t.uncategorized,
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
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded p-4 mb-4 shadow">
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
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded p-4 mb-4 shadow">
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
                  <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded p-4 mb-4 shadow">
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
                  <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded p-4 shadow">
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
    </div>
  );
};

export default App;
