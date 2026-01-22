#!/usr/bin/env tsx

/**
 * i18n 验证器 - 验证翻译键的完整性
 * 用法: npx tsx scripts/i18n-validator.ts [options]
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ValidationResult {
  type: 'missing' | 'unused' | 'inconsistent' | 'error';
  namespace: string;
  key: string;
  message: string;
  file?: string;
  line?: number;
}

interface ValidationOptions {
  localesDir: string;
  srcDir: string;
  namespaces: string[];
  languages: string[];
}

class I18nValidator {
  private options: ValidationOptions;
  private translations: Record<string, Record<string, any>> = {};
  private usedKeys: Set<string> = new Set();

  constructor(options: Partial<ValidationOptions> = {}) {
    this.options = {
      localesDir: 'src/locales',
      srcDir: 'src',
      namespaces: ['common', 'auth', 'flow', 'modal', 'message', 'navigation', 'ui', 'validation', 'store', 'component', 'page'],
      languages: ['zh', 'en'],
      ...options,
    };
  }

  /**
   * 执行完整验证
   */
  async validate(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    console.log('🔍 加载翻译文件...');
    await this.loadTranslations();
    
    console.log('🔍 扫描代码中的翻译键使用...');
    await this.scanUsedKeys();
    
    console.log('🔍 验证翻译完整性...');
    results.push(...this.validateCompleteness());
    
    console.log('🔍 验证键的一致性...');
    results.push(...this.validateConsistency());
    
    console.log('🔍 检查未使用的键...');
    results.push(...this.findUnusedKeys());
    
    return results;
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
   * 验证翻译完整性
   */
  private validateCompleteness(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    for (const lang of this.options.languages) {
      for (const ns of this.options.namespaces) {
        const langTranslations = this.translations[lang][ns] || {};
        
        // 检查每个使用的键是否在所有语言中都存在
        for (const usedKey of this.usedKeys) {
          const [keyNamespace, key] = this.parseKey(usedKey);
          
          if (keyNamespace === ns || (keyNamespace === 'common' && ns === 'common')) {
            if (!this.hasKey(langTranslations, key)) {
              results.push({
                type: 'missing',
                namespace: ns,
                key: usedKey,
                message: `缺少 ${lang} 语言的翻译: ${usedKey}`,
              });
            }
          }
        }
      }
    }
    
    return results;
  }

  /**
   * 验证键的一致性
   */
  private validateConsistency(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // 获取所有语言的键集合
    const allKeys: Record<string, Set<string>> = {};
    
    for (const lang of this.options.languages) {
      allKeys[lang] = new Set();
      
      for (const ns of this.options.namespaces) {
        const translations = this.translations[lang][ns] || {};
        const keys = this.getAllKeys(translations);
        
        for (const key of keys) {
          allKeys[lang].add(`${ns}:${key}`);
        }
      }
    }
    
    // 检查键的一致性
    const referenceLang = this.options.languages[0];
    const referenceKeys = allKeys[referenceLang];
    
    for (const lang of this.options.languages.slice(1)) {
      const langKeys = allKeys[lang];
      
      // 检查缺失的键
      for (const key of referenceKeys) {
        if (!langKeys.has(key)) {
          results.push({
            type: 'inconsistent',
            namespace: key.split(':')[0],
            key,
            message: `${lang} 语言缺少键: ${key}`,
          });
        }
      }
      
      // 检查多余的键
      for (const key of langKeys) {
        if (!referenceKeys.has(key)) {
          results.push({
            type: 'inconsistent',
            namespace: key.split(':')[0],
            key,
            message: `${lang} 语言有多余的键: ${key}`,
          });
        }
      }
    }
    
    return results;
  }

  /**
   * 查找未使用的键
   */
  private findUnusedKeys(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    for (const lang of this.options.languages) {
      for (const ns of this.options.namespaces) {
        const translations = this.translations[lang][ns] || {};
        const keys = this.getAllKeys(translations);
        
        for (const key of keys) {
          const fullKey = `${ns}:${key}`;
          
          if (!this.usedKeys.has(fullKey) && !this.usedKeys.has(key)) {
            results.push({
              type: 'unused',
              namespace: ns,
              key: fullKey,
              message: `未使用的翻译键: ${fullKey}`,
            });
          }
        }
      }
    }
    
    return results;
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
   * 生成验证报告
   */
  generateReport(results: ValidationResult[]): string {
    const report = [];
    
    report.push('# i18n 验证报告');
    report.push(`\n验证时间: ${new Date().toLocaleString()}`);
    report.push(`发现 ${results.length} 个问题\n`);
    
    // 按类型分组
    const byType = results.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {} as Record<string, ValidationResult[]>);
    
    const typeNames = {
      missing: '缺失的翻译',
      unused: '未使用的键',
      inconsistent: '不一致的键',
      error: '错误',
    };
    
    for (const [type, typeResults] of Object.entries(byType)) {
      report.push(`## ${typeNames[type as keyof typeof typeNames]} (${typeResults.length})`);
      
      for (const result of typeResults) {
        report.push(`- **${result.namespace}**: ${result.message}`);
      }
      report.push('');
    }
    
    return report.join('\n');
  }

  /**
   * 保存报告到文件
   */
  async saveReport(results: ValidationResult[], outputFile?: string): Promise<void> {
    const report = this.generateReport(results);
    const filename = outputFile || `i18n-validation-report-${Date.now()}.md`;
    
    fs.writeFileSync(filename, report, 'utf-8');
    console.log(`📄 验证报告已保存到: ${filename}`);
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  const options: Partial<ValidationOptions> = {};
  
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
用法: npx tsx scripts/i18n-validator.ts [options]

选项:
  --locales-dir <dir>   翻译文件目录 (默认: src/locales)
  --src-dir <dir>       源代码目录 (默认: src)
  --output <file>       输出文件路径
  --help                显示帮助信息

示例:
  npx tsx scripts/i18n-validator.ts
  npx tsx scripts/i18n-validator.ts --output validation-report.md
        `);
        process.exit(0);
    }
  }
  
  const validator = new I18nValidator(options);
  
  try {
    console.log('🚀 开始验证...');
    const results = await validator.validate();
    
    if (results.length === 0) {
      console.log('✅ 验证通过! 没有发现任何问题');
    } else {
      console.log(`⚠️  验证完成! 发现 ${results.length} 个问题`);
      
      await validator.saveReport(results, options.outputFile);
      
      // 显示统计信息
      const byType = results.reduce((acc, result) => {
        acc[result.type] = (acc[result.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n📊 问题统计:');
      for (const [type, count] of Object.entries(byType)) {
        console.log(`  ${type}: ${count} 个`);
      }
      
      // 如果有严重问题，退出码为 1
      const hasErrors = results.some(r => r.type === 'missing' || r.type === 'error');
      if (hasErrors) {
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { I18nValidator };
