import {api, platform} from 'electron-util'
import about from '../about'
import settings from '../settings'
import {accelerators} from '../utils'

export default {
  label: api.app.getName(),
  submenu: [
    {
      label: 'About Archipelago',
      click: about.toggle
    },
    {
      label: `Version ${api.app.getVersion()}`,
      enabled: false
    },
    {type: 'separator'},
    {
      label: 'Settings',
      accelerator: accelerators.settings,
      click: settings.toggle
    },
    {type: 'separator'},
    ...platform({
      macos: [
        {role: 'services', submenu: []},
        {type: 'separator'},
        {role: 'hide'},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'}
      ],
      default: []
    }),
    {role: 'quit', accelerator: accelerators.quitApp}
  ]
}
