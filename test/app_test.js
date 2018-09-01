/* global describe, beforeEach, afterEach, it */

const Application = require('spectron').Application
const { assert }  = require('chai')
const electron    = require('electron')
const path = require('path')

describe('Application launch', () => {
  beforeEach(() => {
    this.app = new Application({
      path: electron,

      args: [path.join(__dirname, '../app/main/init.js')]
    })
    return this.app.start()
  })

  afterEach(() => {
    if (this.app && this.app.isRunning()) {
      this.app.stop()
    }
  })

  it('shows an initial window', () => {
    return this.app.client.getWindowCount().then((count) => {
      assert.equal(count, 1)
    })
  })
})
