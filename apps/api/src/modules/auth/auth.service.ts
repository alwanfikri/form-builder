import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';

interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  orgProvider: string;
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async findOrCreateUser(profile: OAuthProfile): Promise<UserEntity> {
    let user = await this.userRepo.findOne({
      where: { provider: profile.provider, providerId: profile.providerId },
    });

    if (user) {
      user.accessToken = profile.accessToken;
      if (profile.refreshToken) user.refreshToken = profile.refreshToken;
      user.tokenExpiry = new Date(Date.now() + 3600 * 1000);
      return this.userRepo.save(user);
    }

    user = this.userRepo.create({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      provider: profile.provider,
      providerId: profile.providerId,
      orgProvider: profile.orgProvider,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
      tokenExpiry: new Date(Date.now() + 3600 * 1000),
      role: 'editor',
    });

    return this.userRepo.save(user);
  }

  generateJwt(user: UserEntity): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
