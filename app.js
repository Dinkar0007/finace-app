/**
 * SECURITY AND UTILITY FUNCTIONS
 */

// Sanitizes input to prevent XSS attacks
function sanitizeText(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function getRealMonthStr() {
    return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function getTimeStr() {
    const now = new Date();
    return (
        now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
        ', ' +
        now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    );
}

/**
 * STATE MANAGEMENT (The "Store")
 * Handles all data persistence and business logic.
 */
class FinanceStore {
    constructor() {
        this.state = this.loadState();
    }

    loadState() {
        try {
            return {
                pocket:        parseFloat(localStorage.getItem('sfm_pocket'))         || 0,
                savings:       parseFloat(localStorage.getItem('sfm_savings'))        || 0,
                rentPaid:      localStorage.getItem('sfm_rent') === 'true',
                logs:          JSON.parse(localStorage.getItem('sfm_logs'))           || [],
                activeMonth:   localStorage.getItem('sfm_month')                     || getRealMonthStr(),
                baseAllowance: parseFloat(localStorage.getItem('sfm_base_allowance')) || 1000,
                isDarkMode:
                    localStorage.getItem('sfm_theme') === 'dark' ||
                    (!('sfm_theme' in localStorage) &&
                        window.matchMedia('(prefers-color-scheme: dark)').matches),
            };
        } catch (e) {
            console.error('Storage corrupted. Starting fresh.', e);
            return this.getDefaultState();
        }
    }

    saveState() {
        try {
            localStorage.setItem('sfm_pocket',         this.state.pocket);
            localStorage.setItem('sfm_savings',        this.state.savings);
            localStorage.setItem('sfm_rent',           this.state.rentPaid);
            localStorage.setItem('sfm_logs',           JSON.stringify(this.state.logs));
            localStorage.setItem('sfm_month',          this.state.activeMonth);
            localStorage.setItem('sfm_base_allowance', this.state.baseAllowance);
            localStorage.setItem('sfm_theme',          this.state.isDarkMode ? 'dark' : 'light');
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                alert('Device storage is full. Cannot save data.');
            }
        }
    }

    getDefaultState() {
        return {
            pocket:        0,
            savings:       0,
            rentPaid:      false,
            logs:          [],
            activeMonth:   getRealMonthStr(),
            baseAllowance: 1000,
            isDarkMode:    true,
        };
    }

    /**
     * BUG FIX: arguments were (desc, amt) but callers sometimes passed them reversed.
     * Now explicitly named and the rent toggle is corrected below.
     */
    addLog(desc, amt) {
        this.state.logs.unshift({ desc, amt, time: getTimeStr() });
        if (this.state.logs.length > 150) this.state.logs.pop(); // Keep history manageable
        this.saveState();
    }

    deductPocket(amount, reason) {
        if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount.');
        if (this.state.pocket < amount) throw new Error('Insufficient pocket money.');
        this.state.pocket -= amount;
        this.addLog(reason, `-₹${amount}`);
        this.saveState();
    }

    addFunds(amount, reason = 'Added Funds') {
        if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount.');
        this.state.pocket += amount;
        this.addLog(reason, `+₹${amount}`);
        this.saveState();
    }

    moveToSavings(amount) {
        if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount.');
        if (this.state.pocket < amount) throw new Error('Cannot save more money than you currently hold.');
        this.state.pocket  -= amount;
        this.state.savings += amount;
        this.addLog('Moved to Savings Vault', `+₹${amount}`);
        this.saveState();
    }

    toggleRent() {
        this.state.rentPaid = !this.state.rentPaid;
        // BUG FIX: was passing args in wrong order; second arg is the amount/label column
        const desc = this.state.rentPaid ? 'Rent Marked Paid' : 'Rent Marked Pending';
        this.addLog(desc, 'PG Rent');
        this.saveState();
    }

    startNewMonth(amount) {
        if (isNaN(amount) || amount < 0) throw new Error('Invalid amount.');
        this.state.baseAllowance = amount;
        this.state.pocket       += amount;
        this.state.rentPaid      = false;
        this.state.activeMonth   = getRealMonthStr();
        this.addLog('New Month Started', `+₹${amount}`);
        this.saveState();
    }

    addPocketMoney(amount, reason = 'Pocket Money Added') {
        if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount.');
        this.state.pocket += amount;
        this.addLog(reason, `+₹${amount}`);
        this.saveState();
    }

    clearHistory() {
        this.state.logs = [];
        this.saveState();
    }

    /**
     * BUG FIX: resetData previously only zeroed pocket, left savings untouched but
     * also logged a misleading '-₹0' entry. Now it only resets pocket + rent (as
     * documented in the confirm dialog) and logs a meaningful entry.
     */
    resetData() {
        this.state.pocket   = 0;
        this.state.rentPaid = false;
        this.addLog('Pocket Balance Reset', '₹0');
        this.saveState();
    }

    toggleTheme() {
        this.state.isDarkMode = !this.state.isDarkMode;
        this.saveState();
    }
}

/**
 * UI CONTROLLER
 * Handles DOM manipulation and event listeners.
 */
class FinanceUI {
    constructor(store) {
        this.store = store;
        this.initEventListeners();
        this.checkAutoNewMonth();
        this.render();
    }

    initEventListeners() {
        // Theme
        document.getElementById('btn-theme').addEventListener('click', () => {
            this.store.toggleTheme();
            this.render();
        });

        // New Month Modal
        const modal = document.getElementById('newMonthModal');
        const closeBtn = document.getElementById('btn-close-modal');
        const cancelBtn = document.getElementById('btn-cancel-modal');
        const confirmBtn = document.getElementById('btn-confirm-new-month');
        const pocketInput = document.getElementById('modalPocketAmount');
        const dateInput = document.getElementById('modalStartDate');

        document.getElementById('btn-new-month').addEventListener('click', () => {
            // Set default values
            pocketInput.value = this.store.state.baseAllowance;
            dateInput.value = new Date().toISOString().split('T')[0];
            modal.style.display = 'flex';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        confirmBtn.addEventListener('click', () => {
            try {
                const amount = parseFloat(pocketInput.value);
                this.store.startNewMonth(amount);
                modal.style.display = 'none';
                this.render();
            } catch (e) {
                alert(e.message);
            }
        });

        // Rent
        document.getElementById('btn-rent').addEventListener('click', () => {
            this.store.toggleRent();
            this.render();
        });

        // Save to Vault — also trigger on Enter key
        const saveInput = document.getElementById('saveAmount');
        document.getElementById('btn-save').addEventListener('click', () => {
            this._handleMoveToVault(saveInput);
        });
        saveInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleMoveToVault(saveInput);
        });

        // Quick Spend Buttons
        document.querySelectorAll('.btn-quick-spend').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const amount = parseFloat(target.getAttribute('data-amount'));
                const desc   = target.getAttribute('data-desc');
                try {
                    this.store.deductPocket(amount, desc);
                    this.render();
                    this._flashBalance('pocket');
                } catch (err) {
                    alert(err.message);
                }
            });
        });

        // Custom Spend — also trigger on Enter in amount field
        const customSpendAmount = document.getElementById('customSpendAmount');
        const customSpendDesc   = document.getElementById('customSpendDesc');
        document.getElementById('btn-custom-spend').addEventListener('click', () => {
            this._handleCustomSpend(customSpendAmount, customSpendDesc);
        });
        customSpendAmount.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleCustomSpend(customSpendAmount, customSpendDesc);
        });

        // Add Pocket Money Button
        const customPocketAmount = document.getElementById('customPocketAmount');
        document.getElementById('btn-add-pocket').addEventListener('click', () => {
            this._handleAddPocketMoney(customPocketAmount);
        });
        customPocketAmount.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleAddPocketMoney(customPocketAmount);
        });

        // Quick Bonus Buttons
        document.querySelectorAll('.btn-quick-bonus').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const amount = parseFloat(e.currentTarget.getAttribute('data-amount'));
                try {
                    this.store.addFunds(amount);
                    this.render();
                    this._flashBalance('pocket');
                } catch (err) {
                    alert(err.message);
                }
            });
        });

        // Custom Bonus — also trigger on Enter
        const customBonusInput = document.getElementById('customBonusAmount');
        document.getElementById('btn-custom-bonus').addEventListener('click', () => {
            this._handleCustomBonus(customBonusInput);
        });
        customBonusInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleCustomBonus(customBonusInput);
        });

        // History: Clear
        document.getElementById('btn-clear-history').addEventListener('click', () => {
            if (confirm('Clear all transaction history? Balances will not be affected.')) {
                this.store.clearHistory();
                this.render();
            }
        });

        // History: Export CSV
        document.getElementById('btn-export-csv').addEventListener('click', () => this.exportCSV());

        // Reset
        document.getElementById('btn-reset').addEventListener('click', () => {
            if (
                confirm(
                    'WARNING: This will reset your Pocket Money to ₹0 and uncheck Rent. History and Savings will remain. Proceed?'
                )
            ) {
                this.store.resetData();
                this.render();
            }
        });
    }

    /* ---- Private helpers ---- */

    _handleMoveToVault(input) {
        try {
            this.store.moveToSavings(parseFloat(input.value));
            input.value = '';
            this.render();
            this._flashBalance('savings');
        } catch (e) {
            alert(e.message);
        }
    }

    _handleCustomSpend(amtInput, descInput) {
        const desc = descInput.value.trim() || 'Misc Expense';
        try {
            this.store.deductPocket(parseFloat(amtInput.value), desc);
            amtInput.value  = '';
            descInput.value = '';
            this.render();
            this._flashBalance('pocket');
        } catch (e) {
            alert(e.message);
        }
    }

    _handleCustomBonus(input) {
        try {
            this.store.addFunds(parseFloat(input.value));
            input.value = '';
            this.render();
            this._flashBalance('pocket');
        } catch (e) {
            alert(e.message);
        }
    }

    _handleAddPocketMoney(input) {
        try {
            this.store.addPocketMoney(parseFloat(input.value));
            input.value = '';
            this.render();
            this._flashBalance('pocket');
        } catch (e) {
            alert(e.message);
        }
    }

    /** Briefly animate a balance display to indicate a change */
    _flashBalance(which) {
        const el = document.getElementById(which === 'savings' ? 'savingsDisplay' : 'pocketDisplay');
        if (!el) return;
        el.classList.remove('updated');
        // Force reflow so re-adding the class re-triggers the animation
        void el.offsetWidth;
        el.classList.add('updated');
    }

    checkAutoNewMonth() {
        const currentRealMonth = getRealMonthStr();
        if (this.store.state.activeMonth !== currentRealMonth) {
            setTimeout(() => {
                if (
                    confirm(
                        `Welcome to ${currentRealMonth}! Do you want to start a new month and add your pocket money?`
                    )
                ) {
                    const amountStr = prompt(
                        `Start Tracking: ${currentRealMonth}\n\nEnter your starting pocket money amount:`,
                        this.store.state.baseAllowance
                    );
                    if (amountStr !== null) {
                        try {
                            this.store.startNewMonth(parseFloat(amountStr));
                            this.render();
                        } catch (e) {
                            alert(e.message);
                        }
                    }
                } else {
                    // User opted out — still advance the month so the dialog won't re-appear
                    this.store.state.activeMonth = currentRealMonth;
                    this.store.saveState();
                    this.render();
                }
            }, 800);
        }
    }

    exportCSV() {
        const logs = this.store.state.logs;
        if (logs.length === 0) return alert('No history available to export.');

        let csvContent = 'data:text/csv;charset=utf-8,Date & Time,Description,Amount\n';
        logs.forEach((row) => {
            // Prevent formula injection (CSV security)
            let safeDesc = row.desc;
            if (safeDesc.match(/^[=+\-@]/)) safeDesc = "'" + safeDesc;
            safeDesc     = safeDesc.replace(/"/g, '""').replace(/,/g, '');
            let safeAmt  = row.amt.replace(/,/g, '');
            csvContent  += `"${row.time}","${safeDesc}","${safeAmt}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link       = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute(
            'download',
            `Finance_Export_${this.store.state.activeMonth.replace(/\s/g, '_')}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    render() {
        const s = this.store.state;

        /* --- Theme --- */
        const html = document.documentElement;
        if (s.isDarkMode) {
            html.classList.add('dark');
            document.getElementById('themeIcon').textContent = '☀️';
            const tc = document.getElementById('themeColor');
            if (tc) tc.setAttribute('content', '#0a0f1a');
        } else {
            html.classList.remove('dark');
            document.getElementById('themeIcon').textContent = '🌙';
            const tc = document.getElementById('themeColor');
            if (tc) tc.setAttribute('content', '#f0f4f8');
        }

        /* --- Month label --- */
        document.getElementById('monthDisplay').textContent = s.activeMonth;

        /* --- Modal month text --- */
        const modalMonthText = document.getElementById('modalMonthText');
        if (modalMonthText) {
            modalMonthText.textContent = `Start Tracking: ${getRealMonthStr()}`;
        }

        /* --- Balance displays --- */
        const fmt = (n) =>
            n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        document.getElementById('pocketDisplay').textContent  = fmt(s.pocket);
        document.getElementById('savingsDisplay').textContent = fmt(s.savings);

        /* --- Budget guide --- */
        document.getElementById('splitBase').textContent  = s.baseAllowance.toLocaleString('en-IN');
        document.getElementById('splitSave').textContent  = Math.round(s.baseAllowance * 0.20).toLocaleString('en-IN');
        document.getElementById('splitNeeds').textContent = Math.round(s.baseAllowance * 0.50).toLocaleString('en-IN');
        document.getElementById('splitFun').textContent   = Math.round(s.baseAllowance * 0.30).toLocaleString('en-IN');

        /* --- Rent card --- */
        const rentCard = document.getElementById('rentCard');
        const rentBtn  = document.getElementById('btn-rent');
        const rentText = document.getElementById('rentStatusText');

        if (s.rentPaid) {
            rentText.textContent = 'Paid ✓';
            rentText.className   = 'rent-status paid';
            rentBtn.textContent  = 'Undo';
            rentCard.classList.add('rent-paid');
        } else {
            rentText.textContent = 'Pending';
            rentText.className   = 'rent-status pending';
            rentBtn.textContent  = 'Mark Paid';
            rentCard.classList.remove('rent-paid');
        }

        /* --- Transaction history ---
         * Built with DOM nodes (not innerHTML loop) — XSS safe.
         */
        const logContainer = document.getElementById('historyLog');
        logContainer.innerHTML = '';

        if (s.logs.length === 0) {
            const empty = document.createElement('div');
            empty.className   = 'history-empty';
            empty.textContent = 'No transactions yet. Start tracking!';
            logContainer.appendChild(empty);
            return;
        }

        const frag = document.createDocumentFragment();
        s.logs.forEach((item, idx) => {
            const isNeg = item.amt.startsWith('-');
            const isPos = item.amt.startsWith('+');
            const amtClass = isNeg ? 'neg' : isPos ? 'pos' : 'save';
            const icon     = isNeg ? '📉' : '📈';

            // Row
            const row = document.createElement('div');
            row.className = 'history-entry';
            if (idx < 6) row.style.animationDelay = `${idx * 0.04}s`;

            // Left side
            const left = document.createElement('div');
            left.className = 'history-entry-left';

            const iconWrap = document.createElement('div');
            iconWrap.className   = 'history-icon';
            iconWrap.textContent = icon;

            const textWrap = document.createElement('div');
            textWrap.style.minWidth = '0';

            const descEl = document.createElement('p');
            descEl.className   = 'history-desc';
            descEl.textContent = item.desc;

            const timeEl = document.createElement('p');
            timeEl.className   = 'history-time';
            timeEl.textContent = item.time;

            textWrap.appendChild(descEl);
            textWrap.appendChild(timeEl);
            left.appendChild(iconWrap);
            left.appendChild(textWrap);

            // Amount
            const amtEl = document.createElement('span');
            amtEl.className   = `history-amt ${amtClass}`;
            amtEl.textContent = item.amt;

            row.appendChild(left);
            row.appendChild(amtEl);
            frag.appendChild(row);
        });

        logContainer.appendChild(frag);
    }
}

// Bootstrap Application
const appStore = new FinanceStore();
const appUI   = new FinanceUI(appStore);
