import { ResetPasswordTemplate } from "@/components/EmailTemplates/reset-email";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { firstName, email, resetUrl } = await request.json();

    const resend = new Resend(process.env.RESEND_KEY); // ✅ moved inside

    const { data, error } = await resend.emails.send({
      from: "ProteinBind <support@resend.dev>",
      to: [email],
      subject: "Reset your password",
      react: ResetPasswordTemplate({ firstName, resetUrl }),
    });

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error: any) {
    console.error("EMAIL ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
