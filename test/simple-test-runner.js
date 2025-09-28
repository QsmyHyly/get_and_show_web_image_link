// 简单的测试运行器 - 兼容Node.js原生环境
const fs = require('fs');
const path = require('path');

class SimpleTestRunner {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.currentSuite = '';
  }

  describe(suiteName, testFunction) {
    this.currentSuite = suiteName;
    console.log(`\n🏃 运行测试套件: ${suiteName}`);
    console.log('─'.repeat(50));
    
    try {
      testFunction();
      console.log(`✅ ${suiteName} - 所有测试通过`);
    } catch (error) {
      console.log(`❌ ${suiteName} - 测试失败: ${error.message}`);
    }
    
    console.log('─'.repeat(50));
  }

  it(testName, testFunction) {
    this.totalTests++;
    process.stdout.write(`  测试: ${testName} ... `);
    
    try {
      // 在每个测试前执行beforeEach函数
      if (this.currentSetupFunction) {
        this.currentSetupFunction();
      }
      
      testFunction();
      console.log('✅ 通过');
      this.passedTests++;
    } catch (error) {
      console.log('❌ 失败');
      console.log(`     错误: ${error.message}`);
      this.failedTests++;
    }
  }

  expect(actual) {
    const expectObj = {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`期望: ${expected}, 实际: ${actual}`);
        }
        return expectObj;
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`期望: ${JSON.stringify(expected)}, 实际: ${JSON.stringify(actual)}`);
        }
        return expectObj;
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error('期望值已定义，但实际未定义');
        }
        return expectObj;
      },
      toBeUndefined: () => {
        if (actual !== undefined) {
          throw new Error(`期望值未定义，但实际为: ${actual}`);
        }
        return expectObj;
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`期望 ${actual} 大于 ${expected}`);
        }
        return expectObj;
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`期望为null，实际为: ${actual}`);
        }
        return expectObj;
      },
      toBeInstanceOf: (constructor) => {
        if (!(actual instanceof constructor)) {
          throw new Error(`期望实例为 ${constructor.name}，实际为 ${actual ? actual.constructor.name : actual}`);
        }
        return expectObj;
      },
      toContain: (expected) => {
        if (!actual || !actual.includes(expected)) {
          throw new Error(`期望包含: ${expected}，实际: ${actual}`);
        }
        return expectObj;
      },
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`期望: ${expected}, 实际: ${actual}`);
        }
        return expectObj;
      },
      toBeGreaterThan: (expected) => {
        if (!(actual > expected)) {
          throw new Error(`期望 ${actual} 大于 ${expected}`);
        }
        return expectObj;
      },
      toBeLessThan: (expected) => {
        if (!(actual < expected)) {
          throw new Error(`期望 ${actual} 小于 ${expected}`);
        }
        return expectObj;
      },
      toThrow: (expectedError) => {
        try {
          if (typeof actual === 'function') {
            actual();
          }
          throw new Error('期望函数抛出错误，但未抛出');
        } catch (error) {
          if (expectedError && error.message !== expectedError) {
            throw new Error(`期望错误: "${expectedError}"，实际错误: "${error.message}"`);
          }
        }
        return expectObj;
      }
    };

    // 添加not属性，反转所有断言
    expectObj.not = {
      toBe: (expected) => {
        if (actual === expected) {
          throw new Error(`期望不等于: ${expected}, 但实际相等`);
        }
        return expectObj.not;
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
          throw new Error(`期望不等于: ${JSON.stringify(expected)}, 但实际相等`);
        }
        return expectObj.not;
      },
      toBeDefined: () => {
        if (actual !== undefined) {
          throw new Error('期望值未定义，但实际已定义');
        }
        return expectObj.not;
      },
      toBeUndefined: () => {
        if (actual === undefined) {
          throw new Error('期望值已定义，但实际未定义');
        }
        return expectObj.not;
      },
      toBeNull: () => {
        if (actual === null) {
          throw new Error('期望不为null，但实际为null');
        }
        return expectObj.not;
      },
      toBeInstanceOf: (constructor) => {
        if (actual instanceof constructor) {
          throw new Error(`期望实例不是 ${constructor.name}，但实际是`);
        }
        return expectObj.not;
      },
      toContain: (expected) => {
        if (actual && actual.includes(expected)) {
          throw new Error(`期望不包含: ${expected}，但实际包含`);
        }
        return expectObj.not;
      }
    };

    return expectObj;
  }

  beforeEach(setupFunction) {
    // 在每个测试前执行setupFunction
    this.currentSetupFunction = setupFunction;
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试汇总');
    console.log('='.repeat(50));
    console.log(`总测试数: ${this.totalTests}`);
    console.log(`通过: ${this.passedTests} ✅`);
    console.log(`失败: ${this.failedTests} ❌`);
    
    if (this.failedTests === 0) {
      console.log('\n🎉 所有测试通过！');
    } else {
      console.log('\n💥 有测试失败，请检查错误信息');
    }
    
    console.log('='.repeat(50));
  }
}

// 加载并运行所有测试文件
function runAllTests() {
  const runner = new SimpleTestRunner();
  const testDir = __dirname;
  
  // 获取所有测试文件
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js') && file !== 'run-tests.js')
    .sort();
  
  console.log('🚀 开始运行tree-cache模块测试');
  console.log(`📁 发现 ${testFiles.length} 个测试文件\n`);
  
  testFiles.forEach((file, index) => {
    console.log(`📄 运行测试文件: ${file} (${index + 1}/${testFiles.length})`);
    
    try {
      const testModule = require(path.join(testDir, file));
      
      // 如果测试文件导出了测试函数，执行它
      if (typeof testModule === 'function') {
        testModule(runner);
      }
    } catch (error) {
      console.log(`❌ 加载测试文件 ${file} 失败: ${error.message}`);
    }
  });
  
  runner.printSummary();
  
  // 退出码
  if (runner.failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// 导出供其他模块使用
module.exports = {
  SimpleTestRunner,
  runAllTests
};

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  runAllTests();
}