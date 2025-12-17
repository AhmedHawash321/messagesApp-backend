import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "..", "..", ".env");
dotenv.config({ path: envPath });

export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
    });

    const info = await transporter.sendMail({
      from: `"Social App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return info.rejected.length === 0;
  } catch (error) {
    console.error("Failed to send email:", error.message);
    return false;
  }
};
