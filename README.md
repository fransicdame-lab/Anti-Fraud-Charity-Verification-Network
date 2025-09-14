# 🛡️ Anti-Fraud Charity Verification Network

Welcome to a decentralized solution for combating fake charities in the Web3 space! This project uses the Stacks blockchain and Clarity smart contracts to verify legitimate charities, flag suspicious wallets, and ensure transparent donations. By leveraging blockchain's immutability, we tackle the real-world problem of scams where fraudulent entities pose as charities to exploit donors, especially in crypto ecosystems where anonymity enables quick exits.

## ✨ Features

🔍 Register and verify charities with multi-step KYC-like processes  
🚩 Flag and blacklist unverified or suspicious wallets  
📊 Track donation flows to prevent misuse  
🏆 Reputation scoring for charities and reporters  
🗳️ Community governance for dispute resolution  
🔒 Immutable audit logs for transparency  
💰 Reward system for accurate fraud reports  
⚠️ Real-time alerts for high-risk interactions  

## 🛠 How It Works

This system is built with 8 interconnected Clarity smart contracts on the Stacks blockchain, ensuring modularity, security, and scalability. Each contract handles a specific aspect of the anti-fraud pipeline, interacting via cross-contract calls for seamless operation.

### Key Smart Contracts

1. **CharityRegistry.clar**: Handles registration of charities. Charities submit details like name, description, and off-chain proof hashes (e.g., legal docs). Emits events for new registrations.
   
2. **VerificationOracle.clar**: Integrates with external oracles (via Stacks' oracle patterns) to verify submitted proofs. Uses multi-signature or community votes to approve/deny verifications.

3. **WalletFlagger.clar**: Allows users to report suspicious wallets. Aggregates reports and applies flags based on thresholds (e.g., 5+ reports trigger a review).

4. **BlacklistManager.clar**: Maintains a dynamic blacklist of flagged wallets. Prevents interactions with blacklisted addresses in linked contracts.

5. **DonationTracker.clar**: Tracks incoming donations to verified charities. Ensures funds are only released to verified entities and logs all transactions immutably.

6. **ReputationSystem.clar**: Calculates reputation scores for charities (based on verification status, donation history) and reporters (based on accurate flags). Uses weighted algorithms to build trust.

7. **GovernanceDAO.clar**: Enables token holders to vote on disputes, such as challenging a flag or verification. Implements quadratic voting for fairness.

8. **RewardDistributor.clar**: Distributes STX or project tokens as rewards to users who successfully report fraud. Funds come from a community pool or small donation fees.

### For Charity Organizers

- Register your charity via `CharityRegistry` with a unique ID, title, description, and proof hash.
- Submit verification details to `VerificationOracle` (e.g., link to legal filings).
- Once verified, receive donations through `DonationTracker`, building your reputation score in `ReputationSystem`.
- Monitor for any flags via `WalletFlagger` and appeal through `GovernanceDAO`.

Your charity is now shielded from fraud associations and gains donor trust!

### For Donors and Reporters

- Check a charity's status using `VerificationOracle` or reputation via `ReputationSystem`.
- Donate securely via `DonationTracker`, which blocks sends to blacklisted wallets managed by `BlacklistManager`.
- Report suspicious activity to `WalletFlagger`—if validated, earn rewards from `RewardDistributor`.
- Participate in governance votes on `GovernanceDAO` to help maintain the system's integrity.

Instant fraud detection and rewards for vigilance!

### For Developers and Auditors

- All actions are logged in an immutable way across contracts, queryable for audits.
- Deploy on Stacks testnet first: Use Clarity's `define-public` functions for interactions.
- Example call: Register a charity with `(contract-call? .CharityRegistry register-charity "My Legit Charity" "Helping the world" (sha256 "proof-doc"))`.
- Verify with `(contract-call? .VerificationOracle verify-charity charity-id true)`.

This setup prevents fake charities by requiring verifiable proofs, community oversight, and automated flagging—reducing scam risks in Web3 philanthropy. Get started by cloning the repo and deploying the contracts!