#!/usr/bin/env node

/**
 * 一个人的纪念碑 - 主入口
 *
 * 用法:
 *   node src/index.js generate --wechat <path> --qq <path>  # 从导出文件生成
 *   node src/index.js generate --test-data                   # 用测试数据生成
 *   node src/index.js burn --dir <path>                      # 焚毁指定目录
 *   node src/index.js generate --test-data --no-burn         # 生成但不焚毁（调试用）
 */

import { program } from 'commander';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 加载 .env 环境变量
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { WechatAdapter } from './adapters/wechat-adapter.js';
import { QQAdapter } from './adapters/qq-adapter.js';
import { FeishuAdapter } from './adapters/feishu-adapter.js';
import { TelegramAdapter } from './adapters/telegram-adapter.js';
import { DiscordAdapter } from './adapters/discord-adapter.js';
import { WeiboAdapter } from './adapters/weibo-adapter.js';
import { DataMerger } from './core/merge.js';
import { MonumentAnalyzer } from './core/analyzer.js';
import { MonumentGenerator } from './core/generator.js';
import { DataBurner } from './core/burner.js';
import { MessageExtractor } from './core/extractor.js';
import { getCelebrityData, listCelebrities } from './datasets/index.js';

program
  .name('monument')
  .description('一个人的纪念碑 - A Person\'s Monument')
  .version('0.1.0');

// generate 命令
program
  .command('generate')
  .description('生成人生纪念碑')
  .option('--wechat <path>', '微信导出 JSON 文件路径')
  .option('--qq <path>', 'QQ 导出 JSON 文件路径')
  .option('--feishu <path>', '飞书导出 JSON 文件路径')
  .option('--telegram <path>', 'Telegram 导出 JSON 文件路径')
  .option('--discord <path>', 'Discord 导出 JSON 文件路径')
  .option('--weibo <path>', '微博导出 JSON 文件路径')
  .option('--feishu-export', '通过 lark-cli 直接导出飞书数据')
  .option('--feishu-start <iso>', '飞书导出开始时间 ISO 8601 (如 2023-01-01T00:00:00+08:00)')
  .option('--feishu-end <iso>', '飞书导出结束时间 ISO 8601')
  .option('--feishu-chat <id>', '飞书指定聊天 ID (不指定则获取所有群聊)')
  .option('--test-data', '使用测试模拟数据')
  .option('--celebrity <name>', '使用内置名人数据集（如 libai）')
  .option('--list-celebrities', '列出所有可用名人数据集')
  .option('--auto', '自动提取所有平台的聊天记录')
  .option('--auto-wechat', '自动提取微信（需 --wx-db 或 --wechat-file）')
  .option('--auto-feishu', '自动提取飞书（需 .env 配置 FEISHU_APP_ID/SECRET）')
  .option('--auto-qq', '自动提取 QQ（需 OneBot HTTP API 运行中）')
  .option('--auto-qqzone', '自动提取 QQ空间（需 --qzone-uin 和 --qzone-cookie）')
  .option('--auto-telegram', '自动提取 Telegram（需 --telegram）')
  .option('--auto-discord', '自动提取 Discord（需 --discord）')
  .option('--auto-weibo', '自动提取微博（需 --weibo）')
  .option('--wx-db <path>', '微信数据库路径（MSG0.db 或已解密的 .db）')
  .option('--wx-key <hex>', '微信数据库密钥（64位 hex）')
  .option('--wx-id <wxid>', '微信 wxid')
  .option('--wx-4x', '微信 4.x 格式数据库')
  .option('--wx-talker <wxid>', '微信指定聊天对象')
  .option('--qq-url <url>', 'OneBot HTTP API 地址（默认 http://localhost:5700）')
  .option('--qq-group <id>', 'QQ 群号')
  .option('--qq-user <id>', 'QQ 好友号')
  .option('--qzone-uin <qq>', 'QQ空间 QQ 号')
  .option('--qzone-cookie <cookie>', 'QQ空间登录 cookie')
  .option('--no-burn', '不焚毁原始数据（调试用）')
  .option('--provider <name>', 'AI 提供商: deepseek | claude', 'deepseek')
  .option('--output <dir>', '输出目录', './output')
  .option('--theme <name>', '主题模板: default | ink | minimal | warm | cyber', process.env.THEME || 'default')
  .action(async (options) => {
    try {
      await generateMonument(options);
    } catch (err) {
      console.error('错误:', err.message);
      process.exit(1);
    }
  });

// burn 命令
program
  .command('burn')
  .description('焚毁指定文件或目录')
  .option('--dir <path>', '要焚毁的目录')
  .option('--files <paths...>', '要焚毁的文件列表')
  .option('--output <dir>', '报告输出目录', './output')
  .action(async (options) => {
    try {
      await burnData(options);
    } catch (err) {
      console.error('错误:', err.message);
      process.exit(1);
    }
  });

// export 命令 - 统一消息提取
program
  .command('export')
  .description('提取聊天记录（微信/飞书/QQ/QQ空间/Telegram/Discord/微博）')
  .option('--wechat', '提取微信（从文件，需 --wechat-file）')
  .option('--wechat-file <path>', '微信已导出 JSON 文件路径')
  .option('--wx-db <path>', '微信数据库路径（MSG0.db 或已解密的 .db）')
  .option('--wx-key <hex>', '微信数据库密钥（64位 hex）')
  .option('--wx-id <wxid>', '微信 wxid')
  .option('--wx-4x', '微信 4.x 格式数据库')
  .option('--wx-talker <wxid>', '微信指定聊天对象')
  .option('--feishu', '提取飞书')
  .option('--qq', '提取 QQ')
  .option('--qqzone', '提取 QQ空间')
  .option('--telegram', '提取 Telegram')
  .option('--telegram-file <path>', 'Telegram 已导出 JSON 文件路径')
  .option('--discord', '提取 Discord')
  .option('--discord-file <path>', 'Discord 已导出 JSON 文件路径')
  .option('--weibo', '提取微博')
  .option('--weibo-file <path>', '微博已导出 JSON 文件路径')
  .option('--all', '提取所有平台')
  .option('--feishu-start <iso>', '飞书开始时间')
  .option('--feishu-end <iso>', '飞书结束时间')
  .option('--feishu-chat <id>', '飞书指定聊天 ID')
  .option('--qq-url <url>', 'OneBot HTTP API 地址')
  .option('--qq-group <id>', 'QQ 群号')
  .option('--qq-user <id>', 'QQ 好友号')
  .option('--qzone-uin <qq>', 'QQ空间 QQ 号')
  .option('--qzone-cookie <cookie>', 'QQ空间登录 cookie')
  .option('--output <dir>', '输出目录', './output')
  .action(async (options) => {
    try {
      await exportData(options);
    } catch (err) {
      console.error('错误:', err.message);
      process.exit(1);
    }
  });

// status 命令 - 检查工具状态
program
  .command('status')
  .description('检查 CLI 工具和环境状态')
  .action(async () => {
    try {
      await checkStatus();
    } catch (err) {
      console.error('错误:', err.message);
      process.exit(1);
    }
  });

program.parse();

/**
 * 生成纪念碑主流程
 */
async function generateMonument(options) {
  console.log('╔══════════════════════════════════════╗');
  console.log('║     一个人的纪念碑 · 生成器          ║');
  console.log('╚══════════════════════════════════════╝\n');

  const tempDir = path.join(options.output, 'temp');
  const filesToBurn = [];

  // 确保目录存在
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(options.output, { recursive: true });

  // ========== 第1步：数据采集 ==========
  console.log('【第1步】数据采集');
  const dataList = [];

  if (options.listCelebrities) {
    listCelebrities();
    process.exit(0);
  }

  if (options.celebrity) {
    console.log('  加载名人数据集...');
    const celebData = getCelebrityData(options.celebrity);
    if (!celebData) {
      throw new Error(`未找到名人数据集: ${options.celebrity}`);
    }
    dataList.push(celebData);
    console.log(`    ✓ ${celebData.messages.length} 条消息, ${celebData.contacts.length} 个联系人`);
    console.log(`    ✓ 时间跨度: ${new Date(celebData.meta.timeRange.start * 1000).getFullYear()} - ${new Date(celebData.meta.timeRange.end * 1000).getFullYear()}`);
  } else if (options.testData) {
    console.log('  使用测试模拟数据...');
    const testData = loadTestData();
    dataList.push(testData);
  } else if (options.auto || options.autoWechat || options.autoFeishu || options.autoQq || options.autoQqzone || options.autoTelegram || options.autoDiscord || options.autoWeibo) {
    // 统一消息提取器
    console.log('  使用统一消息提取器...');
    const extractor = new MessageExtractor();

    const config = {};

    if (options.auto || options.autoWechat) {
      config.wechat = {};
      if (options.wechat) {
        config.wechat.file = options.wechat;
      } else if (options.wxDb) {
        config.wechat.dbPath = options.wxDb;
        config.wechat.keyHex = options.wxKey;
        config.wechat.wxid = options.wxId;
        config.wechat.is4x = options.wx4x || false;
        config.wechat.talker = options.wxTalker;
      }
    }

    if (options.auto || options.autoFeishu) {
      config.feishu = {
        appId: process.env.FEISHU_APP_ID,
        appSecret: process.env.FEISHU_APP_SECRET,
        chatId: options.feishuChat,
        startTime: options.feishuStart,
        endTime: options.feishuEnd
      };
      if (options.feishu) config.feishu.file = options.feishu;
    }

    if (options.auto || options.autoQq) {
      config.qq = {
        baseUrl: options.qqUrl || 'http://localhost:5700',
        groupId: options.qqGroup ? parseInt(options.qqGroup) : undefined,
        userId: options.qqUser ? parseInt(options.qqUser) : undefined
      };
      if (options.qq) config.qq.file = options.qq;
    }

    if (options.auto || options.autoQqzone) {
      config.qqzone = {
        uin: options.qzoneUin,
        cookie: options.qzoneCookie
      };
    }

    if (options.auto || options.autoTelegram) {
      if (options.telegram) {
        config.telegram = { file: options.telegram };
      }
    }

    if (options.auto || options.autoDiscord) {
      if (options.discord) {
        config.discord = { file: options.discord };
      }
    }

    if (options.auto || options.autoWeibo) {
      if (options.weibo) {
        config.weibo = { file: options.weibo };
      }
    }

    const autoData = await extractor.extractAll(config);
    if (autoData) {
      dataList.push(autoData);
      // 保存提取的原始数据到临时文件（用于焚毁）
      const autoTempFile = path.join(tempDir, `auto-extract-${Date.now()}.json`);
      fs.writeFileSync(autoTempFile, JSON.stringify(autoData, null, 2), 'utf-8');
      filesToBurn.push(autoTempFile);
    }
  } else {
    if (options.wechat) {
      console.log('  加载微信数据...');
      const adapter = new WechatAdapter();
      const data = await adapter.load(options.wechat);
      dataList.push(data);
      filesToBurn.push(options.wechat);
      console.log(`    ✓ ${data.messages.length} 条消息, ${data.contacts.length} 个联系人`);
    }

    if (options.qq) {
      console.log('  加载 QQ 数据...');
      const adapter = new QQAdapter();
      const data = await adapter.load(options.qq);
      dataList.push(data);
      filesToBurn.push(options.qq);
      console.log(`    ✓ ${data.messages.length} 条消息, ${data.contacts.length} 个联系人`);
    }

    if (options.feishu) {
      console.log('  加载飞书数据...');
      const adapter = new FeishuAdapter();
      const data = await adapter.load(options.feishu);
      dataList.push(data);
      filesToBurn.push(options.feishu);
      console.log(`    ✓ ${data.messages.length} 条消息, ${data.contacts.length} 个联系人`);
    }

    if (options.telegram) {
      console.log('  加载 Telegram 数据...');
      const adapter = new TelegramAdapter();
      const data = await adapter.load(options.telegram);
      dataList.push(data);
      filesToBurn.push(options.telegram);
      console.log(`    ✓ ${data.messages.length} 条消息, ${data.contacts.length} 个联系人`);
    }

    if (options.discord) {
      console.log('  加载 Discord 数据...');
      const adapter = new DiscordAdapter();
      const data = await adapter.load(options.discord);
      dataList.push(data);
      filesToBurn.push(options.discord);
      console.log(`    ✓ ${data.messages.length} 条消息, ${data.contacts.length} 个联系人`);
    }

    if (options.weibo) {
      console.log('  加载微博数据...');
      const adapter = new WeiboAdapter();
      const data = await adapter.load(options.weibo);
      dataList.push(data);
      filesToBurn.push(options.weibo);
      console.log(`    ✓ ${data.messages.length} 条消息, ${data.contacts.length} 个联系人`);
    }

    if (options.feishuExport) {
      console.log('  通过 lark-cli 导出飞书数据...');
      const adapter = new FeishuAdapter();
      const feishuTempFile = path.join(tempDir, `feishu-export-${Date.now()}.json`);
      const data = await adapter.export({
        startTime: options.feishuStart,
        endTime: options.feishuEnd,
        chatId: options.feishuChat,
        outputDir: tempDir
      });
      // 保存导出结果到临时文件（用于焚毁）
      fs.writeFileSync(feishuTempFile, JSON.stringify(data, null, 2), 'utf-8');
      filesToBurn.push(feishuTempFile);
      dataList.push(data);
      console.log(`    ✓ ${data.messages.length} 条消息, ${data.contacts.length} 个联系人`);
    }

    if (dataList.length === 0) {
      throw new Error('未提供任何数据源，请使用 --wechat / --qq / --feishu / --telegram / --discord / --weibo / --feishu-export 或 --test-data');
    }
  }

  // ========== 第2步：数据合并 ==========
  console.log('\n【第2步】数据合并');
  const merger = new DataMerger();
  const unifiedData = merger.merge(dataList);
  console.log(`  合并后: ${unifiedData.messages.length} 条消息, ${unifiedData.contacts.length} 个联系人`);

  // 保存合并后的数据到临时文件
  const unifiedPath = path.join(tempDir, 'unified-data.json');
  fs.writeFileSync(unifiedPath, JSON.stringify(unifiedData, null, 2), 'utf-8');
  filesToBurn.push(unifiedPath);

  // ========== 第3步：AI 分析 ==========
  console.log('\n【第3步】AI 分析');
  const analyzer = new MonumentAnalyzer({
    provider: options.provider,
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY
  });
  const analysisResult = await analyzer.analyze(unifiedData);
  console.log(`  ✓ 纪念碑内容已生成`);

  // 保存分析结果到临时文件
  const analysisPath = path.join(tempDir, 'analysis-result.json');
  fs.writeFileSync(analysisPath, JSON.stringify(analysisResult, null, 2), 'utf-8');
  filesToBurn.push(analysisPath);

  // ========== 第4步：生成纪念碑 ==========
  console.log('\n【第4步】生成纪念碑');
  const generator = new MonumentGenerator({ theme: options.theme });
  const { jsonPath, htmlPath } = generator.generate(analysisResult, options.output, { theme: options.theme });
  console.log(`  ✓ JSON: ${jsonPath}`);
  console.log(`  ✓ HTML: ${htmlPath}`);

  // ========== 第5步：数据焚毁 ==========
  if (options.burn !== false) {
    console.log('\n【第5步】数据焚毁');
    console.log('  正在执行 DoD 5220.22-M 三轮擦除...');
    const burner = new DataBurner();
    await burner.burn(filesToBurn);

    // 焚毁临时目录
    if (fs.existsSync(tempDir)) {
      await burner.burnDirectory(tempDir);
    }

    const { reportPath } = burner.saveReport(options.output);
    burner.printSummary();
    console.log(`  销毁报告: ${reportPath}`);
  } else {
    console.log('\n【第5步】跳过焚毁（--no-burn）');
    console.log(`  ⚠ 临时数据保留在: ${tempDir}`);
  }

  // ========== 完成 ==========
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║          纪念碑生成完成              ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  纪念碑页面: ${path.basename(htmlPath).padEnd(24)} ║`);
  console.log(`║  结构数据:   ${path.basename(jsonPath).padEnd(24)} ║`);
  if (options.burn !== false) {
    console.log('║  原始数据:   已焚毁                  ║');
  }
  console.log('╚══════════════════════════════════════╝');
  console.log(`\n打开 ${htmlPath} 查看你的纪念碑。`);
  console.log('可将 monument.json 上传到纪念碑谷平台。');
}

/**
 * 焚毁数据
 */
async function burnData(options) {
  console.log('╔══════════════════════════════════════╗');
  console.log('║          数据焚毁器                  ║');
  console.log('╚══════════════════════════════════════╝\n');

  const burner = new DataBurner();
  const targets = [];

  if (options.dir) {
    targets.push(options.dir);
  }
  if (options.files) {
    targets.push(...options.files);
  }

  if (targets.length === 0) {
    throw new Error('请指定要焚毁的目录 (--dir) 或文件 (--files)');
  }

  console.log('正在执行 DoD 5220.22-M 三轮擦除...\n');

  for (const target of targets) {
    if (fs.statSync(target).isDirectory()) {
      await burner.burnDirectory(target);
    } else {
      await burner.burnFile(target);
    }
  }

  const { reportPath } = burner.saveReport(options.output);
  burner.printSummary();
  console.log(`销毁报告: ${reportPath}`);
}

/**
 * 加载测试数据
 */
function loadTestData() {
  const testDir = path.join(__dirname, '..', 'test-data');
  const testFile = path.join(testDir, 'mock-chat.json');

  if (fs.existsSync(testFile)) {
    const raw = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    return raw;
  }

  // 如果没有测试数据文件，生成内联模拟数据
  console.log('  生成内联模拟数据...');
  return generateInlineMockData();
}

/**
 * 生成内联模拟数据
 */
function generateInlineMockData() {
  const messages = [];
  const contacts = [];
  const platforms = ['wechat', 'qq'];
  const chatNames = ['老王', '小李', '妈妈', '同事群', '大学室友'];
  const sampleTexts = [
    '在吗？', '今天加班到好晚', '周末一起吃饭吧', '最近怎么样',
    '我看到一个好搞笑的视频', '这个项目太难了', '晚安', '早上好',
    '吃饭了没', '我想了一下，还是算了吧', '谢谢你', '没事的会好的',
    '你说的对', '我也这么觉得', '哈哈哈太逗了', '今天天气不错',
    '我搬家了', '新工作还行', '加油啊', '改天再聊'
  ];

  const startTime = new Date('2020-01-01').getTime() / 1000;
  const endTime = new Date('2023-12-31').getTime() / 1000;

  for (let i = 0; i < 2000; i++) {
    const timestamp = startTime + Math.random() * (endTime - startTime);
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const chatName = chatNames[Math.floor(Math.random() * chatNames.length)];
    const isSelf = Math.random() > 0.5;
    const content = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];

    messages.push({
      platform,
      messageId: `mock_${i}`,
      chatId: `${platform}_${chatName}`,
      chatName,
      sender: isSelf ? '我' : chatName,
      isSelf,
      timestamp: Math.floor(timestamp),
      type: 'text',
      content
    });
  }

  messages.sort((a, b) => a.timestamp - b.timestamp);

  for (const name of chatNames) {
    const msgs = messages.filter(m => m.chatName === name);
    contacts.push({
      name,
      platform: msgs[0]?.platform || 'wechat',
      chatId: msgs[0]?.chatId || name,
      msgCount: msgs.length,
      selfMsgCount: msgs.filter(m => m.isSelf).length,
      lastActive: Math.max(...msgs.map(m => m.timestamp)),
      isGroup: name.includes('群')
    });
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      platforms,
      totalMessages: messages.length,
      timeRange: { start: messages[0].timestamp, end: messages[messages.length - 1].timestamp }
    },
    messages,
    contacts
  };
}

/**
 * 统一消息提取
 */
async function exportData(options) {
  console.log('╔══════════════════════════════════════╗');
  console.log('║       统一消息提取器                 ║');
  console.log('╚══════════════════════════════════════╝\n');

  const extractor = new MessageExtractor();

  const config = {};

  // 微信：支持数据库直读 或 文件加载
  if (options.all || options.wechat || options.wxDb) {
    config.wechat = {};
    if (options.wechatFile) {
      config.wechat.file = options.wechatFile;
    } else if (options.wxDb) {
      config.wechat.dbPath = options.wxDb;
      config.wechat.keyHex = options.wxKey;
      config.wechat.wxid = options.wxId;
      config.wechat.is4x = options.wx4x || false;
      config.wechat.talker = options.wxTalker;
    } else if (options.all) {
      // --all 模式下如果没有 wx-db 则跳过（extractAll 会处理空配置）
    } else {
      throw new Error('微信提取需要 --wx-db（数据库路径）或 --wechat-file（已导出文件）');
    }
  }

  // 飞书
  if (options.all || options.feishu) {
    config.feishu = {
      appId: process.env.FEISHU_APP_ID,
      appSecret: process.env.FEISHU_APP_SECRET,
      chatId: options.feishuChat,
      startTime: options.feishuStart,
      endTime: options.feishuEnd
    };
  }

  // QQ
  if (options.all || options.qq) {
    config.qq = {
      baseUrl: options.qqUrl || 'http://localhost:5700',
      groupId: options.qqGroup ? parseInt(options.qqGroup) : undefined,
      userId: options.qqUser ? parseInt(options.qqUser) : undefined
    };
  }

  // QQ空间
  if (options.all || options.qqzone) {
    config.qqzone = {
      uin: options.qzoneUin,
      cookie: options.qzoneCookie
    };
  }

  // Telegram
  if (options.all || options.telegram) {
    if (options.telegramFile) {
      config.telegram = { file: options.telegramFile };
    } else if (options.all) {
    } else {
      throw new Error('Telegram 提取需要 --telegram-file（已导出文件）');
    }
  }

  // Discord
  if (options.all || options.discord) {
    if (options.discordFile) {
      config.discord = { file: options.discordFile };
    } else if (options.all) {
    } else {
      throw new Error('Discord 提取需要 --discord-file（已导出文件）');
    }
  }

  // 微博
  if (options.all || options.weibo) {
    if (options.weiboFile) {
      config.weibo = { file: options.weiboFile };
    } else if (options.all) {
    } else {
      throw new Error('微博提取需要 --weibo-file（已导出文件）');
    }
  }

  const data = await extractor.extractAll(config);

  if (!data) {
    console.log('\n提取失败。请检查配置。');
    return;
  }

  // 保存结果
  const outputFile = path.join(options.output, `extracted-data-${Date.now()}.json`);
  fs.mkdirSync(options.output, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`\n╔══════════════════════════════════════╗`);
  console.log('║          提取完成                    ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  消息总数: ${String(data.messages.length).padEnd(26)} ║`);
  console.log(`║  联系人数: ${String(data.contacts.length).padEnd(26)} ║`);
  console.log(`║  输出文件: ${path.basename(outputFile).padEnd(26)} ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log(`\n生成纪念碑:`);
  console.log(`  node src/index.js generate --wechat ${outputFile} --no-burn`);

  extractor.cleanTemp();
}

/**
 * 检查工具和环境状态
 */
async function checkStatus() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║       环境与工具状态检查             ║');
  console.log('╚══════════════════════════════════════╝\n');

  // 1. 微信（内置 WechatDB，不依赖外部工具）
  console.log('【微信】');
  console.log('  ✓ 内置 WechatDB 模块（无需 weflow-cli）');
  console.log('  支持 3.x (PBKDF2-SHA1) 和 4.x (PBKDF2-SHA512) 数据库解密');
  console.log('  用法:');
  console.log('    --wx-db <路径> --wx-key <64位hex> [--wx-4x] [--wx-id <wxid>]');
  console.log('    或从已导出文件: --wechat <path.json>');

  // 2. 飞书
  console.log('\n【飞书】');
  const feishuAppId = process.env.FEISHU_APP_ID;
  const feishuSecret = process.env.FEISHU_APP_SECRET;
  if (feishuAppId && feishuSecret) {
    console.log('  ✓ 飞书 API 凭证已配置 (FEISHU_APP_ID + FEISHU_APP_SECRET)');
  } else {
    console.log('  ✗ 飞书 API 凭证未配置');
    console.log('  方式1: 在 .env 中配置 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
    console.log('  方式2: 从已导出文件加载 (--feishu <path>)');
  }

  // 3. QQ
  console.log('\n【QQ 聊天】');
  console.log('  需要 OneBot HTTP API 客户端运行中（如 NapCat / Lagrange / go-cqhttp）');
  console.log('  默认地址: http://localhost:5700');
  console.log('  用法: --auto-qq --qq-group <群号> 或 --qq-user <QQ号>');
  console.log('  也可从已导出文件加载 (--qq <path>)');

  // 4. QQ空间
  console.log('\n【QQ空间】');
  console.log('  ✓ 内置 QQ空间 HTTP API 提取器（说说 + 日志）');
  console.log('  需要: --qzone-uin <QQ号> --qzone-cookie <浏览器cookie>');
  console.log('  cookie 获取: 浏览器登录 QQ空间 → F12 → Network → 复制 Cookie');

  // 5. Telegram
  console.log('\n【Telegram】');
  console.log('  ✓ 支持 Telegram Desktop 导出的 JSON 格式');
  console.log('  用法: --telegram <path.json>');
  console.log('  导出方式: Telegram Desktop → 设置 → 高级 → 导出聊天记录');

  // 6. Discord
  console.log('\n【Discord】');
  console.log('  ✓ 支持 DiscordChatExporter 导出的 JSON 格式');
  console.log('  用法: --discord <path.json>');
  console.log('  导出方式: 使用 DiscordChatExporter 工具导出');

  // 7. 微博
  console.log('\n【微博】');
  console.log('  ✓ 支持微博导出的 JSON 格式');
  console.log('  用法: --weibo <path.json>');
  console.log('  包含: 微博正文、评论、转发');

  // 8. AI API
  console.log('\n【AI 配置】');
  const currentProvider = process.env.AI_PROVIDER || 'deepseek';
  console.log(`  当前提供商: ${currentProvider}`);
  console.log('');
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const qwenKey = process.env.DASHSCOPE_API_KEY;
  const glmKey = process.env.GLM_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  console.log(`  ${deepseekKey ? '✓' : '✗'} DeepSeek    ${deepseekKey ? '(已配置)' : '(未配置)'}`);
  console.log(`  ${claudeKey ? '✓' : '✗'} Claude      ${claudeKey ? '(已配置)' : '(未配置)'}`);
  console.log(`  ${openaiKey ? '✓' : '✗'} OpenAI      ${openaiKey ? '(已配置)' : '(未配置)'}`);
  console.log(`  ${qwenKey ? '✓' : '✗'} 通义千问     ${qwenKey ? '(已配置)' : '(未配置)'}`);
  console.log(`  ${glmKey ? '✓' : '✗'} 智谱清言     ${glmKey ? '(已配置)' : '(未配置)'}`);
  console.log(`  ${geminiKey ? '✓' : '✗'} Google Gemini ${geminiKey ? '(已配置)' : '(未配置)'}`);
  console.log(`  ✓ Ollama (本地)  地址: ${ollamaUrl}`);
  console.log(`    模型: ${process.env.OLLAMA_MODEL || 'qwen2:7b'}`);
  console.log('    安装: https://ollama.ai/ | 拉取: ollama pull qwen2:7b');

  // 9. 名人数据集
  console.log('\n【名人数据集】');
  listCelebrities();

  // 10. 使用方式
  console.log('\n【使用方式】');
  console.log('  # 从已导出文件生成（多平台）');
  console.log('  node src/index.js generate --wechat <path.json> --telegram <path.json> --weibo <path.json>');
  console.log('');
  console.log('  # 只提取微信（直读数据库）');
  console.log('  node src/index.js generate --auto-wechat \\');
  console.log('    --wx-db <MSG0.db> --wx-key <hex> [--wx-4x]');
  console.log('');
  console.log('  # 提取 QQ空间');
  console.log('  node src/index.js generate --auto-qqzone \\');
  console.log('    --qzone-uin <QQ号> --qzone-cookie <cookie>');
  console.log('');
  console.log('  # 提取 QQ 群消息');
  console.log('  node src/index.js generate --auto-qq --qq-group 123456');
  console.log('');
  console.log('  # 从已导出文件生成');
  console.log('  node src/index.js generate --wechat <path.json>');
  console.log('');
  console.log('  # 从 Telegram 导出文件生成');
  console.log('  node src/index.js generate --telegram <path.json>');
  console.log('');
  console.log('  # 从 Discord 导出文件生成');
  console.log('  node src/index.js generate --discord <path.json>');
  console.log('');
  console.log('  # 从微博导出文件生成');
  console.log('  node src/index.js generate --weibo <path.json>');
  console.log('');
  console.log('  # 使用名人数据集');
  console.log('  node src/index.js generate --celebrity libai');
  console.log('');
  console.log('  # 单独提取（不生成纪念碑）');
  console.log('  node src/index.js export --wx-db <MSG0.db> --wx-key <hex>');
}
