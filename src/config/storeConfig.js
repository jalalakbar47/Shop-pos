// ============================================================================
// Store Configuration Helper (Multi-Store / White-label Support)
// ============================================================================

const STORE_INFO_KEY = 'pos_store_profile';

export const getDefaultStoreInfo = () => ({
  name: import.meta.env.VITE_STORE_NAME || 'Retail Store POS',
  tagline: import.meta.env.VITE_STORE_TAGLINE || 'Point of Sale & Inventory Management',
  phone: import.meta.env.VITE_STORE_PHONE || '0300-1234567',
  address: import.meta.env.VITE_STORE_ADDRESS || 'Shop #1, Main Commercial Market',
  currency: import.meta.env.VITE_CURRENCY_SYMBOL || 'Rs.',
  receiptFooter: import.meta.env.VITE_RECEIPT_FOOTER || 'Thank You For Shopping With Us!'
});

export const getStoreInfo = () => {
  try {
    const raw = localStorage.getItem(STORE_INFO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...getDefaultStoreInfo(), ...parsed };
    }
  } catch (e) {
    console.warn('Error reading store info:', e);
  }
  return getDefaultStoreInfo();
};

export const saveStoreInfo = (info) => {
  try {
    localStorage.setItem(STORE_INFO_KEY, JSON.stringify(info));
  } catch (e) {
    console.warn('Error saving store info:', e);
  }
};

export const formatCurrency = (amount, symbol = 'Rs.') => {
  const num = Number(amount) || 0;
  return `${symbol} ${num.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};
