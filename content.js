// 日志函数
function log(message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  if (data) {
    console.log(`[网页图片链接获取器][Content][${timestamp}] ${message}`, data);
  } else {
    console.log(`[网页图片链接获取器][Content][${timestamp}] ${message}`);
  }
}

// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('收到消息', request);
  
  if (request.action === "getImages") {
    log('开始获取所有图片链接');
    
    // 立即响应，避免超时
    sendResponse({ success: true, message: "正在收集图片..." });
    
    // 异步获取所有图片
    setTimeout(() => {
      getAllImageUrls().then(imageUrls => {
        log(`找到 ${imageUrls.length} 个图片链接`);
        
        // 不再进行分类，直接发送所有图片链接
        chrome.runtime.sendMessage({
          action: "imagesCollected",
          imageUrls
        });
        log('已发送图片链接到后台');
      });
    }, 500);
  }
  return true; // 表示将异步发送响应
});

// 获取所有图片链接的函数
async function getAllImageUrls() {
  log('开始收集图片链接');
  let imageUrls = new Set();
  
  // 1. 使用正则表达式从整个页面文本中提取所有可能的图片URL
  extractAllUrlsFromPageText(imageUrls);
  
  // 2. 获取主页面的所有图片
  collectImgTags(document, imageUrls);
  
  // 3. 获取CSS背景图片
  collectCSSImages(document, imageUrls);
  
  // 4. 获取特定网站的图片 (针对B站等特殊网站)
  collectSiteSpecificImages(imageUrls);
  
  // 5. 获取iframe中的图片
  collectIframeImages(imageUrls);
  
  // 6. 获取动态加载的图片 (检查DOM变化)
  await waitForDynamicImages(imageUrls);
  
  // 7. 获取网页中的视频封面图 (增强版)
  collectEnhancedVideoPosterImages(imageUrls);
  
  // 8. 检查网页中的JSON数据，可能包含图片URL
  extractImagesFromJSON(imageUrls);
  
  const result = Array.from(imageUrls);
  log(`总共收集到 ${result.length} 个唯一图片链接`);
  return result;
}

// 使用正则表达式从整个页面文本中提取所有可能的图片URL
function extractAllUrlsFromPageText(imageUrls) {
  log('开始从页面文本中提取所有URL');
  
  try {
    // 获取整个页面的HTML内容
    const pageContent = document.documentElement.outerHTML;
    
    // 提取所有可能的URL
    // 1. 匹配常见图片扩展名的URL
    const imageExtRegex = /(?:https?:\/\/|\/\/)[^\s"'<>]+?\.(?:jpg|jpeg|png|gif|webp|bmp|svg|ico)(?:\?[^\s"'<>]*)?/gi;
    const imageExtMatches = pageContent.match(imageExtRegex) || [];
    
    // 2. 匹配包含图片关键词的URL
    const imageKeywordRegex = /(?:https?:\/\/|\/\/)[^\s"'<>]+?(?:\/img\/|\/image\/|\/picture\/|\/photo\/|\/cover\/|\/poster\/|\/avatar\/|\/face\/)[^\s"'<>]*?(?:\?[^\s"'<>]*)?/gi;
    const imageKeywordMatches = pageContent.match(imageKeywordRegex) || [];
    
    // 3. 匹配包含"image"关键词的URL
    const imageMimeRegex = /(?:https?:\/\/|\/\/)[^\s"'<>]+?(?:image)[^\s"'<>]*?(?:\?[^\s"'<>]*)?/gi;
    const imageMimeMatches = pageContent.match(imageMimeRegex) || [];
    
    // 合并所有匹配结果
    const allMatches = [...imageExtMatches, ...imageKeywordMatches, ...imageMimeMatches];
    
    // 处理并添加到结果集
    allMatches.forEach(url => {
      const cleanUrl = cleanImageUrl(url);
      if (cleanUrl) {
        imageUrls.add(cleanUrl);
      }
    });
    
    log(`从页面文本中提取到 ${allMatches.length} 个可能的图片URL`);
  } catch (e) {
    log('从页面文本提取URL时出错', e);
  }
}

// 收集所有img标签的图片
function collectImgTags(doc, imageUrls) {
  const images = doc.querySelectorAll('img');
  log(`页面中找到 ${images.length} 个<img>标签`);
  
  images.forEach(img => {
    // 检查src属性
    if (img.src) {
      const cleanUrl = cleanImageUrl(img.src);
      if (cleanUrl) {
        imageUrls.add(cleanUrl);
      }
    }
    
    // 检查data-src属性 (懒加载图片)
    if (img.dataset.src) {
      const cleanUrl = cleanImageUrl(img.dataset.src);
      if (cleanUrl) {
        imageUrls.add(cleanUrl);
      }
    }
    
    // 检查srcset属性 (响应式图片)
    if (img.srcset) {
      const srcsetUrls = img.srcset.split(',')
        .map(src => src.trim().split(' ')[0])
        .filter(Boolean);
      
      srcsetUrls.forEach(url => {
        const cleanUrl = cleanImageUrl(url);
        if (cleanUrl) {
          imageUrls.add(cleanUrl);
        }
      });
    }
    
    // 检查其他可能的图片属性
    const possibleAttributes = ['data-original', 'data-lazy-src', 'data-url', 'data-original-src'];
    possibleAttributes.forEach(attr => {
      if (img.getAttribute(attr)) {
        const cleanUrl = cleanImageUrl(img.getAttribute(attr));
        if (cleanUrl) {
          imageUrls.add(cleanUrl);
        }
      }
    });
  });
}

// 收集CSS背景图片
function collectCSSImages(doc, imageUrls) {
  try {
    // 获取所有元素
    const allElements = doc.querySelectorAll('*');
    log(`检查 ${allElements.length} 个DOM元素的背景图片`);
    
    // 检查每个元素的背景图片
    allElements.forEach(el => {
      try {
        const style = window.getComputedStyle(el);
        const backgroundImage = style.backgroundImage;
        
        if (backgroundImage && backgroundImage !== 'none') {
          // 提取url("...")中的URL
          const urlMatch = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/g);
          if (urlMatch) {
            urlMatch.forEach(match => {
              const url = match.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
              if (url) {
                const cleanUrl = cleanImageUrl(url);
                if (cleanUrl) {
                  imageUrls.add(cleanUrl);
                }
              }
            });
          }
        }
      } catch (e) {
        // 忽略单个元素的错误
      }
    });
  } catch (e) {
    log('获取CSS背景图片时出错', e);
  }
}

// 收集iframe中的图片
function collectIframeImages(imageUrls) {
  const iframes = document.querySelectorAll('iframe');
  log(`页面中找到 ${iframes.length} 个iframe`);
  
  iframes.forEach((iframe, index) => {
    try {
      // 尝试访问iframe内容，可能会因为同源策略而失败
      if (iframe.contentDocument && iframe.contentWindow) {
        log(`成功访问第 ${index + 1} 个iframe内容`);
        
        // 收集iframe中的img标签
        collectImgTags(iframe.contentDocument, imageUrls);
        
        // 收集iframe中的CSS背景图片
        collectCSSImages(iframe.contentDocument, imageUrls);
      }
    } catch (e) {
      log(`无法访问第 ${index + 1} 个iframe内容 (可能是跨域限制)`, e.message);
    }
  });
}

// 收集特定网站的图片 (针对B站等特殊网站)
function collectSiteSpecificImages(imageUrls) {
  const currentUrl = window.location.href;
  log('当前网页URL', currentUrl);
  
  // 针对哔哩哔哩网站
  if (currentUrl.includes('bilibili.com')) {
    log('检测到哔哩哔哩网站，应用特殊处理');
    
    // 收集视频封面
    document.querySelectorAll('.cover, .cover-img, .video-cover').forEach(el => {
      // 检查背景图片
      try {
        const style = window.getComputedStyle(el);
        if (style.backgroundImage && style.backgroundImage !== 'none') {
          const match = style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
          if (match && match[1]) {
            const cleanUrl = cleanImageUrl(match[1]);
            if (cleanUrl) {
              imageUrls.add(cleanUrl);
              log('添加B站封面图', cleanUrl);
            }
          }
        }
      } catch (e) {}
      
      // 检查子元素中的图片
      el.querySelectorAll('img').forEach(img => {
        if (img.src) {
          const cleanUrl = cleanImageUrl(img.src);
          if (cleanUrl) {
            imageUrls.add(cleanUrl);
            log('添加B站图片', cleanUrl);
          }
        }
      });
    });
    
    // 收集用户头像
    document.querySelectorAll('.avatar, .face, .up-face, .bili-avatar').forEach(el => {
      if (el.tagName === 'IMG' && el.src) {
        const cleanUrl = cleanImageUrl(el.src);
        if (cleanUrl) {
          imageUrls.add(cleanUrl);
          log('添加B站头像', cleanUrl);
        }
      } else {
        el.querySelectorAll('img').forEach(img => {
          if (img.src) {
            const cleanUrl = cleanImageUrl(img.src);
            if (cleanUrl) {
              imageUrls.add(cleanUrl);
              log('添加B站头像', cleanUrl);
            }
          }
        });
      }
    });
    
    // 检查页面中的JSON数据
    try {
      document.querySelectorAll('script').forEach(script => {
        if (script.textContent.includes('__INITIAL_STATE__')) {
          const match = script.textContent.match(/__INITIAL_STATE__\s*=\s*({.*});/);
          if (match && match[1]) {
            try {
              const data = JSON.parse(match[1]);
              extractImagesFromObject(data, imageUrls);
            } catch (e) {
              log('解析B站JSON数据失败', e);
            }
          }
        }
      });
    } catch (e) {
      log('提取B站JSON数据时出错', e);
    }
  }
}

// 从JSON对象中提取图片URL
function extractImagesFromObject(obj, imageUrls, depth = 0) {
  if (depth > 5) return; // 限制递归深度
  
  if (!obj || typeof obj !== 'object') return;
  
  // 检查对象的所有属性
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    const value = obj[key];
    
    // 检查是否是图片URL
    if (typeof value === 'string' && 
        (key.includes('img') || key.includes('pic') || key.includes('cover') || key.includes('face') || key.includes('avatar')) &&
        (value.startsWith('http') || value.startsWith('//'))) {
      
      const cleanUrl = cleanImageUrl(value);
      if (cleanUrl) {
        imageUrls.add(cleanUrl);
        log(`从JSON中提取图片URL (${key})`, cleanUrl);
      }
    }
    
    // 递归检查嵌套对象
    if (value && typeof value === 'object') {
      extractImagesFromObject(value, imageUrls, depth + 1);
    }
  }
}

// 等待动态加载的图片
async function waitForDynamicImages(imageUrls) {
  log('等待动态加载的图片...');
  
  // 创建一个Promise，等待一段时间后解析
  return new Promise(resolve => {
    // 创建一个MutationObserver来监视DOM变化
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // 检查新添加的节点
        mutation.addedNodes.forEach(node => {
          // 检查是否是元素节点
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 如果是img元素
            if (node.tagName === 'IMG') {
              if (node.src) {
                const cleanUrl = cleanImageUrl(node.src);
                if (cleanUrl) {
                  imageUrls.add(cleanUrl);
                  log('添加动态加载的图片', cleanUrl);
                }
              }
            }
            
            // 检查子元素中的图片
            node.querySelectorAll('img').forEach(img => {
              if (img.src) {
                const cleanUrl = cleanImageUrl(img.src);
                if (cleanUrl) {
                  imageUrls.add(cleanUrl);
                  log('添加动态加载的子元素图片', cleanUrl);
                }
              }
            });
          }
        });
      });
    });
    
    // 开始观察整个文档
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 2秒后停止观察并解析Promise
    setTimeout(() => {
      observer.disconnect();
      log('完成动态图片收集');
      resolve();
    }, 2000);
  });
}

// 增强版视频封面图片收集
function collectEnhancedVideoPosterImages(imageUrls) {
  log('开始增强版视频封面收集');
  
  // 1. 检查video元素的poster属性
  const videos = document.querySelectorAll('video');
  log(`页面中找到 ${videos.length} 个视频元素`);
  
  videos.forEach(video => {
    if (video.poster) {
      const cleanUrl = cleanImageUrl(video.poster);
      if (cleanUrl) {
        imageUrls.add(cleanUrl);
        log('添加视频封面图(poster属性)', cleanUrl);
      }
    }
    
    // 检查视频的父元素和兄弟元素中的图片，可能是封面
    try {
      // 检查父元素
      if (video.parentElement) {
        // 检查父元素的背景图
        const parentStyle = window.getComputedStyle(video.parentElement);
        if (parentStyle.backgroundImage && parentStyle.backgroundImage !== 'none') {
          const match = parentStyle.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
          if (match && match[1]) {
            const cleanUrl = cleanImageUrl(match[1]);
            if (cleanUrl) {
              imageUrls.add(cleanUrl);
              log('添加视频父元素背景图', cleanUrl);
            }
          }
        }
        
        // 检查父元素中的img标签
        video.parentElement.querySelectorAll('img').forEach(img => {
          if (img.src) {
            const cleanUrl = cleanImageUrl(img.src);
            if (cleanUrl) {
              imageUrls.add(cleanUrl);
              log('添加视频父元素中的图片', cleanUrl);
            }
          }
        });
      }
      
      // 检查前一个兄弟元素，可能是封面
      let prevSibling = video.previousElementSibling;
      if (prevSibling && prevSibling.tagName === 'IMG') {
        if (prevSibling.src) {
          const cleanUrl = cleanImageUrl(prevSibling.src);
          if (cleanUrl) {
            imageUrls.add(cleanUrl);
            log('添加视频前一个兄弟元素图片', cleanUrl);
          }
        }
      }
    } catch (e) {
      log('检查视频相关元素时出错', e);
    }
  });
  
  // 2. 检查视频容器中的图片
  const videoContainers = document.querySelectorAll('[class*="video"], [class*="player"], [class*="media"], [id*="video"], [id*="player"]');
  log(`找到 ${videoContainers.length} 个可能的视频容器`);
  
  videoContainers.forEach(container => {
    // 检查容器内的img标签
    container.querySelectorAll('img').forEach(img => {
      if (img.src) {
        const cleanUrl = cleanImageUrl(img.src);
        if (cleanUrl) {
          imageUrls.add(cleanUrl);
          log('添加视频容器中的图片', cleanUrl);
        }
      }
    });
    
    // 检查容器背景图片
    try {
      const style = window.getComputedStyle(container);
      if (style.backgroundImage && style.backgroundImage !== 'none') {
        const match = style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (match && match[1]) {
          const cleanUrl = cleanImageUrl(match[1]);
          if (cleanUrl) {
            imageUrls.add(cleanUrl);
            log('添加视频容器背景图', cleanUrl);
          }
        }
      }
    } catch (e) {
      // 忽略单个元素的错误
    }
  });
  
  // 3. 检查常见视频网站的特殊结构
  collectVideoSiteSpecificImages(imageUrls);
}

// 收集特定视频网站的图片
function collectVideoSiteSpecificImages(imageUrls) {
  const url = window.location.href;
  
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    log('检测到YouTube网站，应用特殊处理');
    document.querySelectorAll('#thumbnail img, .ytp-videowall-still-image, .ytp-cued-thumbnail-overlay-image').forEach(el => {
      if (el.src) {
        const cleanUrl = cleanImageUrl(el.src);
        if (cleanUrl) {
          imageUrls.add(cleanUrl);
          log('添加YouTube缩略图', cleanUrl);
        }
      }
    });
  }
  
  // 抖音/TikTok
  if (url.includes('douyin.com') || url.includes('tiktok.com')) {
    log('检测到抖音/TikTok网站，应用特殊处理');
    document.querySelectorAll('[class*="cover"], [class*="poster"], [class*="avatar"]').forEach(el => {
      // 检查背景图片
      try {
        const style = window.getComputedStyle(el);
        if (style.backgroundImage && style.backgroundImage !== 'none') {
          const match = style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
          if (match && match[1]) {
            const cleanUrl = cleanImageUrl(match[1]);
            if (cleanUrl) {
              imageUrls.add(cleanUrl);
              log('添加抖音/TikTok图片', cleanUrl);
            }
          }
        }
      } catch (e) {}
      
      // 检查子元素中的图片
      el.querySelectorAll('img').forEach(img => {
        if (img.src) {
          const cleanUrl = cleanImageUrl(img.src);
          if (cleanUrl) {
            imageUrls.add(cleanUrl);
            log('添加抖音/TikTok子元素图片', cleanUrl);
          }
        }
      });
    });
  }
  
  // 腾讯视频
  if (url.includes('v.qq.com')) {
    log('检测到腾讯视频网站，应用特殊处理');
    document.querySelectorAll('.figure_pic img, .figure_pic, .site_pic, .poster_figure').forEach(el => {
      if (el.tagName === 'IMG' && el.src) {
        const cleanUrl = cleanImageUrl(el.src);
        if (cleanUrl) {
          imageUrls.add(cleanUrl);
          log('添加腾讯视频图片', cleanUrl);
        }
      } else {
        // 检查背景图片
        try {
          const style = window.getComputedStyle(el);
          if (style.backgroundImage && style.backgroundImage !== 'none') {
            const match = style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (match && match[1]) {
              const cleanUrl = cleanImageUrl(match[1]);
              if (cleanUrl) {
                imageUrls.add(cleanUrl);
                log('添加腾讯视频背景图', cleanUrl);
              }
            }
          }
        } catch (e) {}
      }
    });
  }
}

// 保留原始函数作为备份
function collectVideoPosterImages(imageUrls) {
  const videos = document.querySelectorAll('video');
  log(`页面中找到 ${videos.length} 个视频元素`);
  
  videos.forEach(video => {
    if (video.poster) {
      const cleanUrl = cleanImageUrl(video.poster);
      if (cleanUrl) {
        imageUrls.add(cleanUrl);
        log('添加视频封面图', cleanUrl);
      }
    }
  });
}

// 从页面中的JSON数据提取图片URL
function extractImagesFromJSON(imageUrls) {
  try {
    // 查找所有script标签
    document.querySelectorAll('script').forEach(script => {
      if (!script.textContent) return;
      
      // 尝试找出可能包含JSON数据的脚本
      const content = script.textContent;
      
      // 查找常见的JSON数据模式
      const jsonPatterns = [
        /window\.__INITIAL_STATE__\s*=\s*({.*});/,
        /window\.__DATA__\s*=\s*({.*});/,
        /var\s+initialData\s*=\s*({.*});/,
        /var\s+pageData\s*=\s*({.*});/
      ];
      
      for (const pattern of jsonPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          try {
            const data = JSON.parse(match[1]);
            extractImagesFromObject(data, imageUrls);
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    });
  } catch (e) {
    log('从JSON提取图片时出错', e);
  }
}

// 清理图片URL，去除控制显示的参数
function cleanImageUrl(url) {
  if (!url) return null;
  
  try {
    // 处理相对URL
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (url.startsWith('/')) {
      url = window.location.origin + url;
    }
    
    // 检查是否是数据URL (base64等)
    if (url.startsWith('data:')) {
      // 只保留较大的base64图片
      if (url.length > 1000) {
        return url;
      }
      return null;
    }
    
    // 解析URL
    const urlObj = new URL(url);
    
    // 检查是否是有效的图片URL
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.jfif'];
    const path = urlObj.pathname.toLowerCase();
    
    // 检查扩展名
    const isImageByExtension = imageExtensions.some(ext => path.endsWith(ext));
    
    // 检查URL中是否包含图片相关关键词
    const isImageByKeyword = 
      url.includes('/img/') || 
      url.includes('/image/') || 
      url.includes('/picture/') || 
      url.includes('/photo/') ||
      url.includes('/cover/') ||
      url.includes('/poster/') ||
      url.includes('/avatar/') ||
      url.includes('/face/');
    
    // 检查MIME类型关键词
    const isImageByMime = url.includes('image');
    
    // 如果不是图片URL，则返回null
    if (!isImageByExtension && !isImageByKeyword && !isImageByMime) {
      return null;
    }
    
    // 统一处理所有图片URL
    // 移除"@"符号及其后面的所有内容
    const atIndex = urlObj.pathname.indexOf('@');
    if (atIndex !== -1) {
      urlObj.pathname = urlObj.pathname.substring(0, atIndex);
    }
    
    // 完全清除查询参数
    urlObj.search = '';
    
    // 返回清理后的URL
    return urlObj.toString();
  } catch (e) {
    log('清理URL时出错', e);
    
    // 尝试简单清理
    try {
      // 移除URL中的查询参数
      const questionMarkIndex = url.indexOf('?');
      if (questionMarkIndex !== -1) {
        return url.substring(0, questionMarkIndex);
      }
    } catch (e2) {}
    
    return url; // 如果解析失败，返回原始URL
  }
}

// 移除图片分类函数，由display.js负责分类