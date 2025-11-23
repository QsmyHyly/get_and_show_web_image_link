import { categorizeByFileType, categorizeByDomain, sortByDimensions } from './ImageProcessor.js';
import Image from './Image.js';
import cacheManager from './CacheManager.js';
import ImageCollectionManager from './ImageCollectionManager.js';

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
  const categorySelect = document.getElementById('categorySelect');
  const sortSelect = document.getElementById('sortSelect');
  
  // 状态变量
  let allImages = [];
  let filteredImages = [];
  let currentView = 'grid'; // 'grid' 或 'list'
  let currentCategory = 'none';
  let currentSort = 'default';
  let isCollectingMore = false;
  let lastUpdated = 0;
  let imageCollectionManager = null;
  
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
    const batchSize = 10;
    let currentIndex = 0;

    function processBatch() {
      const batch = images.slice(currentIndex, currentIndex + batchSize);
      if (batch.length === 0) {
        return;
      }

      batch.forEach(image => {
        // 从URL中提取图片格式
        const url = image.url;
        const formatMatch = url.match(/\.([^.]+)(?:[?#]|$)/i);
        image.format = formatMatch ? formatMatch[1].toLowerCase() : 'unknown';
        
        // 标记图片信息加载状态
        image.detailsLoaded = false;
        
        // 使用Image对象异步获取图片大小
        const imgObj = new Image(url);
        
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

      currentIndex += batchSize;
      setTimeout(processBatch, 500); // 每500毫秒处理下一批
    }

    processBatch();
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
          // 清理缓存，因为数据已更新
          cacheManager.clearAllCaches();

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
        
        // 如果正在收集更多图片，使用新的管理器启动收集
        if (isCollectingMore) {
          if (!imageCollectionManager) {
            imageCollectionManager = new ImageCollectionManager(
              handleImagesUpdate,  // 图片更新回调
              loadImagesFromStorage  // 加载图片函数
            );
          }
          imageCollectionManager.startCollection();
        } else {
          if (imageCollectionManager) {
            imageCollectionManager.stopCollection();
          }
        }
        
        // 隐藏加载动画
        loadingSpinner.style.display = 'none';
        noImages.style.display = 'none';
      } else {
        // 没有找到图片
        loadingSpinner.style.display = 'none';
        noImages.style.display = 'block';
        
        // 停止收集（如果正在运行）
        if (imageCollectionManager) {
          imageCollectionManager.stopCollection();
        }
      }
    });
  }
  
  /**
   * 图片更新回调函数
   * 当ImageCollectionManager检测到新图片时调用
   */
  function handleImagesUpdate(data) {
    // 更新页面信息
    pageTitle.textContent = data.pageTitle || '未知页面';
    pageUrl.textContent = data.pageUrl || '';
    
    // 检查是否有图片数据
    if (data.imageUrls && data.imageUrls.length > 0) {
      // 合并新的图片到现有列表，避免重复
      const newUrls = data.imageUrls.filter(url => !allImages.some(img => img.url === url));
      
      // 如果有新图片，添加到列表
      if (newUrls.length > 0) {
        // 清理缓存，因为数据已更新
        cacheManager.clearAllCaches();

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
    }
  }
  
  /**
   * 设置事件监听器
   */
  function setupEventListeners() {
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    // 搜索框
    searchBox.addEventListener('input', debounce(function() {
        filterImages();
    }, 300));

    // 分类选择
    categorySelect.addEventListener('change', function() {
      currentCategory = this.value;
      renderImages();
    });

    // 排序选择
    sortSelect.addEventListener('change', function() {
      currentSort = this.value;
      renderImages();
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
    
    // 打包下载ZIP按钮
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    downloadZipBtn.addEventListener('click', function() {
      downloadZip();
    });
    
    // 新标签页打开按钮
    const openInNewTabBtn = document.getElementById('openInNewTabBtn');
    openInNewTabBtn.addEventListener('click', function() {
      openSelectedInNewTabs();
    });
    
    // 复制所有URL按钮
    copyAllBtn.addEventListener('click', function() {
      copyAllUrls();
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
    const fragment = document.createDocumentFragment();
    
    // 设置视图类
    imageGrid.className = currentView === 'grid' ? 'image-grid' : 'image-grid list-view';
    
    let imagesToRender = filteredImages;

    // 排序
    imagesToRender = sortImages(imagesToRender);

    if (currentCategory !== 'none') {
      const imageInstances = imagesToRender.map(img => new Image(img.url, img.id));
      let categories;
      if (currentCategory === 'fileType') {
        categories = categorizeByFileType(imageInstances);
      } else if (currentCategory === 'domain') {
        categories = categorizeByDomain(imageInstances);
      }

      for (const category in categories) {
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'category-container';

        const categoryHeader = document.createElement('h2');
        categoryHeader.className = 'category-header';
        categoryHeader.textContent = category;
        categoryContainer.appendChild(categoryHeader);

        const categoryGrid = document.createElement('div');
        categoryGrid.className = currentView === 'grid' ? 'image-grid' : 'image-grid list-view';
        
        categories[category].forEach(image => {
          const imageItem = createImageItem(image);
          categoryGrid.appendChild(imageItem);
        });

        categoryContainer.appendChild(categoryGrid);
        fragment.appendChild(categoryContainer);
      }
    } else {
      // 渲染每个图片
      imagesToRender.forEach(image => {
        const imageItem = createImageItem(image);
        fragment.appendChild(imageItem);
      });
    }
    
    // 清空容器并追加fragment
    imageGrid.innerHTML = '';
    imageGrid.appendChild(fragment);

    // 更新图片计数
    imageCount.textContent = filteredImages.length;
    
    // 为现有图片获取详情
    fetchDetailsForExistingImages();
  }

  /**
   * 对图片进行排序
   * @param {Array} images 要排序的图片数组
   * @returns {Array} 排序后的图片数组
   */
  function sortImages(images) {
    const [sortBy, sortOrder] = currentSort.split('-');

    if (sortBy === 'default') {
      return images;
    }

    // 使用缓存来优化排序性能
    const cacheKey = `sort_${currentSort}_${images.length}`;
    const cachedResult = cacheManager.getCachedData(cacheKey);
    
    if (cachedResult) {
      console.log('使用缓存的排序结果');
      return cachedResult;
    }

    let sortedImages;
    
    switch (sortBy) {
      case 'filename':
      case 'fileType':
      case 'domain':
        sortedImages = [...images].sort((a, b) => {
          let valA, valB;

          switch (sortBy) {
            case 'filename':
              valA = a.url.split('/').pop();
              valB = b.url.split('/').pop();
              break;
            case 'fileType':
              valA = a.format || '';
              valB = b.format || '';
              break;
            case 'domain':
              try {
                valA = new URL(a.url).hostname;
                valB = new URL(b.url).hostname;
              } catch (e) {
                valA = '';
                valB = '';
              }
              break;
            default:
              return 0;
          }

          if (sortOrder === 'asc') {
            return valA.localeCompare(valB);
          } else {
            return valB.localeCompare(valA);
          }
        });
        break;
      
      case 'dimensions':
        // 使用ImageProcessor.js中的sortByDimensions函数
        const imageInstances = images.map(img => new Image(img.url, img.id));
        const sortedInstances = sortByDimensions(imageInstances, sortOrder === 'asc');
        sortedImages = sortedInstances.map(imgInstance => {
          // 找到对应的原始图片对象
          const originalImg = images.find(img => img.id === imgInstance.id);
          return originalImg || imgInstance;
        });
        break;
        
      default:
        sortedImages = images;
        break;
    }
    
    // 缓存排序结果
    cacheManager.setCachedData(cacheKey, sortedImages);
    
    return sortedImages;
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
    
    // 添加点击image-item自动选中复选框的功能
    item.addEventListener('click', function(e) {
      // 如果点击的是复选框或按钮，不执行此操作，避免冲突
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.classList.contains('toggle-url')) {
        return;
      }
      
      // 找到当前图片项中的复选框
      const checkbox = this.querySelector('input[type="checkbox"]');
      if (checkbox) {
        // 切换复选框状态
        checkbox.checked = !checkbox.checked;
        
        // 触发change事件，确保数据状态同步
        const changeEvent = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(changeEvent);
      }
    });
    
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
    
    // 发送下载请求到后台脚本
    const downloadData = {
      action: 'downloadImages',
      images: selectedImages.map((image, index) => {
        // 获取文件名
        let filename = image.url.split('/').pop();
        // 如果URL没有文件名，使用索引作为文件名
        if (!filename || filename.includes('?') || filename.includes('.')) {
          // 如果URL中没有有效文件名或包含查询参数，则生成默认文件名
          if (!filename || !filename.includes('.')) {
            filename = `image_${Date.now()}_${index}.jpg`;
          } else {
            // 如果有文件名但包含查询参数，则清理
            filename = filename.split('?')[0];
          }
        }
        
        // 标准化文件名 - 移除非法字符
        filename = filename.replace(/[<>:"/\\|?*]/g, '_');
        
        // 确保文件名不为空
        if (!filename || filename === '.') {
          filename = `image_${Date.now()}_${index}.jpg`;
        }
        
        // 确保文件有扩展名
        if (!/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)$/i.test(filename)) {
          // 如果没有常见图片扩展名，尝试从URL获取
          const urlExtMatch = image.url.match(/\.([^.?#]+)(?:[?#]|$)/i);
          if (urlExtMatch && urlExtMatch[1]) {
            const ext = urlExtMatch[1].toLowerCase();
            if (/(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)/i.test(ext)) {
              filename += '.' + ext;
            } else {
              filename += '.jpg'; // 默认使用jpg
            }
          } else {
            filename += '.jpg'; // 默认使用jpg
          }
        }
        
        return {
          url: image.url,
          filename: filename  // 只发送文件名，不包含路径
        };
      })
    };
    
    // 发送消息到后台脚本
    chrome.runtime.sendMessage(downloadData, function(response) {
      if (chrome.runtime.lastError) {
        console.error('发送下载请求失败:', chrome.runtime.lastError.message);
        showToast('下载失败: ' + chrome.runtime.lastError.message);
      } else if (response && response.success) {
        showToast(`已开始下载 ${selectedImages.length} 个图片`);
      } else if (response && response.error) {
        showToast('下载失败: ' + response.error);
      } else {
        // 即使没有明确的响应，也提示用户下载已启动
        showToast(`已开始下载 ${selectedImages.length} 个图片`);
      }
    });
  }
  
  /**
   * 打包下载选中的图片为ZIP
   */
  async function downloadZip() {
    const selectedImages = allImages.filter(image => image.selected);
    
    if (selectedImages.length === 0) {
      showToast('请先选择要下载的图片');
      return;
    }
    
    showToast(`开始准备打包 ${selectedImages.length} 个图片...`);
    
    try {
      // 检查JSZip是否已加载
      if (typeof JSZip === 'undefined') {
        // 动态加载JSZip库
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('node_modules/jszip/dist/jszip.min.js');
        document.head.appendChild(script);
        
        // 等待脚本加载
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }
      
      // 创建JSZip实例
      const zip = new JSZip();
      
      // 添加选中的图片到ZIP
      const promises = selectedImages.map(async (image, index) => {
        try {
          // 获取文件名
          let filename = image.url.split('/').pop();
          if (!filename || filename.includes('?')) {
            filename = `image_${Date.now()}_${index}.jpg`;
          } else {
            filename = filename.split('?')[0]; // 移除查询参数
          }
          
          // 确保文件名不为空
          if (!filename || filename === '.') {
            filename = `image_${Date.now()}_${index}.jpg`;
          }
          
          // 确保文件有扩展名
          if (!/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)$/i.test(filename)) {
            const urlExtMatch = image.url.match(/\.([^.?#]+)(?:[?#]|$)/i);
            if (urlExtMatch && urlExtMatch[1]) {
              const ext = urlExtMatch[1].toLowerCase();
              if (/(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)/i.test(ext)) {
                filename += '.' + ext;
              } else {
                filename += '.jpg'; // 默认使用jpg
              }
            } else {
              filename += '.jpg'; // 默认使用jpg
            }
          }
          
          // 获取图片数据
          const response = await fetch(image.url);
          if (!response.ok) {
            throw new Error(`无法获取图片: ${image.url}`);
          }
          const blob = await response.blob();
          
          // 将图片添加到ZIP
          zip.file(filename, blob);
        } catch (error) {
          console.error('添加图片到ZIP时出错:', error, image.url);
        }
      });
      
      // 等待所有图片处理完成
      await Promise.all(promises);
      
      // 生成ZIP文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // 使用chrome.downloads API下载ZIP文件，显示保存对话框
      const url = URL.createObjectURL(zipBlob);
      const downloadOptions = {
        url: url,
        filename: `图片打包_${Date.now()}.zip`,
        saveAs: true, // 显示保存对话框，让用户选择下载位置
        conflictAction: 'uniquify' // 如果文件已存在，自动重命名
      };
      
      // 发送下载请求到后台脚本，因为chrome.downloads API只能在后台使用
      const downloadData = {
        action: 'downloadZip',
        downloadOptions: downloadOptions
      };
      
      chrome.runtime.sendMessage(downloadData, function(response) {
        if (chrome.runtime.lastError) {
          console.error('发送下载请求失败:', chrome.runtime.lastError.message);
          // 如果后台下载失败，回退到直接下载方式
          const a = document.createElement('a');
          a.href = url;
          a.download = `图片打包_${Date.now()}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast(`打包完成，已使用默认下载位置`);
        } else if (response && response.success) {
          showToast(`成功打包 ${selectedImages.length} 个图片，正在下载...`);
        } else if (response && response.error) {
          showToast('下载失败: ' + response.error);
        }
      });
      
      // 注意：URL.revokeObjectURL(url) 不能立即调用，因为后台脚本可能还在使用它
      // 所以不立即撤销URL，让浏览器在下载完成后自动清理
    } catch (error) {
      console.error('打包ZIP时出错:', error);
      showToast('打包失败: ' + error.message);
    }
  }

  /**
   * 在新标签页中打开选中的图片
   */
  function openSelectedInNewTabs() {
    const selectedImages = allImages.filter(image => image.selected);
    
    if (selectedImages.length === 0) {
      showToast('请先选择要打开的图片');
      return;
    }
    
    // 限制同时打开的标签页数量，避免浏览器限制
    const maxTabs = 10;
    if (selectedImages.length > maxTabs) {
      if (!confirm(`您选择了 ${selectedImages.length} 张图片，确定要在新标签页中全部打开吗？建议不超过 ${maxTabs} 张。`)) {
        return;
      }
    }
    
    // 在新标签页中打开每张选中的图片
    selectedImages.forEach((image, index) => {
      // 添加延迟以避免同时打开太多标签页
      setTimeout(() => {
        window.open(image.url, '_blank');
      }, index * 300); // 每次延迟300毫秒打开一个新标签页
    });
    
    showToast(`正在新标签页中打开 ${selectedImages.length} 个图片`);
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