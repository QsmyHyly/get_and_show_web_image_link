// 日志函数
function log(message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  if (data) {
    console.log(`[网页图片链接获取器][Background][${timestamp}] ${message}`, data);
  } else {
    console.log(`[网页图片链接获取器][Background][${timestamp}] ${message}`);
  }
}

log('后台脚本已加载');

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('收到消息', request);
  log('消息发送者', sender);
  
  if (request.action === "imagesCollected") {
    const { imageUrls = [] } = request;
    log(`收到 ${imageUrls.length} 张图片`);
    
    // 存储图片数据，不再分类
    chrome.storage.local.set({ 
      imageUrls: imageUrls
    }, () => {
      log(`已保存 ${imageUrls.length} 个图片链接到本地存储`);
      
      // 通知所有display.html页面更新数据
      chrome.tabs.query({ url: chrome.runtime.getURL('display.html') }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { 
            action: "updateImages", 
            imageUrls
          });
        });
      });
    });
    
    sendResponse({ success: true });
    log('已回复成功消息');
  }
  return true;
});