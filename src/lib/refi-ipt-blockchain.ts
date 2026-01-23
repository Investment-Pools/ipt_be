// SPDX-License-Identifier: Apache-2.0
// src/lib/refi-ipt-blockchain.ts
import { AnchorProvider, BN, Idl, Program, Wallet, EventParser, BorshCoder } from '@project-serum/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { ConfigService } from '@nestjs/config';
import { WithdrawalType } from '../entities/withdraw-request.entity';
const refiIptIdl = require('../res/refi-ipt/refi_ipt.json');

export interface WithdrawResult {
  success: boolean;
  immediate: boolean;
  txSignature?: string;
  inQueue: boolean;
  error?: string;
}

export interface PoolState {
  totalUsdcReserves: BN;
  totalIptSupply: BN;
  currentExchangeRate: BN;
  pendingQueue: QueueItem[];
}

export interface QueueItem {
  user: PublicKey;
  userIptAccount: PublicKey;
  userUsdcAccount: PublicKey;
  amount: BN;
  timestamp: BN;
}

export class RefiIptBlockchain {
  private connection: Connection;
  private wallet: Wallet;
  private provider: AnchorProvider;
  private programId: PublicKey;
  private usdcMint: PublicKey;
  private keypairSigner: Keypair;

  constructor(configService?: ConfigService) {
    // Lấy từ environment variables hoặc config service
    const privateKey = configService?.get<string>('REFI_IPT_PRIVATE_KEY') || process.env.REFI_IPT_PRIVATE_KEY;
    const rpcUrl = configService?.get<string>('SOLANA_RPC') || process.env.SOLANA_RPC;
    const programId = configService?.get<string>('REFI_IPT_PROGRAM_ID') || process.env.REFI_IPT_PROGRAM_ID;
    const usdcMintAddress = configService?.get<string>('REFI_IPT_USDC_MINT') || process.env.REFI_IPT_USDC_MINT;

    if (!privateKey || !rpcUrl || !programId || !usdcMintAddress) {
      throw new Error('Missing required environment variables for RefiIptBlockchain');
    }

    const decodedKey = bs58.decode(privateKey);
    this.keypairSigner = Keypair.fromSecretKey(Uint8Array.from(decodedKey));
    this.wallet = new Wallet(this.keypairSigner);
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.provider = new AnchorProvider(this.connection, this.wallet, {});
    this.programId = new PublicKey(programId);
    this.usdcMint = new PublicKey(usdcMintAddress);
  }

  private getUsdcMint(): PublicKey {
    return this.usdcMint;
  }

  private getProgram(): Program {
    return new Program(refiIptIdl as Idl, this.programId, this.provider);
  }

  // ... giữ nguyên các methods khác từ file gốc
  async getPoolPda(): Promise<PublicKey> {
    const [poolPda] = PublicKey.findProgramAddressSync([Buffer.from('pool'), this.usdcMint.toBuffer()], this.programId);
    return poolPda;
  }

  async getIptMint(poolPda: PublicKey): Promise<PublicKey> {
    const [iptMint] = PublicKey.findProgramAddressSync([Buffer.from('ipt_mint'), poolPda.toBuffer()], this.programId);
    return iptMint;
  }

  async getUsdcReserve(poolPda: PublicKey): Promise<PublicKey> {
    const [usdcReserve] = PublicKey.findProgramAddressSync([Buffer.from('usdc_reserve'), poolPda.toBuffer()], this.programId);
    return usdcReserve;
  }

  async getPoolState(): Promise<PoolState | null> {
    try {
      const program = this.getProgram();
      const poolPda = await this.getPoolPda();
      const pool = await program.account.pool.fetch(poolPda);
      const iptMint = await this.getIptMint(poolPda);
      
      const pendingQueuePromises = (pool.pendingQueue || []).map(async (item: any) => {
        const userPublicKey = new PublicKey(item.user);
        const userIptAccount = await getAssociatedTokenAddress(iptMint, userPublicKey);
        const userUsdcAccount = await getAssociatedTokenAddress(this.usdcMint, userPublicKey);

        return {
          user: userPublicKey,
          userIptAccount,
          userUsdcAccount,
          amount: item.amount as BN,
          timestamp: item.timestamp || new BN(0),
        };
      });

      const pendingQueue = await Promise.all(pendingQueuePromises);

      return {
        totalUsdcReserves: pool.totalUsdcReserves as BN,
        totalIptSupply: pool.totalIptSupply as BN,
        currentExchangeRate: pool.currentExchangeRate as BN,
        pendingQueue,
      };
    } catch (error) {
      console.error('Error fetching pool state:', error);
      return null;
    }
  }

  async getUserIptBalance(userWallet: string): Promise<bigint> {
    try {
      if (!userWallet || typeof userWallet !== 'string') {
        throw new Error('Invalid wallet address: empty or not a string');
      }

      if (userWallet.startsWith('0x')) {
        throw new Error('Invalid wallet address: Ethereum format detected, expected Solana address');
      }
      
      const poolPda = await this.getPoolPda();
      const iptMint = await this.getIptMint(poolPda);
      const userPublicKey = new PublicKey(userWallet);
      const userIptAccount = await getAssociatedTokenAddress(iptMint, userPublicKey);
      const accountInfo = await getAccount(this.connection, userIptAccount);
      return accountInfo.amount;
    } catch (error) {
      console.error('Error getting user IPT balance:', error);
      return BigInt(0);
    }
  }

  async executeUserWithdraw(userWallet: string, voltAmount: BN, minUsdcAmount: BN = new BN(0)): Promise<WithdrawResult> {
    try {
      const program = this.getProgram();
      const poolPda = await this.getPoolPda();
      const iptMint = await this.getIptMint(poolPda);
      const usdcReserve = await this.getUsdcReserve(poolPda);
      const userPublicKey = new PublicKey(userWallet);
      const userIptAccount = await getAssociatedTokenAddress(iptMint, userPublicKey);
      const userUsdcAccount = await getAssociatedTokenAddress(this.usdcMint, userPublicKey);

      const tx = await program.methods
        .userWithdraw(voltAmount, minUsdcAmount)
        .accounts({
          user: userPublicKey,
          pool: poolPda,
          poolAuthority: poolPda,
          userUsdcAccount: userUsdcAccount,
          userIptAccount: userIptAccount,
          poolUsdcReserve: usdcReserve,
          iptMint: iptMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([this.keypairSigner])
        .rpc();

      const poolState = await this.getPoolState();
      const inQueue = poolState?.pendingQueue.some((item) => item.user.toString().toLowerCase() === userWallet.toLowerCase()) || false;

      return {
        success: true,
        immediate: !inQueue,
        inQueue,
        txSignature: tx,
      };
    } catch (error) {
      console.error('Error executing user withdraw:', error);
      return {
        success: false,
        immediate: false,
        inQueue: false,
        error: error.message,
      };
    }
  }

  async executeBatchWithdraw(
    amounts: BN[],
    remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[],
  ): Promise<{ success: boolean; txSignature?: string; error?: string }> {
    try {
      const program = this.getProgram();
      const poolPda = await this.getPoolPda();
      const iptMint = await this.getIptMint(poolPda);
      const usdcReserve = await this.getUsdcReserve(poolPda);

      const tx = await program.methods
        .batchExecuteWithdraw(amounts)
        .accounts({
          executor: this.wallet.publicKey,
          pool: poolPda,
          poolAuthority: poolPda,
          poolUsdcReserve: usdcReserve,
          iptMint: iptMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .signers([this.keypairSigner])
        .rpc();

      return { success: true, txSignature: tx };
    } catch (error) {
      console.error('Error executing batch withdraw:', error);
      return { success: false, error: error.message };
    }
  }

  async getUsdcReserveBalance(): Promise<bigint> {
    try {
      const poolPda = await this.getPoolPda();
      const usdcReserve = await this.getUsdcReserve(poolPda);
      const accountInfo = await getAccount(this.connection, usdcReserve);
      return accountInfo.amount;
    } catch (error) {
      console.error('Error getting USDC reserve balance:', error);
      return BigInt(0);
    }
  }

  async verifyTransaction(txSignature: string): Promise<{
    success: boolean;
    userWallet?: string;
    iptAmount?: BN;
    usdcAmount?: BN;
    withdrawalFee?: BN;
    withdrawalType?: WithdrawalType;
    queuePosition?: number;
    error?: string;
  }> {
    try {
      const tx = await this.connection.getTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta || tx.meta.err) {
        return { success: false, error: 'Transaction failed or not found' };
      }

      const accountKeys = tx.transaction.message.getAccountKeys();
      const signers: string[] = [];
      for (let i = 0; i < tx.transaction.message.header.numRequiredSignatures; i++) {
        signers.push(accountKeys.staticAccountKeys[i]?.toString());
      }

      const userWallet = signers[0];
      if (!userWallet) {
        return { success: false, error: 'Could not extract user wallet from transaction' };
      }

      const programId = this.programId.toString();
      const accountKeysArray = accountKeys.staticAccountKeys.map((key) => key.toString());
      if (!accountKeysArray.includes(programId)) {
        return { success: false, error: 'Transaction does not call refi-ipt program' };
      }

      let iptAmount: BN | undefined;
      let usdcAmount: BN | undefined;
      let withdrawalFee: BN | undefined;
      let withdrawalType: WithdrawalType | undefined;
      let queuePosition: number | undefined;

      const events = await this.parseTransactionEvents(txSignature);
      for (const event of events) {
        switch (event.name) {
          case 'UserWithdrawalExecuted':
            withdrawalType = WithdrawalType.IMMEDIATE;
            iptAmount = new BN(event.data.iptAmount.toString());
            usdcAmount = new BN(event.data.usdcAmount.toString());
            withdrawalFee = new BN(event.data.withdrawalFee.toString());
            break;

          case 'AddedToQueue':
            withdrawalType = WithdrawalType.QUEUED;
            iptAmount = new BN(event.data.amount.toString());
            queuePosition = event.data.position;
            break;
        }
      }

      if (!withdrawalType) {
        return { success: false, error: 'Could not determine withdrawal type from transaction events' };
      }

      return {
        success: true,
        userWallet,
        iptAmount,
        usdcAmount,
        withdrawalFee,
        withdrawalType,
        queuePosition,
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return { success: false, error: error.message || 'Failed to verify transaction' };
    }
  }

  async parseTransactionEvents(txSignature: string): Promise<any[]> {
    try {
      const tx = await this.connection.getTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta || !tx.meta.logMessages) {
        return [];
      }

      const program = this.getProgram();
      const eventParser = new EventParser(program.programId, new BorshCoder(program.idl));
      return Array.from(eventParser.parseLogs(tx.meta.logMessages));
    } catch (error) {
      console.error(`Error parsing transaction ${txSignature}:`, error);
      return [];
    }
  }
}