# 网页图片链接获取和展示 - Chrome扩展项目

## 项目概述

这是一个基于Manifest V3的Chrome浏览器扩展，名为"网页图片链接获取器"。该扩展的主要功能是自动检测并获取网页中的所有图片链接，提供丰富的展示和操作功能。

### 核心功能
- **自动图片检测**: 智能识别网页中的所有图片，包括 `<img>` 标签、CSS背景图片、懒加载图片等
- **URL清理和去重**: 自动清理图片URL中的特殊后缀，去除重复链接
- **多维度展示**: 支持网格视图和列表视图两种展示模式
- **排序和分类**: 支持按文件名、文件类型、域名、尺寸等多个维度排序和分类
- **批量操作**: 支持全选、批量下载、复制URL等操作
- **图片预览**: 直接在结果页面预览图片
- **搜索过滤**: 支持实时搜索和过滤图片URL
- **右键菜单**: 支持右键页面直接触发图片获取功能
- **ZIP下载**: 将选中的图片打包为ZIP文件下载
- **新标签页打开**: 在新标签页中打开选中的图片
- **自动停止监听**: 当一段时间没有新图片时自动停止搜索

### 主要技术
- **前端**: JavaScript (ES6+), HTML5, CSS3
- **扩展框架**: Chrome Extension Manifest V3
- **图标生成**: Python + Pygame
- **存储**: Chrome Storage API
- **模块化**: ES6 Modules (import/export)
- **依赖管理**: npm (jszip, file-saver)

## 项目结构

```
├── manifest.json              # 扩展清单文件 (Manifest V3)
├── popup.html               # 扩展弹出窗口界面
├── popup.js                 # 弹出窗口逻辑脚本
├── background.js            # Service Worker后台脚本
├── content.js               # 内容脚本，注入到网页中
├── results.html             # 结果展示页面
├── results.js               # 结果页面逻辑 (ES6模块)
├── styles.css               # 通用样式文件
├── CacheManager.js          # 缓存管理器模块
├── Image.js                 # 图片对象类模块
├── ImageProcessor.js        # 图片处理函数库
├── ImageCollectionManager.js # 图片收集状态管理器
├── generate_icons.py        # 图标生成脚本
├── package.json             # npm依赖配置
├── package-lock.json        # npm依赖锁定
├── node_modules/            # npm依赖库目录
└── images/                  # 图标资源目录
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 构建和运行

### 开发环境准备
1. **Chrome浏览器**: 确保安装Chrome 88+版本以支持Manifest V3
2. **Node.js环境**: 用于安装扩展依赖 (jszip, file-saver)
3. **Python环境**: 用于生成扩展图标（需要安装pygame库）

### 安装依赖
```bash
# 安装JavaScript依赖库
npm install jszip file-saver

# 安装Python依赖（仅用于生成图标）
pip install pygame
```

### 生成扩展图标
```bash
python generate_icons.py
```

### 加载扩展到Chrome
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择当前项目目录
6. 扩展安装成功后，在Chrome工具栏中会显示扩展图标

### 重新加载开发
- 在 `chrome://extensions/` 页面点击扩展的刷新按钮即可重新加载
- 或通过浏览器扩展管理界面刷新

## 使用方法

### 基本使用流程
1. **点击扩展图标**: 在任意网页上点击浏览器工具栏中的扩展图标
2. **触发获取**: 在弹出的popup窗口中点击"获取图片"按钮
3. **查看结果**: 自动打开新标签页显示图片获取结果
4. **操作图片**: 使用搜索、排序、分类、批量操作等功能

### 高级功能
- **右键菜单**: 在任意网页右键，选择"获取页面所有图片"
- **视图切换**: 在结果页面可在网格视图和列表视图间切换
- **批量下载**: 选中多个图片后点击"下载选中"
- **ZIP下载**: 选中多个图片后点击"打包下载ZIP"，弹出保存对话框选择路径
- **新标签页打开**: 选中图片后点击"新标签页打开"
- **URL复制**: 点击"复制所有URL"一键复制所有图片链接
- **自动停止监听**: 当一段时间没有新图片时自动停止搜索，显示停止按钮

## 开发约定

### 代码规范
- **模块化**: 使用ES6模块系统，按功能分离代码
- **命名规范**: 使用camelCase命名法
- **注释**: 重要函数和复杂逻辑添加中文注释
- **错误处理**: 网络请求和文件操作包含错误处理机制

### 架构模式
- **MV架构**: Model-View架构模式
  - Model: `Image.js` (图片数据模型)
  - View: `results.html` + `results.js` (结果展示)
  - Controller: 各模块中的业务逻辑
- **事件驱动**: 基于Chrome Extension API的消息传递机制
- **缓存策略**: 使用`CacheManager`缓存排序和分类结果

### 模块职责
- **background.js**: 处理扩展生命周期、消息路由、存储管理、下载处理
- **content.js**: 网页图片检测和URL提取
- **popup.js**: 用户界面交互控制
- **results.js**: 结果展示和用户操作
- **CacheManager.js**: 通用缓存管理
- **Image.js**: 图片对象封装
- **ImageProcessor.js**: 纯函数式图片处理工具库
- **ImageCollectionManager.js**: 图片收集状态管理
- **manifest.json**: 权限和资源声明

### 数据流
```
用户操作 → Popup → Background → Content Script
                   ↓
              Chrome Storage ← → Results Page
                   ↓
              图片显示和操作
```

### 关键文件说明

#### manifest.json
扩展的配置文件，定义了扩展的基本信息、权限、脚本文件等。使用Manifest V3规范，包含了jszip库的web_accessible_resources声明。

#### background.js
Service Worker后台脚本，负责：
- 扩展安装和更新处理
- 右键菜单创建
- 消息路由和传递
- Chrome Storage数据管理
- 标签页状态监控
- 下载处理（包括ZIP下载）

#### content.js
注入到网页的内容脚本，负责：
- 检测和提取网页中的所有图片URL
- 处理各种图片元素（img、background-image、data-src等）
- URL清理和去重
- 与background script通信

#### popup.js
扩展弹窗的交互逻辑，负责：
- 获取当前活动标签页
- 管理内容脚本注入
- 处理用户点击事件
- 打开结果页面

#### results.html/js
图片结果展示页面，负责：
- 图片列表渲染（网格/列表视图）
- 搜索和过滤功能
- 排序和分类功能
- 批量选择和下载
- ZIP下载功能
- 新标签页打开功能
- 图片预览和URL复制

#### 核心模块
- **CacheManager.js**: 提供缓存存储、获取、失效功能
- **Image.js**: 封装图片对象，包含URL、尺寸、格式等信息
- **ImageProcessor.js**: 提供纯函数式的排序、分类、过滤工具
- **ImageCollectionManager.js**: 管理图片收集状态，实现自动停止监听

### 调试和测试

#### 调试方法
1. **扩展调试**: 在`chrome://extensions/`页面点击"检查视图"
2. **内容脚本调试**: 在网页上右键"检查"，在控制台查看日志
3. **结果页面调试**: 在结果页面按F12打开开发者工具

#### 日志查看
- 扩展后台脚本日志在扩展检查器中查看
- 内容脚本日志在网页控制台查看
- 控制台日志包含图片检测、URL处理等详细信息

## 扩展权限说明

- **activeTab**: 访问当前活动标签页
- **scripting**: 注入内容脚本
- **storage**: 存储图片数据
- **tabs**: 管理标签页
- **contextMenus**: 创建右键菜单
- **downloads**: 处理下载请求（包括ZIP下载）
- **host_permissions**: 访问所有网站图片资源

## 注意事项

1. **跨域限制**: 部分图片可能因跨域策略无法直接下载
2. **性能优化**: 大量图片时建议使用分类和过滤功能
3. **存储限制**: Chrome storage有容量限制，大量数据请及时清理
4. **兼容性**: 仅支持Chrome 88+版本，依赖Manifest V3特性
5. **依赖库**: 使用jszip库实现ZIP打包功能，需要在manifest.json中声明
6. **自动停止**: 图片收集功能会在一段时间无新图片时自动停止

---

*本文档由iFlow CLI生成，最后更新: 2025-11-23*