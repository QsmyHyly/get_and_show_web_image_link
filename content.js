/**
 * 内容脚本
 * 注入到网页中，获取所有图片链接，过滤非图片URL，清理后缀并去重
 */

/**
 * 规范化URL，确保添加协议前缀
 * @param {string} url - 原始URL
 * @return {string} 规范化后的URL
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url.startsWith('//') ? 'https:' + url : url;
}

/**
 * 清理URL中的特殊后缀（如@360w_360h_!web-avatar-nav.avif）
 * @param {string} url - 原始URL
 * @return {string} 清理后的URL
 */
function cleanImageUrl(url) {
  const atIndex = url.lastIndexOf('@');
  if (atIndex > 0 && url.indexOf('/', atIndex) === -1) {
    return url.substring(0, atIndex);
  }
  return url;
}

/**
 * 检查URL是否指向图片
 * @param {string} url - 要检查的URL
 * @return {boolean} 是否为图片URL
 */
function isImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  const cleanedUrl = cleanImageUrl(url);
  
  // 检查常见图片文件扩展名
  if (/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)(\?.*)?$/i.test(cleanedUrl)) {
    return true;
  }
  
  // 检查URL中是否包含图片相关的查询参数
  if (/(image|img|picture|photo|pic|avatar|icon|thumb|thumbnail)/i.test(cleanedUrl)) {
    return true;
  }
  
  // 检查常见的图片托管服务域名
  if (/(i\.imgur\.com|cdn\.discordapp\.com|media\.discordapp\.net|pbs\.twimg\.com|scontent\.|instagram\.|facebook\.com|googleusercontent\.com|github\.com\/assets|gravatar\.com|avatars\.|cdn\.|static\.|assets\.|images\.|pics\.|photo\.|img\.)/i.test(cleanedUrl)) {
    return true;
  }
  
  return false;
}

/**
 * 处理图片元素，提取URL并添加到集合中
 * @param {Element} element - DOM元素
 * @param {Set} imageUrls - 存储图片URL的Set对象
 */
function processImageElement(element, imageUrls) {
  // 处理src属性
  if (element.src && isImageUrl(element.src)) {
    const normalizedUrl = normalizeUrl(element.src);
    const cleanedUrl = cleanImageUrl(normalizedUrl);
    if (cleanedUrl) imageUrls.add(cleanedUrl);
  }
  
  // 处理srcset属性
  if (element.srcset) {
    element.srcset.split(',').forEach(entry => {
      const url = entry.trim().split(' ')[0];
      if (url && isImageUrl(url)) {
        const normalizedUrl = normalizeUrl(url);
        const cleanedUrl = cleanImageUrl(normalizedUrl);
        if (cleanedUrl) imageUrls.add(cleanedUrl);
      }
    });
  }
  
  // 处理data-src属性（懒加载图片）
  if (element.dataset && element.dataset.src && isImageUrl(element.dataset.src)) {
    const normalizedUrl = normalizeUrl(element.dataset.src);
    const cleanedUrl = cleanImageUrl(normalizedUrl);
    if (cleanedUrl) imageUrls.add(cleanedUrl);
  }
}

/**
 * 处理元素的背景图片
 * @param {Element} element - DOM元素
 * @param {Set} imageUrls - 存储图片URL的Set对象
 */
function processBackgroundImage(element, imageUrls) {
  try {
    const computedStyle = window.getComputedStyle(element);
    const bgImage = computedStyle.backgroundImage;
    
    if (bgImage && bgImage !== 'none') {
      const matches = bgImage.match(/url\(['"]?([^'"\)]+)['"]?\)/g);
      if (matches) {
        matches.forEach(match => {
          const url = match.slice(4, -1).replace(/['""]/g, '');
          if (url && isImageUrl(url)) {
            const normalizedUrl = normalizeUrl(url);
            const cleanedUrl = cleanImageUrl(normalizedUrl);
            if (cleanedUrl) imageUrls.add(cleanedUrl);
          }
        });
      }
    }
  } catch (e) {
    // 忽略错误
  }
}

/**
 * 递归处理元素及其子元素
 * @param {Element} element - DOM元素
 * @param {Set} imageUrls - 存储图片URL的Set对象
 */
function processElement(element, imageUrls) {
  // 处理img标签
  if (element.tagName === 'IMG') {
    processImageElement(element, imageUrls);
  }
  
  // 处理背景图片
  processBackgroundImage(element, imageUrls);
  
  // 处理video的poster属性
  if (element.tagName === 'VIDEO' && element.poster && isImageUrl(element.poster)) {
    const normalizedUrl = normalizeUrl(element.poster);
    const cleanedUrl = cleanImageUrl(normalizedUrl);
    if (cleanedUrl) imageUrls.add(cleanedUrl);
  }
  
  // 处理Shadow DOM
  if (element.shadowRoot) {
    element.shadowRoot.querySelectorAll('*').forEach(shadowElement => {
      processElement(shadowElement, imageUrls);
    });
  }
  
  // 递归处理子元素
  if (element.children && element.children.length > 0) {
    Array.from(element.children).forEach(child => {
      processElement(child, imageUrls);
    });
  }
}

/**
 * 从HTML内容中提取图片URL
 * @param {string} htmlContent - HTML内容
 * @param {Set} imageUrls - 存储图片URL的Set对象
 */
function extractImagesFromHTML(htmlContent, imageUrls) {
  const urlPatterns = [
    /https?:\/\/[^\s"'<>,]+\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)(\?[^\s"'<>,]*)?/gi,
    /\/[^\s"'<>,]+\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)(\?[^\s"'<>,]*)?/gi,
    /url\(['"]?([^'"\)]+\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)[^'"\)]*)['"]?\)/gi
  ];
  
  urlPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(htmlContent)) !== null) {
      let url = match[1] ? match[1] : match[0];
      
      // 规范化URL
      if (url.startsWith('/') && !url.startsWith('//')) {
        url = window.location.origin + url;
      } else if (url.startsWith('//')) {
        url = normalizeUrl(url);
      } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        url = new URL(url, baseUrl).href;
      }
      
      if (isImageUrl(url)) {
        const cleanedUrl = cleanImageUrl(url);
        if (cleanedUrl) imageUrls.add(cleanedUrl);
      }
    }
  });
}

/**
 * 获取网页中的所有图片URL
 * @return {Promise<Array>} 去重后的图片URL数组
 */
async function getAllImageUrlsAsync() {
  const imageUrls = new Set();
  
  // 从文档根元素开始处理
  processElement(document.documentElement, imageUrls);
  
  // 处理所有iframe
  document.querySelectorAll('iframe').forEach(iframe => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      processElement(iframeDoc.documentElement, imageUrls);
    } catch (e) {
      // 忽略跨域错误
    }
  });
  
  // 提取页面HTML中的图片URL
  extractImagesFromHTML(document.documentElement.outerHTML, imageUrls);
  
  // 转换为数组并返回
  return Array.from(imageUrls);
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getImages') {
    getAllImageUrlsAsync()
      .then(imageUrls => {
        console.log(`找到 ${imageUrls.length} 个图片链接`);
        sendResponse({
          success: true,
          imageUrls: imageUrls
        });
      })
      .catch(error => {
        console.error('获取图片链接时出错:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
    
    // 返回true表示异步响应
    return true;
  }
});