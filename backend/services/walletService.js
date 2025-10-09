const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class WalletService {
  constructor() {
    this.walletsDir = path.join(__dirname, '../data/wallets');
    this._ensureWalletsDirectory();
  }

  async _ensureWalletsDirectory() {
    try {
      await fs.mkdir(this.walletsDir, { recursive: true });
    } catch (error) {
      logger.error('Ошибка создания директории кошельков', error);
    }
  }

  _getWalletPath(userId) {
    return path.join(this.walletsDir, `${userId}.json`);
  }

  async _loadWallet(userId) {
    const filePath = this._getWalletPath(userId);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Новый кошелек с нулевым балансом
        return { 
          balance: 0, 
          currency: 'RUB', 
          lastUpdated: new Date().toISOString(), 
          transactions: []
        };
      }
      throw err;
    }
  }

  async _saveWallet(userId, wallet) {
    const filePath = this._getWalletPath(userId);
    wallet.lastUpdated = new Date().toISOString();
    await fs.writeFile(filePath, JSON.stringify(wallet, null, 2), 'utf8');
  }

  async getBalance(userId) {
    const wallet = await this._loadWallet(userId);
    return { amount: wallet.balance, currency: wallet.currency, lastUpdated: wallet.lastUpdated };
  }

  async deposit(userId, amount, method) {
    const wallet = await this._loadWallet(userId);
    const tx = {
      id: `dep_${Date.now()}`,
      type: 'deposit',
      amount: Number(amount),
      paymentMethod: method || 'card',
      status: 'completed',
      timestamp: new Date().toISOString(),
      description: 'Пополнение кошелька'
    };
    wallet.balance += Number(amount);
    wallet.transactions.unshift(tx);
    await this._saveWallet(userId, wallet);
    logger.info('Депозит выполнен', { userId, amount });
    return tx;
  }

  async withdraw(userId, amount, walletAddress) {
    const wallet = await this._loadWallet(userId);
    if (wallet.balance < amount) {
      throw new Error('Недостаточно средств для вывода');
    }
    const tx = {
      id: `wdr_${Date.now()}`,
      type: 'withdrawal',
      amount: -Number(amount),
      walletAddress,
      status: 'pending',
      timestamp: new Date().toISOString(),
      description: 'Вывод средств'
    };
    wallet.balance -= Number(amount);
    wallet.transactions.unshift(tx);
    await this._saveWallet(userId, wallet);
    logger.info('Запрос на вывод средств', { userId, amount, walletAddress });
    return tx;
  }

  async getTransactions(userId, limit = 10, offset = 0) {
    const wallet = await this._loadWallet(userId);
    const total = wallet.transactions.length;
    const txs = wallet.transactions.slice(offset, offset + limit);
    return { transactions: txs, total };
  }
}

module.exports = new WalletService();
