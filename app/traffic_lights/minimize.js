const { ipcRenderer, remote } = require('electron');
const React                   = require('react');

module.exports =
class Minimize extends React.Component {
  render() {
    if (process.platform === 'darwin') { return null; }

    return React.createElement(
      'minimize-button',
      {
        style: {
          '-webkit-app-region': 'no-drag',
          flexDirection: 'column',
          justifyContent: 'center',
          display: 'flex',
          height: '16px',
          width: '16px',
          right: '113px',
          top: '14px',
          position: 'fixed',
          zIndex: 4,
          filter: 'invert(20%)',
          cursor: 'pointer'
        },
        onClick() { return remote.getCurrentWindow().minimize(); }
      },
      React.createElement(
        'div', { style: { height: '1px', background: '#000' } }
      )
    );
  }
};