import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AuthModule } from './modules/auth/auth.module';
import { FormsModule } from './modules/forms/forms.module';
import { ResponsesModule } from './modules/responses/responses.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ShortlinksModule } from './modules/shortlinks/shortlinks.module';
import { PublicModule } from './modules/public/public.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

// Entity imports
import { UserEntity } from './modules/auth/entities/user.entity';
import { FormEntity } from './modules/forms/entities/form.entity';
import { ShortlinkEntity } from './modules/shortlinks/entities/shortlink.entity';
import { ShortlinkHistoryEntity } from './modules/shortlinks/entities/shortlink-history.entity';
import { ExternalSessionEntity } from './modules/shortlinks/entities/external-session.entity';
import { ShortlinkClickEntity } from './modules/analytics/entities/shortlink-click.entity';
import { AuditLogEntity } from './common/entities/audit-log.entity';
import { ApprovalRequestEntity } from './modules/workflows/entities/approval-request.entity';
import { ApprovalStepEntity } from './modules/workflows/entities/approval-step.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [
          UserEntity,
          FormEntity,
          ShortlinkEntity,
          ShortlinkHistoryEntity,
          ExternalSessionEntity,
          ShortlinkClickEntity,
          AuditLogEntity,
          ApprovalRequestEntity,
          ApprovalStepEntity,
        ],
        synchronize: false,  // Use migrations in production
        logging: config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60000, limit: 100 },
    ]),

    AuthModule,
    FormsModule,
    ResponsesModule,
    WorkflowsModule,
    IntegrationsModule,
    ShortlinksModule,
    PublicModule,
    AnalyticsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
