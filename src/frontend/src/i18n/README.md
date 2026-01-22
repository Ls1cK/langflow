# 国际化 (i18n) 使用指南

本项目已集成 react-i18next 国际化解决方案，支持中英文切换，采用模块化翻译文件结构。

## 功能特性

- ✅ 支持中文和英文两种语言
- ✅ 默认显示中文
- ✅ 无刷新语言切换
- ✅ 语言偏好自动保存到本地存储
- ✅ 模块化翻译文件结构，便于维护
- ✅ 命名空间支持，避免键冲突
- ✅ 自动化工具辅助翻译管理

## 使用方法

### 1. 在组件中使用翻译

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common:title')}</h1>
      <button>{t('common:save')}</button>
    </div>
  );
}
```

### 2. 带参数的翻译

```tsx
// 翻译文件中的配置
{
  "welcome": "欢迎 {{name}}，您有 {{count}} 条消息"
}

// 组件中使用
const message = t('message:welcome', { name: '张三', count: 5 });
```

### 3. 语言切换

语言切换器已集成到侧边栏底部，用户可以通过点击切换语言。

## 翻译文件结构

```
src/locales/
├── zh/
│   ├── index.ts              # 导出所有翻译模块
│   ├── common.json           # 通用文本（按钮、标签等）
│   ├── auth.json             # 认证相关
│   ├── flow.json             # 流程编辑器相关
│   ├── modal.json            # 所有模态框
│   ├── message.json          # 提示消息
│   ├── navigation.json       # 导航相关
│   ├── ui.json               # 用户界面
│   ├── validation.json       # 表单验证
│   ├── store.json            # 商店相关
│   ├── component.json        # 组件相关
│   └── page.json             # 页面级文本
└── en/
    ├── index.ts
    ├── common.json
    └── ... (同上)
```

## 已翻译的组件

- ✅ 登录页面 (P0)
- ✅ 主导航和侧边栏 (P0)
- ✅ 流程编辑器核心功能 (P0)
- ✅ 删除确认模态框 (P0)
- ✅ 错误提示和成功消息 (P0)
- ✅ 语言切换器

## 添加新的翻译

1. 在对应的模块化 JSON 文件中添加翻译（如 `src/locales/zh/common.json`）
2. 在对应的英文文件中添加翻译（如 `src/locales/en/common.json`）
3. 在组件中使用 `t('namespace:key')` 调用翻译

## 翻译键命名规范

- `common:*` - 通用文本（保存、取消、删除等）
- `auth:*` - 认证相关文本
- `flow:*` - 流程相关文本
- `component:*` - 组件相关文本
- `modal:*` - 模态框相关文本
- `message:*` - 消息提示相关文本
- `ui:*` - 用户界面相关文本
- `navigation:*` - 导航相关文本
- `validation:*` - 表单验证文本
- `store:*` - 商店相关文本
- `page:*` - 页面级文本

## 自动化工具

项目提供了多个自动化工具来辅助翻译管理：

### 扫描器
```bash
npx tsx scripts/i18n-scanner.ts
```
扫描代码中的硬编码文本，生成需要翻译的文本报告。

### 验证器
```bash
npx tsx scripts/i18n-validator.ts
```
验证翻译键的完整性，检查缺失的翻译和不一致的键。

### 统计工具
```bash
npx tsx scripts/i18n-stats.ts
```
生成翻译覆盖率报告，显示翻译完成度统计。

### 未使用键清理
```bash
npx tsx scripts/i18n-unused-keys.ts --dry-run  # 预览模式
npx tsx scripts/i18n-unused-keys.ts --execute  # 实际清理
```
查找并清理未使用的翻译键。

## 技术实现

- **库**: react-i18next
- **语言检测**: i18next-browser-languagedetector
- **默认语言**: 中文 (zh)
- **回退语言**: 英文 (en)
- **存储**: localStorage
- **命名空间**: 支持模块化命名空间
- **默认命名空间**: common
