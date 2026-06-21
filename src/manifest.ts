const manifest = {
  manifest_version: 3,
  name: 'Zhijuan Prompt Card',
  description: 'Turn images, page regions, and local files into structured prompts using your own vision API.',
  version: '0.3.5',
  version_name: '0.3.5 Timeout Retry',
  permissions: ['contextMenus', 'storage', 'scripting', 'clipboardWrite'],
  host_permissions: ['<all_urls>', 'file:///*'],
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
