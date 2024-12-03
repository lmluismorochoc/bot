/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClaroCredentials, GeneralConfigParams } from '../types';
import { RestClientService } from './restclient-service';
import { UtilsDB } from './db/UtilsDB';
import qs from 'qs';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer';

async function htmlToImageBuffer(htmlString: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlString);
  const imageBuffer = await page.screenshot({
    fullPage: true,
  });
  await browser.close();
  return imageBuffer;
}
export class ClaroService {
  private BASE_URL = 'https://portalcrmdas.claro.com.ec';
  private restClient = new RestClientService();
  private utilsDB = new UtilsDB();
  constructor() {
    this.restClient.setupClient();
  }

  async initLogin(credentials: ClaroCredentials): Promise<string> {
    try {
      const { user, password, login_param, login_value } = credentials;
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        Accept: '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
      };
      const data = qs.stringify({
        user: user,
        password: password,
        numIntentos: '1',
        loginAxis: 'LOGIN',
        hostPiranha: 'null',
        puertoPiranha: 'null',
        [login_param]: login_value,
      });
      
      const loginHTML = await this.restClient.callService({
        baseURL: this.BASE_URL,
        service: '/axis/login/gee_login.jsp?919447DD52EC3C46BE7CF7A91F8DA1E8AF4F8AFC3138FD9DEEE447D8D17A993D=null&39A902204B69898D655FC51EC2FB3299DCF2C6863C02ADD58068695F63507750=null&C229CC69C0897F957454E3D198B58BED=D1USKYC5&51BA3746C95DF559FECC42F51B50EA9E=7F7A08E55B4CB32C55635481F48F4721&1CCC2D3A74ACE3B27AA6735D9A1F67F5=F918F72571B706D4BFB804C45E5E7BDBAC0D26FF7E87267AF961A8DCAC46B7A82FEE309C207345F3CC49D1BFB9691D41&BC3F13FDA2DBD5642CF909BEE3667EAA077A81C99F6C1FD06FAAA6B761E04BF6=142F4F2F8CF01D2D8FEBDC55A4B754A7&loginAxis=LOGIN',
        method: 'post',
        headers,
        body: data,
      }); 

      const dom = new JSDOM(loginHTML);
      const document = dom.window.document;
      const positionInit = loginHTML.search('/axis/paginas/general/index.jsp?');
      const positionLast = loginHTML.substring(positionInit).search("';");
      const loginAction = loginHTML
        .substring(positionInit, positionInit + positionLast)
        .replace(/\\x3c/g, '<');

      const inputElements = document.querySelectorAll('form input');
      const inputValues: { [k: string]: string } = {};
      inputElements.forEach((inputElement) => {
        const inputName = inputElement.getAttribute('name');
        const inputValue = (inputElement as any).value;
        inputValues[inputName] = inputValue;
      });
      const dataForm = qs.stringify(inputValues);
      const loggedHtml = await this.restClient.callService({
        baseURL: this.BASE_URL,
        service: loginAction,
        method: 'post',
        headers,
        body: dataForm,
        full_response: true,
      });
      // console.log(loggedHtml.data);
      // console.log(loggedHtml.headers);
      const setCookie = loggedHtml.headers['set-cookie']?.map(
        (cookieLine: string) => cookieLine.split(';')[0],
      );
      const cookie = setCookie.join('; ');
    //  console.log(cookie);
      await this.utilsDB.updateGlobalConfig({
        config: GeneralConfigParams.cl_headers,
        json_value: {
          Cookie: cookie,
          authority: 'portalcrmdas.claro.com.ec',
        },
      });
      return cookie;
    } catch (err) {
      console.log({
        origin: 'CLARO: initLogin',
        content: err.stack || err.message,
      });
      return null;
    }
  }

  async getDeudaResumen(
    identificacion: string,
    credentials: ClaroCredentials,
    tries: number,
  ): Promise<{
    image: Buffer;
    data: { [k: string]: string }[];
    notify?: string;
  }> {
    try {
      const headersConfigs = (await this.utilsDB.getGlobalConfig(
        GeneralConfigParams.cl_headers,
      )) as {
        json_value: object;
      };
      if (!headersConfigs) {
        throw new Error('NO_SESSION');
      }
      const headers = {
        ...headersConfigs.json_value,
        Referer:
          'https://portalcrmdas.claro.com.ec/axis/paginas/cliente/clp_det_deuda.jsp',
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      const dataForm = qs.stringify({
        identificacion,
      });
      console.log({
        baseURL: this.BASE_URL,
        service: '/axis/paginas/cliente/clp_detalle_deuda.jsp',
        method: 'post',
        headers,
        body: dataForm,
      });
      const deudaHTML = await this.restClient.callService({
        baseURL: this.BASE_URL,
        service: '/axis/paginas/cliente/clp_detalle_deuda.jsp',
        method: 'post',
        headers,
        body: dataForm,
      });
      // console.log(deudaHTML);
      const indexNoExist = deudaHTML.indexOf('NullPointerException|ERROR EN:');
      if (indexNoExist !== -1) {
        throw new Error('INVALID_CLIENT');
      }
      const indexReset = deudaHTML.indexOf('maximum open cursors exceeded');
      if (indexReset !== -1) {
        throw new Error('RE_LOGIN');
      }
      const indexInactividad = deudaHTML.indexOf(
        'tiempo maximo de inactividad',
      );
      if (indexInactividad !== -1) {
        throw new Error('INACTIVITY');
      }
      const dom = new JSDOM(deudaHTML);
      const document = dom.window.document;

      const table = document.querySelector('table');
      if (!table) throw new Error('ERRROR_TABLE');
      const rowData: { [k: string]: string }[] = [];
      Array.from(table.querySelectorAll('tr')).map((tr) => {
        const tds = Array.from(tr.querySelectorAll('td'));
        rowData.push({
          parameter: tds[0]?.textContent.trim(),
          value: tds[1]?.textContent.trim(),
          status: tds[2]?.textContent.trim(),
        });
      });

      const bufferImage = await htmlToImageBuffer(deudaHTML);

      return {
        image: bufferImage,
        data: rowData,
      };
    } catch (err) {
      console.log(identificacion, err.message);
      if (err.message === 'NO_SESSION' && tries > 0) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 30000);
        });
        await this.initLogin(credentials);
        return this.getDeudaResumen(identificacion, credentials, tries - 1);
      }
      if (err.message === 'RE_LOGIN' && tries > 0) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 5*1000);
        });
        await this.initLogin(credentials);
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 2*1000);
        });
        return this.getDeudaResumen(identificacion, credentials, tries - 1);
      }
     
      if (err.message === 'INACTIVITY' && tries > 0) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 10*1000);
        });

        // await this.initLogin(credentials);
        // await new Promise((resolve) => {
        //   setTimeout(() => {
        //     resolve(true);
        //   }, 5000);
        // });
        return this.getDeudaResumen(identificacion, credentials, tries - 1);
      } else if (err.message === 'INVALID_CLIENT') {
        return {
          image: null,
          data: null,
          notify: 'El número de cédula no existe o el cliente es inválido',
        };
      }
      return null;
    }
  }
}
