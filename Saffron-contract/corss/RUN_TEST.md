# 运行 test-cctp-flow.ts 指南

## 快速开始

### 1️⃣ 安装依赖
```bash
cd /home/su/dome/move/all/Saffron-contract/corss
npm install
```

### 2️⃣ 配置环境变量
```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件，填入你的私钥和地址
nano .env
```

需要配置的环境变量：
- `BASE_PRIVATE_KEY`: 你的 Base Sepolia 测试网私钥
- `APTOS_PRIVATE_KEY`: 你的 Aptos Testnet 私钥
- `APTOS_RECIPIENT`: 你的 Aptos 钱包地址（64位十六进制）
- `BASE_RPC_URL`: Base Sepolia RPC 地址（默认：https://sepolia.base.org）

### 3️⃣ 运行测试
```bash
# 方式 1：使用 ts-node 直接运行（推荐）
npx ts-node examples/test-cctp-flow.ts

# 方式 2：先编译再运行
npm run build
node dist/examples/test-cctp-flow.js
```

## 测试流程

脚本会自动执行以下步骤：

1. **初始化服务** - 连接 Base 和 Aptos 链
2. **在 Base 链燃烧 USDC** - 发送跨链交易
3. **等待 Circle 签名** - 通常需要 1-3 分钟
4. **在 Aptos 链接收 USDC** - 铸造 USDC 到 Aptos

## 前置要求

### Base Sepolia 测试网
- ✅ 账户有足够的 ETH（用于 gas 费）
- ✅ 账户有至少 3 USDC（脚本默认转账 3 USDC）

**获取测试 USDC：**
```bash
# Base Sepolia Faucet
https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

# 或者在 Base Sepolia 区块链浏览器铸造测试 USDC
# USDC 合约: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### Aptos Testnet
- ✅ 账户已初始化
- ✅ 账户有少量 APT（用于 gas 费）

**获取测试 APT：**
```bash
aptos account fund-with-faucet --account YOUR_ADDRESS
```

## 预期输出

```
🚀 Base -> Aptos CCTP cross-chain test started

============================================================

📋 Step 1/4: Initializing services...
✅ Services initialization completed
  Base chain address: 0x...
  Aptos recipient address: 0x...
  Cross-chain amount: 3.0 USDC

💸 Step 2/4: Burning USDC on Base chain...
  Current USDC balance: 10.0
✅ Base chain transaction successful
  Transaction hash: 0x...
  Nonce: ...
  Message length: ...

🔐 Step 3/4: Waiting for Circle signature...
  ⏳ This usually takes 1-3 minutes, please be patient...
✅ Circle signature obtained successfully
  Message hash: 0x...
  Message length: ...
  Signature length: ...

🎁 Step 4/4: Receiving USDC on Aptos chain...
  Balance before receiving: 0
✅ Aptos chain receive successful
  Transaction hash: 0x...
  Received amount: 3000000
  Balance after receiving: 3000000
```

## 常见问题

### ❌ Missing BASE_PRIVATE_KEY environment variable
**解决方案：** 确保已创建 `.env` 文件并配置了所有必需的环境变量

### ❌ Insufficient balance
**解决方案：** 
- Base 链：使用 Base Sepolia 水龙头获取 ETH 和 USDC
- Aptos 链：使用 `aptos account fund-with-faucet` 获取 APT

### ❌ Invalid Aptos address format
**解决方案：** Aptos 地址必须是 64 位十六进制（以 0x 开头，共 66 个字符）

### ❌ Getting attestation timeout
**解决方案：** Circle 签名服务偶尔会延迟，请重试或检查网络连接

## 调试模式

如果需要查看详细日志：
```bash
DEBUG=* npx ts-node examples/test-cctp-flow.ts
```

## 修改转账金额

编辑 `examples/test-cctp-flow.ts` 文件的第 19 行：
```typescript
const USDC_AMOUNT = '3.0';  // 修改为你想要的金额
```

## 获取帮助

- 查看 Circle CCTP 文档: https://developers.circle.com/stablecoins/docs/cctp-getting-started
- 查看 Base 文档: https://docs.base.org/
- 查看 Aptos 文档: https://aptos.dev/

