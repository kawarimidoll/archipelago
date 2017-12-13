{ ipcRenderer }     = require('electron')
React               = require('react')
ReactDOM            = require('react-dom')
Split               = require('./split')
ConfigFile          = require('../utils/config_file')
ArchipelagoApp      = require('./archipelago_app')

configFile = new ConfigFile()
global.activeTerminal = null

# window.addEventListener 'resize', () =>
#   selector = '.tab-container:not(.hidden) archipelago-terminal'
#   document.querySelectorAll(selector).forEach (terminal) =>
#     terminal.fit()
#
# window.addEventListener 'beforeunload', () =>
#   document.querySelectorAll('archipelago-terminal').forEach (terminal) =>
#     terminal.windowClosing = true
#     terminal.xterm.destroy()
#     terminal.pty.kill()

document.addEventListener 'DOMContentLoaded', () =>
  setDocumentSettings()
  global.app = ReactDOM.render(
    React.createElement(ArchipelagoApp), document.getElementById('root')
  )

setDocumentSettings = ->
  element = document.documentElement

  element.style.setProperty('--font-family', configFile.activeSettings().fontFamily)
  element.style.setProperty('--font-size', configFile.activeSettings().fontSize)
  element.style.setProperty('--background-color', configFile.activeSettings().windowBackground)
  element.style.setProperty('--tab-color', configFile.activeSettings().tabColor)

configFile.on('change', setDocumentSettings)

ipcRenderer.on 'new-tab', () =>
  global.app.addTab()
ipcRenderer.on 'split-horizontal', () =>
  (new Split('horizontal')).split()
ipcRenderer.on 'split-vertical', () =>
  (new Split('vertical')).split()
