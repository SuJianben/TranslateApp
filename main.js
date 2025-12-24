const { app, BrowserWindow, Menu, dialog } = require('electron')
const path = require('path')
// 引入自动更新模块
const { autoUpdater } = require("electron-updater")

// 配置日志（可选，为了调试方便）
autoUpdater.logger = require("electron-log")
autoUpdater.logger.transports.file.level = "info"

// 关闭自动下载，让我们手动控制弹窗
autoUpdater.autoDownload = false

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "批量翻译工具",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // 隐藏菜单
  Menu.setApplicationMenu(null)
  
  win.loadFile('index.html')

  // ------------------------------------------------
  // 👇 调试核心：监听所有可能的更新事件
  // ------------------------------------------------

  // 1. 开始检查
  autoUpdater.on('checking-for-update', () => {
    // 只有在开发环境或者是为了确认它真的在跑时，才取消下面这行的注释
    // dialog.showMessageBox({ title: '调试', message: '正在连接服务器检查更新...' })
    console.log('正在检查更新...')
  })

  // 2. 发现新版本 (关键!)
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `检测到新版本 v${info.version}！\n\n当前版本: ${app.getVersion()}\n发布时间: ${info.releaseDate}\n\n是否立即下载？`,
      buttons: ['立即下载', '以后再说']
    }).then((result) => {
      if (result.response === 0) {
        // 用户点了“立即下载”，开始下载
        dialog.showMessageBox({ title: '提示', message: '正在后台下载，请稍候...' })
        autoUpdater.downloadUpdate()
      }
    })
  })

  // 3. 没有发现新版本
  autoUpdater.on('update-not-available', (info) => {
    // ⚠️ 如果你看到这个弹窗，说明版本号没对上
    dialog.showMessageBox({
      type: 'info',
      title: '没有更新',
      message: `当前已经是最新版本。\n\n当前版本: ${app.getVersion()}\n服务器版本: ${info.version}`
    })
  })

  // 4. 下载出错
  autoUpdater.on('error', (err) => {
    dialog.showMessageBox({
      type: 'error',
      title: '更新出错',
      message: '检查或下载更新时发生错误：\n' + (err.message || err.toString())
    })
  })

  // 5. 下载进度 (可选，防止用户以为卡死了)
  autoUpdater.on('download-progress', (progressObj) => {
    // 这里一般不在主进程弹窗，否则会弹几十次，建议只在控制台打印
    win.webContents.send('download-progress', progressObj.percent)
  })

  // 6. 下载完成，准备安装
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '安装更新',
      message: '新版本下载完成！点击“确定”将重启并安装。',
      buttons: ['确定']
    }).then(() => {
      autoUpdater.quitAndInstall(true, true)
    })
  })

  // ------------------------------------------------
  // 👇 触发检查的时机
  // ------------------------------------------------
  win.webContents.on('did-finish-load', () => {
    // 只有打包后才自动检查
    if (app.isPackaged) {
      // 延迟 3 秒再检查，防止刚启动网络还没连上
      setTimeout(() => {
        autoUpdater.checkForUpdates()
      }, 3000)
    } else {
      // 开发环境下(npm start)，如果你想测试，可以取消下面注释强制检查
      // autoUpdater.checkForUpdates()
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})