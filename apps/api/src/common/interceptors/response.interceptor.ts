import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        // If the controller already returns { data, meta } shape, pass through
        if (value && typeof value === 'object' && 'data' in value) {
          return value;
        }
        // Otherwise wrap it
        return { data: value };
      }),
    );
  }
}
