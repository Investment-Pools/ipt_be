// SPDX-License-Identifier: Apache-2.0
// src/migrations/0001-create-withdraw-request.ts
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWithdrawRequest1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'withdraw_request',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'wallet_address',
            type: 'varchar',
            length: '250',
            isNullable: false,
          },
          {
            name: 'volt_amount',
            type: 'decimal',
            precision: 24,
            scale: 0,
            isNullable: false,
          },
          {
            name: 'requested_amount',
            type: 'decimal',
            precision: 24,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'exit_fee',
            type: 'decimal',
            precision: 24,
            scale: 2,
            default: '0',
          },
          {
            name: 'received_amount',
            type: 'decimal',
            precision: 24,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'estimated_time_days',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 3.0,
          },
          {
            name: 'pro_rata_ratio',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'int',
            default: 1,
          },
          {
            name: 'tx_signature',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'blockchain_status',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'processed_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: '_createTime',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: '_createUser',
            type: 'int',
            isNullable: true,
          },
          {
            name: '_updateTime',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: '_updateUser',
            type: 'int',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'withdraw_request',
      new TableIndex({
        name: 'idx_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'withdraw_request',
      new TableIndex({
        name: 'idx_wallet_address',
        columnNames: ['wallet_address'],
      }),
    );

    await queryRunner.createIndex(
      'withdraw_request',
      new TableIndex({
        name: 'idx_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'withdraw_request',
      new TableIndex({
        name: 'idx_created_at',
        columnNames: ['_createTime'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('withdraw_request');
  }
}