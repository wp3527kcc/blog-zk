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

export function buildVerificationEmail(params: {
  username: string;
  verifyUrl: string;
}): { subject: string; html: string } {
  const { username, verifyUrl } = params;
  return {
    subject: '验证你的邮箱 - Blog ZK',
    html: `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111; font-size: 20px; margin-bottom: 16px;">欢迎加入 Blog ZK，${username}！</h2>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          感谢注册！请点击下方按钮验证你的邮箱地址：
        </p>
        <p style="margin: 28px 0; text-align: center;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 500;">
            验证邮箱
          </a>
        </p>
        <p style="color: #666; font-size: 13px; line-height: 1.6;">
          如果按钮无法点击，请复制以下链接到浏览器打开：
        </p>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 12px; color: #333;">
          ${verifyUrl}
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
          此验证链接 24 小时内有效。如非本人操作，请忽略此邮件。
        </p>
        <p style="color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
          这封邮件由 Blog ZK 系统自动发送，请勿直接回复。
        </p>
      </div>
    `,
  };
}

export function buildResetPasswordEmail(params: {
  username: string;
  resetUrl: string;
}): { subject: string; html: string } {
  const { username, resetUrl } = params;
  return {
    subject: '重置密码 - Blog ZK',
    html: `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111; font-size: 20px; margin-bottom: 16px;">重置密码，${username}</h2>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          你收到了重置密码的请求。请点击下方按钮设置新密码：
        </p>
        <p style="margin: 28px 0; text-align: center;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 500;">
            重置密码
          </a>
        </p>
        <p style="color: #666; font-size: 13px; line-height: 1.6;">
          如果按钮无法点击，请复制以下链接到浏览器打开：
        </p>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 12px; color: #333;">
          ${resetUrl}
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
          此链接 24 小时内有效。如果这不是你本人的操作，请忽略此邮件。
        </p>
        <p style="color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
          这封邮件由 Blog ZK 系统自动发送，请勿直接回复。
        </p>
      </div>
    `,
  };
}
