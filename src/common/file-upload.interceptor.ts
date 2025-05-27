import {
  Injectable,
  NestInterceptor,
  Type,
  mixin,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerOptions } from './utils/multer.utils';

interface FieldConfig {
  name: string;
  maxCount?: number;
}

export function FileFieldsUploadInterceptor(
  fields: FieldConfig[],
): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    private readonly interceptor: NestInterceptor;

    constructor() {
      const targetClass = FileFieldsInterceptor(fields, multerOptions);
      this.interceptor = new targetClass();
    }

    intercept(context: ExecutionContext, next: CallHandler) {
      return this.interceptor.intercept(context, next);
    }
  }

  return mixin(Interceptor);
}
