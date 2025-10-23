# Decentralised Engineering Surveying Information Management System (ESIMS) based on Hybrid Blockchain

## Overview
This project is a prototype implementation of a decentralised Engineering Surveying Information Management System (ESIMS) leveraging hybrid blockchain technology. The system enhances the security, transparency, and trustworthiness of engineering survey data management by combining a private permissioned blockchain with a public blockchain audit trail. It is optimized for use in low-resource environments, such as rural areas in Zimbabwe, where network infrastructure is limited.

### Project Status
- Documentation and planning in progress. Code scaffolding is the next step.
- Current repository contains `README.md`. Upcoming top-level: `backend/` and `frontend/` only. All other components (e.g., smart contracts, Docker configs, docs) will live inside these folders.

### Repository Structure (planned)
```text
esims/
  backend/    # Django + DRF API (includes Django apps, smart contracts, Docker configs, docs)
  frontend/   # React app (UI)
  README.md
```

### Table of Contents
- [Features](#features)
- [User Roles and Dashboards](#user-roles-and-dashboards)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Data Model](#data-model)
- [Smart Contracts](#smart-contracts)
- [Django Apps](#django-apps)
- [Installation & Setup](#installation--setup)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security & Compliance](#security--compliance)
- [Roadmap](#roadmap)
- [Usage](#usage)
- [Contribution](#contribution)
- [License](#license)
- [Contact](#contact)

---

## Features
- **Hybrid Blockchain Architecture:** Combines a private Proof of Authority (PoA) blockchain for data confidentiality with a public blockchain for immutable transaction anchoring.
- **Secure and Transparent Data Management:** Immutable recording of survey data transactions with cryptographic audit trails.
- **Role-Based Access Control:** Supports multiple stakeholder roles including surveyors, project managers, clients, and administrators with fine-grained permissions.
- **Smart Contract Automation:** Developed in **Solidity**, smart contracts ensure data validity, automate approval workflows, and enforce business rules on the blockchain.
- **Off-Chain Storage Integration:** Utilizes IPFS for large file storage while ensuring data integrity through blockchain references.
- **Optimal for Low-Bandwidth Conditions:** Designed for reliable operation under constrained network environments (1-5 Mbps).
- **Web-Based Interface:** Intuitive React.js frontend for easy access and interaction with survey data.

---

## User Roles and Dashboards

### Surveyor
- Responsibilities
  - Responsible for collecting and uploading engineering survey data.
  - Can view and track their submitted survey transactions.
- Dashboard Pages
  - Dashboard Overview: Summary of submitted surveys, pending verifications, and notifications.
  - Submit Survey Data: Upload page for processed survey files and metadata with blockchain transaction submission.
  - My Submissions: List and status tracking of all submitted survey data by the surveyor.
  - Transaction Details: Detailed view of blockchain transaction records for each submission.
  - Profile Settings: Personal information, password management, notification preferences.

### Project Manager
- Responsibilities
  - Oversees survey projects, verifies and approves submitted survey data.
  - Accesses transaction logs and audit trails for monitoring.
  - Manages user roles within assigned projects.
- Dashboard Pages
  - Dashboard Overview: Project progress, pending verifications, recent activity feed.
  - Survey Data Verification: Interface for reviewing, verifying, and approving survey data submissions.
  - Project Transactions Log: Detailed blockchain transaction records filtered by project.
  - User Management: Manage and assign roles to users within the manager’s projects.
  - Reports & Analytics: Generate summary reports and charts on survey project performance.
  - Profile Settings: Personal details and security settings.

### Client/Stakeholder
- Responsibilities
  - Views project progress, survey data results, and audit information.
  - Has read-only access to archived survey information and transaction history.
- Dashboard Pages
  - Dashboard Overview: Project status summaries, key milestones, and notifications.
  - View Survey Results: Access and download approved survey data and reports.
  - Audit Trail: Read-only access to blockchain transaction proofs and historical logs.
  - Project Timeline: Visual timeline of survey milestones and critical events.
  - Profile Settings: Manage personal information and notification preferences.

### System Administrator
- Responsibilities
  - Manages system settings, user accounts, and access permissions.
  - Responsible for smart contract rules management and blockchain node oversight.
  - Oversees system health, security, and data integrity.
- Dashboard Pages
  - Admin Dashboard Overview: System health status, alerts, and key metrics.
  - User Accounts Management: Full control over user registration, roles, permissions, and account status.
  - Smart Contract Management: Define, update and monitor blockchain smart contract automation rules.
  - Blockchain Node Monitoring: Real-time status and logs of blockchain nodes.
  - System Logs & Audit: Comprehensive system activity and security logs.
  - Settings & Configuration: Global system settings, integrations, backups.
  - Profile Settings: Administrator personal profile and security options.

## Architecture
- Private PoA chain for confidential operations; periodic anchors on Ethereum testnet for public auditability.
- Off-chain storage via IPFS; on-chain state stores CIDs and minimal metadata.
- Django REST API mediates Web3 interactions; React consumes API.

Flow:
1. Upload file to IPFS -> get CID
2. Write metadata and CID to private chain (Solidity contract)
3. Batch-anchor summary hash to Ethereum testnet for immutability
4. Verify via combined proofs from chains and IPFS

---

## Technologies
- Backend: Python Django
- Frontend: React.js
- Private Blockchain: Proof of Authority (PoA) network
- Public Blockchain: Ethereum testnet (for anchoring)
- Smart Contracts: Developed in Solidity
- Off-chain Storage: IPFS

## Environment Variables
Create a .env file (or use .env.example when scaffolded) with the following keys:
- DJANGO_SECRET_KEY=
- DATABASE_URL=                        # optional (PostgreSQL for staging/prod)
- WEB3_POA_RPC_URL=
- ETHEREUM_PUBLIC_RPC_URL=             # e.g., Infura/Alchemy
- CONTRACT_ADDRESS_PRIVATE=
- CONTRACT_ADDRESS_PUBLIC=             # optional
- IPFS_API_URL=                        # e.g., http://127.0.0.1:5001
- IPFS_GATEWAY_URL=                    # e.g., http://127.0.0.1:8080/ipfs
- JWT_SECRET=                          # planned

## API Overview
Base URL: `/api` (to be defined during backend scaffold).

Authentication: Bearer token via `Authorization: Bearer <JWT>` header (planned).

Endpoints (planned):
- `POST /api/auth/register` – Create a new user
- `POST /api/auth/login` – Obtain JWT
- `GET /api/surveys` – List surveys (role-filtered)
- `POST /api/surveys` – Submit survey with metadata and IPFS CID
- `GET /api/surveys/{id}` – Retrieve survey details and proofs
- `POST /api/surveys/{id}/approve` – Approve survey (PM/Admin)
- `GET /api/projects` – List projects
- `POST /api/projects` – Create project (PM/Admin)
- `GET /api/blockchain/tx/{hash}` – Fetch on-chain transaction receipt
- `GET /api/ipfs/{cid}` – Resolve/download via configured gateway

Example response:
```json
{
  "id": 123,
  "project_id": 45,
  "title": "Control Network Survey - Ward 7",
  "status": "submitted",
  "ipfs_cid": "bafybeigdyr...",
  "checksum_sha256": "9d377b...",
  "private_tx_hash": "0xabc...",
  "public_anchor_tx_hash": null,
  "submitted_by": 7,
  "created_at": "2025-10-19T21:00:00Z"
}
```

## Data Model
- `User`
  - `id`, `email`, `password_hash`, `role` (surveyor | manager | client | admin), `is_active`, timestamps
- `Project`
  - `id`, `name`, `description`, `owner_id`, timestamps
- `Survey`
  - `id`, `project_id`, `title`, `description`, `ipfs_cid`, `checksum_sha256`, `status` (submitted | approved | rejected), `submitted_by`, timestamps
- `Transaction`
  - `id`, `survey_id`, `private_tx_hash`, `public_anchor_tx_hash`, `anchor_batch_id`, `private_block_number`, `public_block_number`, timestamps

## Smart Contracts
Two contract layers are planned:

1) Private chain – `SurveyRegistry`
   - Stores minimal metadata hash (e.g., CID digest) and submitter address
   - Emits events on submission and approval
   - Role-restricted approval (OpenZeppelin `AccessControl`)

   Solidity interface (sketch):
   ```solidity
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.20;
   import "@openzeppelin/contracts/access/AccessControl.sol";

   contract SurveyRegistry is AccessControl {
       bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");

       struct SurveyMeta {
           bytes32 cidHash;      // keccak256(CID)
           address submitter;
           uint256 submittedAt;
           bool approved;
       }

       mapping(bytes32 => SurveyMeta) public surveys; // key: keccak256(surveyId)

       event SurveySubmitted(bytes32 indexed surveyKey, bytes32 cidHash, address submitter);
       event SurveyApproved(bytes32 indexed surveyKey, address approver);

       function submit(bytes32 surveyKey, bytes32 cidHash) external {
           require(surveys[surveyKey].submittedAt == 0, "exists");
           surveys[surveyKey] = SurveyMeta(cidHash, msg.sender, block.timestamp, false);
           emit SurveySubmitted(surveyKey, cidHash, msg.sender);
       }

       function approve(bytes32 surveyKey) external onlyRole(APPROVER_ROLE) {
           require(surveys[surveyKey].submittedAt != 0, "missing");
           surveys[surveyKey].approved = true;
           emit SurveyApproved(surveyKey, msg.sender);
       }
   }
   ```

2) Public chain – `AnchorRegistry`
   - Stores periodic batch roots of private-chain activity for public audit
   - Returns an `anchorId` and emits events for external verification

## Django Apps

### Role-Based Apps
- `surveyors`: Manages surveyor-specific features like survey data submission, history, and profile management.
- `managers`: Supports project managers in verifying survey data, managing project users, generating reports, etc.
- `clients`: Provides client functionalities for viewing project status, survey results, and audit trails.
- `administration`: Handles system admin tasks such as user management, smart contract configurations, node monitoring, and logs.

### Core Domain Apps
- `users`: Centralizes user authentication, role assignments, permissions, and profile data.
- `surveys`: Contains core survey data models, file references, and metadata.
- `projects`: Manages survey projects, assignments, and progress tracking.
- `transactions`: Records blockchain transactions, audit trail data, and verification status.
- `smartcontracts`: Manages smart contract deployment, interaction, and rule automation.
- `notifications`: Sends alerts and notifications relevant to all user roles.

---

## Installation & Setup
  
  ### Prerequisites
  - Node.js and npm
  - Python 3.x
  - Docker (for blockchain nodes deployment)
  - IPFS daemon installed and running
  - Ethereum testnet node or access provider (e.g., Infura)

### Backend Setup
1. Clone the repository  
2. Navigate to the backend folder  
3. Create and activate a Python virtual environment  
4. Install dependencies using `pip install -r requirements.txt`  
5. Configure blockchain node URLs and IPFS settings in the config file  
6. Run the Django server with `python manage.py runserver`

### Frontend Setup
1. Navigate to the frontend folder  
2. Install dependencies with `npm install`  
3. Start the React development server with `npm start`

### Blockchain Nodes
Deploy private blockchain nodes using Docker-compose scripts provided or manually configure PoA nodes as described in the documentation.

## Testing
- Backend
  - Django tests: `python manage.py test` (or `pytest` if configured)
  - Coverage: `coverage run -m pytest && coverage report`
- Frontend
  - Unit/UI tests with Jest + React Testing Library: `npm test`
- Smart Contracts
  - Hardhat tests: `npx hardhat test` (from `backend/smartcontracts/` when scaffolded)
- Linting & Formatting
  - Python: `flake8`, `black`
  - JS/TS: `eslint`, `prettier`

---

## Deployment
- Environments: `dev` (local), `staging` (Dockerized), `prod` (Docker/Kubernetes)
- Backend
  - Apply migrations: `python manage.py migrate`
  - Static files: `python manage.py collectstatic --noinput`
  - WSGI server: `gunicorn config.wsgi:application`
- Frontend
  - Build: `npm run build`
  - Serve with a reverse proxy (e.g., Nginx) or CDN
- Blockchain & IPFS
  - Private PoA (Geth Clique) via Docker; validate genesis and signer set
  - Public Ethereum RPC via provider (Infura/Alchemy) for anchoring
  - IPFS (Kubo) via local daemon or Docker; configure API and gateway URLs
- Configuration & Secrets
  - Use `.env`/secrets manager (e.g., Vault, AWS SSM) and never commit secrets
  - Set `ALLOWED_HOSTS`, HTTPS, and secure cookies in production

---

## Security & Compliance
- Role-based access control (RBAC) and least-privilege permissions
- JWT-based authentication with short-lived tokens and refresh flows
- Input validation and file scanning for uploads; checksum verification
- Rate limiting and CSRF protection where applicable
- Audit logging for critical actions and on-chain interactions
- Key management for blockchain accounts; avoid raw private keys in code/env
- Transport security (HTTPS/TLS) and secure IPFS gateway usage
- Data privacy and retention policies for survey artifacts and metadata

---

## Roadmap
- Scaffold backend (Django + DRF) and frontend (React)
- Add Solidity contracts and deployment scripts
- Dockerize IPFS and PoA (Geth Clique)
- Integrate Web3 and IPFS end-to-end
- Implement RBAC, JWT auth, and audit logging
- Add CI/CD and automated tests

---

## Usage
- Register user accounts with role assignments.
- Upload processed engineering survey data for blockchain recording.
- Verify and approve transactions using the dashboard.
- Track audit trail and anchored transaction proofs via the system interface.
- Retrieve and download archived survey data anytime securely.

---

## Contribution
Contributions are welcome! Please fork the repository and submit pull requests for improvements, bug fixes, or new features.

---

## License
This project is licensed under the MIT License.

---

## Contact
For further information or questions, please contact Consolation Mangena at [consolationmangena@gmail.com].
