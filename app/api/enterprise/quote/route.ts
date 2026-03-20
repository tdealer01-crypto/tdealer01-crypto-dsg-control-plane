import { supabaseAdmin } from "@/lib/supabase-admin";
import { resend } from "@/lib/resend";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      company: String(formData.get("company") ?? ""),
      use_case: String(formData.get("use_case") ?? ""),
      created_at: new Date().toISOString()
    };

    if (supabaseAdmin) {
      await supabaseAdmin.from("enterprise_leads").insert(payload);
    }

    if (resend && env.resendFromEmail) {
      await resend.emails.send({
        from: env.resendFromEmail,
        to: ["t.deale01@dsg.pics"],
        subject: `New Enterprise Quote Request - ${payload.company}`,
        html: `
          <h1>New Enterprise Lead</h1>
          <p><strong>Name:</strong> ${payload.name}</p>
          <p><strong>Email:</strong> ${payload.email}</p>
          <p><strong>Company:</strong> ${payload.company}</p>
          <p><strong>Use case:</strong><br/>${payload.use_case}</p>
        `
      });
    }

    return Response.redirect(
      `${new URL(req.url).origin}/success?type=enterprise`,
      303
    );
  } catch (error) {
    console.error("Enterprise quote failed:", error);
    return Response.redirect(
      `${new URL(req.url).origin}/cancel?type=enterprise`,
      303
    );
  }
}
