import { UsersService } from '@/app/backend/services/UsersService';

export class UsersController {
  constructor(private readonly usersService = new UsersService()) {}

  async getById(userId: string) {
    return this.usersService.getById(userId);
  }
}
