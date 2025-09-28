/**
 * 树缓存模块测试运行器
 * 
 * 用法: node run-tests.js
 * 
 * 功能:
 * - 自动运行test目录下的所有测试文件
 * - 提供测试结果统计和报告
 * - 支持单独运行指定测试文件
 */

const fs = require('fs');
const path = require('path');
const { SimpleTestRunner } = require('./test/simple-test-runner');

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// 打印带颜色的文本
function colorText(text, color) {
  return `${color}${text}${colors.reset}`;
}

// 打印标题
function printHeader(text) {
  const line = '='.repeat(text.length + 4);
  console.log('\n' + colorText(line, colors.cyan));
  console.log(colorText(`| ${text} |`, colors.cyan + colors.bright));
  console.log(colorText(line, colors.cyan) + '\n');
}

// 运行所有测试
function runAllTests() {
  printHeader('树缓存模块测试');
  
  const testDir = path.join(__dirname, 'test');
  
  // 检查test目录是否存在
  if (!fs.existsSync(testDir)) {
    console.error(colorText('错误: test目录不存在!', colors.red));
    process.exit(1);
  }
  
  // 获取所有测试文件
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js'))
    .sort();
  
  if (testFiles.length === 0) {
    console.log(colorText('没有找到测试文件!', colors.yellow));
    process.exit(0);
  }
  
  console.log(colorText(`发现 ${testFiles.length} 个测试文件`, colors.green));
  
  // 创建测试运行器
  const runner = new SimpleTestRunner();
  
  // 运行每个测试文件
  testFiles.forEach((file, index) => {
    const filePath = path.join(testDir, file);
    console.log(colorText(`[${index + 1}/${testFiles.length}] 运行: ${file}`, colors.blue));
    
    try {
      const testModule = require(filePath);
      if (typeof testModule === 'function') {
        testModule(runner);
      } else {
        console.log(colorText(`  警告: ${file} 没有导出测试函数`, colors.yellow));
      }
    } catch (error) {
      console.error(colorText(`  错误: ${file} 执行失败: ${error.message}`, colors.red));
      console.error(colorText(`  ${error.stack}`, colors.dim));
    }
  });
  
  // 打印测试结果
  printHeader('测试结果');
  
  const passRate = runner.passedTests / runner.totalTests * 100 || 0;
  const passRateText = passRate.toFixed(2) + '%';
  
  console.log(`总测试数: ${colorText(runner.totalTests, colors.bright)}`);
  console.log(`通过: ${colorText(runner.passedTests, colors.green)} ✓`);
  console.log(`失败: ${colorText(runner.failedTests, colors.red)} ✗`);
  console.log(`通过率: ${passRate === 100 ? colorText(passRateText, colors.green) : colorText(passRateText, colors.yellow)}`);
  
  // 打印结论
  if (runner.failedTests === 0 && runner.totalTests > 0) {
    console.log('\n' + colorText('🎉 所有测试通过!', colors.green + colors.bright));
    process.exit(0);
  } else if (runner.totalTests === 0) {
    console.log('\n' + colorText('⚠️ 没有执行任何测试!', colors.yellow + colors.bright));
    process.exit(1);
  } else {
    console.log('\n' + colorText('❌ 有测试失败!', colors.red + colors.bright));
    process.exit(1);
  }
}

// 运行单个测试文件
function runSingleTest(testFile) {
  const testPath = path.join(__dirname, 'test', testFile);
  
  if (!fs.existsSync(testPath)) {
    console.error(colorText(`错误: 测试文件 ${testFile} 不存在!`, colors.red));
    process.exit(1);
  }
  
  printHeader(`运行测试: ${testFile}`);
  
  const runner = new SimpleTestRunner();
  
  try {
    const testModule = require(testPath);
    if (typeof testModule === 'function') {
      testModule(runner);
    } else {
      console.log(colorText(`警告: ${testFile} 没有导出测试函数`, colors.yellow));
    }
  } catch (error) {
    console.error(colorText(`错误: ${testFile} 执行失败: ${error.message}`, colors.red));
    console.error(colorText(`${error.stack}`, colors.dim));
    process.exit(1);
  }
  
  // 打印测试结果
  printHeader('测试结果');
  
  const passRate = runner.passedTests / runner.totalTests * 100 || 0;
  const passRateText = passRate.toFixed(2) + '%';
  
  console.log(`总测试数: ${colorText(runner.totalTests, colors.bright)}`);
  console.log(`通过: ${colorText(runner.passedTests, colors.green)} ✓`);
  console.log(`失败: ${colorText(runner.failedTests, colors.red)} ✗`);
  console.log(`通过率: ${passRate === 100 ? colorText(passRateText, colors.green) : colorText(passRateText, colors.yellow)}`);
  
  if (runner.failedTests === 0 && runner.totalTests > 0) {
    console.log('\n' + colorText('🎉 所有测试通过!', colors.green + colors.bright));
    process.exit(0);
  } else {
    console.log('\n' + colorText('❌ 有测试失败!', colors.red + colors.bright));
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
${colorText('树缓存模块测试运行器', colors.bright)}

用法:
  ${colorText('node run-tests.js', colors.green)}             运行所有测试
  ${colorText('node run-tests.js <文件名>', colors.green)}    运行指定测试文件
  ${colorText('node run-tests.js --help', colors.green)}      显示帮助信息

示例:
  ${colorText('node run-tests.js', colors.dim)}                         运行所有测试
  ${colorText('node run-tests.js tree-node.test.js', colors.dim)}       只运行TreeNode测试
  `);
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.length === 0) {
    runAllTests();
  } else {
    runSingleTest(args[0]);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  runAllTests,
  runSingleTest
};