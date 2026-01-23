// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawController } from './withdraw.controller';
import { WithdrawService } from './withdraw.service';
import { WithdrawRequest } from '../entities/withdraw-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WithdrawRequest])],
  controllers: [WithdrawController],
  providers: [WithdrawService],
  exports: [WithdrawService],
})
export class WithdrawModule {}