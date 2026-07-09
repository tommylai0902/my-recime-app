import React, { useEffect, useState } from 'react';
import axios from 'axios';

const STR = {
  zh: {
    title: '🍽 我的食譜清單',
    scanBtn: '📷 掃描菜式出食譜',
    scanning: '辨識中⋯⋯',
    scanFailedPrefix: '掃描失敗：',
    scan_failed: '掃描失敗',
    busy: 'AI 而家太多人用，等一陣再試',
    unrecognized: '無法辨識呢張相',
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
    login: '登入',
    register: '註冊',
    username: '用戶名',
    password: '密碼（最少 6 位）',
    logout: '登出',
    invalid_input: '請輸入用戶名同密碼',
    password_too_short: '密碼最少要 6 位',
    username_taken: '用戶名已被使用',
    bad_credentials: '用戶名或密碼錯誤',
    server_error: '伺服器錯誤，請再試',
  },
  en: {
    title: '🍽 My Recipes',
    scanBtn: '📷 Scan a dish for its recipe',
    scanning: 'Identifying…',
    scanFailedPrefix: 'Scan failed: ',
    scan_failed: 'Scan failed',
    busy: 'AI is busy right now, try again in a moment',
    unrecognized: "Couldn't recognize this photo",
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
    login: 'Log in',
    register: 'Sign up',
    username: 'Username',
    password: 'Password (min 6 chars)',
    logout: 'Log out',
    invalid_input: 'Please enter a username and password',
    password_too_short: 'Password must be at least 6 characters',
    username_taken: 'Username already taken',
    bad_credentials: 'Wrong username or password',
    server_error: 'Server error, please try again',
  },
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

const App = () => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'zh');
  const t = STR[lang];
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authUser, setAuthUser] = useState('');
  const [authPwd, setAuthPwd] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [recipes, setRecipes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(emptyRecipe);
  const [editId, setEditId] = useState(null);
  const [scanning, setScanning] = useState(false);

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
      const code = err.response?.data?.error;
      setAuthErr(STR[lang][code] || t.server_error);
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

  const handleScan = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setScanning(true);
    try {
      const image = await compressImage(file);
      const { data } = await axios.post('/api/scan-dish', { image, media_type: 'image/jpeg', lang });
      setForm({
        ...emptyRecipe,
        name: data.name,
        category: data.category,
        description: data.description,
        ingredients: data.ingredients.join(', '),
      });
      setEditId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const code = err.response?.data?.error;
      alert(t.scanFailedPrefix + (STR[lang][code] || err.message));
    } finally {
      setScanning(false);
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
    setForm({
      ...recipe,
      ingredients: Array.isArray(recipe.ingredients)
        ? recipe.ingredients.join(', ')
        : recipe.ingredients,
    });
    setEditId(recipe.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    await axios.delete(`/api/recipes/${id}`);
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

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
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
      <label className={`block text-center mb-6 py-3 px-4 rounded font-bold text-white cursor-pointer ${scanning ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-700'}`}>
        {scanning ? t.scanning : t.scanBtn}
        <input type="file" accept="image/*" capture="environment" onChange={handleScan} disabled={scanning} className="hidden" />
      </label>
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
            className="w-full p-2 border rounded"
          />
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
      {!loaded ? (
        <p>{t.loading}</p>
      ) : recipes.length === 0 ? (
        <p>{t.empty}</p>
      ) : (
        recipes.map((recipe) => (
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
    </div>
  );
};

export default App;
