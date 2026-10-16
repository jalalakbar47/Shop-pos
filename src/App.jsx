import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  Truck,
  FileBarChart,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  CheckCircle2,
  XCircle,
  Edit3,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Banknote,
  Scale,
  Filter,
  Sparkles,
  Store,
  Phone,
  MapPin,
  Calendar,
  ChevronRight,
  RotateCcw,
  Calculator,
  Barcode,
  ShieldCheck,
  X,
  FileSpreadsheet,
  LogOut,
  Database,
  Sliders,
  Settings,
  Menu
} from 'lucide-react';

import AuthScreen from './components/AuthScreen';
import StoreSettingsTab from './components/StoreSettingsTab';
import {
  getStoredSheetsUrl,
  callGoogleSheets,
  getStoredUser,
  setStoredUser
} from './services/googleSheetsService';
import {
  getStoreInfo,
  saveStoreInfo,
  formatCurrency
} from './config/storeConfig';

// ==========================================
// FIREBASE INITIALIZATION & CONFIGURATION
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : { apiKey: 'demo-key', projectId: 'demo-project' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'atta-tuck-shop-pos';


// ==========================================
// CONSTANTS & CATEGORIES
// ==========================================
const CATEGORIES = [
  'All',
  'Grains & Flour',
  'Pulses & Spices',
  'Cooking Oil & Ghee',
  'Dairy & Bakery',
  'Beverages',
  'Snacks',
  'Household & Personal Care'
];

const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity & Utilities',
  'Staff Wages',
  'Transport & Freight',
  'Packaging & Bags',
  'Maintenance & Misc'
];

const LOOSE_UNITS = ['kg', 'liter', 'g'];

// Helper for currency formatting in Rs.
const formatRs = (amount) => {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// Helper to get relative date string (YYYY-MM-DD) offset by days
const getDateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// ==========================================
// CLEAN INITIAL STATE (NO DUMMY DATA)
// ==========================================
const getInitialSeedData = () => ({
  products: [],
  customers: [],
  suppliers: [],
  sales: [],
  expenses: []
});

// Optional starter pack for Atta Tuck Shop Pos (1-click convenience)
const getAttaStarterPack = () => [
  {
    id: `prod_${Date.now()}_1`,
    name: 'Chakki Atta Special 10kg Bag',
    sku: 'AT-1001',
    category: 'Grains & Flour',
    unit: 'pack',
    costPrice: 1250,
    sellingPrice: 1390,
    stock: 25,
    minStock: 5,
    supplier: 'Direct Mill Supply',
    expiryDate: getDateOffset(90)
  },
  {
    id: `prod_${Date.now()}_2`,
    name: 'Super Basmati Rice (Karnal)',
    sku: 'AT-1002',
    category: 'Grains & Flour',
    unit: 'kg',
    costPrice: 270,
    sellingPrice: 320,
    stock: 50,
    minStock: 10,
    supplier: 'Grain Market',
    expiryDate: getDateOffset(180)
  },
  {
    id: `prod_${Date.now()}_3`,
    name: 'Cold Drink 500ml Pet Bottle',
    sku: 'TCK-2001',
    category: 'Beverages',
    unit: 'pc',
    costPrice: 85,
    sellingPrice: 100,
    stock: 40,
    minStock: 12,
    supplier: 'Beverage Distributor',
    expiryDate: getDateOffset(120)
  },
  {
    id: `prod_${Date.now()}_4`,
    name: 'Crispy Salted Potato Chips Family Pack',
    sku: 'TCK-2002',
    category: 'Snacks',
    unit: 'pack',
    costPrice: 40,
    sellingPrice: 50,
    stock: 60,
    minStock: 15,
    supplier: 'Snack Agency',
    expiryDate: getDateOffset(90)
  },
  {
    id: `prod_${Date.now()}_5`,
    name: 'Tapal Danedar Tea 400g Pack',
    sku: 'TCK-2003',
    category: 'Beverages',
    unit: 'pack',
    costPrice: 700,
    sellingPrice: 770,
    stock: 20,
    minStock: 5,
    supplier: 'FMCG Agency',
    expiryDate: getDateOffset(240)
  }
];

// ==========================================
// MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  // Authentication & Firestore Sync States
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // User Authentication & Google Sheets State
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [sheetsSyncing, setSheetsSyncing] = useState(false);
  const [hasGoogleSheetsUrl, setHasGoogleSheetsUrl] = useState(() => !!getStoredSheetsUrl());

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [posMobileTab, setPosMobileTab] = useState('catalog'); // 'catalog' | 'cart'

  // Core ERP Data Collections
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Dynamic Store Profile Settings (from ENV or LocalStorage)
  const [storeInfo, setStoreInfo] = useState(() => getStoreInfo());

  // Dynamic Currency Formatter for active store
  const formatRs = (amount) => {
    return formatCurrency(amount, storeInfo?.currency || 'Rs.');
  };

  // Sync document title with active store name
  useEffect(() => {
    if (storeInfo?.name) {
      document.title = `${storeInfo.name} - Smart POS`;
    }
  }, [storeInfo?.name]);

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ==========================================
  // POS TERMINAL STATE
  // ==========================================
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash' | 'Khata' | 'Digital Wallet'
  const [walletProvider, setWalletProvider] = useState('EasyPaisa');
  const [cashReceived, setCashReceived] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [quickAddCustomerMode, setQuickAddCustomerMode] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  // Price-to-weight calculator helper inside POS cart
  const [rupeeCalcItem, setRupeeCalcItem] = useState(null); // productId
  const [rupeeCalcAmount, setRupeeCalcAmount] = useState('');

  // Thermal Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState(null);

  // ==========================================
  // INVENTORY MODULE STATE & MODALS
  // ==========================================
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState('All');
  const [invStatusFilter, setInvStatusFilter] = useState('ALL'); // 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING_SOON'
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'Grains & Flour',
    unit: 'kg',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    minStock: 10,
    supplier: '',
    expiryDate: getDateOffset(180)
  });

  // Restock / Adjust Stock Modal
  const [restockModalProduct, setRestockModalProduct] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockNewCost, setRestockNewCost] = useState('');
  const [restockNewSelling, setRestockNewSelling] = useState('');

  // ==========================================
  // CUSTOMER KHATA (CREDIT LEDGER) STATE
  // ==========================================
  const [khataSearch, setKhataSearch] = useState('');
  const [selectedKhataCustomer, setSelectedKhataCustomer] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    openingBalance: 0
  });
  const [receivePaymentCustomer, setReceivePaymentCustomer] = useState(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentNotesInput, setPaymentNotesInput] = useState('');

  // ==========================================
  // SUPPLIERS & EXPENSES STATE
  // ==========================================
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    category: 'Grains & Flour',
    payableBalance: '',
    notes: ''
  });
  const [paySupplierModal, setPaySupplierModal] = useState(null);
  const [supplierPayAmount, setSupplierPayAmount] = useState('');

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'Electricity & Utilities',
    amount: '',
    date: getDateOffset(0),
    paymentMethod: 'Cash',
    notes: ''
  });

  // ==========================================
  // REPORTS MODULE STATE
  // ==========================================
  const [reportFilterDate, setReportFilterDate] = useState('ALL'); // 'TODAY' | 'ALL'
  const [reportPaymentFilter, setReportPaymentFilter] = useState('ALL');

  // Helper to persist local state to localStorage
  const updateLocal = (key, data) => {
    try {
      localStorage.setItem(`erp_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  };

  // Cleanup old dummy data if previously stored in localStorage
  useEffect(() => {
    try {
      const rawProd = localStorage.getItem('erp_products');
      if (
        rawProd &&
        (rawProd.includes('prod_1') ||
          rawProd.includes('Al-Barakah') ||
          rawProd.includes('Super Kernel Basmati Rice'))
      ) {
        localStorage.removeItem('erp_products');
        localStorage.removeItem('erp_customers');
        localStorage.removeItem('erp_suppliers');
        localStorage.removeItem('erp_sales');
        localStorage.removeItem('erp_expenses');
        setProducts([]);
        setCustomers([]);
        setSuppliers([]);
        setSales([]);
        setExpenses([]);
      }
    } catch (e) {
      console.warn('Storage cleanup:', e);
    }
  }, []);

  // Google Sheets Full Sync Handler
  const handleSyncAllFromSheets = async (customUrl) => {
    const url = customUrl || getStoredSheetsUrl();
    if (!url) return;
    setSheetsSyncing(true);
    try {
      const res = await callGoogleSheets({ action: 'getAllData' }, url);
      if (res.success) {
        if (Array.isArray(res.products)) {
          setProducts(res.products);
          updateLocal('products', res.products);
        }
        if (Array.isArray(res.customers)) {
          setCustomers(res.customers);
          updateLocal('customers', res.customers);
        }
        if (Array.isArray(res.suppliers)) {
          setSuppliers(res.suppliers);
          updateLocal('suppliers', res.suppliers);
        }
        if (Array.isArray(res.sales)) {
          setSales(res.sales);
          updateLocal('sales', res.sales);
        }
        if (Array.isArray(res.expenses)) {
          setExpenses(res.expenses);
          updateLocal('expenses', res.expenses);
        }
        setHasGoogleSheetsUrl(true);
        showToast('All records synced from Google Sheet database!', 'success');
      }
    } catch (err) {
      console.error('Google Sheet sync error:', err);
      throw err;
    } finally {
      setSheetsSyncing(false);
    }
  };

  // Google Sheets Bulk Upload Local Data
  const handleBulkUploadToSheets = async (customUrl) => {
    const url = customUrl || getStoredSheetsUrl();
    if (!url) return;
    setSheetsSyncing(true);
    try {
      await callGoogleSheets(
        {
          action: 'bulkUpload',
          products,
          customers
        },
        url
      );
      setHasGoogleSheetsUrl(true);
      showToast('Uploaded local database to Google Sheet!', 'success');
    } catch (err) {
      console.error('Bulk upload error:', err);
      throw err;
    } finally {
      setSheetsSyncing(false);
    }
  };

  // Auto-sync from Google Sheet when user logs in if URL is configured
  useEffect(() => {
    const url = getStoredSheetsUrl();
    if (url && currentUser) {
      handleSyncAllFromSheets(url).catch((err) => {
        console.warn('Auto sync from Google Sheet failed:', err);
      });
    }
  }, [currentUser]);

  // Optional 1-click starter pack for Atta Tuck Shop Pos
  const loadStarterPack = () => {
    const starter = getAttaStarterPack();
    setProducts(starter);
    updateLocal('products', starter);
    const url = getStoredSheetsUrl();
    if (url) {
      callGoogleSheets({ action: 'bulkUpload', products: starter }, url).catch((e) =>
        console.warn('Google Sheet bulk upload error:', e)
      );
    }
    showToast('Loaded 5 essential tuck shop products!', 'success');
  };

  // ==========================================
  // 1. FIREBASE / OFFLINE INITIALIZATION
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else if (firebaseConfig?.apiKey && firebaseConfig.apiKey !== 'demo-key') {
          await signInAnonymously(auth);
        } else {
          throw new Error('Local offline mode');
        }
      } catch (err) {
        console.info('Atta Tuck Shop Pos initialized.');
        let seed = getInitialSeedData();
        try {
          const lp = localStorage.getItem('erp_products');
          const lc = localStorage.getItem('erp_customers');
          const ls = localStorage.getItem('erp_suppliers');
          const lsl = localStorage.getItem('erp_sales');
          const le = localStorage.getItem('erp_expenses');
          if (lp && !lp.includes('prod_1')) seed.products = JSON.parse(lp);
          if (lc && !lc.includes('cust_1')) seed.customers = JSON.parse(lc);
          if (ls && !ls.includes('sup_1')) seed.suppliers = JSON.parse(ls);
          if (lsl && !lsl.includes('sale_1')) seed.sales = JSON.parse(lsl);
          if (le && !le.includes('exp_1')) seed.expenses = JSON.parse(le);
        } catch (e) {
          console.warn('Error reading localStorage:', e);
        }
        if (isMounted) {
          setProducts(seed.products);
          setCustomers(seed.customers);
          setSuppliers(seed.suppliers);
          setSales(seed.sales);
          setExpenses(seed.expenses);
          setUser({ uid: 'offline_local_user', displayName: 'Store Manager' });
          setLoadingData(false);
          setAuthReady(true);
        }
      } finally {
        if (isMounted) setAuthReady(true);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted && currentUser) {
        setUser(currentUser);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);


  // ==========================================
  // 2. SEED INITIAL DATA FUNCTION
  // ==========================================
  const seedDatabase = async (forceReset = false) => {
    setSeeding(true);
    try {
      const seed = getInitialSeedData();
      if (!user || user.uid === 'offline_local_user' || user.uid === 'atta_pos_user') {
        setProducts(seed.products);
        setCustomers(seed.customers);
        setSuppliers(seed.suppliers);
        setSales(seed.sales);
        setExpenses(seed.expenses);
        updateLocal('products', seed.products);
        updateLocal('customers', seed.customers);
        updateLocal('suppliers', seed.suppliers);
        updateLocal('sales', seed.sales);
        updateLocal('expenses', seed.expenses);
        if (forceReset) {
          showToast('Atta Tuck Shop Pos database cleared!', 'success');
        }
      } else {
        const batch = writeBatch(db);
        seed.products.forEach((p) => {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', p.id);
          batch.set(ref, p);
        });
        seed.customers.forEach((c) => {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'customers', c.id);
          batch.set(ref, c);
        });
        seed.suppliers.forEach((s) => {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'suppliers', s.id);
          batch.set(ref, s);
        });
        seed.sales.forEach((sl) => {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sales', sl.id);
          batch.set(ref, sl);
        });
        seed.expenses.forEach((ex) => {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'expenses', ex.id);
          batch.set(ref, ex);
        });

        await batch.commit();
        if (forceReset) {
          showToast('Database restored successfully!', 'success');
        }
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      showToast('Failed to seed initial data.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  // ==========================================
  // 3. REAL-TIME FIRESTORE LISTENERS (RULES 1 & 2)
  // ==========================================
  useEffect(() => {
    if (!authReady || !user || user.uid === 'offline_local_user' || user.uid === 'atta_pos_user') return;


    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const customersRef = collection(db, 'artifacts', appId, 'public', 'data', 'customers');
    const suppliersRef = collection(db, 'artifacts', appId, 'public', 'data', 'suppliers');
    const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
    const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');

    let initialCheckDone = false;

    const unsubProducts = onSnapshot(
      productsRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (list.length === 0 && !initialCheckDone) {
          initialCheckDone = true;
          seedDatabase(false);
        } else {
          initialCheckDone = true;
          setProducts(list.sort((a, b) => a.name.localeCompare(b.name)));
        }
        setLoadingData(false);
      },
      (err) => {
        console.error('Products listener error:', err);
        setLoadingData(false);
      }
    );

    const unsubCustomers = onSnapshot(
      customersRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCustomers(list.sort((a, b) => (b.balance || 0) - (a.balance || 0)));
      },
      (err) => console.error('Customers listener error:', err)
    );

    const unsubSuppliers = onSnapshot(
      suppliersRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSuppliers(list);
      },
      (err) => console.error('Suppliers listener error:', err)
    );

    const unsubSales = onSnapshot(
      salesRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort newest first in memory (Rule 2)
        setSales(list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      },
      (err) => console.error('Sales listener error:', err)
    );

    const unsubExpenses = onSnapshot(
      expensesRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setExpenses(list.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      },
      (err) => console.error('Expenses listener error:', err)
    );

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubSuppliers();
      unsubSales();
      unsubExpenses();
    };
  }, [authReady, user]);

  // Keep selectedKhataCustomer synchronized with live Firestore updates
  useEffect(() => {
    if (selectedKhataCustomer) {
      const updated = customers.find((c) => c.id === selectedKhataCustomer.id);
      if (updated) setSelectedKhataCustomer(updated);
    }
  }, [customers]);

  // ==========================================
  // COMPUTED METRICS & ALERTS
  // ==========================================
  const todayStr = getDateOffset(0);

  const metrics = useMemo(() => {
    const activeSales = sales.filter((s) => s.status !== 'VOIDED');
    const todaySales = activeSales.filter(
      (s) => s.dateStr === todayStr || (s.timestamp && s.timestamp.startsWith(todayStr))
    );

    const todayRevenue = todaySales.reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);
    const todayGrossProfit = todaySales.reduce((acc, s) => acc + (Number(s.grossProfit) || 0), 0);
    const todayExpenses = expenses
      .filter((e) => e.date === todayStr)
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const todayNetProfit = todayGrossProfit - todayExpenses;

    // All-time P&L metrics
    const totalRevenue = activeSales.reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);
    const totalCOGS = activeSales.reduce((acc, s) => acc + (Number(s.totalCost) || 0), 0);
    const totalGrossProfit = activeSales.reduce((acc, s) => acc + (Number(s.grossProfit) || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalNetProfit = totalGrossProfit - totalExpenses;

    // Low Stock & Expiry Alerts
    const lowStockItems = products.filter((p) => Number(p.stock) <= Number(p.minStock));
    const outOfStockItems = products.filter((p) => Number(p.stock) <= 0);

    const now = new Date();
    const expiringItems = products.filter((p) => {
      if (!p.expiryDate) return false;
      const exp = new Date(p.expiryDate);
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    });

    const totalKhataReceivable = customers.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
    const totalSupplierPayable = suppliers.reduce((acc, s) => acc + (Number(s.payableBalance) || 0), 0);
    const totalInventoryValuation = products.reduce(
      (acc, p) => acc + (Number(p.stock) || 0) * (Number(p.costPrice) || 0),
      0
    );

    return {
      todayRevenue,
      todayGrossProfit,
      todayExpenses,
      todayNetProfit,
      todayBillsCount: todaySales.length,
      totalRevenue,
      totalCOGS,
      totalGrossProfit,
      totalExpenses,
      totalNetProfit,
      lowStockItems,
      outOfStockItems,
      expiringItems,
      totalKhataReceivable,
      totalSupplierPayable,
      totalInventoryValuation
    };
  }, [sales, expenses, products, customers, suppliers, todayStr]);

  // ==========================================
  // POS CART LOGIC & CHECKOUT HANDLERS
  // ==========================================
  const addToCart = (product, customQty = null) => {
    if (Number(product.stock) <= 0) {
      showToast(`"${product.name}" is out of stock!`, 'error');
      return;
    }

    const isLoose = LOOSE_UNITS.includes(product.unit);
    const defaultAddQty = customQty !== null ? Number(customQty) : 1;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const nextQty = Number((existing.qty + defaultAddQty).toFixed(3));
        if (nextQty > Number(product.stock)) {
          showToast(`Only ${product.stock} ${product.unit} available in stock`, 'error');
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = { ...existing, qty: nextQty };
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            isLoose,
            qty: defaultAddQty,
            maxStock: Number(product.stock),
            costPrice: Number(product.costPrice),
            sellingPrice: Number(product.sellingPrice),
            itemDiscount: 0
          }
        ];
      }
    });
  };

  const updateCartQty = (productId, newQtyValue) => {
    const parsed = parseFloat(newQtyValue);
    if (isNaN(parsed) || parsed < 0) {
      setCart((prev) =>
        prev.map((item) => (item.productId === productId ? { ...item, qty: 0 } : item))
      );
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        if (parsed > item.maxStock) {
          showToast(`Max available stock is ${item.maxStock} ${item.unit}`, 'error');
          return { ...item, qty: item.maxStock };
        }
        return { ...item, qty: Number(parsed.toFixed(3)) };
      })
    );
  };

  const updateCartItemDiscount = (productId, discountVal) => {
    const val = Math.max(0, Number(discountVal) || 0);
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, itemDiscount: val } : item))
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Price-to-weight conversion (e.g. "Give Rs. 100 of Sugar")
  const applyRupeeToWeight = (item) => {
    const targetRs = Number(rupeeCalcAmount);
    if (!targetRs || targetRs <= 0) return;
    const calculatedWeight = Number((targetRs / item.sellingPrice).toFixed(3));
    if (calculatedWeight > item.maxStock) {
      showToast(`Exceeds stock of ${item.maxStock} ${item.unit}`, 'error');
      return;
    }
    updateCartQty(item.productId, calculatedWeight);
    setRupeeCalcItem(null);
    setRupeeCalcAmount('');
    showToast(`Set ${calculatedWeight} ${item.unit} for Rs. ${targetRs}`, 'success');
  };

  const cartTotals = useMemo(() => {
    let subtotal = 0;
    let totalCost = 0;
    let itemDiscountsTotal = 0;

    cart.forEach((item) => {
      const rawLine = item.qty * item.sellingPrice;
      const disc = Math.min(rawLine, Number(item.itemDiscount) || 0);
      subtotal += rawLine - disc;
      itemDiscountsTotal += disc;
      totalCost += item.qty * item.costPrice;
    });

    const flatDisc = Math.min(subtotal, Number(billDiscount) || 0);
    const grandTotal = Math.max(0, Math.round(subtotal - flatDisc));
    const grossProfit = grandTotal - totalCost;

    return {
      subtotal: Math.round(subtotal),
      itemDiscountsTotal: Math.round(itemDiscountsTotal),
      flatDisc: Math.round(flatDisc),
      grandTotal,
      totalCost,
      grossProfit
    };
  }, [cart, billDiscount]);

  const handleCompleteSale = async () => {
    if (!user) return;
    const validItems = cart.filter((i) => i.qty > 0);
    if (validItems.length === 0) {
      showToast('Please add items with valid quantities to the cart.', 'error');
      return;
    }

    // Validate Khata customer selection if paymentMode === 'Khata'
    let khataCustomer = null;
    if (paymentMode === 'Khata') {
      if (quickAddCustomerMode) {
        if (!quickCustName.trim()) {
          showToast('Enter customer name for New Khata account.', 'error');
          return;
        }
      } else {
        khataCustomer = customers.find((c) => c.id === selectedCustomerId);
        if (!khataCustomer) {
          showToast('Please select a Customer for Khata (Credit) checkout.', 'error');
          return;
        }
      }
    }

    const receivedNum =
      paymentMode === 'Cash'
        ? Number(cashReceived) || cartTotals.grandTotal
        : paymentMode === 'Khata'
          ? 0
          : cartTotals.grandTotal;

    if (paymentMode === 'Cash' && cashReceived !== '' && receivedNum < cartTotals.grandTotal) {
      showToast('Cash received is less than Grand Total!', 'error');
      return;
    }

    try {
      const batch = writeBatch(db);
      const nextInvoiceNumber = `INV-${1001 + sales.length}`;
      const nowIso = new Date().toISOString();
      const readableTime = new Date().toLocaleString('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      // 1. Handle Quick-Add Customer or Existing Khata Customer update
      let finalCustomerId = null;
      let finalCustomerName = 'Walk-in Customer';
      let previousKhataBalance = 0;
      let newKhataBalance = 0;

      if (paymentMode === 'Khata') {
        if (quickAddCustomerMode) {
          const newCustId = `cust_${Date.now()}`;
          finalCustomerId = newCustId;
          finalCustomerName = quickCustName.trim();
          previousKhataBalance = 0;
          newKhataBalance = cartTotals.grandTotal;

          const newCustDoc = {
            id: newCustId,
            name: finalCustomerName,
            phone: quickCustPhone.trim() || 'N/A',
            address: 'Neighborhood Customer',
            balance: newKhataBalance,
            totalCredit: cartTotals.grandTotal,
            totalPaid: 0,
            ledger: [
              {
                id: `ldg_${Date.now()}`,
                date: readableTime,
                type: 'CREDIT_SALE',
                amount: cartTotals.grandTotal,
                invoiceNo: nextInvoiceNumber,
                notes: `POS Credit Bill (${validItems.length} items)`,
                balanceAfter: newKhataBalance
              }
            ]
          };
          const custRef = doc(db, 'artifacts', appId, 'public', 'data', 'customers', newCustId);
          batch.set(custRef, newCustDoc);
        } else if (khataCustomer) {
          finalCustomerId = khataCustomer.id;
          finalCustomerName = khataCustomer.name;
          previousKhataBalance = Number(khataCustomer.balance) || 0;
          newKhataBalance = previousKhataBalance + cartTotals.grandTotal;

          const updatedLedger = [
            ...(khataCustomer.ledger || []),
            {
              id: `ldg_${Date.now()}`,
              date: readableTime,
              type: 'CREDIT_SALE',
              amount: cartTotals.grandTotal,
              invoiceNo: nextInvoiceNumber,
              notes: `POS Credit Bill (${validItems.length} items)`,
              balanceAfter: newKhataBalance
            }
          ];

          const custRef = doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'customers',
            khataCustomer.id
          );
          batch.update(custRef, {
            balance: newKhataBalance,
            totalCredit: (Number(khataCustomer.totalCredit) || 0) + cartTotals.grandTotal,
            ledger: updatedLedger
          });
        }
      } else if (selectedCustomerId) {
        const chosen = customers.find((c) => c.id === selectedCustomerId);
        if (chosen) {
          finalCustomerId = chosen.id;
          finalCustomerName = chosen.name;
        }
      }

      // 2. Deduct product inventory stock
      validItems.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const updatedStock = Math.max(0, Number((Number(prod.stock) - item.qty).toFixed(3)));
          const prodRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', prod.id);
          batch.update(prodRef, { stock: updatedStock });
        }
      });

      // 3. Create Sale Invoice Document
      const saleId = `sale_${Date.now()}`;
      const formattedItems = validItems.map((i) => {
        const lineTotal = Math.round(i.qty * i.sellingPrice - (Number(i.itemDiscount) || 0));
        const lineProfit = lineTotal - i.qty * i.costPrice;
        return {
          productId: i.productId,
          name: i.name,
          sku: i.sku,
          unit: i.unit,
          qty: i.qty,
          costPrice: i.costPrice,
          sellingPrice: i.sellingPrice,
          itemDiscount: Number(i.itemDiscount) || 0,
          lineTotal,
          lineProfit
        };
      });

      const saleRecord = {
        id: saleId,
        invoiceNo: nextInvoiceNumber,
        timestamp: nowIso,
        dateStr: todayStr,
        items: formattedItems,
        subtotal: cartTotals.subtotal,
        billDiscount: cartTotals.flatDisc,
        grandTotal: cartTotals.grandTotal,
        totalCost: cartTotals.totalCost,
        grossProfit: cartTotals.grossProfit,
        paymentMode,
        walletProvider: paymentMode === 'Digital Wallet' ? walletProvider : null,
        cashReceived: receivedNum,
        changeDue: paymentMode === 'Cash' ? Math.max(0, receivedNum - cartTotals.grandTotal) : 0,
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        previousKhataBalance: paymentMode === 'Khata' ? previousKhataBalance : null,
        newKhataBalance: paymentMode === 'Khata' ? newKhataBalance : null,
        status: 'COMPLETED'
      };

      if (paymentMode === 'Khata') {
        if (quickAddCustomerMode) {
          const newCustDoc = {
            id: finalCustomerId,
            name: finalCustomerName,
            phone: quickCustPhone.trim() || 'N/A',
            address: 'Neighborhood Customer',
            balance: newKhataBalance,
            totalCredit: cartTotals.grandTotal,
            totalPaid: 0,
            ledger: [
              {
                id: `ldg_${Date.now()}`,
                date: readableTime,
                type: 'CREDIT_SALE',
                amount: cartTotals.grandTotal,
                invoiceNo: nextInvoiceNumber,
                notes: `POS Credit Bill (${validItems.length} items)`,
                balanceAfter: newKhataBalance
              }
            ]
          };
          const updatedCusts = [newCustDoc, ...customers];
          setCustomers(updatedCusts);
          updateLocal('customers', updatedCusts);
        } else if (khataCustomer) {
          const updatedCusts = customers.map(c => {
            if (c.id !== khataCustomer.id) return c;
            return {
              ...c,
              balance: newKhataBalance,
              totalCredit: (Number(c.totalCredit) || 0) + cartTotals.grandTotal,
              ledger: [
                ...(c.ledger || []),
                {
                  id: `ldg_${Date.now()}`,
                  date: readableTime,
                  type: 'CREDIT_SALE',
                  amount: cartTotals.grandTotal,
                  invoiceNo: nextInvoiceNumber,
                  notes: `POS Credit Bill (${validItems.length} items)`,
                  balanceAfter: newKhataBalance
                }
              ]
            };
          });
          setCustomers(updatedCusts);
          updateLocal('customers', updatedCusts);
        }
      }

      const updatedProducts = products.map(p => {
        const itemSold = validItems.find(i => i.productId === p.id);
        if (!itemSold) return p;
        return {
          ...p,
          stock: Math.max(0, Number((Number(p.stock) - itemSold.qty).toFixed(3)))
        };
      });
      setProducts(updatedProducts);
      updateLocal('products', updatedProducts);

      const updatedSales = [saleRecord, ...sales];
      setSales(updatedSales);
      updateLocal('sales', updatedSales);

      // Sync sale to Google Sheets Cloud DB
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        callGoogleSheets({ action: 'recordSale', sale: saleRecord }, sheetsUrl).catch((err) =>
          console.warn('Google Sheets sale sync error:', err)
        );
      }

      // Clear POS Cart & Display Thermal Receipt Modal
      setCart([]);
      setBillDiscount(0);
      setCashReceived('');
      setQuickAddCustomerMode(false);
      setQuickCustName('');
      setQuickCustPhone('');
      setActiveReceipt(saleRecord);
      showToast(`Invoice ${nextInvoiceNumber} completed!`, 'success');
    } catch (error) {
      console.error('Checkout error:', error);
      showToast('Failed to complete checkout transaction.', 'error');
    }
  };

  // ==========================================
  // INVENTORY HANDLERS (ADD / EDIT / RESTOCK)
  // ==========================================
  const openAddProductModal = () => {
    setEditingProduct(null);
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setProductForm({
      name: '',
      sku: `SKU-${randomCode}`,
      category: 'Grains & Flour',
      unit: 'kg',
      costPrice: '',
      sellingPrice: '',
      stock: '',
      minStock: 10,
      supplier: suppliers[0]?.name || 'General Wholesale Supplier',
      expiryDate: getDateOffset(180)
    });
    setProductModalOpen(true);
  };

  const openEditProductModal = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      unit: prod.unit,
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      stock: prod.stock,
      minStock: prod.minStock,
      supplier: prod.supplier || '',
      expiryDate: prod.expiryDate || getDateOffset(180)
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showToast('Product name is required.', 'error');
      return;
    }

    try {
      const payload = {
        name: productForm.name.trim(),
        sku: productForm.sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        category: productForm.category,
        unit: productForm.unit,
        costPrice: Number(productForm.costPrice) || 0,
        sellingPrice: Number(productForm.sellingPrice) || 0,
        stock: Number(productForm.stock) || 0,
        minStock: Number(productForm.minStock) || 5,
        supplier: productForm.supplier.trim(),
        expiryDate: productForm.expiryDate
      };

      const prodId = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
      const fullProd = { id: prodId, ...payload };

      let updated;
      if (editingProduct) {
        updated = products.map((p) => (p.id === editingProduct.id ? { ...p, ...payload } : p));
        showToast(`Updated "${payload.name}"`, 'success');
      } else {
        updated = [fullProd, ...products];
        showToast(`Added "${payload.name}" to inventory!`, 'success');
      }
      setProducts(updated);
      updateLocal('products', updated);

      // Sync to Google Sheets
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        callGoogleSheets({ action: 'saveProduct', product: fullProd }, sheetsUrl).catch((err) =>
          console.warn('Google Sheets product sync error:', err)
        );
      }

      setProductModalOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Error saving product.', 'error');
    }
  };

  const handleDeleteProduct = async (prod) => {
    try {
      const updated = products.filter((p) => p.id !== prod.id);
      setProducts(updated);
      updateLocal('products', updated);
      showToast(`Removed "${prod.name}" from inventory.`, 'success');

      // Sync delete to Google Sheets
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        callGoogleSheets({ action: 'deleteProduct', productId: prod.id }, sheetsUrl).catch((err) =>
          console.warn('Google Sheets delete product error:', err)
        );
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Error deleting product.', 'error');
    }
  };

  const handleConfirmRestock = async (e) => {
    e.preventDefault();
    if (!restockModalProduct) return;
    const added = Number(restockQty) || 0;
    if (added === 0) {
      showToast('Please enter a quantity to add or adjust.', 'error');
      return;
    }
    try {
      const newStock = Math.max(0, Number((Number(restockModalProduct.stock) + added).toFixed(3)));
      const updatedProductObj = {
        ...restockModalProduct,
        stock: newStock,
        costPrice: Number(restockNewCost) || restockModalProduct.costPrice,
        sellingPrice: Number(restockNewSelling) || restockModalProduct.sellingPrice
      };

      const updated = products.map((p) => {
        if (p.id !== restockModalProduct.id) return p;
        return updatedProductObj;
      });
      setProducts(updated);
      updateLocal('products', updated);

      // Sync restock to Google Sheets
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        callGoogleSheets({ action: 'saveProduct', product: updatedProductObj }, sheetsUrl).catch((err) =>
          console.warn('Google Sheets restock sync error:', err)
        );
      }

      showToast(
        `Stock updated for ${restockModalProduct.name}: ${newStock} ${restockModalProduct.unit}`,
        'success'
      );
      setRestockModalProduct(null);
      setRestockQty('');
    } catch (err) {
      console.error('Restock error:', err);
      showToast('Failed to update stock.', 'error');
    }
  };

  // ==========================================
  // CUSTOMER KHATA HANDLERS
  // ==========================================
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!newCustomerForm.name.trim()) {
      showToast('Customer name is required.', 'error');
      return;
    }
    try {
      const newId = `cust_${Date.now()}`;
      const opening = Number(newCustomerForm.openingBalance) || 0;
      const readableTime = new Date().toLocaleString('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const custData = {
        id: newId,
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim() || 'N/A',
        address: newCustomerForm.address.trim() || 'Local Area',
        balance: opening,
        totalCredit: opening,
        totalPaid: 0,
        ledger:
          opening > 0
            ? [
              {
                id: `ldg_${Date.now()}`,
                date: readableTime,
                type: 'CREDIT_SALE',
                amount: opening,
                invoiceNo: 'OPENING',
                notes: 'Opening Khata Balance',
                balanceAfter: opening
              }
            ]
            : []
      };

      const updated = [custData, ...customers];
      setCustomers(updated);
      updateLocal('customers', updated);

      // Sync customer to Google Sheets
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        callGoogleSheets({ action: 'saveCustomer', customer: custData }, sheetsUrl).catch((err) =>
          console.warn('Google Sheets customer sync error:', err)
        );
      }

      setCustomerModalOpen(false);
      setNewCustomerForm({ name: '', phone: '', address: '', openingBalance: 0 });
      showToast(`Customer "${custData.name}" added to Khata Book!`, 'success');
    } catch (err) {
      console.error('Add customer error:', err);
      showToast('Failed to add customer.', 'error');
    }
  };

  const handleReceiveKhataPayment = async (e) => {
    e.preventDefault();
    if (!receivePaymentCustomer) return;
    const amount = Number(paymentAmountInput) || 0;
    if (amount <= 0) {
      showToast('Enter a valid payment amount greater than 0.', 'error');
      return;
    }

    try {
      const currentBal = Number(receivePaymentCustomer.balance) || 0;
      const newBal = Math.max(0, currentBal - amount);
      const readableTime = new Date().toLocaleString('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const newEntry = {
        id: `ldg_${Date.now()}`,
        date: readableTime,
        type: 'PAYMENT',
        amount,
        invoiceNo: `PAY-${Math.floor(100 + Math.random() * 900)}`,
        notes: paymentNotesInput.trim() || 'Cash Payment Received',
        balanceAfter: newBal
      };

      const updated = customers.map((c) => {
        if (c.id !== receivePaymentCustomer.id) return c;
        return {
          ...c,
          balance: newBal,
          totalPaid: (Number(c.totalPaid) || 0) + amount,
          ledger: [...(c.ledger || []), newEntry]
        };
      });
      setCustomers(updated);
      updateLocal('customers', updated);

      // Sync payment to Google Sheets
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        callGoogleSheets(
          {
            action: 'recordKhataPayment',
            customerId: receivePaymentCustomer.id,
            amount,
            newBalance: newBal,
            notes: paymentNotesInput.trim() || 'Cash Payment Received',
            date: readableTime
          },
          sheetsUrl
        ).catch((err) => console.warn('Google Sheets payment sync error:', err));
      }

      showToast(
        `Received ${formatRs(amount)} from ${receivePaymentCustomer.name}. Remaining Khata: ${formatRs(newBal)}`,
        'success'
      );
      setReceivePaymentCustomer(null);
      setPaymentAmountInput('');
      setPaymentNotesInput('');
    } catch (err) {
      console.error('Khata payment error:', err);
      showToast('Failed to record payment.', 'error');
    }
  };

  // ==========================================
  // SUPPLIERS & EXPENSES HANDLERS
  // ==========================================
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;
    try {
      const id = `sup_${Date.now()}`;
      const payload = {
        id,
        name: supplierForm.name.trim(),
        contactPerson: supplierForm.contactPerson.trim() || 'N/A',
        phone: supplierForm.phone.trim() || 'N/A',
        category: supplierForm.category,
        payableBalance: Number(supplierForm.payableBalance) || 0,
        notes: supplierForm.notes.trim(),
        lastSupplyDate: todayStr
      };

      const updated = [payload, ...suppliers];
      setSuppliers(updated);
      updateLocal('suppliers', updated);

      // Sync supplier to Google Sheets
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        callGoogleSheets({ action: 'saveSupplier', supplier: payload }, sheetsUrl).catch((err) =>
          console.warn('Google Sheets supplier sync error:', err)
        );
      }

      setSupplierModalOpen(false);
      setSupplierForm({
        name: '',
        contactPerson: '',
        phone: '',
        category: 'Grains & Flour',
        payableBalance: '',
        notes: ''
      });
      showToast(`Supplier "${payload.name}" added!`, 'success');
    } catch (err) {
      console.error('Error adding supplier:', err);
      showToast('Failed to add supplier.', 'error');
    }
  };

  const handlePaySupplier = async (e) => {
    e.preventDefault();
    if (!paySupplierModal) return;
    const paid = Number(supplierPayAmount) || 0;
    if (paid <= 0) return;

    try {
      const newPayable = Math.max(0, (Number(paySupplierModal.payableBalance) || 0) - paid);
      const updated = suppliers.map((s) =>
        s.id === paySupplierModal.id ? { ...s, payableBalance: newPayable } : s
      );
      setSuppliers(updated);
      updateLocal('suppliers', updated);

      // Sync supplier payment to Google Sheets
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        callGoogleSheets(
          {
            action: 'paySupplier',
            supplierId: paySupplierModal.id,
            amount: paid,
            newPayable
          },
          sheetsUrl
        ).catch((err) => console.warn('Google Sheets pay supplier sync error:', err));
      }

      showToast(`Recorded payment of ${formatRs(paid)} to ${paySupplierModal.name}`, 'success');
      setPaySupplierModal(null);
      setSupplierPayAmount('');
    } catch (err) {
      console.error('Supplier payment error:', err);
      showToast('Failed to process supplier payment.', 'error');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || !expenseForm.amount) return;
    try {
      const id = `exp_${Date.now()}`;
      const payload = {
        id,
        title: expenseForm.title.trim(),
        category: expenseForm.category,
        amount: Number(expenseForm.amount) || 0,
        date: expenseForm.date || todayStr,
        paymentMethod: expenseForm.paymentMethod,
        notes: expenseForm.notes.trim()
      };

      const updated = [payload, ...expenses];
      setExpenses(updated);
      updateLocal('expenses', updated);

      // Sync expense to Google Sheets
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        callGoogleSheets({ action: 'saveExpense', expense: payload }, sheetsUrl).catch((err) =>
          console.warn('Google Sheets expense sync error:', err)
        );
      }

      setExpenseModalOpen(false);
      setExpenseForm({
        title: '',
        category: 'Electricity & Utilities',
        amount: '',
        date: todayStr,
        paymentMethod: 'Cash',
        notes: ''
      });
      showToast(`Logged expense: ${payload.title} (${formatRs(payload.amount)})`, 'success');
    } catch (err) {
      console.error('Expense error:', err);
      showToast('Failed to log expense.', 'error');
    }
  };

  // ==========================================
  // VOID / RETURN SALE INVOICE HANDLER
  // ==========================================
  const handleVoidSale = async (sale) => {
    if (sale.status === 'VOIDED') return;
    try {
      // 1. Restore product stock
      const updatedProds = products.map((p) => {
        const item = (sale.items || []).find((i) => i.productId === p.id);
        if (!item) return p;
        return { ...p, stock: Number((Number(p.stock) + Number(item.qty)).toFixed(3)) };
      });
      setProducts(updatedProds);
      updateLocal('products', updatedProds);

      // 2. If it was a Khata sale, reverse the customer balance
      if (sale.paymentMode === 'Khata' && sale.customerId) {
        const cust = customers.find((c) => c.id === sale.customerId);
        if (cust) {
          const updatedBal = Math.max(0, (Number(cust.balance) || 0) - Number(sale.grandTotal));
          const readableTime = new Date().toLocaleString('en-PK', {
            dateStyle: 'medium',
            timeStyle: 'short'
          });
          const updatedCusts = customers.map((c) => {
            if (c.id !== sale.customerId) return c;
            return {
              ...c,
              balance: updatedBal,
              ledger: [
                ...(c.ledger || []),
                {
                  id: `ldg_${Date.now()}`,
                  date: readableTime,
                  type: 'PAYMENT',
                  amount: sale.grandTotal,
                  invoiceNo: `${sale.invoiceNo}-VOID`,
                  notes: `Invoice ${sale.invoiceNo} Returned/Voided`,
                  balanceAfter: updatedBal
                }
              ]
            };
          });
          setCustomers(updatedCusts);
          updateLocal('customers', updatedCusts);
        }
      }

      // 3. Mark sale status as VOIDED
      const updatedSales = sales.map((s) => (s.id === sale.id ? { ...s, status: 'VOIDED' } : s));
      setSales(updatedSales);
      updateLocal('sales', updatedSales);

      // Sync void sale to Google Sheets
      const sheetsUrl = getStoredSheetsUrl();
      if (sheetsUrl) {
        callGoogleSheets({ action: 'voidSale', saleId: sale.id }, sheetsUrl).catch((err) =>
          console.warn('Google Sheets void sale sync error:', err)
        );
      }

      showToast(`Invoice ${sale.invoiceNo} has been VOIDED & stock restored!`, 'info');
    } catch (err) {
      console.error('Void error:', err);
      showToast('Failed to void invoice.', 'error');
    }
  };

  // ==========================================
  // FILTERED LISTS FOR VIEWS
  // ==========================================
  const filteredPosProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = posCategory === 'All' || p.category === posCategory;
      const q = posSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [products, posCategory, posSearch]);

  const filteredInventory = useMemo(() => {
    const now = new Date();
    return products.filter((p) => {
      const matchesCat = invCategory === 'All' || p.category === invCategory;
      const q = invSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q));

      if (!matchesCat || !matchesSearch) return false;

      if (invStatusFilter === 'LOW_STOCK') {
        return Number(p.stock) <= Number(p.minStock);
      }
      if (invStatusFilter === 'OUT_OF_STOCK') {
        return Number(p.stock) <= 0;
      }
      if (invStatusFilter === 'EXPIRING_SOON') {
        if (!p.expiryDate) return false;
        const diffDays = Math.ceil((new Date(p.expiryDate) - now) / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      }
      return true;
    });
  }, [products, invCategory, invSearch, invStatusFilter]);

  const filteredCustomers = useMemo(() => {
    const q = khataSearch.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, khataSearch]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (reportFilterDate === 'TODAY') {
        const isToday =
          s.dateStr === todayStr || (s.timestamp && s.timestamp.startsWith(todayStr));
        if (!isToday) return false;
      }
      if (reportPaymentFilter !== 'ALL' && s.paymentMode !== reportPaymentFilter) {
        return false;
      }
      return true;
    });
  }, [sales, reportFilterDate, reportPaymentFilter, todayStr]);

  // ==========================================
  // RENDER LOADING STATE
  // ==========================================
  if (!authReady || loadingData) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30 animate-pulse mb-4">
          <Store className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Atta Tuck Shop Pos</h1>
        <p className="text-slate-400 text-sm mt-1">
          Loading grocery inventory, Khata ledger & POS terminal...
        </p>
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATION GUARD (LOGIN / REGISTER)
  // ==========================================
  if (!currentUser) {
    return (
      <>
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-slate-900 text-white border-slate-700 animate-bounce">
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}
        <AuthScreen
          onLoginSuccess={(usr) => setCurrentUser(usr)}
          showToast={showToast}
          customStoreInfo={storeInfo}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col lg:flex-row font-sans">
      {/* ==========================================
          TOAST NOTIFICATION BANNER
      ========================================== */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-slate-900 text-white border-slate-700 animate-bounce">
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* ==========================================
          SIDEBAR NAVIGATION
      ========================================== */}
      {/* ==========================================
          MOBILE SLIDE-OVER NAVIGATION DRAWER
      ========================================== */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-in Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-200 flex flex-col h-full shadow-2xl z-10 border-r border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 shrink-0">
                  <Store className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                  <h1 className="font-bold text-white text-sm leading-tight truncate">{storeInfo.name}</h1>
                  <span className={`text-[10px] font-semibold flex items-center gap-1 mt-0.5 ${hasGoogleSheetsUrl ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasGoogleSheetsUrl ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {hasGoogleSheetsUrl ? 'Cloud DB: Live' : 'Offline Mode'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 flex flex-col gap-1.5 flex-1 overflow-y-auto">
              {[
                { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
                {
                  id: 'pos',
                  label: 'POS Billing Terminal',
                  icon: ShoppingCart,
                  badge: cart.length > 0 ? `${cart.length}` : null,
                  badgeColor: 'bg-amber-400 text-slate-950'
                },
                {
                  id: 'inventory',
                  label: 'Inventory & Expiry',
                  icon: Package,
                  badge: (metrics.lowStockItems.length + metrics.expiringItems.length) > 0 ? `${metrics.lowStockItems.length + metrics.expiringItems.length}` : null,
                  badgeColor: 'bg-rose-500 text-white'
                },
                {
                  id: 'khata',
                  label: 'Customer Khata Book',
                  icon: BookOpen,
                  badge: `${customers.filter((c) => c.balance > 0).length} Due`,
                  badgeColor: 'bg-slate-800 text-amber-400'
                },
                { id: 'suppliers', label: 'Suppliers & Expenses', icon: Truck },
                { id: 'reports', label: 'Sales & P&L Reports', icon: FileBarChart },
                {
                  id: 'settings',
                  label: 'Store Settings & Cloud DB',
                  icon: Settings,
                  badge: hasGoogleSheetsUrl ? 'Live' : 'Offline',
                  badgeColor: hasGoogleSheetsUrl ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                      if (item.id === 'pos') setPosMobileTab('catalog');
                    }}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer: User Profile & Quick Day Stats */}
            <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/60">
              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                <div className="text-[11px] text-slate-400 font-medium">Today's Sales Revenue</div>
                <div className="text-base font-extrabold text-emerald-400 mt-0.5">{formatRs(metrics.todayRevenue)}</div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Net Profit:</span>
                  <span className="text-white font-bold">{formatRs(metrics.todayNetProfit)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/30">
                    {(currentUser?.fullName || currentUser?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-white truncate">
                      {currentUser?.fullName || currentUser?.username}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium">
                      {currentUser?.role || 'Staff'} &bull; {hasGoogleSheetsUrl ? 'Synced' : 'Local'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStoredUser(null);
                    setCurrentUser(null);
                    setMobileNavOpen(false);
                    showToast('Logged out of terminal.', 'info');
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  if (getStoredSheetsUrl()) {
                    handleSyncAllFromSheets();
                  } else {
                    setActiveTab('settings');
                    setMobileNavOpen(false);
                  }
                }}
                disabled={sheetsSyncing}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sheetsSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{sheetsSyncing ? 'Syncing...' : 'Sync Cloud Database'}</span>
              </button>

              <div className="text-[10px] text-slate-500 text-center font-medium pt-1">
                Shop POS v1.0.0 &bull; Production
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          DESKTOP SIDEBAR NAVIGATION (lg: and up)
      ========================================== */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-200 flex-col shrink-0 border-r border-slate-800 print:hidden h-screen sticky top-0">
        {/* Store Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-white text-sm leading-tight truncate">{storeInfo.name}</h1>
              {hasGoogleSheetsUrl ? (
                <button
                  onClick={() => setActiveTab('settings')}
                  className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 hover:underline mt-0.5"
                  title="Google Sheets Database Connected - Click to view Settings"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Cloud DB: Live
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('settings')}
                  className="text-xs text-amber-400 font-medium flex items-center gap-1.5 hover:underline mt-0.5"
                  title="Click to configure Cloud Database in Settings"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Offline DB (Configure)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 flex flex-col gap-1 overflow-y-auto flex-1">
          <button
            onClick={() => {
              setActiveTab('dashboard');
            }}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab('pos');
              setPosMobileTab('catalog');
            }}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition shrink-0 ${
              activeTab === 'pos'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-4 h-4" />
              <span>POS Billing</span>
            </div>
            {cart.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-400 text-slate-950">
                {cart.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition shrink-0 ${
              activeTab === 'inventory'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4" />
              <span>Inventory & Expiry</span>
            </div>
            {(metrics.lowStockItems.length > 0 || metrics.expiringItems.length > 0) && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                {metrics.lowStockItems.length + metrics.expiringItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('khata')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition shrink-0 ${
              activeTab === 'khata'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4" />
              <span>Customer Khata</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 font-bold">
              {customers.filter((c) => c.balance > 0).length} Due
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition shrink-0 ${
              activeTab === 'suppliers'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Truck className="w-4 h-4" />
              <span>Suppliers & Expenses</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition shrink-0 ${
              activeTab === 'reports'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileBarChart className="w-4 h-4" />
              <span>Sales & Reports</span>
            </div>
          </button>

          {/* Store Settings & Cloud DB */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition shrink-0 ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4" />
              <span>Store Settings</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                hasGoogleSheetsUrl ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {hasGoogleSheetsUrl ? 'Cloud' : 'Config'}
            </span>
          </button>
        </nav>

        {/* Sidebar Footer: User Badge & Stats */}
        <div className="p-4 border-t border-slate-800 space-y-3 mt-auto">
          {/* Active User Card */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/30">
                {(currentUser?.fullName || currentUser?.username || 'U')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.fullName || currentUser?.username}
                </div>
                <div className="text-[10px] text-emerald-400 font-medium">
                  {currentUser?.role || 'Staff'} &bull; {hasGoogleSheetsUrl ? 'Synced' : 'Local'}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setStoredUser(null);
                setCurrentUser(null);
                showToast('Logged out of terminal.', 'info');
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-xs text-slate-400">Today's Cash & Sales</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {formatRs(metrics.todayRevenue)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>Net Profit:</span>
              <span className="text-white font-semibold">{formatRs(metrics.todayNetProfit)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (getStoredSheetsUrl()) {
                handleSyncAllFromSheets();
              } else {
                setActiveTab('settings');
              }
            }}
            disabled={sheetsSyncing}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sheetsSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{sheetsSyncing ? 'Syncing...' : 'Sync Cloud Database'}</span>
          </button>

          <div className="text-[10px] text-slate-500 text-center font-medium pt-1">
            Shop POS v1.0.0 &bull; Production
          </div>
        </div>
      </aside>

      {/* ==========================================
          MAIN CONTENT AREA
      ========================================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 lg:pb-0 print:hidden">
        {/* ==========================================
            RESPONSIVE TOP BAR (MOBILE & DESKTOP)
        ========================================== */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
          {/* Mobile Left: Menu Toggle Button + Store Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate leading-tight flex items-center gap-2">
                <span className="truncate">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'pos' && 'POS Billing'}
                  {activeTab === 'inventory' && 'Inventory'}
                  {activeTab === 'khata' && 'Customer Khata'}
                  {activeTab === 'suppliers' && 'Suppliers & Expenses'}
                  {activeTab === 'reports' && 'Sales & P&L Reports'}
                  {activeTab === 'settings' && 'Store Settings'}
                </span>
                <span className="hidden sm:inline-block text-xs font-normal text-slate-400">
                  &bull; {storeInfo.name}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate">
                {new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}
              </p>
            </div>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Google Sheets Status in Topbar */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                hasGoogleSheetsUrl
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Click to manage Store Profile & Cloud DB Settings"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">
                {hasGoogleSheetsUrl ? 'Cloud DB: Live' : 'Local Mode (Configure)'}
              </span>
            </button>

            {/* In POS tab on Mobile: Fast Cart Switcher Button */}
            {activeTab === 'pos' && (
              <button
                onClick={() => setPosMobileTab(posMobileTab === 'cart' ? 'catalog' : 'cart')}
                className={`lg:hidden px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                  posMobileTab === 'cart'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>
                  {posMobileTab === 'cart' ? 'Products' : `Cart (${cart.length})`}
                </span>
              </button>
            )}

            {/* Quick action buttons on Desktop */}
            {activeTab !== 'pos' && (
              <button
                onClick={() => {
                  setActiveTab('pos');
                  setPosMobileTab('catalog');
                }}
                className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold items-center gap-1.5 shadow-sm transition"
              >
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>New POS Sale</span>
              </button>
            )}

            <button
              onClick={openAddProductModal}
              className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Add Product"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Add Product</span>
            </button>

            <button
              onClick={() => setExpenseModalOpen(true)}
              className="hidden sm:flex bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold items-center gap-1.5 border border-slate-200 transition"
              title="Log Expense"
            >
              <Wallet className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">Log Expense</span>
            </button>

            {/* User Avatar with Logout */}
            <button
              onClick={() => {
                setStoredUser(null);
                setCurrentUser(null);
                showToast('Logged out.', 'info');
              }}
              title="Logout"
              className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ==========================================
            MOBILE BOTTOM NAVIGATION BAR (lg:hidden)
        ========================================== */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex justify-around items-center shadow-2xl safe-area-bottom">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeTab === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pos');
              setPosMobileTab('catalog');
            }}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeTab === 'pos' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 text-[9px] font-extrabold rounded-full bg-amber-400 text-slate-950 border border-white">
                  {cart.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">POS Bill</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeTab === 'inventory' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="relative">
              <Package className="w-5 h-5" />
              {(metrics.lowStockItems.length + metrics.expiringItems.length) > 0 && (
                <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 text-[9px] font-extrabold rounded-full bg-rose-500 text-white border border-white">
                  {metrics.lowStockItems.length + metrics.expiringItems.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">Inventory</span>
          </button>

          <button
            onClick={() => setActiveTab('khata')}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeTab === 'khata' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="relative">
              <BookOpen className="w-5 h-5" />
              {customers.filter((c) => c.balance > 0).length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 text-[9px] font-extrabold rounded-full bg-amber-500 text-white border border-white">
                  {customers.filter((c) => c.balance > 0).length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">Khata</span>
          </button>

          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 transition"
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Menu</span>
          </button>
        </div>


        {/* ==========================================
            MODULE 1: EXECUTIVE DASHBOARD
        ========================================== */}
        {activeTab === 'dashboard' && (
          <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-6">
            {/* 6 KPI Cards - Compact 2-column mobile grid, 3-col on lg, 6-col on xl */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3.5">
              <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium">
                  <span className="truncate pr-1">Revenue</span>
                  <span className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                </div>
                <div className="text-sm sm:text-xl font-black text-slate-900 mt-1 sm:mt-2 truncate">
                  {formatRs(metrics.todayRevenue)}
                </div>
                <div className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-0.5 truncate">
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                  <span className="truncate">{metrics.todayBillsCount} Bills</span>
                </div>
              </div>

              <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium">
                  <span className="truncate pr-1">Net Profit</span>
                  <span className="p-1 sm:p-1.5 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                </div>
                <div className="text-sm sm:text-xl font-black text-slate-900 mt-1 sm:mt-2 truncate">
                  {formatRs(metrics.todayNetProfit)}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">
                  Exp: {formatRs(metrics.todayExpenses)}
                </div>
              </div>

              <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium">
                  <span className="truncate pr-1">Khata Due</span>
                  <span className="p-1 sm:p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                </div>
                <div className="text-sm sm:text-xl font-black text-amber-600 mt-1 sm:mt-2 truncate">
                  {formatRs(metrics.totalKhataReceivable)}
                </div>
                <button
                  onClick={() => setActiveTab('khata')}
                  className="text-[10px] sm:text-xs text-amber-700 hover:underline font-semibold mt-1 flex items-center gap-0.5 truncate"
                >
                  <span>Collect Udhaar</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </button>
              </div>

              <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium">
                  <span className="truncate pr-1">Low Stock</span>
                  <span className="p-1 sm:p-1.5 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                </div>
                <div className="text-sm sm:text-xl font-black text-rose-600 mt-1 sm:mt-2 truncate">
                  {metrics.lowStockItems.length} Items
                </div>
                <button
                  onClick={() => {
                    setInvStatusFilter('LOW_STOCK');
                    setActiveTab('inventory');
                  }}
                  className="text-[10px] sm:text-xs text-rose-600 hover:underline font-semibold mt-1 flex items-center gap-0.5 truncate"
                >
                  <span>Restock Now</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </button>
              </div>

              <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium">
                  <span className="truncate pr-1">Expiring</span>
                  <span className="p-1 sm:p-1.5 rounded-lg bg-orange-50 text-orange-600 shrink-0">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                </div>
                <div className="text-sm sm:text-xl font-black text-orange-600 mt-1 sm:mt-2 truncate">
                  {metrics.expiringItems.length} Batches
                </div>
                <button
                  onClick={() => {
                    setInvStatusFilter('EXPIRING_SOON');
                    setActiveTab('inventory');
                  }}
                  className="text-[10px] sm:text-xs text-orange-600 hover:underline font-semibold mt-1 flex items-center gap-0.5 truncate"
                >
                  <span>Inspect Expiry</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </button>
              </div>

              <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium">
                  <span className="truncate pr-1">Stock Value</span>
                  <span className="p-1 sm:p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                    <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                </div>
                <div className="text-sm sm:text-xl font-black text-slate-900 mt-1 sm:mt-2 truncate">
                  {formatRs(metrics.totalInventoryValuation)}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">{products.length} SKUs</div>
              </div>
            </div>

            {/* Quick Action Bar - Space efficient 2x2 grid on mobile */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-xl sm:rounded-2xl p-3 sm:p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h3 className="text-xs sm:text-base font-bold flex items-center gap-1.5 sm:gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                  <span>Quick Counter Actions</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5 hidden xs:block">
                  Jump directly to billing, customer Udhaar collection, or stock adjustment.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full md:w-auto">
                <button
                  onClick={() => setActiveTab('pos')}
                  className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">POS Terminal</span>
                </button>
                <button
                  onClick={() => setActiveTab('khata')}
                  className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">Khata Pay</span>
                </button>
                <button
                  onClick={openAddProductModal}
                  className="bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1.5 border border-white/15 transition"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">Add Item</span>
                </button>
                <button
                  onClick={() => setExpenseModalOpen(true)}
                  className="bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1.5 border border-white/15 transition"
                >
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">Log Expense</span>
                </button>
              </div>
            </div>

            {/* Middle Grid: Alerts Panel & Recent Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              {/* Real-Time Stock & Expiry Alerts Panel */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col">
                <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0" />
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Critical Stock & Expiry Alerts
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="text-[11px] sm:text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    Manage Inventory →
                  </button>
                </div>

                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
                  {metrics.lowStockItems.length === 0 && metrics.expiringItems.length === 0 ? (
                    <div className="text-center py-4 sm:py-8 text-slate-400 text-xs sm:text-sm">
                      All products are well-stocked and within safe expiry dates!
                    </div>
                  ) : (
                    <>
                      {metrics.lowStockItems.map((item) => (
                        <div
                          key={`low_${item.id}`}
                          className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-rose-50/70 border border-rose-200/80"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                              <span>{item.name}</span>
                              <span className="text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-rose-600 text-white">
                                Low Stock
                              </span>
                            </div>
                            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                              Current: <strong className="text-rose-700">{item.stock} {item.unit}</strong> (Min Alert: {item.minStock} {item.unit})
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setRestockModalProduct(item);
                              setRestockQty('20');
                              setRestockNewCost(item.costPrice);
                              setRestockNewSelling(item.sellingPrice);
                            }}
                            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-white hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-300 text-[11px] sm:text-xs font-semibold transition shrink-0"
                          >
                            + Restock
                          </button>
                        </div>
                      ))}

                      {metrics.expiringItems.map((item) => {
                        const daysLeft = Math.ceil(
                          (new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
                        );
                        return (
                          <div
                            key={`exp_${item.id}`}
                            className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-amber-50/70 border border-amber-200/80"
                          >
                            <div>
                              <div className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                                <span>{item.name}</span>
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                                  {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                                </span>
                              </div>
                              <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                                Exp: <strong>{item.expiryDate}</strong> • Stock: {item.stock} {item.unit}
                              </div>
                            </div>
                            <button
                              onClick={() => openEditProductModal(item)}
                              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-white hover:bg-amber-500 hover:text-slate-950 text-amber-800 border border-amber-300 text-[11px] sm:text-xs font-semibold transition shrink-0"
                            >
                              Update Batch
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Recent POS Bills & Transactions */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col">
                <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Recent Counter Bills</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className="text-[11px] sm:text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    View All Invoices →
                  </button>
                </div>

                <div className="p-3 sm:p-4 space-y-2 sm:space-y-2.5 max-h-64 sm:max-h-80 overflow-y-auto">
                  {sales.length === 0 ? (
                    <div className="text-center py-4 sm:py-8 text-slate-400 text-xs">
                      No sales recorded yet. Start billing items in the POS Terminal!
                    </div>
                  ) : (
                    sales.slice(0, 6).map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 transition"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{sale.invoiceNo}</span>
                            <span
                              className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sale.paymentMode === 'Cash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sale.paymentMode === 'Khata'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-indigo-100 text-indigo-800'
                                }`}
                            >
                              {sale.paymentMode}
                            </span>
                            {sale.status === 'VOIDED' && (
                              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                VOIDED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                            {sale.customerName} • {(sale.items || []).length} items
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="text-right">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {formatRs(sale.grandTotal)}
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-emerald-600 font-medium">
                              Profit: {formatRs(sale.grossProfit)}
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveReceipt(sale)}
                            className="p-1.5 sm:p-2 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                            title="Print / View Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Category Breakdown & Top Outstanding Khata Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-5">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm mb-2.5 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                  <FileBarChart className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Inventory Stock Value by Department</span>
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => {
                    const catProducts = products.filter((p) => p.category === cat);
                    const catValue = catProducts.reduce(
                      (sum, p) => sum + Number(p.stock) * Number(p.costPrice),
                      0
                    );
                    const pct =
                      metrics.totalInventoryValuation > 0
                        ? Math.min(100, Math.round((catValue / metrics.totalInventoryValuation) * 100))
                        : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-[11px] sm:text-xs font-medium text-slate-700 mb-0.5 sm:mb-1">
                          <span>
                            {cat} <span className="text-slate-400">({catProducts.length})</span>
                          </span>
                          <span className="font-bold text-slate-900">
                            {formatRs(catValue)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                      <Users className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Top Customer Khata</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('khata')}
                      className="text-[11px] sm:text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      Open Book →
                    </button>
                  </div>
                  <div className="space-y-2 sm:space-y-2.5">
                    {customers
                      .filter((c) => c.balance > 0)
                      .slice(0, 4)
                      .map((cust) => (
                        <div
                          key={cust.id}
                          className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200/60"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">{cust.name}</div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500">{cust.phone}</div>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="font-bold text-amber-700 text-xs">
                              {formatRs(cust.balance)}
                            </span>
                            <button
                              onClick={() => {
                                setReceivePaymentCustomer(cust);
                                setPaymentAmountInput(String(cust.balance));
                              }}
                              className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-[11px] font-semibold"
                            >
                              Receive
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium text-[11px] sm:text-xs">Pending Udhaar:</span>
                  <span className="text-xs sm:text-sm font-bold text-amber-600">
                    {formatRs(metrics.totalKhataReceivable)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODULE 2: POINT OF SALE (POS) & FAST BILLING
        ========================================== */}
        {activeTab === 'pos' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Left Side: Product Catalog & Search */}
            <div className={`flex-1 flex-col p-3.5 sm:p-5 overflow-y-auto ${posMobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
              {/* Mobile POS Segmented Switch */}
              <div className="lg:hidden flex bg-slate-200/80 p-1 rounded-xl mb-3 text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setPosMobileTab('catalog')}
                  className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    posMobileTab === 'catalog'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Catalog ({filteredPosProducts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPosMobileTab('cart')}
                  className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    posMobileTab === 'cart'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Cart ({cart.length}) &bull; {formatRs(cartTotals.grandTotal)}</span>
                </button>
              </div>
              {/* Search & Category Bar */}
              <div className="space-y-2.5 mb-3 sm:mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    placeholder="Search grocery item by Name, SKU / Barcode..."
                    className="w-full pl-9 pr-8 py-2 sm:py-2.5 bg-white rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                  {posSearch && (
                    <button
                      onClick={() => setPosSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPosCategory(cat)}
                      className={`px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold shrink-0 transition ${posCategory === cat
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid - 2 columns on mobile for maximum space efficiency! */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3.5">
                {filteredPosProducts.length === 0 ? (
                  <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <Package className="w-7 h-7" />
                    </div>
                    {products.length === 0 ? (
                      <>
                        <h4 className="font-bold text-slate-800 text-base">No Products in Inventory</h4>
                        <p className="text-xs text-slate-500 max-w-md mt-1 mb-5">
                          Your Atta Tuck Shop Pos database is completely fresh and clean. Add your products, sync from your Google Sheet, or load our quick starter pack.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button
                            onClick={openAddProductModal}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                          >
                            <Plus className="w-4 h-4" /> Add First Product
                          </button>
                          <button
                            onClick={() => {
                              if (getStoredSheetsUrl()) {
                                handleSyncAllFromSheets();
                              } else {
                                setActiveTab('settings');
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                          >
                            <FileSpreadsheet className="w-4 h-4" /> Sync Cloud Database
                          </button>
                          <button
                            onClick={loadStarterPack}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 border border-slate-300 transition"
                          >
                            <Sparkles className="w-4 h-4 text-amber-500" /> Load Starter Pack (5 Items)
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="font-bold text-slate-800 text-base">No Products Found</h4>
                        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                          No items match &quot;{posSearch}&quot; in category &quot;{posCategory}&quot;.
                        </p>
                        <button
                          onClick={() => {
                            setPosSearch('');
                            setPosCategory('All');
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                        >
                          Reset Search Filters
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  filteredPosProducts.map((prod) => {
                    const isLoose = LOOSE_UNITS.includes(prod.unit);
                    const isLow = Number(prod.stock) <= Number(prod.minStock);
                    const isOut = Number(prod.stock) <= 0;
                    const inCartItem = cart.find((c) => c.productId === prod.id);

                    return (
                      <div
                        key={prod.id}
                        className={`bg-white rounded-xl sm:rounded-2xl border p-2 sm:p-3.5 flex flex-col justify-between transition shadow-xs hover:shadow-md ${inCartItem
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-slate-200'
                          } ${isOut ? 'opacity-60' : ''}`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[9px] sm:text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[65px] sm:max-w-[100px]">
                              {prod.sku}
                            </span>
                            <span
                              className={`text-[9px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${isOut
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-700'
                                }`}
                            >
                              {isOut ? 'Out' : `${prod.stock} ${prod.unit}`}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-1 sm:mt-1.5 leading-snug line-clamp-2 min-h-[2rem]">
                            {prod.name}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">{prod.category}</p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                            <div>
                              <span className="text-xs sm:text-base font-extrabold text-emerald-700">
                                {formatRs(prod.sellingPrice)}
                              </span>
                              <span className="text-[10px] sm:text-xs text-slate-400">/{prod.unit}</span>
                            </div>

                            <button
                              onClick={() => addToCart(prod, 1)}
                              disabled={isOut}
                              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:bg-slate-300 text-white px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition"
                            >
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              <span>Add 1</span>
                            </button>
                          </div>

                          {/* Loose Weight Presets (250g, 500g, 1kg, 5kg) */}
                          {isLoose && !isOut && (
                            <div className="grid grid-cols-4 gap-1 pt-1.5 mt-1 border-t border-slate-100/70">
                              {[
                                { label: '250g', val: 0.25 },
                                { label: '500g', val: 0.5 },
                                { label: '1kg', val: 1 },
                                { label: '5kg', val: 5 }
                              ].map((preset) => (
                                <button
                                  key={preset.label}
                                  onClick={() => addToCart(prod, preset.val)}
                                  className="py-1 px-0.5 rounded bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-[9px] sm:text-[10px] font-bold border border-slate-200 text-center transition active:scale-95"
                                >
                                  +{preset.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Mobile Floating Sticky Cart Summary */}
              {cart.length > 0 && posMobileTab === 'catalog' && (
                <div className="lg:hidden fixed bottom-16 left-3 right-3 z-20">
                  <button
                    onClick={() => setPosMobileTab('cart')}
                    className="w-full bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700/80 transition transform active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                        {cart.length}
                      </span>
                      <div className="text-left">
                        <div className="text-[11px] text-slate-400">Total Counter Bill</div>
                        <div className="text-sm font-extrabold text-white">{formatRs(cartTotals.grandTotal)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-slate-800 py-1.5 px-3 rounded-xl border border-slate-700">
                      <span>Review & Checkout</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Right Side: Active POS Cart & Checkout Terminal */}
            <div className={`w-full lg:w-[430px] xl:w-[460px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex-col shrink-0 shadow-xl ${
              posMobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'
            }`}>
              {/* Cart Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setPosMobileTab('catalog')}
                    className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    title="Back to Catalog"
                    aria-label="Back to Catalog"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <ShoppingCart className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm">Current Counter Bill</h3>
                    <p className="text-[11px] text-slate-400">
                      {cart.length} {cart.length === 1 ? 'item' : 'items'} in cart
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPosMobileTab('catalog')}
                    className="lg:hidden text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 rounded bg-slate-800"
                  >
                    + Catalog
                  </button>
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 p-3.5 space-y-2.5 overflow-y-auto max-h-[360px] lg:max-h-none">
                {cart.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-center text-slate-400 px-4">
                    <ShoppingCart className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Cart is Empty</p>
                    <p className="text-xs mt-0.5">
                      Click any product or weight preset (250g, 500g, 1kg) on the left to start billing.
                    </p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const lineTotal = Math.round(
                      item.qty * item.sellingPrice - (Number(item.itemDiscount) || 0)
                    );
                    return (
                      <div
                        key={item.productId}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs">{item.name}</h4>
                            <span className="text-[11px] text-slate-500">
                              {formatRs(item.sellingPrice)} / {item.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {formatRs(lineTotal)}
                            </span>
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="p-1.5 -mr-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Remove item"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Quantity Controls + Loose Weight Decimal Input */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                updateCartQty(
                                  item.productId,
                                  Math.max(0.25, item.qty - (item.isLoose ? 0.25 : 1))
                                )
                              }
                              className="w-8 h-8 rounded-xl bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition text-slate-700 cursor-pointer shadow-xs"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              step={item.isLoose ? '0.05' : '1'}
                              min="0.05"
                              value={item.qty}
                              onChange={(e) => updateCartQty(item.productId, e.target.value)}
                              className="w-16 text-center py-1.5 px-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                            />
                            <span className="text-xs font-semibold text-slate-600">
                              {item.unit}
                            </span>
                            <button
                              onClick={() =>
                                updateCartQty(
                                  item.productId,
                                  item.qty + (item.isLoose ? 0.25 : 1)
                                )
                              }
                              className="w-8 h-8 rounded-xl bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition text-slate-700 cursor-pointer shadow-xs"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Item Discount Input or Price-to-Weight Button */}
                          <div className="flex items-center gap-1.5">
                            {item.isLoose && (
                              <button
                                onClick={() =>
                                  setRupeeCalcItem(
                                    rupeeCalcItem === item.productId ? null : item.productId
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1"
                                title="Calculate weight by Rupee amount (e.g. Rs. 100 worth)"
                              >
                                <Calculator className="w-3 h-3" /> Rs→Wt
                              </button>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Disc:</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={item.itemDiscount || ''}
                                onChange={(e) =>
                                  updateCartItemDiscount(item.productId, e.target.value)
                                }
                                className="w-14 py-1 px-1.5 bg-white border border-slate-200 rounded text-xs text-right"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quick Rupee-to-Weight Popover for Loose Items */}
                        {rupeeCalcItem === item.productId && (
                          <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                            <span className="text-[11px] text-slate-600 font-medium">
                              Enter Rs. Amount:
                            </span>
                            <input
                              type="number"
                              placeholder="e.g. 100"
                              value={rupeeCalcAmount}
                              onChange={(e) => setRupeeCalcAmount(e.target.value)}
                              className="w-24 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                            />
                            <button
                              onClick={() => applyRupeeToWeight(item)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                            >
                              Set Weight
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Checkout Calculation & Payment Panel */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                {/* Subtotal, Discount & Grand Total */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatRs(cartTotals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Extra Bill Discount (Rs.):</span>
                    <input
                      type="number"
                      min="0"
                      value={billDiscount || ''}
                      onChange={(e) => setBillDiscount(e.target.value)}
                      placeholder="0"
                      className="w-20 px-2 py-1 text-right bg-white border border-slate-300 rounded-lg font-semibold text-xs"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-base font-extrabold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-xl text-emerald-700">
                      {formatRs(cartTotals.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Payment Mode Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Select Payment Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Cash', label: 'Cash Sale', icon: Banknote },
                      { id: 'Khata', label: 'Khata (Udhaar)', icon: BookOpen },
                      { id: 'Digital Wallet', label: 'EasyPaisa/Bank', icon: CreditCard }
                    ].map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPaymentMode(mode.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${paymentMode === mode.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mode-Specific Inputs */}
                {paymentMode === 'Cash' && (
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Cash Received (Rs.):
                      </label>
                      <input
                        type="number"
                        placeholder={String(cartTotals.grandTotal)}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-right"
                      />
                    </div>
                    {/* Quick Cash Notes */}
                    <div className="flex gap-1.5">
                      {[cartTotals.grandTotal, 500, 1000, 2000, 5000].map((note, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCashReceived(String(note))}
                          className="flex-1 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-[11px] font-semibold text-slate-700 border border-slate-200"
                        >
                          {idx === 0 ? 'Exact' : note}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium">Change Due Back:</span>
                      <span className="font-extrabold text-sm text-emerald-700">
                        {formatRs(
                          Math.max(
                            0,
                            (Number(cashReceived) || cartTotals.grandTotal) - cartTotals.grandTotal
                          )
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {paymentMode === 'Khata' && (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">
                        Assign to Customer Khata
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickAddCustomerMode(!quickAddCustomerMode)}
                        className="text-[11px] font-bold text-emerald-700 hover:underline"
                      >
                        {quickAddCustomerMode ? 'Select Existing' : '+ New Customer'}
                      </button>
                    </div>

                    {!quickAddCustomerMode ? (
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-slate-800"
                      >
                        <option value="">-- Choose Neighborhood Customer --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Current Due: Rs. {c.balance})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Customer Name *"
                          value={quickCustName}
                          onChange={(e) => setQuickCustName(e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={quickCustPhone}
                          onChange={(e) => setQuickCustPhone(e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}

                {paymentMode === 'Digital Wallet' && (
                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900">Wallet / Bank:</span>
                    <div className="flex gap-1.5">
                      {['EasyPaisa', 'JazzCash', 'Bank Transfer'].map((wp) => (
                        <button
                          key={wp}
                          type="button"
                          onClick={() => setWalletProvider(wp)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${walletProvider === wp
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-indigo-800 border border-indigo-200'
                            }`}
                        >
                          {wp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Complete Sale & Print Receipt Button */}
                <button
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    Complete Bill & Print Receipt ({formatRs(cartTotals.grandTotal)})
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODULE 3: INVENTORY & EXPIRY MANAGEMENT
        ========================================== */}
        {activeTab === 'inventory' && (
          <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-5">
            {/* Filters & Action Header - Space efficient mobile toolbar */}
            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-2 sm:gap-3">
              {/* Row 1: Search + Add Product Button */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    placeholder="Search by Product Name, SKU, Supplier..."
                    className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-300 rounded-lg sm:rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {invSearch && (
                    <button
                      onClick={() => setInvSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={openAddProductModal}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs shrink-0 transition"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Add Item</span>
                </button>
              </div>

              {/* Row 2: Category Filter & Status Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <select
                  value={invCategory}
                  onChange={(e) => setInvCategory(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shrink-0"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All Categories' : c}
                    </option>
                  ))}
                </select>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                  {[
                    { id: 'ALL', label: 'All Items' },
                    { id: 'LOW_STOCK', label: `Low Stock (${metrics.lowStockItems.length})` },
                    { id: 'EXPIRING_SOON', label: `Expiring (${metrics.expiringItems.length})` }
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setInvStatusFilter(st.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 ${invStatusFilter === st.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Inventory Table Container */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Mobile Card List View (< md) - Compact 2-Tier Product Row */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredInventory.length === 0 ? (
                  <div className="p-6 text-center flex flex-col items-center justify-center">
                    <Package className="w-8 h-8 text-slate-300 mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">No Inventory Found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search or category filters.</p>
                  </div>
                ) : (
                  filteredInventory.map((prod) => {
                    const profitPerUnit = Number(prod.sellingPrice) - Number(prod.costPrice);
                    const isLow = Number(prod.stock) <= Number(prod.minStock);
                    return (
                      <div key={`m_${prod.id}`} className="p-2.5 sm:p-3 flex flex-col gap-1.5 hover:bg-slate-50/50 transition">
                        {/* Top Line: Name, SKU, Category, Stock Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate leading-snug">{prod.name}</h4>
                              <span className="font-mono bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.2 rounded shrink-0">{prod.sku}</span>
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                              <span>{prod.category}</span>
                              {prod.supplier && (
                                <>
                                  <span>&bull;</span>
                                  <span className="truncate">{prod.supplier}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {prod.stock} {prod.unit}
                            </span>
                            {isLow && <div className="text-[9px] text-rose-600 font-bold mt-0.5">Low Stock</div>}
                          </div>
                        </div>

                        {/* Bottom Line: Prices, Margin & Action Buttons */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <div>
                              <span className="text-[10px] text-slate-400">Sell: </span>
                              <strong className="text-slate-900 font-bold">{formatRs(prod.sellingPrice)}</strong>
                            </div>
                            <span className="text-slate-200">|</span>
                            <div>
                              <span className="text-[10px] text-slate-400">Cost: </span>
                              <span className="text-slate-600">{formatRs(prod.costPrice)}</span>
                            </div>
                            <span className="text-slate-200">|</span>
                            <div className="font-semibold text-emerald-600">
                              +{formatRs(profitPerUnit)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setRestockModalProduct(prod);
                                setRestockQty('10');
                                setRestockNewCost(prod.costPrice);
                                setRestockNewSelling(prod.sellingPrice);
                              }}
                              className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold transition shadow-xs"
                            >
                              + Restock
                            </button>
                            <button
                              onClick={() => openEditProductModal(prod)}
                              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600"
                              title="Edit"
                              aria-label="Edit product"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod)}
                              className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600"
                              title="Delete"
                              aria-label="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                      <th className="py-3.5 px-4">Product & SKU</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Cost Rate</th>
                      <th className="py-3.5 px-4">Retail Price</th>
                      <th className="py-3.5 px-4">Margin</th>
                      <th className="py-3.5 px-4">Stock Level</th>
                      <th className="py-3.5 px-4">Expiry Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 px-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                              <Package className="w-6 h-6" />
                            </div>
                            {products.length === 0 ? (
                              <>
                                <h4 className="font-bold text-slate-800 text-sm">Inventory is Empty</h4>
                                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                                  There are no products stored yet. Add a new product, sync with your Google Sheet database, or load the starter pack.
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-2.5">
                                  <button
                                    onClick={openAddProductModal}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add Product
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (getStoredSheetsUrl()) {
                                        handleSyncAllFromSheets();
                                      } else {
                                        setActiveTab('settings');
                                      }
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5" /> Sync Database
                                  </button>
                                  <button
                                    onClick={loadStarterPack}
                                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 border border-slate-300"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Starter Pack
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <h4 className="font-bold text-slate-800 text-sm">No Matching Items</h4>
                                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-3">
                                  Try adjusting your search query or filter selection.
                                </p>
                                <button
                                  onClick={() => {
                                    setInvSearch('');
                                    setInvCategory('All');
                                    setInvStatusFilter('ALL');
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                                >
                                  Clear Inventory Filters
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredInventory.map((prod) => {
                        const profitPerUnit = Number(prod.sellingPrice) - Number(prod.costPrice);
                        const marginPct =
                          Number(prod.sellingPrice) > 0
                            ? Math.round((profitPerUnit / Number(prod.sellingPrice)) * 100)
                            : 0;
                        const isLow = Number(prod.stock) <= Number(prod.minStock);
                        const daysToExpiry = prod.expiryDate
                          ? Math.ceil(
                            (new Date(prod.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
                          )
                          : null;

                        return (
                          <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{prod.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {prod.sku} • {prod.supplier || 'Direct'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                                {prod.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-600">
                              {formatRs(prod.costPrice)} / {prod.unit}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {formatRs(prod.sellingPrice)} / {prod.unit}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-emerald-700 font-bold">
                                +{formatRs(profitPerUnit)}
                              </span>
                              <span className="text-[11px] text-slate-400 ml-1">({marginPct}%)</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-bold text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'
                                    }`}
                                >
                                  {prod.stock} {prod.unit}
                                </span>
                                {isLow && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-full">
                                    Low
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Min Alert: {prod.minStock} {prod.unit}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {daysToExpiry !== null ? (
                                <div>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${daysToExpiry <= 0
                                      ? 'bg-rose-100 text-rose-700'
                                      : daysToExpiry <= 30
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-50 text-emerald-700'
                                      }`}
                                  >
                                    {daysToExpiry <= 0
                                      ? 'Expired'
                                      : daysToExpiry <= 30
                                        ? `${daysToExpiry}d left`
                                        : prod.expiryDate}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setRestockModalProduct(prod);
                                    setRestockQty('10');
                                    setRestockNewCost(prod.costPrice);
                                    setRestockNewSelling(prod.sellingPrice);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-semibold border border-emerald-200 transition"
                                >
                                  + Restock
                                </button>
                                <button
                                  onClick={() => openEditProductModal(prod)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  title="Edit Product"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODULE 4: CUSTOMER KHATA (CREDIT LEDGER)
        ========================================== */}
        {activeTab === 'khata' && (
          <div className="p-3 sm:p-4 lg:p-6 space-y-3.5 sm:space-y-6">
            {/* Top Summary Banner */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Pending Udhaar
                </span>
                <div className="text-base sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1 truncate">
                  {formatRs(metrics.totalKhataReceivable)}
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                  {customers.filter((c) => c.balance > 0).length} active accounts
                </p>
              </div>

              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Cash Recovered
                </span>
                <div className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 truncate">
                  {formatRs(
                    customers.reduce((acc, c) => acc + (Number(c.totalPaid) || 0), 0)
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                  Total credit settled
                </p>
              </div>

              <div className="col-span-2 lg:col-span-1 bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-row lg:flex-col items-center lg:items-stretch justify-between gap-2">
                <div>
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total Credit Issued
                  </span>
                  <div className="text-sm sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1 truncate">
                    {formatRs(
                      customers.reduce((acc, c) => acc + (Number(c.totalCredit) || 0), 0)
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setCustomerModalOpen(true)}
                  className="px-3 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> <span className="truncate">New Customer</span>
                </button>
              </div>
            </div>

            {/* Split View: Customer List & Detailed Ledger History */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
              {/* Customer Directory List */}
              <div className={`lg:col-span-5 bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col ${selectedKhataCustomer ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-2.5 sm:p-4 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={khataSearch}
                      onChange={(e) => setKhataSearch(e.target.value)}
                      placeholder="Search customer by Name, Phone, Street..."
                      className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-300 rounded-lg sm:rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-6 text-center flex flex-col items-center justify-center">
                      <Users className="w-8 h-8 text-slate-300 mb-1.5" />
                      <p className="text-xs font-bold text-slate-700">No Customers in Khata Ledger</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 mb-2.5">
                        Register a customer to track credit sales and cash recovery.
                      </p>
                      <button
                        onClick={() => setCustomerModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Customer
                      </button>
                    </div>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const isSelected = selectedKhataCustomer?.id === cust.id;
                      return (
                        <div
                          key={cust.id}
                          onClick={() => setSelectedKhataCustomer(cust)}
                          className={`p-2.5 sm:p-3.5 cursor-pointer transition flex items-center justify-between gap-2.5 hover:bg-slate-50/70 ${isSelected
                            ? 'bg-emerald-50/90 border-l-4 border-emerald-600'
                            : ''
                            }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{cust.name}</div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                              <span className="flex items-center gap-1 shrink-0">
                                <Phone className="w-3 h-3 text-slate-400" /> {cust.phone}
                              </span>
                              {cust.address && (
                                <>
                                  <span>&bull;</span>
                                  <span className="truncate">{cust.address}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end">
                            <div
                              className={`text-xs sm:text-sm font-black whitespace-nowrap ${cust.balance > 0 ? 'text-amber-600' : 'text-emerald-600'
                                }`}
                            >
                              {cust.balance > 0 ? formatRs(cust.balance) : 'Cleared'}
                            </div>
                            {cust.balance > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReceivePaymentCustomer(cust);
                                  setPaymentAmountInput(String(cust.balance));
                                }}
                                className="mt-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-xs transition"
                              >
                                Receive Cash
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Customer Statement / Ledger History */}
              <div className={`lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col ${!selectedKhataCustomer ? 'hidden lg:flex' : 'flex'}`}>
                {selectedKhataCustomer ? (
                  <>
                    <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-t-2xl">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedKhataCustomer(null)}
                          className="lg:hidden p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition shrink-0"
                          title="Back to Customers"
                          aria-label="Back to Customer List"
                        >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                        </button>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {selectedKhataCustomer.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Phone: {selectedKhataCustomer.phone} • Address:{' '}
                            {selectedKhataCustomer.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 uppercase font-bold">
                            Current Balance Due
                          </span>
                          <div className="text-xl font-extrabold text-amber-600">
                            {formatRs(selectedKhataCustomer.balance)}
                          </div>
                        </div>

                        {selectedKhataCustomer.balance > 0 && (
                          <button
                            onClick={() => {
                              setReceivePaymentCustomer(selectedKhataCustomer);
                              setPaymentAmountInput(String(selectedKhataCustomer.balance));
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm"
                          >
                            + Receive Payment
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-5 flex-1 overflow-y-auto">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        Complete Khata Statement (Credit Sales vs Payments)
                      </h4>
                      <div className="space-y-2.5">
                        {(selectedKhataCustomer.ledger || [])
                          .slice()
                          .reverse()
                          .map((entry) => (
                            <div
                              key={entry.id}
                              className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between bg-white"
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`p-2 rounded-xl mt-0.5 ${entry.type === 'CREDIT_SALE'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                >
                                  {entry.type === 'CREDIT_SALE' ? (
                                    <ArrowUpRight className="w-4 h-4" />
                                  ) : (
                                    <ArrowDownRight className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                    <span>
                                      {entry.type === 'CREDIT_SALE'
                                        ? 'Credit Purchase (Udhaar)'
                                        : 'Payment Received (Wasooli)'}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-400">
                                      #{entry.invoiceNo}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-600 mt-0.5">{entry.notes}</div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {entry.date}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div
                                  className={`text-sm font-extrabold ${entry.type === 'CREDIT_SALE'
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                    }`}
                                >
                                  {entry.type === 'CREDIT_SALE' ? '+' : '-'}
                                  {formatRs(entry.amount)}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Bal: {formatRs(entry.balanceAfter)}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-96 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
                    <h4 className="font-bold text-slate-700 text-sm">
                      Select a Customer to View Khata Ledger
                    </h4>
                    <p className="text-xs max-w-sm mt-1">
                      Click on any customer from the left list to inspect their itemized Udhaar bills and cash payment history.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODULE 5: SUPPLIERS & EXPENSES
        ========================================== */}
        {activeTab === 'suppliers' && (
          <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              {/* Wholesale Suppliers / Distributors */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col">
                <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                      <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Wholesale Suppliers & Distributors</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Payables: <strong className="text-rose-600">{formatRs(metrics.totalSupplierPayable)}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setSupplierModalOpen(true)}
                    className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span className="truncate">Add Supplier</span>
                  </button>
                </div>

                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-[500px] overflow-y-auto">
                  {suppliers.length === 0 ? (
                    <div className="text-center py-6 sm:py-10 flex flex-col items-center justify-center">
                      <Truck className="w-8 h-8 text-slate-300 mb-1.5" />
                      <p className="text-xs font-bold text-slate-700">No Suppliers Listed</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 mb-2.5">Add wholesale vendors to track trade payables and shipments.</p>
                      <button
                        onClick={() => setSupplierModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add First Supplier
                      </button>
                    </div>
                  ) : (
                    suppliers.map((sup) => (
                      <div
                        key={sup.id}
                        className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">{sup.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-medium shrink-0">
                              {sup.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                            Contact: <strong>{sup.contactPerson}</strong> ({sup.phone})
                          </div>
                          {sup.notes && (
                            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">{sup.notes}</div>
                          )}
                        </div>

                        <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                          <div className="text-left sm:text-right">
                            <div className="text-[9px] uppercase font-bold text-slate-400">
                              Payable Due
                            </div>
                            <div className="text-xs sm:text-sm font-black text-rose-600">
                              {formatRs(sup.payableBalance)}
                            </div>
                          </div>
                          {Number(sup.payableBalance) > 0 && (
                            <button
                              onClick={() => {
                                setPaySupplierModal(sup);
                                setSupplierPayAmount(String(sup.payableBalance));
                              }}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold shadow-xs transition"
                            >
                              Pay Due
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Daily Operating Expenses Tracker */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col">
                <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                      <Wallet className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Operating Expenses</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Total: <strong className="text-slate-900">{formatRs(metrics.totalExpenses)}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setExpenseModalOpen(true)}
                    className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span className="truncate">Log Expense</span>
                  </button>
                </div>

                <div className="p-3 sm:p-4 space-y-2 sm:space-y-2.5 max-h-[500px] overflow-y-auto">
                  {expenses.length === 0 ? (
                    <div className="text-center py-6 sm:py-10 flex flex-col items-center justify-center">
                      <Wallet className="w-8 h-8 text-slate-300 mb-1.5" />
                      <p className="text-xs font-bold text-slate-700">No Expenses Recorded</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 mb-2.5">Track shop rent, electricity, wages, and freight.</p>
                      <button
                        onClick={() => setExpenseModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Log First Expense
                      </button>
                    </div>
                  ) : (
                    expenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-xs truncate">{exp.title}</div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-medium shrink-0">
                              {exp.category}
                            </span>
                            <span>• {exp.date}</span>
                            {exp.notes && <span className="truncate">• {exp.notes}</span>}
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm font-black text-rose-600 whitespace-nowrap shrink-0">
                          -{formatRs(exp.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODULE 6: SALES & FINANCIAL REPORTS (P&L)
        ========================================== */}
        {activeTab === 'reports' && (
          <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-6">
            {/* Profit & Loss Statement Summary - 2 col on mobile */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-5">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm mb-2.5 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                <FileBarChart className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                <span>Store Profit & Loss (P&L) Financial Breakdown</span>
              </h3>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3.5">
                <div className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium">Gross Revenue</div>
                  <div className="text-xs sm:text-lg font-black text-slate-900 mt-0.5 sm:mt-1 truncate">
                    {formatRs(metrics.totalRevenue)}
                  </div>
                </div>
                <div className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium">Cost of Goods (COGS)</div>
                  <div className="text-xs sm:text-lg font-black text-slate-700 mt-0.5 sm:mt-1 truncate">
                    -{formatRs(metrics.totalCOGS)}
                  </div>
                </div>
                <div className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                  <div className="text-[10px] sm:text-xs text-emerald-800 font-medium">Gross Profit</div>
                  <div className="text-xs sm:text-lg font-black text-emerald-700 mt-0.5 sm:mt-1 truncate">
                    {formatRs(metrics.totalGrossProfit)}
                  </div>
                </div>
                <div className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between">
                  <div className="text-[10px] sm:text-xs text-rose-800 font-medium">Shop Expenses</div>
                  <div className="text-xs sm:text-lg font-black text-rose-600 mt-0.5 sm:mt-1 truncate">
                    -{formatRs(metrics.totalExpenses)}
                  </div>
                </div>
                <div className="col-span-2 lg:col-span-1 p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-slate-900 text-white flex flex-col justify-between">
                  <div className="text-[10px] sm:text-xs text-emerald-400 font-bold uppercase tracking-wider">True Net Profit</div>
                  <div className="text-sm sm:text-xl font-black text-white mt-0.5 sm:mt-1 truncate">
                    {formatRs(metrics.totalNetProfit)}
                  </div>
                </div>
              </div>
            </div>

            {/* Filterable Invoice History */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  POS Invoices & Billing History ({filteredSales.length})
                </h3>

                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={reportFilterDate}
                    onChange={(e) => setReportFilterDate(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="ALL">All Dates</option>
                    <option value="TODAY">Today Only</option>
                  </select>

                  <select
                    value={reportPaymentFilter}
                    onChange={(e) => setReportPaymentFilter(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="ALL">All Payments</option>
                    <option value="Cash">Cash Sales</option>
                    <option value="Khata">Khata (Udhaar)</option>
                    <option value="Digital Wallet">Digital Wallet</option>
                  </select>
                </div>
              </div>

              {/* Mobile Invoice Card View (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredSales.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No invoices match your selected filters.
                  </div>
                ) : (
                  filteredSales.map((sale) => (
                    <div key={`m_sale_${sale.id}`} className="p-2.5 sm:p-3.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                            <span className="truncate">{sale.invoiceNo}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold shrink-0 ${
                              sale.paymentMode === 'Cash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sale.paymentMode === 'Khata'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {sale.paymentMode}
                            </span>
                            {sale.status === 'VOIDED' && (
                              <span className="px-1.5 py-0.2 text-[9px] bg-rose-100 text-rose-700 rounded-full font-bold shrink-0">
                                VOIDED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {sale.customerName} &bull; {(sale.items || []).length} items
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-xs sm:text-sm text-slate-900">{formatRs(sale.grandTotal)}</div>
                          <div className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold">+{formatRs(sale.grossProfit)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100/70">
                        <span className="text-[10px] sm:text-[11px] text-slate-400">
                          {new Date(sale.timestamp).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setActiveReceipt(sale)}
                            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 active:scale-95"
                          >
                            <Printer className="w-3 h-3" /> Slip
                          </button>
                          {sale.status !== 'VOIDED' && (
                            <button
                              onClick={() => handleVoidSale(sale)}
                              className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold active:scale-95"
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Invoices Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                      <th className="py-3.5 px-4">Invoice #</th>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Items</th>
                      <th className="py-3.5 px-4">Payment Mode</th>
                      <th className="py-3.5 px-4">Bill Total</th>
                      <th className="py-3.5 px-4">Gross Profit</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 px-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Receipt className="w-10 h-10 text-slate-300 mb-2" />
                            <h4 className="font-bold text-slate-800 text-sm">No Invoices Found</h4>
                            <p className="text-xs text-slate-500 max-w-sm mt-1">
                              {sales.length === 0
                                ? 'No customer billing transactions recorded yet. Complete transactions in POS Terminal to view sales.'
                                : 'No invoices match the selected date or payment mode filters.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale) => (
                        <tr
                          key={sale.id}
                          className={`hover:bg-slate-50 ${sale.status === 'VOIDED' ? 'opacity-50 bg-rose-50/30' : ''
                            }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {sale.invoiceNo}
                            {sale.status === 'VOIDED' && (
                              <span className="ml-2 px-2 py-0.5 text-[10px] bg-rose-100 text-rose-700 rounded-full">
                                VOIDED
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {new Date(sale.timestamp).toLocaleString('en-PK', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800">
                            {sale.customerName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {(sale.items || []).length} items
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${sale.paymentMode === 'Cash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sale.paymentMode === 'Khata'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-indigo-100 text-indigo-800'
                                }`}
                            >
                              {sale.paymentMode}
                              {sale.walletProvider ? ` (${sale.walletProvider})` : ''}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">
                            {formatRs(sale.grandTotal)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-700">
                            {formatRs(sale.grossProfit)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setActiveReceipt(sale)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1"
                              >
                                <Printer className="w-3.5 h-3.5" /> Receipt
                              </button>
                              {sale.status !== 'VOIDED' && (
                                <button
                                  onClick={() => handleVoidSale(sale)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 font-semibold flex items-center gap-1 transition"
                                  title="Return / Void Invoice & Restore Stock"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Void
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Store Settings & Cloud Database Configuration */}
        {activeTab === 'settings' && (
          <StoreSettingsTab
            storeInfo={storeInfo}
            setStoreInfo={setStoreInfo}
            showToast={showToast}
            hasGoogleSheetsUrl={hasGoogleSheetsUrl}
            setHasGoogleSheetsUrl={setHasGoogleSheetsUrl}
            onSyncAll={handleSyncAllFromSheets}
            onBulkUpload={handleBulkUploadToSheets}
            onLoadStarterPack={loadStarterPack}
            onResetDatabase={() => seedDatabase(true)}
          />
        )}
      </main>

      {/* ==========================================
          MODAL 1: 80MM THERMAL RECEIPT PREVIEW
      ========================================== */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Modal Controls (Hidden when printing) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">80mm Thermal Receipt Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Slip
                </button>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable 80mm Receipt Area */}
            <div className="p-6 font-mono text-xs text-slate-900 space-y-3 bg-white">
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <h2 className="text-base font-extrabold uppercase tracking-tight">
                  {storeInfo.name}
                </h2>
                <p className="text-[11px] text-slate-600">{storeInfo.tagline}</p>
                <p className="text-[11px] text-slate-600">{storeInfo.address}</p>
                <p className="text-[11px] text-slate-600">Tel: {storeInfo.phone}</p>
              </div>

              <div className="border-b border-dashed border-slate-400 pb-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Invoice No:</span>
                  <span className="font-bold">{activeReceipt.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>
                    {new Date(activeReceipt.timestamp).toLocaleString('en-PK', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold">{activeReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Mode:</span>
                  <span className="font-bold">
                    {activeReceipt.paymentMode}
                    {activeReceipt.walletProvider ? ` (${activeReceipt.walletProvider})` : ''}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-[11px] border-b border-dashed border-slate-400 pb-2">
                <thead>
                  <tr className="border-b border-slate-300 text-left">
                    <th className="pb-1">Item</th>
                    <th className="pb-1 text-center">Qty</th>
                    <th className="pb-1 text-right">Rate</th>
                    <th className="pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeReceipt.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 pr-2 font-semibold">{item.name}</td>
                      <td className="py-1.5 text-center">
                        {item.qty}
                        {item.unit}
                      </td>
                      <td className="py-1.5 text-right">{item.sellingPrice}</td>
                      <td className="py-1.5 text-right font-bold">{item.lineTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bill Totals */}
              <div className="space-y-1 text-xs border-b border-dashed border-slate-400 pb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatRs(activeReceipt.subtotal)}</span>
                </div>
                {Number(activeReceipt.billDiscount) > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatRs(activeReceipt.billDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold pt-1">
                  <span>GRAND TOTAL:</span>
                  <span>{formatRs(activeReceipt.grandTotal)}</span>
                </div>

                {activeReceipt.paymentMode === 'Cash' && (
                  <>
                    <div className="flex justify-between text-[11px] pt-1">
                      <span>Cash Received:</span>
                      <span>{formatRs(activeReceipt.cashReceived)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold">
                      <span>Change Returned:</span>
                      <span>{formatRs(activeReceipt.changeDue)}</span>
                    </div>
                  </>
                )}

                {activeReceipt.paymentMode === 'Khata' &&
                  activeReceipt.newKhataBalance !== null && (
                    <div className="mt-2 p-2 bg-slate-100 rounded space-y-0.5 text-[11px]">
                      <div className="flex justify-between">
                        <span>Previous Khata Balance:</span>
                        <span>{formatRs(activeReceipt.previousKhataBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Credit Bill:</span>
                        <span>+{formatRs(activeReceipt.grandTotal)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-slate-300 pt-0.5">
                        <span>Updated Khata Balance:</span>
                        <span>{formatRs(activeReceipt.newKhataBalance)}</span>
                      </div>
                    </div>
                  )}
              </div>

              <div className="text-center pt-1 space-y-1">
                <div className="flex justify-center">
                  <Barcode className="w-28 h-8 text-slate-800" />
                </div>
                <p className="text-[11px] font-bold">
                  {storeInfo.receiptFooter || `Thank You For Shopping At ${storeInfo.name}!`}
                </p>
                <p className="text-[10px] text-slate-500">
                  No exchange without receipt within 3 days.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: ADD / EDIT PRODUCT MODAL
      ========================================== */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Grocery Product'}
              </h3>
              <button
                onClick={() => setProductModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. Super Kernel Basmati Rice"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SKU / Barcode</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setProductForm({
                          ...productForm,
                          sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`
                        })
                      }
                      className="px-2 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300"
                      title="Auto-generate SKU"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Selling Unit (Loose or Discrete)
                  </label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="kg">kg (Loose Weight)</option>
                    <option value="liter">liter (Loose Volume)</option>
                    <option value="pack">pack (Discrete Packet/Bag)</option>
                    <option value="pc">pc (Single Piece/Bar)</option>
                    <option value="bottle">bottle (Bottle)</option>
                    <option value="carton">carton (Wholesale Carton)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Purchase Cost (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    placeholder="260"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Retail Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    value={productForm.sellingPrice}
                    onChange={(e) =>
                      setProductForm({ ...productForm, sellingPrice: e.target.value })
                    }
                    placeholder="310"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-emerald-700"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[11px] text-slate-500 font-medium">Profit / Unit:</span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {formatRs(
                      (Number(productForm.sellingPrice) || 0) -
                      (Number(productForm.costPrice) || 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Current Stock Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="50"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Low Stock Alert Level
                  </label>
                  <input
                    type="number"
                    value={productForm.minStock}
                    onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={productForm.supplier}
                    onChange={(e) => setProductForm({ ...productForm, supplier: e.target.value })}
                    placeholder="Wholesale Distributor"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch Expiry Date</label>
                  <input
                    type="date"
                    value={productForm.expiryDate}
                    onChange={(e) =>
                      setProductForm({ ...productForm, expiryDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: QUICK RESTOCK / ADJUST STOCK
      ========================================== */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Restock: {restockModalProduct.name}</h3>
              <button
                onClick={() => setRestockModalProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmRestock} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                <span>Current Available Stock:</span>
                <strong className="text-slate-900">
                  {restockModalProduct.stock} {restockModalProduct.unit}
                </strong>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Incoming Quantity to Add ({restockModalProduct.unit}) *
                </label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Updated Cost Rate (Rs.)
                  </label>
                  <input
                    type="number"
                    value={restockNewCost}
                    onChange={(e) => setRestockNewCost(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Updated Retail Price (Rs.)
                  </label>
                  <input
                    type="number"
                    value={restockNewSelling}
                    onChange={(e) => setRestockNewSelling(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalProduct(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Confirm Stock Arrival
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 4: RECEIVE KHATA PAYMENT MODAL
      ========================================== */}
      {receivePaymentCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                Receive Khata Payment — {receivePaymentCustomer.name}
              </h3>
              <button
                onClick={() => setReceivePaymentCustomer(null)}
                className="text-emerald-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReceiveKhataPayment} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex justify-between items-center">
                <span className="text-amber-900 font-medium">Total Outstanding Udhaar:</span>
                <span className="text-base font-extrabold text-amber-700">
                  {formatRs(receivePaymentCustomer.balance)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cash Received Amount (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base font-extrabold text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Notes</label>
                <input
                  type="text"
                  value={paymentNotesInput}
                  onChange={(e) => setPaymentNotesInput(e.target.value)}
                  placeholder="e.g. Cash received at shop counter / EasyPaisa"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReceivePaymentCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Payment & Deduct Khata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 5: REGISTER NEW KHATA CUSTOMER
      ========================================== */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Register Neighborhood Khata Customer</h3>
              <button
                onClick={() => setCustomerModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, name: e.target.value })
                  }
                  placeholder="e.g. Haji Muhammad Tariq"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone / WhatsApp Number</label>
                <input
                  type="text"
                  value={newCustomerForm.phone}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })
                  }
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  House / Street / Mohallah Address
                </label>
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, address: e.target.value })
                  }
                  placeholder="Street 4, Near Main Masjid"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Previous Opening Khata Balance (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newCustomerForm.openingBalance}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, openingBalance: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Create Khata Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 6: LOG DAILY STORE EXPENSE
      ========================================== */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Log Store Operating Expense</h3>
              <button
                onClick={() => setExpenseModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="e.g. Shop Electricity Bill / Loader Rickshaw Fare"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="500"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    placeholder="Optional details"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 7: ADD SUPPLIER & PAY SUPPLIER
      ========================================== */}
      {supplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add Wholesale Distributor / Supplier</h3>
              <button
                onClick={() => setSupplierModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Agency Name *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g. Khyber Grain Traders"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, contactPerson: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Category</label>
                  <select
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Payable Balance (Rs.)
                  </label>
                  <input
                    type="number"
                    value={supplierForm.payableBalance}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, payableBalance: e.target.value })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paySupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Record Payment to {paySupplierModal.name}</h3>
              <button
                onClick={() => setPaySupplierModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePaySupplier} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex justify-between">
                <span>Current Payable Balance:</span>
                <strong className="text-rose-700">{formatRs(paySupplierModal.payableBalance)}</strong>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Amount Paid to Supplier (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={supplierPayAmount}
                  onChange={(e) => setSupplierPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaySupplierModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}