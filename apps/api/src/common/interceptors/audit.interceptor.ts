import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import * as crypto from 'crypto';
import { AuditLogEntity } from '../entities/audit-log.entity';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();

    if (!AUDITED_METHODS.has(req.method)) return next.handle();

    const user = (req as any).user;
    const ipHash = req.ip
      ? crypto.createHash('sha256').update(req.ip).digest('hex').substring(0, 16)
      : undefined;

    return next.handle().pipe(
      tap(() => {
        this.auditRepo.save({
          actorId: user?.id ?? undefined,
          actorEmail: user?.email ?? undefined,
          action: `${req.method} ${req.path}`,
          resource: this.extractResource(req.path),
          payload: { body: req.body, params: req.params },
          ipHash,
        } as any).catch(() => {/* non-critical */});
      }),
    );
  }

  private extractResource(path: string): string {
    const parts = path.split('/').filter(Boolean);
    return parts[2] || parts[1] || 'unknown';
  }
}
