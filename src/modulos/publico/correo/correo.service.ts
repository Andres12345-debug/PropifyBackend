import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class CorreoService {
  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,

    port: Number(process.env.MAIL_PORT),

    secure: false,

    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  public async enviarCorreo(
    destinatario: string,
    asunto: string,
    html: string,
  ) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: destinatario,
      subject: asunto,
      html,
    });
  }
}
