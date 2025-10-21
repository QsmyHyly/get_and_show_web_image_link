/**
 * 结果页面脚本
 * 显示从网页获取的图片链接，提供搜索、过滤和下载功能
 */

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const pageTitle = document.getElementById('pageTitle');
  const pageUrl = document.getElementById('pageUrl');
  const imageCount = document.getElementById('imageCount');
  const searchBox = document.getElementById('searchBox');
  const gridViewBtn = document.getElementById('gridViewBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const deselectAllBtn = document.getElementById('deselectAllBtn');
  const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const noImages = document.getElementById('noImages');
  const imageGrid = document.getElementById('imageGrid');
  const toast = document.getElementById('toast');
  
  // 状态变量
  let allImages = [];
  let filteredImages = [];
  let currentView = 'grid'; // 'grid' 或 'list'
  let isCollectingMore = false;
  let updateInterval = null;
  let lastUpdated = 0;
  
  // 初始化
  init();
  
  /**
   * 初始化函数
   */
  function init() {
    // 从存储中获取图片数据
    loadImagesFromStorage();
    
    // 添加事件监听器
    setupEventListeners();
  }
  
  /**
   * 获取图片的详细信息（大小、格式等）
   * @param {Array} images 需要获取信息的图片数组
   */
  function fetchImageDetails(images) {
    images.forEach(image => {
      // 从URL中提取图片格式
      const url = image.url;
      const formatMatch = url.match(/\.([^.]+)(?:[?#]|$)/i);
      image.format = formatMatch ? formatMatch[1].toLowerCase() : 'unknown';
      
      // 标记图片信息加载状态
      image.detailsLoaded = false;
      
      // 使用Image对象异步获取图片大小
      const imgObj = new Image();
      
      // 设置超时处理
      const timeout = setTimeout(() => {
        image.width = 0;
        image.height = 0;
        image.size = '未知';
        image.detailsLoaded = true;
        
        // 更新对应图片的DOM显示
        updateImageDetailsInDOM(image.id, image);
      }, 5000); // 5秒超时
      
      imgObj.onload = function() {
        clearTimeout(timeout); // 清除超时
        
        // 添加图片尺寸信息
        image.width = this.width;
        image.height = this.height;
        image.aspectRatio = this.width / this.height;
        
        // 估算图片大小（实际大小需要通过fetch获取，这里只做估算）
        // 简单估算：假设平均每像素3字节（RGB）
        const estimatedSizeInBytes = this.width * this.height * 3;
        if (estimatedSizeInBytes < 1024) {
          image.size = estimatedSizeInBytes + ' B';
        } else if (estimatedSizeInBytes < 1024 * 1024) {
          image.size = (estimatedSizeInBytes / 1024).toFixed(2) + ' KB';
        } else {
          image.size = (estimatedSizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
        
        image.detailsLoaded = true;
        
        // 更新对应图片的DOM显示
        updateImageDetailsInDOM(image.id, image);
      };
      
      imgObj.onerror = function() {
        clearTimeout(timeout); // 清除超时
        image.width = 0;
        image.height = 0;
        image.size = '加载失败';
        image.detailsLoaded = true;
        
        // 更新对应图片的DOM显示
        updateImageDetailsInDOM(image.id, image);
      };
      
      // 启用跨域支持
      imgObj.crossOrigin = 'anonymous';
      imgObj.src = url;
    });
  }
  
  /**
   * 更新DOM中图片的详细信息显示
   * @param {string} imageId 图片ID
   * @param {Object} image 包含详细信息的图片对象
   */
  function updateImageDetailsInDOM(imageId, image) {
    const imageItem = document.querySelector(`.image-item[data-id="${imageId}"]`);
    if (!imageItem) return;
    
    // 检查是否已有详细信息容器
    let detailsContainer = imageItem.querySelector('.image-details');
    
    if (!detailsContainer) {
      // 创建详细信息容器
      detailsContainer = document.createElement('div');
      detailsContainer.className = 'image-details';
      
      // 找到图片信息容器并插入详细信息
      const imageInfo = imageItem.querySelector('.image-info');
      if (imageInfo) {
        imageInfo.appendChild(detailsContainer);
      }
    }
    
    // 更新详细信息内容
    if (image.detailsLoaded) {
      detailsContainer.textContent = `${image.width}×${image.height} · ${image.format.toUpperCase()} · ${image.size}`;
    } else {
      detailsContainer.textContent = '加载中...';
    }
  }
  
  /**
   * 从存储中加载图片数据
   */
  function loadImagesFromStorage() {
    chrome.storage.local.get(['imageUrls', 'pageTitle', 'pageUrl', 'isCollectingMore', 'lastUpdated'], function(data) {
      // 更新页面信息
      pageTitle.textContent = data.pageTitle || '未知页面';
      pageUrl.textContent = data.pageUrl || '';
      
      // 检查是否有图片数据
      if (data.imageUrls && data.imageUrls.length > 0) {
        // 更新最后更新时间和收集状态
        isCollectingMore = data.isCollectingMore || false;
        lastUpdated = data.lastUpdated || Date.now();
        
        // 合并新的图片到现有列表，避免重复
        const newUrls = data.imageUrls.filter(url => !allImages.some(img => img.url === url));
        
        // 如果有新图片，添加到列表
        if (newUrls.length > 0) {
          const newImages = newUrls.map(url => ({
            url: url,
            selected: false,
            id: generateId()
          }));
          
          allImages = [...allImages, ...newImages];
          filteredImages = [...allImages];
          
          // 更新计数并重新渲染
          imageCount.textContent = allImages.length;
          renderImages();
          
          // 异步获取新图片的详细信息
          fetchImageDetails(newImages);
        }
        
        // 如果正在收集更多图片，启动定期更新
        if (isCollectingMore) {
          showCollectingMoreStatus();
          startUpdateInterval();
        } else {
          hideCollectingMoreStatus();
          stopUpdateInterval();
        }
        
        // 隐藏加载动画
        loadingSpinner.style.display = 'none';
        noImages.style.display = 'none';
      } else {
        // 没有找到图片
        loadingSpinner.style.display = 'none';
        noImages.style.display = 'block';
        
        // 停止更新间隔
        stopUpdateInterval();
      }
    });
  }
  
  /**
   * 显示正在收集更多图片的状态
   */
  function showCollectingMoreStatus() {
    // 检查是否已有状态指示器
    let statusIndicator = document.getElementById('collectingMoreStatus');
    
    if (!statusIndicator) {
      // 创建新的状态指示器
      statusIndicator = document.createElement('div');
      statusIndicator.id = 'collectingMoreStatus';
      statusIndicator.className = 'collecting-status';
      statusIndicator.innerHTML = '<div class="spinner"></div><span>正在搜索更多图片...</span>';
      
      // 添加到页面
      const header = document.querySelector('.header');
      header.appendChild(statusIndicator);
    }
    
    statusIndicator.style.display = 'flex';
  }
  
  /**
   * 隐藏正在收集更多图片的状态
   */
  function hideCollectingMoreStatus() {
    const statusIndicator = document.getElementById('collectingMoreStatus');
    if (statusIndicator) {
      statusIndicator.style.display = 'none';
    }
  }
  
  /**
   * 启动定期更新图片列表的间隔
   */
  function startUpdateInterval() {
    // 如果已经有间隔在运行，先清除
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    
    // 每2秒检查一次更新
    updateInterval = setInterval(() => {
      loadImagesFromStorage();
    }, 2000);
  }
  
  /**
   * 停止定期更新图片列表的间隔
   */
  function stopUpdateInterval() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }
  
  /**
   * 设置事件监听器
   */
  function setupEventListeners() {
    // 搜索框
    searchBox.addEventListener('input', function() {
      filterImages();
    });
    
    // 视图切换按钮
    gridViewBtn.addEventListener('click', function() {
      setView('grid');
    });
    
    listViewBtn.addEventListener('click', function() {
      setView('list');
    });
    
    // 选择按钮
    selectAllBtn.addEventListener('click', function() {
      selectAll(true);
    });
    
    deselectAllBtn.addEventListener('click', function() {
      selectAll(false);
    });
    
    // 下载选中按钮
    downloadSelectedBtn.addEventListener('click', function() {
      downloadSelected();
    });
    
    // 复制所有URL按钮
    copyAllBtn.addEventListener('click', function() {
      copyAllUrls();
    });
    
    // 当新的图片被加载时，自动更新页面
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace === 'local' && changes.imageUrls) {
        loadImagesFromStorage();
      }
    });
    
    // 监听DOM变化，当新的图片项被添加到网格中时，确保它们有详细信息
    const observer = new MutationObserver(function(mutations) {
      // 检查是否有图片需要获取详情
      fetchDetailsForExistingImages();
    });
    
    observer.observe(imageGrid, { childList: true, subtree: true });
  }
  
  /**
   * 生成唯一ID
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  /**
   * 为已加载但缺少详细信息的图片获取详情
   */
  function fetchDetailsForExistingImages() {
    // 查找所有未获取过详情的图片
    const imagesWithoutDetails = allImages.filter(img => !('detailsLoaded' in img));
    
    if (imagesWithoutDetails.length > 0) {
      // 异步获取这些图片的详细信息
      fetchImageDetails(imagesWithoutDetails);
    }
  }
  
  /**
   * 渲染图片
   */
  function renderImages() {
    // 清空容器
    imageGrid.innerHTML = '';
    
    // 设置视图类
    imageGrid.className = currentView === 'grid' ? 'image-grid' : 'image-grid list-view';
    
    // 渲染每个图片
    filteredImages.forEach(image => {
      const imageItem = createImageItem(image);
      imageGrid.appendChild(imageItem);
    });
    
    // 更新图片计数
    imageCount.textContent = filteredImages.length;
    
    // 为现有图片获取详情
    fetchDetailsForExistingImages();
  }
  
  /**
   * 创建图片项
   */
  function createImageItem(image) {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.dataset.id = image.id;
    
    // 创建公共元素
    
    // 图片容器
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';
    
    // 图片元素
    const img = document.createElement('img');
    img.src = image.url;
    img.alt = '图片';
    img.loading = 'lazy';
    img.onerror = function() {
      // 图片加载失败时显示占位符
      this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSI+5Zu+54mH5aS0PC90ZXh0Pjwvc3ZnPg==';
    };
    
    imageContainer.appendChild(img);
    
    // URL显示
    const urlContainer = document.createElement('div');
    urlContainer.className = 'image-url';
    urlContainer.textContent = image.url;
    
    // 展开/收起按钮
    const toggleUrl = document.createElement('span');
    toggleUrl.className = 'toggle-url';
    toggleUrl.textContent = image.url.length > 50 ? '展开' : '';
    toggleUrl.addEventListener('click', function() {
      urlContainer.classList.toggle('expanded');
      toggleUrl.textContent = urlContainer.classList.contains('expanded') ? '收起' : '展开';
    });
    
    urlContainer.appendChild(toggleUrl);
    
    // 复选框
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = image.selected;
    checkbox.addEventListener('change', function() {
      const imgData = allImages.find(img => img.id === image.id);
      if (imgData) {
        imgData.selected = this.checked;
      }
    });
    
    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'image-actions';
    
    // 复制URL按钮
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制URL';
    copyBtn.addEventListener('click', function() {
      copyToClipboard(image.url);
    });
    
    // 在新标签页打开按钮
    const openBtn = document.createElement('button');
    openBtn.textContent = '打开';
    openBtn.addEventListener('click', function() {
      window.open(image.url, '_blank');
    });
    
    actions.appendChild(copyBtn);
    actions.appendChild(openBtn);
    
    // 根据当前视图模式组装元素
    if (currentView === 'list') {
      // 列表视图：复选框 -> 图片 -> URL -> 操作按钮
      item.appendChild(checkbox);
      item.appendChild(imageContainer);
      
      // 创建一个容器放置URL和操作按钮
      const imageInfo = document.createElement('div');
      imageInfo.className = 'image-info';
      
      // URL部分 - 确保URL容器使用flex布局以支持水平排列
      urlContainer.style.display = 'flex';
      urlContainer.style.alignItems = 'center';
      imageInfo.appendChild(urlContainer);
      
      // 操作按钮部分
      actions.style.display = 'flex';
      actions.style.alignItems = 'center';
      imageInfo.appendChild(actions);
      
      item.appendChild(imageInfo);
    } else {
      // 网格视图：保持原结构
      const imageInfo = document.createElement('div');
      imageInfo.className = 'image-info';
      imageInfo.appendChild(urlContainer);
      
      // 在网格视图中，将复选框放在actions里
      const gridActions = document.createElement('div');
      gridActions.className = 'image-actions';
      gridActions.appendChild(checkbox);
      gridActions.appendChild(copyBtn);
      gridActions.appendChild(openBtn);
      
      imageInfo.appendChild(gridActions);
      
      item.appendChild(imageContainer);
      item.appendChild(imageInfo);
    }
    
    return item;
  }
  
  /**
   * 过滤图片
   */
  function filterImages() {
    const searchTerm = searchBox.value.toLowerCase().trim();
    
    if (!searchTerm) {
      filteredImages = [...allImages];
    } else {
      filteredImages = allImages.filter(image => 
        image.url.toLowerCase().includes(searchTerm)
      );
    }
    
    renderImages();
  }
  
  /**
   * 设置视图模式
   */
  function setView(view) {
    currentView = view;
    
    // 更新按钮状态
    if (view === 'grid') {
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
    } else {
      gridViewBtn.classList.remove('active');
      listViewBtn.classList.add('active');
    }
    
    // 重新渲染
    renderImages();
  }
  
  /**
   * 全选或取消全选
   */
  function selectAll(select) {
    allImages.forEach(image => {
      image.selected = select;
    });
    
    // 更新复选框状态
    document.querySelectorAll('.image-item input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = select;
    });
  }
  
  /**
   * 下载选中的图片
   */
  function downloadSelected() {
    const selectedImages = allImages.filter(image => image.selected);
    
    if (selectedImages.length === 0) {
      showToast('请先选择要下载的图片');
      return;
    }
    
    // 显示下载开始的提示
    showToast(`开始下载 ${selectedImages.length} 个图片...`);
    
    // 逐个下载图片
    let downloadedCount = 0;
    
    selectedImages.forEach((image, index) => {
      // 创建下载图片的函数
      const downloadImage = (url, index) => {
        // 获取文件名
        let filename = url.split('/').pop();
        // 如果URL没有文件名，使用索引作为文件名
        if (!filename || filename.includes('?')) {
          filename = `image_${Date.now()}_${index}.jpg`;
        }
        
        // 使用fetch获取图片数据
        fetch(url, {
          mode: 'cors', // 启用跨域请求
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`无法下载图片: ${url}`);
          }
          return response.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          
          // 创建下载链接
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // 释放URL对象
          URL.revokeObjectURL(url);
          
          downloadedCount++;
          
          // 当所有图片都下载完成时显示提示
          if (downloadedCount === selectedImages.length) {
            showToast(`已成功下载 ${downloadedCount} 个图片`);
          }
        })
        .catch(error => {
          console.error('下载图片失败:', error);
          downloadedCount++;
          
          // 即使有错误，也检查是否所有图片都已处理
          if (downloadedCount === selectedImages.length) {
            showToast(`下载完成，但有 ${selectedImages.length - downloadedCount} 个图片下载失败`);
          }
        });
      };
      
      // 为了避免浏览器限制，添加延迟
      setTimeout(() => {
        downloadImage(image.url, index);
      }, index * 300);
    });
  }
  
  /**
   * 复制所有URL
   */
  function copyAllUrls() {
    const urls = filteredImages.map(image => image.url).join('\n');
    copyToClipboard(urls, '已复制所有图片URL');
  }
  
  /**
   * 复制到剪贴板
   */
  function copyToClipboard(text, successMessage = '已复制到剪贴板') {
    // 创建临时文本区域
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      // 尝试使用现代API
      document.execCommand('copy');
      showToast(successMessage);
    } catch (err) {
      console.error('复制失败:', err);
      showToast('复制失败，请手动复制');
    }
    
    // 移除临时文本区域
    document.body.removeChild(textarea);
  }
  
  /**
   * 显示提示消息
   */
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    // 3秒后隐藏
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
});