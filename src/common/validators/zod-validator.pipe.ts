/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  PipeTransform,
  ArgumentMetadata,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, _: ArgumentMetadata) {
    const parsedValidation = this.schema.safeParse(value);
    if (!parsedValidation.success) {
      const error = parsedValidation.error;
      const errorMessages = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      if (error.issues.every((v) => !v.path.length)) {
        return value;
      }
      throw new UnprocessableEntityException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }
    return parsedValidation.data;
  }
}
