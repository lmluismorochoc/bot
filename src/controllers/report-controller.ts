import { GeneralConfigParams, IRequest, IResponse } from '../types';

import { ClaroService } from '../services/claro-service';
import { UtilsDB } from '../services/db/UtilsDB';
import { TelegramService } from '../services/telegram-service';

enum BOT_NAMES {
  REPORTER = 'report',
}
export default class ReportController {
  private claroService = new ClaroService();
  private _utilsDB = new UtilsDB();
  private telegramService = new TelegramService();
  public async testClaro(
    req: IRequest,
    res: IResponse,
  ): Promise<{ message: string }> {
    const { json_value } = (await this._utilsDB.getGlobalConfig(
      GeneralConfigParams.user_pass,
    )) as {
      json_value: {
        user: string;
        pass: string;
      };
    };
    const data = await this.claroService.initLogin({
      user: json_value.user,
      password: json_value.pass,
      login_param: '180CF6FFF840A6375CC256C3B8149AAB',
      login_value: '142F4F2F8CF01D2D8FEBDC55A4B754A7',
    });
    return res.json({ data });
  }

  public async keepAlive(
    _req: IRequest,
    res: IResponse,
  ): Promise<{ message: string }> {
    const { json_value } = (await this._utilsDB.getGlobalConfig(
      GeneralConfigParams.user_pass,
    )) as {
      json_value: {
        user: string;
        pass: string;
      };
    };
    const deudaData = await this.claroService.getDeudaResumen(
      '0910816073',
      {
        user: json_value.user,
        password: json_value.pass,
        login_param: '180CF6FFF840A6375CC256C3B8149AAB',
        login_value: '142F4F2F8CF01D2D8FEBDC55A4B754A7',
      },
      1,
    );
    if (deudaData?.notify) {
      await this.telegramService.sendMessage({
        bot_name: BOT_NAMES.REPORTER,
        chatId: [1599451899],
        response: deudaData.notify,
      });
    }

    return res.json({ result: !!deudaData?.image });
  }
}
