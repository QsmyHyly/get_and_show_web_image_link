// 性能测试 - 测试树缓存模块在大规模数据下的性能
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

// 性能测试
runner.describe('树缓存性能测试', () => {
  let manager;
  const LARGE_TREE_SIZE = 1000; // 大型树的节点数量
  const DEEP_TREE_DEPTH = 50;   // 深层树的深度

  runner.beforeEach(() => {
    manager = new CacheTreeManager();
  });

  // 测量函数执行时间的辅助函数
  function measureTime(fn) {
    const start = process.hrtime();
    fn();
    const end = process.hrtime(start);
    return end[0] * 1000 + end[1] / 1000000; // 转换为毫秒
  }

  runner.it('应该能够快速创建大型缓存树', () => {
    const time = measureTime(() => {
      for (let i = 0; i < LARGE_TREE_SIZE; i++) {
        const node = new CacheLeafNode(`node${i}`);
        node.setCache({ data: `data${i}` });
        manager.addNode(node);
      }
    });
    
    console.log(`     创建 ${LARGE_TREE_SIZE} 个节点耗时: ${time.toFixed(2)}ms`);
    runner.expect(manager.getCacheStats().totalNodes).toBe(LARGE_TREE_SIZE + 1); // +1 是因为根节点
    runner.expect(time).toBeLessThan(5000); // 应该在5秒内完成
  });

  runner.it('应该能够快速搜索大型缓存树', () => {
    // 先创建大型树
    for (let i = 0; i < LARGE_TREE_SIZE; i++) {
      const node = new CacheLeafNode(`node${i}`);
      node.setCache({ data: `data${i}` });
      manager.addNode(node);
    }
    
    // 随机选择一个节点进行搜索
    const targetIndex = Math.floor(Math.random() * LARGE_TREE_SIZE);
    const targetNodeName = `node${targetIndex}`;
    
    const time = measureTime(() => {
      const result = manager.breadthFirstSearch(node => {
        return node.name === targetNodeName;
      });
      runner.expect(result).toBe(true);
    });
    
    console.log(`     在 ${LARGE_TREE_SIZE} 个节点中搜索耗时: ${time.toFixed(2)}ms`);
    runner.expect(time).toBeLessThan(1000); // 应该在1秒内完成
  });

  runner.it('应该能够处理深层嵌套的树结构', () => {
    let currentNode = manager.root;
    
    // 创建一个深层嵌套的树
    const time = measureTime(() => {
      for (let i = 0; i < DEEP_TREE_DEPTH; i++) {
        const newNode = new CacheLeafNode(`level${i}`);
        newNode.setCache({ level: i, data: `data${i}` });
        currentNode.addChild(newNode);
        currentNode = newNode;
      }
    });
    
    console.log(`     创建深度为 ${DEEP_TREE_DEPTH} 的树耗时: ${time.toFixed(2)}ms`);
    
    // 测试深度搜索能否找到最深层的节点
    const searchTime = measureTime(() => {
      const result = manager.deepSearch(node => {
        return node.name === `level${DEEP_TREE_DEPTH - 1}`;
      });
      runner.expect(result).toBe(true);
    });
    
    console.log(`     在深度为 ${DEEP_TREE_DEPTH} 的树中搜索耗时: ${searchTime.toFixed(2)}ms`);
    runner.expect(searchTime).toBeLessThan(1000); // 应该在1秒内完成
  });

  runner.it('应该能够高效地清空大型缓存树', () => {
    // 先创建大型树
    for (let i = 0; i < LARGE_TREE_SIZE; i++) {
      const node = new CacheLeafNode(`node${i}`);
      node.setCache({ data: `data${i}` });
      manager.addNode(node);
    }
    
    const time = measureTime(() => {
      manager.clearAllCaches();
    });
    
    console.log(`     清空 ${LARGE_TREE_SIZE} 个节点的缓存耗时: ${time.toFixed(2)}ms`);
    runner.expect(time).toBeLessThan(1000); // 应该在1秒内完成
    
    // 验证所有缓存都已清空
    let allCachesCleared = true;
    manager.deepSearch(node => {
      if (node instanceof CacheLeafNode && node.getCache() !== null) {
        allCachesCleared = false;
      }
      return false; // 继续搜索
    });
    
    runner.expect(allCachesCleared).toBe(true);
  });
});

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runner.describe('性能测试', () => {
    runner.describe('树缓存性能测试', () => {
      // 测试将在上面定义
    });
  });
}