const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Importar o servidor Express
require('./server');

let mainWindow;

function createWindow() {
    // Criar a janela do navegador
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            allowRunningInsecureContent: true
        },
        frame: false,
        titleBarStyle: 'hidden',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false
    });

    // Carregar o app
    mainWindow.loadFile('index.html');

    // Mostrar janela quando estiver pronta
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Abrir o DevTools em desenvolvimento
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Evento quando a janela é fechada
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
    
    // Configurar menu de aplicativo (opcional)
    const template = [
        {
            label: 'Arquivo',
            submenu: [
                {
                    label: 'Sair',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click() {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Desenvolvimento',
            submenu: [
                {
                    label: 'Recarregar',
                    accelerator: 'CmdOrCtrl+R',
                    click() {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Ferramentas de Desenvolvedor',
                    accelerator: 'F12',
                    click() {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Este método será chamado quando o Electron terminar a inicialização
app.whenReady().then(createWindow);

// Sai quando todas as janelas estiverem fechadas
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers para controles de janela
ipcMain.on('window-control', (event, action) => {
    if (!mainWindow) return;
    
    if (action === 'minimize') {
        mainWindow.minimize();
    } else if (action === 'maximize') {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    } else if (action === 'close') {
        mainWindow.close();
    }
});

ipcMain.on('open-devtools', () => {
    if (mainWindow) {
        mainWindow.webContents.openDevTools();
    }
});

ipcMain.on('app-version', (event) => {
    event.reply('app-version', { version: app.getVersion() });
});

// Manipulador para comunicação entre processos
ipcMain.handle('get-server-status', async () => {
    try {
        const response = await fetch('http://localhost:3000/api/status');
        return await response.json();
    } catch (error) {
        return { status: 'offline', error: error.message };
    }
});