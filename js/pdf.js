// PDF生成
class PDFGenerator {
    constructor() {
        this.jsPDF = window.jspdf?.jsPDF;
        this.html2canvas = window.html2canvas;
    }

    // PDFを生成（ブラウザ印刷機能を使用）
    async generatePDF(invoiceData, companyInfo) {
        // この関数は使用されなくなりましたが、互換性のために残します
        return null;
    }

    // PDFをダウンロード（ブラウザ印刷機能を使用）
    async downloadPDF(invoiceData, companyInfo) {
        try {
            // 印刷用のHTMLを生成して新しいウィンドウで開く
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('ポップアップがブロックされました。\nブラウザの設定でポップアップを許可してください。');
                return;
            }

            const htmlContent = this.generatePrintableHTML(invoiceData, companyInfo);

            printWindow.document.write(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>請求書_${invoiceData.invoiceNumber}_${invoiceData.customer.name}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }

        body {
            font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
        }

        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
        }

        .header {
            margin-bottom: 30px;
        }

        .header img {
            max-width: 150px;
            max-height: 60px;
            margin-bottom: 10px;
        }

        .company-info {
            font-size: 11px;
            line-height: 1.5;
        }

        .company-info strong {
            font-size: 13px;
        }

        h1 {
            text-align: center;
            font-size: 28px;
            margin: 30px 0;
            padding-bottom: 10px;
            border-bottom: 3px solid #333;
        }

        .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }

        .info-box {
            width: 48%;
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
        }

        .info-box h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            border-bottom: 2px solid #666;
            padding-bottom: 5px;
        }

        .info-box strong {
            font-size: 14px;
        }

        .info-right {
            text-align: right;
        }

        .info-right div {
            margin-bottom: 8px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        thead {
            background-color: #333;
            color: white;
        }

        th, td {
            padding: 12px;
            border: 1px solid #333;
            text-align: left;
        }

        thead th {
            border-color: #333;
        }

        tbody td {
            border-color: #ddd;
        }

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .items-table th:nth-child(2),
        .items-table td:nth-child(2) {
            width: 80px;
            text-align: center;
        }

        .items-table th:nth-child(3),
        .items-table td:nth-child(3),
        .items-table th:nth-child(4),
        .items-table td:nth-child(4) {
            width: 120px;
            text-align: right;
        }

        .totals-section {
            margin-left: auto;
            width: 300px;
            margin-top: 20px;
        }

        .totals-table {
            width: 100%;
        }

        .totals-table td {
            padding: 8px;
            border: 1px solid #ddd;
        }

        .total-row {
            background-color: #333;
            color: white;
            font-weight: bold;
            font-size: 16px;
        }

        .bank-info {
            margin-top: 40px;
            padding: 15px;
            background-color: #f9f9f9;
            border-left: 4px solid #333;
        }

        .bank-info h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
        }

        .bank-info div {
            margin-bottom: 5px;
            font-size: 12px;
        }

        @media print {
            body {
                padding: 0;
            }

            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    ${htmlContent}
    <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">PDFとして保存</button>
        <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; margin-left: 10px; background-color: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">閉じる</button>
    </div>
</body>
</html>
            `);

            printWindow.document.close();

            // 画像の読み込みを待つ
            if (companyInfo.logo) {
                const img = printWindow.document.querySelector('img');
                if (img) {
                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                        setTimeout(resolve, 1000); // タイムアウト
                    });
                }
            }

            console.log('✅ PDF print dialog opened');
        } catch (error) {
            console.error('❌ Error downloading PDF:', error);
            alert('PDFのダウンロードに失敗しました');
        }
    }

    // 印刷用HTMLを生成
    generatePrintableHTML(invoiceData, companyInfo) {
        let html = '<div class="invoice-container">';

        // ヘッダー（会社情報）
        html += '<div class="header">';
        if (companyInfo.logo) {
            html += `<img src="${companyInfo.logo}" alt="Logo">`;
        }
        html += '<div class="company-info">';
        html += `<strong>${companyInfo.name || ''}</strong><br>`;
        if (companyInfo.address) {
            html += `${companyInfo.address}<br>`;
        }
        if (companyInfo.phone) {
            html += `TEL: ${companyInfo.phone}<br>`;
        }
        if (companyInfo.email) {
            html += `Email: ${companyInfo.email}`;
        }
        html += '</div></div>';

        // タイトル
        html += '<h1>請求書</h1>';

        // 請求書情報と請求先情報
        html += '<div class="info-section">';

        // 左側：請求先情報
        html += '<div class="info-box">';
        html += '<h3>請求先</h3>';
        html += `<strong>${invoiceData.customer.name}</strong><br>`;
        if (invoiceData.customer.address) {
            html += `<span style="font-size: 11px;">${invoiceData.customer.address}</span><br>`;
        }
        if (invoiceData.customer.phone) {
            html += `<span style="font-size: 11px;">TEL: ${invoiceData.customer.phone}</span>`;
        }
        html += '</div>';

        // 右側：請求書情報
        html += '<div class="info-box info-right">';
        html += `<div><strong>請求書番号:</strong> ${invoiceData.invoiceNumber}</div>`;
        html += `<div><strong>発行日:</strong> ${invoiceData.date}</div>`;
        html += `<div><strong>支払期限:</strong> ${invoiceData.dueDate}</div>`;
        html += '</div>';

        html += '</div>';

        // 品目テーブル
        html += '<table class="items-table">';
        html += '<thead><tr>';
        html += '<th>品目</th>';
        html += '<th>数量</th>';
        html += '<th>単価</th>';
        html += '<th>金額</th>';
        html += '</tr></thead>';
        html += '<tbody>';

        for (const item of invoiceData.items) {
            html += '<tr>';
            html += `<td>${item.description}</td>`;
            html += `<td class="text-center">${item.quantity}</td>`;
            html += `<td class="text-right">${formatCurrency(item.unitPrice)}</td>`;
            html += `<td class="text-right"><strong>${formatCurrency(item.amount)}</strong></td>`;
            html += '</tr>';
        }

        html += '</tbody></table>';

        // 合計セクション
        html += '<div class="totals-section">';
        html += '<table class="totals-table">';
        html += '<tr>';
        html += '<td>小計</td>';
        html += `<td class="text-right">${formatCurrency(invoiceData.subtotal)}</td>`;
        html += '</tr>';
        html += '<tr>';
        html += `<td>消費税 (${invoiceData.taxRate}%)</td>`;
        html += `<td class="text-right">${formatCurrency(invoiceData.tax)}</td>`;
        html += '</tr>';
        html += '<tr class="total-row">';
        html += '<td>合計金額</td>';
        html += `<td class="text-right">${formatCurrency(invoiceData.total)}</td>`;
        html += '</tr>';
        html += '</table>';
        html += '</div>';

        // 銀行口座情報
        if (companyInfo.bank && companyInfo.bank.name) {
            html += '<div class="bank-info">';
            html += '<h3>お振込先</h3>';
            html += `<div><strong>銀行名:</strong> ${companyInfo.bank.name}</div>`;
            html += `<div><strong>支店名:</strong> ${companyInfo.bank.branch}</div>`;
            html += `<div><strong>口座番号:</strong> ${companyInfo.bank.accountNumber}</div>`;
            html += `<div><strong>口座名義:</strong> ${companyInfo.bank.accountName}</div>`;
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // PDFをプレビュー（新しいウィンドウで開く）
    async previewPDF(invoiceData, companyInfo) {
        // downloadPDFと同じ動作
        await this.downloadPDF(invoiceData, companyInfo);
    }

    // HTMLプレビューを生成（モーダル表示用）
    generateHTMLPreview(invoiceData, companyInfo) {
        let html = '<div class="preview-invoice">';

        // ヘッダー
        html += '<div class="preview-header">';
        html += '<div class="preview-company-info">';
        if (companyInfo.logo) {
            html += `<img src="${companyInfo.logo}" alt="Logo" class="preview-logo">`;
        }
        html += `<h3>${companyInfo.name || ''}</h3>`;
        if (companyInfo.address) {
            html += `<p>${companyInfo.address}</p>`;
        }
        if (companyInfo.phone) {
            html += `<p>TEL: ${companyInfo.phone}</p>`;
        }
        if (companyInfo.email) {
            html += `<p>Email: ${companyInfo.email}</p>`;
        }
        html += '</div>';
        html += '</div>';

        // タイトル
        html += '<h1 class="preview-title">請求書</h1>';

        // 請求書情報
        html += '<div class="preview-section">';
        html += `<p><strong>請求書番号:</strong> ${invoiceData.invoiceNumber}</p>`;
        html += `<p><strong>発行日:</strong> ${invoiceData.date}</p>`;
        html += `<p><strong>支払期限:</strong> ${invoiceData.dueDate}</p>`;
        html += '</div>';

        // 請求先
        html += '<div class="preview-section">';
        html += '<h3>請求先</h3>';
        html += `<p><strong>${invoiceData.customer.name}</strong></p>`;
        if (invoiceData.customer.address) {
            html += `<p>${invoiceData.customer.address}</p>`;
        }
        if (invoiceData.customer.phone) {
            html += `<p>TEL: ${invoiceData.customer.phone}</p>`;
        }
        html += '</div>';

        // 品目テーブル
        html += '<table class="preview-table">';
        html += '<thead><tr>';
        html += '<th>品目</th>';
        html += '<th>数量</th>';
        html += '<th>単価</th>';
        html += '<th class="amount">金額</th>';
        html += '</tr></thead>';
        html += '<tbody>';

        for (const item of invoiceData.items) {
            html += '<tr>';
            html += `<td>${item.description}</td>`;
            html += `<td>${item.quantity}</td>`;
            html += `<td>${formatCurrency(item.unitPrice)}</td>`;
            html += `<td class="amount">${formatCurrency(item.amount)}</td>`;
            html += '</tr>';
        }

        html += '</tbody></table>';

        // 合計
        html += '<div class="preview-totals">';
        html += '<table class="preview-table">';
        html += '<tr>';
        html += '<td>小計</td>';
        html += `<td class="amount">${formatCurrency(invoiceData.subtotal)}</td>`;
        html += '</tr>';
        html += '<tr>';
        html += `<td>消費税 (${invoiceData.taxRate}%)</td>`;
        html += `<td class="amount">${formatCurrency(invoiceData.tax)}</td>`;
        html += '</tr>';
        html += '<tr style="font-weight: bold; font-size: 1.2em;">';
        html += '<td>合計金額</td>';
        html += `<td class="amount">${formatCurrency(invoiceData.total)}</td>`;
        html += '</tr>';
        html += '</table>';
        html += '</div>';

        // 銀行口座情報
        if (companyInfo.bank && companyInfo.bank.name) {
            html += '<div class="preview-section" style="margin-top: 2rem;">';
            html += '<h3>お振込先</h3>';
            html += `<p>銀行名: ${companyInfo.bank.name}</p>`;
            html += `<p>支店名: ${companyInfo.bank.branch}</p>`;
            html += `<p>口座番号: ${companyInfo.bank.accountNumber}</p>`;
            html += `<p>口座名義: ${companyInfo.bank.accountName}</p>`;
            html += '</div>';
        }

        html += '</div>';

        return html;
    }
}

// グローバルインスタンス
const pdfGenerator = new PDFGenerator();
