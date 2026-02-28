const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('hkEnv', {
  platform: process.platform
});
