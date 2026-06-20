import { Module } from '@nestjs/common';
import { GoogleDatabaseService } from './google-database.service';
import { MicrosoftDatabaseService } from './microsoft-database.service';

@Module({
  providers: [GoogleDatabaseService, MicrosoftDatabaseService],
  exports: [GoogleDatabaseService, MicrosoftDatabaseService],
})
export class IntegrationsModule {}
