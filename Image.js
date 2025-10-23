/**
 * 图片类 - 封装图片的属性和基本方法
 * 提供统一的图片数据结构，方便计算和缓存部分获取所需信息
 */
class Image {
  /**
   * 构造函数
   * @param {string} url - 图片URL
   * @param {string} id - 图片唯一标识符（可选，如不提供则自动生成）
   */
  constructor(url, id = null) {
    this.url = url;
    this.id = id || this._generateId();
    this.selected = false;
    
    // 图片详细信息
    this.detailsLoaded = false;
    this.width = 0;
    this.height = 0;
    this.aspectRatio = 0;
    this.format = 'unknown';
    this.size = '未知';
    
    // 预计算的属性
    this._filename = null;
    this._fileType = null;
    this._domain = null;
    
    // 预计算基本属性
    this._calculateBaseProperties();
  }
  
  /**
   * 生成唯一ID
   * @private
   * @returns {string} 唯一标识符
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * 计算图片的基础属性
   * @private
   */
  _calculateBaseProperties() {
    // 检查URL是否有效
    if (!this.url || typeof this.url !== 'string') {
      this._filename = 'unknown';
      this._fileType = 'unknown';
      this._domain = 'unknown';
      return;
    }
    
    // 提取文件名
    try {
      const urlParts = this.url.split('/');
      this._filename = urlParts[urlParts.length - 1].split('?')[0];
      if (!this._filename) this._filename = 'unknown';
    } catch (e) {
      console.error('提取文件名失败:', e);
      this._filename = 'unknown';
    }
    
    // 提取文件类型
    try {
      const extMatch = this.url.match(/\.([^.\s?#]+)(?:[?#]|$)/i);
      if (extMatch && extMatch[1]) {
        this._fileType = extMatch[1].toLowerCase();
      } else {
        this._fileType = 'unknown';
      }
    } catch (e) {
      console.error('提取文件类型失败:', e);
      this._fileType = 'unknown';
    }
    
    // 提取域名
    try {
      try {
        const urlObj = new URL(this.url);
        this._domain = urlObj.hostname;
      } catch (e) {
        // 处理相对URL或无效URL的情况
        const domainMatch = this.url.match(/^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/im);
        if (domainMatch && domainMatch[1]) {
          this._domain = domainMatch[1];
        } else {
          this._domain = 'unknown';
        }
      }
    } catch (e) {
      console.error('提取域名失败:', e);
      this._domain = 'unknown';
    }
  }
  
  /**
   * 获取文件名
   * @returns {string} 文件名
   */
  getFilename() {
    return this._filename;
  }
  
  /**
   * 获取文件类型
   * @returns {string} 文件类型（扩展名）
   */
  getFileType() {
    return this._fileType;
  }
  
  /**
   * 获取域名
   * @returns {string} 图片所在域名
   */
  getDomain() {
    return this._domain;
  }

  /**
   * 获取图片宽度
   * @returns {number} 图片宽度
   */
  getWidth() {
    return this.width;
  }

  /**
   * 获取图片高度
   * @returns {number} 图片高度
   */
  getHeight() {
    return this.height;
  }
  
  /**
   * 获取文件大小（字节数）
   * @returns {number} 文件大小（字节）
   */
  getFileSize() {
    if (this.size === '未知' || this.size === '加载失败') {
      return 0;
    }
    
    // 解析大小字符串，例如 "1.23 MB", "456 KB", "789 B"
    const sizeMatch = this.size.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/);
    if (!sizeMatch) {
      return 0;
    }
    
    const value = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2] || 'B';
    
    switch (unit) {
      case 'B':
        return value;
      case 'KB':
        return value * 1024;
      case 'MB':
        return value * 1024 * 1024;
      case 'GB':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }
  
  /**
   * 更新图片尺寸信息
   * @param {number} width - 图片宽度
   * @param {number} height - 图片高度
   */
  updateDimensions(width, height) {
    this.width = width;
    this.height = height;
    this.aspectRatio = width > 0 && height > 0 ? width / height : 0;
    
    // 估算图片大小
    if (width > 0 && height > 0) {
      const estimatedSizeInBytes = width * height * 3; // 假设平均每像素3字节（RGB）
      if (estimatedSizeInBytes < 1024) {
        this.size = estimatedSizeInBytes + ' B';
      } else if (estimatedSizeInBytes < 1024 * 1024) {
        this.size = (estimatedSizeInBytes / 1024).toFixed(2) + ' KB';
      } else {
        this.size = (estimatedSizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
      }
    }
    
    this.detailsLoaded = true;
  }
  
  /**
   * 设置图片加载失败
   */
  markAsFailed() {
    this.width = 0;
    this.height = 0;
    this.aspectRatio = 0;
    this.size = '加载失败';
    this.detailsLoaded = true;
  }
  
  /**
   * 转换为可序列化的对象
   * @returns {Object} 可序列化的图片数据对象
   */
  toJSON() {
    return {
      id: this.id,
      url: this.url,
      selected: this.selected,
      detailsLoaded: this.detailsLoaded,
      width: this.width,
      height: this.height,
      aspectRatio: this.aspectRatio,
      format: this.format,
      size: this.size,
      _filename: this._filename,
      _fileType: this._fileType,
      _domain: this._domain
    };
  }
  
  /**
   * 从JSON对象创建Image实例
   * @param {Object} json - JSON对象
   * @returns {Image} Image实例
   */
  static fromJSON(json) {
    const image = new Image(json.url, json.id);
    image.selected = json.selected || false;
    image.detailsLoaded = json.detailsLoaded || false;
    image.width = json.width || 0;
    image.height = json.height || 0;
    image.aspectRatio = json.aspectRatio || 0;
    image.format = json.format || 'unknown';
    image.size = json.size || '未知';
    
    // 恢复预计算的属性
    if (json._filename) image._filename = json._filename;
    if (json._fileType) image._fileType = json._fileType;
    if (json._domain) image._domain = json._domain;
    
    return image;
  }
}

// 导出模块
export default Image;

// 兼容CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Image;
  module.exports.default = Image;
}

// 兼容浏览器环境
if (typeof window !== 'undefined') {
  window.Image = Image;
}