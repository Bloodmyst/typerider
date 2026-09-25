// TypeRider en application de bureau : une fenêtre qui charge le jeu local, sans barre d'adresse.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// --smoke : lance le jeu, enregistre une capture puis quitte (vérification d'un build)
const smoke = process.argv.includes('--smoke');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#0a0e2a',
    title: 'TypeRider',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  Menu.setApplicationMenu(null);

  // le jeu est 100 % local : aucune navigation vers l'extérieur dans la fenêtre du jeu
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // F11 ou Alt+Entrée : plein écran (Échap reste la pause du jeu)
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'index.html'));

  if (smoke) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const img = await win.webContents.capturePage();
        const out = path.join(app.getPath('temp'), 'typerider-smoke.png');
        fs.writeFileSync(out, img.toPNG());
        console.log('SMOKE_OK ' + out);
        app.quit();
      }, 3500);
    });
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
