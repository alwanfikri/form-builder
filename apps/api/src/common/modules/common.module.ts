import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheService } from '../services/cache.service';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { AuditInterceptor } from '../interceptors/audit.interceptor';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [CacheService, AuditInterceptor],
  exports: [CacheService, AuditInterceptor],
})
export class CommonModule {}
