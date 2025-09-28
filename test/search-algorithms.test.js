// 搜索算法单元测试
const { CacheTreeManager, CacheLeafNode, TreeNode } = require('../tree-cache.js');

module.exports = function(runner) {
  runner.describe('搜索算法测试', () => {
    let cacheManager;

    runner.beforeEach(() => {
      cacheManager = new CacheTreeManager();
    });

    runner.describe('深度搜索测试', () => {
      runner.it('应该能够找到叶子节点缓存', () => {
        const cacheNode = cacheManager.addCacheNode('targetCache');
        cacheNode.setCache({ data: 'found' });

        const result = cacheManager.deepSearch((node) => {
          if (node.name === 'targetCache' && node.hasValidCache()) {
            return true; // 返回true表示找到目标节点
          }
          return false; // 返回false继续搜索
        });

        runner.expect(result).toEqual({ data: 'found' });
      });

      runner.it('应该能够处理多层树结构搜索', () => {
        const parentNode = cacheManager.addCacheNode('parent', 'tree');
        const childCache = new CacheLeafNode('childCache');
        parentNode.addChild(childCache);
        childCache.setCache({ nested: 'data' });

        const result = cacheManager.deepSearch((node) => {
          if (node.name === 'childCache' && node.hasValidCache()) {
            return true; // 找到目标节点
          }
          return false; // 继续搜索
        });

        runner.expect(result).toEqual({ nested: 'data' });
      });

      runner.it('应该返回null当搜索未找到结果', () => {
        const result = cacheManager.deepSearch((node) => {
          if (node.name === 'nonExistent') {
            return node;
          }
          return null;
        });

        runner.expect(result).toBeNull();
      });

      runner.it('应该处理节点判断函数返回null的情况', () => {
        const cacheNode = cacheManager.addCacheNode('testCache');
        cacheNode.setCache({ data: 'test' });

        const result = cacheManager.deepSearch((node) => {
          return null; // 直接返回null，停止搜索
        });

        runner.expect(result).toBeNull();
      });

      runner.it('应该遵守最大深度限制', () => {
        // 创建深度为5的树结构
        let currentNode = cacheManager.root;
        for (let i = 0; i < 10; i++) {
          const newNode = new TreeNode(`node${i}`);
          currentNode.addChild(newNode);
          currentNode = newNode;
        }

        const deepCache = new CacheLeafNode('deepCache');
        currentNode.addChild(deepCache);
        deepCache.setCache({ deep: 'data' });

        // 使用较小的深度限制
        const result = cacheManager.deepSearch((node) => {
          if (node.name === 'deepCache' && node.hasValidCache()) {
            return true;
          }
          return false; // 继续搜索
        }, cacheManager.root, 3); // 最大深度3

        runner.expect(result).toBeNull(); // 应该找不到，因为深度限制
      });

      runner.it('应该抛出错误当节点判断函数不是函数', () => {
        runner.expect(() => {
          cacheManager.deepSearch('not a function');
        }).toThrow('节点判断方法必须是一个函数');
      });
    });

    runner.describe('广度优先搜索测试', () => {
      runner.it('应该能够找到叶子节点缓存', () => {
        const cacheNode = cacheManager.addCacheNode('targetCache');
        cacheNode.setCache({ data: 'found' });

        const result = cacheManager.breadthFirstSearch((node) => {
          if (node.name === 'targetCache' && node.hasValidCache()) {
            return true;
          }
          return false;
        });

        runner.expect(result).toEqual({ data: 'found' });
      });

      runner.it('应该按广度优先顺序搜索', () => {
        const level1Node1 = cacheManager.addCacheNode('level1-1', 'tree');
        const level1Node2 = cacheManager.addCacheNode('level1-2', 'tree');
        
        const level2Node1 = new CacheLeafNode('level2-1');
        const level2Node2 = new CacheLeafNode('level2-2');
        
        level1Node1.addChild(level2Node1);
        level1Node2.addChild(level2Node2);
        
        level2Node1.setCache({ data: 'first' });
        level2Node2.setCache({ data: 'second' });

        const searchOrder = [];
        const result = cacheManager.breadthFirstSearch((node) => {
          searchOrder.push(node.name);
          
          if (node.name === 'level2-1' && node.hasValidCache()) {
            return true;
          }
          return false;
        });

        runner.expect(result).toEqual({ data: 'first' });
        // 广度优先应该先搜索level1节点，再搜索level2节点
        runner.expect(searchOrder[0]).toBe('root');
        runner.expect(searchOrder).toContain('level1-1');
        runner.expect(searchOrder).toContain('level1-2');
      });

      runner.it('应该处理复杂树结构', () => {
        // 创建复杂树结构测试搜索能力
        const cache1 = cacheManager.addCacheNode('cache1');
        const branch1 = cacheManager.addCacheNode('branch1', 'tree');
        const cache2 = new CacheLeafNode('cache2');
        const cache3 = new CacheLeafNode('cache3');
        
        branch1.addChild(cache2);
        branch1.addChild(cache3);
        
        cache1.setCache({ data: 'cache1' });
        cache2.setCache({ data: 'cache2' });
        cache3.setCache({ data: 'cache3' });

        const foundCaches = [];
        const result = cacheManager.breadthFirstSearch((node) => {
          if (node instanceof CacheLeafNode && node.hasValidCache()) {
            foundCaches.push(node.getCache());
            return true; // 找到第一个有效缓存就返回
          }
          return false;
        });

        runner.expect(foundCaches.length).toBeGreaterThan(0);
        runner.expect(result).toBeDefined();
      });
    });

    runner.describe('搜索算法对比测试', () => {
      runner.it('深度搜索和广度搜索应该都能找到结果', () => {
        const targetCache = cacheManager.addCacheNode('target');
        targetCache.setCache({ result: 'success' });

        const deepResult = cacheManager.deepSearch((node) => {
          if (node.name === 'target' && node.hasValidCache()) return true;
          return false;
        });

        const breadthResult = cacheManager.breadthFirstSearch((node) => {
          if (node.name === 'target' && node.hasValidCache()) return true;
          return false;
        });

        runner.expect(deepResult).toEqual({ result: 'success' });
        runner.expect(breadthResult).toEqual({ result: 'success' });
      });
    });
  });
};