import { HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { existsSync, mkdirSync } from 'fs';
import multer, { diskStorage } from 'multer';

export const multerConfig = {
  dest: './uploads',
};

export const multerOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req: Request, file: Express.Multer.File, cb: Function) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
      cb(null, true);
    } else {
      cb(
        new HttpException(
          'Invalid file type. Only JPG, JPEG, PNG and GIF are allowed.',
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },
  storage: diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: Function) => {
      const uploadPath = multerConfig.dest;
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },

    filename: (req: Request, file: Express.Multer.File, cb: Function) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
};
