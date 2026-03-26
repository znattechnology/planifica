const BRAND_COLOR = '#34D399';
const BRAND_NAME = 'Planifica';

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:28px;font-weight:700;color:${BRAND_COLOR};letter-spacing:-0.5px;">
                ${BRAND_NAME}
              </span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#141414;border:1px solid #262626;border-radius:12px;padding:36px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#525252;">
                &copy; ${new Date().getFullYear()} ${BRAND_NAME}. Todos os direitos reservados.
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#525252;">
                Plataforma de planificação educacional para professores angolanos.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function passwordResetTemplate(resetUrl: string): { subject: string; html: string } {
  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fafafa;">
      Recuperar palavra-passe
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a3a3a3;line-height:1.6;">
      Recebemos um pedido para redefinir a palavra-passe da sua conta Planifica.
      Clique no botão abaixo para criar uma nova palavra-passe.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding-bottom:24px;">
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 32px;background-color:${BRAND_COLOR};color:#000000;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
            Redefinir palavra-passe
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:13px;color:#737373;line-height:1.5;">
      Se o botão não funcionar, copie e cole este link no seu navegador:
    </p>
    <p style="margin:0 0 24px;font-size:12px;color:${BRAND_COLOR};word-break:break-all;">
      ${resetUrl}
    </p>
    <div style="border-top:1px solid #262626;padding-top:16px;">
      <p style="margin:0;font-size:12px;color:#525252;line-height:1.5;">
        Este link expira em <strong style="color:#a3a3a3;">1 hora</strong>.
        Se não solicitou esta alteração, ignore este email — a sua conta permanece segura.
      </p>
    </div>
  `);

  return {
    subject: 'Redefinir a sua palavra-passe — Planifica',
    html,
  };
}

export function verificationCodeTemplate(code: string, name: string): { subject: string; html: string } {
  const firstName = name.split(' ')[0];
  const digits = code.split('').map(d => `
    <td style="width:48px;height:56px;background-color:#1a1a1a;border:2px solid #333;border-radius:8px;text-align:center;vertical-align:middle;">
      <span style="font-size:28px;font-weight:700;color:${BRAND_COLOR};letter-spacing:2px;">${d}</span>
    </td>
  `).join('<td style="width:8px;"></td>');

  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fafafa;">
      Verificar o seu email
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a3a3a3;line-height:1.6;">
      Olá <strong style="color:#fafafa;">${firstName}</strong>, utilize o código abaixo para verificar a sua conta Planifica.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding-bottom:24px;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>${digits}</tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="border-top:1px solid #262626;padding-top:16px;">
      <p style="margin:0;font-size:12px;color:#525252;line-height:1.5;">
        Este código expira em <strong style="color:#a3a3a3;">15 minutos</strong>.
        Se não criou uma conta no Planifica, ignore este email.
      </p>
    </div>
  `);

  return {
    subject: `${code} — Código de verificação Planifica`,
    html,
  };
}

export function passwordChangeCodeTemplate(code: string, name: string): { subject: string; html: string } {
  const firstName = name.split(' ')[0];
  const digits = code.split('').map(d => `
    <td style="width:48px;height:56px;background-color:#1a1a1a;border:2px solid #333;border-radius:8px;text-align:center;vertical-align:middle;">
      <span style="font-size:28px;font-weight:700;color:${BRAND_COLOR};letter-spacing:2px;">${d}</span>
    </td>
  `).join('<td style="width:8px;"></td>');

  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fafafa;">
      Confirmar alteração de palavra-passe
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a3a3a3;line-height:1.6;">
      Olá <strong style="color:#fafafa;">${firstName}</strong>, recebemos um pedido para alterar a palavra-passe da sua conta.
      Utilize o código abaixo para confirmar a alteração.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding-bottom:24px;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>${digits}</tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="border-top:1px solid #262626;padding-top:16px;">
      <p style="margin:0;font-size:12px;color:#525252;line-height:1.5;">
        Este código expira em <strong style="color:#a3a3a3;">15 minutos</strong>.
        Se não solicitou esta alteração, ignore este email — a sua palavra-passe permanece inalterada.
      </p>
    </div>
  `);

  return {
    subject: `${code} — Confirmação de alteração de palavra-passe Planifica`,
    html,
  };
}

export function welcomeTemplate(name: string): { subject: string; html: string } {
  const firstName = name.split(' ')[0];

  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fafafa;">
      Bem-vindo ao Planifica!
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a3a3a3;line-height:1.6;">
      Olá <strong style="color:#fafafa;">${firstName}</strong>, a sua conta foi criada com sucesso.
      Está pronto para começar a planear as suas aulas de forma inteligente.
    </p>
    <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#fafafa;">
      O que pode fazer:
    </h2>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#a3a3a3;">
          <span style="color:${BRAND_COLOR};margin-right:8px;">&#10003;</span>
          Gerar planos de aula com inteligência artificial
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#a3a3a3;">
          <span style="color:${BRAND_COLOR};margin-right:8px;">&#10003;</span>
          Criar dosificações e relatórios trimestrais
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#a3a3a3;">
          <span style="color:${BRAND_COLOR};margin-right:8px;">&#10003;</span>
          Exportar tudo para PDF e Word
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="{dashboardUrl}"
             style="display:inline-block;padding:12px 32px;background-color:${BRAND_COLOR};color:#000000;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
            Ir para o painel
          </a>
        </td>
      </tr>
    </table>
  `);

  return {
    subject: `Bem-vindo ao Planifica, ${firstName}!`,
    html,
  };
}
