#!/usr/bin/env tsx

/**
 * i18n 扫描器 - 扫描代码中的硬编码文本
 * 用法: npx tsx scripts/i18n-scanner.ts [options]
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ScanResult {
  file: string;
  line: number;
  text: string;
  context: string;
  type: 'string' | 'template' | 'jsx';
}

interface ScanOptions {
  includePatterns: string[];
  excludePatterns: string[];
  minLength: number;
  outputFile?: string;
}

class I18nScanner {
  private options: ScanOptions;

  constructor(options: Partial<ScanOptions> = {}) {
    this.options = {
      includePatterns: ['src/**/*.{ts,tsx,js,jsx}'],
      excludePatterns: [
        'src/**/*.test.{ts,tsx,js,jsx}',
        'src/**/*.spec.{ts,tsx,js,jsx}',
        'src/**/node_modules/**',
        'src/**/dist/**',
        'src/**/build/**',
      ],
      minLength: 3,
      ...options,
    };
  }

  /**
   * 扫描所有文件
   */
  async scan(): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    
    // 获取所有需要扫描的文件
    const files = await this.getFiles();
    
    console.log(`🔍 扫描 ${files.length} 个文件...`);
    
    for (const file of files) {
      const fileResults = await this.scanFile(file);
      results.push(...fileResults);
    }
    
    return results;
  }

  /**
   * 获取需要扫描的文件列表
   */
  private async getFiles(): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const pattern of this.options.includePatterns) {
      const files = await glob(pattern, {
        ignore: this.options.excludePatterns,
        cwd: process.cwd(),
      });
      allFiles.push(...files);
    }
    
    return [...new Set(allFiles)];
  }

  /**
   * 扫描单个文件
   */
  private async scanFile(filePath: string): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // 跳过注释行和导入行
        if (this.shouldSkipLine(line)) {
          continue;
        }
        
        // 扫描字符串字面量
        const stringResults = this.scanStringLiterals(line, filePath, lineNumber);
        results.push(...stringResults);
        
        // 扫描 JSX 文本
        const jsxResults = this.scanJsxText(line, filePath, lineNumber);
        results.push(...jsxResults);
      }
    } catch (error) {
      console.warn(`⚠️  无法读取文件 ${filePath}:`, error);
    }
    
    return results;
  }

  /**
   * 判断是否应该跳过某行
   */
  private shouldSkipLine(line: string): boolean {
    const trimmed = line.trim();
    
    // 跳过注释
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return true;
    }
    
    // 跳过导入语句
    if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
      return true;
    }
    
    // 跳过 console.log 等调试语句
    if (trimmed.includes('console.') || trimmed.includes('debugger')) {
      return true;
    }
    
    return false;
  }

  /**
   * 扫描字符串字面量
   */
  private scanStringLiterals(line: string, filePath: string, lineNumber: number): ScanResult[] {
    const results: ScanResult[] = [];
    
    // 匹配单引号和双引号字符串
    const stringRegex = /(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g;
    let match;
    
    while ((match = stringRegex.exec(line)) !== null) {
      const text = match[2];
      
      if (this.isValidText(text)) {
        results.push({
          file: filePath,
          line: lineNumber,
          text,
          context: this.getContext(line, match.index),
          type: match[1] === '`' ? 'template' : 'string',
        });
      }
    }
    
    return results;
  }

  /**
   * 扫描 JSX 文本内容
   */
  private scanJsxText(line: string, filePath: string, lineNumber: number): ScanResult[] {
    const results: ScanResult[] = [];
    
    // 匹配 JSX 中的文本内容
    const jsxTextRegex = />([^<>{}\n]+)</g;
    let match;
    
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1].trim();
      
      if (this.isValidText(text)) {
        results.push({
          file: filePath,
          line: lineNumber,
          text,
          context: this.getContext(line, match.index),
          type: 'jsx',
        });
      }
    }
    
    return results;
  }

  /**
   * 判断文本是否有效（需要翻译）
   */
  private isValidText(text: string): boolean {
    // 长度检查
    if (text.length < this.options.minLength) {
      return false;
    }
    
    // 跳过纯数字
    if (/^\d+$/.test(text)) {
      return false;
    }
    
    // 跳过 URL、邮箱等
    if (/^https?:\/\//.test(text) || /^[^\s]+@[^\s]+\.[^\s]+$/.test(text)) {
      return false;
    }
    
    // 跳过 CSS 类名、ID 等
    if (/^[a-z-]+$/i.test(text) && text.length < 20) {
      return false;
    }
    
    // 跳过变量名、函数名等
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(text)) {
      return false;
    }
    
    // 跳过已经使用 t() 函数的文本
    if (text.includes('t(') || text.includes('useTranslation')) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取上下文
   */
  private getContext(line: string, index: number): string {
    const start = Math.max(0, index - 20);
    const end = Math.min(line.length, index + 50);
    return line.substring(start, end).trim();
  }

  /**
   * 生成报告
   */
  generateReport(results: ScanResult[]): string {
    const report = [];
    
    report.push('# i18n 扫描报告');
    report.push(`\n扫描时间: ${new Date().toLocaleString()}`);
    report.push(`发现 ${results.length} 个可能需要翻译的文本\n`);
    
    // 按文件分组
    const byFile = results.reduce((acc, result) => {
      if (!acc[result.file]) {
        acc[result.file] = [];
      }
      acc[result.file].push(result);
      return acc;
    }, {} as Record<string, ScanResult[]>);
    
    for (const [file, fileResults] of Object.entries(byFile)) {
      report.push(`## ${file}`);
      report.push(`发现 ${fileResults.length} 个文本\n`);
      
      for (const result of fileResults) {
        report.push(`**第 ${result.line} 行** (${result.type})`);
        report.push(`\`\`\`${result.context}\`\`\``);
        report.push(`文本: "${result.text}"\n`);
      }
    }
    
    return report.join('\n');
  }

  /**
   * 保存报告到文件
   */
  async saveReport(results: ScanResult[], outputFile?: string): Promise<void> {
    const report = this.generateReport(results);
    const filename = outputFile || `i18n-scan-report-${Date.now()}.md`;
    
    fs.writeFileSync(filename, report, 'utf-8');
    console.log(`📄 报告已保存到: ${filename}`);
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  const options: Partial<ScanOptions> = {};
  
  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--min-length':
        options.minLength = parseInt(args[++i]);
        break;
      case '--output':
        options.outputFile = args[++i];
        break;
      case '--help':
        console.log(`
用法: npx tsx scripts/i18n-scanner.ts [options]

选项:
  --min-length <number>  最小文本长度 (默认: 3)
  --output <file>       输出文件路径
  --help                显示帮助信息

示例:
  npx tsx scripts/i18n-scanner.ts
  npx tsx scripts/i18n-scanner.ts --min-length 5 --output scan-report.md
        `);
        process.exit(0);
    }
  }
  
  const scanner = new I18nScanner(options);
  
  try {
    console.log('🚀 开始扫描...');
    const results = await scanner.scan();
    
    console.log(`✅ 扫描完成! 发现 ${results.length} 个可能需要翻译的文本`);
    
    if (results.length > 0) {
      await scanner.saveReport(results, options.outputFile);
      
      // 显示统计信息
      const byType = results.reduce((acc, result) => {
        acc[result.type] = (acc[result.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n📊 统计信息:');
      for (const [type, count] of Object.entries(byType)) {
        console.log(`  ${type}: ${count} 个`);
      }
    }
  } catch (error) {
    console.error('❌ 扫描失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { I18nScanner };
