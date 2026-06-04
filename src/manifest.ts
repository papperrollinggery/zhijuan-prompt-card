const manifest = {
  manifest_version: 3,
  name: 'Zhijuan Prompt Card',
  description: 'Local-first image to prompt reverse prompt tool.',
  version: '0.1.0',
  permissions: ['contextMenus', 'storage', 'scripting', 'activeTab', 'clipboardWrite'],
  host_permissions: ['http://127.0.0.1/*', 'http://localhost/*', 'https://*/*', 'http://*/*', 'file:///*'],
  background: { service_worker: 'background.js', type: 'module' },
  action: {
    default_title: 'Zhijuan Prompt Card',
    default_popup: 'popup.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png'
    }
  },
  options_page: 'options.html',
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png'
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*', 'file:///*'],
      js: ['content.js'],
      run_at: 'document_idle',
      all_frames: false
    }
  ]
} as const;

export default manifest;
