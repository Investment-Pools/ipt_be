// SPDX-License-Identifier: Apache-2.0
// src/workers/withdraw-queue-worker.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WithdrawRequest, WithdrawRequestStatus, WithdrawBlockchainStatus } from '../entities/withdraw-request.entity';
import { RefiIptBlockchain, QueueItem } from '../lib/refi-ipt-blockchain';
import { BN } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WithdrawQueueWorker {
  private readonly logger = new Logger(WithdrawQueueWorker.name);
  private refiIptBlockchain: RefiIptBlockchain;

  constructor(
    @InjectRepository(WithdrawRequest)
    private withdrawRequestRepository: Repository<WithdrawRequest>,
    private configService: ConfigService,
  ) {
    this.refiIptBlockchain = new RefiIptBlockchain(this.configService);
  }

  // @Cron('*/10 * * * * *') 
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    this.logger.log('🔄 WithdrawQueueWorker: Starting cron job...');
    await this.runExecutor(null);
  }

  public async runExecutor(_data: any): Promise<any> {
    this.logger.log('🔄 WithdrawQueueWorker: Starting...');

    try {
      const poolState = await this.refiIptBlockchain.getPoolState();
      if (!poolState) {
        this.logger.warn('⚠️ Cannot fetch pool state');
        return;
      }

      this.logger.log(`📊 Pool State:`);
      this.logger.log(`   - USDC Reserves: ${poolState.totalUsdcReserves.toString()}`);
      this.logger.log(`   - Queue Length: ${poolState.pendingQueue.length}`);

      await this.processQueue(poolState.pendingQueue);
      await this.syncCompletedRequests();

      this.logger.log('✅ WithdrawQueueWorker: Completed');
    } catch (error) {
      this.logger.error('❌ WithdrawQueueWorker Error:', error);
      throw error;
    }
  }

  private async processQueue(queue: QueueItem[]): Promise<void> {
    this.logger.log(`\n📋 Processing ${queue.length} items in queue...`);
    if (queue.length === 0) {
      this.logger.log('✅ Queue is empty, nothing to process');
      return;
    }

    const amounts: BN[] = [];
    const remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] = [];
    const validItems: QueueItem[] = [];

    const poolState = await this.refiIptBlockchain.getPoolState();
    if (!poolState) {
      this.logger.warn('⚠️ Cannot fetch pool state for validation');
      return;
    }

    if (poolState.totalUsdcReserves.lte(new BN(0))) {
      this.logger.warn('⚠️ No liquidity available, waiting...');
      return;
    }

    const exchangeRate = poolState.currentExchangeRate;
    this.logger.log(`   Exchange Rate: ${exchangeRate.toString()}`);
    let currentPoolReserves = poolState.totalUsdcReserves;
    this.logger.log(`   Current Pool Reserves: ${currentPoolReserves.toString()}`);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const userWallet = item.user.toString();
      this.logger.log(`userWallet [${i}]`, userWallet);

      const iptBalance = await this.refiIptBlockchain.getUserIptBalance(userWallet);
      this.logger.log(`   IPT Balance: ${iptBalance.toString()}`);

      if (iptBalance < BigInt(item.amount.toString())) {
        this.logger.warn(`   ⚠️ User ${userWallet.slice(0, 8)}... - Will be SKIPPED by blockchain (Insufficient IPT balance)`);
      }

      const iptAmount = item.amount;
      const requiredUsdc = iptAmount.mul(exchangeRate).div(new BN(1e6));
      const withdrawalFee = requiredUsdc.mul(new BN(2)).div(new BN(100));
      const grossUsdcAmount = requiredUsdc.add(withdrawalFee);

      if (currentPoolReserves.lt(grossUsdcAmount)) {
        this.logger.warn(`   ⚠️ Insufficient reserves for user at position ${i}, stopping batch (FIFO)`);
        break;
      }

      amounts.push(iptAmount);
      remainingAccounts.push(
        { pubkey: item.userIptAccount, isSigner: false, isWritable: true },
        { pubkey: item.userUsdcAccount, isSigner: false, isWritable: true },
      );

      if (iptBalance >= BigInt(item.amount.toString())) {
        validItems.push(item);
        currentPoolReserves = currentPoolReserves.sub(grossUsdcAmount);
        this.logger.log(`   ✓ User ${userWallet.slice(0, 8)}... - Valid (${iptAmount.toString()} IPT, ${grossUsdcAmount.toString()} USDC)`);
      } else {
        this.logger.warn(`   ⚠️ User ${userWallet.slice(0, 8)}... - Invalid but included (blockchain will skip)`);
      }
    }

    if (amounts.length === 0) {
      this.logger.warn('⚠️ No items to process');
      return;
    }

    this.logger.log(`\n🚀 Executing batch withdraw for ${amounts.length} items (FIFO, blockchain will skip invalid)...`);
    const result = await this.refiIptBlockchain.executeBatchWithdraw(amounts, remainingAccounts);

    if (result.success) {
      this.logger.log(`✅ Batch withdraw successful! TX: ${result.txSignature}`);
      for (const item of validItems) {
        await this.updateRequestStatus(
          item.user.toString(),
          item.amount.toString(),
          WithdrawRequestStatus.COMPLETED,
          WithdrawBlockchainStatus.COMPLETED_BATCH,
          result.txSignature,
        );
      }

      for (let i = 0; i < amounts.length; i++) {
        const item = queue[i];
        const userWallet = item.user.toString();
        const iptBalance = await this.refiIptBlockchain.getUserIptBalance(userWallet);

        if (iptBalance < BigInt(item.amount.toString())) {
          await this.updateRequestStatus(userWallet, item.amount.toString(), WithdrawRequestStatus.FAILED, WithdrawBlockchainStatus.FAILED);
        }
      }
    } else {
      this.logger.error(`❌ Batch withdraw failed: ${result.error}`);
    }
  }

  private async syncCompletedRequests(): Promise<void> {
    const pendingRequests = await this.withdrawRequestRepository.find({
      where: {
        status: In([
          WithdrawRequestStatus.PENDING_LIQUIDITY,
          WithdrawRequestStatus.READY_TO_EXECUTE,
          WithdrawRequestStatus.EXECUTING,
        ]),
      },
    });

    if (pendingRequests.length === 0) {
      return;
    }

    const poolState = await this.refiIptBlockchain.getPoolState();
    const queueWallets = new Set(poolState?.pendingQueue.map((item) => item.user.toString().toLowerCase()) || []);

    for (const request of pendingRequests) {
      if (!queueWallets.has(request.wallet_address.toLowerCase())) {
        if (!this.isValidSolanaAddress(request.wallet_address)) {
          this.logger.warn(`⚠️ Skipping request ${request.id} - invalid Solana wallet address: ${request.wallet_address}`);
          continue;
        }
        request.status = WithdrawRequestStatus.COMPLETED;
        request.processed_at = new Date();
        await this.withdrawRequestRepository.save(request);
        this.logger.log(`✅ Marked request ${request.id} as completed (removed from queue)`);
      }
    }
  }

  private async updateRequestStatus(
    walletAddress: string,
    voltAmount: string,
    status: WithdrawRequestStatus,
    blockchainStatus: WithdrawBlockchainStatus | null,
    txSignature?: string,
  ): Promise<void> {
    const request = await this.withdrawRequestRepository.findOne({
      where: {
        wallet_address: walletAddress.toLowerCase(),
        volt_amount: voltAmount,
        status: In([
          WithdrawRequestStatus.PENDING_LIQUIDITY,
          WithdrawRequestStatus.READY_TO_EXECUTE,
          WithdrawRequestStatus.EXECUTING,
        ]),
      },
    });

    if (request) {
      request.status = status;
      if (blockchainStatus) {
        request.blockchain_status = blockchainStatus;
      }
      if (txSignature) {
        request.tx_signature = txSignature;
      }
      if (status === WithdrawRequestStatus.COMPLETED) {
        request.processed_at = new Date();
      }
      await this.withdrawRequestRepository.save(request);
      this.logger.log(`✅ Updated request ${request.id} status to ${status}`);
    }
  }

  private isValidSolanaAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }
    if (address.startsWith('0x')) {
      return false;
    }
    try {
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  }
}