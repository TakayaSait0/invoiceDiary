// Excel/CSVエクスポート機能
class ExportManager {
    constructor() {
        this.XLSX = window.XLSX;
    }

    // Excelファイルをエクスポート
    exportToExcel(invoices) {
        if (!this.XLSX) {
            alert('Excel出力ライブラリが読み込まれていません');
            return;
        }

        if (!invoices || invoices.length === 0) {
            alert('エクスポートする請求書がありません');
            return;
        }

        try {
            // ワークブックを作成
            const wb = this.XLSX.utils.book_new();

            // 請求書一覧シート
            const invoiceData = this.prepareInvoiceData(invoices);
            const ws1 = this.XLSX.utils.aoa_to_sheet(invoiceData);
            this.XLSX.utils.book_append_sheet(wb, ws1, '請求書一覧');

            // 品目詳細シート
            const itemsData = this.prepareItemsData(invoices);
            const ws2 = this.XLSX.utils.aoa_to_sheet(itemsData);
            this.XLSX.utils.book_append_sheet(wb, ws2, '品目詳細');

            // ファイル名を生成
            const fileName = `請求書データ_${this.getDateString()}.xlsx`;

            // ダウンロード
            this.XLSX.writeFile(wb, fileName);

            console.log('✅ Excel file exported:', fileName);
        } catch (error) {
            console.error('❌ Error exporting to Excel:', error);
            alert('Excelファイルの出力に失敗しました');
        }
    }

    // CSVファイルをエクスポート
    exportToCSV(invoices) {
        if (!this.XLSX) {
            alert('CSV出力ライブラリが読み込まれていません');
            return;
        }

        if (!invoices || invoices.length === 0) {
            alert('エクスポートする請求書がありません');
            return;
        }

        try {
            // 請求書一覧データ
            const invoiceData = this.prepareInvoiceData(invoices);
            const ws = this.XLSX.utils.aoa_to_sheet(invoiceData);
            const csv = this.XLSX.utils.sheet_to_csv(ws);

            // BOM付きで保存（Excel で文字化けしないように）
            const bom = '\uFEFF';
            const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });

            // ファイル名を生成
            const fileName = `請求書データ_${this.getDateString()}.csv`;

            // ダウンロード
            this.downloadBlob(blob, fileName);

            console.log('✅ CSV file exported:', fileName);
        } catch (error) {
            console.error('❌ Error exporting to CSV:', error);
            alert('CSVファイルの出力に失敗しました');
        }
    }

    // 請求書一覧データを準備
    prepareInvoiceData(invoices) {
        const data = [];

        // ヘッダー行
        data.push([
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
        ]);

        // データ行
        invoices.forEach(invoice => {
            data.push([
                invoice.invoiceNumber,
                invoice.date,
                invoice.dueDate,
                invoice.customer.name,
                invoice.customer.address || '',
                invoice.customer.phone || '',
                invoice.subtotal,
                invoice.taxRate,
                invoice.tax,
                invoice.total,
                this.formatDateTime(invoice.createdAt),
                this.formatDateTime(invoice.updatedAt)
            ]);
        });

        return data;
    }

    // 品目詳細データを準備
    prepareItemsData(invoices) {
        const data = [];

        // ヘッダー行
        data.push([
            '請求書番号',
            '品目名',
            '数量',
            '単価',
            '金額'
        ]);

        // データ行
        invoices.forEach(invoice => {
            if (invoice.items && invoice.items.length > 0) {
                invoice.items.forEach(item => {
                    data.push([
                        invoice.invoiceNumber,
                        item.description,
                        item.quantity,
                        item.unitPrice,
                        item.amount
                    ]);
                });
            }
        });

        return data;
    }

    // 日付文字列を生成
    getDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    // 日時のフォーマット
    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    // Blobをダウンロード
    downloadBlob(blob, fileName) {
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    // データのバックアップをJSONでダウンロード
    exportBackup() {
        try {
            const data = storageManager.exportAllData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const fileName = `請求書バックアップ_${this.getDateString()}.json`;

            this.downloadBlob(blob, fileName);

            console.log('✅ Backup exported:', fileName);
        } catch (error) {
            console.error('❌ Error exporting backup:', error);
            alert('バックアップの出力に失敗しました');
        }
    }

    // バックアップをインポート
    importBackup(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (storageManager.importAllData(data)) {
                    alert('バックアップを復元しました。ページを再読み込みします。');
                    window.location.reload();
                } else {
                    alert('バックアップの復元に失敗しました');
                }
            } catch (error) {
                console.error('❌ Error importing backup:', error);
                alert('バックアップファイルの読み込みに失敗しました');
            }
        };
        reader.readAsText(file);
    }
}

// グローバルインスタンス
const exportManager = new ExportManager();
