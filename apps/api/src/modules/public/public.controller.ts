import {
  Controller, Get, Post, Param, Body, Req, Res,
  Headers, UnauthorizedException, ConflictException, GoneException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { ShortlinkService, RequestContext } from '../shortlinks/shortlink.service';
import { FormsService } from '../forms/forms.service';
import { Public } from '../auth/decorators/public.decorator';
import { hashIp } from '../../common/utils/hash';

@ApiTags('public')
@Public()
@Controller('s')
export class PublicController {
  constructor(
    private readonly shortlinkService: ShortlinkService,
    private readonly formsService: FormsService,
  ) {}

  @Get(':shortCode/status')
  async getStatus(@Param('shortCode') shortCode: string) {
    const sl = await this.shortlinkService.getShortlink(shortCode);
    return {
      active: sl.status === 'active' && (!sl.expiresAt || sl.expiresAt > new Date()),
      formName: sl.currentForm?.name,
      formDescription: sl.currentForm?.description,
      requiresAuth: sl.accessType !== 'public',
      expiresAt: sl.expiresAt,
      totalResponses: sl.currentForm?.responseCount,
    };
  }

  @Get(':shortCode')
  async resolveShortlink(
    @Param('shortCode') shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const context = this.buildContext(req);
    const result = await this.shortlinkService.resolve(shortCode, context);

    switch (result.type) {
      case 'not_found':
        return res.status(404).json({ error: 'Link not found or has been removed' });

      case 'expired':
        if (result.fallbackUrl) return res.redirect(302, result.fallbackUrl);
        return res.status(410).json({ error: 'This link has expired' });

      case 'inactive':
        return res.status(503).json({ error: result.message });

      case 'access_denied':
        return res.status(403).json({
          error: 'Access denied',
          requiredAction: result.requiredAction,
        });

      case 'form': {
        const form = await this.formsService.getPublicForm(result.formId);
        res.cookie('ext_session', result.sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000,
        });
        return res.json({ form, sessionToken: result.sessionToken, shortCode });
      }
    }
  }

  @Post(':shortCode/access')
  async verifyAccess(
    @Param('shortCode') shortCode: string,
    @Body() credentials: { password?: string; email?: string; token?: string },
    @Req() req: Request,
  ) {
    const result = await this.shortlinkService.verifyAccessCredentials(
      shortCode,
      credentials,
      this.buildContext(req),
    );

    if (result.success) {
      return { success: true, sessionToken: result.sessionToken };
    }
    return { success: false, error: result.error, remainingAttempts: result.remainingAttempts };
  }

  @Post(':shortCode/submit')
  async submitResponse(
    @Param('shortCode') shortCode: string,
    @Body() body: { values: Record<string, unknown>; attachments?: any[] },
    @Headers('x-session-token') sessionToken: string,
    @Req() req: Request,
  ) {
    if (!sessionToken) throw new UnauthorizedException('Session token required');

    const session = await this.shortlinkService.validateSession(sessionToken);
    if (!session || session.shortCode !== shortCode) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Check if form has been switched since session was created
    const current = await this.shortlinkService.resolve(shortCode, {
      ...this.buildContext(req),
      skipSessionCheck: true,
    });

    if (current.type === 'form' && current.formId !== session.formId) {
      throw new ConflictException({
        message: 'This form has been updated. Please refresh the page.',
        code: 'FORM_UPDATED',
        newFormId: current.formId,
      });
    }

    if (current.type !== 'form') {
      throw new GoneException('This form is no longer available');
    }

    const form = await this.formsService.getPublicForm(session.formId);
    const stored = await this.formsService.storeExternalResponse({
      formId: session.formId,
      shortlinkId: session.shortlinkId,
      sessionId: session.id,
      values: body.values as any,
      metadata: {
        ipHash: req.ip ? hashIp(req.ip) : undefined,
        userAgent: req.headers['user-agent'],
        submittedAt: new Date(),
        respondentHash: session.respondentHash,
      },
    });

    await this.shortlinkService.completeSession(session.id);

    return {
      success: true,
      confirmationId: stored.id,
      message: form.settings?.confirmationMessage || 'Thank you for your response!',
      redirectUrl: form.settings?.confirmationRedirect,
    };
  }

  private buildContext(req: Request): RequestContext {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      headers: req.headers as Record<string, string>,
      cookies: req.cookies || {},
      query: req.query as Record<string, string>,
      referrer: req.headers['referer'],
    };
  }
}
