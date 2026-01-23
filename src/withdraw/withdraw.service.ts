// SPDX-License-Identifier: Apache-2.0
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WithdrawRequest, WithdrawRequestStatus, WithdrawBlockchainStatus, WithdrawalType } from '../entities/withdraw-request.entity';
import { RefiIptBlockchain } from '../lib/refi-ipt-blockchain';
import { CreateWithdrawRequestDto } from './dto/create-withdraw-request.dto';
import { SaveWithdrawRequestDto } from './dto/save-withdraw-request.dto';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class WithdrawService {
  private readonly DEFAULT_EXIT_FEE_PERCENT = 2;
  private readonly DEFAULT_PRICE_PER_VOLT = 1.0;

  constructor(
    @InjectRepository(WithdrawRequest)
    private withdrawRequestRepository: Repository<WithdrawRequest>,
  ) {}

  public async createWithdrawRequest(dto: CreateWithdrawRequestDto): Promise<any> {
    const { volt_amount, min_volt, min_usdc, time_estimate, wallet_address } = dto;

    let availableVolt: bigint;
    try {
      const refiIptBlockchain = new RefiIptBlockchain();
      availableVolt = await refiIptBlockchain.getUserIptBalance(wallet_address);
    } catch (error) {
      throw new Error("Bug")
    }

    if (volt_amount <= 0) {
      throw new Error('Invalid volt amount');
    }

    if (volt_amount < min_volt) {
      throw new Error('Volt amount must be at least ${min_volt}');
    }

    const requestedAmount = (Number(volt_amount) / 1e6) * this.DEFAULT_PRICE_PER_VOLT;

    if (requestedAmount < min_usdc) {
      throw new Error('USDC amount must be at least ${min_usdc}');
    }

    const voltAmountStr = volt_amount.toString();
    const initialStatus = WithdrawRequestStatus.PENDING_TO_EXECUTE;

    const withdrawRequest = this.withdrawRequestRepository.create({
      user_id: 1,
      wallet_address: wallet_address,
      volt_amount: voltAmountStr,
      requested_amount: requestedAmount.toFixed(2),
      estimated_time_days: dto.time_estimate,
      status: initialStatus,
      blockchain_status: null,
    });

    try {
      const saved = await this.withdrawRequestRepository.save(withdrawRequest);
      return saved;
    } catch (error) {
      throw new Error(`Failed to create withdraw request: ${error.message}`);
    }
  }

  public async saveWithdrawRequest(dto: SaveWithdrawRequestDto): Promise<any> {
    const { withdraw_request_id, tx_signature, volt_amount, wallet_address } = dto;
    console.log("tx_signature: ", tx_signature);
    
    if (wallet_address.toLowerCase() !== wallet_address.toLowerCase()) {
      throw new Error('Unauthorized access to withdraw request');
    }

    let txInfo: any;
    try {
      const refiIptBlockchain = new RefiIptBlockchain();
      txInfo = await refiIptBlockchain.verifyTransaction(tx_signature);
    } catch (error) {
      throw new Error(`Failed to verify transaction: ${error.message}`);
    }

    if (!txInfo.userWallet || txInfo.userWallet.toLowerCase() !== wallet_address.toLowerCase()) {
      throw new Error('Unauthorized access to withdraw request');
    }

    // Handle failed transaction
    if (!txInfo.success || !txInfo.withdrawalType) {
      throw new Error('Failed to update withdraw request (failed transaction)');
    }

    const blockchainIptAmount = txInfo.iptAmount?.toString();
    const requestedIptAmount = dto.volt_amount.toString();

    let calculationResult;
    switch (txInfo.withdrawalType as WithdrawalType) {
      case WithdrawalType.IMMEDIATE:
        calculationResult = this.calculateImmediateWithdrawal(txInfo, blockchainIptAmount, dto.volt_amount.toString());
        break;
      case WithdrawalType.QUEUED:
        const voltAmount = txInfo.iptAmount?.toString();
        calculationResult = this.calculateQueuedWithdrawal(voltAmount, blockchainIptAmount);
        break;
      default:
        throw new Error(`Invalid withdrawal type: ${txInfo.withdrawalType}`);
    }

    const { requestedAmount, exitFee, receivedAmount, voltAmountStr, status, blockchainStatus, processedAt } = calculationResult;

    try {
      return await this.withdrawRequestRepository.update(withdraw_request_id, {
        requested_amount: requestedAmount.toFixed(2),
        exit_fee: exitFee.toFixed(2),
        received_amount: receivedAmount.toFixed(2),
        status: status,
        blockchain_status: blockchainStatus,
        processed_at: processedAt,
      });
    } catch (error) {
      throw new Error(`Failed to update withdraw request: ${error.message}`);
    }
  }

  private calculateImmediateWithdrawal(txInfo: any, blockchainIptAmount: string, voltAmount: string) {
    const actualUsdcAmount = txInfo.usdcAmount?.toNumber() || 0;
    const actualWithdrawalFee = txInfo.withdrawalFee?.toNumber() || 0;

    return {
      receivedAmount: actualUsdcAmount / 1e6,
      exitFee: actualWithdrawalFee / 1e6,
      requestedAmount: (actualUsdcAmount + actualWithdrawalFee) / 1e6,
      voltAmountStr: blockchainIptAmount || voltAmount,
      status: WithdrawRequestStatus.COMPLETED,
      blockchainStatus: WithdrawBlockchainStatus.COMPLETED_IMMEDIATE,
      processedAt: new Date(),
    };
  }

  private calculateQueuedWithdrawal(voltAmount: string, blockchainIptAmount: string) {
    const iptAmountNumber = Number(voltAmount) / 1e6;
    const requestedAmount = iptAmountNumber * this.DEFAULT_PRICE_PER_VOLT;
    const exitFee = requestedAmount * (this.DEFAULT_EXIT_FEE_PERCENT / 100);

    return {
      requestedAmount,
      exitFee,
      receivedAmount: requestedAmount - exitFee,
      voltAmountStr: blockchainIptAmount || voltAmount,
      status: WithdrawRequestStatus.PENDING_LIQUIDITY,
      blockchainStatus: WithdrawBlockchainStatus.IN_QUEUE,
      processedAt: null,
    };
  }
}