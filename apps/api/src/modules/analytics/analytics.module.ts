import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShortlinkClickEntity } from './entities/shortlink-click.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShortlinkClickEntity])],
})
export class AnalyticsModule {}
