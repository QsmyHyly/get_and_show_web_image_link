// 缓存过期测试 - 测试缓存过期和自动清理功能
const { CacheTreeManager, CacheLeafNode } = require('../tree-cache.js');

// 测试套件
const runner = {
  describe(suiteName, testFn) {
    console.log(`\n🏃 运行测试套件: ${suiteName}`);
    console.log('──────────────────────────────────────────────────');
    this.currentSuite = suiteName;
    testFn();
    console.log(`✅ ${suiteName} - 所有测试通过`);
    console.log('──────────────────────────────────────────────────');
  },

  it(testName, testFn) {
    process.stdout.write(`  测试: ${testName} ... `);
    try {
      testFn();
      console.log('✅ 通过');
    } catch (error) {
      console.log('❌ 失败');
      console.log(`     错误: ${error.message}`);
      process.exit(1);
    }
  },

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`期望: ${expected}, 实际: ${actual}`);
        }
      },
      toEqual: (expected) => {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
          throw new Error(`期望: ${expectedStr}, 实际: ${actualStr}`);
        }
      },
      toBeLessThan: (expected) => {
        if (!(actual < expected)) {
          throw new Error(`期望 ${actual} < ${expected}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (!(actual > expected)) {
          throw new Error(`期望 ${actual} > ${expected}`);
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`期望为null，实际为: ${actual}`);
        }
      },
      toBeUndefined: () => {
        if (actual !== undefined) {
          throw new Error(`期望为undefined，实际为: ${actual}`);
        }
      },
      not: {
        toBe: (expected) => {
          if (actual === expected) {
            throw new Error(`期望不等于: ${expected}`);
          }
        },
        toBeNull: () => {
          if (actual === null) {
            throw new Error('期望不为null');
          }
        },
        toBeUndefined: () => {
          if (actual === undefined) {
            throw new Error('期望不为undefined');
          }
        }
      }
    };
  },

  beforeEach(setupFunction) {
    this.setupFunction = setupFunction;
  }
};

// 扩展CacheLeafNode类，添加过期功能
class ExpirableCacheLeafNode extends CacheLeafNode {
  constructor(name) {
    super(name);
    this.expiryTime = null;
  }

  setCache(data, ttlMs) {
    super.setCache(data);
    if (ttlMs) {
      this.expiryTime = Date.now() + ttlMs;
    } else {
      this.expiryTime = null; // 无过期时间
    }
  }

  getCache() {
    if (this.expiryTime && Date.now() > this.expiryTime) {
      // 缓存已过期，自动清除
      this.clearCache();
      return null;
    }
    return super.getCache();
  }

  hasValidCache() {
    if (this.expiryTime && Date.now() > this.expiryTime) {
      return false; // 缓存已过期
    }
    return super.hasValidCache();
  }

  getRemainingTTL() {
    if (!this.expiryTime) {
      return Infinity; // 永不过期
    }
    const remaining = this.expiryTime - Date.now();
    return remaining > 0 ? remaining : 0;
  }
}

// 缓存过期测试
runner.describe('缓存过期测试', () => {
  let manager;

  runner.beforeEach(() => {
    manager = new CacheTreeManager();
  });

  runner.it('应该支持设置缓存过期时间', () => {
    const node = new ExpirableCacheLeafNode('expirable');
    const data = { value: 'test-data' };
    
    // 设置缓存，10秒后过期
    node.setCache(data, 10000);
    
    // 验证缓存设置成功
    runner.expect(node.getCache()).toEqual(data);
    runner.expect(node.hasValidCache()).toBe(true);
    
    // 验证过期时间设置正确
    runner.expect(node.getRemainingTTL()).toBeGreaterThan(9000); // 应该接近10000ms
    runner.expect(node.getRemainingTTL()).toBeLessThan(10001); // 不应超过设置的时间
  });

  runner.it('应该在过期后自动清除缓存', () => {
    const node = new ExpirableCacheLeafNode('shortLived');
    const data = { value: 'ephemeral-data' };
    
    // 设置缓存，100毫秒后过期
    node.setCache(data, 100);
    
    // 验证缓存设置成功
    runner.expect(node.getCache()).toEqual(data);
    
    // 等待缓存过期
    const waitForExpiry = () => new Promise(resolve => setTimeout(resolve, 150));
    
    return waitForExpiry().then(() => {
      // 验证缓存已过期并被清除
      runner.expect(node.getCache()).toBeNull();
      runner.expect(node.hasValidCache()).toBe(false);
      runner.expect(node.getRemainingTTL()).toBe(0);
    });
  });

  runner.it('应该支持不同节点有不同的过期时间', () => {
    const shortNode = new ExpirableCacheLeafNode('shortLived');
    const longNode = new ExpirableCacheLeafNode('longLived');
    const eternalNode = new ExpirableCacheLeafNode('eternal');
    
    // 设置不同的过期时间
    shortNode.setCache({ value: 'short' }, 100); // 100ms
    longNode.setCache({ value: 'long' }, 10000); // 10s
    eternalNode.setCache({ value: 'eternal' }); // 永不过期
    
    // 添加到管理器
    manager.addNode(shortNode);
    manager.addNode(longNode);
    manager.addNode(eternalNode);
    
    // 等待短期缓存过期
    const waitForShortExpiry = () => new Promise(resolve => setTimeout(resolve, 150));
    
    return waitForShortExpiry().then(() => {
      // 验证短期缓存已过期
      runner.expect(manager.getChild('shortLived').getCache()).toBeNull();
      
      // 验证长期缓存和永久缓存仍然有效
      runner.expect(manager.getChild('longLived').getCache()).toEqual({ value: 'long' });
      runner.expect(manager.getChild('eternal').getCache()).toEqual({ value: 'eternal' });
      
      // 验证过期统计
      const stats = manager.getCacheStats();
      runner.expect(stats.cacheNodes).toBe(3); // 3个缓存节点
      runner.expect(stats.validCaches).toBe(2); // 只有2个有效缓存
    });
  });

  runner.it('应该支持更新缓存并重置过期时间', () => {
    const node = new ExpirableCacheLeafNode('updatable');
    
    // 设置初始缓存，100毫秒后过期
    node.setCache({ value: 'initial' }, 100);
    
    // 等待50毫秒（一半过期时间）
    const waitHalfExpiry = () => new Promise(resolve => setTimeout(resolve, 50));
    
    return waitHalfExpiry()
      .then(() => {
        // 更新缓存，重置过期时间为200毫秒
        node.setCache({ value: 'updated' }, 200);
        
        // 验证缓存已更新
        runner.expect(node.getCache()).toEqual({ value: 'updated' });
        
        // 等待150毫秒（超过初始过期时间，但未到更新后的过期时间）
        return new Promise(resolve => setTimeout(resolve, 150));
      })
      .then(() => {
        // 验证缓存仍然有效（因为过期时间被重置）
        runner.expect(node.getCache()).toEqual({ value: 'updated' });
        runner.expect(node.hasValidCache()).toBe(true);
        
        // 等待100毫秒（超过更新后的过期时间）
        return new Promise(resolve => setTimeout(resolve, 100));
      })
      .then(() => {
        // 验证缓存已过期
        runner.expect(node.getCache()).toBeNull();
        runner.expect(node.hasValidCache()).toBe(false);
      });
  });

  runner.it('应该支持搜索时考虑缓存过期状态', () => {
    // 创建一些带有不同过期时间的节点
    const node1 = new ExpirableCacheLeafNode('quick');
    const node2 = new ExpirableCacheLeafNode('normal');
    const node3 = new ExpirableCacheLeafNode('slow');
    
    node1.setCache({ speed: 'quick' }, 100); // 快速过期
    node2.setCache({ speed: 'normal' }, 300); // 中速过期
    node3.setCache({ speed: 'slow' }, 500); // 慢速过期
    
    manager.addNode(node1);
    manager.addNode(node2);
    manager.addNode(node3);
    
    // 初始状态下，所有节点都有有效缓存
    let validCacheCount = 0;
    manager.deepSearch(node => {
      if (node instanceof ExpirableCacheLeafNode && node.hasValidCache()) {
        validCacheCount++;
      }
      return false; // 继续搜索
    });
    
    runner.expect(validCacheCount).toBe(3);
    
    // 等待200毫秒，node1应该过期
    const wait200ms = () => new Promise(resolve => setTimeout(resolve, 200));
    
    return wait200ms()
      .then(() => {
        validCacheCount = 0;
        manager.deepSearch(node => {
          if (node instanceof ExpirableCacheLeafNode && node.hasValidCache()) {
            validCacheCount++;
          }
          return false; // 继续搜索
        });
        
        runner.expect(validCacheCount).toBe(2); // node2和node3仍有效
        
        // 等待200毫秒，node2也应该过期
        return new Promise(resolve => setTimeout(resolve, 200));
      })
      .then(() => {
        validCacheCount = 0;
        manager.deepSearch(node => {
          if (node instanceof ExpirableCacheLeafNode && node.hasValidCache()) {
            validCacheCount++;
          }
          return false; // 继续搜索
        });
        
        runner.expect(validCacheCount).toBe(1); // 只有node3仍有效
        
        // 等待200毫秒，所有节点都应该过期
        return new Promise(resolve => setTimeout(resolve, 200));
      })
      .then(() => {
        validCacheCount = 0;
        manager.deepSearch(node => {
          if (node instanceof ExpirableCacheLeafNode && node.hasValidCache()) {
            validCacheCount++;
          }
          return false; // 继续搜索
        });
        
        runner.expect(validCacheCount).toBe(0); // 所有节点都已过期
      });
  });
});

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runner.describe('缓存过期测试', () => {
    // 测试将在上面定义
  });
}