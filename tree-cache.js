// 树形缓存容器实现
class TreeNode {
  constructor(name) {
    this.name = name;
    this.children = {};
  }

  addChild(node) {
    this.children[node.name] = node;
  }

  getChild(name) {
    return this.hasChild(name) ? this.children[name] : undefined;
  }

  // 获取所有子节点名称
  getChildNames() {
    return Object.keys(this.children);
  }

  // 检查是否存在指定子节点
  hasChild(name) {
    return name in this.children;
  }

  // 移除子节点
  removeChild(name) {
    if (this.hasChild(name)) {
      delete this.children[name];
      return true;
    }
    return false;
  }
}

class CacheLeafNode extends TreeNode {
  constructor(name) {
    super(name);
    this.cache = null;
    this.lastUpdated = null;
    this.maxAge = null; // 缓存最大有效期（毫秒）
  }

  // 设置缓存
  setCache(data) {
    this.cache = data;
    this.lastUpdated = new Date();
    return this;
  }

  // 设置缓存最大有效期
  setMaxAge(milliseconds) {
    this.maxAge = milliseconds;
    return this;
  }

  // 获取缓存
  getCache() {
    return this.cache;
  }

  // 清空缓存
  clearCache() {
    const oldCache = this.cache;
    this.cache = null;
    this.lastUpdated = null;
    return oldCache;
  }

  // 检查缓存是否存在且有效
  hasValidCache() {
    // 如果没有缓存，则无效
    if (this.cache === null || this.cache === undefined) {
      return false;
    }
    
    // 如果设置了最大有效期，检查是否过期
    if (this.maxAge !== null && this.lastUpdated !== null) {
      const now = new Date();
      const age = now - this.lastUpdated;
      return age <= this.maxAge;
    }
    
    // 默认有缓存就是有效的
    return true;
  }
  
  // 获取缓存年龄（毫秒）
  getCacheAge() {
    if (this.lastUpdated === null) {
      return null;
    }
    return new Date() - this.lastUpdated;
  }
}

// 缓存树管理器
class CacheTreeManager {
  constructor() {
    this.root = new TreeNode('root');
  }

  // 添加缓存节点
  addCacheNode(name, type = 'leaf') {
    let node;
    if (type === 'leaf') {
      node = new CacheLeafNode(name);
    } else {
      node = new TreeNode(name);
    }
    this.root.addChild(node);
    return node;
  }

  // 获取缓存节点
  getCacheNode(name) {
    return this.root.getChild(name);
  }

  // 清空所有缓存
  clearAllCache() {
    const childNames = this.root.getChildNames();
    childNames.forEach(name => {
      const node = this.root.getChild(name);
      if (node instanceof CacheLeafNode) {
        node.clearCache();
      }
    });
  }

  // 获取缓存统计信息
  getCacheStats() {
    const stats = {
      totalNodes: 0,
      leafNodes: 0,
      cachedNodes: 0,
      nodeNames: []
    };

    // 获取根节点的所有子节点名称
    const childNames = this.root.getChildNames();
    stats.totalNodes = childNames.length;
    stats.nodeNames = [...childNames]; // 创建副本避免引用问题

    // 遍历所有子节点统计信息
    childNames.forEach(name => {
      const node = this.root.getChild(name);
      if (node instanceof CacheLeafNode) {
        stats.leafNodes++;
        if (node.hasValidCache()) {
          stats.cachedNodes++;
        }
      }
    });

    return stats;
  }

  // 深度搜索树结构
  deepSearch(nodeEvaluator, startNode = this.root, maxDepth = 10) {
    if (typeof nodeEvaluator !== 'function') {
      throw new Error('节点判断方法必须是一个函数');
    }

    if (maxDepth <= 0) {
      console.warn('达到最大搜索深度，停止搜索');
      return null;
    }

    // 执行节点判断方法
    const result = nodeEvaluator(startNode);
    
    // 如果判断方法返回true，表示找到目标节点
    if (result === true) {
      // 如果是叶子节点，返回其缓存
      if (startNode instanceof CacheLeafNode) {
        return startNode.getCache();
      }
      // 如果是普通节点，返回节点本身
      return startNode;
    }
    
    // 如果判断方法返回false/null/undefined，继续搜索子节点
    if (result === false || result === null || result === undefined) {
      const childNames = startNode.getChildNames();
      for (const childName of childNames) {
        const childNode = startNode.getChild(childName);
        const searchResult = this.deepSearch(nodeEvaluator, childNode, maxDepth - 1);
        if (searchResult !== null && searchResult !== undefined) {
          return searchResult;
        }
      }
    }
    
    // 如果判断方法返回其他值，直接返回该值
    return result !== false ? result : null;
  }

  // 广度优先搜索树结构
  breadthFirstSearch(nodeEvaluator, startNode = this.root, maxDepth = 10) {
    if (typeof nodeEvaluator !== 'function') {
      throw new Error('节点判断方法必须是一个函数');
    }

    const queue = [{ node: startNode, depth: 0 }];
    
    while (queue.length > 0) {
      const { node, depth } = queue.shift();
      
      if (depth > maxDepth) {
        console.warn('达到最大搜索深度，停止搜索');
        return null;
      }

      // 执行节点判断方法
      const result = nodeEvaluator(node);
      
      // 如果判断方法返回true，表示找到目标节点
      if (result === true) {
        // 如果是叶子节点，返回其缓存
        if (node instanceof CacheLeafNode) {
          return node.getCache();
        }
        // 如果是普通节点，返回节点本身
        return node;
      }
      
      // 如果判断方法返回false/null/undefined，继续搜索子节点
      if (result === false || result === null || result === undefined) {
        const childNames = node.getChildNames();
        childNames.forEach(childName => {
          const childNode = node.getChild(childName);
          queue.push({ node: childNode, depth: depth + 1 });
        });
        continue;
      }
      
      // 如果判断方法返回其他值，直接返回该值
      return result;
    }
    
    return null;
  }
}

// 使用示例和文档
/**
 * 树缓存模块使用示例：
 * 
 * // 创建缓存树管理器
 * const cacheManager = new CacheTreeManager();
 * 
 * // 添加缓存节点
 * const sortCache = cacheManager.addCacheNode('sortCache');
 * const imageTypeCache = cacheManager.addCacheNode('imageTypeCache');
 * 
 * // 设置缓存数据
 * sortCache.setCache({ sortedImages: [...] });
 * imageTypeCache.setCache({ jpg: [...], png: [...] });
 * 
 * // 使用深度搜索查找特定缓存
 * const result = cacheManager.deepSearch((node) => {
 *   if (node.name === 'sortCache' && node.hasValidCache()) {
 *     return node; // 返回叶子节点
 *   }
 *   return null; // 停止搜索
 * });
 * 
 * // 使用广度优先搜索
 * const result2 = cacheManager.breadthFirstSearch((node) => {
 *   if (node.name === 'imageTypeCache') {
 *     return node; // 返回节点继续搜索其子节点
 *   }
 *   return null;
 * });
 */

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TreeNode,
    CacheLeafNode,
    CacheTreeManager
  };
}