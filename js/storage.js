// LocalStorage データ管理
class StorageManager {
    constructor() {
        this.INVOICES_KEY = 'invoiceGen_invoices';
        this.COMPANY_INFO_KEY = 'invoiceGen_companyInfo';
        this.APPS_SCRIPT_URL_KEY = 'invoiceGen_appsScriptUrl';
        this.appsScriptUrl = this.getAppsScriptUrl();
    }

    // Apps Script URL を取得
    getAppsScriptUrl() {
        return localStorage.getItem(this.APPS_SCRIPT_URL_KEY) || '';
    }

    // Apps Script URL を保存
    setAppsScriptUrl(url) {
        this.appsScriptUrl = url;
        localStorage.setItem(this.APPS_SCRIPT_URL_KEY, url);
    }

    // Apps Script に POST リクエスト
    async sendToAppsScript(action, data) {
        if (!this.appsScriptUrl) {
            return { success: true, message: 'Apps Script URL not configured' };
        }

        try {
            const response = await fetch(this.appsScriptUrl, {
                method: 'POST',
                mode: 'no-cors', // CORS制限を回避
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    ...data
                })
            });

            // no-corsモードでは response を読めないので、成功と仮定
            console.log('✅ Data sent to Apps Script');
            return { success: true, message: 'Data sent to spreadsheet' };

        } catch (error) {
            console.error('❌ Error sending to Apps Script:', error);
            return { success: false, error: error.toString() };
        }
    }

    // 請求書を保存
    async saveInvoice(invoiceData) {
        try {
            const invoices = this.getInvoices();

            // 既存の請求書を検索
            const existingIndex = invoices.findIndex(
                inv => inv.invoiceNumber === invoiceData.invoiceNumber
            );

            const timestamp = new Date().toISOString();

            if (existingIndex >= 0) {
                // 更新
                invoiceData.updatedAt = timestamp;
                invoiceData.createdAt = invoices[existingIndex].createdAt || timestamp;
                invoices[existingIndex] = invoiceData;
            } else {
                // 新規作成
                invoiceData.createdAt = timestamp;
                invoiceData.updatedAt = timestamp;
                invoices.push(invoiceData);
            }

            // LocalStorageに保存
            localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
            console.log('✅ Invoice saved to LocalStorage:', invoiceData.invoiceNumber);

            // Apps Scriptにも送信（設定されている場合）
            if (this.appsScriptUrl) {
                await this.sendToAppsScript('saveInvoice', { invoice: invoiceData });
            }

            return true;
        } catch (error) {
            console.error('❌ Error saving invoice:', error);
            throw error;
        }
    }

    // 請求書一覧を取得
    getInvoices() {
        try {
            const data = localStorage.getItem(this.INVOICES_KEY);
            if (!data) {
                return [];
            }
            const invoices = JSON.parse(data);
            // 日付順にソート（新しい順）
            return invoices.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
        } catch (error) {
            console.error('❌ Error loading invoices:', error);
            return [];
        }
    }

    // 特定の請求書を取得
    getInvoice(invoiceNumber) {
        const invoices = this.getInvoices();
        return invoices.find(inv => inv.invoiceNumber === invoiceNumber);
    }

    // 請求書を更新
    async updateInvoice(invoiceNumber, invoiceData) {
        return await this.saveInvoice(invoiceData);
    }

    // 請求書を削除
    async deleteInvoice(invoiceNumber) {
        try {
            let invoices = this.getInvoices();
            invoices = invoices.filter(inv => inv.invoiceNumber !== invoiceNumber);
            localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));

            console.log('✅ Invoice deleted:', invoiceNumber);

            // Apps Scriptからも削除（設定されている場合）
            if (this.appsScriptUrl) {
                await this.sendToAppsScript('deleteInvoice', { invoiceNumber: invoiceNumber });
            }

            return true;
        } catch (error) {
            console.error('❌ Error deleting invoice:', error);
            throw error;
        }
    }

    // 会社情報を保存
    async saveCompanyInfo(companyInfo) {
        try {
            localStorage.setItem(this.COMPANY_INFO_KEY, JSON.stringify(companyInfo));
            console.log('✅ Company info saved to LocalStorage');

            // Apps Scriptにも送信（設定されている場合）
            if (this.appsScriptUrl) {
                await this.sendToAppsScript('saveCompanyInfo', { companyInfo: companyInfo });
            }

            return true;
        } catch (error) {
            console.error('❌ Error saving company info:', error);
            throw error;
        }
    }

    // 会社情報を取得
    async loadCompanyInfo() {
        try {
            const data = localStorage.getItem(this.COMPANY_INFO_KEY);
            if (!data) {
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
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Error loading company info:', error);
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
    }

    // データのエクスポート（バックアップ用）
    exportAllData() {
        return {
            invoices: this.getInvoices(),
            companyInfo: JSON.parse(localStorage.getItem(this.COMPANY_INFO_KEY) || '{}'),
            exportDate: new Date().toISOString()
        };
    }

    // データのインポート（バックアップから復元）
    importAllData(data) {
        try {
            if (data.invoices) {
                localStorage.setItem(this.INVOICES_KEY, JSON.stringify(data.invoices));
            }
            if (data.companyInfo) {
                localStorage.setItem(this.COMPANY_INFO_KEY, JSON.stringify(data.companyInfo));
            }
            console.log('✅ Data imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Error importing data:', error);
            return false;
        }
    }

    // 既存データをスプレッドシートに一括送信
    async syncAllToSpreadsheet() {
        if (!this.appsScriptUrl) {
            alert('Apps Script URLが設定されていません');
            return false;
        }

        try {
            const invoices = this.getInvoices();
            const companyInfo = await this.loadCompanyInfo();

            if (invoices.length === 0) {
                alert('転送するデータがありません');
                return false;
            }

            if (!confirm(`${invoices.length}件の請求書をスプレッドシートに転送しますか？`)) {
                return false;
            }

            let successCount = 0;
            let errorCount = 0;

            // 会社情報を送信
            await this.sendToAppsScript('saveCompanyInfo', { companyInfo: companyInfo });

            // 各請求書を送信
            for (const invoice of invoices) {
                try {
                    await this.sendToAppsScript('saveInvoice', { invoice: invoice });
                    successCount++;
                    console.log(`✅ Synced: ${invoice.invoiceNumber}`);
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Error syncing ${invoice.invoiceNumber}:`, error);
                }
                // 少し待機（API制限対策）
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            alert(`転送完了\n成功: ${successCount}件\n失敗: ${errorCount}件`);
            return true;

        } catch (error) {
            console.error('❌ Error syncing to spreadsheet:', error);
            alert('データの転送に失敗しました');
            return false;
        }
    }

    // すべてのデータをクリア
    clearAllData() {
        if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
            localStorage.removeItem(this.INVOICES_KEY);
            localStorage.removeItem(this.COMPANY_INFO_KEY);
            console.log('✅ All data cleared');
            return true;
        }
        return false;
    }
}

// グローバルインスタンス（sheetsManagerの代わり）
const storageManager = new StorageManager();
// 後方互換性のため
const sheetsManager = storageManager;
