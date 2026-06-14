import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly apiKey = process.env.RESEND_API_KEY;
  private readonly from = process.env.RESEND_FROM ?? 'StayHub <noreply@resend.dev>';

  async sendPasswordReset(
    email: string,
    resetUrl: string,
  ): Promise<{ skipped: boolean }> {
    if (!this.apiKey) {
      console.log(`[PasswordReset] No RESEND_API_KEY. Link for ${email}: ${resetUrl}`);
      return { skipped: true };
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: email,
        subject: 'Recupera tu contraseña — StayHub',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
            <h2 style="font-size:20px;margin-bottom:8px">Recupera tu contraseña</h2>
            <p style="color:#555;margin-bottom:24px">
              Haz clic en el botón para crear una nueva contraseña. El enlace expira en 1 hora.
            </p>
            <a href="${resetUrl}"
               style="display:inline-block;background:#0f766e;color:#fff;padding:12px 24px;
                      border-radius:8px;text-decoration:none;font-weight:600">
              Restablecer contraseña
            </a>
            <p style="color:#999;font-size:12px;margin-top:24px">
              Si no solicitaste esto, ignora este correo.
            </p>
          </div>
        `,
      }),
    });

    return { skipped: false };
  }
}
