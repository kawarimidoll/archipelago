require('coffeescript').register()

const { ipcRenderer } = require('electron')

const Split = require('./js/split')
const ConfigFile = require('./js/config_file')

require('./js/archipelago_tab')
require('./js/archipelago_terminal')

let configFile  = new ConfigFile()

window.addEventListener('resize', () => {
  for (var terminal of document.querySelectorAll('.tab-container:not(.hidden) archipelago-terminal')) {
    terminal.fit()
  }
})

document.addEventListener('DOMContentLoaded', () => {
  setDocumentSettings()

  newTab()
})

function newTab() {
  document.querySelector('#titlebar').appendChild(document.createElement('archipelago-tab'))
}

function setDocumentSettings() {
  let element = document.documentElement

  element.style.setProperty('--font-family', configFile.activeSettings().fontFamily)
  element.style.setProperty('--font-size', configFile.activeSettings().fontSize)
  element.style.setProperty('--background-color', configFile.activeSettings().windowBackground)
}

configFile.on('change', setDocumentSettings)

ipcRenderer.on('new-tab', newTab)
ipcRenderer.on('split-horizontal', () => {
  (new Split('horizontal')).split()
})
ipcRenderer.on('split-vertical', () => {
  (new Split('vertical')).split()
})
