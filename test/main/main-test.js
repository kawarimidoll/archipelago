/* global describe, beforeEach, afterEach, it */

const path = require('path')
const {Application} = require('spectron')
const {assert} = require('chai')
const robot = require('robotjs')

let electron = './node_modules/electron/dist/'

electron = {
  darwin: electron + 'Electron.app/Contents/MacOS/Electron',
  linux: electron + 'electron',
  win32: electron
}[process.platform]

describe('Application launch', function () {
  this.timeout(10000)

  beforeEach(() => {
    this.app = new Application({
      path: electron,
      verbose: true,
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

  it('renders the app', () => {
    assert(this.app.client.isExisting('archipelago-app'))
  })

  it('renders with no renderer process errors', () => {
    return this.app.client.getRenderProcessLogs().then(logs => {
      const filteredLogs = logs.filter(log => log.level === 'SEVERE')

      assert.isEmpty(filteredLogs, 'Exception in renderer process encountered')
    })
  })

  it('splits the terminal horizontally', async () => {
    const modifier = cmdOrCtrl()
    const initalElements = await this.app.client.elements('archipelago-terminal')
    assert.equal(initalElements.value.length, 1)
    robot.keyTap('s', modifier)
    const afterElements = await this.app.client.elements('archipelago-terminal')
    await this.app.client.waitForVisible('.SplitPane.horizontal')
    assert.equal(afterElements.value.length, 2)
    assert(await this.app.client.isExisting('.SplitPane.horizontal'))
    return assert.isFalse(await this.app.client.isExisting('.SplitPane.vertical'))
  })

  it('splits the terminal vertically', async () => {
    const modifier = cmdOrCtrl()
    const initalElements = await this.app.client.elements('archipelago-terminal')
    assert.equal(initalElements.value.length, 1)
    robot.keyTap('s', ['shift', modifier])
    const afterElements = await this.app.client.elements('archipelago-terminal')
    await this.app.client.waitForVisible('.SplitPane.vertical')
    assert.equal(afterElements.value.length, 2)
    assert(await this.app.client.isExisting('.SplitPane.vertical'))
    return assert.isFalse(await this.app.client.isExisting('.SplitPane.horizontal'))
  })

  it('adds a new tab', async () => {
    const modifier = cmdOrCtrl()
    await setSingleTabMode(false, this.app)
    const initalElements = await this.app.client.elements('archipelago-terminal')
    assert.equal(initalElements.value.length, 1)
    robot.keyTap('t', modifier)
    const afterElements = await this.app.client.elements('archipelago-terminal')
    assert.equal(afterElements.value.length, 2)
    const tabElements = await this.app.client.elements('archipelago-tab')
    return assert.equal(tabElements.value.length, 2)
  })

  it('doesnt add a new tab in single tab mode', async () => {
    const modifier = cmdOrCtrl()
    await setSingleTabMode(true, this.app)
    const initalElements = await this.app.client.elements('archipelago-terminal')
    assert.equal(initalElements.value.length, 1)
    robot.keyTap('t', modifier)
    const afterElements = await this.app.client.elements('archipelago-terminal')
    assert.equal(afterElements.value.length, 1)
    const tabElements = await this.app.client.elements('archipelago-tab')
    return assert.equal(tabElements.value.length, 1)
  })
})

async function setSingleTabMode(checked, app) {
  const modifier = cmdOrCtrl()
  robot.keyTap(',', modifier)
  await app.client.pause(2000)
  const windowHandles = await app.client.windowHandles()
  await app.client.window(windowHandles.value[1])
  await app.client.waitForVisible('switch-field#singleTabMode')
  const currentChecked = await app.client.getAttribute('switch-field#singleTabMode input', 'checked')
  if (currentChecked !== checked) {
    await app.client.click('switch-field#singleTabMode label')
  }
  await app.client.close()
}

function cmdOrCtrl() {
  let modifier
  if (process.platform === 'darwin') {
    modifier = 'command'
  } else {
    modifier = 'control'
  }

  return modifier
}
