/**
 * 图片处理器 - 负责图片的排序、分类等计算逻辑
 * 使用Image类表示图片，使用CacheManager管理缓存
 */

// 导入必要的依赖
import Image from './Image.js';

class ImageProcessor {
  /**
   * 构造函数
   */
  constructor() {
    // 可以在这里添加其他配置
  }

  /**
   * 将普通图片对象数组转换为Image实例数组
   * @param {Array} imageObjects - 普通图片对象数组
   * @returns {Array} Image实例数组
   */
  convertToImageInstances(imageObjects) {
    if (!Array.isArray(imageObjects)) {
      return [];
    }
    
    return imageObjects.map(imgObj => {
      if (imgObj instanceof Image) {
        return imgObj;
      }
      // 如果是从JSON反序列化的对象，使用fromJSON方法
      if (imgObj.url && imgObj.id) {
        return Image.fromJSON(imgObj);
      }
      // 否则创建新的Image实例
      return new Image(imgObj.url, imgObj.id);
    });
  }

  /**
   * 对图片数组进行排序
   * @param {Array} images - 图片对象数组或Image实例数组
   * @param {string} criteria - 排序标准: 'original', 'filename', 'fileType', 'domain'
   * @param {boolean} ascending - 是否升序排列，默认为true
   * @returns {Array} 排序后的图片数组
   */
  sortImages(images, criteria = 'original', ascending = true) {
    if (!Array.isArray(images)) {
      return [];
    }
    
    if (criteria === 'original' || images.length <= 1) {
      return [...images];
    }
    
    // 确保所有对象都是Image实例
    const imageInstances = this.convertToImageInstances(images);
    
    // 执行排序
    const sortedImages = [...imageInstances].sort((a, b) => {
      let aValue, bValue;
      
      switch (criteria) {
        case 'filename':
          aValue = a.getFilename().toLowerCase();
          bValue = b.getFilename().toLowerCase();
          break;
        case 'fileType':
          aValue = a.getFileType();
          bValue = b.getFileType();
          break;
        case 'domain':
          aValue = a.getDomain();
          bValue = b.getDomain();
          break;
        default:
          return 0; // 未知标准，保持原有顺序
      }
      
      // 执行比较
      if (aValue < bValue) return ascending ? -1 : 1;
      if (aValue > bValue) return ascending ? 1 : -1;
      return 0;
    });
    
    return sortedImages;
  }

  /**
   * 增量排序图片数组，将新图片插入到已排序的数组中
   * @param {Array} alreadySortedImages - 已排序的图片数组
   * @param {Array} newImages - 新添加的图片数组
   * @param {string} criteria - 排序标准 (filename, fileType, domain)
   * @param {boolean} ascending - 是否升序
   * @returns {Array} 更新后的排序数组
   */
  incrementalSort(alreadySortedImages, newImages, criteria = 'original', ascending = true) {
    // 验证输入参数
    if (!Array.isArray(alreadySortedImages) || !Array.isArray(newImages)) {
      return alreadySortedImages || [];
    }
    
    // 确保所有对象都是Image实例
    const sortedInstances = this.convertToImageInstances(alreadySortedImages);
    const newInstances = this.convertToImageInstances(newImages);
    
    // 如果是原始顺序，直接合并数组
    if (criteria === 'original') {
      const result = [...sortedInstances, ...newInstances];
      return result;
    }
    
    // 合并两个数组并执行排序
    const mergedImages = [...sortedInstances, ...newInstances];
    const result = this.sortImages(mergedImages, criteria, ascending);
    
    return result;
  }

  /**
   * 对图片数组进行分类
   * @param {Array} images - 图片对象数组或Image实例数组
   * @param {string} criteria - 分类标准: 'fileType', 'domain'
   * @returns {Object} 分类结果，键为分类值，值为图片数组
   */
  categorizeImages(images, criteria) {
    if (!Array.isArray(images)) {
      return {};
    }
    
    // 确保所有对象都是Image实例
    const imageInstances = this.convertToImageInstances(images);
    
    // 执行分类
    const result = {};
    
    // 对每个图片进行分类
    imageInstances.forEach(img => {
      let categoryKey;
      
      switch (criteria) {
        case 'fileType':
          categoryKey = img.getFileType();
          break;
        case 'domain':
          categoryKey = img.getDomain();
          break;
        default:
          categoryKey = 'unknown';
      }
      
      // 构建结果对象
      if (!result[categoryKey]) {
        result[categoryKey] = [];
      }
      result[categoryKey].push(img);
    });
    
    return result;
  }

  /**
   * 获取特定分类下的图片
   * @param {Array} allImages - 所有图片数组
   * @param {string} categoryCriteria - 分类标准
   * @param {string} categoryValue - 分类值
   * @returns {Array} 该分类下的图片数组
   */
  getImagesByCategory(allImages, categoryCriteria, categoryValue) {
    if (!Array.isArray(allImages)) {
      return [];
    }
    
    // 确保所有对象都是Image实例
    const imageInstances = this.convertToImageInstances(allImages);
    
    // 获取完整分类结果
    const allCategories = this.categorizeImages(imageInstances, categoryCriteria);
    
    // 提取特定分类的图片
    const result = allCategories[categoryValue] || [];
    
    return result;
  }



  /**
   * 懒加载图片尺寸信息
   * @param {Object|Image} image - 图片对象或Image实例
   * @returns {Promise<Object>} 包含图片尺寸的Promise
   */
  async loadImageDimensions(image) {
    // 确保是Image实例
    const imageInstance = image instanceof Image ? image : 
                         (image.url ? new Image(image.url, image.id) : null);
    
    if (!imageInstance) {
      throw new Error('无效的图片对象');
    }
    
    // 创建图片对象加载尺寸
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const size = { width: img.width, height: img.height };
          // 更新Image实例的尺寸信息
          imageInstance.updateDimensions(size.width, size.height);
          resolve(size);
        };
        
        img.onerror = () => {
          // 加载失败时设置默认尺寸
          const size = { width: 0, height: 0 };
          // 标记图片加载失败
          imageInstance.markAsFailed();
          resolve(size);
        };
        
        // 设置超时
        setTimeout(() => {
          const size = { width: 0, height: 0 };
          // 标记图片加载失败
          imageInstance.markAsFailed();
          resolve(size);
        }, 3000);
        
        img.src = imageInstance.url;
      } catch (error) {
        console.error('加载图片尺寸失败:', error);
        reject(error);
      }
    });
  }
}

// 创建并导出单例实例
const imageProcessor = new ImageProcessor();

// 导出模块
export default imageProcessor;
export { ImageProcessor, Image };

// 兼容CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = imageProcessor;
  module.exports.default = imageProcessor;
  module.exports.ImageProcessor = ImageProcessor;
  module.exports.Image = Image;
}

// 兼容浏览器环境
if (typeof window !== 'undefined') {
  window.imageProcessor = imageProcessor;
  window.ImageProcessor = ImageProcessor;
}