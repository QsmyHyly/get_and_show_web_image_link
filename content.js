/**
 * 内容脚本
 * 注入到网页中，获取所有图片链接，过滤非图片URL，清理后缀并去重
 */

/**
 * 清理URL中的特殊后缀（如@360w_360h_!web-avatar-nav.avif）
 * @param {string} url - 原始URL
 * @return {string} 清理后的URL
 */
function cleanImageUrl(url) {
  // 查找URL中的@符号，如果有，则截取@之前的部分
  const atIndex = url.lastIndexOf('@');
  if (atIndex > 0 && url.indexOf('/', atIndex) === -1) {
    // 确保@后面没有/，避免误判URL路径中的@
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
  
  // 清理URL
  const cleanedUrl = cleanImageUrl(url);
  
  // 检查常见图片文件扩展名
  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)(\?.*)?$/i;
  if (imageExtensions.test(cleanedUrl)) {
    return true;
  }
  
  // 检查URL中是否包含图片相关的查询参数
  const imageParams = /(image|img|picture|photo|pic|avatar|icon|thumb|thumbnail)/i;
  if (imageParams.test(cleanedUrl)) {
    return true;
  }
  
  // 检查常见的图片托管服务域名
  const imageHosts = /(i\.imgur\.com|cdn\.discordapp\.com|media\.discordapp\.net|pbs\.twimg\.com|scontent\.|instagram\.|facebook\.com|googleusercontent\.com|github\.com\/assets|gravatar\.com|avatars\.|cdn\.|static\.|assets\.|images\.|pics\.|photo\.|img\.)/i;
  if (imageHosts.test(cleanedUrl)) {
    return true;
  }
  
  return false;
}

/**
 * 获取网页中的所有图片URL
 * @return {Array} 去重后的图片URL数组
 */
function getAllImageUrls() {
  const imageUrls = new Set();
  
  // 1. 获取所有img标签的src和srcset属性
  const imgElements = document.querySelectorAll('img');
  imgElements.forEach(img => {
    // 检查src属性
    if (img.src && isImageUrl(img.src)) {
      const cleanedUrl = cleanImageUrl(img.src);
      if (cleanedUrl) {
        imageUrls.add(cleanedUrl);
      }
    }
    
    // 检查srcset属性
    if (img.srcset) {
      const srcsetEntries = img.srcset.split(',');
      srcsetEntries.forEach(entry => {
        const url = entry.trim().split(' ')[0];
        if (url && isImageUrl(url)) {
          const cleanedUrl = cleanImageUrl(url);
          if (cleanedUrl) {
            imageUrls.add(cleanedUrl);
          }
        }
      });
    }
    
    // 检查data-src属性（懒加载图片）
    if (img.dataset.src && isImageUrl(img.dataset.src)) {
      const cleanedUrl = cleanImageUrl(img.dataset.src);
      if (cleanedUrl) {
        imageUrls.add(cleanedUrl);
      }
    }
  });
  
  // 2. 获取所有具有背景图片的元素
  const elementsWithBgImage = document.querySelectorAll('*');
  elementsWithBgImage.forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    const bgImage = computedStyle.backgroundImage;
    
    if (bgImage && bgImage !== 'none') {
      // 提取URL从background-image属性中
      const matches = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
      if (matches) {
        matches.forEach(match => {
          const url = match.slice(4, -1).replace(/['""]/g, '');
          if (url && isImageUrl(url)) {
            const cleanedUrl = cleanImageUrl(url);
            if (cleanedUrl) {
              imageUrls.add(cleanedUrl);
            }
          }
        });
      }
    }
  });
  
  // 3. 获取所有link标签中的图片（如预加载的图片）
  const linkElements = document.querySelectorAll('link');
  linkElements.forEach(link => {
    if (link.rel === 'preload' && link.as === 'image' && link.href) {
      if (isImageUrl(link.href)) {
        const cleanedUrl = cleanImageUrl(link.href);
        if (cleanedUrl) {
          imageUrls.add(cleanedUrl);
        }
      }
    }
  });
  
  // 4. 获取所有video元素的poster属性
  const videoElements = document.querySelectorAll('video');
  videoElements.forEach(video => {
    if (video.poster && isImageUrl(video.poster)) {
      const cleanedUrl = cleanImageUrl(video.poster);
      if (cleanedUrl) {
        imageUrls.add(cleanedUrl);
      }
    }
  });
  
  // 5. 检查所有脚本和样式表中的图片引用
  const scriptsAndStyles = document.querySelectorAll('script, style');
  scriptsAndStyles.forEach(element => {
    const content = element.textContent || element.innerHTML;
    if (content) {
      // 使用正则表达式查找URL
      const urlMatches = content.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)(\?[^\s"'<>]*)?/gi);
      if (urlMatches) {
        urlMatches.forEach(url => {
          if (isImageUrl(url)) {
            const cleanedUrl = cleanImageUrl(url);
            if (cleanedUrl) {
              imageUrls.add(cleanedUrl);
            }
          }
        });
      }
    }
  });
  
  // 转换为数组并返回
  return Array.from(imageUrls);
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getImages') {
    try {
      const imageUrls = getAllImageUrls();
      console.log(`找到 ${imageUrls.length} 个图片链接`);
      
      sendResponse({
        success: true,
        imageUrls: imageUrls
      });
    } catch (error) {
      console.error('获取图片链接时出错:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
  
  // 返回true表示异步响应
  return true;
});