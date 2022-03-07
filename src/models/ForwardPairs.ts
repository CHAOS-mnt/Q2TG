import { Friend, Group } from 'oicq';
import TelegramChat from '../client/TelegramChat';
import OicqClient from '../client/OicqClient';
import Telegram from '../client/Telegram';
import db from './db';
import { Entity } from 'telegram/define';
import { BigInteger } from 'big-integer';
import { Pair } from './Pair';


export default class ForwardPairs {
  private pairs: Pair[] = [];

  private constructor(private readonly instanceId: number) {
  }

  // 在 forwardController 创建时初始化
  private async init(oicq: OicqClient, tgBot: Telegram) {
    const dbValues = await db.forwardPair.findMany({
      where: { instanceId: this.instanceId },
    });
    for (const i of dbValues) {
      this.pairs.push(new Pair(
        oicq.getChat(Number(i.qqRoomId)),
        await tgBot.getChat(Number(i.tgChatId)),
        i.id,
      ));
    }
  }

  public static async load(instanceId: number, oicq: OicqClient, tgBot: Telegram) {
    const instance = new this(instanceId);
    await instance.init(oicq, tgBot);
    return instance;
  }

  public async add(qq: Friend | Group, tg: TelegramChat) {
    const dbEntry = await db.forwardPair.create({
      data: {
        qqRoomId: qq instanceof Friend ? qq.user_id : -qq.group_id,
        tgChatId: Number(tg.id),
        instanceId: this.instanceId,
      },
    });
    this.pairs.push(new Pair(qq, tg, dbEntry.id));
    return dbEntry;
  }

  public find(target: Friend | Group | TelegramChat | Entity | number | BigInteger) {
    if (!target) return null;
    if (target instanceof Friend) {
      return this.pairs.find(e => e.qq instanceof Friend && e.qq.user_id === target.user_id);
    }
    else if (target instanceof Group) {
      return this.pairs.find(e => e.qq instanceof Group && e.qq.group_id === target.group_id);
    }
    else if (typeof target === 'number' || 'eq' in target) {
      return this.pairs.find(e => e.qqRoomId === target || e.tg.id.eq(target));
    }
    else {
      return this.pairs.find(e => e.tg.id.eq(target.id));
    }
  }
}