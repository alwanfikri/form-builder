import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { OIDCStrategy } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(OIDCStrategy, 'microsoft') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get('MS_CLIENT_ID'),
      clientSecret: config.get('MS_CLIENT_SECRET'),
      callbackURL: config.get('MS_CALLBACK_URL'),
      tenant: config.get('MS_TENANT_ID'),
      scope: [
        'user.read',
        'Files.ReadWrite',
        'Sites.ReadWrite.All',
        'offline_access',
      ],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ) {
    const user = await this.authService.findOrCreateUser({
      provider: 'microsoft',
      providerId: profile.oid || profile.id,
      email: profile._json?.preferred_username || profile.emails?.[0]?.value,
      name: profile.displayName,
      orgProvider: 'microsoft',
      accessToken,
      refreshToken,
    });
    done(null, user);
  }
}
