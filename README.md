# Decentralised Engineering Surveying Information Management System (ESIMS) based on Hybrid Blockchain

## Overview
This project is a prototype implementation of a decentralised Engineering Surveying Information Management System (ESIMS) leveraging hybrid blockchain technology. The system enhances the security, transparency, and trustworthiness of engineering survey data management by combining a private permissioned blockchain with a public blockchain audit trail. It is optimized for use in low-resource environments, such as rural areas in Zimbabwe, where network infrastructure is limited.

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
- **Dashboard Overview:** Summary of submitted surveys, pending verifications, and notifications.
- **Submit Survey Data:** Upload processed survey files with blockchain transaction submission.
- **My Submissions:** Status tracking of submitted survey data.
- **Transaction Details:** View blockchain transaction records.
- **Profile Settings:** Update personal information and preferences.

### Project Manager
- **Dashboard Overview:** Project progress, pending verifications, and recent activity.
- **Survey Data Verification:** Review and approve survey data submissions.
- **Project Transactions Log:** Access detailed blockchain transactions per project.
- **User Management:** Assign roles and manage project users.
- **Reports & Analytics:** Generate reports and charts on project performance.
- **Profile Settings:** Personal details and security settings.

### Client/Stakeholder
- **Dashboard Overview:** Project status, key milestones, and notifications.
- **View Survey Results:** Download approved survey data and reports.
- **Audit Trail:** Read-only access to blockchain transaction proofs.
- **Project Timeline:** Visual timeline of project milestones.
- **Profile Settings:** Manage personal preferences.

### System Administrator
- **Admin Dashboard Overview:** System health, alerts, and metrics.
- **User Accounts Management:** Control user registration, roles, and permissions.
- **Smart Contract Management:** Define and update Solidity blockchain automation rules.
- **Blockchain Node Monitoring:** Real-time status of blockchain nodes.
- **System Logs & Audit:** View activity and security logs.
- **Settings & Configuration:** Manage system-wide settings and integrations.
- **Profile Settings:** Administrator profile management.

---

## Technologies
- Backend: Python Django
- Frontend: React.js
- Private Blockchain: Proof of Authority (PoA) network
- Public Blockchain: Ethereum testnet (for anchoring)
- Smart Contracts: Developed in Solidity
- Off-chain Storage: IPFS

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
