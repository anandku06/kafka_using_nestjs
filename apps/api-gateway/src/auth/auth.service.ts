import { SERVICE_PORTS } from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private readonly authServiceUrl = `http://localhost:${SERVICE_PORTS.AUTH_SERVICE}`;

  constructor(private readonly httpService: HttpService) {}

  async register(data: { email: string; password: string; name: string }) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/register`, data),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async login(data: { email: string; password: string }) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/login`, data),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getProfile(token: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/profile`, {
          headers: {
            Authorization: token,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    const err = error as {
      response?: { data: string | object; status: number };
    };

    if (err.response) {
      throw new HttpException(err.response.data, err.response.status);
    }

    throw new HttpException('Something went wrong!', 503);
  }
}
