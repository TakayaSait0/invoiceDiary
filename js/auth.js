// Google認証管理
class AuthManager {
    constructor() {
        this.tokenClient = null;
        this.gapiInitialized = false;
        this.gisInitialized = false;
        this.accessToken = null;
    }

    // Google API クライアントライブラリの初期化
    async initGapi() {
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    const initConfig = {
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                    };
                    // API Keyがある場合のみ追加
                    if (CONFIG.GOOGLE_API_KEY) {
                        initConfig.apiKey = CONFIG.GOOGLE_API_KEY;
                    }
                    await gapi.client.init(initConfig);
                    this.gapiInitialized = true;
                    console.log('✅ GAPI initialized');
                    resolve();
                } catch (error) {
                    console.error('❌ Error initializing GAPI:', error);
                    reject(error);
                }
            });
        });
    }

    // Google Identity Services の初期化
    initGis() {
        return new Promise((resolve) => {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.GOOGLE_CLIENT_ID,
                scope: CONFIG.SCOPES,
                callback: (response) => {
                    if (response.error) {
                        console.error('❌ Authentication error:', response);
                        this.handleAuthError(response.error);
                        return;
                    }
                    this.accessToken = response.access_token;
                    localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, this.accessToken);
                    console.log('✅ Authentication successful');
                    this.onAuthSuccess();
                },
            });
            this.gisInitialized = true;
            console.log('✅ GIS initialized');
            resolve();
        });
    }

    // 初期化
    async init() {
        try {
            // 設定の検証
            if (!validateConfig()) {
                this.showConfigError();
                return false;
            }

            await this.initGapi();
            await this.initGis();

            // 保存されたトークンを確認
            const savedToken = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
            if (savedToken) {
                this.accessToken = savedToken;
                gapi.client.setToken({ access_token: savedToken });

                // トークンの有効性を確認
                try {
                    await this.validateToken();
                    this.onAuthSuccess();
                } catch (error) {
                    console.log('Saved token is invalid, please login again');
                    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
                }
            }

            return true;
        } catch (error) {
            console.error('❌ Initialization error:', error);
            return false;
        }
    }

    // トークンの有効性を確認
    async validateToken() {
        try {
            // 簡単なAPIリクエストでトークンを検証
            await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: getSpreadsheetId() || 'test'
            });
            return true;
        } catch (error) {
            throw new Error('Token validation failed');
        }
    }

    // ログイン
    login() {
        if (!this.gisInitialized) {
            console.error('❌ GIS not initialized');
            return;
        }

        // 既存のトークンを削除
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken);
        }

        // 新しいトークンをリクエスト
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
    }

    // ログアウト
    logout() {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {
                console.log('✅ Token revoked');
            });
        }

        this.accessToken = null;
        gapi.client.setToken(null);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);

        this.onAuthLogout();
    }

    // 認証状態を確認
    isAuthenticated() {
        return this.accessToken !== null;
    }

    // 認証成功時の処理
    onAuthSuccess() {
        // UIの更新
        document.getElementById('login-section').classList.remove('active');
        document.getElementById('home-section').classList.add('active');
        document.getElementById('main-nav').style.display = 'block';
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('user-info').style.display = 'flex';

        // ユーザー情報の取得（オプション）
        this.getUserInfo();

        // 請求書一覧を読み込み
        if (typeof loadInvoices === 'function') {
            loadInvoices();
        }
    }

    // ログアウト時の処理
    onAuthLogout() {
        // UIの更新
        document.getElementById('login-section').classList.add('active');
        document.getElementById('home-section').classList.remove('active');
        document.getElementById('create-section').classList.remove('active');
        document.getElementById('settings-section').classList.remove('active');
        document.getElementById('main-nav').style.display = 'none';
        document.getElementById('login-btn').style.display = 'block';
        document.getElementById('user-info').style.display = 'none';

        // 請求書一覧をクリア
        const invoiceList = document.getElementById('invoice-list');
        if (invoiceList) {
            invoiceList.innerHTML = '<p class="loading">ログインしてください</p>';
        }
    }

    // ユーザー情報の取得
    async getUserInfo() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            });

            if (response.ok) {
                const userInfo = await response.json();
                const userName = document.getElementById('user-name');
                if (userName) {
                    userName.textContent = userInfo.name || userInfo.email;
                }
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }

    // 認証エラーハンドリング
    handleAuthError(error) {
        alert(`認証エラー: ${error}\n\nもう一度ログインしてください。`);
    }

    // 設定エラーの表示
    showConfigError() {
        const loginSection = document.getElementById('login-section');
        if (loginSection) {
            loginSection.innerHTML = `
                <div class="welcome-box">
                    <h2>⚠️ 設定が必要です</h2>
                    <p>Google Cloud ConsoleでクライアントIDを取得し、<br>
                    <code>js/config.js</code>ファイルに設定してください。</p>
                    <h3 style="margin-top: 2rem; text-align: left;">設定手順:</h3>
                    <ol style="text-align: left; margin: 1rem 0; padding-left: 2rem;">
                        <li><a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>にアクセス</li>
                        <li>新しいプロジェクトを作成</li>
                        <li>Google Sheets API を有効化</li>
                        <li>「認証情報」から OAuth 2.0 クライアントID を作成</li>
                        <li>承認済みの JavaScript 生成元に <code>http://localhost</code> を追加</li>
                        <li>取得したクライアントIDを <code>js/config.js</code> に設定</li>
                    </ol>
                    <p style="margin-top: 2rem;">
                        詳しい手順は <code>README.md</code> を参照してください。
                    </p>
                </div>
            `;
        }
    }
}

// グローバルインスタンス
const authManager = new AuthManager();
