// アプリケーションの状態管理
const appState = {
    currentInvoice: null,
    invoices: [],
    companyInfo: null,
    editMode: false
};

// アプリケーションの初期化
async function initApp() {
    console.log('🚀 Initializing Invoice Generator...');

    // イベントリスナーの設定
    setupEventListeners();

    // 今日の日付をデフォルトで設定
    const today = getTodayDate();
    document.getElementById('invoice-date').value = today;
    document.getElementById('due-date').value = calculateDueDate(today);

    // 初期品目を1行追加
    addItemRow();

    // 請求書一覧を読み込み
    loadInvoices();

    // スプレッドシート転送ボタンの表示を更新
    updateHomeSyncButtonVisibility();

    console.log('✅ App initialized');
}

// イベントリスナーの設定
function setupEventListeners() {
    // エクスポートボタン
    document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);
    document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);

    // ホーム画面のスプレッドシート転送ボタン
    document.getElementById('sync-home-btn').addEventListener('click', syncToSpreadsheet);

    // ナビゲーション
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;
            navigateToSection(section);
        });
    });

    // 新規作成ボタン
    document.getElementById('create-new-btn').addEventListener('click', () => {
        navigateToSection('create');
        resetInvoiceForm();
    });

    // 品目追加ボタン
    document.getElementById('add-item-btn').addEventListener('click', addItemRow);

    // 保存ボタン
    document.getElementById('save-btn').addEventListener('click', saveInvoice);

    // キャンセルボタン
    document.getElementById('cancel-btn').addEventListener('click', () => {
        navigateToSection('home');
        resetInvoiceForm();
    });

    // プレビューボタン
    document.getElementById('preview-btn').addEventListener('click', showPreview);

    // PDFダウンロードボタン
    document.getElementById('download-pdf-btn').addEventListener('click', downloadPDF);

    // モーダル閉じるボタン
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // 設定保存ボタン
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);

    // スプレッドシート同期ボタン
    document.getElementById('sync-to-spreadsheet-btn').addEventListener('click', syncToSpreadsheet);

    // 検索ボタン
    document.getElementById('search-btn').addEventListener('click', searchInvoices);

    // 検索入力（Enter キー）
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchInvoices();
        }
    });

    // ロゴアップロード
    document.getElementById('company-logo').addEventListener('change', handleLogoUpload);

    // 発行日が変更されたら支払期限を自動計算
    document.getElementById('invoice-date').addEventListener('change', (e) => {
        const dueDate = calculateDueDate(e.target.value);
        document.getElementById('due-date').value = dueDate;
    });

    // 税率変更時に再計算
    document.getElementById('tax-rate').addEventListener('change', calculateTotals);

    // Apps Script URL の入力時に同期ボタンの表示を更新
    document.getElementById('apps-script-url').addEventListener('input', (e) => {
        updateSyncButtonVisibility(e.target.value);
    });
}

// セクション切り替え
function navigateToSection(sectionName) {
    // すべてのセクションを非表示
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // ナビゲーションリンクのアクティブ状態を更新
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionName) {
            link.classList.add('active');
        }
    });

    // 指定されたセクションを表示
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // セクション別の初期化処理
    if (sectionName === 'home') {
        loadInvoices();
    } else if (sectionName === 'settings') {
        loadSettings();
    }
}

// 請求書一覧の読み込み
async function loadInvoices() {
    const invoiceList = document.getElementById('invoice-list');
    invoiceList.innerHTML = '<p class="loading">読み込み中...</p>';

    try {
        appState.invoices = await storageManager.getInvoices();

        if (appState.invoices.length === 0) {
            invoiceList.innerHTML = '<p class="loading">請求書がありません。新規作成してください。</p>';
            return;
        }

        // 請求書カードを生成
        invoiceList.innerHTML = '';
        appState.invoices.forEach(invoice => {
            const card = createInvoiceCard(invoice);
            invoiceList.appendChild(card);
        });

    } catch (error) {
        console.error('❌ Error loading invoices:', error);
        invoiceList.innerHTML = '<p class="loading">請求書の読み込みに失敗しました</p>';
    }
}

// 請求書カードの作成
function createInvoiceCard(invoice) {
    const card = document.createElement('div');
    card.className = 'invoice-card';

    card.innerHTML = `
        <div class="invoice-card-header">
            <span class="invoice-number">${invoice.invoiceNumber}</span>
            <span class="invoice-date">${invoice.date}</span>
        </div>
        <div class="invoice-card-body">
            <div class="customer-name">${invoice.customer.name}</div>
            <div class="invoice-amount">${formatCurrency(invoice.total)}</div>
        </div>
        <div class="invoice-card-actions">
            <button class="btn btn-secondary" onclick="viewInvoice('${invoice.invoiceNumber}')">編集</button>
            <button class="btn btn-secondary" onclick="downloadInvoicePDF('${invoice.invoiceNumber}')">PDF</button>
            <button class="btn" onclick="deleteInvoice('${invoice.invoiceNumber}')">削除</button>
        </div>
    `;

    return card;
}

// 請求書の表示・編集
async function viewInvoice(invoiceNumber) {
    const invoice = storageManager.getInvoice(invoiceNumber);
    if (!invoice) {
        alert('請求書が見つかりません');
        return;
    }

    // 品目は請求書データに含まれている
    const items = invoice.items || [];

    // フォームに値を設定
    document.getElementById('invoice-number').value = invoice.invoiceNumber;
    document.getElementById('invoice-date').value = invoice.date;
    document.getElementById('due-date').value = invoice.dueDate;
    document.getElementById('customer-name').value = invoice.customer.name;
    document.getElementById('customer-address').value = invoice.customer.address || '';
    document.getElementById('customer-phone').value = invoice.customer.phone || '';
    document.getElementById('tax-rate').value = invoice.taxRate;

    // 品目をクリアして追加
    document.getElementById('items-container').innerHTML = '';
    items.forEach(item => {
        addItemRow(item);
    });

    // 合計を計算
    calculateTotals();

    // 編集モードに設定
    appState.editMode = true;
    appState.currentInvoice = invoice;
    document.getElementById('form-title').textContent = '請求書編集';

    // 作成画面に移動
    navigateToSection('create');
}

// 請求書の削除
async function deleteInvoice(invoiceNumber) {
    if (!confirm(`請求書 ${invoiceNumber} を削除しますか？`)) {
        return;
    }

    try {
        await storageManager.deleteInvoice(invoiceNumber);
        alert('請求書を削除しました');
        loadInvoices();
    } catch (error) {
        console.error('❌ Error deleting invoice:', error);
        alert('請求書の削除に失敗しました');
    }
}

// 請求書のPDFダウンロード
async function downloadInvoicePDF(invoiceNumber) {
    const invoice = storageManager.getInvoice(invoiceNumber);
    if (!invoice) {
        alert('請求書が見つかりません');
        return;
    }

    // 会社情報を取得
    const companyInfo = await storageManager.loadCompanyInfo();

    // PDFをダウンロード
    await pdfGenerator.downloadPDF(invoice, companyInfo);
}

// 品目行を追加
function addItemRow(item = null) {
    const container = document.getElementById('items-container');
    const row = document.createElement('div');
    row.className = 'item-row';

    row.innerHTML = `
        <div class="form-group">
            <label>品目名</label>
            <input type="text" class="item-description" value="${item?.description || ''}" required>
        </div>
        <div class="form-group">
            <label>数量</label>
            <input type="number" class="item-quantity" value="${item?.quantity || 1}" min="1" required>
        </div>
        <div class="form-group">
            <label>単価</label>
            <input type="number" class="item-unit-price" value="${item?.unitPrice || 0}" min="0" required>
        </div>
        <div class="form-group">
            <label>金額</label>
            <input type="number" class="item-amount" value="${item?.amount || 0}" readonly>
        </div>
        <button type="button" class="remove-item-btn" onclick="removeItemRow(this)">削除</button>
    `;

    container.appendChild(row);

    // 数量・単価の変更イベント
    const quantityInput = row.querySelector('.item-quantity');
    const unitPriceInput = row.querySelector('.item-unit-price');

    quantityInput.addEventListener('input', () => {
        updateItemAmount(row);
        calculateTotals();
    });

    unitPriceInput.addEventListener('input', () => {
        updateItemAmount(row);
        calculateTotals();
    });

    // 初期計算
    if (item) {
        updateItemAmount(row);
    }
}

// 品目行を削除
function removeItemRow(button) {
    const container = document.getElementById('items-container');
    if (container.children.length <= 1) {
        alert('最低1つの品目が必要です');
        return;
    }

    button.closest('.item-row').remove();
    calculateTotals();
}

// 品目の金額を更新
function updateItemAmount(row) {
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const unitPrice = parseFloat(row.querySelector('.item-unit-price').value) || 0;
    const amount = quantity * unitPrice;

    row.querySelector('.item-amount').value = amount;
}

// 合計金額を計算
function calculateTotals() {
    const items = document.querySelectorAll('.item-row');
    let subtotal = 0;

    items.forEach(item => {
        const amount = parseFloat(item.querySelector('.item-amount').value) || 0;
        subtotal += amount;
    });

    const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
    const tax = Math.floor(subtotal * taxRate / 100);
    const total = subtotal + tax;

    document.getElementById('subtotal-display').textContent = formatCurrency(subtotal);
    document.getElementById('tax-display').textContent = formatCurrency(tax);
    document.getElementById('total-display').textContent = formatCurrency(total);
}

// 請求書フォームをリセット
function resetInvoiceForm() {
    document.getElementById('invoice-form').reset();
    document.getElementById('form-title').textContent = '新規請求書作成';

    // 請求書番号を生成
    const invoiceNumber = generateInvoiceNumber();
    document.getElementById('invoice-number').value = invoiceNumber;

    // 今日の日付を設定
    const today = getTodayDate();
    document.getElementById('invoice-date').value = today;
    document.getElementById('due-date').value = calculateDueDate(today);

    // 品目をクリアして1行追加
    document.getElementById('items-container').innerHTML = '';
    addItemRow();

    // 編集モードを解除
    appState.editMode = false;
    appState.currentInvoice = null;

    // 合計をリセット
    calculateTotals();
}

// 請求書を保存
async function saveInvoice() {
    const form = document.getElementById('invoice-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // フォームデータを取得
    const invoiceData = {
        invoiceNumber: document.getElementById('invoice-number').value,
        date: document.getElementById('invoice-date').value,
        dueDate: document.getElementById('due-date').value,
        customer: {
            name: document.getElementById('customer-name').value,
            address: document.getElementById('customer-address').value,
            phone: document.getElementById('customer-phone').value
        },
        items: [],
        subtotal: 0,
        taxRate: parseFloat(document.getElementById('tax-rate').value),
        tax: 0,
        total: 0
    };

    // 品目データを取得
    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const item = {
            description: row.querySelector('.item-description').value,
            quantity: parseFloat(row.querySelector('.item-quantity').value),
            unitPrice: parseFloat(row.querySelector('.item-unit-price').value),
            amount: parseFloat(row.querySelector('.item-amount').value)
        };
        invoiceData.items.push(item);
        invoiceData.subtotal += item.amount;
    });

    // 税額と合計を計算
    invoiceData.tax = Math.floor(invoiceData.subtotal * invoiceData.taxRate / 100);
    invoiceData.total = invoiceData.subtotal + invoiceData.tax;

    try {
        if (appState.editMode && appState.currentInvoice) {
            // 更新
            await storageManager.updateInvoice(appState.currentInvoice.invoiceNumber, invoiceData);
            alert('請求書を更新しました');
        } else {
            // 新規作成
            await storageManager.saveInvoice(invoiceData);
            alert('請求書を保存しました');
        }

        // ホーム画面に戻る
        navigateToSection('home');
        resetInvoiceForm();

    } catch (error) {
        console.error('❌ Error saving invoice:', error);
        alert('請求書の保存に失敗しました');
    }
}

// プレビューを表示
async function showPreview() {
    const form = document.getElementById('invoice-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // フォームデータを取得（saveInvoiceと同じロジック）
    const invoiceData = {
        invoiceNumber: document.getElementById('invoice-number').value,
        date: document.getElementById('invoice-date').value,
        dueDate: document.getElementById('due-date').value,
        customer: {
            name: document.getElementById('customer-name').value,
            address: document.getElementById('customer-address').value,
            phone: document.getElementById('customer-phone').value
        },
        items: [],
        subtotal: 0,
        taxRate: parseFloat(document.getElementById('tax-rate').value),
        tax: 0,
        total: 0
    };

    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const item = {
            description: row.querySelector('.item-description').value,
            quantity: parseFloat(row.querySelector('.item-quantity').value),
            unitPrice: parseFloat(row.querySelector('.item-unit-price').value),
            amount: parseFloat(row.querySelector('.item-amount').value)
        };
        invoiceData.items.push(item);
        invoiceData.subtotal += item.amount;
    });

    invoiceData.tax = Math.floor(invoiceData.subtotal * invoiceData.taxRate / 100);
    invoiceData.total = invoiceData.subtotal + invoiceData.tax;

    // 会社情報を取得
    const companyInfo = await storageManager.loadCompanyInfo();

    // HTMLプレビューを生成
    const previewHTML = pdfGenerator.generateHTMLPreview(invoiceData, companyInfo);
    document.getElementById('preview-content').innerHTML = previewHTML;

    // モーダルを表示
    document.getElementById('preview-modal').classList.add('active');
}

// PDFダウンロード（プレビューから）
async function downloadPDF() {
    // フォームデータを取得（showPreviewと同じロジック）
    const invoiceData = {
        invoiceNumber: document.getElementById('invoice-number').value,
        date: document.getElementById('invoice-date').value,
        dueDate: document.getElementById('due-date').value,
        customer: {
            name: document.getElementById('customer-name').value,
            address: document.getElementById('customer-address').value,
            phone: document.getElementById('customer-phone').value
        },
        items: [],
        subtotal: 0,
        taxRate: parseFloat(document.getElementById('tax-rate').value),
        tax: 0,
        total: 0
    };

    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const item = {
            description: row.querySelector('.item-description').value,
            quantity: parseFloat(row.querySelector('.item-quantity').value),
            unitPrice: parseFloat(row.querySelector('.item-unit-price').value),
            amount: parseFloat(row.querySelector('.item-amount').value)
        };
        invoiceData.items.push(item);
        invoiceData.subtotal += item.amount;
    });

    invoiceData.tax = Math.floor(invoiceData.subtotal * invoiceData.taxRate / 100);
    invoiceData.total = invoiceData.subtotal + invoiceData.tax;

    // 会社情報を取得
    const companyInfo = await storageManager.loadCompanyInfo();

    // PDFをダウンロード
    await pdfGenerator.downloadPDF(invoiceData, companyInfo);
}

// モーダルを閉じる
function closeModal() {
    document.getElementById('preview-modal').classList.remove('active');
}

// 設定を読み込み
async function loadSettings() {
    const companyInfo = await storageManager.loadCompanyInfo();

    document.getElementById('company-name').value = companyInfo.name || '';
    document.getElementById('company-address').value = companyInfo.address || '';
    document.getElementById('company-phone').value = companyInfo.phone || '';
    document.getElementById('company-email').value = companyInfo.email || '';
    document.getElementById('bank-name').value = companyInfo.bank?.name || '';
    document.getElementById('bank-branch').value = companyInfo.bank?.branch || '';
    document.getElementById('bank-account-number').value = companyInfo.bank?.accountNumber || '';
    document.getElementById('bank-account-name').value = companyInfo.bank?.accountName || '';

    // Apps Script URL
    const appsScriptUrl = storageManager.getAppsScriptUrl() || '';
    document.getElementById('apps-script-url').value = appsScriptUrl;

    // URLが設定されていれば同期ボタンを表示
    updateSyncButtonVisibility(appsScriptUrl);

    // ロゴのプレビュー
    if (companyInfo.logo) {
        const logoPreview = document.getElementById('logo-preview');
        logoPreview.innerHTML = `<img src="${companyInfo.logo}" alt="Company Logo">`;
    }
}

// 同期ボタンの表示/非表示を切り替え（設定画面）
function updateSyncButtonVisibility(url) {
    const syncSection = document.getElementById('sync-section');
    if (url && url.trim() !== '') {
        syncSection.style.display = 'block';
    } else {
        syncSection.style.display = 'none';
    }

    // ホーム画面のボタンも更新
    updateHomeSyncButtonVisibility();
}

// ホーム画面の同期ボタンの表示/非表示を切り替え
function updateHomeSyncButtonVisibility() {
    const homeBtn = document.getElementById('sync-home-btn');
    const url = storageManager.getAppsScriptUrl();

    if (url && url.trim() !== '') {
        homeBtn.style.display = 'inline-block';
    } else {
        homeBtn.style.display = 'none';
    }
}

// 設定を保存
async function saveSettings() {
    const companyInfo = {
        name: document.getElementById('company-name').value,
        address: document.getElementById('company-address').value,
        phone: document.getElementById('company-phone').value,
        email: document.getElementById('company-email').value,
        logo: document.getElementById('logo-preview').querySelector('img')?.src || '',
        bank: {
            name: document.getElementById('bank-name').value,
            branch: document.getElementById('bank-branch').value,
            accountNumber: document.getElementById('bank-account-number').value,
            accountName: document.getElementById('bank-account-name').value
        }
    };

    // Apps Script URL を保存
    const appsScriptUrl = document.getElementById('apps-script-url').value.trim();
    storageManager.setAppsScriptUrl(appsScriptUrl);

    // 同期ボタンの表示を更新
    updateSyncButtonVisibility(appsScriptUrl);

    try {
        await storageManager.saveCompanyInfo(companyInfo);
        alert('設定を保存しました');
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        alert('設定の保存に失敗しました');
    }
}

// スプレッドシートにデータを同期
async function syncToSpreadsheet() {
    // Apps Script URLが設定されているか確認
    const url = storageManager.getAppsScriptUrl();
    if (!url || url.trim() === '') {
        alert('Apps Script URLが設定されていません。\n設定画面でURLを入力してください。');
        return;
    }

    // ボタンの状態を更新（両方のボタンに対応）
    const homeBtn = document.getElementById('sync-home-btn');
    const settingsBtn = document.getElementById('sync-to-spreadsheet-btn');

    const originalHomeText = homeBtn.textContent;
    const originalSettingsText = settingsBtn.textContent;

    homeBtn.disabled = true;
    homeBtn.textContent = '転送中...';
    settingsBtn.disabled = true;
    settingsBtn.textContent = '転送中...';

    try {
        await storageManager.syncAllToSpreadsheet();
    } catch (error) {
        console.error('❌ Error syncing:', error);
        alert('データの転送に失敗しました。\nコンソールを確認してください。');
    } finally {
        homeBtn.disabled = false;
        homeBtn.textContent = originalHomeText;
        settingsBtn.disabled = false;
        settingsBtn.textContent = originalSettingsText;
    }
}

// ロゴアップロード処理
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ファイルサイズチェック（2MB以下）
    if (file.size > 2 * 1024 * 1024) {
        alert('ファイルサイズは2MB以下にしてください');
        return;
    }

    // 画像ファイルかチェック
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください');
        return;
    }

    // FileReaderで読み込み
    const reader = new FileReader();
    reader.onload = (e) => {
        const logoPreview = document.getElementById('logo-preview');
        logoPreview.innerHTML = `<img src="${e.target.result}" alt="Company Logo">`;
    };
    reader.readAsDataURL(file);
}

// 請求書検索
function searchInvoices() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    if (!searchTerm) {
        // 検索語が空の場合は全件表示
        loadInvoices();
        return;
    }

    const filteredInvoices = appState.invoices.filter(invoice => {
        return invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
               invoice.customer.name.toLowerCase().includes(searchTerm);
    });

    const invoiceList = document.getElementById('invoice-list');
    invoiceList.innerHTML = '';

    if (filteredInvoices.length === 0) {
        invoiceList.innerHTML = '<p class="loading">該当する請求書が見つかりません</p>';
        return;
    }

    filteredInvoices.forEach(invoice => {
        const card = createInvoiceCard(invoice);
        invoiceList.appendChild(card);
    });
}

// Excel エクスポート
function exportToExcel() {
    const invoices = storageManager.getInvoices();
    exportManager.exportToExcel(invoices);
}

// CSV エクスポート
function exportToCSV() {
    const invoices = storageManager.getInvoices();
    exportManager.exportToCSV(invoices);
}

// ページ読み込み時に初期化
window.addEventListener('load', initApp);
