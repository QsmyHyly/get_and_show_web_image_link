// 树形缓存容器实现
class TreeNode {
  constructor(name) {
    this.name = name;
    this.children = {};
  }

  addChild(node) {
    this.children[node.name] = node;
  }

  getChild(name) {
    return this.children[name];
  }
}

class CacheLeafNode extends TreeNode {
  constructor(name) {
    super(name);
    this.cache = null;
  }

  setCache(data) {
    this.cache = data;
  }

  getCache() {
    return this.cache;
  }

  clearCache() {
    this.cache = null;
  }
}

// 日志函数
function log(message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  if (data) {
    console.log(`[网页图片链接获取器][Display][${timestamp}] ${message}`, data);
  } else {
    console.log(`[网页图片链接获取器][Display][${timestamp}] ${message}`);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  log('显示页面已加载');
  const imageGrid = document.getElementById('imageGrid');
  const imageCount = document.getElementById('imageCount');
  const sortOptions = document.getElementById('sortOptions');
  const sortOrder = document.getElementById('sortOrder');
  const sortButton = document.getElementById('sortButton');
  const sizeModeContainer = document.getElementById('sizeModeContainer');
  
  // 初始化sizeMode显示状态
  if (sortOptions.value === 'default') {
    sizeModeContainer.style.display = 'none';
  }
  
  // 存储图片大小信息的Map
  const imageSizeMap = new Map();
  const downloadAllBtn = document.getElementById('downloadAll');
  const copyAllBtn = document.getElementById('copyAll');
  
  // 状态显示元素
  const statusDiv = document.createElement('div');
  statusDiv.id = 'status';
  statusDiv.style.margin = '10px 0';
  statusDiv.style.textAlign = 'center';
  document.querySelector('.controls').appendChild(statusDiv);
  
  // 模态框元素
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  const modalCaption = document.getElementById('modalCaption');
  const closeBtn = document.querySelector('.close');
  const downloadImageBtn = document.getElementById('downloadImage');
  const copyLinkBtn = document.getElementById('copyLink');
  const openInNewTabBtn = document.getElementById('openInNewTab');
  
  let originalImages = []; // 保存原始接收到的图片URL数组
  let largeImages = [];
  let smallImages = [];
  let filteredImages = [];
  let currentSizeMode = 'large'; // 'large', 'small', 'all'
  const MIN_IMAGE_SIZE = 10000; // 100x100像素以下的视为小图片
  
  // 初始化缓存树
  const cacheTree = new TreeNode('root');
  const sortCache = new CacheLeafNode('sortCache');
  cacheTree.addChild(sortCache);

  // 从存储中获取图片链接
  log('开始从存储中获取图片链接');
  
  // 监听来自background的更新消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateImages") {
      log(`收到更新图片消息，共 ${request.imageUrls.length} 张图片`);
      // 清空所有缓存
      sortCache.clearCache();
      
      // 接收所有图片链接并保存原始数组
      const allImages = request.imageUrls;
      originalImages = [...allImages]; // 保存原始数组的副本
      
      // 清空现有图片
      largeImages = [];
      smallImages = [];
      
      // 开始检测图片大小并分类
      log('开始检测图片大小并分类');
      statusDiv.textContent = '正在检测图片大小...';
      
      // 创建一个计数器来跟踪已处理的图片数量
      let processedCount = 0;
      
      // 对每个图片进行大小检测
      allImages.forEach(url => {
        checkImageSize(url).then(size => {
          processedCount++;
          
          // 根据大小分类
          if (size >= MIN_IMAGE_SIZE) {
            largeImages.push(url);
          } else {
            smallImages.push(url);
          }
          
          // 更新状态
          statusDiv.textContent = `正在检测图片大小... (${processedCount}/${allImages.length})`;
          
          // 当所有图片都处理完毕时，更新显示
          if (processedCount === allImages.length) {
            log(`图片分类完成：${largeImages.length} 张大图，${smallImages.length} 张小图`);
            statusDiv.textContent = `图片分类完成：${largeImages.length} 张大图，${smallImages.length} 张小图`;
            
            // 根据当前模式设置显示内容
            updateFilteredImages();
            imageCount.textContent = `已加载 ${largeImages.length + smallImages.length} 张图片`;
            displayImages(filteredImages);
          }
        });
      });
    }
  });
  
  chrome.storage.local.get(['imageUrls'], function(result) {
    log('从存储中获取的数据', result);
    
    if (result.imageUrls && result.imageUrls.length > 0) {
      log(`找到 ${result.imageUrls.length} 个图片链接`);
      
      // 接收所有图片链接并保存原始数组
      const allImages = result.imageUrls;
      originalImages = [...allImages]; // 保存原始数组的副本
      
      // 清空现有图片
      largeImages = [];
      smallImages = [];
      
      // 开始检测图片大小并分类
      log('开始检测图片大小并分类');
      statusDiv.textContent = '正在检测图片大小...';
      
      // 创建一个计数器来跟踪已处理的图片数量
      let processedCount = 0;
      
      // 对每个图片进行大小检测
      allImages.forEach(url => {
        checkImageSize(url).then(size => {
          processedCount++;
          
          // 根据大小分类
          if (size >= MIN_IMAGE_SIZE) {
            largeImages.push(url);
          } else {
            smallImages.push(url);
          }
          
          // 更新状态
          statusDiv.textContent = `正在检测图片大小... (${processedCount}/${allImages.length})`;
          
          // 当所有图片都处理完毕时，更新显示
          if (processedCount === allImages.length) {
            log(`图片分类完成：${largeImages.length} 张大图，${smallImages.length} 张小图`);
            statusDiv.textContent = `图片分类完成：${largeImages.length} 张大图，${smallImages.length} 张小图`;
            
            // 根据当前模式设置显示内容
            updateFilteredImages();
            imageCount.textContent = `已加载 ${largeImages.length + smallImages.length} 张图片`;
            displayImages(filteredImages);
          }
        });
      });
    } else {
      log('没有找到图片链接');
      imageGrid.innerHTML = '<div class="no-images">没有找到图片</div>';
      imageCount.textContent = '已加载 0 张图片';
    }
  });
  
  // 根据当前模式更新filteredImages数组
  function updateFilteredImages(useOriginal = false) {
    if (useOriginal && originalImages.length > 0) {
      log('使用原始图片数组进行显示');
      filteredImages = [...originalImages];
    } else {
      // 根据当前大小模式过滤
      switch (currentSizeMode) {
        case 'large':
          filteredImages = [...largeImages];
          break;
        case 'small':
          filteredImages = [...smallImages];
          break;
        case 'all':
          filteredImages = [...largeImages, ...smallImages];
          break;
      }
    }
    log('更新过滤后的图片数组', {
      mode: useOriginal ? 'original' : currentSizeMode,
      count: filteredImages.length
    });
  }

  // 显示图片
  function displayImages(images) {
    log(`开始显示 ${images.length} 张图片`);
    imageGrid.innerHTML = '';
    
    if (images.length === 0) {
      log('没有图片可显示');
      imageGrid.innerHTML = '<div class="no-images">没有找到匹配的图片</div>';
      return;
    }
    
    images.forEach((url, index) => {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'image-container';
      
      const img = document.createElement('img');
      img.src = url;
      img.alt = `图片 ${index + 1}`;
      img.loading = 'lazy'; // 懒加载
      
      // 图片加载错误处理
      img.onerror = function() {
        log('图片加载失败', url);
        this.onerror = null;
        this.src = 'images/error.png'; // 替换为错误占位图
        this.alt = '加载失败';
        this.classList.add('error');
      };
      
      // 图片信息
      const imgInfo = document.createElement('div');
      imgInfo.className = 'image-info';
      
      // 提取文件名或域名
      let imgName;
      try {
        const urlObj = new URL(url);
        imgName = urlObj.pathname.split('/').pop() || urlObj.hostname;
      } catch (e) {
        imgName = url.split('/').pop() || '未知图片';
      }
      
      imgInfo.textContent = imgName;
      
      // 点击图片打开模态框
      img.addEventListener('click', () => {
        log('点击图片，打开模态框', url);
        modalImg.src = url;
        modalCaption.textContent = url;
        modal.style.display = 'block';
        
        // 设置当前图片URL到模态框按钮
        downloadImageBtn.setAttribute('data-url', url);
        copyLinkBtn.setAttribute('data-url', url);
        openInNewTabBtn.setAttribute('data-url', url);
      });
      
      imgContainer.appendChild(img);
      imgContainer.appendChild(imgInfo);
      imageGrid.appendChild(imgContainer);
    });
  }
  
  // 关闭模态框
  closeBtn.addEventListener('click', () => {
    log('关闭模态框');
    modal.style.display = 'none';
  });
  
  // 点击模态框外部关闭
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      log('点击模态框外部关闭');
      modal.style.display = 'none';
    }
  });
  
  // 下载单张图片
  downloadImageBtn.addEventListener('click', () => {
    const url = downloadImageBtn.getAttribute('data-url');
    log('点击下载单张图片', url);
    if (url) {
      downloadImage(url);
    }
  });
  
  // 复制单张图片链接
  copyLinkBtn.addEventListener('click', () => {
    const url = copyLinkBtn.getAttribute('data-url');
    log('点击复制单张图片链接', url);
    if (url) {
      copyToClipboard(url);
      alert('链接已复制到剪贴板');
    }
  });
  
  // 在新标签页打开图片
  openInNewTabBtn.addEventListener('click', () => {
    const url = openInNewTabBtn.getAttribute('data-url');
    log('在新标签页打开图片', url);
    if (url) {
      window.open(url, '_blank');
    }
  });
  
  // 下载所有图片
  downloadAllBtn.addEventListener('click', () => {
    log('点击下载所有图片按钮');
    
    if (filteredImages.length === 0) {
      log('没有可下载的图片');
      alert('没有可下载的图片');
      return;
    }
    
    if (filteredImages.length > 10) {
      log(`准备下载 ${filteredImages.length} 张图片，显示确认对话框`);
      const confirm = window.confirm(`确定要下载 ${filteredImages.length} 张图片吗？这可能需要一些时间。`);
      if (!confirm) {
        log('用户取消了批量下载');
        return;
      }
    }
    
    log(`开始批量下载 ${filteredImages.length} 张图片`);
    filteredImages.forEach((url, index) => {
      // 延迟下载，避免浏览器阻止批量下载
      setTimeout(() => {
        log(`下载第 ${index + 1} 张图片`, url);
        downloadImage(url);
      }, index * 300);
    });
  });
  
  // 复制所有链接
  copyAllBtn.addEventListener('click', () => {
    log('点击复制所有链接按钮');
    
    if (filteredImages.length === 0) {
      log('没有可复制的链接');
      alert('没有可复制的链接');
      return;
    }
    
    const links = filteredImages.join('\n');
    log(`复制 ${filteredImages.length} 个链接到剪贴板`);
    copyToClipboard(links);
    alert(`已复制 ${filteredImages.length} 个链接到剪贴板`);
  });
  

  
  // 检查图片大小并分类（异步）
  async function checkImageSize(url) {
    if (imageSizeMap.has(url)) {
      return imageSizeMap.get(url);
    }
    
    try {
      const size = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // 计算图片大小（宽 x 高）
          const size = img.naturalWidth * img.naturalHeight || 10000;
          log(`图片大小检测: ${url} - ${img.naturalWidth}x${img.naturalHeight} = ${size}`);
          imageSizeMap.set(url, size);
          resolve(size);
        };
        img.onerror = () => {
          log('获取图片大小失败', url);
          resolve(0); // 无法获取大小的图片排到最后
        };
        img.src = url;
      });
      return size;
    } catch (e) {
      log('获取图片大小异常', e);
      return 0;
    }
  }

  // 带缓存的排序算法
  async function sortImagesBySize() {
    // 检查缓存
    const cacheKey = `size_${sortOrder.value}`;
    const cachedResult = sortCache.getCache()?.[cacheKey];
    if (cachedResult) {
      log('使用缓存排序结果');
      filteredImages = cachedResult;
      return;
    }

    // 无缓存则执行排序
    log('无缓存，执行实际排序');
    const order = sortOrder.value === 'asc' ? 1 : -1;
    log('开始按大小排序', {
      order: order === 1 ? '从小到大' : '从大到小',
      imageCount: filteredImages.length
    });
    
    // 进度更新计数器
    let progressCounter = 0;
    const progressInterval = setInterval(() => {
      progressCounter++;
      statusDiv.textContent = `正在获取图片大小 (${progressCounter})...`;
    }, 500);
    
    // 为每个URL获取大小并创建排序数组
    const sizePromises = filteredImages.map(url => checkImageSize(url));
    const sizes = await Promise.all(sizePromises);
    
    // 创建包含URL和size的对象数组
    const imageData = filteredImages.map((url, index) => ({
      url,
      size: sizes[index]
    }));
    
    // 使用稳定排序算法
    imageData.sort((a, b) => {
      if (a.size === b.size) {
        // 保持原始顺序
        return filteredImages.indexOf(a.url) - filteredImages.indexOf(b.url);
      }
      return order * (a.size - b.size);
    });
    
    clearInterval(progressInterval);
    
    // 提取排序后的URL
    filteredImages = imageData.map(item => item.url);
    
    // 保存到缓存
    if (!sortCache.getCache()) {
      sortCache.setCache({});
    }
    sortCache.getCache()[cacheKey] = filteredImages;
    
    log('按大小排序完成并缓存', {
      firstImage: filteredImages[0],
      lastImage: filteredImages[filteredImages.length - 1]
    });
  }

  // 初始化UI状态
  sortButton.disabled = false;
  const sizeModeToggle = document.getElementById('sizeModeToggle');
  const sizeModeText = document.getElementById('sizeModeText');
  
  // 大小图片模式切换
  const sizeMode = document.getElementById('sizeMode');
  sizeMode.addEventListener('change', function() {
    currentSizeMode = this.value;
    log('切换图片显示模式', currentSizeMode);
    
    // 如果当前是默认排序，则使用原始数组
    const isDefaultSort = sortOptions.value === 'default';
    updateFilteredImages(isDefaultSort);
    displayImages(filteredImages);
  });
  sortOrder.style.display = sortOptions.value === 'size' ? 'inline-block' : 'none';
  
  // 排序选项变更监听
  sortOptions.addEventListener('change', function() {
    log('排序类型变更', this.value);
    
    // 显示/隐藏大小筛选器和排序方向选择器
    if (this.value === 'default') {
      sizeModeContainer.style.display = 'none';
      sortOrder.style.display = 'none';
    } else {
      sizeModeContainer.style.display = 'inline-block';
      sortOrder.style.display = this.value === 'size' ? 'inline-block' : 'none';
    }
    
    // 根据选择的排序类型执行相应操作
    if (this.value === 'size' || this.value === 'type') {
      sortButton.click();
    } else if (this.value === 'default') {
      // 默认排序时使用原始图片数组
      updateFilteredImages(true); // 传入true表示使用原始数组
      displayImages(filteredImages);
      statusDiv.textContent = '已恢复默认排序（原始顺序）';
    }
  });
  
  // 排序方向变更监听
  sortOrder.addEventListener('change', function() {
    log('排序方向变更', this.value);
    if (sortOptions.value === 'size') {
      sortButton.click();
    }
  });
  
  // 排序按钮点击事件
  sortButton.addEventListener('click', async () => {
    log('开始排序图片', {
      sortType: sortOptions.value,
      sortOrder: sortOrder.value
    });
    statusDiv.textContent = '正在排序图片...';
    sortButton.disabled = true;
    sortOptions.disabled = true;
    sortOrder.disabled = true;
    
    // 记录当前时间用于性能调试
    const startTime = performance.now();
    
    try {
      const sortType = sortOptions.value;
      log('排序类型', sortType);
      
      // 在排序前先根据当前模式更新过滤后的图片
      updateFilteredImages(sortType === 'default');
      
      switch (sortType) {
        case 'size':
          await sortImagesBySize();
          break;
        case 'type':
          filteredImages.sort((a, b) => {
            const typeA = a.split('.').pop().toLowerCase();
            const typeB = b.split('.').pop().toLowerCase();
            return typeA.localeCompare(typeB);
          });
          break;
        case 'default':
          // 默认排序时使用原始图片数组
          // updateFilteredImages(true) 已经在上面调用
          break;
        default:
          break;
      }
      
      displayImages(filteredImages);
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      log('排序完成', {
        sortType: sortOptions.value,
        sortOrder: sortOrder.value,
        duration: `${duration}ms`,
        imageCount: filteredImages.length
      });
      
      statusDiv.textContent = `排序完成 (${sortOrder.value === 'asc' ? '从小到大' : '从大到小'}) - 耗时 ${duration}ms`;
    } catch (e) {
      log('排序出错', {
        error: e,
        stack: e.stack
      });
      statusDiv.textContent = '排序失败: ' + e.message;
    } finally {
      sortButton.disabled = false;
      sortOptions.disabled = false;
      sortOrder.disabled = false;
    }
  });
  
  // 下载图片函数
  function downloadImage(url) {
    log('下载图片', url);
    
    // 创建一个隐藏的a标签来下载
    const a = document.createElement('a');
    a.href = url;
    
    // 提取文件名
    let filename;
    try {
      filename = new URL(url).pathname.split('/').pop();
    } catch (e) {
      filename = url.split('/').pop();
    }
    
    // 如果没有文件名或扩展名，添加默认值
    if (!filename || filename.indexOf('.') === -1) {
      filename = 'image.jpg';
    }
    
    log('下载文件名', filename);
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  
  // 复制到剪贴板函数
  function copyToClipboard(text) {
    log('复制到剪贴板', text.length + ' 字符');
    
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    
    const success = document.execCommand('copy');
    log('复制结果', success ? '成功' : '失败');
    
    document.body.removeChild(textarea);
  }
});