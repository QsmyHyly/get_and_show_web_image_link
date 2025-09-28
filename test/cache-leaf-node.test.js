// CacheLeafNode类单元测试
const { CacheLeafNode } = require('../tree-cache.js');

module.exports = function(runner) {
  runner.describe('CacheLeafNode类测试', () => {
    let cacheNode;

    runner.beforeEach(() => {
      cacheNode = new CacheLeafNode('testCache');
    });

    runner.it('应该正确创建缓存节点', () => {
      runner.expect(cacheNode.name).toBe('testCache');
      runner.expect(cacheNode.cache).toBeNull();
      runner.expect(cacheNode.children).toEqual({});
    });

    runner.it('应该能够设置和获取缓存', () => {
      const testData = { key: 'value', numbers: [1, 2, 3] };
      
      cacheNode.setCache(testData);
      runner.expect(cacheNode.getCache()).toBe(testData);
    });

    runner.it('应该能够清空缓存', () => {
      cacheNode.setCache({ data: 'test' });
      runner.expect(cacheNode.getCache()).not.toBeNull();
      
      cacheNode.clearCache();
      runner.expect(cacheNode.getCache()).toBeNull();
    });

    runner.it('应该能够检查缓存有效性', () => {
      runner.expect(cacheNode.hasValidCache()).toBe(false);
      
      cacheNode.setCache({ data: 'test' });
      runner.expect(cacheNode.hasValidCache()).toBe(true);
      
      cacheNode.clearCache();
      runner.expect(cacheNode.hasValidCache()).toBe(false);
    });

    runner.it('应该继承TreeNode的功能', () => {
      const childNode = new CacheLeafNode('childCache');
      cacheNode.addChild(childNode);
      
      runner.expect(cacheNode.hasChild('childCache')).toBe(true);
      runner.expect(cacheNode.getChild('childCache')).toBe(childNode);
      
      const childNames = cacheNode.getChildNames();
      runner.expect(childNames).toContain('childCache');
    });

    runner.it('应该能够处理不同类型的缓存数据', () => {
      // 测试字符串缓存
      cacheNode.setCache('string data');
      runner.expect(cacheNode.getCache()).toBe('string data');
      
      // 测试数组缓存
      cacheNode.setCache([1, 2, 3]);
      runner.expect(cacheNode.getCache()).toEqual([1, 2, 3]);
      
      // 测试数字缓存
      cacheNode.setCache(42);
      runner.expect(cacheNode.getCache()).toBe(42);
      
      // 测试null缓存
      cacheNode.setCache(null);
      runner.expect(cacheNode.getCache()).toBeNull();
    });
  });
};