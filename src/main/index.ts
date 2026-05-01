import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { DockerManager } from './docker-manager.js'
import { MessageRouter } from './message-router.js'
import { registerIpc } from './ipc.js'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let docker: DockerManager | null = null
let router: MessageRouter | null = null

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#0b0d10',
    title: 'Agent Orchestrator',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    await mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  docker = new DockerManager()
  router = new MessageRouter()
  await router.start()
  registerIpc(mainWindow, docker, router)
}

app.whenReady().then(() => {
  void createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  if (router) await router.stop()
})
