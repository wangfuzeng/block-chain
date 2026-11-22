const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting", function () {
  async function deployVoting() {
    const [admin, voter, other] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    await voting.waitForDeployment();

    for (const name of ["Alice", "Bob", "Charlie"]) {
      await (await voting.addCandidate(name)).wait();
    }

    return { voting, admin, voter, other };
  }

  it("starts with three candidates at zero votes", async function () {
    const { voting } = await deployVoting();
    const candidates = await voting.getCandidates();

    expect(candidates.map((item) => item.name)).to.deep.equal([
      "Alice",
      "Bob",
      "Charlie",
    ]);
    expect(candidates.map((item) => item.voteCount)).to.deep.equal([0n, 0n, 0n]);
  });

  it("accepts one vote and rejects a second vote from the same address", async function () {
    const { voting, voter } = await deployVoting();

    await (await voting.connect(voter).vote(1)).wait();
    const candidates = await voting.getCandidates();

    expect(candidates[1].voteCount).to.equal(1n);
    expect(await voting.checkIfVoted(voter.address)).to.equal(true);
    await expect(voting.connect(voter).vote(2)).to.be.revertedWith(
      "You have already voted",
    );
  });

  it("only lets the admin add candidates", async function () {
    const { voting, other } = await deployVoting();

    await expect(
      voting.connect(other).addCandidate("Mallory"),
    ).to.be.revertedWith("Only admin can call this function");
  });

  it("rejects an invalid candidate id", async function () {
    const { voting, voter } = await deployVoting();

    await expect(voting.connect(voter).vote(99)).to.be.revertedWith(
      "Invalid candidate ID",
    );
  });
});
