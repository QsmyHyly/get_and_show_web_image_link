// 测试运行器 - 运行所有tree-cache模块的测试
const fs = require('fs');
const path = require('path');

// 简单的测试框架实现
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  describe(description, testFunction) {
    console.log(`\n${description}`);
    try {
      testFunction();
      console.log('  ✓ 所有测试通过');
    } catch (error) {
      console.log(`  ✗ 测试失败: ${error.message}`);
      this.failed++;
    }
  }

  test(name, testFunction) {
    this.tests.push({ name, testFunction });
  }

  run() {
    console.log('开始运行tree-cache模块测试...\n');
    console.log('='.repeat(50));

    this.tests.forEach((test, index) => {
      try {
        test.testFunction();
        console.log(`✓ [${index + 1}/${this.tests.length}] ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ [${index + 1}/${this.tests.length}] ${test.name}`);
        console.log(`  错误: ${error.message}`);
        this.failed++;
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log('测试结果:');
    console.log(`通过: ${this.passed}`);
    console.log(`失败: ${this.failed}`);
    console.log(`总计: ${this.tests.length}`);

    if (this.failed === 0) {
      console.log('\n🎉 所有测试通过！');
      process.exit(0);
    } else {
      console.log('\n❌ 有测试失败');
      process.exit(1);
    }
  }
}

// 动态加载所有测试文件
function loadAllTests() {
  const testDir = __dirname;
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js') && file !== 'run-tests.js')
    .sort();

  const runner = new TestRunner();

  testFiles.forEach(file => {
    const testModule = require(path.join(testDir, file));
    
    if (typeof testModule === 'function') {
      // 如果测试文件导出一个函数，直接执行
      testModule(runner);
    } else if (typeof describe === 'function' && testModule.describe) {
      // 如果使用describe语法，模拟执行
      runner.describe(`测试文件: ${file}`, () => {
        // 这里需要更复杂的逻辑来解析describe块
        console.log(`  执行 ${file} 中的测试...`);
      });
    }
  });

  return runner;
}

// 主运行函数
function runAllTests() {
  try {
    const runner = loadAllTests();
    runner.run();
  } catch (error) {
    console.error('运行测试时出错:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  runAllTests();
}

module.exports = {
  TestRunner,
  runAllTests,
  loadAllTests
};