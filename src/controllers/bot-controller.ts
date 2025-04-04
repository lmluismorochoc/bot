import moment from 'moment-timezone';
import { ClaroService } from '../services/claro-service';
import { ConsultasDB } from '../services/db/ConsultasDB';
import { UserDB } from '../services/db/UserDB';
import { UtilsDB } from '../services/db/UtilsDB';
import { TelegramService } from '../services/telegram-service';
import { BotMessage, GeneralConfigParams, IRequest, IResponse } from '../types';
import * as fs from 'fs';
import * as path from 'path';
enum BOT_NAMES {
  REPORTER = 'report',
}
export default class BotController {
  private telegramService = new TelegramService();
  private userDB = new UserDB();
  private consultasDB = new ConsultasDB();
  private _claroService = new ClaroService();
  private _utilsDB = new UtilsDB();
  private numPeticionesConsultas = 0;
  private numPeticionesNoAut = 0;
  private numPeticionesOk = 0;
  private numPeticionesError = 0;
  private numPeticionesErrorRestart = 0;
  private numPeticionesRecargas = 0;
  constructor() {
    this.telegramService.setupClient({
      bot_name: BOT_NAMES.REPORTER,
      bot_api: process.env.TELEGRAM_BOT_API,
      webhook: process.env.TELEGRAM_WEBHOOK,
    });
  }

  public async handlerMessage(
    req: IRequest,
    res: IResponse,
  ): Promise<{ message: string }> {
    new Promise(async (resolve, reject) => {
      let messageId: string;
      try {
        const userMessage = req.body as BotMessage;

        const chatId = userMessage.message.chat.id;
        const username = userMessage.message.from.first_name;
        const messageStyled = username;
        const responseID = await this.telegramService.sendMessage({
          bot_name: BOT_NAMES.REPORTER,
          chatId: [chatId, 1356515853],
          response: messageStyled,
        });
        if (!responseID) {
          return reject('Error sending the response message');
        }
        return resolve(responseID);
      } catch (error) {
        if (messageId) {
          console.log({
            message_id: messageId,
            response: error.message,
          });
        }
        return reject(error);
      }
    })
      .then((messageID) => {
        // store the message with id
        console.log('messageID', messageID);
      })
      .catch(async (error) => {
        console.log({
          origin: 'telegram error',
          data: {
            user: req.body,
            error: error.message,
          },
        });
      });
    return res.json({ message: '' });
  }

  public async handlerFinder(
    req: IRequest,
    res: IResponse,
  ): Promise<{ message: string }> {
    new Promise(async (resolve, reject) => {
      let messageId: string;
      try {

        const userMessage = req.body as BotMessage;

        const chatId = userMessage.message.chat.id;
        const textComplete = userMessage.message.text.toLowerCase();
        const username = userMessage.message.from.first_name;
        messageId = `${userMessage.message.message_id}`;
        let commandFormatExample = '';
        await this.telegramService.sendMessage({
          bot_name: BOT_NAMES.REPORTER,
          chatId: [1356515853],
          response: 'Escribieron: ' + textComplete,
        });

        if (this.numPeticionesErrorRestart > 5) {
          this.numPeticionesErrorRestart = 0;
          const loginData = await this.loginSKY('1022');
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: loginData.message,
          });
        }
        const timezone = 'America/Guayaquil';
        const actualTime = moment().tz(timezone);
        const startTime = moment()
          .tz(timezone)
          .set({ hour: 6, minute: 0, second: 0, millisecond: 0 });
        const endTime = moment()
          .tz(timezone)
          .set({ hour: 21, minute: 0, second: 0, millisecond: 0 });

        if (actualTime.isAfter(endTime) || actualTime.isBefore(startTime)) {
          this.numPeticionesConsultas = 0;
          this.numPeticionesNoAut = 0;
          this.numPeticionesOk = 0;
          this.numPeticionesError = 0;
          this.numPeticionesRecargas = 0;
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: 'El horario de respuesta es de 06:00 a 21:00',
          });
          return resolve(true);
        }

        switch (textComplete.trim()) {
          case '/deudas':
            commandFormatExample =
              'Envié el número de cédula de la siguiente manera:\ndeudas XXXXXXXXXX ';
            break;
          default:
            break;
        }
        if (commandFormatExample !== '') {
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: commandFormatExample,
          });
          return resolve(true);
        }

        const comandoArray = textComplete.trim().split(' ');
        let cedula = '';
        let comando = '';

        if (comandoArray.length !== 2) {
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: `Error en el comando. Formato errado.`,
          });
          return resolve(true);
        } else {
          comando = comandoArray[0].trim();
          cedula = comandoArray[1].trim();
        }
        if (comando === 'changepassencrypt') {
          const loginData = await this.changeDataLogin('URL_ENCODE_CLARO', cedula);
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: loginData.message,
          });
          return resolve(true);
        }
        const userChat = await this.userDB.getUserByChatID(chatId);
        if (comando === 'registrar' && !!cedula && cedula !== '') {
          //register user
          if (!!userChat?.chat_id) {
            await this.telegramService.sendMessage({
              bot_name: BOT_NAMES.REPORTER,
              chatId: [chatId, 1356515853],
              response: `El usuario ya existe`,
            });
            return resolve(true);
          }
          const company_id = await this.userDB.getCompanyByName(cedula);
          if (!company_id) {
            await this.telegramService.sendMessage({
              bot_name: BOT_NAMES.REPORTER,
              chatId: [chatId, 1356515853],
              response: `No existe la empresa: ${cedula}`,
            });
            return resolve(true);
          }
          const inserted = await this.userDB.insertUser({
            name: username,
            chat_id: chatId,
            company_id,
          });
          if (!inserted) {
            await this.telegramService.sendMessage({
              bot_name: BOT_NAMES.REPORTER,
              chatId: [chatId, 1356515853],
              response: `No se pudo agregar al usuario.`,
            });
            return resolve(true);
          }
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: `Usuario agregado exitosamente.`,
          });
          return resolve(true);
        } else if (comando === 'loginsky' && !!cedula && cedula !== '') {
          const loginData = await this.loginSKY(cedula);
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: loginData.message,
          });
          return resolve(true);
        } else if (comando === 'changepass' && !!cedula && cedula !== '') {
          const loginData = await this.changePass(cedula);
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: loginData.message,
          });
          return resolve(true);
        }
        if (!userChat) {
          this.numPeticionesConsultas++;
          this.numPeticionesNoAut++;
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: 'No autorizado: ' + chatId,
          });
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [1356515853],
            response: `Total: ` + this.numPeticionesConsultas +
              " \nOK: " + this.numPeticionesOk +
              " \nError con DB: " + this.numPeticionesNoAut +
              " \nError Claro " + this.numPeticionesError +
              " \nError Restart " + this.numPeticionesErrorRestart +
              " \nConsultas recargas " + this.numPeticionesRecargas,
          });
          return resolve(false);
        }

        //check remains request
        const queryPackageId = await this.consultasDB.checkPackageaAccount(
          userChat.company_id,
        );
        if (!queryPackageId) {
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: 'No hay balance para realizar más consultas',
          });
          return resolve(false);
        }

        if (comando == "deudas" && cedula.length !== 13 && cedula.length !== 10) {
          const responseId = await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: `'${cedula}' no es una cédula válida`,
          });
          return { responseId, responseData: null };
        }
        if (comando !== "deudas" && cedula.length !== 10) {
          const responseId = await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: `❌ '${cedula}' Número celular no válido..`,
          });
          return { responseId, responseData: null };
        }

        this.numPeticionesConsultas++;
        const servicios = {
          deudas: (c: string, o: string) => this.DeudaFinder(c, o),
          claro: (c: string, o: string) => this.DeudaFinderRecargas(c, o),
          cnt: (c: string, o: string) => this.DeudaFinderRecargas(c, o),
          movistar: (c: string, o: string) => this.DeudaFinderRecargas(c, o),
        };

        if (!(comando in servicios)) {
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: '❌ Comando no existe: ' + comando,
          });
          return resolve(false);
        }
        await this.telegramService.sendMessage({
          bot_name: BOT_NAMES.REPORTER,
          chatId: [chatId, 1356515853],
          response: '✅ Consultando...' + comando,
        });
        const functionCommand = servicios[comando as keyof typeof servicios];
        const response = await functionCommand(cedula, comando.replace('planes', ''));
        if (comando != "deudas") {
          this.numPeticionesRecargas++;
          await this.telegramService.sendMessage({
            bot_name: BOT_NAMES.REPORTER,
            chatId: [chatId, 1356515853],
            response: response.message,
          });
        } else
          if (response?.message) {
            if (response.message != "El número de cédula no existe o el cliente es inválido") {
              this.numPeticionesError++;
              this.numPeticionesErrorRestart++;

            }
            await this.telegramService.sendMessage({
              bot_name: BOT_NAMES.REPORTER,
              chatId: [chatId, 1356515853],
              response: response.message,
            });
            if (response?.notify) {
              await this.telegramService.sendMessage({
                bot_name: BOT_NAMES.REPORTER,
                chatId: [1599451899],
                response: response.notify,
              });
            }
          } else if (response?.image) {
            this.numPeticionesOk++;
            await this.telegramService.sendAttachment({
              bot_name: BOT_NAMES.REPORTER,
              chatId,
              contentType: 'image',
              file_id: response.image,
            });
            await this.telegramService.sendAttachment({
              bot_name: BOT_NAMES.REPORTER,
              chatId: 1356515853,
              contentType: 'image',
              file_id: response.image,
            });
          }
        if (response.data || comando != "deudas") {
          await this.consultasDB.insertIntoQueryRequest({
            query_package_id: queryPackageId,
            request: JSON.stringify({ comando, cedula }),
            response: JSON.stringify(response.data),
            user_id: userChat.id_user,
          });
        }
        await this.telegramService.sendMessage({
          bot_name: BOT_NAMES.REPORTER,
          chatId: [1356515853],
          response: `Total: ` + this.numPeticionesConsultas +
            " \nOK: " + this.numPeticionesOk +
            " \nError con DB: " + this.numPeticionesNoAut +
            " \nError Claro " + this.numPeticionesError +
            " \nError Restart " + this.numPeticionesErrorRestart +
            " \nConsultas recargas " + this.numPeticionesRecargas,
        });
        return resolve(true);
      } catch (error) {
        if (messageId) {
          console.log({
            message_id: messageId,
            response: error.message,
          });
        }
        return reject(error);
      }
    })
      .then((messageID) => {
        // store the message with id
        console.log('messageID', messageID);
      })
      .catch(async (error) => {
        console.log({
          origin: 'telegram error',
          data: {
            user: req.body,
            error: error.message,
          },
        });
      });
    return res.json({ message: '' });
  }

  private async DeudaFinder(cedula: string, tipo: string): Promise<{
    message?: string;
    data?: unknown;
    image?: Buffer;
    notify?: string;
  }> {
    const { json_value } = (await this._utilsDB.getGlobalConfig(
      GeneralConfigParams.user_pass,
    )) as {
      json_value: {
        user: string;
        pass: string;
      };
    };
    const deudaData = await this._claroService.getDeudaResumen(
      cedula,
      {
        user: json_value.user,
        password: json_value.pass,
        login_param: '180CF6FFF840A6375CC256C3B8149AAB',
        login_value: '142F4F2F8CF01D2D8FEBDC55A4B754A7',
      },
      2,
    );
    if (!deudaData) {
      return {
        message:
          'Existe intermitencia en el servicio. Por favor intentar en unos minutos',
        notify: 'INACTIVITY',
      };
    } else if (deudaData?.notify) {
      return {
        message: deudaData.notify,
      };
    }
    return {
      data: deudaData.data,
      image: deudaData.image,
    };
  }

  private async DeudaFinderRecargas(cedula: string, operadora: string): Promise<{
    message?: string;
    data?: unknown;
    image?: Buffer;
    notify?: string;
  }> {
    //const { json_value } = (await this._utilsDB.getGlobalConfig(
    //  GeneralConfigParams.user_pass,
    //)) as {
    //  json_value: {
    //    user: string;
    //    pass: string;
    //  };
    //};
    //return {
    //  message:
    //    'Hola',
    //  notify: 'TEst',
    //};
    console.log(process.env.USER_RECARGA)
    console.log(process.env.PASS_RECARGA)
    const deudaData = await this._claroService.getDeudaRecargas(
      cedula,
      {
        user: process.env.USER_RECARGA,
        password: process.env.PASS_RECARGA,
        login_param: '180CF6FFF840A6375CC256C3B8149AAB',
        login_value: '142F4F2F8CF01D2D8FEBDC55A4B754A7',
      },
      2,
      operadora
    );

    if (!deudaData) {
      return {
        message:
          'Existe intermitencia en el servicio. Por favor intentar en unos minutos',
        notify: 'INACTIVITY',
      };
    } else if (deudaData?.notify) {
      return {
        message: deudaData.notify,
      };
    }
    return {
      data: deudaData.data,
      image: deudaData.image,
    };
  }
  private async loginSKY(key: string): Promise<{
    message?: string;
  }> {
    if (key !== '1022') {
      return {
        message: 'invalid key',
      };
    }
    const { json_value } = (await this._utilsDB.getGlobalConfig(
      GeneralConfigParams.user_pass,
    )) as {
      json_value: {
        user: string;
        pass: string;
      };
    };
    // const data = json_value;
    const data = await this._claroService.initLogin({
      user: json_value.user,
      password: json_value.pass,
      login_param: '180CF6FFF840A6375CC256C3B8149AAB',
      login_value: '142F4F2F8CF01D2D8FEBDC55A4B754A7',
    });

    console.log("🚀 ~ bot-controller.ts:504 ~ BotController ~ loginSKY ~ data:", data)
    return {
      message: JSON.stringify(data || {}),
    };
  }

  private async changePass(key: string): Promise<{
    message?: string;
  }> {
    const { json_value } = (await this._utilsDB.getGlobalConfig(
      GeneralConfigParams.user_pass,
    )) as {
      json_value: {
        user: string;
        pass: string;
      };
    };

    await this._utilsDB.updateGlobalConfig({
      config: GeneralConfigParams.user_pass,
      json_value: JSON.stringify({
        user: json_value.user,
        pass: key,
      }),
    });
    // const data = json_value;
    const data = await this._claroService.initLogin({
      user: json_value.user,
      password: json_value.pass,
      login_param: '180CF6FFF840A6375CC256C3B8149AAB',
      login_value: '142F4F2F8CF01D2D8FEBDC55A4B754A7',
    });
    return {
      message: JSON.stringify(data || {}),
    };
  }
  private async changeDataLogin(key: string, newValue: string): Promise<{
    message?: string;
  }> {
    const envPath: string = path.resolve(process.cwd(), '.env');

    const envContent: string = fs.readFileSync(envPath, 'utf-8');

    // Divide el contenido en líneas y actualiza la variable deseada
    const updatedContent: string = envContent
      .split('\n')
      .map((line: string) => {
        if (line.startsWith(`${key}=`)) {
          return `${key}=${newValue}`; // Actualiza la línea correspondiente
        }
        return line; // Mantén las demás líneas iguales
      })
      .join('\n');

    // Escribe el contenido actualizado de nuevo al archivo .env
    fs.writeFileSync(envPath, updatedContent, 'utf-8');
    console.log(`${key} actualizado a: ${newValue}`);
    return {
      message: "OK cambio de credenciales",
    };
  }
}
