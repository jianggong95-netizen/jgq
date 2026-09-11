/**
 * 统一请求封装
 *
 * 发布前请在此配置实际后端地址；公开仓库不要提交真实 IP。
 * 真机开发测试可按项目实际情况配置微信开发者工具的域名校验选项。
 */
const BASE_URL = 'http://YOUR_SERVER_HOST:9990';

function getToken() {
  return wx.getStorageSync('openid') || '';
}

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: options.timeout || 10000,
      header: {
        'Content-Type': 'application/json',
        'X-Token': getToken(),
        ...(options.header || {}),
      },
      success(res) {
        if (res.statusCode === 401) {
          const pages = getCurrentPages();
          const current = pages.length ? pages[pages.length - 1].route : '';
          if (current !== 'pages/bind/bind') {
            wx.reLaunch({ url: '/pages/bind/bind' });
          }
          reject(res.data);
          return;
        }
        const body = res.data || {};
        if (body.code === 0) {
          resolve(body.data);
        } else {
          wx.showToast({ title: body.message || '请求失败', icon: 'none' });
          reject(body);
        }
      },
      fail(err) {
        const message = err && err.errMsg ? err.errMsg : '';
        console.error('[request] network error:', options.url, message);
        wx.showToast({
          title: '网络请求失败，请检查后端服务和网络',
          icon: 'none',
          duration: 2500,
        });
        reject(err);
      },
    });
  });
}

/** 图片上传（wx.uploadFile 封装） */
function upload(url, filePath, formData = {}) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: BASE_URL + url,
      filePath,
      name: 'file',
      formData,
      timeout: 30000,
      header: { 'X-Token': getToken() },
      success(res) {
        try {
          const body = JSON.parse(res.data);
          if (body.code === 0) {
            resolve(body.data);
          } else {
            wx.showToast({ title: body.message || '上传失败', icon: 'none' });
            reject(body);
          }
        } catch (e) {
          console.error('[upload] invalid response:', e);
          wx.showToast({ title: '服务器返回格式异常', icon: 'none' });
          reject(e);
        }
      },
      fail(err) {
        console.error('[upload] network error:', err);
        wx.showToast({ title: '图片上传失败', icon: 'none' });
        reject(err);
      },
    });
  });
}

function imgUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return BASE_URL + path;
}

const localImageCache = new Map();
function imageFileUrl(url) {
  if (!url) return Promise.resolve('');
  if (/^https:\/\//.test(url)) return Promise.resolve(url);
  if (localImageCache.has(url)) return Promise.resolve(localImageCache.get(url));
  return new Promise((resolve) => {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          localImageCache.set(url, res.tempFilePath);
          resolve(res.tempFilePath);
        } else {
          resolve(url);
        }
      },
      fail: (err) => {
        console.error('[imageFileUrl] download error:', err);
        resolve(url);
      },
    });
  });
}

module.exports = { BASE_URL, request, upload, imgUrl, imageFileUrl };
