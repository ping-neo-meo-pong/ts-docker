import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../core/user/user.entity';
import { UserRepository } from '../../core/user/user.repository';
import { FindUserDto } from './dto/find-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Like, IsNull, In, Not } from 'typeorm';
import { FriendRespository } from '../../core/friend/friend.repository';
import { Friend } from '../../core/friend/friend.entity';
import { BlockRepository } from '../../core/block/block.repository';
import { UserRole } from '../../enum/user-role.enum';
import { ChannelRepository } from '../../core/channel/channel.repository';
import { ChannelMemberRepository } from '../../core/channel/channel-member.repository';
import { GameHistoryRepository } from '../../core/game/game-history.repository';
import { GameHistory } from '../../core/game/game-history.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    @InjectRepository(FriendRespository)
    private friendRespository: FriendRespository,
    @InjectRepository(BlockRepository)
    private blockRepository: BlockRepository,
    @InjectRepository(ChannelRepository)
    private channelRepository: ChannelRepository,
    @InjectRepository(ChannelMemberRepository)
    private channelMemberRepository: ChannelMemberRepository,
    @InjectRepository(GameHistoryRepository)
    private gameHistoryRepository: GameHistoryRepository,
  ) {}

  async findUserById(userId: string): Promise<User> {
    return await this.userRepository.findOneBy({ id: userId });
  }

  async findUsers(findUserData: FindUserDto): Promise<User[]> {
    if (!findUserData.username) {
      return await this.userRepository.find();
    }
    return await this.userRepository.find({
      where: { username: Like(`%${findUserData.username}%`) },
    });
  }

  async findUserByUserName(username: string) {
    const user = await this.userRepository.findOneBy({ username: username });
    if (user) {
      return { isExistUser: true };
    }
    return { isExistUser: false };
  }

  async updateUserById(
    userId: string,
    updateUserData: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findUserById(userId);
    if (updateUserData.username) {
      if (updateUserData.username === user.username) {
        throw new BadRequestException('?????? username?????? ????????? ??? ????????????.');
      }
      const isExistUser = await this.userRepository.findOneBy({
        username: updateUserData.username,
      });
      if (isExistUser) {
        throw new BadRequestException('?????? ???????????? username');
      }
    }
    await this.userRepository.update(userId, updateUserData);
    return user;
  }

  async findFriends(userId: string): Promise<Friend[]> {
    return await this.friendRespository.find({
      relations: ['userId', 'userFriendId'],
      where: [{ userId: { id: userId } }, { userFriendId: { id: userId } }],
    });
  }

  async requestFriend(userId: string, friendId: string): Promise<Friend> {
    const user = await this.findUserById(userId);
    const friend = await this.findUserById(friendId);
    if (!user || !friend) {
      throw new BadRequestException('???????????? ?????? ??????');
    }
    if (userId === friendId) {
      throw new BadRequestException('userId === friendId');
    }

    const friendship = await this.friendRespository.findFriendByUsers(
      userId,
      friendId,
    );
    if (friendship?.acceptAt) {
      throw new BadRequestException('?????? ?????? ?????????');
    } else if (!friendship?.acceptAt && friendship?.userId.id === userId) {
      throw new BadRequestException('?????? ?????? ????????? ??????????????????');
    } else if (
      !friendship?.acceptAt &&
      friendship?.userFriendId.id === userId
    ) {
      await this.friendRespository.update(friendship.id, {
        acceptAt: () => 'CURRENT_TIMESTAMP',
      });
      return friendship;
    }
    return this.friendRespository.createFriend(user, friend);
  }

  async acceptFriend(userId: string, friendId: string): Promise<Friend> {
    const friendship = await this.friendRespository.findOne({
      relations: ['userId', 'userFriendId'],
      where: { userId: { id: friendId }, userFriendId: { id: userId } },
    });
    if (!friendship) {
      throw new BadRequestException('????????? ????????? ????????????.');
    }
    if (friendship.acceptAt) {
      throw new BadRequestException('?????? ?????? ?????????');
    }
    await this.friendRespository.update(friendship.id, {
      acceptAt: () => 'CURRENT_TIMESTAMP',
    });
    return friendship;
  }

  async blockUser(userId: string, blockId: string) {
    if (userId === blockId) {
      throw new BadRequestException('userId === blockId');
    }
    const blockUser = await this.findUserById(blockId);
    if (!blockUser) {
      throw new BadRequestException('???????????? ?????? ??????');
    }
    const block = await this.blockRepository.findOne({
      relations: ['userId', 'blockedUserId'],
      where: { userId: { id: userId }, blockedUserId: { id: blockId } },
    });
    if (block?.blockAt) {
      throw new BadRequestException('?????? ??????????????????');
    }
    if (block && !block?.blockAt) {
      await this.blockRepository.update(block?.id, {
        blockAt: () => 'CURRENT_TIMESTAMP',
      });
      return block;
    }

    const user = await this.findUserById(userId);
    return this.blockRepository.createBlock(user, blockUser);
  }

  async unblockUser(userId: string, blockId: string) {
    if (userId === blockId) {
      throw new BadRequestException('userId === blockId');
    }
    const blockUser = await this.findUserById(blockId);
    if (!blockUser) {
      throw new BadRequestException('???????????? ?????? ??????');
    }
    const block = await this.blockRepository.findOne({
      relations: ['userId', 'blockedUserId'],
      where: { userId: { id: userId }, blockedUserId: { id: blockId } },
    });
    if (!block) {
      throw new BadRequestException('????????? ?????? ????????????.');
    }
    if (!block.blockAt) {
      throw new BadRequestException('?????? ????????? ?????????????????????.');
    }

    await this.blockRepository.update(block?.id, {
      blockAt: null,
    });
    return { success: true };
  }

  async blockUserFromService(userId: string, banId: string) {
    const user = await this.findUserById(userId);
    if (!(user.role === UserRole.OWNER || user.role === UserRole.MODERATOR)) {
      throw new ForbiddenException('????????? ????????????');
    }
    if (userId === banId) {
      throw new BadRequestException('userId === blockId');
    }
    const banUser = await this.findUserById(banId);
    if (!banUser) {
      throw new BadRequestException('???????????? ?????? ??????');
    }
    if (banUser.role === UserRole.OWNER) {
      throw new ForbiddenException('????????? ????????????');
    } else if (banUser.role === UserRole.BAN) {
      throw new BadRequestException('?????? ????????? ???????????????');
    }
    await this.userRepository.update(banUser.id, {
      role: UserRole.BAN,
    });
    return { success: true };
  }

  async findChannelByParticipant(userId: string) {
    const user = await this.findUserById(userId);
    if (user.role === UserRole.OWNER || user.role === UserRole.MODERATOR) {
      return this.channelRepository.find();
    }
    const joinChannels = await this.channelMemberRepository.find({
      relations: ['userId', 'channelId'],
      where: {
        userId: { id: userId },
        leftAt: IsNull(),
        channelId: { deletedAt: IsNull() },
      },
    });
    const channels = joinChannels.map((channel) => {
      return {
        ...channel.channelId,
        userRoleInChannel: channel.roleInChannel,
        userBan: channel.banEndAt < new Date() ? false : true,
        userMute: channel.muteEndAt < new Date() ? false : true,
      };
    });
    return channels;
  }

  async findUserProfile(userId: string) {
    const user = await this.findUserById(userId);
    const userGameHistory = await this.gameHistoryRepository.find({
      relations: ['userId', 'gameRoomId'],
      where: { userId: { id: userId } },
    });
    const gameRooms = userGameHistory.map(
      (gameRoom) => gameRoom?.gameRoomId?.id,
    );
    let otherGameHistory = [];
    if (gameRooms.length > 0) {
      otherGameHistory = await this.gameHistoryRepository.find({
        relations: ['userId', 'gameRoomId'],
        where: {
          gameRoomId: { id: In(gameRooms) },
          userId: { id: Not(userId) },
        },
      });
    }
    const gameHistory = new Map();
    userGameHistory.forEach((item: GameHistory) =>
      gameHistory.set(item.gameRoomId.id, {
        profile: {
          id: item.userId.id,
          username: item.userId.username,
          profileImage: item.userId.profileImage,
        },
        win: item.win,
        side: item.side,
        score: item.score,
        ladder: item.ladder,
      }),
    );
    otherGameHistory.forEach((item: GameHistory) =>
      gameHistory.set(item.gameRoomId.id, {
        gameRoom: item.gameRoomId,
        user: gameHistory.get(item.gameRoomId.id),
        other: {
          profile: {
            id: item.userId.id,
            username: item.userId.username,
            profileImage: item.userId.profileImage,
          },
          win: item.win,
          side: item.side,
          score: item.score,
          ladder: item.ladder,
        },
      }),
    );
    const gameHistories = Array.from(gameHistory.values());
    return { ...user, matchHistory: gameHistories };
  }
}
