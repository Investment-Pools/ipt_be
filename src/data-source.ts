// SPDX-License-Identifier: Apache-2.0
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { WithdrawRequest } from './entities/withdraw-request.entity';

// Load environment variables
config();

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'refi_ipt_db',
  entities: [WithdrawRequest],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});