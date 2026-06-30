const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const window = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: "Abacus",
    autoHideMenuBar: true,
    backgroundColor: "#efe8d9",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
