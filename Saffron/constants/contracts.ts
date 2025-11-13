/**
 * 区块链合约地址配置
 */

/**
 * Aptos 测试网合约配置
 */
export const APTOS_TESTNET_CONTRACTS = {
  // Circle CCTP 官方合约（已部署，固定地址）
  messageTransmitter: '0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9',
  tokenMessenger: '0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9',
  usdc: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832',
  
  // 🎉 CCTP 包装合约（已部署成功！）
  // 部署交易: https://explorer.aptoslabs.com/txn/0x64edcd13a9b8367a3474563c3b620260aceef57dccc1971225c933bdfad32848?network=testnet
  cctpWrapper: '0x96feac302e3b9c0cb53890aa2b5d4e3c1d23625fe621f05d8aa736d620627ffc',
};

/**
 * Base Sepolia 测试网合约配置
 */
export const BASE_SEPOLIA_CONTRACTS = {
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
};

/**
 * Circle 服务配置
 */
export const CIRCLE_CONFIG = {
  attestationApiUrl: 'https://iris-api-sandbox.circle.com',
};

