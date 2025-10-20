/**
 * 弹出窗口脚本
 * 处理用户交互，发送消息到内容脚本获取图片链接
 */
document.addEventListener('DOMContentLoaded', function() {
  const getImagesBtn = document.getElementById('getImages');
  const statusDiv = document.getElementById('status');

  // 获取图片按钮点击事件
  getImagesBtn.addEventListener('click', function() {
    statusDiv.textContent = '正在获取图片链接...';
    getImagesBtn.disabled = true;

    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      
      // 先注入内容脚本，然后发送消息
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      }, function() {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = '错误: ' + chrome.runtime.lastError.message;
          getImagesBtn.disabled = false;
          return;
        }
        
        // 向内容脚本发送消息，请求获取图片链接
        chrome.tabs.sendMessage(activeTab.id, { action: 'getImages' }, function(response) {
          if (chrome.runtime.lastError) {
            statusDiv.textContent = '错误: ' + chrome.runtime.lastError.message;
            getImagesBtn.disabled = false;
            return;
          }

          if (response && response.success) {
            statusDiv.textContent = `成功获取 ${response.imageUrls.length} 个图片链接`;
            
            // 将图片URL存储到chrome.storage中
            chrome.storage.local.set({ 
              imageUrls: response.imageUrls,
              pageTitle: activeTab.title,
              pageUrl: activeTab.url
            }, function() {
              // 打开结果页面
              chrome.tabs.create({ url: 'results.html' }, function(tab) {
                // 关闭弹出窗口
                window.close();
              });
            });
          } else {
            statusDiv.textContent = '获取图片链接失败';
            getImagesBtn.disabled = false;
          }
        });
      });
    });
  });
});