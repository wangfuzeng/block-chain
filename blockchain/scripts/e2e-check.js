const hre = require("hardhat");
const path = require("path");

async function main() {
  // 请只在可随时重置的本地链上运行，本脚本会真实写入一笔投票
  const configPath = path.resolve(
    __dirname,
    "../../frontend/src/contracts/config.js",
  );
  const config = await import(`file://${configPath.replaceAll("\\", "/")}`);
  const [, voter] = await hre.ethers.getSigners();
  const contract = new hre.ethers.Contract(
    config.CONTRACT_ADDRESS,
    config.CONTRACT_ABI,
    voter,
  );

  const initialCandidates = await contract.getCandidates();
  console.log(
    "Initial:",
    initialCandidates.map((item) => `${item.name}=${item.voteCount}`).join(", "),
  );

  if (!(await contract.checkIfVoted(voter.address))) {
    const transaction = await contract.vote(0n);
    await transaction.wait();
  }

  const [updatedCandidates, hasVoted] = await Promise.all([
    contract.getCandidates(),
    contract.checkIfVoted(voter.address),
  ]);
  const beforeTotal = initialCandidates.reduce(
    (sum, item) => sum + item.voteCount,
    0n,
  );
  const afterTotal = updatedCandidates.reduce(
    (sum, item) => sum + item.voteCount,
    0n,
  );
  if (!hasVoted || afterTotal - beforeTotal > 1n) {
    throw new Error("Vote did not update on-chain state as expected");
  }
  console.log(
    "After vote:",
    updatedCandidates.map((item) => `${item.name}=${item.voteCount}`).join(", "),
  );
  console.log("Voter hasVoted:", hasVoted);

  let duplicateVoteRejected = false;
  try {
    await (await contract.vote(1n)).wait();
  } catch (error) {
    duplicateVoteRejected = /already voted/i.test(
      `${error.shortMessage ?? ""} ${error.message ?? ""}`,
    );
  }
  console.log("Duplicate vote rejected:", duplicateVoteRejected);
  if (!duplicateVoteRejected) {
    throw new Error("Duplicate voting was not rejected");
  }
}

module.exports = { main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
