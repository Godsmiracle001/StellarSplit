import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import xssClean from 'xss-clean';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly enableCsrf =
    process.env.SECURITY_CSRF?.toLowerCase() === 'true';

  private readonly helmetHandler = helmet({
    contentSecurityPolicy: false,
  });

  private readonly xssCleanHandler = xssClean();

  private readonly rateLimitHandler = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  });

  private readonly csrfHandler = csrf({
    cookie: true,
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  });

  use(req: Request, res: Response, next: NextFunction): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.helmetHandler(req as any, res as any, (helmetError?: Error) => {
      if (helmetError) return next(helmetError);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.xssCleanHandler(req as any, res as any, (xssError?: Error) => {
        if (xssError) return next(xssError);

        if (this.isProduction) {
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains',
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.rateLimitHandler(req as any, res as any, (rateLimitError?: Error) => {
          if (rateLimitError) return next(rateLimitError);

          if (this.enableCsrf) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.csrfHandler(req as any, res as any, next);
          } else {
            next();
          }
        });
      });
    });
  }
}
