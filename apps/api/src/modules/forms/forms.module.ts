import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { FormEntity } from './entities/form.entity';
import { GoogleDatabaseService } from '../integrations/google-database.service';
import { MicrosoftDatabaseService } from '../integrations/microsoft-database.service';

@Module({
  imports: [TypeOrmModule.forFeature([FormEntity])],
  controllers: [FormsController],
  providers: [FormsService, GoogleDatabaseService, MicrosoftDatabaseService],
  exports: [FormsService],
})
export class FormsModule {}
