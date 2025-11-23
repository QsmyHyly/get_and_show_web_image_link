/**
 * 图片收集状态管理器
 * 处理图片收集状态显示和自动停止监听功能
 */

class ImageCollectionManager {
  /**
   * 构造函数
   * @param {Function} onImagesUpdate - 图片更新回调函数
   * @param {Function} onLoadImages - 加载图片函数
   */
  constructor(onImagesUpdate, onLoadImages) {
    this.onImagesUpdate = onImagesUpdate;
    this.onLoadImages = onLoadImages;
    
    // 配置参数
    this.updateIntervalTime = 2000; // 检查更新间隔（毫秒）
    this.inactivityTimeout = 30000; // 无新图片活动超时时间（毫秒）
    
    // 状态变量
    this.updateInterval = null;
    this.inactivityTimer = null;
    this.isCollecting = false;
    this.lastImageCount = 0;
    this.lastUpdateTime = Date.now();
    
    // 绑定方法
    this.startCollection = this.startCollection.bind(this);
    this.stopCollection = this.stopCollection.bind(this);
    this.updateCollectionStatus = this.updateCollectionStatus.bind(this);
    this.handleStorageChange = this.handleStorageChange.bind(this);
  }

  /**
   * 启动图片收集
   */
  startCollection() {
    if (this.isCollecting) {
      console.warn('图片收集已在进行中');
      return;
    }

    this.isCollecting = true;
    
    // 显示收集状态
    this.showCollectingStatus();
    
    // 启动定期更新
    this.startUpdateInterval();
    
    // 监听存储变化
    chrome.storage.onChanged.addListener(this.handleStorageChange);
    
    console.log('开始收集图片');
  }

  /**
   * 停止图片收集
   */
  stopCollection() {
    this.isCollecting = false;
    
    // 停止更新间隔
    this.stopUpdateInterval();
    
    // 清除不活动计时器
    this.clearInactivityTimer();
    
    // 隐藏收集状态
    this.hideCollectingStatus();
    
    // 移除监听器
    chrome.storage.onChanged.removeListener(this.handleStorageChange);
    
    console.log('停止收集图片');
  }

  /**
   * 启动更新间隔
   */
  startUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.updateCollectionStatus();
    }, this.updateIntervalTime);
  }

  /**
   * 停止更新间隔
   */
  stopUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * 清除不活动计时器
   */
  clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * 更新收集状态
   */
  async updateCollectionStatus() {
    if (!this.isCollecting) return;

    try {
      // 获取当前图片数据
      const data = await this.getStoredImages();
      
      // 检查图片数量是否增加
      const currentCount = data.imageUrls ? data.imageUrls.length : 0;
      
      if (currentCount > this.lastImageCount) {
        // 有新图片，重置不活动计时器
        this.lastImageCount = currentCount;
        this.lastUpdateTime = Date.now();
        
        // 清除之前的不活动计时器
        this.clearInactivityTimer();
        
        // 设置新的不活动计时器
        this.inactivityTimer = setTimeout(() => {
          console.log('未检测到新图片，停止收集');
          this.stopCollection();
        }, this.inactivityTimeout);
        
        // 通知图片更新
        if (this.onImagesUpdate) {
          this.onImagesUpdate(data);
        }
      }
    } catch (error) {
      console.error('更新收集状态时出错:', error);
    }
  }

  /**
   * 获取存储的图片数据
   */
  getStoredImages() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['imageUrls', 'pageTitle', 'pageUrl', 'isCollectingMore', 'lastUpdated'], function(data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * 处理存储变化
   */
  handleStorageChange(changes, namespace) {
    if (namespace === 'local' && changes.imageUrls) {
      // 有新图片添加，更新状态
      this.updateCollectionStatus();
    }
  }

  /**
   * 显示收集状态
   */
  showCollectingStatus() {
    // 检查是否已有状态指示器
    let statusIndicator = document.getElementById('collectingMoreStatus');
    
    if (!statusIndicator) {
      // 创建新的状态指示器
      statusIndicator = document.createElement('div');
      statusIndicator.id = 'collectingMoreStatus';
      statusIndicator.className = 'collecting-status';
      statusIndicator.innerHTML = `
        <div class="spinner"></div>
        <span>正在搜索更多图片...</span>
        <button id="stopCollectionBtn" class="action-btn" style="margin-left: 10px; height: 24px; padding: 0 8px; font-size: 12px;">停止</button>
      `;
      
      // 添加到页面
      const header = document.querySelector('.header');
      if (header) {
        header.appendChild(statusIndicator);
      }
    } else {
      // 如果之前被隐藏，现在显示
      statusIndicator.style.display = 'flex';
    }

    // 添加停止按钮事件监听器
    const stopBtn = document.getElementById('stopCollectionBtn');
    if (stopBtn) {
      stopBtn.onclick = () => {
        this.stopCollection();
      };
    }
    
    statusIndicator.style.display = 'flex';
  }

  /**
   * 隐藏收集状态
   */
  hideCollectingStatus() {
    const statusIndicator = document.getElementById('collectingMoreStatus');
    if (statusIndicator) {
      statusIndicator.style.display = 'none';
    }
  }

  /**
   * 检查是否正在收集
   */
  getIsCollecting() {
    return this.isCollecting;
  }

  /**
   * 重启收集过程
   */
  restartCollection() {
    console.log('重启图片收集');
    this.stopCollection();  // 先停止现有的
    // 短暂延迟后启动新的收集
    setTimeout(() => {
      this.startCollection();
    }, 500);
  }

  /**
   * 销毁管理器，清理资源
   */
  destroy() {
    this.stopCollection();
  }
}

// 导出模块
export default ImageCollectionManager;

// 兼容CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageCollectionManager;
  module.exports.default = ImageCollectionManager;
}

// 兼容浏览器环境
if (typeof window !== 'undefined') {
  window.ImageCollectionManager = ImageCollectionManager;
}