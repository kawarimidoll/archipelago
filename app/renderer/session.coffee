Pty                 = require('node-pty')
defaultShell        = require('default-shell')
React               = require('react')
{ EventEmitter }    = require('events')
{ isHotkey }        = require('is-hotkey')
ArchipelagoTerminal = require('./archipelago_terminal')
Xterm               = require('xterm').Terminal

module.exports =
class Session
  constructor: (group) ->
    @id = Math.random()
    @group = group
    @emitter = new EventEmitter()
    @pty = Pty.spawn(
      @settings('shell') || defaultShell,
      @settings('shellArgs').split(','),
      { name: 'xterm-256color', cwd: process.env.HOME, env: process.env }
    )
    @xterm = new Xterm(
      fontFamily: @settings('fontFamily'),
      fontSize: @settings('fontSize'),
      lineHeight: @settings('lineHeight'),
      letterSpacing: @settings('letterSpacing'),
      cursorStyle: @settings('cursorStyle'),
      cursorBlink: @settings('cursorBlink'),
      bellSound: @settings('bellSound'),
      bellStyle: @settings('bellStyle'),
      scrollback: @settings('scrollback'),
      tabStopWidth: parseInt(@settings('tabStopWidth')),
      theme: @settings('theme')
    )
    @bindDataListeners()

  render: (props) ->
    React.createElement(
      ArchipelagoTerminal, {
        terminal: this,
        key: @id,
        tabId: props.id,
        currentTab: props.currentTab,
        changeTitle: props.changeTitle,
        markUnread: props.markUnread,
        removeTerminal: props.removeTerminal,
        selectTerminal: props.selectTerminal
      }
    )

  isSession: ->
    true

  kill: ->
    window.removeEventListener('resize', @fit.bind(this))

    @pty.kill()
    @xterm.destroy()

  on: (event, handler) ->
    @emitter.on(event, handler)

  fit: ->
    @xterm.charMeasure.measure(@xterm.options)
    rows = Math.floor(@xterm.element.offsetHeight / @xterm.charMeasure.height)
    cols = Math.floor(@xterm.element.offsetWidth / @xterm.charMeasure.width) - 2

    try
      @xterm.resize(cols, rows)
      @pty.resize(cols, rows)

  settings: (setting) ->
    archipelago.config.get(setting)

  keybindingHandler: (e) =>
    caught = false
    keybindings = Object.values(@settings('keybindings')[process.platform])

    keybindings.forEach (keybinding) =>
      if isHotkey(keybinding.accelerator, e)
        command = keybinding.command.map (num) ->
          String.fromCharCode(parseInt(num))
        @pty.write(command.join(''))
        caught = true

    !caught

  updateSettings: ->
    ['fontFamily', 'lineHeight', 'cursorStyle', 'cursorBlink', 'bellSound',
     'bellStyle', 'scrollback', 'theme'].forEach (field) =>
       if @xterm[field] != @settings(field)
         @xterm.setOption(field, @settings(field))

    ['tabStopWidth', 'fontSize', 'letterSpacing'].forEach (field) =>
      if @xterm[field] != parseInt(@settings(field))
        @xterm.setOption(field, parseInt(@settings(field)))

    ['lineHeight'].forEach (field) =>
      if @xterm[field] != parseFloat(@settings(field))
        @xterm.setOption(field, parseFloat(@settings(field)))

    @bindCopyOnSelect()
    @fit()

  bindCopyOnSelect: ->
    @xterm.selectionManager.on 'selection', () =>
      if @settings('copyOnSelect')
        document.execCommand('copy')

  bindDataListeners: ->
    @xterm.attachCustomKeyEventHandler(@keybindingHandler)
    window.addEventListener 'resize', @fit.bind(this)

    @xterm.on 'data', (data) =>
      try
        @pty.write(data)

    @xterm.on 'focus', () =>
      @fit()
      @emitter.emit('focused')

    @xterm.on 'title', (title) =>
      @emitter.emit('titleChanged')

    @pty.on 'data', (data) =>
      @xterm.write(data)
      @emitter.emit('data')

    @pty.on 'exit', () =>
      @emitter.emit('exit')

    ['fontFamily', 'cursorStyle', 'cursorBlink', 'scrollback',
     'enableBold', 'tabStopWidth', 'fontSize', 'letterSpacing',
     'lineHeight', 'bellSound', 'bellStyle', 'theme'].forEach (field) =>
       archipelago.config.onDidChange field, (newValue) =>
         @xterm.setOption(field, newValue)
