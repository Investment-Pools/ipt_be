// SPDX-License-Identifier: Apache-2.0
// src/modules/withdraw/withdraw.controller.ts
import { Body, Controller, Get, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { CreateWithdrawRequestDto } from './dto/create-withdraw-request.dto';
import { SaveWithdrawRequestDto } from './dto/save-withdraw-request.dto';
// Bỏ ValidationGuard và Validation decorator nếu không dùng
// Hoặc dùng ValidationPipe global trong main.ts

@Controller('withdraw-requests')
export class WithdrawController {
  constructor(private withdrawService: WithdrawService) {}

  @Post()
  async createWithdrawRequest(@Req() req: any, @Body() body: CreateWithdrawRequestDto): Promise<any> {
    return await this.withdrawService.createWithdrawRequest(body);
  }

  @Post('save-withdraw-request')
  async saveWithdrawRequest(@Req() req: any, @Body() body: SaveWithdrawRequestDto): Promise<any> {
    return await this.withdrawService.saveWithdrawRequest(body);
  }
}