// SPDX-License-Identifier: Apache-2.0
// src/entities/withdraw-request.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WithdrawRequestStatus {
  REQUESTED = 1,
  PENDING_LIQUIDITY = 2,
  READY_TO_EXECUTE = 3,
  EXECUTING = 4,
  COMPLETED = 5,
  PENDING_TO_EXECUTE = 6,
  FAILED = 7,
  CANCELLED = 8,
}

export enum WithdrawBlockchainStatus {
  FAILED = 'failed',
  PENDING_QUEUE = 'pending_queue',
  IN_QUEUE = 'in_queue',
  COMPLETED_IMMEDIATE = 'completed_immediate',
  COMPLETED_BATCH = 'completed_batch',
}

export enum WithdrawalType {
  IMMEDIATE = 'immediate',
  QUEUED = 'queued',
}

@Entity('withdraw_request')
@Index(['user_id'])
@Index(['wallet_address'])
@Index(['status'])
@Index(['_createTime'])
export class WithdrawRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 250 })
  wallet_address: string;

  @Column({ type: 'decimal', precision: 24, scale: 0 })
  volt_amount: string;

  @Column({ type: 'decimal', precision: 24, scale: 2 })
  requested_amount: string;

  @Column({ type: 'decimal', precision: 24, scale: 2, default: '0' })
  exit_fee: string;

  @Column({ type: 'decimal', precision: 24, scale: 2, nullable: true })
  received_amount: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3.0 })
  estimated_time_days: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  pro_rata_ratio: number;

  @Column({ type: 'int', default: WithdrawRequestStatus.REQUESTED })
  status: WithdrawRequestStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tx_signature: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  blockchain_status: string | null;

  @Column({ type: 'datetime', nullable: true })
  processed_at: Date;

  @CreateDateColumn({ name: '_createTime' })
  _createTime: Date;

  @Column({ type: 'int', nullable: true })
  _createUser: number;

  @UpdateDateColumn({ name: '_updateTime' })
  _updateTime: Date;

  @Column({ type: 'int', nullable: true })
  _updateUser: number;
}