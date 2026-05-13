import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const globalForMailer = globalThis as unknown as {
  mailer: Transporter | null;
  mailerInited: boolean;
};

function getTransport(): Transporter | null {
  if (globalForMailer.mailerInited) return globalForMailer.mailer;
  globalForMailer.mailerInited = true;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    globalForMailer.mailer = null;
    console.warn('[email] SMTP 未配置，邮件将仅打印到日志（缺少 SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS）');
    return null;
  }

  const portNum = parseInt(port, 10);
  globalForMailer.mailer = nodemailer.createTransport({
    host,
    port: portNum,
    secure: portNum === 465,
    auth: { user, pass },
  });
  return globalForMailer.mailer;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<void> {
  const transport = getTransport();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@example.com';

  if (!transport) {
    console.log('[email/dev]', { to, subject });
    return;
  }

  try {
    await transport.sendMail({
      from,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, ''),
    });
  } catch (err) {
    console.error('[email] 发送失败:', err);
  }
}

export function buildMentionEmail(params: {
  mentionedUsername: string;
  actorUsername: string;
  postTitle: string;
  commentContent: string;
  postUrl: string;
}): { subject: string; html: string } {
  const { mentionedUsername, actorUsername, postTitle, commentContent, postUrl } = params;
  const safeContent = commentContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return {
    subject: `${actorUsername} 在评论中提到了你`,
    html: `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111; font-size: 18px;">嗨，${mentionedUsername} 👋</h2>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          <strong>${actorUsername}</strong> 在文章 <em>《${postTitle}》</em> 的评论中提到了你：
        </p>
        <blockquote style="margin: 16px 0; padding: 12px 16px; background: #f7f8fa; border-left: 3px solid #3b82f6; color: #333; font-size: 14px; line-height: 1.6;">
          ${safeContent}
        </blockquote>
        <p style="margin: 24px 0;">
          <a href="${postUrl}" style="display: inline-block; padding: 8px 20px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">
            前往查看
          </a>
        </p>
        <p style="color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px;">
          这封邮件由博客系统自动发送，请勿直接回复。
        </p>
      </div>
    `,
  };
}
