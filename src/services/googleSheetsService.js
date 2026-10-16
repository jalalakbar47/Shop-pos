// ============================================================================
// Google Sheets Database & Authentication Service for Atta Tuck Shop Pos
// ============================================================================

const SHEETS_URL_KEY = 'atta_pos_sheets_url';
const LOCAL_USERS_KEY = 'atta_pos_local_users';
const CURRENT_USER_KEY = 'atta_pos_current_user';

// Complete Google Apps Script template for the user's Google Sheet
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =======================================================================
 * UNIVERSAL COMMERCIAL POS - GOOGLE APPS SCRIPT DATABASE & AUTH BACKEND
 * =======================================================================
 * INSTRUCTIONS:
 * 1. Open your Google Sheet (e.g. named "My Store POS Database").
 * 2. In the top menu, click Extensions > Apps Script.
 * 3. Delete any code in the editor and PASTE this entire script.
 * 4. Click Save (floppy disk icon).
 * 5. Click "Deploy" (top right) > "New deployment".
 * 6. Select type: "Web app" (click gear icon next to Select type).
 * 7. Configuration:
 *    - Description: "Store POS Web API"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone" (allows the POS app to sync)
 * 8. Click "Deploy", authorize permissions when prompted, and COPY the Web App URL.
 * 9. Paste the URL into the "Store Settings" or .env (VITE_GOOGLE_SHEETS_URL).
 * =======================================================================
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureAllSheets(ss);

    var params = {};
    if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else if (e && e.parameter) {
      params = e.parameter;
    }

    var action = params.action || 'ping';
    var response = { success: false, action: action };

    switch (action) {
      case 'ping':
        response = {
          success: true,
          message: 'Connected to Atta Tuck Shop Pos DB successfully!',
          sheetName: ss.getName(),
          timestamp: new Date().toISOString()
        };
        break;

      case 'register':
        response = handleRegister(ss, params);
        break;

      case 'login':
        response = handleLogin(ss, params);
        break;

      case 'getAllData':
        response = handleGetAllData(ss);
        break;

      case 'saveProduct':
        response = handleSaveProduct(ss, params.product);
        break;

      case 'deleteProduct':
        response = handleDeleteProduct(ss, params.productId);
        break;

      case 'saveCustomer':
        response = handleSaveCustomer(ss, params.customer);
        break;

      case 'recordKhataPayment':
        response = handleRecordKhataPayment(ss, params);
        break;

      case 'saveSupplier':
        response = handleSaveSupplier(ss, params.supplier);
        break;

      case 'paySupplier':
        response = handlePaySupplier(ss, params);
        break;

      case 'saveExpense':
        response = handleSaveExpense(ss, params.expense);
        break;

      case 'recordSale':
        response = handleRecordSale(ss, params.sale);
        break;

      case 'voidSale':
        response = handleVoidSale(ss, params.sale);
        break;

      case 'bulkUpload':
        response = handleBulkUpload(ss, params);
        break;

      default:
        response = { success: false, error: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// Sheet Initialization
// -------------------------------------------------------------
function ensureAllSheets(ss) {
  var schemas = {
    'Users': ['id', 'username', 'password', 'fullName', 'role', 'phone', 'createdAt'],
    'Products': ['id', 'name', 'sku', 'category', 'unit', 'costPrice', 'sellingPrice', 'stock', 'minStock', 'supplier', 'expiryDate'],
    'Customers': ['id', 'name', 'phone', 'address', 'balance', 'totalCredit', 'totalPaid', 'ledgerJson'],
    'Suppliers': ['id', 'name', 'contactPerson', 'phone', 'category', 'payableBalance', 'notes', 'lastSupplyDate'],
    'Sales': ['id', 'invoiceNo', 'timestamp', 'dateStr', 'itemsJson', 'subtotal', 'billDiscount', 'grandTotal', 'totalCost', 'grossProfit', 'paymentMode', 'walletProvider', 'cashReceived', 'changeDue', 'customerId', 'customerName', 'status'],
    'Expenses': ['id', 'title', 'category', 'amount', 'date', 'paymentMethod', 'notes']
  };

  for (var name in schemas) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      var headers = schemas[name];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
      sheet.setFrozenRows(1);

      // If Users sheet is newly created, add default Admin user
      if (name === 'Users') {
        sheet.appendRow([
          'usr_admin',
          'admin',
          'admin123',
          'Shop Owner',
          'Admin',
          '0300-1234567',
          new Date().toISOString()
        ]);
      }
    }
  }
}

// -------------------------------------------------------------
// Auth Handlers
// -------------------------------------------------------------
function handleRegister(ss, data) {
  var sheet = ss.getSheetByName('Users');
  var rows = sheet.getDataRange().getValues();
  var username = (data.username || '').toString().trim().toLowerCase();
  var password = (data.password || '').toString().trim();
  var fullName = (data.fullName || data.name || 'Staff Member').toString().trim();
  var role = (data.role || 'Cashier').toString().trim();
  var phone = (data.phone || 'N/A').toString().trim();

  if (!username || !password) {
    return { success: false, error: 'Username and password are required.' };
  }

  for (var i = 1; i < rows.length; i++) {
    if ((rows[i][1] || '').toString().toLowerCase() === username) {
      return { success: false, error: 'Username "' + username + '" already exists.' };
    }
  }

  var id = 'usr_' + new Date().getTime();
  var createdAt = new Date().toISOString();
  sheet.appendRow([id, username, password, fullName, role, phone, createdAt]);

  return {
    success: true,
    user: { id: id, username: username, fullName: fullName, role: role, phone: phone },
    message: 'User registered successfully in Google Sheet!'
  };
}

function handleLogin(ss, data) {
  var sheet = ss.getSheetByName('Users');
  var rows = sheet.getDataRange().getValues();
  var username = (data.username || '').toString().trim().toLowerCase();
  var password = (data.password || '').toString().trim();

  for (var i = 1; i < rows.length; i++) {
    var rowUser = (rows[i][1] || '').toString().trim().toLowerCase();
    var rowPass = (rows[i][2] || '').toString().trim();
    if (rowUser === username) {
      if (rowPass === password) {
        return {
          success: true,
          user: {
            id: rows[i][0],
            username: rows[i][1],
            fullName: rows[i][3],
            role: rows[i][4],
            phone: rows[i][5]
          }
        };
      } else {
        return { success: false, error: 'Incorrect password for user.' };
      }
    }
  }

  return { success: false, error: 'User "' + username + '" not found in Google Sheet.' };
}

// -------------------------------------------------------------
// Data Fetch & Sync
// -------------------------------------------------------------
function handleGetAllData(ss) {
  return {
    success: true,
    products: sheetToObjects(ss.getSheetByName('Products')),
    customers: sheetToObjects(ss.getSheetByName('Customers'), ['ledgerJson']),
    suppliers: sheetToObjects(ss.getSheetByName('Suppliers')),
    sales: sheetToObjects(ss.getSheetByName('Sales'), ['itemsJson']),
    expenses: sheetToObjects(ss.getSheetByName('Expenses'))
  };
}

function sheetToObjects(sheet, jsonFields) {
  if (!sheet) return [];
  jsonFields = jsonFields || [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];
      if (jsonFields.indexOf(key) !== -1) {
        try {
          var cleanKey = key.replace('Json', '');
          obj[cleanKey] = val ? JSON.parse(val) : [];
        } catch (e) {
          obj[cleanKey] = [];
        }
      } else {
        obj[key] = val;
      }
    }
    result.push(obj);
  }
  return result;
}

// -------------------------------------------------------------
// Entities CRUD
// -------------------------------------------------------------
function handleSaveProduct(ss, product) {
  var sheet = ss.getSheetByName('Products');
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == product.id) {
      foundRow = i + 1;
      break;
    }
  }

  var rowVals = [
    product.id,
    product.name,
    product.sku || '',
    product.category || 'General',
    product.unit || 'pc',
    Number(product.costPrice) || 0,
    Number(product.sellingPrice) || 0,
    Number(product.stock) || 0,
    Number(product.minStock) || 5,
    product.supplier || '',
    product.expiryDate || ''
  ];

  if (foundRow > -1) {
    sheet.getRange(foundRow, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    sheet.appendRow(rowVals);
  }

  return { success: true, product: product };
}

function handleDeleteProduct(ss, productId) {
  var sheet = ss.getSheetByName('Products');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == productId) {
      sheet.deleteRow(i + 1);
      return { success: true, productId: productId };
    }
  }
  return { success: false, error: 'Product not found' };
}

function handleSaveCustomer(ss, customer) {
  var sheet = ss.getSheetByName('Customers');
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == customer.id) {
      foundRow = i + 1;
      break;
    }
  }

  var ledgerStr = JSON.stringify(customer.ledger || []);
  var rowVals = [
    customer.id,
    customer.name,
    customer.phone || '',
    customer.address || '',
    Number(customer.balance) || 0,
    Number(customer.totalCredit) || 0,
    Number(customer.totalPaid) || 0,
    ledgerStr
  ];

  if (foundRow > -1) {
    sheet.getRange(foundRow, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    sheet.appendRow(rowVals);
  }

  return { success: true, customer: customer };
}

function handleRecordKhataPayment(ss, data) {
  var sheet = ss.getSheetByName('Customers');
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.customerId) {
      var rowIdx = i + 1;
      var curBal = Number(rows[i][4]) || 0;
      var curPaid = Number(rows[i][6]) || 0;
      var newBal = Math.max(0, curBal - Number(data.amount));
      var newPaid = curPaid + Number(data.amount);

      var ledger = [];
      try {
        ledger = rows[i][7] ? JSON.parse(rows[i][7]) : [];
      } catch (e) {}
      if (data.entry) ledger.push(data.entry);

      sheet.getRange(rowIdx, 5).setValue(newBal);
      sheet.getRange(rowIdx, 7).setValue(newPaid);
      sheet.getRange(rowIdx, 8).setValue(JSON.stringify(ledger));

      return { success: true, newBalance: newBal, totalPaid: newPaid };
    }
  }
  return { success: false, error: 'Customer not found' };
}

function handleSaveSupplier(ss, supplier) {
  var sheet = ss.getSheetByName('Suppliers');
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == supplier.id) {
      foundRow = i + 1;
      break;
    }
  }

  var rowVals = [
    supplier.id,
    supplier.name,
    supplier.contactPerson || '',
    supplier.phone || '',
    supplier.category || '',
    Number(supplier.payableBalance) || 0,
    supplier.notes || '',
    supplier.lastSupplyDate || ''
  ];

  if (foundRow > -1) {
    sheet.getRange(foundRow, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    sheet.appendRow(rowVals);
  }

  return { success: true, supplier: supplier };
}

function handlePaySupplier(ss, data) {
  var sheet = ss.getSheetByName('Suppliers');
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.supplierId) {
      var rowIdx = i + 1;
      sheet.getRange(rowIdx, 6).setValue(Number(data.newPayable) || 0);
      return { success: true, newPayable: data.newPayable };
    }
  }
  return { success: false, error: 'Supplier not found' };
}

function handleSaveExpense(ss, expense) {
  var sheet = ss.getSheetByName('Expenses');
  var rowVals = [
    expense.id,
    expense.title,
    expense.category || '',
    Number(expense.amount) || 0,
    expense.date || '',
    expense.paymentMethod || 'Cash',
    expense.notes || ''
  ];
  sheet.appendRow(rowVals);
  return { success: true, expense: expense };
}

function handleRecordSale(ss, sale) {
  var salesSheet = ss.getSheetByName('Sales');
  var itemsStr = JSON.stringify(sale.items || []);

  var rowVals = [
    sale.id,
    sale.invoiceNo,
    sale.timestamp,
    sale.dateStr,
    itemsStr,
    Number(sale.subtotal) || 0,
    Number(sale.billDiscount) || 0,
    Number(sale.grandTotal) || 0,
    Number(sale.totalCost) || 0,
    Number(sale.grossProfit) || 0,
    sale.paymentMode,
    sale.walletProvider || '',
    Number(sale.cashReceived) || 0,
    Number(sale.changeDue) || 0,
    sale.customerId || '',
    sale.customerName || 'Walk-in Customer',
    sale.status || 'COMPLETED'
  ];
  salesSheet.appendRow(rowVals);

  // Deduct inventory stock in Products sheet
  var prodSheet = ss.getSheetByName('Products');
  var prodData = prodSheet.getDataRange().getValues();
  var items = sale.items || [];

  for (var k = 0; k < items.length; k++) {
    var item = items[k];
    for (var r = 1; r < prodData.length; r++) {
      if (prodData[r][0] == item.productId) {
        var currentStock = Number(prodData[r][7]) || 0;
        var nextStock = Math.max(0, currentStock - Number(item.qty));
        prodSheet.getRange(r + 1, 8).setValue(nextStock);
        break;
      }
    }
  }

  // Update customer balance if Khata
  if (sale.paymentMode === 'Khata' && sale.customerId) {
    var custSheet = ss.getSheetByName('Customers');
    var custData = custSheet.getDataRange().getValues();
    for (var c = 1; c < custData.length; c++) {
      if (custData[c][0] == sale.customerId) {
        var rowC = c + 1;
        var cBal = Number(custData[c][4]) || 0;
        var cCredit = Number(custData[c][5]) || 0;
        var nextBal = cBal + Number(sale.grandTotal);
        var nextCredit = cCredit + Number(sale.grandTotal);

        var cLedger = [];
        try {
          cLedger = custData[c][7] ? JSON.parse(custData[c][7]) : [];
        } catch (e) {}

        cLedger.push({
          id: 'ldg_' + new Date().getTime(),
          date: new Date().toLocaleString(),
          type: 'CREDIT_SALE',
          amount: sale.grandTotal,
          invoiceNo: sale.invoiceNo,
          notes: 'POS Credit Bill',
          balanceAfter: nextBal
        });

        custSheet.getRange(rowC, 5).setValue(nextBal);
        custSheet.getRange(rowC, 6).setValue(nextCredit);
        custSheet.getRange(rowC, 8).setValue(JSON.stringify(cLedger));
        break;
      }
    }
  }

  return { success: true, sale: sale };
}

function handleVoidSale(ss, sale) {
  var salesSheet = ss.getSheetByName('Sales');
  var data = salesSheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == sale.id) {
      salesSheet.getRange(i + 1, 17).setValue('VOIDED');
      break;
    }
  }

  // Restore inventory
  var prodSheet = ss.getSheetByName('Products');
  var prodData = prodSheet.getDataRange().getValues();
  var items = sale.items || [];

  for (var k = 0; k < items.length; k++) {
    var item = items[k];
    for (var r = 1; r < prodData.length; r++) {
      if (prodData[r][0] == item.productId) {
        var curStock = Number(prodData[r][7]) || 0;
        prodSheet.getRange(r + 1, 8).setValue(curStock + Number(item.qty));
        break;
      }
    }
  }

  return { success: true, saleId: sale.id, status: 'VOIDED' };
}

function handleBulkUpload(ss, data) {
  if (data.products && data.products.length) {
    for (var p = 0; p < data.products.length; p++) {
      handleSaveProduct(ss, data.products[p]);
    }
  }
  if (data.customers && data.customers.length) {
    for (var c = 0; c < data.customers.length; c++) {
      handleSaveCustomer(ss, data.customers[c]);
    }
  }
  return { success: true, message: 'Bulk sync completed' };
}
`;

// -------------------------------------------------------------
// Client API Helper Methods
// -------------------------------------------------------------
export const isValidGoogleSheetsUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  return clean.startsWith('https://script.google.com/macros/s/') && clean.length > 40;
};

export const getStoredSheetsUrl = () => {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SHEETS_URL;
  if (envUrl && isValidGoogleSheetsUrl(envUrl)) {
    return envUrl.trim();
  }
  const localUrl = localStorage.getItem(SHEETS_URL_KEY) || '';
  if (localUrl && isValidGoogleSheetsUrl(localUrl)) {
    return localUrl.trim();
  }
  return '';
};

export const setStoredSheetsUrl = (url) => {
  if (url) {
    localStorage.setItem(SHEETS_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(SHEETS_URL_KEY);
  }
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

export const getLocalUsers = () => {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : [
      {
        id: 'usr_default_admin',
        username: 'admin',
        password: '123',
        fullName: 'Atta Shop Owner',
        role: 'Admin',
        phone: '0300-1234567'
      }
    ];
  } catch (e) {
    return [];
  }
};

export const saveLocalUser = (user) => {
  const users = getLocalUsers().filter(u => u.username !== user.username);
  users.push(user);
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

// Generic Post to Google Apps Script
export const callGoogleSheets = async (payload, customUrl = null) => {
  const url = customUrl || getStoredSheetsUrl();
  if (!url) {
    throw new Error('Google Sheets URL is not configured.');
  }

  // Using text/plain prevents CORS preflight triggers in Google Apps Script
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    }
  });

  if (!response.ok) {
    throw new Error(`Google Sheets HTTP error: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success && result.error) {
    throw new Error(result.error);
  }
  return result;
};
