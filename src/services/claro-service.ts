/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClaroCredentials, GeneralConfigParams } from '../types';
import { RestClientService } from './restclient-service';
import { UtilsDB } from './db/UtilsDB';
import qs from 'qs';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer';
import FormData from 'form-data';
const cheerio = require('cheerio');

const request = require('request-promise-native');


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
  private keyRecargas = '';
  private numero = 0;
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
        service: process.env.URL_ENCODE_CLARO,
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
          }, 5 * 1000);
        });
        await this.initLogin(credentials);
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 2 * 1000);
        });
        return this.getDeudaResumen(identificacion, credentials, tries - 1);
      }

      if (err.message === 'INACTIVITY' && tries > 0) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 10 * 1000);
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

  async getDeudaRecargas(
    identificacion: string,
    credentials: ClaroCredentials,
    tries: number,
    operadora: string
  ): Promise<{
    image: Buffer;
    data: { [k: string]: string }[];
    notify?: string;
  }> {
    try {


      let data = new FormData();
      if (this.keyRecargas == '') {
        this.numero++;
        console.log(new Date() + " --- Creando nueva llave " + this.numero)
        const options = {
          'method': 'POST',
          'url': 'https://www.redcargamovil.com/Account/Login.aspx',
          'headers': {},
          formData: {
            'ctl00$MainContent$LoginUser$UserName': credentials.user,
            'ctl00$MainContent$LoginUser$Password': credentials.password,
            '__EVENTTARGET': 'ctl00$MainContent$LoginUser$LoginButton',
            '__VIEWSTATE': '/wEPDwULLTEzMTM3NTkyMDBkZHW3+l8TNE6q++3leF+kC2JYTfJNToUZxyfYmo+/G0fX',
            '__EVENTVALIDATION': '/wEdAAQTtll6F90chS77zpvlN6/brVJzD9epthGmOWrcxXKP7u1vquycB/s6+IJJa4hgd+gJC0fyV4ZBOIwKeEy7g7cRSLdjcdmQ/vpuQZ0oed9J08/T7i4Q++Qz4kSUwHwauZM='
          },
          resolveWithFullResponse: true,
          simple: false
        };
        const response = await request(options);

        try {
          if (response.headers['set-cookie']) {
            const cookies = response.headers['set-cookie'];
            const cookiesString = cookies
              .map((cookie: string) => cookie.split(';')[0])
              .join('; ');
            this.keyRecargas = cookiesString;
          } else {
            console.log("No cookies received");
          }
        } catch (error) {
          console.error("Error occurred in login:", error);
        }
      }
      const headers = {
        'Cookie': this.keyRecargas,
        'Content-Type': 'multipart/form-data; boundary=--------------------------330610164082089315997925',
        ...data.getHeaders()
      };
      let ruta = '';
      let idServicios = 0;
      if (operadora == 'claro') {
        ruta = '/Account/ServiciosTS.aspx?p=qAk0IKUhCSPtvSzNAHTZkzmxNAMxSgZAp+WTcAdbP8I%3d'
        idServicios = 2331
      } else if (operadora == 'cnt') {
        idServicios = 2652
        ruta = '/Account/ServiciosTS.aspx?p=SCMk+ho0xunmDs+4EtxLC3ksz8u3Q6Tjva6ySG+9iXo='
      } else {
        idServicios = 2505
        ruta = '/Account/ServiciosTS.aspx?p=oFq06R7IZnGimpoNSjhSXlAB+mI9O1WXTsVwz7FH9Ug%3d'

      }

      const deudaHTML = await this.restClient.callService({
        baseURL: "https://www.redcargamovil.com",
        service: ruta,
        method: 'post',
        body: data,
        headers,
      });
      const $ = cheerio.load(deudaHTML);

      //console.log(deudaHTML.data);
      const formAction = $('form').attr('action');

      if (formAction.includes('Login.aspx')) {
        this.keyRecargas = '';
        return null;
      }

      // Crea un objeto para almacenar los datos del formulario
      const formData: { [key: string]: any } = {};
      $('form input').each((_: any, input: any) => {
        const name = $(input).attr('name');
        const value = $(input).attr('value') || '';
        if (name) {
          formData[name] = value;
        }
      });
      formData['ctl00$MainContent$cboOperador'] = idServicios; //cnt 2652
      formData['ctl00$MainContent$txtReferencia1'] = identificacion;

      // Imprime los datos del formulario


      const deudaHTMLs = await this.restClient.callService({
        baseURL: "https://www.redcargamovil.com",
        service: '/Account/ServiciosTS.aspx?' + formAction.split('?')[1],
        method: 'post',
        body: formData,
        headers,
      });

      const $$ = cheerio.load(deudaHTMLs);

      const errorMsg = $$('#MainContent_lblMsgError').text().trim();
      const valor = $$('#MainContent_lblValorPendiente').text().trim();

      // Extraer la comisión
      const nombre = $$('#MainContent_lblNombreCliente').text().trim();

      console.log('Valor:', valor);       // Salida esperada: 10.72
      console.log('nombre:', nombre); // Sal
      console.log('Mensaje de error:', errorMsg);

      if (!valor && !nombre && !errorMsg)
        return null
      return {
        image: null,
        data: null,
        notify: errorMsg ? "**Número:** " + identificacion + "\n**Mensaje:** " + errorMsg : "**Número:** " + identificacion + "\n**Cliente:** " + nombre + "\n**Deuda**: " + valor,
      };
    } catch (err) {
      this.keyRecargas = '';
      console.log(identificacion, err.message);
      return null;
    }
  }

}
