import { useEffect, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import "./App.css";
import Header from "./components/Header.jsx";
import CandidateVotes from "./components/CandidateVotes.jsx";
import VoteSection from "./components/VoteSection.jsx";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  HARDHAT_CHAIN_ID,
  HARDHAT_CHAIN_ID_HEX,
  NETWORK_NAME,
  RPC_URL,
} from "./contracts/config.js";

const readProvider = new JsonRpcProvider(RPC_URL);

function getMetaMaskProvider() {
  if (!window.ethereum) return null;

  if (Array.isArray(window.ethereum.providers)) {
    return (
      window.ethereum.providers.find((provider) => provider.isMetaMask) ||
      window.ethereum.providers[0] ||
      null
    );
  }

  return window.ethereum;
}

function getErrorMessage(error) {
  const code = error?.code;
  const message =
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.message ||
    "发生未知错误";

  if (
    code === 4001 ||
    code === "ACTION_REJECTED" ||
    /user rejected/i.test(message)
  ) {
    return "你取消了钱包请求。";
  }
  if (/already voted/i.test(message)) {
    return "当前账户已经投过票了，每个账户只能投一次。";
  }
  if (/invalid candidate/i.test(message)) {
    return "候选人 ID 无效，请刷新页面后重试。";
  }
  if (
    /failed to fetch|ECONNREFUSED|could not detect network|network error/i.test(
      message,
    )
  ) {
    return "无法连接本地区块链。请确认 hardhat node 仍在运行，并检查浏览器钱包是否连接到本地网络。";
  }
  return message;
}

async function switchToHardhatNetwork(ethereum) {
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
    });
  } catch (error) {
    // 4902 表示钱包里还没有这个网络，需要先添加再切换
    if (error?.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: HARDHAT_CHAIN_ID_HEX,
            chainName: NETWORK_NAME,
            nativeCurrency: {
              name: "Ether",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: [RPC_URL],
          },
        ],
      });
      return;
    }
    throw error;
  }
}

async function loadVotingData(voterAddress) {
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
  const [chainCandidates, voted] = await Promise.all([
    contract.getCandidates(),
    voterAddress ? contract.checkIfVoted(voterAddress) : Promise.resolve(false),
  ]);

  return {
    candidates: chainCandidates.map((candidate) => ({
      id: Number(candidate.id),
      name: candidate.name,
      voteCount: Number(candidate.voteCount),
    })),
    hasVoted: Boolean(voted),
  };
}

function App() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [isVoting, setIsVoting] = useState(false);
  const [message, setMessage] = useState(null);

  const isHardhatNetwork = chainId === HARDHAT_CHAIN_ID;

  // 从链上读取候选人和当前账户的投票状态
  useEffect(() => {
    let active = true;

    async function refresh() {
      setLoading(true);
      try {
        const data = await loadVotingData(account);
        if (!active) return;
        setCandidates(data.candidates);
        setHasVoted(data.hasVoted);
        setMessage(null);
      } catch (error) {
        if (!active) return;
        setMessage({ type: "error", text: getErrorMessage(error) });
      } finally {
        if (active) setLoading(false);
      }
    }

    refresh();
    return () => {
      active = false;
    };
  }, [account]);

  // 监听钱包账户和网络变化，并在钱包已授权时恢复登录状态
  useEffect(() => {
    const ethereum = getMetaMaskProvider();
    if (!ethereum) return undefined;

    let active = true;

    async function syncWallet() {
      try {
        const [accounts, currentChainId] = await Promise.all([
          ethereum.request({ method: "eth_accounts" }),
          ethereum.request({ method: "eth_chainId" }),
        ]);
        if (!active) return;
        setAccount(accounts[0] || null);
        setChainId(Number.parseInt(currentChainId, 16));
      } catch (error) {
        if (active) {
          setMessage({ type: "error", text: getErrorMessage(error) });
        }
      }
    }

    const handleAccountsChanged = (accounts) => {
      setAccount(accounts[0] || null);
      setSelectedId("");
    };
    const handleChainChanged = (nextChainId) => {
      setChainId(Number.parseInt(nextChainId, 16));
      setSelectedId("");
    };

    syncWallet();
    ethereum.on?.("accountsChanged", handleAccountsChanged);
    ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      active = false;
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const handleConnectWallet = async () => {
    const ethereum = getMetaMaskProvider();
    if (!ethereum) {
      setMessage({
        type: "error",
        text: "没有检测到 MetaMask。请先安装或启用 MetaMask 浏览器插件。",
      });
      return;
    }

    if (account && isHardhatNetwork) {
      // 尽量真正撤销站点授权；旧版钱包不支持时只清空页面状态
      try {
        await Promise.race([
          ethereum.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }],
          }),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("revoke timeout")), 1200);
          }),
        ]);
      } catch {
        // 部分钱包版本没有该接口，忽略即可
      }
      setAccount(null);
      setSelectedId("");
      setHasVoted(false);
      setMessage(null);
      return;
    }

    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      await switchToHardhatNetwork(ethereum);
      setAccount(accounts[0]);
      setChainId(HARDHAT_CHAIN_ID);
      setMessage(null);
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    }
  };

  const handleVote = async () => {
    if (!account || selectedId === "" || isVoting) return;

    const ethereum = getMetaMaskProvider();
    if (!ethereum) {
      setMessage({ type: "error", text: "MetaMask 不可用，请刷新页面后重试。" });
      return;
    }

    try {
      setIsVoting(true);
      setMessage({ type: "info", text: "请在 MetaMask 中确认投票交易..." });

      if (chainId !== HARDHAT_CHAIN_ID) {
        await switchToHardhatNetwork(ethereum);
        setChainId(HARDHAT_CHAIN_ID);
      }

      // 切换网络后重新获取 signer，确保交易发到本地 Hardhat 链
      const currentChainId = await ethereum.request({ method: "eth_chainId" });
      if (Number.parseInt(currentChainId, 16) !== HARDHAT_CHAIN_ID) {
        throw new Error("请先在 MetaMask 中切换到 Hardhat Localhost 网络。");
      }

      const browserProvider = new BrowserProvider(ethereum);
      const signer = await browserProvider.getSigner();
      const signerAddress = await signer.getAddress();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const transaction = await contract.vote(BigInt(selectedId));

      setMessage({ type: "info", text: "交易已提交，正在等待区块确认..." });
      await transaction.wait();

      const data = await loadVotingData(signerAddress);
      setAccount(signerAddress);
      setCandidates(data.candidates);
      setHasVoted(data.hasVoted);
      setSelectedId("");
      setMessage({ type: "success", text: "投票成功，链上票数已经更新。" });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="voting-card">
      <Header
        account={account}
        networkName={
          isHardhatNetwork ? NETWORK_NAME : "网络不匹配，请切换到 31337"
        }
        networkOk={isHardhatNetwork}
      />
      <CandidateVotes loading={loading} candidates={candidates} />
      {message && (
        <div className={`status-message ${message.type}`} role="status">
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      )}
      <VoteSection
        account={account}
        hasVoted={hasVoted}
        candidates={candidates}
        selectedId={selectedId}
        isVoting={isVoting}
        networkOk={isHardhatNetwork}
        onSelectCandidate={setSelectedId}
        onVote={handleVote}
        onConnectWallet={handleConnectWallet}
      />
    </div>
  );
}

export default App;
