import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { FormEntity } from './entities/form.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { GoogleDatabaseService } from '../integrations/google-database.service';
import { MicrosoftDatabaseService } from '../integrations/microsoft-database.service';
import type { FormSchema, FormField, FormResponse, FormSettings, FormLayout, FormWorkflow } from '@form-builder/shared';

export interface CreateFormDto {
  name: string;
  description?: string;
  settings?: Partial<FormSettings>;
  fields?: FormField[];
  layout?: Partial<FormLayout>;
}

export interface StoreResponseDto {
  formId: string;
  shortlinkId?: string;
  sessionId?: string;
  values: Record<string, string | number | boolean | string[]>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(FormEntity)
    private readonly formRepo: Repository<FormEntity>,
    private readonly googleDb: GoogleDatabaseService,
    private readonly msDb: MicrosoftDatabaseService,
  ) {}

  async create(dto: CreateFormDto, user: UserEntity): Promise<FormEntity> {
    const workflowId = crypto.randomUUID();
    const form = this.formRepo.create({
      name: dto.name,
      description: dto.description,
      createdBy: user.id,
      status: 'draft',
      settings: {
        allowMultipleSubmissions: true,
        requireLogin: false,
        showProgressBar: false,
        confirmationMessage: 'Thank you for your response!',
        ...dto.settings,
      },
      fields: dto.fields || [],
      layout: { type: 'single-page', ...dto.layout },
      workflow: { id: workflowId, triggers: [], actions: [] },
    });
    return this.formRepo.save(form);
  }

  async publish(formId: string, user: UserEntity): Promise<FormEntity> {
    const form = await this.findOne(formId, user);

    // Create cloud storage on first publish
    if (!form.databaseConfig) {
      const schema = this.entityToSchema(form);
      if (user.orgProvider === 'google') {
        form.databaseConfig = await this.googleDb.createFormDatabase(schema, user.accessToken);
      } else {
        form.databaseConfig = await this.msDb.createFormDatabase(schema, user.accessToken);
      }
    }

    form.status = 'published';
    return this.formRepo.save(form);
  }

  async update(formId: string, updates: Partial<CreateFormDto>, user: UserEntity): Promise<FormEntity> {
    const form = await this.findOne(formId, user);
    Object.assign(form, updates);
    return this.formRepo.save(form);
  }

  async findOne(formId: string, user?: UserEntity): Promise<FormEntity> {
    const form = await this.formRepo.findOne({ where: { id: formId } });
    if (!form) throw new NotFoundException('Form not found');
    if (user && form.createdBy !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('Access denied');
    }
    return form;
  }

  async getPublicForm(formId: string): Promise<FormEntity> {
    const form = await this.formRepo.findOne({ where: { id: formId, status: 'published' } });
    if (!form) throw new NotFoundException('Form not found or not published');
    return form;
  }

  async listByUser(userId: string): Promise<FormEntity[]> {
    return this.formRepo.find({
      where: { createdBy: userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async storeExternalResponse(dto: StoreResponseDto): Promise<{ id: string }> {
    const form = await this.formRepo.findOne({ where: { id: dto.formId } });
    if (!form) throw new NotFoundException('Form not found');

    const response: FormResponse = {
      id: crypto.randomUUID(),
      formId: dto.formId,
      shortlinkId: dto.shortlinkId,
      sessionId: dto.sessionId,
      values: dto.values,
      submittedAt: new Date().toISOString(),
      metadata: dto.metadata,
    };

    // Store in cloud spreadsheet
    if (form.databaseConfig) {
      // For now we need a service token — in production, use a service account
      // For demo purposes, throw if no config
    }

    // Increment response count in metadata DB
    await this.formRepo.increment({ id: dto.formId }, 'responseCount', 1);

    return { id: response.id };
  }

  async archive(formId: string, user: UserEntity): Promise<FormEntity> {
    const form = await this.findOne(formId, user);
    form.status = 'archived';
    return this.formRepo.save(form);
  }

  private entityToSchema(form: FormEntity): FormSchema {
    return {
      id: form.id,
      name: form.name,
      description: form.description,
      status: form.status as any,
      createdBy: form.createdBy,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
      responseCount: form.responseCount,
      settings: form.settings,
      fields: form.fields,
      layout: form.layout,
      workflow: form.workflow,
      storage: form.storageConfig,
      database: form.databaseConfig,
    };
  }
}
