const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying Voting contract...");
  // 部署合约
  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();
  await voting.waitForDeployment();
  await voting.deploymentTransaction().wait(1);
  const address = await voting.getAddress();
  console.log(`Voting contract deployed to: ${address}`);

  // 添加一些初始候选人
  console.log("Adding initial candidates...");
  for (const name of ["Alice", "Bob", "Charlie"]) {
    const transaction = await voting.addCandidate(name);
    await transaction.wait();
    console.log(`Candidate added: ${name}`);
  }
  console.log("Initial candidates added: Alice, Bob, Charlie");

  // 每次重新部署后自动同步地址和 ABI，避免前端仍在调用旧合约
  const artifact = await hre.artifacts.readArtifact("Voting");
  const configPath = path.resolve(
    __dirname,
    "../../frontend/src/contracts/config.js",
  );
  const configContent = `// 此文件由 blockchain/scripts/deploy.js 自动生成，请勿手动修改。
export const CONTRACT_ADDRESS = "${address}";
export const CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)};
export const HARDHAT_CHAIN_ID = 31337;
export const HARDHAT_CHAIN_ID_HEX = "0x7a69";
export const RPC_URL = "http://127.0.0.1:8545";
export const NETWORK_NAME = "Hardhat Localhost";
`;
  fs.writeFileSync(configPath, configContent, "utf8");

  console.log("Deployment complete!");
  console.log("========================================");
  console.log("Contract address:");
  console.log(address);
  console.log(`Frontend config updated: ${configPath}`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
