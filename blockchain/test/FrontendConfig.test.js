const path = require("path");
const fs = require("fs");
const { expect } = require("chai");

describe("Frontend contract configuration", function () {
  it("contains the deployed address, chain id and ABI", async function () {
    const configPath = path.resolve(
      __dirname,
      "../../frontend/src/contracts/config.js",
    );
    const source = fs.readFileSync(configPath, "utf8");
    const address = source.match(/CONTRACT_ADDRESS = "([^"]+)"/)?.[1];
    const chainId = source.match(/HARDHAT_CHAIN_ID = (\d+)/)?.[1];
    const abiStart = source.indexOf("[");
    const abiEnd = source.indexOf("];", abiStart);
    const abi = JSON.parse(source.slice(abiStart, abiEnd + 1));

    const artifact = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../artifacts/contracts/Voting.sol/Voting.json",
        ),
        "utf8",
      ),
    );
    expect(address).to.match(/^0x[0-9a-fA-F]{40}$/);
    expect(abi).to.deep.equal(artifact.abi);
    expect(chainId).to.equal("31337");
    expect(abi.some((item) => item.name === "getCandidates")).to.equal(true);
    expect(abi.some((item) => item.name === "vote")).to.equal(true);
    expect(abi.some((item) => item.name === "checkIfVoted")).to.equal(true);
  });
});
