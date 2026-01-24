import { VerifyEmailTemplate } from "@/components/EmailTemplates/verify-email";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { firstName, email, verificationUrl } = await request.json();

    const resend = new Resend(process.env.RESEND_KEY); // ✅ moved inside

    const { data, error } = await resend.emails.send({
      from: "ProteinBind <onboarding@resend.dev>",
      to: [email],
      subject: "Verify your email",
      react: VerifyEmailTemplate({ firstName, verificationUrl }),
    });

    if (error) {
      console.error("RESEND ERROR:", error);
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error: any) {
    console.error("VERIFY EMAIL ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
