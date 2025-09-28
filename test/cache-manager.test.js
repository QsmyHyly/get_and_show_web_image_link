// CacheTreeManager类单元测试
const { CacheTreeManager, CacheLeafNode, TreeNode } = require('../tree-cache.js');

module.exports = function(runner) {
  runner.describe('CacheTreeManager类测试', () => {
    let cacheManager;

    runner.beforeEach(() => {
      cacheManager = new CacheTreeManager();
    });

    runner.it('应该正确创建缓存树管理器', () => {
      runner.expect(cacheManager.root).toBeDefined();
      runner.expect(cacheManager.root.name).toBe('root');
      runner.expect(cacheManager.root.getChildNames()).toEqual([]);
    });

    runner.it('应该能够添加叶子缓存节点', () => {
      const cacheNode = cacheManager.addCacheNode('testCache');
      
      runner.expect(cacheNode).toBeInstanceOf(CacheLeafNode);
      runner.expect(cacheNode.name).toBe('testCache');
      runner.expect(cacheManager.root.hasChild('testCache')).toBe(true);
    });

    runner.it('应该能够添加普通树节点', () => {
      const treeNode = cacheManager.addCacheNode('testNode', 'tree');
      
      runner.expect(treeNode).toBeInstanceOf(TreeNode);
      runner.expect(treeNode.name).toBe('testNode');
      runner.expect(cacheManager.root.hasChild('testNode')).toBe(true);
    });

    runner.it('应该能够获取缓存节点', () => {
      const cacheNode = cacheManager.addCacheNode('testCache');
      const retrievedNode = cacheManager.getCacheNode('testCache');
      
      runner.expect(retrievedNode).toBe(cacheNode);
      runner.expect(cacheManager.getCacheNode('nonExistent')).toBeUndefined();
    });

    runner.it('应该能够清空所有缓存', () => {
      const cacheNode1 = cacheManager.addCacheNode('cache1');
      const cacheNode2 = cacheManager.addCacheNode('cache2');
      
      cacheNode1.setCache({ data: 'test1' });
      cacheNode2.setCache({ data: 'test2' });
      
      runner.expect(cacheNode1.hasValidCache()).toBe(true);
      runner.expect(cacheNode2.hasValidCache()).toBe(true);
      
      cacheManager.clearAllCache();
      
      runner.expect(cacheNode1.hasValidCache()).toBe(false);
      runner.expect(cacheNode2.hasValidCache()).toBe(false);
    });

    runner.it('应该能够获取缓存统计信息', () => {
      const cacheNode1 = cacheManager.addCacheNode('cache1');
      const cacheNode2 = cacheManager.addCacheNode('cache2');
      const treeNode = cacheManager.addCacheNode('treeNode', 'tree');
      
      cacheNode1.setCache({ data: 'test1' });
      
      const stats = cacheManager.getCacheStats();
      
      runner.expect(stats.totalNodes).toBe(3);
      runner.expect(stats.leafNodes).toBe(2);
      runner.expect(stats.cachedNodes).toBe(1);
      runner.expect(stats.nodeNames).toContain('cache1');
      runner.expect(stats.nodeNames).toContain('cache2');
      runner.expect(stats.nodeNames).toContain('treeNode');
    });

    runner.it('应该能够处理多层节点结构', () => {
      const parentNode = cacheManager.addCacheNode('parent', 'tree');
      const childCache = new CacheLeafNode('childCache');
      parentNode.addChild(childCache);
      
      childCache.setCache({ nested: 'data' });
      
      runner.expect(cacheManager.root.hasChild('parent')).toBe(true);
      runner.expect(parentNode.hasChild('childCache')).toBe(true);
      runner.expect(childCache.hasValidCache()).toBe(true);
    });
  });
};