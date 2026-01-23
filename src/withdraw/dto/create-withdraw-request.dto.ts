// SPDX-License-Identifier: Apache-2.0
// src/modules/withdraw/dtos/create-withdraw-request.dto.ts
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateWithdrawRequestDto {
  @IsNotEmpty({ message: 'volt_amount is required' })
  @IsNumber({}, { message: 'volt_amount must be a number' })
  @Min(1, { message: 'volt_amount must be at least 1' })
  volt_amount: number;

  @IsNotEmpty({ message: 'min_volt is required' })
  @IsNumber({}, { message: 'min_volt must be a number' })
  @Min(0, { message: 'min_volt must be at least 0' })
  min_volt: number;

  @IsNotEmpty({ message: 'min_usdc is required' })
  @IsNumber({}, { message: 'min_usdc must be a number' })
  @Min(0.01, { message: 'min_usdc must be at least 0.01' })
  min_usdc: number;

  @IsNotEmpty({ message: 'time_estimate is required' })
  @IsNumber({}, { message: 'time_estimate must be a number' })
  @Min(0.1, { message: 'time_estimate must be at least 0.1' })
  time_estimate: number;

  @IsNotEmpty({ message: 'wallet_address is required' })
  @IsString({ message: 'wallet_address must be a string' })
  wallet_address: string;
}