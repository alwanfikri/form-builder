import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike, MoreThan } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ShortlinkEntity } from './entities/shortlink.entity';
import { ShortlinkHistoryEntity } from './entities/shortlink-history.entity';
import { ExternalSessionEntity } from './entities/external-session.entity';
import { CacheService } from '../../common/services/cache.service';
import { UserEntity } from '../auth/entities/user.entity';
import { FormEntity } from '../forms/entities/form.entity';
import { hashEmail, hashIp } from '../../common/utils/hash';

export interface CreateShortlinkDto {
  formId: string;
  customCode?: string;
  accessType?: string;
  accessConfig?: Record<string, unknown>;
  fallbackUrl?: string;
  expiresAt?: Date;
}

export interface SwitchFormOptions {
  gracefulTransition?: boolean;
  requireCompatible?: boolean;
}

export interface RequestContext {
  ip?: string;
  userAgent?: string;
  userEmail?: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  query: Record<string, string>;
  referrer?: string;
  skipSessionCheck?: boolean;
}

export interface ResolutionResult {
  type: 'form' | 'not_found' | 'expired' | 'inactive' | 'access_denied';
  formId?: string;
  sessionToken?: string;
  accessType?: string;
  fallbackUrl?: string;
  message?: string;
  requiredAction?: string;
}

interface CacheEntry {
  shortlinkId: string;
  formId: string;
  accessType: string;
  accessConfig: Record<string, unknown>;
  fallbackUrl?: string;
}

@Injectable()
export class ShortlinkService {
  constructor(
    @InjectRepository(ShortlinkEntity)
    private readonly shortlinkRepo: Repository<ShortlinkEntity>,
    @InjectRepository(ShortlinkHistoryEntity)
    private readonly historyRepo: Repository<ShortlinkHistoryEntity>,
    @InjectRepository(ExternalSessionEntity)
    private readonly sessionRepo: Repository<ExternalSessionEntity>,
    @InjectRepository(FormEntity)
    private readonly formRepo: Repository<FormEntity>,
    private readonly cacheService: CacheService,
  ) {}

  // ─── Create ────────────────────────────────────────────────

  async create(dto: CreateShortlinkDto, user: UserEntity): Promise<ShortlinkEntity> {
    const shortCode = dto.customCode
      ? this.normalizeCode(dto.customCode)
      : this.generateCode(8);

    const exists = await this.shortlinkRepo.findOne({
      where: { shortCode: ILike(shortCode), archivedAt: IsNull() },
    });
    if (exists) throw new ConflictException(`Short code "${shortCode}" is already in use`);

    const form = await this.formRepo.findOne({ where: { id: dto.formId } });
    if (!form) throw new NotFoundException('Form not found');

    const shortlink = this.shortlinkRepo.create({
      shortCode,
      currentFormId: dto.formId,
      accessType: dto.accessType || 'public',
      accessConfig: (dto.accessConfig as any) || {},
      fallbackUrl: dto.fallbackUrl,
      expiresAt: dto.expiresAt,
      createdBy: user.id,
    });
    await this.shortlinkRepo.save(shortlink);

    await this.historyRepo.save({
      shortlinkId: shortlink.id,
      formId: dto.formId,
      reason: 'Initial creation',
      changedBy: user.id,
    });

    await this.setCache(shortCode, {
      shortlinkId: shortlink.id,
      formId: dto.formId,
      accessType: shortlink.accessType,
      accessConfig: shortlink.accessConfig as any,
    });

    return shortlink;
  }

  // ─── Switch Form (core feature) ────────────────────────────

  async switchForm(
    shortCode: string,
    newFormId: string,
    reason: string,
    user: UserEntity,
    options?: SwitchFormOptions,
  ): Promise<ShortlinkEntity> {
    const shortlink = await this.shortlinkRepo.findOne({
      where: { shortCode, archivedAt: IsNull() },
      relations: ['currentForm'],
    });
    if (!shortlink) throw new NotFoundException('Shortlink not found');

    const newForm = await this.formRepo.findOne({ where: { id: newFormId } });
    if (!newForm) throw new NotFoundException('Target form not found');
    if (newForm.status !== 'published') {
      throw new BadRequestException('Target form must be published before switching');
    }

    if (options?.requireCompatible) {
      this.checkFieldCompatibility(shortlink.currentForm?.fields || [], newForm.fields);
    }

    // Deactivate current history entry
    await this.historyRepo
      .createQueryBuilder()
      .update()
      .set({ deactivatedAt: new Date() })
      .where('shortlink_id = :id AND deactivated_at IS NULL', { id: shortlink.id })
      .execute();

    // Create new history entry
    await this.historyRepo.save({
      shortlinkId: shortlink.id,
      formId: newFormId,
      reason,
      changedBy: user.id,
    });

    // Update shortlink
    shortlink.currentFormId = newFormId;
    await this.shortlinkRepo.save(shortlink);

    // Invalidate cache so next request gets the new form
    await this.cacheService.del(`shortlink:${shortCode}`);
    await this.setCache(shortCode, {
      shortlinkId: shortlink.id,
      formId: newFormId,
      accessType: shortlink.accessType,
      accessConfig: shortlink.accessConfig as any,
      fallbackUrl: shortlink.fallbackUrl,
    });

    return this.shortlinkRepo.findOne({
      where: { shortCode },
      relations: ['currentForm', 'history', 'history.form'],
    }) as Promise<ShortlinkEntity>;
  }

  // ─── Resolve (public shortlink access) ────────────────────

  async resolve(shortCode: string, context: RequestContext): Promise<ResolutionResult> {
    let cached = await this.cacheService.get<CacheEntry>(`shortlink:${shortCode}`);

    if (!cached) {
      const shortlink = await this.shortlinkRepo.findOne({
        where: { shortCode: ILike(shortCode), archivedAt: IsNull() },
      });
      if (!shortlink) return { type: 'not_found' };
      if (shortlink.status !== 'active') {
        return { type: 'inactive', message: 'This link is currently inactive.' };
      }
      if (shortlink.expiresAt && shortlink.expiresAt < new Date()) {
        return { type: 'expired', fallbackUrl: shortlink.fallbackUrl };
      }

      cached = {
        shortlinkId: shortlink.id,
        formId: shortlink.currentFormId,
        accessType: shortlink.accessType,
        accessConfig: shortlink.accessConfig as any,
        fallbackUrl: shortlink.fallbackUrl,
      };
      await this.setCache(shortCode, cached);
    }

    // Record click (fire-and-forget)
    this.recordClick(cached.shortlinkId, context).catch(() => {});

    // Verify access
    const access = await this.verifyAccess(cached.accessType, cached.accessConfig, context);
    if (!access.allowed) {
      return { type: 'access_denied', requiredAction: access.requiredAction };
    }

    if (context.skipSessionCheck) {
      return { type: 'form', formId: cached.formId, accessType: cached.accessType };
    }

    const session = await this.getOrCreateSession(shortCode, context, cached);

    return {
      type: 'form',
      formId: cached.formId,
      sessionToken: session.token,
      accessType: cached.accessType,
    };
  }

  // ─── Session management ────────────────────────────────────

  async validateSession(sessionToken: string): Promise<ExternalSessionEntity & { shortCode: string } | null> {
    try {
      const decoded = jwt.verify(sessionToken, process.env.EXT_SESSION_SECRET!) as any;
      const session = await this.sessionRepo.findOne({
        where: {
          sessionToken: decoded.jti,
          accessExpiresAt: MoreThan(new Date()),
        },
      });
      if (!session) return null;
      return { ...session, shortCode: decoded.shortCode };
    } catch {
      return null;
    }
  }

  async completeSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, { responseCompleted: true });
  }

  // ─── Access credential verification ───────────────────────

  async verifyAccessCredentials(
    shortCode: string,
    credentials: { password?: string; email?: string; token?: string },
    context: RequestContext,
  ): Promise<{ success: boolean; sessionToken?: string; error?: string; remainingAttempts?: number }> {
    const cached = await this.cacheService.get<CacheEntry>(`shortlink:${shortCode}`);
    if (!cached) return { success: false, error: 'Shortlink not found' };

    const config = cached.accessConfig;

    if (cached.accessType === 'password' && credentials.password) {
      const attemptKey = `pwd_attempts:${shortCode}:${hashIp(context.ip || '')}`;
      const attempts = await this.cacheService.incr(attemptKey, 900);
      const maxAttempts = (config.maxAttempts as number) || 5;

      if (attempts > maxAttempts) {
        return { success: false, error: 'Too many attempts', remainingAttempts: 0 };
      }

      const valid = await bcrypt.compare(credentials.password, config.passwordHash as string);
      if (!valid) {
        return { success: false, error: 'Incorrect password', remainingAttempts: maxAttempts - attempts };
      }
    }

    const session = await this.getOrCreateSession(shortCode, context, cached);
    return { success: true, sessionToken: session.token };
  }

  // ─── Getters ───────────────────────────────────────────────

  async getShortlink(shortCode: string): Promise<ShortlinkEntity> {
    const sl = await this.shortlinkRepo.findOne({
      where: { shortCode },
      relations: ['currentForm', 'history', 'history.form'],
      order: { history: { activatedAt: 'DESC' } },
    });
    if (!sl) throw new NotFoundException('Shortlink not found');
    return sl;
  }

  async listByUser(userId: string): Promise<ShortlinkEntity[]> {
    return this.shortlinkRepo.find({
      where: { createdBy: userId, archivedAt: IsNull() },
      relations: ['currentForm', 'history'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Private ───────────────────────────────────────────────

  private async verifyAccess(
    type: string,
    config: Record<string, unknown>,
    context: RequestContext,
  ): Promise<{ allowed: boolean; requiredAction?: string }> {
    switch (type) {
      case 'public':
        return { allowed: true };

      case 'password':
        // Password check happens via /access endpoint
        return { allowed: false, requiredAction: 'password' };

      case 'email_list': {
        const email = context.userEmail;
        if (!email) return { allowed: false, requiredAction: 'email' };
        const allowedEmails = (config.allowedEmails as string[]) || [];
        const allowedDomains = (config.allowedDomains as string[]) || [];
        const domain = email.split('@')[1];
        const ok = allowedEmails.includes(email) || allowedDomains.includes(domain);
        return ok ? { allowed: true } : { allowed: false, requiredAction: 'email_unauthorized' };
      }

      case 'token': {
        const token = context.headers['x-access-token'];
        const tokens = (config.tokens as string[]) || [];
        return tokens.includes(token)
          ? { allowed: true }
          : { allowed: false, requiredAction: 'token' };
      }

      case 'rate_limited': {
        const key = `rate:${hashIp(context.ip || '')}`;
        const count = await this.cacheService.incr(key, 86400);
        const max = (config.maxPerDay as number) || 1;
        return count <= max
          ? { allowed: true }
          : { allowed: false, requiredAction: 'rate_limited' };
      }

      default:
        return { allowed: false };
    }
  }

  private async getOrCreateSession(
    shortCode: string,
    context: RequestContext,
    cached: CacheEntry,
  ): Promise<ExternalSessionEntity & { token: string }> {
    const existingToken = context.cookies['ext_session'];

    if (existingToken) {
      try {
        const decoded = jwt.verify(existingToken, process.env.EXT_SESSION_SECRET!) as any;
        const session = await this.sessionRepo.findOne({
          where: {
            sessionToken: decoded.jti,
            formId: cached.formId,
            accessExpiresAt: MoreThan(new Date()),
          },
        });
        if (session) {
          const token = jwt.sign(
            { jti: session.sessionToken, formId: cached.formId, shortCode },
            process.env.EXT_SESSION_SECRET!,
            { expiresIn: '24h' },
          );
          return { ...session, token };
        }
      } catch {
        // Fall through to create new session
      }
    }

    const tokenId = crypto.randomUUID();
    const session = this.sessionRepo.create({
      shortlinkId: cached.shortlinkId,
      sessionToken: tokenId,
      respondentHash: context.userEmail ? hashEmail(context.userEmail) : undefined,
      respondentFingerprint: {
        ipHash: context.ip ? hashIp(context.ip) : null,
        userAgent: context.userAgent,
      },
      accessExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      formId: cached.formId,
      metadata: {
        utmSource: context.query['utm_source'],
        utmMedium: context.query['utm_medium'],
        referrer: context.referrer,
      },
    });
    await this.sessionRepo.save(session);

    const token = jwt.sign(
      { jti: tokenId, formId: cached.formId, shortCode },
      process.env.EXT_SESSION_SECRET!,
      { expiresIn: '24h' },
    );

    return { ...session, token };
  }

  private async recordClick(shortlinkId: string, context: RequestContext): Promise<void> {
    const ipHash = context.ip ? hashIp(context.ip) : null;
    const uniqueKey = `click:unique:${shortlinkId}:${ipHash}`;
    const isUnique = !(await this.cacheService.exists(uniqueKey));

    if (isUnique) {
      await this.cacheService.set(uniqueKey, 1, 86400);
      await this.shortlinkRepo.increment({ id: shortlinkId }, 'uniqueClicks', 1);
    }
    await this.shortlinkRepo.increment({ id: shortlinkId }, 'totalClicks', 1);
  }

  private checkFieldCompatibility(oldFields: any[], newFields: any[]): void {
    const oldIds = new Set(oldFields.map((f: any) => f.id));
    const newIds = new Set(newFields.map((f: any) => f.id));
    const missing = [...oldIds].filter((id) => !newIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `New form is missing ${missing.length} field(s) present in the old form. Use requireCompatible=false to force switch.`,
      );
    }
  }

  private async setCache(shortCode: string, entry: CacheEntry): Promise<void> {
    await this.cacheService.set(`shortlink:${shortCode}`, entry, 3600);
  }

  private generateCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  private normalizeCode(code: string): string {
    return code.toUpperCase().replace(/[^A-Z0-9\-_]/g, '');
  }
}
