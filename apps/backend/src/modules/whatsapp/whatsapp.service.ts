import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import type { AppEnv } from '../../config/env.validation';

interface SendTextResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly http: AxiosInstance;
  private readonly instance: string;

  constructor(config: ConfigService<AppEnv, true>) {
    const baseURL = config.get('EVOLUTION_API_URL', { infer: true });
    const apiKey = config.get('EVOLUTION_API_KEY', { infer: true });
    this.instance = config.get('EVOLUTION_INSTANCE', { infer: true });

    this.http = axios.create({
      baseURL,
      headers: { apikey: apiKey },
      timeout: 15_000,
    });
  }

  /**
   * Envia mensagem de texto via Evolution API v2.x
   * POST /message/sendText/{instanceName}
   */
  async sendText(phone: string, text: string): Promise<SendTextResult> {
    try {
      const { data } = await this.http.post(
        `/message/sendText/${this.instance}`,
        {
          number: `${phone}@s.whatsapp.net`,
          text,
        },
      );

      const messageId = data?.key?.id ?? data?.messageId ?? null;
      this.logger.log(`Mensagem enviada para ${phone} [${messageId}]`);

      return { success: true, messageId };
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Erro desconhecido';
      this.logger.error(`Falha ao enviar para ${phone}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Checa status da conexão da instância.
   * GET /instance/connectionState/{instanceName}
   */
  async getConnectionState(): Promise<string> {
    try {
      const { data } = await this.http.get(
        `/instance/connectionState/${this.instance}`,
      );
      return data?.instance?.state ?? 'unknown';
    } catch {
      return 'error';
    }
  }

  /**
   * Verifica se um número está registrado no WhatsApp.
   * POST /chat/whatsappNumbers/{instanceName}
   */
  async isOnWhatsapp(phone: string): Promise<boolean> {
    try {
      const { data } = await this.http.post(
        `/chat/whatsappNumbers/${this.instance}`,
        { numbers: [`${phone}@s.whatsapp.net`] },
      );
      return Array.isArray(data) && data.some((d: any) => d.exists === true);
    } catch {
      return false;
    }
  }
}
