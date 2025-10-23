/**
 * 图片处理纯函数库
 * 提供纯函数式的排序器、分类器和过滤器
 */

// 导入必要的依赖
import Image from './Image.js';

/**
 * 将普通图片对象数组转换为Image实例数组
 * @param {Array} imageObjects - 普通图片对象数组
 * @returns {Array} Image实例数组
 */
function convertToImageInstances(imageObjects) {
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

// ===== 纯函数式排序器（sortByXXX系列函数） =====

/**
 * 通用排序函数 - 接受自定义比较器
 * @param {Array} images - 图片对象数组
 * @param {Function} comparator - 比较函数 (a, b) => number
 * @returns {Array} 排序后的新数组
 */
export function sortByComparator(images, comparator) {
  if (!Array.isArray(images) || typeof comparator !== 'function') {
    return [];
  }
  
  if (images.length <= 1) {
    return [...images];
  }
  
  // 创建数组副本并排序
  return [...images].sort(comparator);
}

/**
 * 按文件名排序
 * @param {Array} images - 图片对象数组
 * @param {boolean} ascending - 是否升序排列，默认为true
 * @returns {Array} 排序后的图片数组
 */
export function sortByFilename(images, ascending = true) {
  if (!Array.isArray(images)) {
    return [];
  }
  
  if (images.length <= 1) {
    return [...images];
  }
  
  const imageInstances = convertToImageInstances(images);
  
  return sortByComparator(imageInstances, (a, b) => {
    const aValue = a.getFilename().toLowerCase();
    const bValue = b.getFilename().toLowerCase();
    
    if (aValue < bValue) return ascending ? -1 : 1;
    if (aValue > bValue) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * 按文件类型排序
 * @param {Array} images - 图片对象数组
 * @param {boolean} ascending - 是否升序排列，默认为true
 * @returns {Array} 排序后的图片数组
 */
export function sortByFileType(images, ascending = true) {
  if (!Array.isArray(images)) {
    return [];
  }
  
  if (images.length <= 1) {
    return [...images];
  }
  
  const imageInstances = convertToImageInstances(images);
  
  return sortByComparator(imageInstances, (a, b) => {
    const aValue = a.getFileType();
    const bValue = b.getFileType();
    
    if (aValue < bValue) return ascending ? -1 : 1;
    if (aValue > bValue) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * 按文件大小排序
 * @param {Array} images - 图片对象数组
 * @param {boolean} ascending - 是否升序排列，默认为true
 * @returns {Array} 排序后的图片数组
 */
export function sortByFileSize(images, ascending = true) {
  if (!Array.isArray(images)) {
    return [];
  }
  
  if (images.length <= 1) {
    return [...images];
  }
  
  const imageInstances = convertToImageInstances(images);
  
  return sortByComparator(imageInstances, (a, b) => {
    const aValue = a.getFileSize();
    const bValue = b.getFileSize();
    
    if (aValue < bValue) return ascending ? -1 : 1;
    if (aValue > bValue) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * 按图片尺寸排序
 * @param {Array} images - 图片对象数组
 * @param {boolean} ascending - 是否升序排列，默认为true
 * @returns {Array} 排序后的图片数组
 */
export function sortByDimensions(images, ascending = true) {
  if (!Array.isArray(images)) {
    return [];
  }
  
  if (images.length <= 1) {
    return [...images];
  }
  
  const imageInstances = convertToImageInstances(images);
  
  return sortByComparator(imageInstances, (a, b) => {
    const aArea = a.width * a.height;
    const bArea = b.width * b.height;
    
    if (aArea < bArea) return ascending ? -1 : 1;
    if (aArea > bArea) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * 按宽高比排序
 * @param {Array} images - 图片对象数组
 * @param {boolean} ascending - 是否升序排列，默认为true
 * @returns {Array} 排序后的图片数组
 */
export function sortByAspectRatio(images, ascending = true) {
  if (!Array.isArray(images)) {
    return [];
  }
  
  if (images.length <= 1) {
    return [...images];
  }
  
  const imageInstances = convertToImageInstances(images);
  
  return sortByComparator(imageInstances, (a, b) => {
    const aRatio = a.width / a.height;
    const bRatio = b.width / b.height;
    
    if (aRatio < bRatio) return ascending ? -1 : 1;
    if (aRatio > bRatio) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * 按域名排序
 * @param {Array} images - 图片对象数组
 * @param {boolean} ascending - 是否升序排列，默认为true
 * @returns {Array} 排序后的图片数组
 */
export function sortByDomain(images, ascending = true) {
  if (!Array.isArray(images)) {
    return [];
  }
  
  if (images.length <= 1) {
    return [...images];
  }
  
  const imageInstances = convertToImageInstances(images);
  
  return sortByComparator(imageInstances, (a, b) => {
    const aValue = a.getDomain();
    const bValue = b.getDomain();
    
    if (aValue < bValue) return ascending ? -1 : 1;
    if (aValue > bValue) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * 增量排序 - 将新图片合并到已排序数组
 * @param {Array} alreadySortedImages - 已排序的图片数组
 * @param {Array} newImages - 新添加的图片数组
 * @param {Function} sortFunction - 排序函数
 * @param {boolean} ascending - 是否升序
 * @returns {Array} 更新后的排序数组
 */
export function incrementalSort(alreadySortedImages, newImages, sortFunction, ascending = true) {
  if (!Array.isArray(alreadySortedImages) || !Array.isArray(newImages)) {
    return alreadySortedImages || [];
  }
  
  const sortedInstances = convertToImageInstances(alreadySortedImages);
  const newInstances = convertToImageInstances(newImages);
  const mergedImages = [...sortedInstances, ...newInstances];
  
  return sortFunction(mergedImages, ascending);
}

// ===== 函数式工具函数（续）=====

/**
 * 创建分类函数工厂
 * @param {Function} categoryGetter - 从图片对象获取分类值的函数
 * @returns {Function} 分类函数
 */
function createCategorizeFunction(categoryGetter) {
  return (images) => {
    return categorizeByFunction(images, categoryGetter);
  };
}

// ===== 纯函数式分类器（categorizeByXXX系列函数） =====

/**
 * 通用分类函数
 * @param {Array} images - 图片对象数组
 * @param {Function} categoryFn - 分类函数 (image) => string
 * @returns {Object} 分类结果，键为分类值，值为图片数组
 */
export function categorizeByFunction(images, categoryFn) {
  if (!Array.isArray(images) || typeof categoryFn !== 'function') {
    return {};
  }
  
  const imageInstances = convertToImageInstances(images);
  
  return imageInstances.reduce((categories, img) => {
    const categoryKey = categoryFn(img);
    if (!categories[categoryKey]) {
      categories[categoryKey] = [];
    }
    categories[categoryKey].push(img);
    return categories;
  }, {});
}

/**
 * 按文件类型分类
 * @param {Array} images - 图片对象数组
 * @returns {Object} 按文件类型分类的结果
 */
export const categorizeByFileType = createCategorizeFunction(img => img.getFileType());

/**
 * 按域名分类
 * @param {Array} images - 图片对象数组
 * @returns {Object} 按域名分类的结果
 */
export const categorizeByDomain = createCategorizeFunction(img => img.getDomain());

/**
 * 获取特定分类下的图片
 * @param {Object} categories - 分类结果对象
 * @param {string} categoryValue - 分类值
 * @returns {Array} 该分类下的图片数组
 */
export function getImagesByCategory(categories, categoryValue) {
  if (!categories || typeof categories !== 'object') {
    return [];
  }
  
  return categories[categoryValue] || [];
}

/**
 * 创建过滤函数工厂
 * @param {Function} filterGetter - 从图片对象获取过滤条件的函数
 * @returns {Function} 过滤函数
 */
function createFilterFunction(filterGetter) {
  return (images, filterValue) => {
    return filterByFunction(images, filterGetter(filterValue));
  };
}

// ===== 纯函数式过滤器（filterByXXX系列函数） =====

/**
 * 通用过滤函数
 * @param {Array} images - 图片对象数组
 * @param {Function} filterFn - 过滤函数 (image) => boolean
 * @returns {Array} 过滤后的图片数组
 */
export function filterByFunction(images, filterFn) {
  if (!Array.isArray(images) || typeof filterFn !== 'function') {
    return [];
  }
  
  const imageInstances = convertToImageInstances(images);
  
  return imageInstances.filter(img => filterFn(img));
}

/**
 * 按文件类型过滤
 * @param {Array} images - 图片对象数组
 * @param {Array|string} fileTypes - 允许的文件类型数组或单个文件类型
 * @returns {Array} 过滤后的图片数组
 */
export const filterByFileType = createFilterFunction(fileTypes => {
  const allowedTypes = Array.isArray(fileTypes) ? 
    fileTypes.map(type => type.toLowerCase()) : 
    [fileTypes.toLowerCase()];
  
  return img => allowedTypes.includes(img.getFileType().toLowerCase());
});

/**
 * 按域名过滤
 * @param {Array} images - 图片对象数组
 * @param {Array|string} domains - 允许的域名数组或单个域名
 * @returns {Array} 过滤后的图片数组
 */
export const filterByDomain = createFilterFunction(domains => {
  const allowedDomains = Array.isArray(domains) ? 
    domains.map(domain => domain.toLowerCase()) : 
    [domains.toLowerCase()];
  
  return img => allowedDomains.includes(img.getDomain().toLowerCase());
});

/**
 * 按图片尺寸过滤
 * @param {Array} images - 图片对象数组
 * @param {Object} options - 过滤选项 { minWidth, maxWidth, minHeight, maxHeight }
 * @returns {Array} 过滤后的图片数组
 */
export const filterByDimensions = createFilterFunction(options => {
  const { minWidth, maxWidth, minHeight, maxHeight } = options || {};
  
  return img => {
    // 如果图片没有尺寸信息，跳过过滤
    if (!img.width || !img.height) {
      return false;
    }
    
    if (minWidth !== undefined && img.width < minWidth) return false;
    if (maxWidth !== undefined && img.width > maxWidth) return false;
    if (minHeight !== undefined && img.height < minHeight) return false;
    if (maxHeight !== undefined && img.height > maxHeight) return false;
    
    return true;
  };
});

// 默认导出所有函数
export default {
  // 排序器
  sortByComparator,
  sortByFilename,
  sortByFileType,
  sortByFileSize,
  sortByDimensions,
  sortByAspectRatio,
  sortByDomain,
  incrementalSort,
  
  // 分类器
  categorizeByFunction,
  categorizeByFileType,
  categorizeByDomain,
  getImagesByCategory,
  
  // 过滤器
  filterByFunction,
  filterByFileType,
  filterByDomain,
  filterByDimensions,
  
  // 工具函数
  convertToImageInstances
};

// 兼容CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ...module.exports,
    sortByComparator,
    sortByFilename,
    sortByFileType,
    sortByFileSize,
    sortByDimensions,
    sortByAspectRatio,
    sortByDomain,
    incrementalSort,
    categorizeByFunction,
    categorizeByFileType,
    categorizeByDomain,
    getImagesByCategory,
    filterByFunction,
    filterByFileType,
    filterByDomain,
    filterByDimensions,
    convertToImageInstances
  };
}

// 兼容浏览器环境
if (typeof window !== 'undefined') {
  window.imageProcessor = {
    sortByComparator,
    sortByFilename,
    sortByFileType,
    sortByFileSize,
    sortByDimensions,
    sortByAspectRatio,
    sortByDomain,
    incrementalSort,
    categorizeByFunction,
    categorizeByFileType,
    categorizeByDomain,
    getImagesByCategory,
    filterByFunction,
    filterByFileType,
    filterByDomain,
    filterByDimensions,
    convertToImageInstances
  };
}