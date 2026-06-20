import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShortlinkService } from './shortlink.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import * as QRCode from 'qrcode';

class CreateShortlinkBody {
  formId: string;
  customCode?: string;
  accessType?: string;
  accessConfig?: Record<string, unknown>;
  fallbackUrl?: string;
  expiresAt?: string;
}

class SwitchFormBody {
  newFormId: string;
  reason: string;
  gracefulTransition?: boolean;
  requireCompatible?: boolean;
}

class UpdateShortlinkBody {
  status?: string;
  accessType?: string;
  accessConfig?: Record<string, unknown>;
  fallbackUrl?: string;
  expiresAt?: string;
}

@ApiTags('shortlinks')
@ApiBearerAuth()
@Controller('api/v1/shortlinks')
export class ShortlinksController {
  constructor(private readonly shortlinkService: ShortlinkService) {}

  @Post()
  create(@Body() body: CreateShortlinkBody, @CurrentUser() user: UserEntity) {
    return this.shortlinkService.create(
      { ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined },
      user,
    );
  }

  @Get()
  list(@CurrentUser() user: UserEntity) {
    return this.shortlinkService.listByUser(user.id);
  }

  @Get(':code')
  get(@Param('code') code: string) {
    return this.shortlinkService.getShortlink(code);
  }

  @Post(':code/switch')
  switchForm(
    @Param('code') code: string,
    @Body() body: SwitchFormBody,
    @CurrentUser() user: UserEntity,
  ) {
    return this.shortlinkService.switchForm(code, body.newFormId, body.reason, user, {
      gracefulTransition: body.gracefulTransition,
      requireCompatible: body.requireCompatible,
    });
  }

  @Get(':code/qr')
  async getQrCode(@Param('code') code: string, @Query('size') size = '200') {
    const url = `${process.env.FRONTEND_URL}/s/${code}`;
    const svg = await QRCode.toString(url, {
      type: 'svg',
      width: parseInt(size, 10),
    });
    return { svg, url };
  }

  @Get(':code/history')
  getHistory(@Param('code') code: string) {
    return this.shortlinkService.getShortlink(code).then((sl) => sl.history);
  }
}
