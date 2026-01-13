// Google Sheets API操作
class SheetsManager {
    constructor() {
        this.spreadsheetId = getSpreadsheetId();
    }

    // 新しいスプレッドシートを作成
    async createSpreadsheet() {
        try {
            const response = await gapi.client.sheets.spreadsheets.create({
                properties: {
                    title: CONFIG.SHEETS.SPREADSHEET_NAME
                },
                sheets: [
                    {
                        properties: {
                            title: CONFIG.SHEETS.SHEET_NAMES.INVOICES
                        }
                    },
                    {
                        properties: {
                            title: CONFIG.SHEETS.SHEET_NAMES.ITEMS
                        }
                    },
                    {
                        properties: {
                            title: CONFIG.SHEETS.SHEET_NAMES.SETTINGS
                        }
                    }
                ]
            });

            this.spreadsheetId = response.result.spreadsheetId;
            saveSpreadsheetId(this.spreadsheetId);

            console.log('✅ Spreadsheet created:', this.spreadsheetId);

            // ヘッダー行を追加
            await this.initializeSheets();

            return this.spreadsheetId;
        } catch (error) {
            console.error('❌ Error creating spreadsheet:', error);
            throw error;
        }
    }

    // シートの初期化（ヘッダー行を追加）
    async initializeSheets() {
        try {
            const requests = [
                // 請求書一覧シートのヘッダー
                {
                    range: `${CONFIG.SHEETS.SHEET_NAMES.INVOICES}!A1`,
                    values: [CONFIG.SHEETS.INVOICE_HEADERS]
                },
                // 品目詳細シートのヘッダー
                {
                    range: `${CONFIG.SHEETS.SHEET_NAMES.ITEMS}!A1`,
                    values: [CONFIG.SHEETS.ITEMS_HEADERS]
                },
                // 会社情報シートのヘッダー
                {
                    range: `${CONFIG.SHEETS.SHEET_NAMES.SETTINGS}!A1`,
                    values: [CONFIG.SHEETS.SETTINGS_HEADERS]
                }
            ];

            const batchUpdateRequest = {
                spreadsheetId: this.spreadsheetId,
                resource: {
                    data: requests,
                    valueInputOption: 'RAW'
                }
            };

            await gapi.client.sheets.spreadsheets.values.batchUpdate(batchUpdateRequest);

            console.log('✅ Sheets initialized with headers');
        } catch (error) {
            console.error('❌ Error initializing sheets:', error);
            throw error;
        }
    }

    // スプレッドシートIDの設定
    setSpreadsheetId(spreadsheetId) {
        this.spreadsheetId = spreadsheetId;
        saveSpreadsheetId(spreadsheetId);
    }

    // スプレッドシートの存在確認
    async verifySpreadsheet() {
        try {
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });
            return true;
        } catch (error) {
            console.error('❌ Spreadsheet not found:', error);
            return false;
        }
    }

    // 請求書を保存
    async saveInvoice(invoiceData) {
        try {
            // スプレッドシートIDの確認
            if (!this.spreadsheetId) {
                await this.createSpreadsheet();
            }

            // 請求書一覧シートに追加
            const invoiceRow = [
                invoiceData.invoiceNumber,
                invoiceData.date,
                invoiceData.dueDate,
                invoiceData.customer.name,
                invoiceData.customer.address || '',
                invoiceData.customer.phone || '',
                invoiceData.subtotal,
                invoiceData.taxRate,
                invoiceData.tax,
                invoiceData.total,
                new Date().toISOString(),
                new Date().toISOString()
            ];

            await this.appendRow(CONFIG.SHEETS.SHEET_NAMES.INVOICES, invoiceRow);

            // 品目詳細シートに追加
            for (const item of invoiceData.items) {
                const itemRow = [
                    invoiceData.invoiceNumber,
                    item.description,
                    item.quantity,
                    item.unitPrice,
                    item.amount
                ];
                await this.appendRow(CONFIG.SHEETS.SHEET_NAMES.ITEMS, itemRow);
            }

            console.log('✅ Invoice saved:', invoiceData.invoiceNumber);
            return true;
        } catch (error) {
            console.error('❌ Error saving invoice:', error);
            throw error;
        }
    }

    // 行を追加
    async appendRow(sheetName, values) {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:A`,
                valueInputOption: 'RAW',
                resource: {
                    values: [values]
                }
            });
            return response;
        } catch (error) {
            console.error(`❌ Error appending row to ${sheetName}:`, error);
            throw error;
        }
    }

    // 請求書一覧を取得
    async getInvoices() {
        try {
            if (!this.spreadsheetId) {
                return [];
            }

            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${CONFIG.SHEETS.SHEET_NAMES.INVOICES}!A2:L` // ヘッダー行を除く
            });

            const rows = response.result.values || [];
            const invoices = rows.map(row => ({
                invoiceNumber: row[0] || '',
                date: row[1] || '',
                dueDate: row[2] || '',
                customer: {
                    name: row[3] || '',
                    address: row[4] || '',
                    phone: row[5] || ''
                },
                subtotal: parseFloat(row[6]) || 0,
                taxRate: parseFloat(row[7]) || 0,
                tax: parseFloat(row[8]) || 0,
                total: parseFloat(row[9]) || 0,
                createdAt: row[10] || '',
                updatedAt: row[11] || ''
            }));

            console.log(`✅ Loaded ${invoices.length} invoices`);
            return invoices;
        } catch (error) {
            console.error('❌ Error loading invoices:', error);
            return [];
        }
    }

    // 特定の請求書の品目を取得
    async getInvoiceItems(invoiceNumber) {
        try {
            if (!this.spreadsheetId) {
                return [];
            }

            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${CONFIG.SHEETS.SHEET_NAMES.ITEMS}!A2:E`
            });

            const rows = response.result.values || [];
            const items = rows
                .filter(row => row[0] === invoiceNumber)
                .map(row => ({
                    description: row[1] || '',
                    quantity: parseFloat(row[2]) || 0,
                    unitPrice: parseFloat(row[3]) || 0,
                    amount: parseFloat(row[4]) || 0
                }));

            return items;
        } catch (error) {
            console.error('❌ Error loading invoice items:', error);
            return [];
        }
    }

    // 会社情報を保存
    async saveCompanyInfo(companyInfo) {
        try {
            if (!this.spreadsheetId) {
                await this.createSpreadsheet();
            }

            // 既存の会社情報を削除
            await this.clearRange(`${CONFIG.SHEETS.SHEET_NAMES.SETTINGS}!A2:I`);

            // 新しい会社情報を追加
            const row = [
                companyInfo.name || '',
                companyInfo.address || '',
                companyInfo.phone || '',
                companyInfo.email || '',
                companyInfo.logo || '',
                companyInfo.bank?.name || '',
                companyInfo.bank?.branch || '',
                companyInfo.bank?.accountNumber || '',
                companyInfo.bank?.accountName || ''
            ];

            await this.appendRow(CONFIG.SHEETS.SHEET_NAMES.SETTINGS, row);

            // LocalStorageにも保存
            saveCompanyInfo(companyInfo);

            console.log('✅ Company info saved');
            return true;
        } catch (error) {
            console.error('❌ Error saving company info:', error);
            throw error;
        }
    }

    // 会社情報を取得
    async loadCompanyInfo() {
        try {
            if (!this.spreadsheetId) {
                return getCompanyInfo();
            }

            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${CONFIG.SHEETS.SHEET_NAMES.SETTINGS}!A2:I`
            });

            const rows = response.result.values || [];
            if (rows.length === 0) {
                return getCompanyInfo();
            }

            const row = rows[0];
            const companyInfo = {
                name: row[0] || '',
                address: row[1] || '',
                phone: row[2] || '',
                email: row[3] || '',
                logo: row[4] || '',
                bank: {
                    name: row[5] || '',
                    branch: row[6] || '',
                    accountNumber: row[7] || '',
                    accountName: row[8] || ''
                }
            };

            // LocalStorageにも保存
            saveCompanyInfo(companyInfo);

            return companyInfo;
        } catch (error) {
            console.error('❌ Error loading company info:', error);
            return getCompanyInfo();
        }
    }

    // 範囲をクリア
    async clearRange(range) {
        try {
            await gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range: range
            });
        } catch (error) {
            console.error('❌ Error clearing range:', error);
        }
    }

    // 請求書を更新
    async updateInvoice(invoiceNumber, invoiceData) {
        try {
            // 既存の請求書を検索
            const invoices = await this.getInvoices();
            const index = invoices.findIndex(inv => inv.invoiceNumber === invoiceNumber);

            if (index === -1) {
                throw new Error('Invoice not found');
            }

            // 行番号を計算（ヘッダー行 + 1 + インデックス）
            const rowNumber = index + 2;

            // 請求書データを更新
            const invoiceRow = [
                invoiceData.invoiceNumber,
                invoiceData.date,
                invoiceData.dueDate,
                invoiceData.customer.name,
                invoiceData.customer.address || '',
                invoiceData.customer.phone || '',
                invoiceData.subtotal,
                invoiceData.taxRate,
                invoiceData.tax,
                invoiceData.total,
                invoices[index].createdAt, // 作成日時は変更しない
                new Date().toISOString() // 更新日時
            ];

            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${CONFIG.SHEETS.SHEET_NAMES.INVOICES}!A${rowNumber}:L${rowNumber}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [invoiceRow]
                }
            });

            // 品目を削除して再追加
            await this.deleteInvoiceItems(invoiceNumber);
            for (const item of invoiceData.items) {
                const itemRow = [
                    invoiceData.invoiceNumber,
                    item.description,
                    item.quantity,
                    item.unitPrice,
                    item.amount
                ];
                await this.appendRow(CONFIG.SHEETS.SHEET_NAMES.ITEMS, itemRow);
            }

            console.log('✅ Invoice updated:', invoiceNumber);
            return true;
        } catch (error) {
            console.error('❌ Error updating invoice:', error);
            throw error;
        }
    }

    // 請求書の品目を削除
    async deleteInvoiceItems(invoiceNumber) {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${CONFIG.SHEETS.SHEET_NAMES.ITEMS}!A:E`
            });

            const rows = response.result.values || [];
            const requests = [];

            // 削除する行を検索（逆順で処理）
            for (let i = rows.length - 1; i >= 1; i--) {
                if (rows[i][0] === invoiceNumber) {
                    requests.push({
                        deleteDimension: {
                            range: {
                                sheetId: await this.getSheetId(CONFIG.SHEETS.SHEET_NAMES.ITEMS),
                                dimension: 'ROWS',
                                startIndex: i,
                                endIndex: i + 1
                            }
                        }
                    });
                }
            }

            if (requests.length > 0) {
                await gapi.client.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    resource: { requests }
                });
            }
        } catch (error) {
            console.error('❌ Error deleting invoice items:', error);
        }
    }

    // シートIDを取得
    async getSheetId(sheetName) {
        try {
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            const sheet = response.result.sheets.find(
                s => s.properties.title === sheetName
            );

            return sheet ? sheet.properties.sheetId : 0;
        } catch (error) {
            console.error('❌ Error getting sheet ID:', error);
            return 0;
        }
    }

    // 請求書を削除
    async deleteInvoice(invoiceNumber) {
        try {
            const invoices = await this.getInvoices();
            const index = invoices.findIndex(inv => inv.invoiceNumber === invoiceNumber);

            if (index === -1) {
                throw new Error('Invoice not found');
            }

            const rowNumber = index + 2;

            // 請求書行を削除
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: await this.getSheetId(CONFIG.SHEETS.SHEET_NAMES.INVOICES),
                                dimension: 'ROWS',
                                startIndex: rowNumber - 1,
                                endIndex: rowNumber
                            }
                        }
                    }]
                }
            });

            // 品目を削除
            await this.deleteInvoiceItems(invoiceNumber);

            console.log('✅ Invoice deleted:', invoiceNumber);
            return true;
        } catch (error) {
            console.error('❌ Error deleting invoice:', error);
            throw error;
        }
    }
}

// グローバルインスタンス
const sheetsManager = new SheetsManager();
