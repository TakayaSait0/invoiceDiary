/**
 * 請求書ジェネレーター用 Google Apps Script
 *
 * このスクリプトをGoogleスプレッドシートに設置して、
 * Web Appとして公開することで、ログインなしでデータを受信できます。
 *
 * セットアップ手順:
 * 1. Googleスプレッドシートを開く
 * 2. 拡張機能 > Apps Script を開く
 * 3. このコードを貼り付け
 * 4. デプロイ > 新しいデプロイ > ウェブアプリ
 * 5. 「次のユーザーとして実行」: 自分
 * 6. 「アクセスできるユーザー」: 全員
 * 7. デプロイして、URLをコピー
 */

// スプレッドシートの初期化
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 既存のシートを取得または作成
  let invoicesSheet = ss.getSheetByName('請求書一覧');
  let itemsSheet = ss.getSheetByName('品目詳細');
  let settingsSheet = ss.getSheetByName('会社情報');

  // 請求書一覧シートの初期化
  if (!invoicesSheet) {
    invoicesSheet = ss.insertSheet('請求書一覧');
    invoicesSheet.appendRow([
      '請求書番号', '発行日', '支払期限', '顧客名', '顧客住所',
      '顧客電話番号', '小計', '消費税率', '消費税額', '合計金額',
      '作成日時', '更新日時'
    ]);
    invoicesSheet.getRange(1, 1, 1, 12).setFontWeight('bold');
  }

  // 品目詳細シートの初期化
  if (!itemsSheet) {
    itemsSheet = ss.insertSheet('品目詳細');
    itemsSheet.appendRow([
      '請求書番号', '品目名', '数量', '単価', '金額'
    ]);
    itemsSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  // 会社情報シートの初期化
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('会社情報');
    settingsSheet.appendRow([
      '会社名', '住所', '電話番号', 'メールアドレス',
      'ロゴ（Base64）', '銀行名', '支店名', '口座番号', '口座名義'
    ]);
    settingsSheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  return {
    invoices: invoicesSheet,
    items: itemsSheet,
    settings: settingsSheet
  };
}

// POST リクエストを処理（データ受信）
function doPost(e) {
  try {
    // CORSヘッダーを設定
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    // リクエストボディを解析
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let result;

    switch(action) {
      case 'saveInvoice':
        result = saveInvoice(data.invoice);
        break;
      case 'saveCompanyInfo':
        result = saveCompanyInfo(data.companyInfo);
        break;
      case 'getInvoices':
        result = getInvoices();
        break;
      case 'getCompanyInfo':
        result = getCompanyInfo();
        break;
      case 'deleteInvoice':
        result = deleteInvoice(data.invoiceNumber);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }

    output.setContent(JSON.stringify(result));
    return output;

  } catch (error) {
    const errorOutput = ContentService.createTextOutput();
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    errorOutput.setContent(JSON.stringify({
      success: false,
      error: error.toString()
    }));
    return errorOutput;
  }
}

// GET リクエストを処理（テスト用）
function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify({
    status: 'ok',
    message: '請求書ジェネレーター API は正常に動作しています',
    timestamp: new Date().toISOString()
  }));
  return output;
}

// 請求書を保存
function saveInvoice(invoice) {
  try {
    const sheets = initializeSheets();
    const invoicesSheet = sheets.invoices;
    const itemsSheet = sheets.items;

    // 既存の請求書を検索
    const dataRange = invoicesSheet.getDataRange();
    const values = dataRange.getValues();
    let existingRow = -1;

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === invoice.invoiceNumber) {
        existingRow = i + 1; // 1-indexed
        break;
      }
    }

    const timestamp = new Date().toISOString();

    // 請求書データの行を準備
    const invoiceRow = [
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
      existingRow > 0 ? values[existingRow - 1][10] : timestamp, // 作成日時
      timestamp // 更新日時
    ];

    if (existingRow > 0) {
      // 更新
      invoicesSheet.getRange(existingRow, 1, 1, 12).setValues([invoiceRow]);

      // 既存の品目を削除
      deleteInvoiceItems(invoice.invoiceNumber, itemsSheet);
    } else {
      // 新規追加
      invoicesSheet.appendRow(invoiceRow);
    }

    // 品目を追加
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach(item => {
        itemsSheet.appendRow([
          invoice.invoiceNumber,
          item.description,
          item.quantity,
          item.unitPrice,
          item.amount
        ]);
      });
    }

    return {
      success: true,
      message: '請求書を保存しました',
      invoiceNumber: invoice.invoiceNumber
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// 請求書の品目を削除（内部関数）
function deleteInvoiceItems(invoiceNumber, itemsSheet) {
  const dataRange = itemsSheet.getDataRange();
  const values = dataRange.getValues();

  // 下から削除していく（行番号がずれないように）
  for (let i = values.length - 1; i >= 1; i--) {
    if (values[i][0] === invoiceNumber) {
      itemsSheet.deleteRow(i + 1);
    }
  }
}

// 請求書一覧を取得
function getInvoices() {
  try {
    const sheets = initializeSheets();
    const invoicesSheet = sheets.invoices;

    const dataRange = invoicesSheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length <= 1) {
      return { success: true, invoices: [] };
    }

    const invoices = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      invoices.push({
        invoiceNumber: row[0],
        date: row[1],
        dueDate: row[2],
        customer: {
          name: row[3],
          address: row[4],
          phone: row[5]
        },
        subtotal: row[6],
        taxRate: row[7],
        tax: row[8],
        total: row[9],
        createdAt: row[10],
        updatedAt: row[11]
      });
    }

    return { success: true, invoices: invoices };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// 会社情報を保存
function saveCompanyInfo(companyInfo) {
  try {
    const sheets = initializeSheets();
    const settingsSheet = sheets.settings;

    // 既存のデータを削除（ヘッダー以外）
    const lastRow = settingsSheet.getLastRow();
    if (lastRow > 1) {
      settingsSheet.deleteRows(2, lastRow - 1);
    }

    // 新しいデータを追加
    settingsSheet.appendRow([
      companyInfo.name || '',
      companyInfo.address || '',
      companyInfo.phone || '',
      companyInfo.email || '',
      companyInfo.logo || '',
      companyInfo.bank?.name || '',
      companyInfo.bank?.branch || '',
      companyInfo.bank?.accountNumber || '',
      companyInfo.bank?.accountName || ''
    ]);

    return {
      success: true,
      message: '会社情報を保存しました'
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// 会社情報を取得
function getCompanyInfo() {
  try {
    const sheets = initializeSheets();
    const settingsSheet = sheets.settings;

    const dataRange = settingsSheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length <= 1) {
      return {
        success: true,
        companyInfo: {
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
        }
      };
    }

    const row = values[1];
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

    return { success: true, companyInfo: companyInfo };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// 請求書を削除
function deleteInvoice(invoiceNumber) {
  try {
    const sheets = initializeSheets();
    const invoicesSheet = sheets.invoices;
    const itemsSheet = sheets.items;

    // 請求書を削除
    const dataRange = invoicesSheet.getDataRange();
    const values = dataRange.getValues();

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === invoiceNumber) {
        invoicesSheet.deleteRow(i + 1);
        break;
      }
    }

    // 品目を削除
    deleteInvoiceItems(invoiceNumber, itemsSheet);

    return {
      success: true,
      message: '請求書を削除しました'
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}
