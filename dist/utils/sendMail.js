"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ejs_1 = __importDefault(require("ejs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
const sendMail = async ({ email, subject, template, data, }) => {
    const transporter = nodemailer_1.default.createTransport({
        host: config_1.default.SMTP_HOST,
        port: parseInt(config_1.default.SMTP_PORT || "587"),
        service: config_1.default.SMTP_SERVICE,
        auth: {
            user: config_1.default.SMTP_MAIL,
            pass: config_1.default.SMTP_PASSWORD,
        },
    });
    console.log("__dirname: ", path_1.default.join(__dirname, "../views", template));
    const mailOptions = {
        from: config_1.default.SMTP_MAIL,
        to: email,
        subject,
        html: await ejs_1.default.renderFile(path_1.default.join(__dirname, "../views", template), data),
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
exports.default = sendMail;
