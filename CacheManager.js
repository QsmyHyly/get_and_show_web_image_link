/**
 * 缓存管理器 - 简化版通用缓存管理类
 * 提供缓存的存储、获取和直接删除功能
 * 不依赖于具体的缓存内容，适用于各种数据的缓存
 */
class CacheManager {
  /**
   * 构造函数
   */
  constructor() {
    // 单一通用缓存Map - 键为字符串，值为缓存数据
    this.cache = new Map();
  }

  /**
   * 获取缓存数据
   * @param {string} cacheKey - 缓存键
   * @returns {*|null} 缓存数据，如果不存在则返回null
   */
  getCachedData(cacheKey) {
    const cachedItem = this.cache.get(cacheKey);
    return cachedItem || null;
  }

  /**
   * 设置缓存数据
   * @param {string} cacheKey - 缓存键
   * @param {*} data - 要缓存的数据（任意类型）
   */
  setCachedData(cacheKey, data) {
    this.cache.set(cacheKey, data);
    console.log('缓存数据已设置:', cacheKey);
  }

  /**
   * 使缓存失效（直接删除匹配的缓存项）
   * @param {string|RegExp} cacheType - 缓存类型或正则表达式，用于匹配多个缓存键
   */
  invalidateCache(cacheType) {
    let count = 0;
    
    for (const key of this.cache.keys()) {
      let shouldDelete = false;
      
      if (cacheType instanceof RegExp) {
        // 正则表达式匹配
        shouldDelete = cacheType.test(key);
      } else if (typeof cacheType === 'string') {
        // 字符串前缀匹配或完全匹配
        shouldDelete = key === cacheType || key.startsWith(cacheType);
      }
      
      if (shouldDelete) {
        this.cache.delete(key);
        count++;
      }
    }
    
    console.log(`已失效并删除 ${count} 个缓存项，匹配条件:`, cacheType);
  }

  /**
   * 清除所有缓存
   */
  clearAllCaches() {
    this.cache.clear();
    console.log('所有缓存已清除');
  }
  
  /**
   * 获取缓存项数量
   * @returns {number} 缓存项数量
   */
  getCacheSize() {
    return this.cache.size;
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