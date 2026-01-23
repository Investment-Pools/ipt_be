// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WithdrawModule } from './withdraw/withdraw.module';
import { WithdrawRequest } from './entities/withdraw-request.entity';
import { WithdrawQueueWorker } from './cron_job/withdraw-queue';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST') || process.env.DB_HOST,
        port: parseInt(configService.get('DB_PORT') || process.env.DB_PORT || '3306'),
        username: configService.get('DB_USER') || process.env.DB_USER,
        password: configService.get('DB_PASSWORD') || process.env.DB_PASSWORD,
        database: configService.get('DB_NAME') || process.env.DB_NAME,
        entities: [WithdrawRequest],
        migrations: ['dist/migrations/*.js'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([WithdrawRequest]),
    WithdrawModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    WithdrawQueueWorker,
  ],
})
export class AppModule {}