import "./VoteSection.css";


function VoteSection({
  account,
  hasVoted,
  candidates = [],
  selectedId,
  isVoting,
  networkOk,
  onSelectCandidate,
  onVote,
  onConnectWallet,
}) {
  const isConnected = Boolean(account);
  // 计算投票按钮文案与是否被禁用
  let buttonText = "确认投票";
  let isDisabled = false;

  if (!isConnected || !networkOk) {
    buttonText = isConnected ? "请切换到本地网络" : "连接钱包";
    isDisabled = true;
  } else if (hasVoted) {
    buttonText = "已投票";
    isDisabled = true;
  } else if (isVoting) {
    buttonText = "等待链上确认...";
    isDisabled = true;
  } else if (selectedId === "") {
    buttonText = "请选择候选人";
    isDisabled = true;
  }

  return (
    <div className="vote-section">
      <div className="section-label">我要投票</div>
      <select
        className="candidate-select"
        value={selectedId}
        disabled={!isConnected || !networkOk || hasVoted || isVoting}
        onChange={(e) => onSelectCandidate(e.target.value)}
      >
        <option value="">选择候选人...</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        className={`vote-btn ${isDisabled ? "disabled" : "active"}`}
        disabled={isDisabled}
        onClick={onVote}
      >
        {buttonText}
      </button>
      <button
        className="connect-wallet-btn"
        onClick={onConnectWallet}
        disabled={isVoting}
      >
        {isConnected && networkOk ? "断开钱包连接" : "连接 MetaMask 钱包"}
      </button>
    </div>
  );
}

export default VoteSection;
