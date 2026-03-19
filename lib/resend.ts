import { Resend } from "resend";
import { env } from "@/lib/env";

export const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;
