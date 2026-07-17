import {
  All,
  Controller,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AppEnv } from '../../config/env.validation';

/**
 * Proxy transparente para a Evolution API.
 * Rota: /api/evolution/** → http://evolution:8080/**
 * A API key é injetada no backend — nunca exposta ao cliente.
 */
@Controller('evolution')
@UseGuards(JwtAuthGuard)
export class EvolutionController {
  private readonly logger = new Logger(EvolutionController.name);
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(config: ConfigService<AppEnv, true>) {
    this.baseURL = config.get('EVOLUTION_API_URL', { infer: true });
    this.apiKey = config.get('EVOLUTION_API_KEY', { infer: true });
  }

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.params[0] || '';
    const url = `${this.baseURL}/${path}`;
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';

    this.logger.debug(`PROXY ${req.method} ${url}${qs}`);

    try {
      const fetchRes = await fetch(`${url}${qs}`, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      });

      const text = await fetchRes.text();
      res.status(fetchRes.status).set('Content-Type', 'application/json').send(text);
    } catch (err: any) {
      this.logger.error(`Proxy error: ${err.message}`);
      res.status(502).json({ message: 'Evolution API indisponível' });
    }
  }
}
