/**
 * 缓存管理器 - 通用缓存管理类
 * 提供缓存的存储、获取、失效标记等功能
 * 不依赖于具体的缓存内容，适用于各种数据的缓存
 */
class CacheManager {
  /**
   * 构造函数
   */
  constructor() {
    // 单一通用缓存Map - 键为字符串，值为缓存数据和时间戳
    this.cache = new Map();
    // 缓存有效性标记 - 键为缓存类型（字符串或正则表达式），值为布尔值
    this.cacheInvalidationFlags = new Map();
  }

  /**
   * 获取缓存数据
   * @param {string} cacheKey - 缓存键
   * @returns {Object|null} 缓存数据，如果不存在或已失效则返回null
   */
  getCachedData(cacheKey) {
    const cacheItem = this.cache.get(cacheKey);
    
    // 检查缓存是否存在且未被标记为失效
    if (cacheItem && !this.isCacheInvalidated(cacheKey)) {
      return cacheItem.data;
    }
    
    // 如果缓存已失效或不存在，从缓存中删除
    if (cacheItem && this.isCacheInvalidated(cacheKey)) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * 设置缓存数据
   * @param {string} cacheKey - 缓存键
   * @param {*} data - 要缓存的数据（任意类型）
   */
  setCachedData(cacheKey, data) {
    // 使用对象包装数据，包含数据和时间戳
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    console.log('缓存数据已设置:', cacheKey);
  }

  /**
   * 标记缓存为失效
   * @param {string|RegExp} cacheType - 缓存类型或正则表达式，用于匹配多个缓存键
   */
  invalidateCache(cacheType) {
    this.cacheInvalidationFlags.set(cacheType, true);
    console.log('缓存标记为失效:', cacheType);
  }

  /**
   * 清除缓存失效标记
   * @param {string|RegExp} cacheType - 缓存类型或正则表达式
   */
  clearInvalidationFlag(cacheType) {
    this.cacheInvalidationFlags.delete(cacheType);
    console.log('清除缓存失效标记:', cacheType);
  }
  
  /**
   * 检查缓存是否已标记为失效
   * @param {string} cacheKey - 缓存键
   * @returns {boolean} 是否已失效
   */
  isCacheInvalidated(cacheKey) {
    // 检查是否有与该缓存键匹配的失效标记
    for (const [invalidKey] of this.cacheInvalidationFlags.entries()) {
      if (invalidKey instanceof RegExp) {
        // 正则表达式匹配
        if (invalidKey.test(cacheKey)) {
          return true;
        }
      } else if (typeof invalidKey === 'string') {
        // 字符串前缀匹配
        if (cacheKey.startsWith(invalidKey)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 清除所有缓存
   */
  clearAllCaches() {
    this.cache.clear();
    this.cacheInvalidationFlags.clear();
    console.log('所有缓存已清除');
  }
  
  /**
   * 获取缓存项数量
   * @returns {number} 缓存项数量
   */
  getCacheSize() {
    return this.cache.size;
  }
  
  /**
   * 获取失效标记数量
   * @returns {number} 失效标记数量
   */
  getInvalidationFlagCount() {
    return this.cacheInvalidationFlags.size;
  }
  

}

// 创建并导出单例实例
const cacheManager = new CacheManager();

// 导出模块
export default cacheManager;
export { CacheManager };

// 兼容CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cacheManager;
  module.exports.default = cacheManager;
  module.exports.CacheManager = CacheManager;
}

// 兼容浏览器环境
if (typeof window !== 'undefined') {
  window.cacheManager = cacheManager;
  window.CacheManager = CacheManager;
}