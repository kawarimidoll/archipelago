import {BrowserWindow} from 'electron'
import {api} from 'electron-util'
import ipc from 'electron-better-ipc'
import {spawn} from 'node-pty'
import {Disposable} from 'event-kit'
import debouncer from 'debounce-fn'
import defaultShell from 'default-shell'

export default class Pty {
  constructor(profileManager) {
    this.id = Math.random()
    this.profileManager = profileManager
    this.bufferedData = ''
    this.bufferTimeout = null

    this.pty = spawn(
      this.shell,
      this.profileManager.get('shellArgs').split(','),
      this.sessionArgs
    )
  }

  get shell() {
    return this.profileManager.get('shell') || defaultShell
  }

  get sessionArgs() {
    return {
      name: 'xterm-256color',
      cwd: process.env.HOME,
      env: {
        LANG: (api.app.getLocale() || '') + '.UTF-8',
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        ...process.env
      }
    }
  }

  async kill() {
    await new Promise(resolve => {
      this.pty.removeAllListeners('data')
      this.pty.removeAllListeners('exit')
      this.pty.destroy()
      resolve()
    })
  }

  created(sessionId, sessionWindowId) {
    this.sessionId = sessionId
    this.sessionWindow = BrowserWindow.getAllWindows().find(browserWindow => {
      return browserWindow.id === sessionWindowId
    })
    ipc.on(`pty-resize-${this.sessionId}`, (event, {cols, rows}) => {
      this.resize(cols, rows)
    })
    ipc.on(`pty-write-${this.sessionId}`, (event, data) => this.write(data))
    this.pty.on('exit', () => {
      this.sessionWindow.webContents.send(`pty-exit-${this.sessionId}`)
    })
    this.pty.on('data', data => this.bufferData(data))
  }

  onExit(callback) {
    this.pty.on('exit', callback)

    return new Disposable(() => this.pty.removeListener('exit', callback))
  }

  onData(callback) {
    this.pty.on('data', callback)

    return new Disposable(() => this.pty.removeListener('data', callback))
  }

  resize(cols, rows) {
    if (Number.isInteger(cols) && Number.isInteger(rows)) {
      try {
        this.pty.resize(cols, rows)
      } catch (error) {}
    }
  }

  write(data) {
    this.pty.write(data)
  }

  bufferData(data) {
    this.bufferedData += data
    if (!this.bufferTimeout) {
      this.bufferTimeout = debouncer(() => {
        this.sessionWindow.webContents.send(`pty-data-${this.sessionId}`, this.bufferedData)
        this.bufferedData = ''
        this.bufferTimeout = null
      }, {wait: 10})()
    }
  }
}
