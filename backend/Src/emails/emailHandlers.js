import nodemailer from "nodemailer"
import { createWelcomeEmailTemplate } from "./emailTemplate.js";
import 'dotenv/config'

const { EMAIL_FROM, EMAIL_PASS } = process.env;
export const sendWelcomeEmail = async (email, name, clientURL) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_FROM,
            pass: EMAIL_PASS
        }
    });
    var mailOptions = {
        from: EMAIL_FROM,
        to: email,
        subject: 'Welcome to ChatIO',
        html: createWelcomeEmailTemplate(name, clientURL),
    };

    await transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("Error in Welcome email: ", error);
        }
        else {
            console.log("Email Sent: ", info.response);
        }
    })
}
