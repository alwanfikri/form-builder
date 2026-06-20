import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShortlinksController } from './shortlinks.controller';
import { ShortlinkService } from './shortlink.service';
import { ShortlinkEntity } from './entities/shortlink.entity';
import { ShortlinkHistoryEntity } from './entities/shortlink-history.entity';
import { ExternalSessionEntity } from './entities/external-session.entity';
import { FormEntity } from '../forms/entities/form.entity';
import { CacheService } from '../../common/services/cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShortlinkEntity,
      ShortlinkHistoryEntity,
      ExternalSessionEntity,
      FormEntity,
    ]),
  ],
  controllers: [ShortlinksController],
  providers: [ShortlinkService, CacheService],
  exports: [ShortlinkService],
})
export class ShortlinksModule {}
