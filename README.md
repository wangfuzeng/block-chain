# 区块链投票系统

Solidity + Hardhat + React + ethers v6 + MetaMask 的本地投票 DApp。

## 启动

### 1. 启动本地链

```powershell
cd blockchain
npx hardhat clean
npx hardhat compile
npx hardhat node
```

该命令会持续运行，并输出 20 个测试账户及其私钥（仅限本地使用）。

### 2. 部署合约

新开一个终端：

```powershell
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

部署脚本会自动：

- 部署 `Voting` 合约；
- 添加 Alice、Bob、Charlie 三位候选人；
- 把合约地址和 ABI 写入 `frontend/src/contracts/config.js`。

### 3. 启动前端

```powershell
cd frontend
npm run dev
```

打开 http://127.0.0.1:5173/ 。

### 4. 配置 MetaMask

在 MetaMask 中手动添加网络：

- 网络名称：`Hardhat Localhost`
- RPC URL：`http://127.0.0.1:8545`
- Chain ID：`31337`
- 货币符号：`ETH`

然后导入一个 Hardhat 节点输出的测试账户私钥。页面上的“连接 MetaMask 钱包”也会自动提示切换或添加该网络。

### 5. 投票

先在 MetaMask 里连接站点，再点页面上的“连接 MetaMask 钱包”，选择候选人并确认投票。交易确认后，票数会从链上重新读取。

## 验证

```powershell
cd blockchain
npx hardhat test
```

测试会校验：初始票数、投票后票数加一、防重复投票、管理员权限和无效候选人。

`npx hardhat run scripts/e2e-check.js --network localhost` 会真实写入一笔投票，只适合在可随时重置的本地链上运行；它会校验前端配置的地址和 ABI 确实指向当前链上的合约。

每次重启 `npx hardhat node` 都会清空链上状态，需要重新执行部署命令。
