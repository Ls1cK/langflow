#!/usr/bin/env tsx

/**
 * i18n 未使用键清理工具 - 查找并清理未使用的翻译键
 * 用法: npx tsx scripts/i18n-unused-keys.ts [options]
 */

import fs from "fs";
import { glob } from "glob";
import path from "path";

interface UnusedKey {
  namespace: string;
  key: string;
  fullKey: string;
  file: string;
  line?: number;
}

interface CleanupOptions {
  localesDir: string;
  srcDir: string;
  namespaces: string[];
  languages: string[];
  dryRun: boolean;
  outputFile?: string;
}

class I18nUnusedKeysCleaner {
  private options: CleanupOptions;
  private translations: Record<string, Record<string, any>> = {};
  private usedKeys: Set<string> = new Set();

  constructor(options: Partial<CleanupOptions> = {}) {
    this.options = {
      localesDir: "src/locales",
      srcDir: "src",
      namespaces: [
        "common",
        "auth",
        "flow",
        "modal",
        "message",
        "navigation",
        "ui",
        "validation",
        "store",
        "component",
        "page",
      ],
      languages: ["zh", "en"],
      dryRun: true,
      ...options,
    };
  }

  /**
   * 查找未使用的键
   */
  async findUnusedKeys(): Promise<UnusedKey[]> {
    console.log("🔍 加载翻译文件...");
    await this.loadTranslations();

    console.log("🔍 扫描代码中的翻译键使用...");
    await this.scanUsedKeys();

    console.log("🔍 查找未使用的键...");
    return this.findUnused();
  }

  /**
   * 清理未使用的键
   */
  async cleanupUnusedKeys(unusedKeys: UnusedKey[]): Promise<void> {
    if (this.options.dryRun) {
      console.log("🔍 模拟模式 - 不会实际删除文件");
      return;
    }

    console.log("🧹 开始清理未使用的键...");

    // 按文件分组
    const byFile = unusedKeys.reduce(
      (acc, key) => {
        if (!acc[key.file]) {
          acc[key.file] = [];
        }
        acc[key.file].push(key);
        return acc;
      },
      {} as Record<string, UnusedKey[]>,
    );

    for (const [filePath, keys] of Object.entries(byFile)) {
      await this.cleanupFile(filePath, keys);
    }
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
            const content = fs.readFileSync(filePath, "utf-8");
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
      const content = fs.readFileSync(filePath, "utf-8");

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
   * 查找未使用的键
   */
  private findUnused(): UnusedKey[] {
    const unused: UnusedKey[] = [];

    for (const lang of this.options.languages) {
      for (const ns of this.options.namespaces) {
        const translations = this.translations[lang][ns] || {};
        const keys = this.getAllKeys(translations);

        for (const key of keys) {
          const fullKey = `${ns}:${key}`;

          if (!this.usedKeys.has(fullKey) && !this.usedKeys.has(key)) {
            unused.push({
              namespace: ns,
              key,
              fullKey,
              file: path.join(this.options.localesDir, lang, `${ns}.json`),
            });
          }
        }
      }
    }

    return unused;
  }

  /**
   * 清理文件中的未使用键
   */
  private async cleanupFile(
    filePath: string,
    keys: UnusedKey[],
  ): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const translations = JSON.parse(content);

      let modified = false;

      for (const unusedKey of keys) {
        if (this.removeKey(translations, unusedKey.key)) {
          modified = true;
          console.log(`🗑️  删除未使用的键: ${unusedKey.fullKey}`);
        }
      }

      if (modified) {
        const newContent = JSON.stringify(translations, null, 2) + "\n";
        fs.writeFileSync(filePath, newContent, "utf-8");
        console.log(`✅ 已更新文件: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ 清理文件失败 ${filePath}:`, error);
    }
  }

  /**
   * 从对象中删除指定的键
   */
  private removeKey(obj: any, key: string): boolean {
    const keys = key.split(".");

    if (keys.length === 1) {
      if (key in obj) {
        delete obj[key];
        return true;
      }
      return false;
    }

    const parentKey = keys.slice(0, -1).join(".");
    const lastKey = keys[keys.length - 1];

    const parent = this.getNestedValue(obj, parentKey);
    if (parent && typeof parent === "object" && lastKey in parent) {
      delete parent[lastKey];
      return true;
    }

    return false;
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, key: string): any {
    const keys = key.split(".");
    let current = obj;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 获取对象的所有键（支持嵌套）
   */
  private getAllKeys(obj: any, prefix = ""): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        keys.push(...this.getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  /**
   * 生成清理报告
   */
  generateReport(unusedKeys: UnusedKey[]): string {
    const report = [];

    report.push("# i18n 未使用键清理报告");
    report.push(`\n生成时间: ${new Date().toLocaleString()}`);
    report.push(`发现 ${unusedKeys.length} 个未使用的键\n`);

    if (unusedKeys.length === 0) {
      report.push("✅ 没有发现未使用的翻译键！");
      return report.join("\n");
    }

    // 按文件分组
    const byFile = unusedKeys.reduce(
      (acc, key) => {
        if (!acc[key.file]) {
          acc[key.file] = [];
        }
        acc[key.file].push(key);
        return acc;
      },
      {} as Record<string, UnusedKey[]>,
    );

    report.push("## 📁 按文件分组");

    for (const [file, keys] of Object.entries(byFile)) {
      report.push(`### ${file}`);
      report.push(`发现 ${keys.length} 个未使用的键:\n`);

      for (const key of keys) {
        report.push(`- \`${key.fullKey}\``);
      }
      report.push("");
    }

    // 按命名空间分组
    const byNamespace = unusedKeys.reduce(
      (acc, key) => {
        if (!acc[key.namespace]) {
          acc[key.namespace] = [];
        }
        acc[key.namespace].push(key);
        return acc;
      },
      {} as Record<string, UnusedKey[]>,
    );

    report.push("## 📊 按命名空间统计");
    report.push("| 命名空间 | 未使用键数 |");
    report.push("|---------|-----------|");

    for (const [ns, keys] of Object.entries(byNamespace)) {
      report.push(`| ${ns} | ${keys.length} |`);
    }
    report.push("");

    // 建议
    report.push("## 💡 建议");
    report.push("- 在删除前，请确认这些键确实未被使用");
    report.push("- 建议先使用 `--dry-run` 模式预览要删除的键");
    report.push("- 删除后请运行测试确保没有破坏功能");

    return report.join("\n");
  }

  /**
   * 保存报告到文件
   */
  async saveReport(
    unusedKeys: UnusedKey[],
    outputFile?: string,
  ): Promise<void> {
    const report = this.generateReport(unusedKeys);
    const filename = outputFile || `i18n-unused-keys-report-${Date.now()}.md`;

    fs.writeFileSync(filename, report, "utf-8");
    console.log(`📄 清理报告已保存到: ${filename}`);
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  const options: Partial<CleanupOptions> = {};

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--locales-dir":
        options.localesDir = args[++i];
        break;
      case "--src-dir":
        options.srcDir = args[++i];
        break;
      case "--output":
        options.outputFile = args[++i];
        break;
      case "--execute":
        options.dryRun = false;
        break;
      case "--help":
        console.log(`
用法: npx tsx scripts/i18n-unused-keys.ts [options]

选项:
  --locales-dir <dir>   翻译文件目录 (默认: src/locales)
  --src-dir <dir>       源代码目录 (默认: src)
  --output <file>       输出文件路径
  --execute             实际执行清理 (默认: 仅预览)
  --help                显示帮助信息

示例:
  npx tsx scripts/i18n-unused-keys.ts                    # 预览模式
  npx tsx scripts/i18n-unused-keys.ts --execute          # 实际清理
  npx tsx scripts/i18n-unused-keys.ts --output report.md # 保存报告
        `);
        process.exit(0);
    }
  }

  const cleaner = new I18nUnusedKeysCleaner(options);

  try {
    console.log("🚀 开始查找未使用的键...");
    const unusedKeys = await cleaner.findUnusedKeys();

    if (unusedKeys.length === 0) {
      console.log("✅ 没有发现未使用的翻译键！");
    } else {
      console.log(`⚠️  发现 ${unusedKeys.length} 个未使用的键`);

      await cleaner.saveReport(unusedKeys, options.outputFile);

      if (options.dryRun) {
        console.log("\n💡 这是预览模式，要实际清理请使用 --execute 参数");
      } else {
        await cleaner.cleanupUnusedKeys(unusedKeys);
        console.log("✅ 清理完成！");
      }
    }
  } catch (error) {
    console.error("❌ 清理失败:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { I18nUnusedKeysCleaner };
