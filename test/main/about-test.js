/* global describe, beforeEach, afterEach, it */

const path = require('path')
const {Application} = require('spectron')
const {assert} = require('chai')

let electron = './node_modules/electron/dist/'

electron = {
  darwin: electron + 'Electron.app/Contents/MacOS/Electron',
  linux: electron + 'electron',
  win32: electron
}[process.platform]

describe('About', function () {
  this.timeout(10000)

  beforeEach(() => {
    this.app = new Application({
      path: electron,
      verbose: true,
      env: {PAGE: 'about'},
      args: [path.join(__dirname, '../../dist/main/main.js')]
    })
    return this.app.start()
  })

  afterEach(() => {
    if (this.app && this.app.isRunning()) {
      return this.app.stop()
    }
  })

  it('renders with no main process errors', () => {
    return this.app.client.getWindowCount().then(count => {
      assert.equal(count, 1)
    })
  })

  it('renders with no renderer process errors', () => {
    return this.app.client.getRenderProcessLogs().then(logs => {
      const filteredLogs = logs.filter(log => log.level === 'SEVERE')

      assert.isEmpty(filteredLogs, 'Exception in renderer process encountered')
    })
  })

  it('displays the current app version', async () => {
    const currentVersion = await this.app.electron.remote.app.getVersion()
    const element = await this.app.client.$('#version')
    await element.waitForDisplayed()
    const text = await element.getText()

    assert.equal(text, `v${currentVersion}`)
  })
})
