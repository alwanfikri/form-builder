import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { ShortlinksModule } from '../shortlinks/shortlinks.module';
import { FormsModule } from '../forms/forms.module';

@Module({
  imports: [ShortlinksModule, FormsModule],
  controllers: [PublicController],
})
export class PublicModule {}
