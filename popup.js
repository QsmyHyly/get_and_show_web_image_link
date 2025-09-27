// 日志函数
function log(message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  if (data) {
    console.log(`[网页图片链接获取器][Popup][${timestamp}] ${message}`, data);
  } else {
    console.log(`[网页图片链接获取器][Popup][${timestamp}] ${message}`);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  log('弹出窗口初始化');
  const getImagesButton = document.getElementById('getImages');
  const statusDiv = document.getElementById('status');

  getImagesButton.addEventListener('click', async () => {
    log('点击获取图片按钮');
    statusDiv.textContent = '正在获取图片链接...';
    
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      log('当前活动标签页', tab);

      // 发送消息到content.js
      chrome.tabs.sendMessage(tab.id, { action: "getImages" }, (response) => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message;
          log('发送消息错误', errorMsg);
          statusDiv.textContent = '错误: ' + errorMsg;
          return;
        }

        if (response && response.success) {
          log('收到成功响应', response);
          statusDiv.textContent = '正在处理图片...';
          
          // 等待1秒让background.js处理完图片
          setTimeout(() => {
            // 打开显示页面
            chrome.tabs.create({ url: 'display.html' });
            statusDiv.textContent = '已完成';
          }, 1000);
        } else {
          log('未收到有效响应');
          statusDiv.textContent = '获取图片失败，请重试';
        }
      });
    } catch (error) {
      log('发生错误', error);
      statusDiv.textContent = '错误: ' + error.message;
    }
  });
});