/// CCTP Wrapper 合约
/// 
/// 目的：为 Petra 钱包提供 entry 函数接口调用 Circle CCTP
/// 
/// Circle CCTP 只提供 public fun，不提供 public entry fun
/// Petra 钱包只能调用 public entry fun
/// 因此需要这个包装合约作为桥梁
/// 
/// 使用流程：
/// 1. 用户在 Base 链燃烧 USDC
/// 2. 获取 Circle 签名
/// 3. 通过 Petra 调用本合约的 receive_usdc
/// 4. 本合约内部调用 Circle CCTP
/// 5. USDC 铸造到指定地址
module cctp_wrapper::wrapper {
    use message_transmitter::message_transmitter;
    use token_messenger_minter::token_messenger;
    
    /// 接收跨链 USDC
    /// 
    /// 注意事项：
    /// - 接收地址必须已注册 USDC (CoinStore<USDC>)
    /// - 如果未注册，交易会失败
    /// - 建议前端在跨链前检查并自动注册
    /// 
    /// @param sender - 交易发起者（Petra 自动注入，用于支付 gas）
    /// @param message - CCTP 跨链消息（248 字节）
    ///                  包含：源链、目标链、金额、接收地址等信息
    /// @param attestation - Circle 签名（130 字节）
    ///                      Circle 验证者对消息的签名
    /// 
    /// 执行流程：
    /// 1. message_transmitter 验证签名和消息
    /// 2. token_messenger 解析消息并铸造 USDC
    /// 3. USDC 自动转入消息中指定的接收地址
    /// 
    /// 权限：
    /// - 任何人都可以调用（帮他人接收 USDC）
    /// - USDC 总是铸造到消息中指定的地址，不是调用者
    /// - sender 只用于支付 gas 费用
    public entry fun receive_usdc(
        sender: &signer,
        message: vector<u8>,
        attestation: vector<u8>
    ) {
        // 步骤 1: 调用 CCTP 的 message_transmitter 验证消息
        // 这会：
        // - 验证 Circle 签名是否有效
        // - 验证消息格式是否正确
        // - 检查 nonce 是否已使用（防重放）
        // - 验证源链和目标链信息
        // - 返回 Receipt 对象
        let receipt = message_transmitter::receive_message(
            sender,      // 交易发起者 signer
            &message,    // 引用传递
            &attestation // 引用传递
        );
        
        // 步骤 2: 调用 CCTP 的 token_messenger 处理 USDC 铸造
        // 这会：
        // - 从 Receipt 中解析接收地址和金额
        // - 调用 USDC 合约的 mint 函数
        // - 将 USDC 转入接收地址
        // 
        // 注意：如果接收地址没有 CoinStore<USDC>，这里会失败
        token_messenger::handle_receive_message(receipt);
    }
    
    /// 获取合约版本（可选，用于验证部署）
    /// 
    /// 这是一个 view 函数，可以免费查询
    /// 用于验证合约是否正确部署
    #[view]
    public fun get_version(): u64 {
        1
    }
}

