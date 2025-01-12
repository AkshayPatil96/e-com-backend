import ejs from "ejs";
import nodeMailer, { Transporter } from "nodemailer";
import path from "path";
import config from "../config";

interface ISendMail {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

const sendMail = async ({
  email,
  subject,
  template,
  data,
}: ISendMail): Promise<void> => {
  const transporter: Transporter = nodeMailer.createTransport({
    host: config.SMTP_HOST,
    port: parseInt(config.SMTP_PORT || "587"),
    service: config.SMTP_SERVICE,
    auth: {
      user: config.SMTP_MAIL,
      pass: config.SMTP_PASSWORD,
    },
  });

  console.log("__dirname: ", path.join(__dirname, "../views", template));
  const mailOptions = {
    from: config.SMTP_MAIL,
    to: email,
    subject,
    html: await ejs.renderFile(
      path.join(__dirname, "../views", template),
      data,
    ),
  };

  await transporter
    .sendMail(mailOptions)
    .then((info) => {
      console.log("Message sent: %s", info.messageId);
    })
    .catch((error) => {
      console.log("Error: ", error);
    });
};

export default sendMail;
