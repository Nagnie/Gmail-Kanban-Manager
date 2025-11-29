/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from 'src/common/response.dto';

@Injectable()
export class TransformInterceptor<T> 
  implements NestInterceptor<T, ApiResponse<T>> {

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {

    const httpCtx = context.switchToHttp();
    const response = httpCtx.getResponse();
    const request = httpCtx.getRequest();

    const statusCode = response.statusCode;
    const message = statusCode === 201 ? 'Created successfully' : 'OK';

    return next.handle().pipe(
      map(data => ({
        status: 'success',
        message: message,
        data: data,
        metadata: {
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      })),
    );
  }
}