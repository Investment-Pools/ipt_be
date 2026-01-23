// SPDX-License-Identifier: Apache-2.0
// src/modules/withdraw/dtos/save-withdraw-request.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SaveWithdrawRequestDto {
  @IsNotEmpty({ message: 'withdraw_request_id is required' })
  @IsNumber({}, { message: 'withdraw_request_id must be a number' })
  withdraw_request_id: number;

  @IsNotEmpty({ message: 'tx_signature is required' })
  @IsString({ message: 'tx_signature must be a string' })
  tx_signature: string;

  @IsNotEmpty({ message: 'volt_amount is required' })
  @IsNumber({}, { message: 'volt_amount must be a number' })
  volt_amount: number;

  @IsNotEmpty({ message: 'wallet_address is required' })
  @IsString({ message: 'wallet_address must be a string' })
  wallet_address: string;
}