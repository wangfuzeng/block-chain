const hre = require("hardhat");

async function main() {
  const recipient = process.env.RECIPIENT;
  if (!/^0x[0-9a-fA-F]{40}$/.test(recipient || "")) {
    throw new Error("Usage: npx hardhat run scripts/fund-local-account.js --network localhost -- 0xRecipient");
  }

  const [funder] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(recipient);
  console.log("Recipient:", recipient);
  console.log("Balance before:", hre.ethers.formatEther(balance), "ETH");

  if (balance < hre.ethers.parseEther("10")) {
    const transaction = await funder.sendTransaction({
      to: recipient,
      value: hre.ethers.parseEther("1000"),
    });
    await transaction.wait();
    console.log("Funded 1000 ETH, tx:", transaction.hash);
  }

  const newBalance = await hre.ethers.provider.getBalance(recipient);
  console.log("Balance after:", hre.ethers.formatEther(newBalance), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
