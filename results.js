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
  
  // 初始化
  init();
  
  /**
   * 初始化函数
   */
  function init() {
    // 从存储中获取图片数据
    chrome.storage.local.get(['imageUrls', 'pageTitle', 'pageUrl'], function(data) {
      if (data.imageUrls && data.imageUrls.length > 0) {
        allImages = data.imageUrls.map(url => ({
          url: url,
          selected: false,
          id: generateId()
        }));
        
        filteredImages = [...allImages];
        
        // 更新页面信息
        pageTitle.textContent = data.pageTitle || '未知页面';
        pageUrl.textContent = data.pageUrl || '';
        imageCount.textContent = allImages.length;
        
        // 渲染图片
        renderImages();
        
        // 隐藏加载动画
        loadingSpinner.style.display = 'none';
      } else {
        // 没有找到图片
        loadingSpinner.style.display = 'none';
        noImages.style.display = 'block';
      }
    });
    
    // 添加事件监听器
    setupEventListeners();
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
  }
  
  /**
   * 生成唯一ID
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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