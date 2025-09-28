// 集成测试 - 测试树缓存模块的多个组件协同工作的情况
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

// 集成测试
runner.describe('树缓存集成测试', () => {
  let manager;

  runner.beforeEach(() => {
    manager = new CacheTreeManager();
  });

  runner.it('应该支持复杂的树结构构建和搜索', () => {
    // 构建一个复杂的树结构
    // root
    // ├── category1
    // │   ├── product1 (缓存)
    // │   └── product2 (缓存)
    // ├── category2
    // │   ├── subcategory1
    // │   │   └── product3 (缓存)
    // │   └── product4 (缓存)
    // └── category3
    //     └── product5 (缓存)
    
    // 创建分类节点
    const category1 = new TreeNode('category1');
    const category2 = new TreeNode('category2');
    const category3 = new TreeNode('category3');
    const subcategory1 = new TreeNode('subcategory1');
    
    // 创建产品节点（带缓存）
    const product1 = new CacheLeafNode('product1');
    const product2 = new CacheLeafNode('product2');
    const product3 = new CacheLeafNode('product3');
    const product4 = new CacheLeafNode('product4');
    const product5 = new CacheLeafNode('product5');
    
    // 设置缓存数据
    product1.setCache({ id: 1, name: 'Product 1', price: 100 });
    product2.setCache({ id: 2, name: 'Product 2', price: 200 });
    product3.setCache({ id: 3, name: 'Product 3', price: 300 });
    product4.setCache({ id: 4, name: 'Product 4', price: 400 });
    product5.setCache({ id: 5, name: 'Product 5', price: 500 });
    
    // 构建树结构
    category1.addChild(product1);
    category1.addChild(product2);
    
    category2.addChild(subcategory1);
    subcategory1.addChild(product3);
    category2.addChild(product4);
    
    category3.addChild(product5);
    
    manager.root.addChild(category1);
    manager.root.addChild(category2);
    manager.root.addChild(category3);
    
    // 验证树结构
    runner.expect(manager.root.getChildNames().length).toBe(3);
    runner.expect(manager.root.getChild('category1').getChildNames().length).toBe(2);
    runner.expect(manager.root.getChild('category2').getChildNames().length).toBe(2);
    runner.expect(manager.root.getChild('category3').getChildNames().length).toBe(1);
    
    // 测试深度搜索 - 查找价格大于300的产品
    let expensiveProducts = [];
    manager.deepSearch(node => {
      if (node instanceof CacheLeafNode) {
        const cache = node.getCache();
        if (cache && cache.price > 300) {
          expensiveProducts.push(node.name);
        }
      }
      return false; // 继续搜索
    });
    
    runner.expect(expensiveProducts.length).toBe(2);
    runner.expect(expensiveProducts).toEqual(['product4', 'product5']);
    
    // 测试广度优先搜索 - 查找第一个价格小于300的产品
    let foundProduct = false;
    manager.breadthFirstSearch(node => {
      if (node instanceof CacheLeafNode) {
        const cache = node.getCache();
        if (cache && cache.price < 300) {
          foundProduct = node.name;
          return true; // 找到目标，停止搜索
        }
      }
      return false; // 继续搜索
    });
    
    runner.expect(foundProduct).toBe('product1'); // 广度优先应该先找到product1
  });

  runner.it('应该支持动态更新和删除节点', () => {
    // 创建初始树结构
    const category = new TreeNode('electronics');
    const product1 = new CacheLeafNode('laptop');
    const product2 = new CacheLeafNode('phone');
    
    product1.setCache({ price: 1000, stock: 10 });
    product2.setCache({ price: 500, stock: 20 });
    
    category.addChild(product1);
    category.addChild(product2);
    manager.root.addChild(category);
    
    // 验证初始结构
    runner.expect(manager.root.getChild('electronics').getChildNames().length).toBe(2);
    
    // 动态添加新产品
    const product3 = new CacheLeafNode('tablet');
    product3.setCache({ price: 300, stock: 15 });
    manager.root.getChild('electronics').addChild(product3);
    
    // 验证添加成功
    runner.expect(manager.root.getChild('electronics').getChildNames().length).toBe(3);
    
    // 更新产品信息
    const laptop = manager.root.getChild('electronics').getChild('laptop');
    laptop.setCache({ price: 1200, stock: 5 }); // 价格上涨，库存减少
    
    // 验证更新成功
    const updatedLaptop = manager.root.getChild('electronics').getChild('laptop');
    runner.expect(updatedLaptop.getCache().price).toBe(1200);
    runner.expect(updatedLaptop.getCache().stock).toBe(5);
    
    // 删除产品
    manager.root.getChild('electronics').removeChild('phone');
    
    // 验证删除成功
    runner.expect(manager.root.getChild('electronics').getChildNames().length).toBe(2);
    runner.expect(manager.root.getChild('electronics').getChild('phone')).toBeUndefined();
    
    // 验证其他产品不受影响
    runner.expect(manager.root.getChild('electronics').getChild('laptop')).not.toBeUndefined();
    runner.expect(manager.root.getChild('electronics').getChild('tablet')).not.toBeUndefined();
  });

  runner.it('应该支持缓存清理和统计', () => {
    // 创建一个有多层缓存的树
    const level1 = new TreeNode('level1');
    const level2 = new TreeNode('level2');
    const cache1 = new CacheLeafNode('cache1');
    const cache2 = new CacheLeafNode('cache2');
    const cache3 = new CacheLeafNode('cache3');
    
    cache1.setCache({ data: 'data1' });
    cache2.setCache({ data: 'data2' });
    cache3.setCache({ data: 'data3' });
    
    level2.addChild(cache3);
    level1.addChild(cache2);
    level1.addChild(level2);
    manager.root.addChild(level1);
    manager.root.addChild(cache1);
    
    // 验证初始缓存统计
    const initialStats = manager.getCacheStats();
    runner.expect(initialStats.totalNodes).toBe(5); // root + level1 + level2 + 3个缓存节点
    runner.expect(initialStats.cacheNodes).toBe(3); // 3个缓存节点
    runner.expect(initialStats.validCaches).toBe(3); // 3个有效缓存
    
    // 清除特定路径的缓存
    cache2.clearCache();
    
    // 验证部分清除后的统计
    const partialClearStats = manager.getCacheStats();
    runner.expect(partialClearStats.validCaches).toBe(2); // 只剩2个有效缓存
    
    // 全部清除缓存
    manager.clearAllCaches();
    
    // 验证全部清除后的统计
    const afterClearStats = manager.getCacheStats();
    runner.expect(afterClearStats.totalNodes).toBe(5); // 节点数量不变
    runner.expect(afterClearStats.cacheNodes).toBe(3); // 缓存节点数量不变
    runner.expect(afterClearStats.validCaches).toBe(0); // 没有有效缓存
    
    // 验证所有缓存确实被清除
    runner.expect(cache1.getCache()).toBeNull();
    runner.expect(cache2.getCache()).toBeNull();
    runner.expect(cache3.getCache()).toBeNull();
  });

  runner.it('应该支持复杂的搜索条件组合', () => {
    // 创建一个包含不同类型产品的目录树
    const electronics = new TreeNode('electronics');
    const clothing = new TreeNode('clothing');
    
    // 电子产品
    const laptop = new CacheLeafNode('laptop');
    const phone = new CacheLeafNode('phone');
    const tablet = new CacheLeafNode('tablet');
    
    laptop.setCache({ category: 'electronics', price: 1000, inStock: true });
    phone.setCache({ category: 'electronics', price: 500, inStock: true });
    tablet.setCache({ category: 'electronics', price: 300, inStock: false });
    
    // 服装产品
    const shirt = new CacheLeafNode('shirt');
    const pants = new CacheLeafNode('pants');
    const hat = new CacheLeafNode('hat');
    
    shirt.setCache({ category: 'clothing', price: 50, inStock: true });
    pants.setCache({ category: 'clothing', price: 80, inStock: true });
    hat.setCache({ category: 'clothing', price: 25, inStock: false });
    
    // 构建树
    electronics.addChild(laptop);
    electronics.addChild(phone);
    electronics.addChild(tablet);
    
    clothing.addChild(shirt);
    clothing.addChild(pants);
    clothing.addChild(hat);
    
    manager.root.addChild(electronics);
    manager.root.addChild(clothing);
    
    // 复杂搜索：查找价格低于100且有库存的产品
    let affordableInStockProducts = [];
    manager.deepSearch(node => {
      if (node instanceof CacheLeafNode) {
        const cache = node.getCache();
        if (cache && cache.price < 100 && cache.inStock) {
          affordableInStockProducts.push(node.name);
        }
      }
      return false; // 继续搜索
    });
    
    runner.expect(affordableInStockProducts.length).toBe(2);
    runner.expect(affordableInStockProducts).toEqual(['shirt', 'pants']);
    
    // 复杂搜索：查找电子产品中价格最高的产品
    let highestPriceElectronic = { price: 0, name: null };
    manager.deepSearch(node => {
      if (node instanceof CacheLeafNode) {
        const cache = node.getCache();
        if (cache && cache.category === 'electronics' && cache.price > highestPriceElectronic.price) {
          highestPriceElectronic = { price: cache.price, name: node.name };
        }
      }
      return false; // 继续搜索
    });
    
    runner.expect(highestPriceElectronic.name).toBe('laptop');
    runner.expect(highestPriceElectronic.price).toBe(1000);
  });
});

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runner.describe('集成测试', () => {
    runner.describe('树缓存集成测试', () => {
      // 测试将在上面定义
    });
  });
}