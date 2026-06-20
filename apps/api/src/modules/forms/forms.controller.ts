import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FormsService, CreateFormDto } from './forms.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import type { FormField, FormSettings } from '@form-builder/shared';

class UpdateFormDto {
  name?: string;
  description?: string;
  settings?: Partial<FormSettings>;
  fields?: FormField[];
}

@ApiTags('forms')
@ApiBearerAuth()
@Controller('api/v1/forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  create(@Body() dto: CreateFormDto, @CurrentUser() user: UserEntity) {
    return this.formsService.create(dto, user);
  }

  @Get()
  list(@CurrentUser() user: UserEntity) {
    return this.formsService.listByUser(user.id);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.formsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFormDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.formsService.update(id, dto, user);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.formsService.publish(id, user);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.formsService.archive(id, user);
  }
}
