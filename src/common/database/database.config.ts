// SPDX-License-Identifier: Apache-2.0
// app.module.ts hoặc database config
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawRequest } from 'src/entities/withdraw-request.entity';

TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.DB_HOST ?? '',
  port: parseInt(process.env.DB_PORT ?? '3306'),
  username: process.env.DB_USER ?? '',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? '',
  entities: [WithdrawRequest],
  migrations: ['dist/migrations/*.js'],
  synchronize: true, // false in production
});