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
 * 从iframe中获取图片URL
 * @param {HTMLIFrameElement} iframe - iframe元素
 * @param {Set} imageUrls - 存储图片URL的Set对象
 */
function getImagesFromIframe(iframe, imageUrls) {
  try {
    // 尝试访问iframe的contentDocument
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // 处理iframe中的img标签
    const iframeImages = iframeDoc.querySelectorAll('img');
    iframeImages.forEach(img => {
      if (img.src && isImageUrl(img.src)) {
        const cleanedUrl = cleanImageUrl(img.src);
        if (cleanedUrl) {
          imageUrls.add(cleanedUrl);
        }
      }
      
      if (img.dataset.src && isImageUrl(img.dataset.src)) {
        const cleanedUrl = cleanImageUrl(img.dataset.src);
        if (cleanedUrl) {
          imageUrls.add(cleanedUrl);
        }
      }
    });
    
    // 处理iframe中的背景图片
    const iframeElements = iframeDoc.querySelectorAll('*');
    iframeElements.forEach(element => {
      try {
        const computedStyle = iframe.contentWindow.getComputedStyle(element);
        const bgImage = computedStyle.backgroundImage;
        
        if (bgImage && bgImage !== 'none') {
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
      } catch (e) {
        // 忽略跨域错误
      }
    });
    
    // 递归处理嵌套的iframe
    const nestedIframes = iframeDoc.querySelectorAll('iframe');
    nestedIframes.forEach(nestedIframe => {
      getImagesFromIframe(nestedIframe, imageUrls);
    });
  } catch (e) {
    // 忽略跨域错误
    console.log('无法访问iframe内容（可能是跨域限制）:', e.message);
  }
}

/**
 * 从CSS和JS文件内容中提取图片URL
 * @param {string} content - CSS或JS文件内容
 * @param {Set} imageUrls - 存储图片URL的Set对象
 */
function extractImagesFromFileContent(content, imageUrls) {
  if (!content) return;
  
  // 增强的正则表达式，查找各种形式的图片URL
    const urlPatterns = [
      // 完整的HTTP/HTTPS URL
      /https?:\/\/[^\s"'<>,]+\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)(\?[^\s"'<>,]*)?/gi,
      // 相对路径URL
      /\/[^\s"'<>,]+\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)(\?[^\s"'<>,]*)?/gi,
      // URL函数中的图片引用
      /url\(['"]?([^'"]+\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|avif|tiff|tif)[^'"]*)['"]?\)/gi
    ];
  
  urlPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // 对于不同的正则表达式提取适当的URL部分
      let url = match[1] ? match[1] : match[0];
      
      // 规范化相对路径
      if (url.startsWith('/') && !url.startsWith('//')) {
        // 转换为绝对路径
        const baseUrl = window.location.origin;
        url = baseUrl + url;
      } else if (url.startsWith('//')) {
        // 处理协议相对URL
        url = window.location.protocol + url;
      } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // 处理相对路径（如../images/image.jpg）
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        const combinedUrl = new URL(url, baseUrl).href;
        url = combinedUrl;
      }
      
      if (isImageUrl(url)) {
        const cleanedUrl = cleanImageUrl(url);
        if (cleanedUrl) {
          imageUrls.add(cleanedUrl);
        }
      }
    }
  });
}

/**
 * 获取网页中的所有图片URL
 * @return {Array} 去重后的图片URL数组
 */
async function getAllImageUrlsAsync() {
  const imageUrls = new Set();
  const fetchPromises = [];
  
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
    
    // 处理CSS文件链接，尝试获取其内容
    if (link.rel === 'stylesheet' && link.href) {
      const cssPromise = fetch(link.href)
        .then(response => {
          if (response.ok) {
            return response.text();
          }
          throw new Error('Failed to fetch CSS');
        })
        .then(cssContent => {
          extractImagesFromFileContent(cssContent, imageUrls);
        })
        .catch(error => {
          console.log('无法获取CSS文件内容:', error.message);
        });
      fetchPromises.push(cssPromise);
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
    extractImagesFromFileContent(content, imageUrls);
    
    // 对于外部脚本，尝试获取其内容
    if (element.tagName === 'SCRIPT' && element.src) {
      const scriptPromise = fetch(element.src)
        .then(response => {
          if (response.ok) {
            return response.text();
          }
          throw new Error('Failed to fetch script');
        })
        .then(scriptContent => {
          extractImagesFromFileContent(scriptContent, imageUrls);
        })
        .catch(error => {
          console.log('无法获取JS文件内容:', error.message);
        });
      fetchPromises.push(scriptPromise);
    }
  });
  
  // 6. 处理iframe中的图片
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    getImagesFromIframe(iframe, imageUrls);
  });
  
  // 等待所有异步fetch操作完成
  await Promise.all(fetchPromises);
  
  // 转换为数组并返回
  return Array.from(imageUrls);
}

/**
 * 同步版本的获取图片URL函数，提供向后兼容性
 * @return {Array} 去重后的图片URL数组（仅包含同步获取的部分）
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
  
  // 5. 检查所有脚本和样式表中的图片引用（内联内容）
  const scriptsAndStyles = document.querySelectorAll('script, style');
  scriptsAndStyles.forEach(element => {
    const content = element.textContent || element.innerHTML;
    extractImagesFromFileContent(content, imageUrls);
  });
  
  // 6. 处理iframe中的图片
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    getImagesFromIframe(iframe, imageUrls);
  });
  
  // 启动异步获取外部资源的过程，但不等待其完成
  // 这样可以在同步返回基础结果的同时，继续收集更多图片
  getAllImageUrlsAsync().then(asyncImages => {
    // 这里可以将异步获取的图片发送到background或popup
    // 但由于Chrome扩展的消息传递限制，这部分可能需要其他机制
    console.log(`异步获取到额外的 ${asyncImages.length - imageUrls.size} 个图片链接`);
  });
  
  // 转换为数组并返回同步获取的结果
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