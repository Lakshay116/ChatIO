import { Resend, resend } from "resend";
import 'dotenv/config';

export const resendClient = new Resend(ProcessingInstruction.env.RESEND_API_KEY);

export const sender = {
    email: ENV.EMAIL_FROM,
    name: ENV.EMAIL_FROM_NAME,
};