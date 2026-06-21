import { DbService, users } from '@app/db';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import {
  ConflictException,
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientKafka } from '@nestjs/microservices';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthServiceService implements OnModuleInit {
  constructor(
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
    private readonly dbService: DbService,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    // connect to kafka
    await this.kafkaClient.connect();
  }

  async register(email: string, password: string, name: string) {
    const exists = await this.dbService.db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!exists) {
      throw new ConflictException('User already exists!');
    }

    const hashedPass = await bcrypt.hash(password, 10);

    const [user] = await this.dbService.db
      .insert(users)
      .values({
        name: name,
        email: email,
        password: hashedPass,
      })
      .returning();

    this.kafkaClient.emit(KAFKA_TOPICS.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'User registered successfully!',
    };
  }

  async login(email: string, password: string) {
    const exists = await this.dbService.db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!exists || !(await bcrypt.compare(password, exists.password))) {
      throw new UnauthorizedException('Invalid Creds!');
    }

    const token = this.jwt.sign({ sub: exists.id, email: exists.email });

    this.kafkaClient.emit(KAFKA_TOPICS.USER_LOGIN, {
      userId: exists.id,
      timestamp: new Date().toISOString(),
    });

    return {
      access_token: token,
      user: {
        if: exists.id,
        email: exists.email,
        name: exists.name,
      },
    };
  }

  async getProfile(userId: string) {
    const [user] = await this.dbService.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found!');
    }

    return user;
  }
}
