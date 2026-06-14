// ═══════════════════════════════════════════════════════════════
// FINANCE MANAGER PRO - App Logic
// ═══════════════════════════════════════════════════════════════

// Storage Keys
const STORAGE_KEYS = {
  current_month: 'finApp_currentMonth',
  pocket: 'finApp_pocket',
  savings: 'finApp_savings',
  transactions: 'finApp_transactions',
  rent_status: 'finApp_rentStatus',
  budget_base: 'finApp_budgetBase',
  leftover_pocket: 'finApp_leftoverPocket'
};

// Theme Management
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('dark', saved === 'dark');
  updateThemeIcon(saved === 'dark');
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
}

// Initialize App
function initApp() {
  initTheme();
  loadData();
  setupEventListeners();
  updateDisplay();
  setMonthDisplay();
}

// Load Data from LocalStorage
function loadData() {
  const data = {
    currentMonth: localStorage.getItem(STORAGE_KEYS.current_month) || getMonthKey(),
    pocket: parseFloat(localStorage.getItem(STORAGE_KEYS.pocket)) || 0,
    savings: parseFloat(localStorage.getItem(STORAGE_KEYS.savings)) || 0,
    transactions: JSON.parse(localStorage.getItem(STORAGE_KEYS.transactions)) || [],
    rentStatus: localStorage.getItem(STORAGE_KEYS.rent_status) || 'pending',
    budgetBase: parseFloat(localStorage.getItem(STORAGE_KEYS.budget_base)) || 0,
    leftoverPocket: parseFloat(localStorage.getItem(STORAGE_KEYS.leftover_pocket)) || 0
  };
  window.appData = data;
}

// Save Data to LocalStorage
function saveData() {
  localStorage.setItem(STORAGE_KEYS.pocket, window.appData.pocket);
  localStorage.setItem(STORAGE_KEYS.savings, window.appData.savings);
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(window.appData.transactions));
  localStorage.setItem(STORAGE_KEYS.rent_status, window.appData.rentStatus);
  localStorage.setItem(STORAGE_KEYS.current_month, window.appData.currentMonth);
  localStorage.setItem(STORAGE_KEYS.budget_base, window.appData.budgetBase || 0);
  localStorage.setItem(STORAGE_KEYS.leftover_pocket, window.appData.leftoverPocket || 0);
}

// Get Current Month Key (YYYY-MM)
function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Format Currency
function formatCurrency(amount) {
  return Math.max(0, amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

// Set Month Display
function setMonthDisplay() {
  const now = new Date();
  const options = { month: 'long', year: 'numeric' };
  document.getElementById('monthDisplay').textContent = now.toLocaleDateString('en-IN', options);
}

// Update UI Display
function updateDisplay() {
  document.getElementById('pocketDisplay').textContent = formatCurrency(window.appData.pocket);
  document.getElementById('savingsDisplay').textContent = formatCurrency(window.appData.savings);
  updateRentStatus();
  updateTransactionHistory();
  updateBudgetGuide();
}

// Update Budget Guide (stable base: only grows on income)
function updateBudgetGuide() {
  const base = Math.max(0, window.appData.budgetBase || 0);
  const savePct = 0.2, needsPct = 0.5, funPct = 0.3;
  const saveAmt = Math.round(base * savePct);
  const needsAmt = Math.round(base * needsPct);
  const funAmt = base - saveAmt - needsAmt;

  const elBase = document.getElementById('splitBase');
  const elSave = document.getElementById('splitSave');
  const elNeeds = document.getElementById('splitNeeds');
  const elFun = document.getElementById('splitFun');

  if (elBase) elBase.textContent = base;
  if (elSave) elSave.textContent = saveAmt;
  if (elNeeds) elNeeds.textContent = needsAmt;
  if (elFun) elFun.textContent = funAmt;

  const barSave = document.querySelector('.bar-fill.bar-save');
  const barNeeds = document.querySelector('.bar-fill.bar-needs');
  const barFun = document.querySelector('.bar-fill.bar-fun');

  if (barSave) barSave.style.width = `${savePct * 100}%`;
  if (barNeeds) barNeeds.style.width = `${needsPct * 100}%`;
  if (barFun) barFun.style.width = `${funPct * 100}%`;
}

// Update Rent Status
function updateRentStatus() {
  const rentCard = document.getElementById('rentCard');
  const rentStatusText = document.getElementById('rentStatusText');
  const btnRent = document.getElementById('btn-rent');

  if (window.appData.rentStatus === 'paid') {
    rentStatusText.textContent = 'Paid ✓';
    rentStatusText.className = 'rent-status paid';
    btnRent.textContent = 'Mark Unpaid';
  } else {
    rentStatusText.textContent = 'Pending';
    rentStatusText.className = 'rent-status pending';
    btnRent.textContent = 'Mark Paid';
  }
}

// Update Transaction History
function updateTransactionHistory() {
  const historyLog = document.getElementById('historyLog');
  
  if (window.appData.transactions.length === 0) {
    historyLog.innerHTML = '<p style="color:#666;text-align:center;padding:12px">No transactions yet</p>';
    return;
  }

  historyLog.innerHTML = window.appData.transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(tx => {
      const isExpense = tx.type === 'expense';
      const icon = isExpense ? '↓' : '↑';
      const color = isExpense ? '#ef4444' : '#22c55e';
      const sign = isExpense ? '-' : '+';
      
      return `
        <div class="history-item">
          <div class="history-left">
            <span class="history-icon" style="color:${color}">${icon}</span>
            <div class="history-text">
              <p class="history-desc">${tx.description}</p>
              <p class="history-time">${formatDate(tx.date)}</p>
            </div>
          </div>
          <span class="history-amt" style="color:${color}">${sign}₹${formatCurrency(tx.amount)}</span>
        </div>
      `;
    })
    .join('');
}

// Format Date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Add Transaction
function addTransaction(amount, description, type = 'expense') {
  const transaction = {
    amount: Math.abs(amount),
    description,
    type,
    date: new Date().toISOString()
  };
  
  window.appData.transactions.push(transaction);
  
  if (type === 'expense') {
    window.appData.pocket -= amount;
  } else {
    window.appData.pocket += amount;
    // For incomes, grow the stable budget base so the guide only grows on added money
    window.appData.budgetBase = (window.appData.budgetBase || 0) + amount;
  }
  
  window.appData.pocket = Math.max(0, window.appData.pocket);
  saveData();
  updateDisplay();
}

// Quick Spend
function quickSpend(amount, description) {
  if (window.appData.pocket >= amount) {
    addTransaction(amount, description, 'expense');
    showToast(`Spent ₹${formatCurrency(amount)} on ${description}`);
  } else {
    showToast('Insufficient pocket money! 💸', 'error');
  }
}

// Custom Spend
function customSpend() {
  const amount = parseFloat(document.getElementById('customSpendAmount').value);
  const desc = document.getElementById('customSpendDesc').value || 'Custom Expense';
  
  if (!amount || amount <= 0) {
    showToast('Enter valid amount', 'error');
    return;
  }
  
  if (window.appData.pocket >= amount) {
    addTransaction(amount, desc, 'expense');
    document.getElementById('customSpendAmount').value = '';
    document.getElementById('customSpendDesc').value = '';
    showToast(`Spent ₹${formatCurrency(amount)} on ${desc}`);
  } else {
    showToast('Insufficient pocket money! 💸', 'error');
  }
}

// Add Pocket Money
function addPocketMoney() {
  const amount = parseFloat(document.getElementById('customPocketAmount').value);
  
  if (!amount || amount <= 0) {
    showToast('Enter valid amount', 'error');
    return;
  }

  // Ask user whether to include this added pocket money in the stable budget base
  const includeInBudget = confirm('Include this added pocket money in the budget guide (budget base)? Click OK to include, Cancel to treat as pocket-only.');
  const now = new Date().toISOString();

  if (includeInBudget) {
    window.appData.budgetBase = (window.appData.budgetBase || 0) + amount;
    window.appData.pocket += amount;
    window.appData.transactions.push({ amount, description: 'Added Pocket Money (Included in Budget)', type: 'income', date: now });
    showToast(`Added ₹${formatCurrency(amount)} to pocket and budget`);
  } else {
    window.appData.pocket += amount;
    window.appData.transactions.push({ amount, description: 'Added Pocket Money', type: 'income', date: now });
    showToast(`Added ₹${formatCurrency(amount)} to pocket`);
  }

  document.getElementById('customPocketAmount').value = '';
  saveData();
  updateDisplay();
}

// Add Bonus Income (smart allocation)
function addBonus(amount) {
  if (!amount || amount <= 0) {
    showToast('Enter valid amount', 'error');
    return;
  }

  // Smart allocation: 50% to budget base, 30% to savings, 20% to immediate pocket
  const basePortion = Math.round(amount * 0.5);
  const savingsPortion = Math.round(amount * 0.3);
  const pocketPortion = amount - basePortion - savingsPortion;
  const now = new Date().toISOString();

  if (basePortion > 0) {
    window.appData.budgetBase = (window.appData.budgetBase || 0) + basePortion;
    window.appData.transactions.push({ amount: basePortion, description: 'Bonus → Budget Base', type: 'income', date: now });
  }

  if (savingsPortion > 0) {
    window.appData.savings += savingsPortion;
    window.appData.transactions.push({ amount: savingsPortion, description: 'Bonus → Savings', type: 'income', date: now });
  }

  if (pocketPortion > 0) {
    window.appData.pocket += pocketPortion;
    window.appData.transactions.push({ amount: pocketPortion, description: 'Bonus → Pocket', type: 'income', date: now });
  }

  saveData();
  updateDisplay();
  showToast(`Bonus allocated: ₹${formatCurrency(basePortion)} to budget, ₹${formatCurrency(savingsPortion)} to savings, ₹${formatCurrency(pocketPortion)} to pocket`);
}

// Add Custom Bonus
function addCustomBonus() {
  const amount = parseFloat(document.getElementById('customBonusAmount').value);
  
  if (!amount || amount <= 0) {
    showToast('Enter valid amount', 'error');
    return;
  }
  
  addBonus(amount);
  document.getElementById('customBonusAmount').value = '';
}

// Vault: Save to Savings
function saveToVault() {
  const amount = parseFloat(document.getElementById('saveAmount').value);
  
  if (!amount || amount <= 0) {
    showToast('Enter valid amount', 'error');
    return;
  }
  
  if (window.appData.pocket >= amount) {
    window.appData.pocket -= amount;
    window.appData.savings += amount;
    saveData();
    updateDisplay();
    document.getElementById('saveAmount').value = '';
    showToast(`Saved ₹${formatCurrency(amount)} to Vault 🔐`);
  } else {
    showToast('Not enough pocket money!', 'error');
  }
}

// Vault: Withdraw from Savings
function withdrawFromVault() {
  const amount = parseFloat(document.getElementById('withdrawAmount').value);
  
  if (!amount || amount <= 0) {
    showToast('Enter valid amount', 'error');
    return;
  }
  
  if (window.appData.savings >= amount) {
    window.appData.savings -= amount;
    window.appData.pocket += amount;
    saveData();
    updateDisplay();
    document.getElementById('withdrawAmount').value = '';
    showToast(`Withdrawn ₹${formatCurrency(amount)} from Vault 💰`);
  } else {
    showToast('Not enough in vault!', 'error');
  }
}

// Toggle Rent Status
function toggleRentStatus() {
  window.appData.rentStatus = window.appData.rentStatus === 'paid' ? 'pending' : 'paid';
  saveData();
  updateDisplay();
  
  const status = window.appData.rentStatus === 'paid' ? 'Marked as Paid' : 'Marked as Pending';
  showToast(`Rent ${status} ✓`);
}

// Clear History
function clearHistory() {
  if (confirm('Clear all transaction history? This cannot be undone.')) {
    window.appData.transactions = [];
    saveData();
    updateDisplay();
    showToast('Transaction history cleared');
  }
}

// Export as CSV
function exportCSV() {
  if (window.appData.transactions.length === 0) {
    showToast('No transactions to export', 'error');
    return;
  }
  
  let csv = 'Date,Description,Type,Amount\n';
  
  window.appData.transactions.forEach(tx => {
    const date = new Date(tx.date).toLocaleDateString('en-IN');
    csv += `"${date}","${tx.description}","${tx.type}",${tx.amount}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  showToast('CSV exported! 📊');
}

// Reset All Data
function resetAppData() {
  if (confirm('Reset ALL app data? This cannot be undone.')) {
    localStorage.clear();
    window.appData = {
      currentMonth: getMonthKey(),
      pocket: 0,
      savings: 0,
      transactions: [],
      rentStatus: 'pending',
      budgetBase: 0,
      leftoverPocket: 0
    };
    saveData();
    updateDisplay();
    showToast('App data reset');
  }
}

// Show Toast Notification
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 20px;
    border-radius: 8px;
    background: ${type === 'error' ? '#ef4444' : '#22c55e'};
    color: white;
    font-size: 14px;
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Modal: New Month
function openNewMonthModal() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const options = { month: 'long', year: 'numeric' };
  document.getElementById('modalMonthText').textContent = 
    `Start ${nextMonth.toLocaleDateString('en-IN', options)}?`;
  document.getElementById('newMonthModal').style.display = 'flex';
}

function closeNewMonthModal() {
  document.getElementById('newMonthModal').style.display = 'none';
}

function confirmNewMonth() {
  const pocketAmount = parseFloat(document.getElementById('modalPocketAmount').value) || 0;
  const startDate = document.getElementById('modalStartDate').value;
  const previousPocket = window.appData.pocket || 0;
  const now = new Date().toISOString();

  // Reset transactions for the new month (history starts fresh)
  window.appData.transactions = [];

  if (previousPocket > 0) {
    const msg = `You have ₹${formatCurrency(previousPocket)} remaining from the previous month.\n` +
      'OK = Combine previous remaining with the New Month amount and set the budget guide from the combined total.\n' +
      'Cancel = Keep previous month pocket unchanged (saved separately) and use only the New Month Pocket Amount for the new pocket and budget guide.';

    const combine = confirm(msg);

    if (combine) {
      // Combine previous pocket with new month pocket amount
      const totalStart = previousPocket + Math.max(0, pocketAmount);
      window.appData.pocket = totalStart;
      window.appData.budgetBase = totalStart;
      window.appData.leftoverPocket = 0; // cleared because combined
      window.appData.transactions.push({ amount: totalStart, description: 'Starting pocket (carried + new)', type: 'income', date: now });
    } else {
      // Keep previous pocket unchanged and save it separately; start pocket uses only new amount
      window.appData.leftoverPocket = previousPocket;
      window.appData.pocket = Math.max(0, pocketAmount);
      window.appData.budgetBase = Math.max(0, pocketAmount);
      // Do not add a transaction for leftover so history stays focused on the new month
    }
  } else {
    // No previous pocket: behave as before
    window.appData.pocket = Math.max(0, pocketAmount);
    window.appData.budgetBase = Math.max(0, pocketAmount);
  }

  // Reset other month state
  window.appData.rentStatus = 'pending';
  window.appData.currentMonth = getMonthKey();

  saveData();
  updateDisplay();
  closeNewMonthModal();
  showToast('New month started! 🎉');

  // Clear inputs
  document.getElementById('modalPocketAmount').value = '';
  document.getElementById('modalStartDate').value = '';
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);
  
  // New Month
  document.getElementById('btn-new-month').addEventListener('click', openNewMonthModal);
  document.getElementById('btn-close-modal').addEventListener('click', closeNewMonthModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closeNewMonthModal);
  document.getElementById('btn-confirm-new-month').addEventListener('click', confirmNewMonth);
  
  // Rent
  document.getElementById('btn-rent').addEventListener('click', toggleRentStatus);
  
  // Vault
  document.getElementById('btn-save').addEventListener('click', saveToVault);
  document.getElementById('btn-withdraw').addEventListener('click', withdrawFromVault);
  
  // Quick Spend
  document.querySelectorAll('.btn-quick-spend').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.dataset.amount);
      const desc = btn.dataset.desc;
      quickSpend(amount, desc);
    });
  });
  
  // Custom Spend
  document.getElementById('btn-custom-spend').addEventListener('click', customSpend);
  document.getElementById('customSpendAmount').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') customSpend();
  });
  
  // Pocket Money
  document.getElementById('btn-add-pocket').addEventListener('click', addPocketMoney);
  document.getElementById('customPocketAmount').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addPocketMoney();
  });
  
  // Bonus Income
  document.querySelectorAll('.btn-quick-bonus').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.dataset.amount);
      addBonus(amount);
    });
  });
  
  document.getElementById('btn-custom-bonus').addEventListener('click', addCustomBonus);
  document.getElementById('customBonusAmount').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addCustomBonus();
  });
  
  // History
  document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  
  // Reset
  document.getElementById('btn-reset').addEventListener('click', resetAppData);
  
  // Close modal on overlay click
  document.getElementById('newMonthModal').addEventListener('click', (e) => {
    if (e.target.id === 'newMonthModal') closeNewMonthModal();
  });
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', initApp);
