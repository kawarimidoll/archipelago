/* global window, document */

const {remote} = require('electron')
const os = require('os')
const {spawn} = require('node-pty')
const {Emitter, CompositeDisposable, Disposable} = require('event-kit')
const {Terminal} = require('xterm')
const KeymapManager = require('atom-keymap')
const {createElement} = require('react')

const Schema = require('../configuration/schema')
const ProfileManager = require('../configuration/profile-manager')
const ConfigFile = require('../configuration/config-file')
const TerminalComponent = require('../renderer/terminal')

Terminal.applyAddon(require('xterm/lib/addons/fit/fit'))

module.exports =
class Session {
  constructor(branch) {
    this.branch = branch
    this.id = Math.random()
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()
    this.schema = new Schema()
    this.profileManager = new ProfileManager(new ConfigFile())
    this.title = ''

    this.bindDataListeners()
  }

  get isSession() {
    return true
  }

  get pty() {
    if (this._pty) {
      return this._pty
    }

    const shell =
      this.activeProfile().get('shell') ||
      process.env[os.platform() === 'win32' ? 'COMSPEC' : 'SHELL']

    this._pty = spawn(
      shell, this.activeProfile().get('shellArgs').split(','), {
        name: 'xterm-256color',
        cwd: process.env.HOME,
        env: {
          LANG: remote.app.getLocale().replace('-', '_') + '.UTF-8',
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          ...process.env
        }
      }
    )

    return this._pty
  }

  get xterm() {
    if (this._xterm) {
      return this._xterm
    }
    const xtermSettings = this.schema.xtermSettings().reduce((settings, property) => {
      settings[property] = this.activeProfile().get(property)
      return settings
    }, {})

    this._xterm = new Terminal(xtermSettings)

    return this._xterm
  }

  get keymaps() {
    if (this._keymaps) {
      return this._keymaps
    }

    this._keymaps = new KeymapManager()
    this._keymaps.mappings =
      this.activeProfile().get('keybindings').reduce((result, item) => {
        result[item.keystroke] = item.command
        return result
      }, {})

    return this._keymaps
  }

  render(props) {
    return createElement(
      TerminalComponent, {
        key: this.id,
        session: this,
        tabId: props.id,
        currentTabId: props.currentTabId,
        changeTitle: props.changeTitle,
        markUnread: props.markUnread,
        removeSession: props.removeSession,
        selectSession: props.selectSession
      }
    )
  }

  activeProfile() {
    return this.profileManager.activeProfile()
  }

  resetTheme() {
    this.xterm.setOption('theme', this.activeProfile().get('theme'))
  }

  kill() {
    window.removeEventListener('resize', this.fit.bind(this))

    this.subscriptions.dispose()
    this.emitter.dispose()
    this.pty.kill()
    this.xterm.dispose()
  }

  fit() {
    this.xterm.fit()
    this.pty.resize(this.xterm.cols, this.xterm.rows)
  }

  on(event, handler) {
    return this.emitter.on(event, handler)
  }

  keybindingHandler(e) {
    let caught = false

    const mapping = this.keymaps.mappings[this.keymaps.keystrokeForKeyboardEvent(e)]

    if (mapping) {
      this.pty.write(mapping)
      caught = true
    }

    return !caught
  }

  bindScrollListener() {
    const scrollbarFadeEffect = () => {
      clearTimeout(this.scrollbarFade)
      this.scrollbarFade = setTimeout(
        () => this.xterm.element.classList.remove('scrolling'),
        600
      )
      this.xterm.element.classList.add('scrolling')
    }

    this.xterm.element.addEventListener('wheel', scrollbarFadeEffect.bind(this))

    return new Disposable(() => {
      this.xterm.element.removeEventListener('wheel', scrollbarFadeEffect.bind(this))
    })
  }

  onDidFocus(callback) {
    return this.emitter.on('did-focus', callback)
  }

  onDidChangeTitle(callback) {
    return this.emitter.on('did-change-title', callback)
  }

  onDidExit(callback) {
    return this.emitter.on('did-exit', callback)
  }

  onData(callback) {
    return this.emitter.on('data', callback)
  }

  bindDataListeners() {
    this.xterm.attachCustomKeyEventHandler(this.keybindingHandler.bind(this))
    window.addEventListener('resize', this.fit.bind(this))

    this.xterm.on('data', data => {
      try {
        this.pty.write(data)
      } catch (error) {}
    })

    this.xterm.on('focus', () => {
      this.fit()
      window.requestAnimationFrame(() => {
        const blink = this.activeProfile().get('cursorBlink')

        this.xterm.setOption('cursorBlink', !blink)
        this.xterm.setOption('cursorBlink', blink)
      })
      this.emitter.emit('did-focus')
    })

    this.xterm.on('title', title => {
      this.title = title
      this.emitter.emit('did-change-title', title)
    })

    this.xterm.on('selection', () => {
      if (this.activeProfile().get('copyOnSelect')) {
        document.execCommand('copy')
      }
    })

    this.pty.on('data', data => {
      this.xterm.write(data)
      this.emitter.emit('data')
    })

    this.pty.on('exit', () => {
      this.emitter.emit('did-exit')
    })

    this.schema.xtermSettings().forEach(field => {
      this.subscriptions.add(
        archipelago.config.onDidChange(field, newValue => {
          this.xterm.setOption(field, newValue)
        })
      )
    })
  }
}