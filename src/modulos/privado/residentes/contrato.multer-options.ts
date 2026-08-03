import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const DIRECTORIO_CONTRATOS = join(process.cwd(), 'uploads', 'contratos');

const EXTENSIONES_PERMITIDAS = new Set(['.pdf', '.doc', '.docx']);
const MIMETYPES_PERMITIDOS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const OPCIONES_MULTER_CONTRATO: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _archivo, callback) => {
      if (!existsSync(DIRECTORIO_CONTRATOS)) {
        mkdirSync(DIRECTORIO_CONTRATOS, { recursive: true });
      }
      callback(null, DIRECTORIO_CONTRATOS);
    },
    filename: (_req, archivo, callback) => {
      callback(null, `${randomUUID()}${extname(archivo.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, archivo, callback) => {
    const extension = extname(archivo.originalname).toLowerCase();
    if (
      !EXTENSIONES_PERMITIDAS.has(extension) ||
      !MIMETYPES_PERMITIDOS.has(archivo.mimetype)
    ) {
      callback(
        new BadRequestException('El contrato debe ser un archivo PDF o Word (.pdf, .doc, .docx)'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
