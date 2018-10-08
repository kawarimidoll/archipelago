import React from 'react'

import Pane from '@/app/pane' // eslint-disable-line import/no-unresolved

export default class PaneList extends React.Component {
  render() {
    return <archipelago-pane-list>
      {this.props.tabs.map(tab => (
        <Pane
          id={tab.id}
          key={tab.id}
          sessionTree={tab.root}
          currentTabId={this.props.currentTabId}
          changeTitle={this.props.changeTitle}
          markUnread={this.props.markUnread}
          removeSession={this.props.removeSession}
          selectSession={this.props.selectSession} />
      ))}
    </archipelago-pane-list>
  }
}