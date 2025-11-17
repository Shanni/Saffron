#!/usr/bin/env tsx

/**
 * 生成 CCTP 后端中继账户
 * 
 * 用途: 生成一个 Aptos 账户，用于后端提交 CCTP Script 交易
 * 
 * 运行: npx tsx scripts/generate-relay-account.ts
 */

import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import * as fs from 'fs';
import * as path from 'path';

function generateRelayAccount() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     CCTP 后端中继账户生成器                             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  // 生成新账户
  const account = Account.generate();
  
  console.log('✅ 账户生成成功！');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 账户信息:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🔑 私钥 (Private Key):');
  console.log(`   ${account.privateKey.toString()}`);
  console.log('');
  console.log('📍 地址 (Address):');
  console.log(`   ${account.accountAddress.toString()}`);
  console.log('');
  console.log('🔐 公钥 (Public Key):');
  console.log(`   ${account.publicKey.toString()}`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 保存到文件
  const accountData = {
    privateKey: account.privateKey.toString(),
    address: account.accountAddress.toString(),
    publicKey: account.publicKey.toString(),
    generatedAt: new Date().toISOString(),
    network: 'testnet',
    purpose: 'CCTP Backend Relay Account',
  };

  const outputDir = path.join(__dirname, '../.relay-accounts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `relay-account-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(accountData, null, 2));

  console.log('');
  console.log('💾 账户信息已保存到:');
  console.log(`   ${filepath}`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 下一步操作:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('1️⃣  给中继账户充值测试 APT (用于支付 gas):');
  console.log('');
  console.log('    访问: https://aptoslabs.com/testnet-faucet');
  console.log(`    输入地址: ${account.accountAddress.toString()}`);
  console.log('    获取测试币');
  console.log('');
  console.log('2️⃣  将私钥添加到后端环境变量:');
  console.log('');
  console.log('    # Saffron-backend/.env');
  console.log(`    RELAY_PRIVATE_KEY=${account.privateKey.toString()}`);
  console.log('');
  console.log('3️⃣  启动后端服务:');
  console.log('');
  console.log('    cd Saffron-backend');
  console.log('    npm run dev');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  安全提示:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('⚠️  这是后端中继账户的私钥，请妥善保管！');
  console.log('⚠️  不要将私钥提交到 Git 仓库');
  console.log('⚠️  不要与他人分享私钥');
  console.log('⚠️  生产环境建议使用密钥管理服务 (AWS Secrets Manager 等)');
  console.log('⚠️  定期监控账户余额，确保有足够 APT 支付 gas');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ℹ️  说明:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('这个账户只用于提交 CCTP Script 交易，不持有用户资产。');
  console.log('用户的 USDC 会直接铸造到用户自己的 Aptos 地址。');
  console.log('中继账户只负责支付 gas 费用（约 0.0001 APT/笔）。');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

// 运行
generateRelayAccount();

