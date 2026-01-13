// Google API設定
const CONFIG = {
    // Google OAuth 2.0 クライアントID
    // Google Cloud Console で取得したクライアントIDをここに設定してください
    // https://console.cloud.google.com/apis/credentials
    GOOGLE_CLIENT_ID: '436182807626-k5nn4ura5r6mguf56b4ha737k2ju5396.apps.googleusercontent.com',

    // Google API Key (オプション - 空でもOK)
    GOOGLE_API_KEY: '',

    // 必要なスコープ
    SCOPES: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
    ].join(' '),

    // Google Sheets API設定
    SHEETS: {
        // スプレッドシートの名前
        SPREADSHEET_NAME: '請求書データ',

        // シート名
        SHEET_NAMES: {
            INVOICES: '請求書一覧',
            ITEMS: '品目詳細',
            SETTINGS: '会社情報'
        },

        // 請求書一覧シートのヘッダー
        INVOICE_HEADERS: [
            '請求書番号',
            '発行日',
            '支払期限',
            '顧客名',
            '顧客住所',
            '顧客電話番号',
            '小計',
            '消費税率',
            '消費税額',
            '合計金額',
            '作成日時',
            '更新日時'
        ],

        // 品目詳細シートのヘッダー
        ITEMS_HEADERS: [
            '請求書番号',
            '品目名',
            '数量',
            '単価',
            '金額'
        ],

        // 会社情報シートのヘッダー
        SETTINGS_HEADERS: [
            '会社名',
            '住所',
            '電話番号',
            'メールアドレス',
            'ロゴ（Base64）',
            '銀行名',
            '支店名',
            '口座番号',
            '口座名義'
        ]
    },

    // アプリケーション設定
    APP: {
        // 請求書番号のプレフィックス
        INVOICE_PREFIX: 'INV',

        // 請求書番号の桁数
        INVOICE_NUMBER_LENGTH: 4,

        // デフォルトの消費税率
        DEFAULT_TAX_RATE: 10,

        // 通貨記号
        CURRENCY_SYMBOL: '¥',

        // 日付フォーマット
        DATE_FORMAT: 'YYYY-MM-DD',

        // 支払期限のデフォルト日数（発行日から）
        DEFAULT_DUE_DAYS: 30
    },

    // PDF設定
    PDF: {
        // PDFのページサイズ
        PAGE_SIZE: 'a4',

        // PDFの向き
        ORIENTATION: 'portrait',

        // 余白
        MARGINS: {
            TOP: 20,
            RIGHT: 20,
            BOTTOM: 20,
            LEFT: 20
        },

        // フォント設定（日本語フォントの設定が必要）
        FONT: {
            FAMILY: 'NotoSansJP',
            SIZE: {
                TITLE: 24,
                HEADING: 16,
                BODY: 10,
                SMALL: 8
            }
        }
    },

    // LocalStorage キー
    STORAGE_KEYS: {
        SPREADSHEET_ID: 'invoiceGen_spreadsheetId',
        COMPANY_INFO: 'invoiceGen_companyInfo',
        LAST_INVOICE_NUMBER: 'invoiceGen_lastInvoiceNumber',
        AUTH_TOKEN: 'invoiceGen_authToken'
    }
};

// 設定の検証
function validateConfig() {
    if (CONFIG.GOOGLE_CLIENT_ID === 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com') {
        console.warn('⚠️ Google Client IDが設定されていません。config.jsを編集してください。');
        return false;
    }
    return true;
}

// 会社情報の取得
function getCompanyInfo() {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.COMPANY_INFO);
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        name: '',
        address: '',
        phone: '',
        email: '',
        logo: '',
        bank: {
            name: '',
            branch: '',
            accountNumber: '',
            accountName: ''
        }
    };
}

// 会社情報の保存
function saveCompanyInfo(companyInfo) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.COMPANY_INFO, JSON.stringify(companyInfo));
}

// スプレッドシートIDの取得
function getSpreadsheetId() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.SPREADSHEET_ID);
}

// スプレッドシートIDの保存
function saveSpreadsheetId(spreadsheetId) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.SPREADSHEET_ID, spreadsheetId);
}

// 次の請求書番号を生成
function generateInvoiceNumber() {
    const lastNumber = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_INVOICE_NUMBER);
    let nextNumber = 1;

    if (lastNumber) {
        const match = lastNumber.match(/\d+$/);
        if (match) {
            nextNumber = parseInt(match[0]) + 1;
        }
    }

    const paddedNumber = String(nextNumber).padStart(CONFIG.APP.INVOICE_NUMBER_LENGTH, '0');
    const invoiceNumber = `${CONFIG.APP.INVOICE_PREFIX}-${paddedNumber}`;

    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_INVOICE_NUMBER, invoiceNumber);

    return invoiceNumber;
}

// 金額のフォーマット
function formatCurrency(amount) {
    return `${CONFIG.APP.CURRENCY_SYMBOL}${amount.toLocaleString('ja-JP')}`;
}

// 日付のフォーマット
function formatDate(date) {
    if (typeof date === 'string') {
        return date;
    }
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 今日の日付を取得
function getTodayDate() {
    return formatDate(new Date());
}

// 支払期限を計算
function calculateDueDate(invoiceDate, days = CONFIG.APP.DEFAULT_DUE_DAYS) {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + days);
    return formatDate(date);
}
