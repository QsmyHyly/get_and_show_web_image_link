/**
 * 后台脚本
 * 处理插件的后台任务，如消息传递和存储管理
 */

// 插件安装时的处理
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('网页图片链接获取器已安装');
  
  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'getImages',
    title: '获取页面所有图片',
    contexts: ['page']
  });
});

// 右键菜单点击事件
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'getImages') {
    // 先注入内容脚本，然后发送消息
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, function() {
      if (chrome.runtime.lastError) {
        console.error('注入内容脚本时出错:', chrome.runtime.lastError.message);
        return;
      }
      
      // 向内容脚本发送消息，请求获取图片链接
      chrome.tabs.sendMessage(tab.id, { action: 'getImages' }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('获取图片链接时出错:', chrome.runtime.lastError.message);
          return;
        }

        if (response && response.success) {
          console.log(`成功获取 ${response.imageUrls.length} 个图片链接`);
          
          // 将图片URL存储到chrome.storage中
          chrome.storage.local.set({ 
            imageUrls: response.imageUrls,
            pageTitle: tab.title,
            pageUrl: tab.url
          }, function() {
            // 打开结果页面
            chrome.tabs.create({ url: 'results.html' });
          });
        } else {
          console.error('获取图片链接失败:', response.error);
        }
      });
    });
  }
});

// 监听来自内容脚本或弹出窗口的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // 检查消息是否有效
  if (!request) {
    console.log('收到无效消息');
    return;
  }
  
  // 处理不同类型的消息
  if (request.action === 'storeImages') {
    // 存储图片URL
    chrome.storage.local.set({ 
      imageUrls: request.imageUrls,
      pageTitle: request.pageTitle,
      pageUrl: request.pageUrl
    }, function() {
      sendResponse({ success: true });
    });
    return true; // 表示异步响应
  }
  
  if (request.action === 'getStoredImages') {
    // 获取存储的图片URL
    chrome.storage.local.get(['imageUrls', 'pageTitle', 'pageUrl'], function(data) {
      sendResponse({
        imageUrls: data.imageUrls || [],
        pageTitle: data.pageTitle || '',
        pageUrl: data.pageUrl || ''
      });
    });
    return true; // 表示异步响应
  }
  
  // 记录未知消息类型
  console.log('收到未知消息类型:', request);
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // 当页面完全加载后，可以在这里执行一些操作
  if (changeInfo.status === 'complete' && tab.url) {
    // 可以在这里添加一些自动操作，但为了不干扰用户，这里暂时留空
  }
});