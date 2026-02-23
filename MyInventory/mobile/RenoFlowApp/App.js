// RenoFlow Mobile App — v2 (Modern UI + Editable Scan + Smart Dropdown)
// npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
// npx expo install react-native-screens react-native-safe-area-context expo-image-picker expo-secure-store

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, Alert, ActivityIndicator, Image, RefreshControl,
  StatusBar, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';


// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BASE_URL = 'https://myinven-production.up.railway.app'; // ← kendi IP'ngiz

// ─── i18n ─────────────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  uz: {
    warehouses: 'Omborlar', scan: 'Skan', references: "Ma'lumot", profile: 'Profil',
    addWarehouse: 'Yangi Ombor', warehouseCount: (n) => `${n} ta ombor`,
    noWarehouse: "Ombor yo'q", noWarehouseSub: 'Yangi ombor qo\'shish uchun + tugmasini bosing',
    buylist: 'Buylist', noProduct: "Mahsulot yo'q", noProductSub: '+ tugmasini bosib mahsulot qo\'shing',
    totalProduct: 'Jami mahsulot', lowStock: 'Kam zaxira', lowStockWarn: 'Kam zaxira',
    currencyAnalysis: 'Valyuta bo\'yicha tahlil', productTypes: (n) => `${n} xil mahsulot`,
    addProduct: 'Mahsulot Qo\'shish', qty: 'Miqdor *', price: 'Narx', unit: 'Birlik', currency: 'Valyuta',
    cancel: 'Bekor', save: 'Saqlash', delete: 'O\'chirish', confirmDelete: "O'chirasizmi?",
    login: 'Kirish', username: 'Username', password: 'Parol', loginBtn: 'Kirish →',
    profileTitle: 'Profil', editEmail: 'Email o\'zgartirish', language: 'Til',
    darkMode: 'Qoʻngʻir rejim', accentColor: 'Asosiy rang', logout: 'Tizimdan chiqish',
    logoutConfirm: 'Tizimdan chiqmoqchimisiz?', yes: 'Chiqish',
    accountInfo: 'Hisob ma\'lumotlari', appearance: 'Ko\'rinish',
    emailUpdated: 'Email yangilandi', emailLabel: 'Yangi email',
    items: 'Mahsulotlar', units: 'Birliklar', moneys: 'Valyutalar',
    newRecord: 'Yangi yozuv', noRecord: "Yozuv yo'q", noRecordSub: 'Yangi yozuv qo\'shing',
    scanTitle: 'AI Fatura Skan', scanSub: 'Rasmni yuklang, AI tahlil qiladi',
    uploadInvoice: 'Fatura rasmini yuklang', camera: 'Kamera', gallery: 'Galereya',
    scanBtn: 'AI bilan Skan Qilish', scanning: 'Skanlanmoqda...',
    detectedProducts: (n) => `Aniqlangan mahsulotlar (${n})`,
    placeToWarehouse: 'Omborga joylash', approve: (n) => `Tasdiqlash — ${n} mahsulot`,
    successTitle: 'Muvaffaqiyatli!', successSub: (n) => `${n} ta mahsulot inventarga qo'shildi`,
    newScan: 'Yangi Skan', editing: 'Tahrirlash', done: 'Tayyor',
    productName: 'Mahsulot nomi', noPrice: 'Narx topilmadi — qo\'lda kiriting',
    editHint: 'Tahrirlash mumkin', canEdit: 'tahrirlash',
    selectProduct: 'Mahsulot tanlash', searchProduct: 'Qidirish yoki yangi mahsulot nomi...',
    createNew: 'Yangi mahsulot yaratish', willAdd: (n) => `«${n}» — ro'yxatga qo'shiladi`,
    notFound: 'Hech narsa topilmadi', deleteRow: 'Bu qatorni o\'chirish',
    replace: 'Almashtirish', clear: 'O\'chirish',
    role: 'Role', id: 'ID', email: 'Email',
  },
  tr: {
    warehouses: 'Depolar', scan: 'Tara', references: 'Referanslar', profile: 'Profil',
    addWarehouse: 'Yeni Depo', warehouseCount: (n) => `${n} depo`,
    noWarehouse: 'Depo yok', noWarehouseSub: 'Yeni depo eklemek için + tuşuna basın',
    buylist: 'Stok', noProduct: 'Ürün yok', noProductSub: '+ tuşuna basarak ürün ekleyin',
    totalProduct: 'Toplam ürün', lowStock: 'Az stok', lowStockWarn: 'Az stok',
    currencyAnalysis: 'Para birimine göre analiz', productTypes: (n) => `${n} ürün çeşidi`,
    addProduct: 'Ürün Ekle', qty: 'Miktar *', price: 'Fiyat', unit: 'Birim', currency: 'Para birimi',
    cancel: 'İptal', save: 'Kaydet', delete: 'Sil', confirmDelete: 'Silmek istiyor musunuz?',
    login: 'Giriş', username: 'Kullanıcı adı', password: 'Şifre', loginBtn: 'Giriş →',
    profileTitle: 'Profil', editEmail: 'E-posta güncelle', language: 'Dil',
    darkMode: 'Karanlık mod', accentColor: 'Ana renk', logout: 'Çıkış yap',
    logoutConfirm: 'Çıkış yapmak istiyor musunuz?', yes: 'Çıkış',
    accountInfo: 'Hesap bilgileri', appearance: 'Görünüm',
    emailUpdated: 'E-posta güncellendi', emailLabel: 'Yeni e-posta',
    items: 'Ürünler', units: 'Birimler', moneys: 'Para birimleri',
    newRecord: 'Yeni kayıt', noRecord: 'Kayıt yok', noRecordSub: 'Yeni kayıt ekleyin',
    scanTitle: 'AI Fatura Tarama', scanSub: 'Resmi yükleyin, AI analiz eder',
    uploadInvoice: 'Fatura resmini yükleyin', camera: 'Kamera', gallery: 'Galeri',
    scanBtn: 'AI ile Tara', scanning: 'Taranıyor...',
    detectedProducts: (n) => `Tespit edilen ürünler (${n})`,
    placeToWarehouse: 'Depoya yerleştir', approve: (n) => `Onayla — ${n} ürün`,
    successTitle: 'Başarılı!', successSub: (n) => `${n} ürün envantere eklendi`,
    newScan: 'Yeni Tarama', editing: 'Düzenleme', done: 'Tamam',
    productName: 'Ürün adı', noPrice: 'Fiyat bulunamadı — manuel girin',
    editHint: 'Düzenlenebilir', canEdit: 'düzenle',
    selectProduct: 'Ürün seçin', searchProduct: 'Ara veya yeni ürün adı...',
    createNew: 'Yeni ürün oluştur', willAdd: (n) => `«${n}» — listeye eklenecek`,
    notFound: 'Hiçbir şey bulunamadı', deleteRow: 'Bu satırı sil',
    replace: 'Değiştir', clear: 'Temizle',
    role: 'Rol', id: 'ID', email: 'E-posta',
  },
  en: {
    warehouses: 'Warehouses', scan: 'Scan', references: 'References', profile: 'Profile',
    addWarehouse: 'New Warehouse', warehouseCount: (n) => `${n} warehouse${n !== 1 ? 's' : ''}`,
    noWarehouse: 'No warehouses', noWarehouseSub: 'Press + to add a new warehouse',
    buylist: 'Stock', noProduct: 'No products', noProductSub: 'Press + to add a product',
    totalProduct: 'Total products', lowStock: 'Low stock', lowStockWarn: 'Low stock',
    currencyAnalysis: 'Analysis by currency', productTypes: (n) => `${n} product type${n !== 1 ? 's' : ''}`,
    addProduct: 'Add Product', qty: 'Quantity *', price: 'Price', unit: 'Unit', currency: 'Currency',
    cancel: 'Cancel', save: 'Save', delete: 'Delete', confirmDelete: 'Are you sure?',
    login: 'Login', username: 'Username', password: 'Password', loginBtn: 'Sign In →',
    profileTitle: 'Profile', editEmail: 'Update Email', language: 'Language',
    darkMode: 'Dark mode', accentColor: 'Accent color', logout: 'Sign out',
    logoutConfirm: 'Sign out?', yes: 'Sign out',
    accountInfo: 'Account info', appearance: 'Appearance',
    emailUpdated: 'Email updated', emailLabel: 'New email',
    items: 'Products', units: 'Units', moneys: 'Currencies',
    newRecord: 'New record', noRecord: 'No records', noRecordSub: 'Add a new record',
    scanTitle: 'AI Invoice Scan', scanSub: 'Upload image, AI analyzes',
    uploadInvoice: 'Upload invoice image', camera: 'Camera', gallery: 'Gallery',
    scanBtn: 'Scan with AI', scanning: 'Scanning...',
    detectedProducts: (n) => `Detected products (${n})`,
    placeToWarehouse: 'Place in warehouse', approve: (n) => `Confirm — ${n} product${n !== 1 ? 's' : ''}`,
    successTitle: 'Success!', successSub: (n) => `${n} product${n !== 1 ? 's' : ''} added to inventory`,
    newScan: 'New Scan', editing: 'Editing', done: 'Done',
    productName: 'Product name', noPrice: 'Price not found — enter manually',
    editHint: 'Editable', canEdit: 'edit',
    selectProduct: 'Select product', searchProduct: 'Search or enter new product name...',
    createNew: 'Create new product', willAdd: (n) => `«${n}» — will be added to list`,
    notFound: 'Nothing found', deleteRow: 'Delete this row',
    replace: 'Replace', clear: 'Clear',
    role: 'Role', id: 'ID', email: 'Email',
  },
  ru: {
    warehouses: 'Склады', scan: 'Сканер', references: 'Справочник', profile: 'Профиль',
    addWarehouse: 'Новый склад', warehouseCount: (n) => `${n} склад(ов)`,
    noWarehouse: 'Нет складов', noWarehouseSub: 'Нажмите + для добавления склада',
    buylist: 'Склад', noProduct: 'Нет товаров', noProductSub: 'Нажмите + для добавления товара',
    totalProduct: 'Всего товаров', lowStock: 'Мало на складе', lowStockWarn: 'Мало на складе',
    currencyAnalysis: 'Анализ по валютам', productTypes: (n) => `${n} вид(ов) товара`,
    addProduct: 'Добавить товар', qty: 'Количество *', price: 'Цена', unit: 'Единица', currency: 'Валюта',
    cancel: 'Отмена', save: 'Сохранить', delete: 'Удалить', confirmDelete: 'Вы уверены?',
    login: 'Войти', username: 'Имя пользователя', password: 'Пароль', loginBtn: 'Войти →',
    profileTitle: 'Профиль', editEmail: 'Изменить email', language: 'Язык',
    darkMode: 'Тёмный режим', accentColor: 'Основной цвет', logout: 'Выйти',
    logoutConfirm: 'Выйти из системы?', yes: 'Выйти',
    accountInfo: 'Информация об аккаунте', appearance: 'Внешний вид',
    emailUpdated: 'Email обновлён', emailLabel: 'Новый email',
    items: 'Товары', units: 'Единицы', moneys: 'Валюты',
    newRecord: 'Новая запись', noRecord: 'Нет записей', noRecordSub: 'Добавьте новую запись',
    scanTitle: 'AI Сканер накладных', scanSub: 'Загрузите фото, AI проанализирует',
    uploadInvoice: 'Загрузите фото накладной', camera: 'Камера', gallery: 'Галерея',
    scanBtn: 'Сканировать с AI', scanning: 'Сканирование...',
    detectedProducts: (n) => `Обнаруженные товары (${n})`,
    placeToWarehouse: 'Разместить на складе', approve: (n) => `Подтвердить — ${n} товар(ов)`,
    successTitle: 'Успешно!', successSub: (n) => `${n} товар(ов) добавлено на склад`,
    newScan: 'Новое сканирование', editing: 'Редактирование', done: 'Готово',
    productName: 'Название товара', noPrice: 'Цена не найдена — введите вручную',
    editHint: 'Можно редактировать', canEdit: 'ред.',
    selectProduct: 'Выбрать товар', searchProduct: 'Поиск или новое название...',
    createNew: 'Создать новый товар', willAdd: (n) => `«${n}» — будет добавлен в список`,
    notFound: 'Ничего не найдено', deleteRow: 'Удалить эту строку',
    replace: 'Заменить', clear: 'Очистить',
    role: 'Роль', id: 'ID', email: 'Email',
  },
};

// ─── ACCENT COLORS ────────────────────────────────────────────────────────────
const ACCENT_COLORS = [
  { key: 'blue', main: '#2563eb', light: '#eff6ff', mid: '#bfdbfe', dark: '#1d4ed8' },
  { key: 'violet', main: '#7c3aed', light: '#f5f3ff', mid: '#ddd6fe', dark: '#6d28d9' },
  { key: 'rose', main: '#e11d48', light: '#fff1f2', mid: '#fecdd3', dark: '#be123c' },
  { key: 'orange', main: '#ea580c', light: '#fff7ed', mid: '#fed7aa', dark: '#c2410c' },
  { key: 'teal', main: '#0d9488', light: '#f0fdfa', mid: '#99f6e4', dark: '#0f766e' },
  { key: 'green', main: '#16a34a', light: '#dcfce7', mid: '#bbf7d0', dark: '#15803d' },
];

// ─── SETTINGS CONTEXT ─────────────────────────────────────────────────────────
const SettingsContext = createContext(null);
function useSettings() { return useContext(SettingsContext); }

async function loadUserSettings(userId) {
  try {
    const raw = await SecureStore.getItemAsync(`settings_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
async function saveUserSettings(userId, settings) {
  try { await SecureStore.setItemAsync(`settings_${userId}`, JSON.stringify(settings)); } catch { }
}

function SettingsProvider({ userId, children }) {
  const [lang, setLangState] = useState('uz');
  const [dark, setDarkState] = useState(false);
  const [accentKey, setAccentKeyState] = useState('blue');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadUserSettings(userId).then(s => {
      if (s.lang) setLangState(s.lang);
      if (s.dark !== undefined) setDarkState(s.dark);
      if (s.accentKey) setAccentKeyState(s.accentKey);
      setLoaded(true);
    });
  }, [userId]);

  const save = (patch) => saveUserSettings(userId, { lang, dark, accentKey, ...patch });

  const setLang = (v) => { setLangState(v); save({ lang: v }); };
  const setDark = (v) => { setDarkState(v); save({ dark: v }); };
  const setAccentKey = (v) => { setAccentKeyState(v); save({ accentKey: v }); };

  const accent = ACCENT_COLORS.find(a => a.key === accentKey) || ACCENT_COLORS[0];
  const T = TRANSLATIONS[lang] || TRANSLATIONS.uz;
  const t = T;

  // Dynamic theme based on dark mode and accent
  const theme = {
    blue: accent.main, blueL: accent.light, blueM: accent.mid, blueDark: accent.dark,
    green: '#16a34a', greenL: '#dcfce7',
    red: '#dc2626', redL: '#fee2e2',
    orange: '#d97706', orangeL: '#fff7ed',
    purple: '#7c3aed', purpleL: '#f5f3ff',
    bg: dark ? '#0f172a' : '#f1f5f9',
    surface: dark ? '#1e293b' : '#ffffff',
    surface2: dark ? '#263248' : '#f8fafc',
    border: dark ? '#334155' : '#e2e8f0',
    border2: dark ? '#475569' : '#cbd5e1',
    text: dark ? '#f1f5f9' : '#0f172a',
    text2: dark ? '#e2e8f0' : '#1e293b',
    text3: dark ? '#94a3b8' : '#64748b',
    text4: dark ? '#64748b' : '#94a3b8',
  };

  if (!loaded && userId) {
    // Ayarlar yüklenene kadar loading göster ama provider'ı kaldırma
    // Böylece children'da t ve T her zaman mevcut olur
  }

  return (
    <SettingsContext.Provider value={{ lang, setLang, dark, setDark, accentKey, setAccentKey, accent, t, theme }}>
      {children}
    </SettingsContext.Provider>
  );
}

// ─── THEME (default/fallback) ─────────────────────────────────────────────────
const C = {
  blue: '#2563eb', blueL: '#eff6ff', blueM: '#bfdbfe', blueDark: '#1d4ed8',
  green: '#16a34a', greenL: '#dcfce7',
  red: '#dc2626', redL: '#fee2e2',
  orange: '#d97706', orangeL: '#fff7ed',
  purple: '#7c3aed', purpleL: '#f5f3ff',
  bg: '#f1f5f9', surface: '#ffffff', surface2: '#f8fafc',
  border: '#e2e8f0', border2: '#cbd5e1',
  text: '#0f172a', text2: '#1e293b', text3: '#64748b', text4: '#94a3b8',
};
// Hook to get current theme (falls back to C if no context)
function useTheme() {
  const ctx = useContext(SettingsContext);
  return ctx ? ctx.theme : C;
}
function useLang() {
  const ctx = useContext(SettingsContext);
  return ctx ? ctx.t : TRANSLATIONS.uz;
}

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }

// ─── API ──────────────────────────────────────────────────────────────────────
async function getToken() { try { return await SecureStore.getItemAsync('token'); } catch { return null; } }
async function saveToken(t) { try { await SecureStore.setItemAsync('token', t || ''); } catch { } }

async function api(path, method = 'GET', body = null) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Token ${token}`;
  const opts = { method, headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || data?.non_field_errors?.[0] || Object.values(data).flat().join(', ') || `Xato: ${res.status}`);
  return data;
}

async function apiUpload(path, uri, type) {
  const token = await getToken();
  const fd = new FormData();
  fd.append('image', { uri, type: type || 'image/jpeg', name: 'invoice.jpg' });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST', headers: token ? { 'Authorization': `Token ${token}` } : {}, body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `Xato: ${res.status}`);
  return data;
}

const AUTH = { login: (u, p) => api('/user_app/login/', 'POST', { username: u, password: p }), users: () => api('/user_app/users/'), createUser: (d) => api('/user_app/users/', 'POST', d), companies: () => api('/user_app/companies/'), createCompany: (d) => api('/user_app/companies/', 'POST', d), deleteCompany: (id) => api(`/user_app/companies/${id}/`, 'DELETE') };
const DEPOLAR = { list: () => api('/depolar/'), create: (d) => api('/depolar/', 'POST', d), delete: (id) => api(`/depolar/${id}/`, 'DELETE') };
const BUYLIST = { list: () => api('/buylist/'), create: (d) => api('/buylist/', 'POST', d), delete: (id) => api(`/buylist/${id}/`, 'DELETE') };
const ITEMS = { list: () => api('/itemler/'), create: (d) => api('/itemler/', 'POST', d), delete: (id) => api(`/itemler/${id}/`, 'DELETE') };
const MONEY = { list: () => api('/moneytypes/'), create: (d) => api('/moneytypes/', 'POST', d), delete: (id) => api(`/moneytypes/${id}/`, 'DELETE') };
const UNITS = { list: () => api('/unitler/'), create: (d) => api('/unitler/', 'POST', d), delete: (id) => api(`/unitler/${id}/`, 'DELETE') };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function cfm(title, msg, onYes) {
  Alert.alert(title, msg, [{ text: 'Bekor', style: 'cancel' }, { text: "Ha, o'chir", style: 'destructive', onPress: onYes }]);
}
const gn = (arr, id) =>
  arr.find(x => String(x.id) === String(id))?.name ||
  arr.find(x => String(x.id) === String(id))?.unit ||
  arr.find(x => String(x.id) === String(id))?.type || `#${id}`;

// ─── BASE COMPONENTS ──────────────────────────────────────────────────────────
function Btn({ title, onPress, color, textColor = '#fff', disabled, loading, small, outline, style, iconName, iconLib }) {
  const T = useTheme();
  const bc = color || T.blue;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}
      style={[s.btn, { backgroundColor: outline ? 'transparent' : bc, borderColor: bc, borderWidth: outline ? 1.5 : 0 },
      small && s.btnSm, (disabled || loading) && { opacity: 0.5 }, style]}>
      {loading
        ? <ActivityIndicator color={outline ? bc : textColor} size="small" />
        : <>
          {iconName && <VIcon name={iconName} lib={iconLib || 'Ionicons'} size={small ? 16 : 18} color={outline ? bc : textColor} />}
          <Text style={[s.btnTxt, { color: outline ? bc : textColor }, small && { fontSize: 13 }]}>{title}</Text>
        </>}
    </TouchableOpacity>
  );
}

function Card({ children, style }) {
  const T = useTheme();
  return (
    <View style={[s.card, { backgroundColor: T.surface, borderColor: T.border }, style]}>{children}</View>
  );
}

function Badge({ text, color, bg }) {
  const T = useTheme();
  const bc = color || T.blue;
  return (
    <View style={{ backgroundColor: bg || (bc + '20'), paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: bc }}>{text}</Text>
    </View>
  );
}

function Input({ label, value, onChangeText, placeholder, secure, numeric, multiline, style, autoFocus, onSubmitEditing }) {
  const T = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={[s.label, { color: T.text2 }]}>{label}</Text>}
      <TextInput style={[s.input, { backgroundColor: T.surface, borderColor: T.border, color: T.text }, multiline && { height: 72, textAlignVertical: 'top' }, style]}
        value={value} onChangeText={onChangeText} placeholder={placeholder || ''} placeholderTextColor={T.text4}
        secureTextEntry={secure} keyboardType={numeric ? 'numeric' : 'default'}
        multiline={multiline} autoCapitalize="none" autoFocus={autoFocus} onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

// Icon mapping helper
const ICON_MAP = {
  '🏭': { lib: 'MaterialIcons', name: 'warehouse', size: 48 },
  '📦': { lib: 'MaterialIcons', name: 'inventory-2', size: 48 },
  '📋': { lib: 'Ionicons', name: 'list', size: 48 },
  '👤': { lib: 'Ionicons', name: 'person', size: 48 },
  '🏢': { lib: 'MaterialIcons', name: 'business', size: 48 },
  '📄': { lib: 'Ionicons', name: 'document-text', size: 36 },
};
function VIcon({ name, size = 22, color = T.text3, lib }) {
  const ico = ICON_MAP[name] || null;
  const L = lib || (ico?.lib);
  const n = ico ? ico.name : name;
  const sz = size || (ico?.size) || 22;
  if (L === 'MaterialIcons') return <MaterialIcons name={n} size={sz} color={color} />;
  if (L === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={n} size={sz} color={color} />;
  if (L === 'FontAwesome5') return <FontAwesome5 name={n} size={sz} color={color} />;
  return <Ionicons name={n} size={sz} color={color} />;
}

function Empty({ iconName, iconLib, title, sub }) {
  const T = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 52 }}>
      <View style={{ marginBottom: 14, opacity: 0.35 }}>
        <VIcon name={iconName} lib={iconLib} size={52} color={T.text3} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: T.text2, marginBottom: 4 }}>{title}</Text>
      {sub && <Text style={{ fontSize: 13, color: T.text3, textAlign: 'center', paddingHorizontal: 28 }}>{sub}</Text>}
    </View>
  );
}

function StatCard({ label, value, color, iconName, iconLib, iconColor }) {
  const T = useTheme();
  const c = color || T.text;
  return (
    <Card style={{ flex: 1, margin: 4, paddingVertical: 16, alignItems: 'center' }}>
      {iconName && <View style={{ marginBottom: 4 }}><VIcon name={iconName} lib={iconLib} size={22} color={iconColor || c} /></View>}
      <Text style={{ fontSize: 26, fontWeight: '900', color: c, letterSpacing: -1 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: T.text3, fontWeight: '600', marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

// ── Smart Item Picker — dropdown + yangi yozish ───────────────────────────────
function ItemPicker({ items, selected, onSelect, onCreateNew }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const T = useTheme();
  const t = useLang();

  const filtered = items.filter(it => it.name?.toLowerCase().includes(search.toLowerCase()));
  const sel = items.find(it => String(it.id) === String(selected));
  const canCreate = search.trim() && !items.find(it => it.name?.toLowerCase() === search.trim().toLowerCase());

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>Mahsulot *</Text>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.8}
        style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Text style={{ color: sel ? T.text : T.text4, fontSize: 14, flex: 1 }}>
          {sel ? sel.name : 'Mahsulot tanlang yoki yangi yozing...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={T.text3} />
      </TouchableOpacity>

      <Modal visible={open} transparent={false} animationType="slide" onRequestClose={() => { setOpen(false); setSearch(''); }}>
        <View style={{ flex: 1, backgroundColor: T.bg }}>
          {/* Header */}
          <View style={{
            backgroundColor: T.surface, paddingTop: Platform.OS === 'ios' ? 54 : 16,
            paddingBottom: 12, paddingHorizontal: 16,
            borderBottomWidth: 1, borderBottomColor: T.border,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={T.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '800', color: T.text, flex: 1 }}>Mahsulot tanlash</Text>
          </View>

          {/* Search */}
          <View style={{ padding: 12, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 10 }}>
              <Ionicons name="search" size={18} color={T.text3} />
              <TextInput
                style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: T.text }}
                value={search} onChangeText={setSearch}
                placeholder="Qidirish yoki yangi mahsulot nomi..."
                placeholderTextColor={C.text4}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={T.text4} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={it => String(it.id)}
            keyboardShouldPersistTaps="always"
            ListHeaderComponent={canCreate ? (
              <TouchableOpacity onPress={() => { onCreateNew(search.trim()); setOpen(false); setSearch(''); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
                  backgroundColor: T.blueL, borderBottomWidth: 1, borderBottomColor: T.blueM,
                }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.blue, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: T.blue, fontSize: 14 }}>Yangi mahsulot yaratish</Text>
                  <Text style={{ fontSize: 12, color: T.text3, marginTop: 1 }}>«{search.trim()}» — ro'yxatga qo'shiladi</Text>
                </View>
              </TouchableOpacity>
            ) : null}
            ListEmptyComponent={!canCreate ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="search" size={40} color={T.text4} style={{ marginBottom: 10 }} />
                <Text style={{ color: T.text4, fontSize: 14 }}>Hech narsa topilmadi</Text>
              </View>
            ) : null}
            renderItem={({ item: it }) => (
              <TouchableOpacity
                onPress={() => { onSelect(String(it.id)); setOpen(false); setSearch(''); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  padding: 16, borderBottomWidth: 1, borderBottomColor: T.border,
                  backgroundColor: String(it.id) === String(selected) ? T.blueL : T.surface,
                }}>
                <Text style={{ fontSize: 14, color: T.text, fontWeight: String(it.id) === String(selected) ? '800' : '400' }}>
                  {it.name}
                </Text>
                {String(it.id) === String(selected) && <Ionicons name="checkmark" size={20} color={T.blue} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

// ── Chip seçici (unit/valyuta) ────────────────────────────────────────────────
function ChipPicker({ label, items, selected, onSelect, nameKey }) {
  const T = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[s.label, { color: T.text2 }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map(it => {
          const nm = it[nameKey] || it.name || it.unit || it.type;
          const active = String(it.id) === String(selected);
          return (
            <TouchableOpacity key={it.id} onPress={() => onSelect(String(it.id))}
              style={[s.chip, { backgroundColor: active ? T.blue : T.surface, borderColor: active ? T.blue : T.border }, active && s.chipActive]}>
              <Text style={{ color: active ? '#fff' : T.text2, fontSize: 13, fontWeight: active ? '700' : '500' }}>{nm}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const { signIn } = useAuth();
  const T = useTheme();
  const t = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleLogin() {
    if (!username.trim()) { setErr('Username kiriting'); return; }
    setLoading(true); setErr('');
    try {
      const data = await AUTH.login(username, password);
      const token = data.token || data.key;
      if (!token) throw new Error('Token kelmadi');
      await saveToken(token);
      signIn({ ...(data.user || { username }), token });
    } catch (e) { setErr(e.message || 'Login xatosi'); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: T.blue }}>
      <StatusBar barStyle="light-content" backgroundColor={T.blue} />
      <ScrollView contentContainerStyle={s.loginWrap} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={s.loginLogo}>
            <MaterialIcons name="warehouse" size={40} color="#fff" />
          </View>
          <Text style={{ fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -1, marginTop: 12 }}>RenoFlow</Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, marginTop: 4 }}>Ombor boshqaruv tizimi</Text>
        </View>

        {/* Card */}
        <View style={s.loginCard}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: T.text, marginBottom: 20 }}>Kirish</Text>
          {err ? <View style={s.errBox}><Text style={{ color: T.red, fontSize: 13, fontWeight: '600' }}>⚠ {err}</Text></View> : null}
          <Input label="Username" value={username} onChangeText={setUsername} placeholder="username" />
          <Input label="Parol" value={password} onChangeText={setPassword} placeholder="••••••••" secure />
          <Btn title="Kirish  →" onPress={handleLogin} loading={loading} style={{ marginTop: 4 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── WAREHOUSES ───────────────────────────────────────────────────────────────
const WhStack = createStackNavigator();
function WarehousesTab() {
  return (
    <WhStack.Navigator screenOptions={{ headerShown: false }}>
      <WhStack.Screen name="WhList" component={WarehouseListScreen} />
      <WhStack.Screen name="WhDetail" component={WarehouseDetailScreen} />
    </WhStack.Navigator>
  );
}

function WarehouseListScreen({ navigation }) {
  const T = useTheme();
  const t = useLang();
  const { dark } = useSettings();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try { const d = await DEPOLAR.list(); setWarehouses(Array.isArray(d) ? d : d?.results ?? []); }
    catch (e) { Alert.alert('Xato', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, []);

  const filteredWh = warehouses.filter(w =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    (w.address?.toLowerCase() || '').includes(search.toLowerCase())
  );

  async function addWh() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await DEPOLAR.create({ name: form.name, address: form.address }); setShowAdd(false); setForm({ name: '', address: '' }); load(); }
    catch (e) { Alert.alert('Xato', e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <View style={[s.center, { backgroundColor: T.bg }]}><ActivityIndicator size="large" color={T.blue} /></View>;

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.blue} />

      {/* Beautiful Hero Header */}
      <View style={{
        backgroundColor: T.blue,
        paddingTop: Platform.OS === 'ios' ? 54 : 28,
        paddingBottom: 24,
        paddingHorizontal: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialIcons name="warehouse" size={22} color="#fff" />
              </View>
              <View>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>RenoFlow</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: -1 }}>{t.warehouses}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={{
              width: 42, height: 42, borderRadius: 13,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
            }}
            onPress={() => setShowAdd(true)}>
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={{
          flexDirection: 'row', gap: 10, marginTop: 18,
        }}>
          <View style={{
            flex: 1, backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
          }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff' }}>{warehouses.length}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2 }}>{t.warehouses}</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
          }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff' }}>
              {warehouses.filter(w => w.address).length}
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2 }}>
              {warehouses.filter(w => w.address).length !== warehouses.length ? 'Manzilli' : 'Hammasi manzilli'}
            </Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
          }}>
            <MaterialIcons name="inventory-2" size={24} color="rgba(255,255,255,0.85)" />
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 4 }}>{t.totalProduct}</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          <MaterialIcons name="search" size={20} color={T.text3} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: T.text }}
            value={search} onChangeText={setSearch}
            placeholder="Ombor nomi yoki manzil..." placeholderTextColor={T.text4}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color={T.text3} />
            </TouchableOpacity>
          )}
        </View>
        {search.length > 0 && (
          <Text style={{ fontSize: 12, color: T.text3, marginTop: 6, marginLeft: 4 }}>
            {filteredWh.length} ta natija topildi
          </Text>
        )}
      </View>

      <FlatList data={filteredWh} keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={T.blue} colors={[T.blue]} />}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1, backgroundColor: T.bg }}
        ListEmptyComponent={<Empty iconName="warehouse" iconLib="MaterialIcons" title={t.noWarehouse} sub={t.noWarehouseSub} />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('WhDetail', { wh: item })} activeOpacity={0.85}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[s.whIcon, { backgroundColor: T.blueL }]}><MaterialIcons name="warehouse" size={26} color={T.blue} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: T.text }}>{item.name}</Text>
                {item.address && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="location-outline" size={12} color={T.text3} />
                    <Text style={{ fontSize: 12, color: T.text3 }}>{item.address}</Text>
                  </View>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <Ionicons name="chevron-forward" size={20} color={T.text4} />
                <TouchableOpacity onPress={() => cfm(t.delete, `"${item.name}" ${t.confirmDelete}`, async () => {
                  try { await DEPOLAR.delete(item.id); load(); } catch (e) { Alert.alert('Xato', e.message); }
                })} style={[s.delBtn, { backgroundColor: T.redL }]}><MaterialIcons name="delete-outline" size={18} color={T.red} /></TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[s.modalBox, { backgroundColor: T.surface }]}>
              <Text style={[s.modalTitle, { color: T.text }]}>{t.addWarehouse}</Text>
              <Input label={t.productName} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder={t.addWarehouse} autoFocus />
              <Input label="Manzil" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} placeholder="Shahar, ko'cha..." />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn title={t.cancel} onPress={() => setShowAdd(false)} outline color={T.text3} style={{ flex: 1 }} />
                <Btn title={t.save} onPress={addWh} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function WarehouseDetailScreen({ route, navigation }) {
  const T = useTheme();
  const t = useLang();
  const { wh } = route.params;
  const [buylist, setBuylist] = useState([]);
  const [itemler, setItemler] = useState([]);
  const [moneytypes, setMoneytypes] = useState([]);
  const [unitler, setUnitler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const EF = { item: '', moneytype: '', unit: '', qty: '', narx: '' };
  const [form, setForm] = useState(EF);
  const [searchBl, setSearchBl] = useState('');

  const load = useCallback(async () => {
    try {
      const [bl, im, mm, um] = await Promise.all([BUYLIST.list(), ITEMS.list(), MONEY.list(), UNITS.list()]);
      setBuylist((Array.isArray(bl) ? bl : bl?.results ?? []).filter(b => String(b.depolar) === String(wh.id)));
      setItemler(Array.isArray(im) ? im : im?.results ?? []);
      setMoneytypes(Array.isArray(mm) ? mm : mm?.results ?? []);
      setUnitler(Array.isArray(um) ? um : um?.results ?? []);
    } catch (e) { Alert.alert('Xato', e.message); }
    finally { setLoading(false); }
  }, [wh.id]);

  // Para birimi ve birimler eklendiğinde taze veri çek
  const openAddModal = useCallback(async () => {
    try {
      const [im, mm, um] = await Promise.all([ITEMS.list(), MONEY.list(), UNITS.list()]);
      setItemler(Array.isArray(im) ? im : im?.results ?? []);
      setMoneytypes(Array.isArray(mm) ? mm : mm?.results ?? []);
      setUnitler(Array.isArray(um) ? um : um?.results ?? []);
    } catch { }
    setShowAdd(true);
  }, []);

  useEffect(() => { load(); }, []);

  async function createAndSelectItem(name) {
    try {
      const created = await ITEMS.create({ name });
      setItemler(prev => [...prev, created]);
      setForm(f => ({ ...f, item: String(created.id) }));
      Alert.alert('✅ Qo\'shildi', `"${name}" mahsulotlar ro'yxatiga qo'shildi`);
    } catch (e) { Alert.alert('Xato', e.message); }
  }

  async function addItem() {
    if (!form.item || !form.qty) { Alert.alert('Xato', 'Mahsulot va miqdor kerak'); return; }
    setSaving(true);
    try {
      await BUYLIST.create({
        item: Number(form.item), moneytype: Number(form.moneytype) || undefined,
        unit: Number(form.unit) || undefined, depolar: wh.id, qty: Number(form.qty), narx: form.narx || '0'
      });
      setShowAdd(false); setForm(EF); load();
    } catch (e) { Alert.alert('Xato', e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <View style={[s.center, { backgroundColor: T.bg }]}><ActivityIndicator size="large" color={T.blue} /></View>;
  const low = buylist.filter(b => Number(b.qty) < 20).length;
  const filteredBl = buylist.filter(b =>
    gn(itemler, b.item).toLowerCase().includes(searchBl.toLowerCase())
  );

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <View style={[s.header, { backgroundColor: T.blue }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: '#fff' }]}>{wh.name}</Text>
          {wh.address && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{wh.address}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Stat Cards */}
        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          <StatCard label={t.totalProduct} value={buylist.length} color={T.blue} iconName="inventory-2" iconLib="MaterialIcons" iconColor={C.blue} />
          <StatCard label={t.lowStock} value={low} color={low > 0 ? T.red : T.green} iconName={low > 0 ? "warning" : "check-circle"} iconLib="MaterialIcons" iconColor={low > 0 ? T.red : T.green} />
        </View>

        {/* Currency Analysis Section */}
        {buylist.length > 0 && (() => {
          // Group by currency
          const currMap = {};
          buylist.forEach(item => {
            const moneyId = String(item.moneytype);
            const moneyName = gn(moneytypes, item.moneytype);
            if (!currMap[moneyId]) currMap[moneyId] = { name: moneyName, total: 0, count: 0, items: [] };
            const price = parseFloat(item.narx) || 0;
            const qty = parseFloat(item.qty) || 0;
            currMap[moneyId].total += price * qty;
            currMap[moneyId].count += 1;
            currMap[moneyId].items.push(gn(itemler, item.item));
          });
          const currencies = Object.values(currMap);
          if (!currencies.length) return null;
          return (
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MaterialIcons name="analytics" size={18} color={T.purple} />
                <Text style={[s.sectionTitle, { marginBottom: 0, color: T.purple }]}>{t.currencyAnalysis}</Text>
              </View>
              {currencies.map((cur, i) => (
                <Card key={i} style={{ marginBottom: 8, borderLeftWidth: 3, borderLeftColor: T.purple }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: T.purpleL, alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesome5 name="money-bill-wave" size={16} color={T.purple} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: T.purple }}>{cur.name}</Text>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: T.text }}>{cur.total.toLocaleString('uz-UZ')}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <MaterialIcons name="inventory-2" size={12} color={T.text3} />
                        <Text style={{ fontSize: 12, color: T.text3 }}>{t.productTypes(cur.count)}</Text>
                      </View>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          );
        })()}

        {/* Buylist Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12, borderWidth: 1, borderColor: T.border }}>
          <MaterialIcons name="search" size={20} color={T.text3} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: T.text }}
            value={searchBl} onChangeText={setSearchBl}
            placeholder="Mahsulot nomi bo'yicha qidirish..." placeholderTextColor={T.text4}
            autoCapitalize="none"
          />
          {searchBl.length > 0 && (
            <TouchableOpacity onPress={() => setSearchBl('')}>
              <MaterialIcons name="close" size={18} color={T.text3} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={[s.sectionTitle, { color: T.text, marginBottom: 0 }]}>{t.buylist}</Text>
          {searchBl.length > 0 && (
            <Text style={{ fontSize: 12, color: T.text3 }}>{filteredBl.length} ta natija</Text>
          )}
        </View>
        {filteredBl.length === 0
          ? <Empty iconName="inventory-2" iconLib="MaterialIcons" title={searchBl ? 'Topilmadi' : t.noProduct} sub={searchBl ? `"${searchBl}" bo'yicha hech narsa topilmadi` : t.noProductSub} />
          : filteredBl.map(item => (
            <Card key={item.id} style={[s.blCard, Number(item.qty) < 20 && { borderLeftWidth: 3, borderLeftColor: T.orange }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: T.text }}>{gn(itemler, item.item)}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    <Badge text={`${item.qty} ${gn(unitler, item.unit)}`} color={T.blue} />
                    <Badge text={`${item.narx} ${gn(moneytypes, item.moneytype)}`} color={T.green} />
                  </View>
                  {Number(item.qty) < 20 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <MaterialIcons name="warning" size={12} color={T.orange} />
                      <Text style={{ fontSize: 11, color: T.orange, fontWeight: '700' }}>{t.lowStockWarn}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => cfm(t.delete, t.confirmDelete, async () => {
                  try { await BUYLIST.delete(item.id); load(); } catch (e) { Alert.alert('Xato', e.message); }
                })} style={[s.delBtn, { backgroundColor: T.redL }]}><MaterialIcons name="delete-outline" size={18} color={T.red} /></TouchableOpacity>
              </View>
            </Card>
          ))
        }
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={[s.modalBox, { backgroundColor: T.surface }]}>
                <Text style={[s.modalTitle, { color: T.text }]}>{t.addProduct}</Text>

                {/* SMART DROPDOWN */}
                <ItemPicker items={itemler} selected={form.item}
                  onSelect={v => setForm(f => ({ ...f, item: v }))}
                  onCreateNew={createAndSelectItem} />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input label={t.qty} value={form.qty} onChangeText={v => setForm(f => ({ ...f, qty: v }))} numeric placeholder="0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label={t.price} value={form.narx} onChangeText={v => setForm(f => ({ ...f, narx: v }))} numeric placeholder="0" />
                  </View>
                </View>

                <ChipPicker label={t.unit} items={unitler} selected={form.unit} onSelect={v => setForm(f => ({ ...f, unit: v }))} nameKey="unit" />
                <ChipPicker label={t.currency} items={moneytypes} selected={form.moneytype} onSelect={v => setForm(f => ({ ...f, moneytype: v }))} nameKey="name" />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <Btn title={t.cancel} onPress={() => { setShowAdd(false); setForm(EF); }} outline color={T.text3} style={{ flex: 1 }} />
                  <Btn title={t.save} onPress={addItem} loading={saving} style={{ flex: 1 }} />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── SCAN SCREEN ──────────────────────────────────────────────────────────────
function ScanScreen() {
  const T = useTheme();
  const t = useLang();
  const [image, setImage] = useState(null);
  const [lines, setLines] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selWh, setSelWh] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    DEPOLAR.list().then(d => { const a = Array.isArray(d) ? d : d?.results ?? []; setWarehouses(a); if (a.length) setSelWh(String(a[0].id)); }).catch(() => { });
  }, []);

  async function pickImage(cam = false) {
    const p = cam ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) { Alert.alert('Ruxsat kerak', 'Kamera/galereya ruxsati bering'); return; }
    const r = cam ? await ImagePicker.launchCameraAsync({ quality: 0.85 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!r.canceled) { setImage(r.assets[0]); setLines([]); setEditId(null); }
  }

  async function scan() {
    if (!image) return;
    setScanning(true);
    try {
      const data = await apiUpload('/scan/', image.uri, image.mimeType || 'image/jpeg');
      const sc = (data.lines || []).map((l, i) => ({ ...l, id: i + 1 }));
      setLines(sc);
      if (!sc.length) Alert.alert('Topilmadi', 'Rasmdan mahsulot chiqarib bo\'lmadi. Aniqroq rasm yuklang.');
    } catch (e) { Alert.alert('Xato', e.message); }
    finally { setScanning(false); }
  }

  function updateLine(id, field, val) { setLines(p => p.map(l => l.id === id ? { ...l, [field]: val } : l)); }
  function deleteLine(id) { setLines(p => p.filter(l => l.id !== id)); }

  async function approve() {
    if (!lines.length) return;
    setSaving(true);
    let ok = 0;
    const [im, mm, um] = await Promise.all([ITEMS.list(), MONEY.list(), UNITS.list()]).catch(() => [[], [], []]);
    let iA = Array.isArray(im) ? im : [];
    const mA = Array.isArray(mm) ? mm : [], uA = Array.isArray(um) ? um : [];

    for (const l of lines) {
      try {
        // 1) Scan'daki ürün adına göre mevcut item'ı bul
        const descClean = (l.desc || '').trim().toLowerCase();
        let matchedItem = iA.find(it => (it.name || '').toLowerCase() === descClean);

        // 2) Bulunamadıysa yeni item oluştur
        if (!matchedItem && descClean) {
          try {
            matchedItem = await ITEMS.create({ name: l.desc.trim() });
            iA = [...iA, matchedItem]; // sonraki satırlar için listeye ekle
          } catch { matchedItem = iA[0]; } // fallback
        }

        await BUYLIST.create({
          item: matchedItem?.id || iA[0]?.id || null,
          moneytype: mA.find(m => m.name === l.cur || m.type === l.cur)?.id || mA[0]?.id || null,
          unit: uA.find(u => u.name === l.birlik || u.unit === l.birlik)?.id || uA[0]?.id || null,
          depolar: selWh || null, qty: Number(l.qty) || 0, narx: l.price || '0',
        });
        ok++;
      } catch { }
    }
    setSaving(false);
    setDone(true);
  }

  if (done) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
      <View style={{ marginBottom: 16 }}><Ionicons name="checkmark-circle" size={72} color={T.green} /></View>
      <Text style={{ fontSize: 24, fontWeight: '900', color: T.text, marginBottom: 6 }}>{t.successTitle}</Text>
      <Text style={{ color: T.text3, marginBottom: 28, fontSize: 14 }}>{t.successSub(lines.length)}</Text>
      <Btn title={t.newScan} iconName="scan" onPress={() => { setDone(false); setImage(null); setLines([]); setEditId(null); }} />
    </View>
  );

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <View style={[s.header, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="scan" size={20} color={T.blue} />
            <Text style={[s.headerTitle, { color: T.text }]}>{t.scanTitle}</Text>
          </View>
          <Text style={{ fontSize: 12, color: T.text3 }}>{t.scanSub}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">

        {/* Upload area */}
        {!image ? (
          <Card style={{ alignItems: 'center', paddingVertical: 36, marginBottom: 14 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: T.blueL, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Ionicons name="document-text-outline" size={36} color={T.blue} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: T.text2, marginBottom: 4 }}>{t.uploadInvoice}</Text>
            <Text style={{ fontSize: 12, color: T.text3, marginBottom: 22 }}>JPG, PNG, WEBP</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Btn title={t.camera} iconName="camera" onPress={() => pickImage(true)} small />
              <Btn title={t.gallery} iconName="images" onPress={() => pickImage(false)} small outline />
            </View>
          </Card>
        ) : (
          <Card style={{ marginBottom: 14, overflow: 'hidden', padding: 0 }}>
            <Image source={{ uri: image.uri }} style={{ width: '100%', height: 200, resizeMode: 'contain', backgroundColor: '#f8fafc' }} />
            <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
              <Btn title={t.replace} iconName="refresh" onPress={() => pickImage(false)} small outline style={{ flex: 1 }} />
              <Btn title={t.clear} iconName="close" onPress={() => { setImage(null); setLines([]); }} small outline color={T.red} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {/* Scan button */}
        {image && lines.length === 0 && (
          <Btn title={scanning ? t.scanning : t.scanBtn} iconName="scan" onPress={scan} loading={scanning} style={{ marginBottom: 14 }} />
        )}

        {/* Loading */}
        {scanning && (
          <Card style={{ alignItems: 'center', paddingVertical: 28, marginBottom: 14 }}>
            <ActivityIndicator size="large" color={T.blue} style={{ marginBottom: 12 }} />
            <Text style={{ fontWeight: '800', color: T.text2, fontSize: 15 }}>{t.scanning}</Text>

          </Card>
        )}

        {/* EDITABLE RESULTS */}
        {lines.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={[s.sectionTitle, { color: T.text }]}>{t.detectedProducts(lines.length)}</Text>
              <Badge text={t.editHint} color={T.blue} />
            </View>
            <Text style={{ fontSize: 12, color: T.text3, marginBottom: 12 }}>{t.editHint}</Text>

            {lines.map(line => (
              <Card key={line.id} style={[s.blCard, line.warn && { borderLeftWidth: 3, borderLeftColor: T.orange }]}>
                {editId === line.id ? (
                  /* ── EDIT MODE ── */
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={{ fontWeight: '800', color: T.blue, fontSize: 13 }}>{t.editing}</Text>
                      <TouchableOpacity onPress={() => setEditId(null)}
                        style={{ backgroundColor: T.greenL, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                        <Text style={{ color: T.green, fontWeight: '800', fontSize: 13 }}>{t.done}</Text>
                      </TouchableOpacity>
                    </View>

                    <Input label={t.productName} value={line.desc}
                      onChangeText={v => updateLine(line.id, 'desc', v)} placeholder="Mahsulot nomi" />

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Input label={t.qty} value={String(line.qty)}
                          onChangeText={v => updateLine(line.id, 'qty', v)} numeric placeholder="0" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input label={t.price} value={String(line.price)}
                          onChangeText={v => updateLine(line.id, 'price', v)} numeric placeholder="0" />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Input label={t.unit} value={line.birlik || ''}
                          onChangeText={v => updateLine(line.id, 'birlik', v)} placeholder="dona" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input label={t.currency} value={line.cur || ''}
                          onChangeText={v => updateLine(line.id, 'cur', v)} placeholder="UZS" />
                      </View>
                    </View>

                    <TouchableOpacity onPress={() => deleteLine(line.id)}
                      style={{ alignItems: 'center', paddingVertical: 8, marginTop: 4 }}>
                      <Text style={{ color: T.red, fontWeight: '700', fontSize: 13 }}>{t.deleteRow}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* ── VIEW MODE — bosib tahrirlash ── */
                  <TouchableOpacity onPress={() => setEditId(line.id)} activeOpacity={0.75}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: T.text, flex: 1 }}>{line.desc}</Text>
                          <View style={{ backgroundColor: T.blueL, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="pencil" size={11} color={T.blue} />
                            <Text style={{ fontSize: 11, color: T.blue, fontWeight: '700' }}>tahrirlash</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          <Badge text={`${line.qty} ${line.birlik || 'dona'}`} color={T.blue} />
                          <Badge text={`${line.price} ${line.cur || 'UZS'}`} color={line.warn ? T.orange : T.green} />
                        </View>
                        {line.warn && <Text style={{ fontSize: 11, color: T.orange, marginTop: 4, fontWeight: '700' }}>Narx topilmadi — qo'lda kiriting</Text>}
                      </View>
                      <Text style={{ color: T.text4, fontSize: 20 }}>›</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </Card>
            ))}

            {/* Ombor tanlash */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 }}>
              <MaterialIcons name="warehouse" size={16} color={T.text} />
              <Text style={[s.sectionTitle, { color: T.text }]}>{t.placeToWarehouse}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {warehouses.map(w => (
                <TouchableOpacity key={w.id} onPress={() => setSelWh(String(w.id))}
                  style={[s.chip, { backgroundColor: selWh === String(w.id) ? T.blue : T.surface, borderColor: selWh === String(w.id) ? T.blue : T.border }]}>
                  <Text style={{ color: selWh === String(w.id) ? '#fff' : C.text2, fontSize: 13, fontWeight: '600' }}>{w.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Btn title={saving ? t.scanning : t.approve(lines.length)} iconName="checkmark-circle"
              onPress={approve} loading={saving} color={T.green} style={{ marginBottom: 24 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── REFERENCES ───────────────────────────────────────────────────────────────
function ReferencesScreen() {
  const T = useTheme();
  const t = useLang();
  const [tab, setTab] = useState('items');
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [money, setMoney] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);

  const TABS = [
    { key: 'items', label: t.items, iconName: 'inventory-2', iconLib: 'MaterialIcons' },
    { key: 'units', label: t.units, iconName: 'straighten', iconLib: 'MaterialIcons' },
    { key: 'money', label: t.moneys, iconName: 'attach-money', iconLib: 'MaterialIcons' },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [im, um, mm] = await Promise.all([ITEMS.list(), UNITS.list(), MONEY.list()]);
      setItems(Array.isArray(im) ? im : im?.results ?? []); setUnits(Array.isArray(um) ? um : um?.results ?? []); setMoney(Array.isArray(mm) ? mm : mm?.results ?? []);
    } catch (e) { Alert.alert('Xato', e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, []);

  const current = tab === 'items' ? items : tab === 'units' ? units : money;
  const apiCur = tab === 'items' ? ITEMS : tab === 'units' ? UNITS : MONEY;
  const gn2 = (it) => it.name || it.unit || it.type || `#${it.id}`;

  async function addItem() {
    if (!form.name.trim()) return; setSaving(true);
    try { await apiCur.create({ name: form.name }); setShowAdd(false); setForm({ name: '' }); load(); }
    catch (e) { Alert.alert('Xato', e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <View style={[s.center, { backgroundColor: T.bg }]}><ActivityIndicator size="large" color={T.blue} /></View>;

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <View style={[s.header, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="list" size={20} color={T.blue} />
            <Text style={[s.headerTitle, { color: T.text }]}>{t.references}</Text>
          </View>
          <Text style={{ fontSize: 12, color: T.text3 }}>{t.warehouseCount(current.length)}</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: T.blue }]} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[s.tabRow, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        {TABS.map(tb => (
          <TouchableOpacity key={tb.key} onPress={() => setTab(tb.key)} style={[s.tabBtn, tab === tb.key && s.tabBtnActive, tab === tb.key && { borderBottomColor: T.blue }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <VIcon name={tb.iconName} lib={tb.iconLib} size={14} color={tab === tb.key ? T.blue : T.text3} />
              <Text style={[s.tabTxt, { color: T.text3 }, tab === tb.key && s.tabTxtActive, tab === t.key && { color: T.blue }]}>{t.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList data={current} keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={<Empty iconName="list" iconLib="Ionicons" title={t.noRecord} sub={t.noRecordSub} />}
        renderItem={({ item }) => (
          <Card style={s.refCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: T.blueL, alignItems: 'center', justifyContent: 'center' }}>
                <VIcon name={TABS.find(tb => tb.key === tab)?.iconName} lib={TABS.find(tb => tb.key === tab)?.iconLib} size={20} color={T.blue} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.text, flex: 1 }}>{gn2(item)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Badge text={`#${item.id}`} color={T.text4} bg={T.surface2} />
              <TouchableOpacity onPress={() => cfm(t.delete, `"${gn2(item)}" ${t.confirmDelete}`, async () => {
                try { await apiCur.delete(item.id); load(); } catch (e) { Alert.alert('Xato', e.message); }
              })} style={[s.delBtn, { backgroundColor: T.redL }]}><MaterialIcons name="delete-outline" size={18} color={T.red} /></TouchableOpacity>
            </View>
          </Card>
        )}
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[s.modalBox, { backgroundColor: T.surface }]}>
              <Text style={[s.modalTitle, { color: T.text }]}>{t.newRecord}: {TABS.find(tb => tb.key === tab)?.label}</Text>
              <Input label="Nomi *" value={form.name} onChangeText={v => setForm({ name: v })} placeholder={t.productName} autoFocus />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn title={t.cancel} onPress={() => setShowAdd(false)} outline color={T.text3} style={{ flex: 1 }} />
                <Btn title={t.save} onPress={addItem} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── USERS ────────────────────────────────────────────────────────────────────
function UsersScreen() {
  const T = useTheme();
  const t = useLang();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddCo, setShowAddCo] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'staff' });
  const [coForm, setCoForm] = useState({ name: '', address: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([AUTH.users(), AUTH.companies()]);
      setUsers(Array.isArray(u) ? u : u?.results ?? []); setCompanies(Array.isArray(c) ? c : c?.results ?? []);
    } catch { }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, []);

  async function addUser() {
    if (!form.username) return; setSaving(true);
    try {
      await AUTH.createUser({ username: form.username, email: form.email, password: form.password, role: form.role });
      setShowAddUser(false); setForm({ username: '', email: '', password: '', role: 'staff' }); load();
    }
    catch (e) { Alert.alert('Xato', e.message); }
    finally { setSaving(false); }
  }
  async function addCo() {
    if (!coForm.name) return; setSaving(true);
    try { await AUTH.createCompany(coForm); setShowAddCo(false); setCoForm({ name: '', address: '', phone: '' }); load(); }
    catch (e) { Alert.alert('Xato', e.message); }
    finally { setSaving(false); }
  }

  const RC = { admin: { c: '#92400e', bg: '#fef3c7' }, manager: { c: T.blue, bg: C.blueL }, staff: { c: T.green, bg: C.greenL } };
  if (loading) return <View style={[s.center, { backgroundColor: T.bg }]}><ActivityIndicator size="large" color={T.blue} /></View>;

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="people" size={20} color={T.blue} />
            <Text style={[s.headerTitle, { color: T.text }]}>{t.profile} / Admin</Text>
          </View>
          <Text style={{ fontSize: 12, color: T.text3 }}>{t.warehouseCount(tab === 'users' ? users.length : companies.length)}</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: T.blue }]} style={[s.addBtn, { backgroundColor: T.blue }]} onPress={() => tab === 'users' ? setShowAddUser(true) : setShowAddCo(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[s.tabRow, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={() => setTab('users')} style={[s.tabBtn, tab === 'users' && s.tabBtnActive, tab === 'users' && { borderBottomColor: T.blue }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="person" size={14} color={tab === 'users' ? T.blue : T.text3} />
            <Text style={[s.tabTxt, { color: T.text3 }, tab === 'users' && s.tabTxtActive, tab === 'users' && { color: T.blue }]}>Foydalanuvchilar ({users.length})</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('companies')} style={[s.tabBtn, tab === 'companies' && s.tabBtnActive, tab === 'companies' && { borderBottomColor: T.blue }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MaterialIcons name="business" size={14} color={tab === 'companies' ? T.blue : T.text3} />
            <Text style={[s.tabTxt, { color: T.text3 }, tab === 'companies' && s.tabTxtActive, tab === 'companies' && { color: T.blue }]}>Kompaniyalar ({companies.length})</Text>
          </View>
        </TouchableOpacity>
      </View>

      {tab === 'users' ? (
        <FlatList data={users} keyExtractor={i => String(i.id)} contentContainerStyle={{ padding: 16, gap: 8 }}
          ListEmptyComponent={<Empty iconName="person" iconLib="Ionicons" title="Foydalanuvchi yo'q" />}
          renderItem={({ item }) => {
            const rc = RC[item.role] || RC.staff; return (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: T.blueL, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontWeight: '900', color: T.blue, fontSize: 16 }}>{item.username?.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: T.text, fontSize: 14 }}>{item.username}</Text>
                  {item.email && <Text style={{ fontSize: 12, color: T.text3 }}>{item.email}</Text>}
                </View>
                <Badge text={item.role || 'staff'} color={rc.c} bg={rc.bg} />
              </Card>
            );
          }}
        />
      ) : (
        <FlatList data={companies} keyExtractor={i => String(i.id)} contentContainerStyle={{ padding: 16, gap: 8 }}
          ListEmptyComponent={<Empty iconName="business" iconLib="MaterialIcons" title="Kompaniya yo'q" />}
          renderItem={({ item }) => (
            <Card style={s.refCard}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: T.text, fontSize: 14 }}>{item.name}</Text>
                {item.address && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="location-outline" size={12} color={T.text3} />
                    <Text style={{ fontSize: 12, color: T.text3 }}>{item.address}</Text>
                  </View>
                )}
                {item.phone && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="call-outline" size={12} color={T.text3} />
                    <Text style={{ fontSize: 12, color: T.text3 }}>{item.phone}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => cfm("O'chirish", `"${item.name}" o'chirilsinmi?`, async () => {
                try { await AUTH.deleteCompany(item.id); load(); } catch (e) { Alert.alert('Xato', e.message); }
              })} style={[s.delBtn, { backgroundColor: T.redL }]}><MaterialIcons name="delete-outline" size={18} color={T.red} /></TouchableOpacity>
            </Card>
          )}
        />
      )}

      {/* Add User Modal */}
      <Modal visible={showAddUser} transparent animationType="slide">
        <View style={s.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView><View style={[s.modalBox, { backgroundColor: T.surface }]}>
              <Text style={s.modalTitle}>Yangi Foydalanuvchi</Text>
              <Input label="Username *" value={form.username} onChangeText={v => setForm(f => ({ ...f, username: v }))} placeholder="username" autoFocus />
              <Input label="Email" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} placeholder="email@mail.com" />
              <Input label="Parol" value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} placeholder="••••••••" secure />
              <Text style={s.label}>Role</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {['staff', 'manager', 'admin'].map(r => (
                  <TouchableOpacity key={r} onPress={() => setForm(f => ({ ...f, role: r }))} style={[s.chip, form.role === r && s.chipActive]}>
                    <Text style={{ color: form.role === r ? '#fff' : C.text2, fontSize: 13 }}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn title="Bekor" onPress={() => setShowAddUser(false)} outline color={T.text3} style={{ flex: 1 }} />
                <Btn title="✅ Saqlash" onPress={addUser} loading={saving} style={{ flex: 1 }} />
              </View>
            </View></ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Add Company Modal */}
      <Modal visible={showAddCo} transparent animationType="slide">
        <View style={s.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[s.modalBox, { backgroundColor: T.surface }]}>
              <Text style={s.modalTitle}>Yangi Kompaniya</Text>
              <Input label="Nomi *" value={coForm.name} onChangeText={v => setCoForm(f => ({ ...f, name: v }))} placeholder="Kompaniya nomi" autoFocus />
              <Input label="Manzil" value={coForm.address} onChangeText={v => setCoForm(f => ({ ...f, address: v }))} placeholder="Manzil" />
              <Input label="Telefon" value={coForm.phone} onChangeText={v => setCoForm(f => ({ ...f, phone: v }))} placeholder="+998..." numeric />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn title="Bekor" onPress={() => setShowAddCo(false)} outline color={T.text3} style={{ flex: 1 }} />
                <Btn title="✅ Saqlash" onPress={addCo} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { key: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { key: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'ru', label: 'Русский', flag: '🇷🇺' },
];

function SettingRow({ icon, iconLib, label, children, last }) {
  const T = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, paddingHorizontal: 16,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: T.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: T.blueL, alignItems: 'center', justifyContent: 'center' }}>
          <VIcon name={icon} lib={iconLib || 'Ionicons'} size={18} color={T.blue} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: T.text }}>{label}</Text>
      </View>
      <View>{children}</View>
    </View>
  );
}

function SectionHeader({ title }) {
  const T = useTheme();
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: T.text3, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 4, paddingBottom: 6, paddingTop: 20 }}>
      {title}
    </Text>
  );
}

function ProfileScreen() {
  const { user, signOut } = useAuth();
  const T = useTheme();
  const { lang, setLang, dark, setDark, accentKey, setAccentKey, t } = useSettings();

  const [emailModal, setEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [langModal, setLangModal] = useState(false);

  const currentLang = LANGUAGES.find(l => l.key === lang) || LANGUAGES[0];

  function saveEmail() {
    // In real app you'd call API here
    Alert.alert(t.emailUpdated, newEmail);
    setEmailModal(false);
  }

  return (
    <ScrollView style={[s.screen, { backgroundColor: T.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={T.surface} />
      <View style={[s.header, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="person-circle-outline" size={20} color={T.blue} />
          <Text style={[s.headerTitle, { color: T.text }]}>{t.profileTitle}</Text>
        </View>
      </View>

      {/* Avatar Card */}
      <View style={{ alignItems: 'center', paddingVertical: 28 }}>
        <View style={{
          width: 90, height: 90, borderRadius: 45, backgroundColor: T.blue,
          alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          shadowColor: T.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
        }}>
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff' }}>{user?.username?.slice(0, 2).toUpperCase() || '??'}</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '900', color: T.text, letterSpacing: -0.5 }}>{user?.username}</Text>
        <Text style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>{user?.email || '—'}</Text>
        <View style={{ marginTop: 8 }}>
          <Badge text={user?.role || 'staff'} color={T.blue} />
        </View>
      </View>

      {/* Account Info */}
      <View style={{ paddingHorizontal: 16 }}>
        <SectionHeader title={t.accountInfo} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {[
            { l: 'Username', v: user?.username, icon: 'person-outline' },
            { l: t.email, v: user?.email || '—', icon: 'mail-outline' },
            { l: t.role, v: user?.role || 'staff', icon: 'shield-outline' },
            { l: t.id, v: `#${user?.id || '—'}`, icon: 'key-outline' },
          ].map((row, i, arr) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 13, paddingHorizontal: 16,
              borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: T.border,
            }}>
              <Ionicons name={row.icon} size={16} color={T.text3} />
              <Text style={{ color: T.text3, fontSize: 13, width: 80 }}>{row.l}</Text>
              <Text style={{ color: T.text, fontSize: 14, fontWeight: '700', flex: 1 }}>{row.v}</Text>
            </View>
          ))}
        </Card>

        {/* Update Email */}
        <TouchableOpacity
          onPress={() => setEmailModal(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: T.blueL, borderRadius: 12, padding: 14, marginTop: 10,
            borderWidth: 1, borderColor: T.blueM,
          }}>
          <Ionicons name="mail" size={18} color={T.blue} />
          <Text style={{ color: T.blue, fontWeight: '700', fontSize: 14, flex: 1 }}>{t.editEmail}</Text>
          <Ionicons name="chevron-forward" size={16} color={T.blue} />
        </TouchableOpacity>

        {/* Appearance */}
        <SectionHeader title={t.appearance} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>

          {/* Language */}
          <SettingRow icon="language" iconLib="MaterialIcons" label={t.language}>
            <TouchableOpacity
              onPress={() => setLangModal(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: T.border }}>
              <Text style={{ fontSize: 16 }}>{currentLang.flag}</Text>
              <Text style={{ color: T.text, fontSize: 13, fontWeight: '700' }}>{currentLang.label}</Text>
              <Ionicons name="chevron-down" size={14} color={T.text3} />
            </TouchableOpacity>
          </SettingRow>

          {/* Dark Mode */}
          <SettingRow icon="moon-outline" label={t.darkMode}>
            <TouchableOpacity
              onPress={() => setDark(!dark)}
              style={{
                width: 52, height: 30, borderRadius: 15,
                backgroundColor: dark ? T.blue : T.border2,
                justifyContent: 'center', paddingHorizontal: 3,
              }}>
              <View style={{
                width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
                transform: [{ translateX: dark ? 22 : 0 }],
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
              }} />
            </TouchableOpacity>
          </SettingRow>

          {/* Accent Color */}
          <SettingRow icon="color-palette-outline" label={t.accentColor} last>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ACCENT_COLORS.map(ac => (
                <TouchableOpacity key={ac.key} onPress={() => setAccentKey(ac.key)}
                  style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: ac.main,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: accentKey === ac.key ? 3 : 0,
                    borderColor: '#fff',
                    shadowColor: ac.main, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4,
                  }}>
                  {accentKey === ac.key && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>
        </Card>

        {/* Logout */}
        <View style={{ marginTop: 24 }}>
          <Btn title={t.logout} iconName="log-out-outline" color={T.red}
            onPress={() => Alert.alert(t.logout, t.logoutConfirm, [
              { text: t.cancel, style: 'cancel' },
              { text: t.yes, style: 'destructive', onPress: signOut }
            ])}
          />
        </View>
      </View>

      {/* Email Modal */}
      <Modal visible={emailModal} transparent animationType="slide">
        <View style={[s.modalBg]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[s.modalBox, { backgroundColor: T.surface }]}>
              <Text style={[s.modalTitle, { color: T.text }]}>{t.editEmail}</Text>
              <Input label={t.emailLabel} value={newEmail} onChangeText={setNewEmail} placeholder="email@example.com" autoFocus />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn title={t.cancel} onPress={() => setEmailModal(false)} outline color={T.text3} style={{ flex: 1 }} />
                <Btn title={t.save} onPress={saveEmail} style={{ flex: 1 }} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={langModal} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={[s.modalBox, { backgroundColor: T.surface }]}>
            <Text style={[s.modalTitle, { color: T.text }]}>{t.language}</Text>
            {LANGUAGES.map(l => (
              <TouchableOpacity key={l.key} onPress={() => { setLang(l.key); setLangModal(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: T.border,
                  backgroundColor: l.key === lang ? T.blueL : 'transparent',
                  borderRadius: 10, paddingHorizontal: 10, marginBottom: 4,
                }}>
                <Text style={{ fontSize: 28 }}>{l.flag}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, flex: 1 }}>{l.label}</Text>
                {l.key === lang && <Ionicons name="checkmark-circle" size={22} color={T.blue} />}
              </TouchableOpacity>
            ))}
            <Btn title={t.cancel} onPress={() => setLangModal(false)} outline color={T.text3} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();
const TAB_ICONS = {
  Warehouses: { icon: 'warehouse', lib: 'MaterialIcons' },
  Scan: { icon: 'scan', lib: 'Ionicons' },
  References: { icon: 'list', lib: 'Ionicons' },
  Profile: { icon: 'person-circle', lib: 'Ionicons' },
};
function MainApp() {
  const T = useTheme();
  const t = useLang();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: T.blue, tabBarInactiveTintColor: T.text4,
      tabBarStyle: {
        backgroundColor: T.surface, borderTopColor: T.border, borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 20 : 6, paddingTop: 6, height: Platform.OS === 'ios' ? 84 : 62
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      tabBarIcon: ({ color }) => {
        const cfg = TAB_ICONS[route.name];
        return <VIcon name={cfg.icon} lib={cfg.lib} size={24} color={color} />;
      },
    })}>
      <Tab.Screen name="Warehouses" component={WarehousesTab} options={{ tabBarLabel: t.warehouses }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ tabBarLabel: t.scan }} />
      <Tab.Screen name="References" component={ReferencesScreen} options={{ tabBarLabel: t.references }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t.profile }} />
    </Tab.Navigator>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    getToken().then(tk => { if (tk) setUser({ token: tk, username: 'user' }); setLoading(false); });
  }, []);

  const auth = { user, signIn: (u) => setUser(u), signOut: async () => { await saveToken(null); setUser(null); } };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e40af' }}>
      <MaterialIcons name="warehouse" size={64} color="#fff" style={{ marginBottom: 16, opacity: 0.9 }} />
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );

  return (
    <AuthContext.Provider value={auth}>
      <SettingsProvider userId={user?.id || user?.username || 'guest'}>
        <NavigationContainer>
          {user ? <MainApp /> : <LoginScreen />}
        </NavigationContainer>
      </SettingsProvider>
    </AuthContext.Provider>
  );
}

// ─── STYLES (static fallbacks — components override with dynamic theme) ────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border
  },
  headerTitle: { fontSize: 19, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 10 },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  delBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.redL, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  blCard: { marginBottom: 8 },
  refCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  whIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.blueL, alignItems: 'center', justifyContent: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, gap: 6 },
  btnSm: { paddingVertical: 9, paddingHorizontal: 14 },
  btnTxt: { fontSize: 14, fontWeight: '800' },
  input: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, color: C.text
  },
  label: { fontSize: 13, fontWeight: '700', color: C.text2, marginBottom: 6 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 18 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, marginRight: 8, backgroundColor: C.surface },
  chipActive: { backgroundColor: C.blue, borderColor: C.blue },
  tabRow: { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: C.blue },
  tabTxt: { fontSize: 12, fontWeight: '600', color: C.text3 },
  tabTxtActive: { color: C.blue, fontWeight: '800' },
  errBox: { backgroundColor: C.redL, padding: 12, borderRadius: 10, marginBottom: 14 },
  loginWrap: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },
  loginCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 10
  },
  loginLogo: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)'
  },
});