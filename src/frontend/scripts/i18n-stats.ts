#!/usr/bin/env tsx

/**
 * i18n 统计工具 - 生成翻译覆盖率报告
 * 用法: npx tsx scripts/i18n-stats.ts [options]
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface StatsData {
  totalKeys: number;
  usedKeys: number;
  unusedKeys: number;
  missingTranslations: number;
  coverage: number;
  byNamespace: Record<string, {
    total: number;
    used: number;
    unused: number;
    missing: number;
    coverage: number;
  }>;
  byLanguage: Record<string, {
    total: number;
    missing: number;
    coverage: number;
  }>;
}

interface StatsOptions {
  localesDir: string;
  srcDir: string;
  namespaces: string[];
  languages: string[];
  outputFile?: string;
}

class I18nStats {
  private options: StatsOptions;
  private translations: Record<string, Record<string, any>> = {};
  private usedKeys: Set<string> = new Set();

  constructor(options: Partial<StatsOptions> = {}) {
    this.options = {
      localesDir: 'src/locales',
      srcDir: 'src',
      namespaces: ['common', 'auth', 'flow', 'modal', 'message', 'navigation', 'ui', 'validation', 'store', 'component', 'page'],
      languages: ['zh', 'en'],
      ...options,
    };
  }

  /**
   * 生成统计报告
   */
  async generateStats(): Promise<StatsData> {
    console.log('🔍 加载翻译文件...');
    await this.loadTranslations();
    
    console.log('🔍 扫描代码中的翻译键使用...');
    await this.scanUsedKeys();
    
    console.log('📊 计算统计数据...');
    return this.calculateStats();
  }

  /**
   * 加载所有翻译文件
   */
  private async loadTranslations(): Promise<void> {
    for (const lang of this.options.languages) {
      this.translations[lang] = {};
      
      for (const ns of this.options.namespaces) {
        const filePath = path.join(this.options.localesDir, lang, `${ns}.json`);
        
        try {
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            this.translations[lang][ns] = JSON.parse(content);
          } else {
            this.translations[lang][ns] = {};
          }
        } catch (error) {
          console.warn(`⚠️  无法加载翻译文件 ${filePath}:`, error);
          this.translations[lang][ns] = {};
        }
      }
    }
  }

  /**
   * 扫描代码中使用的翻译键
   */
  private async scanUsedKeys(): Promise<void> {
    const files = await glob(`${this.options.srcDir}/**/*.{ts,tsx,js,jsx}`, {
      ignore: [
        `${this.options.srcDir}/**/*.test.{ts,tsx,js,jsx}`,
        `${this.options.srcDir}/**/*.spec.{ts,tsx,js,jsx}`,
        `${this.options.srcDir}/**/node_modules/**`,
      ],
    });

    for (const file of files) {
      await this.scanFileForKeys(file);
    }
  }

  /**
   * 扫描单个文件中的翻译键
   */
  private async scanFileForKeys(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 匹配 t('namespace:key') 或 t('key')
      const keyRegex = /t\(['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = keyRegex.exec(content)) !== null) {
        const key = match[1];
        this.usedKeys.add(key);
      }
    } catch (error) {
      console.warn(`⚠️  无法读取文件 ${filePath}:`, error);
    }
  }

  /**
   * 计算统计数据
   */
  private calculateStats(): StatsData {
    const stats: StatsData = {
      totalKeys: 0,
      usedKeys: this.usedKeys.size,
      unusedKeys: 0,
      missingTranslations: 0,
      coverage: 0,
      byNamespace: {},
      byLanguage: {},
    };

    // 按命名空间统计
    for (const ns of this.options.namespaces) {
      const nsStats = {
        total: 0,
        used: 0,
        unused: 0,
        missing: 0,
        coverage: 0,
      };

      // 获取该命名空间的所有键
      const allKeys = new Set<string>();
      for (const lang of this.options.languages) {
        const translations = this.translations[lang][ns] || {};
        const keys = this.getAllKeys(translations);
        keys.forEach(key => allKeys.add(key));
      }

      nsStats.total = allKeys.size;

      // 统计使用的键
      for (const usedKey of this.usedKeys) {
        const [keyNamespace, key] = this.parseKey(usedKey);
        if (keyNamespace === ns || (keyNamespace === 'common' && ns === 'common')) {
          nsStats.used++;
        }
      }

      nsStats.unused = nsStats.total - nsStats.used;
      nsStats.coverage = nsStats.total > 0 ? (nsStats.used / nsStats.total) * 100 : 0;

      stats.byNamespace[ns] = nsStats;
      stats.totalKeys += nsStats.total;
    }

    // 按语言统计
    for (const lang of this.options.languages) {
      const langStats = {
        total: 0,
        missing: 0,
        coverage: 0,
      };

      for (const ns of this.options.namespaces) {
        const translations = this.translations[lang][ns] || {};
        const keys = this.getAllKeys(translations);
        langStats.total += keys.length;

        // 检查缺失的翻译
        for (const usedKey of this.usedKeys) {
          const [keyNamespace, key] = this.parseKey(usedKey);
          if (keyNamespace === ns || (keyNamespace === 'common' && ns === 'common')) {
            if (!this.hasKey(translations, key)) {
              langStats.missing++;
            }
          }
        }
      }

      langStats.coverage = langStats.total > 0 ? ((langStats.total - langStats.missing) / langStats.total) * 100 : 0;
      stats.byLanguage[lang] = langStats;
    }

    // 计算总体统计
    stats.unusedKeys = stats.totalKeys - stats.usedKeys;
    stats.coverage = stats.totalKeys > 0 ? (stats.usedKeys / stats.totalKeys) * 100 : 0;

    return stats;
  }

  /**
   * 解析键
   */
  private parseKey(key: string): [string, string] {
    if (key.includes(':')) {
      const [namespace, ...keyParts] = key.split(':');
      return [namespace, keyParts.join(':')];
    }
    return ['common', key];
  }

  /**
   * 检查对象是否有指定的键
   */
  private hasKey(obj: any, key: string): boolean {
    const keys = key.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 获取对象的所有键（支持嵌套）
   */
  private getAllKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...this.getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }

  /**
   * 生成统计报告
   */
  generateReport(stats: StatsData): string {
    const report = [];
    
    report.push('# i18n 统计报告');
    report.push(`\n生成时间: ${new Date().toLocaleString()}\n`);
    
    // 总体统计
    report.push('## 📊 总体统计');
    report.push(`- **总键数**: ${stats.totalKeys}`);
    report.push(`- **已使用**: ${stats.usedKeys}`);
    report.push(`- **未使用**: ${stats.unusedKeys}`);
    report.push(`- **覆盖率**: ${stats.coverage.toFixed(1)}%\n`);
    
    // 按命名空间统计
    report.push('## 📁 按命名空间统计');
    report.push('| 命名空间 | 总数 | 已使用 | 未使用 | 覆盖率 |');
    report.push('|---------|------|--------|--------|--------|');
    
    for (const [ns, nsStats] of Object.entries(stats.byNamespace)) {
      report.push(`| ${ns} | ${nsStats.total} | ${nsStats.used} | ${nsStats.unused} | ${nsStats.coverage.toFixed(1)}% |`);
    }
    report.push('');
    
    // 按语言统计
    report.push('## 🌍 按语言统计');
    report.push('| 语言 | 总数 | 缺失 | 覆盖率 |');
    report.push('|------|------|------|--------|');
    
    for (const [lang, langStats] of Object.entries(stats.byLanguage)) {
      report.push(`| ${lang} | ${langStats.total} | ${langStats.missing} | ${langStats.coverage.toFixed(1)}% |`);
    }
    report.push('');
    
    // 建议
    report.push('## 💡 建议');
    
    if (stats.coverage < 50) {
      report.push('- ⚠️  翻译覆盖率较低，建议优先翻译常用组件');
    } else if (stats.coverage < 80) {
      report.push('- 📈 翻译覆盖率中等，建议继续完善翻译');
    } else {
      report.push('- ✅ 翻译覆盖率良好，建议定期维护');
    }
    
    if (stats.unusedKeys > 0) {
      report.push(`- 🧹 发现 ${stats.unusedKeys} 个未使用的翻译键，建议清理`);
    }
    
    const languagesWithMissing = Object.entries(stats.byLanguage)
      .filter(([, langStats]) => langStats.missing > 0)
      .map(([lang]) => lang);
    
    if (languagesWithMissing.length > 0) {
      report.push(`- 🔧 以下语言存在缺失翻译: ${languagesWithMissing.join(', ')}`);
    }
    
    return report.join('\n');
  }

  /**
   * 保存报告到文件
   */
  async saveReport(stats: StatsData, outputFile?: string): Promise<void> {
    const report = this.generateReport(stats);
    const filename = outputFile || `i18n-stats-report-${Date.now()}.md`;
    
    fs.writeFileSync(filename, report, 'utf-8');
    console.log(`📄 统计报告已保存到: ${filename}`);
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  const options: Partial<StatsOptions> = {};
  
  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--locales-dir':
        options.localesDir = args[++i];
        break;
      case '--src-dir':
        options.srcDir = args[++i];
        break;
      case '--output':
        options.outputFile = args[++i];
        break;
      case '--help':
        console.log(`
用法: npx tsx scripts/i18n-stats.ts [options]

选项:
  --locales-dir <dir>   翻译文件目录 (默认: src/locales)
  --src-dir <dir>       源代码目录 (默认: src)
  --output <file>       输出文件路径
  --help                显示帮助信息

示例:
  npx tsx scripts/i18n-stats.ts
  npx tsx scripts/i18n-stats.ts --output stats-report.md
        `);
        process.exit(0);
    }
  }
  
  const stats = new I18nStats(options);
  
  try {
    console.log('🚀 开始生成统计报告...');
    const statsData = await stats.generateStats();
    
    console.log('✅ 统计完成!');
    console.log(`📊 总体覆盖率: ${statsData.coverage.toFixed(1)}%`);
    console.log(`📝 总键数: ${statsData.totalKeys}`);
    console.log(`✅ 已使用: ${statsData.usedKeys}`);
    console.log(`❌ 未使用: ${statsData.unusedKeys}`);
    
    await stats.saveReport(statsData, options.outputFile);
  } catch (error) {
    console.error('❌ 统计失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { I18nStats };
