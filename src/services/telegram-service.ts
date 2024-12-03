import TelegramBot from 'node-telegram-bot-api';
import { MediaData } from '../types';

export class TelegramService {
  static clients: { [k: string]: TelegramBot };

  async setupClient(params: {
    webhook?: string;
    bot_api: string;
    bot_name: string;
    responder?: (msg: unknown) => Promise<string>;
  }): Promise<void> {
    try {
      if (!TelegramService.clients) {
        TelegramService.clients = {};
      }
      const { webhook, bot_api, bot_name, responder } = params;
      console.log('webhook', webhook);
      let bot: TelegramBot;
      if (!!webhook) {
        bot = new TelegramBot(bot_api);
        bot.setWebHook(webhook);
      } else if (!!responder) {
        bot = new TelegramBot(bot_api, {
          polling: true,
        });
        bot.on('message', async (msg) => {
          console.log(msg);
          const chatId = msg.chat.id;
          const response = await responder(msg);
          bot.sendMessage(chatId, response);
        });
      }
      TelegramService.clients[bot_name] = bot;
    } catch (err) {
      console.log({
        origin: 'telegarm: initClient',
        content: err.message,
      });
      return null;
    }
  }

  async sendMessage(params: {
    bot_name: string;
    chatId: number[];
    response: string;
    media?: MediaData;
  }): Promise<number[]> {
    try {
      const { chatId, response, bot_name, media } = params;
      const messageIds = [];
      for (let index = 0; index < chatId.length; index++) {
        try {
          const idChat = chatId[index];
          const sent = await TelegramService.clients[bot_name].sendMessage(
            idChat,
            response,
            { parse_mode: 'Markdown' },
          );
          if (media) {
            await Promise.all(
              media.media.map(async (file) => {
                await this.sendAttachment({
                  chatId: idChat,
                  bot_name,
                  file_id: file.file_id,
                  contentType: file.type,
                });
              }),
            );
          }
          messageIds.push(sent.message_id);
        } catch (error) {
          console.log({
            origin: 'telegarm: sendMessage sending',
            content: error.message,
            chatID: chatId[index],
          });
        }
      }
      return messageIds;
    } catch (err) {
      console.log({
        origin: 'telegarm: sendMessage',
        content: err.message,
      });
      return null;
    }
  }
  async sendAttachment(params: {
    bot_name: string;
    chatId: number;
    document?: Buffer;
    filename?: string;
    contentType: string;
    file_id?: string | Buffer;
  }): Promise<number> {
    try {
      const { chatId, document, bot_name, filename, contentType, file_id } =
        params;
      let sentMessage = null;
      switch (contentType) {
        case 'image':
          sentMessage = await TelegramService.clients[bot_name].sendPhoto(
            chatId,
            file_id,
          );
          break;
        case 'video':
          sentMessage = await TelegramService.clients[bot_name].sendVideo(
            chatId,
            file_id,
          );
          break;
        case 'document':
          sentMessage = await TelegramService.clients[bot_name].sendDocument(
            chatId,
            document,
            undefined,
            {
              filename,
              contentType: contentType,
            },
          );
          break;
      }
      return sentMessage.message_id;
    } catch (err) {
      console.log({
        origin: 'telegarm: sendDocument',
        content: err.message,
      });
      return null;
    }
  }
}
