import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY must be set in environment variables.");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

function getFromEmail(): string {
  return process.env.FROM_EMAIL || "Creative Dhraa <orders@creativedhraa.in>";
}

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmation(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  const { to, customerName, orderNumber, total, items } = params;

  await getResend().emails.send({
    from: getFromEmail(),
    to,
    subject: `Order Confirmed — ${orderNumber}`,
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FAFAF8; color: #1A2E1A;">
        <h1 style="color: #6B8F71; font-size: 24px; margin-bottom: 8px;">Order Confirmed!</h1>
        <p style="color: #6B7280; margin-bottom: 24px;">Thank you, ${customerName}. We're crafting your personalized gift.</p>
        
        <div style="background: #FFFFFF; border: 1px solid #E2E8DF; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #6B7280; font-size: 12px; margin: 0;">Order Number</p>
          <p style="color: #6B8F71; font-size: 20px; font-weight: bold; margin: 4px 0 16px;">${orderNumber}</p>
          
          <div style="border-top: 1px solid #E2E8DF; padding-top: 16px;">
            ${items.map((item) => `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #1A2E1A;">${item.name} x${item.quantity}</span>
                <span style="color: #1A2E1A;">₹${item.price.toLocaleString("en-IN")}</span>
              </div>
            `).join("")}
          </div>
          
          <div style="border-top: 1px solid #E2E8DF; padding-top: 12px; margin-top: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6B8F71; font-weight: bold;">Total</span>
              <span style="color: #6B8F71; font-weight: bold; font-size: 18px;">₹${total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">
          We'll notify you when your order ships. For questions, WhatsApp us or reply to this email.
        </p>
        
        <p style="color: #6B7280; font-size: 12px; margin-top: 32px; border-top: 1px solid #E2E8DF; padding-top: 16px;">
          Creative Dhraa — Handcrafted Personalized Gifts<br/>
          <a href="https://www.instagram.com/creative_dhraa/" style="color: #6B8F71; text-decoration: none;">@creative_dhraa</a>
        </p>
      </div>
    `,
  });
}

/**
 * Send order shipped notification
 */
export async function sendShippingNotification(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  trackingUrl?: string;
}) {
  const { to, customerName, orderNumber, trackingUrl } = params;

  await getResend().emails.send({
    from: getFromEmail(),
    to,
    subject: `Your order ${orderNumber} has shipped!`,
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FAFAF8; color: #1A2E1A;">
        <h1 style="color: #6B8F71; font-size: 24px;">Your Gift is on its Way!</h1>
        <p style="color: #6B7280;">Hi ${customerName}, your order <strong style="color: #6B8F71;">${orderNumber}</strong> has been shipped.</p>
        ${trackingUrl ? `<a href="${trackingUrl}" style="display: inline-block; background: #6B8F71; color: #FAFAF8; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; margin-top: 16px;">Track Shipment</a>` : ""}
        <p style="color: #6B7280; font-size: 12px; margin-top: 32px;">Creative Dhraa — Handcrafted Personalized Gifts</p>
      </div>
    `,
  });
}

export { getResend as resend };
