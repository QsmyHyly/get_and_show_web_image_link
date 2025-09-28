// 边界条件测试 - 测试树缓存模块在各种边界情况和异常处理下的行为
const { CacheTreeManager, CacheLeafNode, TreeNode } = require('../tree-cache.js');

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
      toThrow: (expectedError) => {
        try {
          actual();
          throw new Error('期望抛出错误，但没有错误发生');
        } catch (error) {
          if (expectedError && !error.message.includes(expectedError)) {
            throw new Error(`期望错误包含: ${expectedError}, 实际错误: ${error.message}`);
          }
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

// 边界条件测试
runner.describe('树缓存边界条件测试', () => {
  let manager;

  runner.beforeEach(() => {
    manager = new CacheTreeManager();
  });

  runner.it('应该处理空名称的节点', () => {
    const emptyNameNode = new CacheLeafNode('');
    manager.addNode(emptyNameNode);
    
    // 应该能够找到空名称的节点
    const found = manager.getChild('');
    runner.expect(found).not.toBeUndefined();
    runner.expect(found.name).toBe('');
  });

  runner.it('应该处理特殊字符的节点名称', () => {
    const specialChars = ['!@#$%^&*()', '你好世界', '😀🚀🔥', '\n\t\r'];
    
    specialChars.forEach(name => {
      const node = new CacheLeafNode(name);
      manager.addNode(node);
      
      // 应该能够找到特殊字符名称的节点
      const found = manager.getChild(name);
      runner.expect(found).not.toBeUndefined();
      runner.expect(found.name).toBe(name);
    });
  });

  runner.it('应该处理重复名称的节点', () => {
    const node1 = new CacheLeafNode('duplicate');
    const node2 = new CacheLeafNode('duplicate');
    
    manager.addNode(node1);
    
    // 添加同名节点应该覆盖原有节点
    manager.addNode(node2);
    
    // 应该只有一个同名节点
    const childNames = manager.root.getChildNames();
    let count = 0;
    childNames.forEach(name => {
      if (name === 'duplicate') count++;
    });
    
    runner.expect(count).toBe(1);
  });

  runner.it('应该处理极大的缓存数据', () => {
    const largeNode = new CacheLeafNode('largeCache');
    
    // 创建一个大约10MB的缓存数据
    const largeData = {
      bigArray: new Array(1000000).fill('x')
    };
    
    // 设置大缓存应该不会崩溃
    largeNode.setCache(largeData);
    manager.addNode(largeNode);
    
    // 应该能够正确获取大缓存
    const retrievedCache = manager.getChild('largeCache').getCache();
    runner.expect(retrievedCache.bigArray.length).toBe(1000000);
  });

  runner.it('应该处理循环引用的缓存数据', () => {
    const circularNode = new CacheLeafNode('circular');
    
    // 创建一个包含循环引用的对象
    const circularData = {
      name: 'circular'
    };
    circularData.self = circularData; // 循环引用
    
    // 设置循环引用缓存应该不会崩溃
    circularNode.setCache(circularData);
    manager.addNode(circularNode);
    
    // 应该能够正确获取循环引用缓存
    const retrievedCache = manager.getChild('circular').getCache();
    runner.expect(retrievedCache.name).toBe('circular');
    runner.expect(retrievedCache.self).toBe(retrievedCache); // 循环引用应该保持
  });

  runner.it('应该处理无效的搜索条件', () => {
    // 测试非函数的节点评估器
    runner.expect(() => {
      manager.deepSearch('not a function');
    }).toThrow('nodeEvaluator must be a function');
    
    runner.expect(() => {
      manager.breadthFirstSearch(null);
    }).toThrow('nodeEvaluator must be a function');
  });

  runner.it('应该处理搜索过程中的错误', () => {
    const node1 = new CacheLeafNode('node1');
    const node2 = new CacheLeafNode('node2');
    manager.addNode(node1);
    manager.addNode(node2);
    
    // 测试搜索过程中抛出错误
    runner.expect(() => {
      manager.deepSearch(node => {
        if (node.name === 'node2') {
          throw new Error('测试错误');
        }
        return false;
      });
    }).toThrow('测试错误');
  });

  runner.it('应该处理极深的树结构', () => {
    let currentNode = manager.root;
    const MAX_DEPTH = 1000; // 极深的树
    
    // 创建一个极深的树
    for (let i = 0; i < MAX_DEPTH; i++) {
      const newNode = new TreeNode(`level${i}`);
      currentNode.addChild(newNode);
      currentNode = newNode;
    }
    
    // 添加一个叶子节点在最深处
    const leafNode = new CacheLeafNode('deepLeaf');
    leafNode.setCache({ deep: true });
    currentNode.addChild(leafNode);
    
    // 测试深度搜索能否找到最深层的节点，但有深度限制
    const limitedResult = manager.deepSearch(node => {
      return node.name === 'deepLeaf';
    }, 500); // 限制深度为500
    
    runner.expect(limitedResult).toBe(false); // 因为深度限制，应该找不到
    
    // 不限制深度应该能找到
    const unlimitedResult = manager.deepSearch(node => {
      return node.name === 'deepLeaf';
    });
    
    runner.expect(unlimitedResult).toBe(true); // 不限制深度，应该能找到
  });
});

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runner.describe('边界条件测试', () => {
    runner.describe('树缓存边界条件测试', () => {
      // 测试将在上面定义
    });
  });
}