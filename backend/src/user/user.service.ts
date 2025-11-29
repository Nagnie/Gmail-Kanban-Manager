import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { oauth2_v2 } from 'googleapis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {

  }

  async findOrCreateUser(googleUser: oauth2_v2.Schema$Userinfo, encryptedGoogleRefreshToken: string): Promise<User> {
    const user = await this.userRepository.findOne({ 
        where: { email: googleUser.email || '' } 
    });

    if (user) {
        user.googleRefreshToken = encryptedGoogleRefreshToken;
        return this.userRepository.save(user);
    }

    const newUser: User = this.userRepository.create({
      email: googleUser.email,
      name: googleUser.name,
      googleId: googleUser.id,
      googleRefreshToken: encryptedGoogleRefreshToken
    } as User);
    
    return await this.userRepository.save(newUser);
  }

  async updateRtHash(id: number, rt: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    user.hashedRefreshToken = rt;
    return this.userRepository.save(user);
  }

  async logout(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    user.hashedRefreshToken = null;
    await this.userRepository.save(user);
  }


  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all user`;
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
