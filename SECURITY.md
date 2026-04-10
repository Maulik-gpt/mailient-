# Mailient Security Policy: Vault-Grade Standard

At Mailient, security isn't just a feature—it's the core of our architecture. We operate on a **Zero-Knowledge** model, ensuring that your data remains your own, accessible only by you.

## The Vault-Grade Standard

### 1. Zero-Knowledge Architecture
We implement localized, decentralized encryption. Sensitive data is protected by AES-256 encryption at the browser level *before* it reaches our servers. Mailient does not store your decryption keys.

### 2. Enterprise Authentication (OAuth 2.0)
Mailient connects directly to your Google Workspace via enterprise-grade OAuth 2.0. We never see, touch, or store your passwords. Your login remains isolated within Google's secure environment.

### 3. Cryptographic Perimeter (CSP)
Our platform is protected by a strict **Content Security Policy (CSP)**. We block unauthorized script execution and cross-site scripting (XSS) at the browser level, ensuring a clean, manipulative-free work environment.

### 4. Data Volatility
We prioritize "short-term memory" for your data. Drafts and temporary processing metadata are stored in isolated memory and purged regularly.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x (Current) | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability, please report it immediately to our security team:

- **Email**: security@mailient.xyz
- **Twitter/X**: @Maulik_055 (Founder)

Please provide a detailed report including steps to reproduce the issue. We aim to acknowledge all reports within 24 hours.
