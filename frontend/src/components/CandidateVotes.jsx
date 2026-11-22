import "./CandidateVotes.css";


function CandidateVotes({ loading, candidates = [] }) {
  return (
    <div className="votes-section">
      <div className="section-label">当前投票</div>

      {loading ? (
        <div className="loading-box">
          <div className="spinner"></div>
          <div className="loading-text">加载数据中...</div>
        </div>
      ) : (
        <div className="candidate-list">
          {candidates.length === 0 ? (
            <div className="empty-state">暂无候选人，请确认合约已部署。</div>
          ) : (
            candidates.map((candidate) => (
              <div key={candidate.id} className="candidate-item">
                <span className="candidate-name">{candidate.name}</span>
                <span className="candidate-count">
                  {candidate.voteCount} 票
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default CandidateVotes;
