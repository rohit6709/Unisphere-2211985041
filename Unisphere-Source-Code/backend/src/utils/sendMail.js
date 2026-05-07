import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
    if(!transporter){
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }
    return transporter;
}

const baseTemplate = ({ title, body }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;
                border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
 
        <!-- Header -->
        <div style="background: #4A90E2; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">UniSphere</h1>
        </div>
 
        <!-- Body -->
        <div style="padding: 32px; color: #333333;">
            <h2 style="margin-top: 0; color: #222;">${title}</h2>
            ${body}
        </div>
 
        <!-- Footer -->
        <div style="background: #f5f5f5; padding: 16px; text-align: center;
                    font-size: 12px; color: #999999;">
            &copy; ${new Date().getFullYear()} UniSphere. Do not reply to this email.
            <br/>This is an automated message.
        </div>
    </div>
`;

const templates = {
    credentials: ({ name, email, password, role, loginUrl }) => 
        baseTemplate({
            title: `Welcome to UniSphere, ${name}!`,
            body: `<p>Your <strong style="text-transform: capitalize;">${role}</strong>
                   account has been created successfully.</p>
 
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;
                              border-radius: 6px; overflow: hidden;">
                    <tr style="background: #f9f9f9;">
                        <td style="padding: 12px 16px; font-weight: bold; width: 40%;
                                   border-bottom: 1px solid #eee;">Email</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                            ${email}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 16px; font-weight: bold;
                                   border-bottom: 1px solid #eee;">Temporary Password</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                            <code style="background: #fff3cd; padding: 4px 8px;
                                         border-radius: 4px; font-size: 15px;">
                                ${password}
                            </code>
                        </td>
                    </tr>
                    <tr style="background: #f9f9f9;">
                        <td style="padding: 12px 16px; font-weight: bold;">Role</td>
                        <td style="padding: 12px 16px; text-transform: capitalize;">
                            ${role}
                        </td>
                    </tr>
                </table>
 
                <p style="color: #e53935; font-weight: bold; margin-top: 16px;">
                    ⚠️ Please change your password immediately after first login.
                </p>
 
                <a href="${loginUrl}"
                   style="display: inline-block; margin-top: 12px; padding: 12px 28px;
                          background: #4A90E2; color: white; border-radius: 6px;
                          text-decoration: none; font-weight: bold; font-size: 15px;">
                    Login to UniSphere
                </a>
            `,
        }),

        passwordReset: ({ name, resetUrl }) =>
            baseTemplate({
                title: "Password reset request",
                body: `
                    <p>Hi <strong>${name}</strong>,</p>
                <p>We received a request to reset your UniSphere password.
                   Click the button below to set a new password.</p>
 
                <a href="${resetUrl}"
                   style="display: inline-block; margin: 20px 0; padding: 12px 28px;
                          background: #4A90E2; color: white; border-radius: 6px;
                          text-decoration: none; font-weight: bold; font-size: 15px;">
                    Reset My Password
                </a>
 
                <p style="color: #999; font-size: 13px; margin-top: 8px;">
                    This link expires in <strong>15 minutes</strong>.<br/>
                    If you did not request a password reset, ignore this email —
                    your account is safe.
                </p>
 
                <p style="color: #999; font-size: 12px; word-break: break-all;">
                    Or copy this link: ${resetUrl}
                </p>
                `,
            }),

        passwordChanged: ({ name }) =>
                baseTemplate({
                    title: "Password changed successfully",
                    body: `
                        <p>Hi <strong>${name}</strong>,</p>
                <p>Your UniSphere password was changed successfully.</p>
                <p style="color: #e53935; font-weight: bold;">
                    If you did not make this change, contact your administrator immediately.
                </p>
                    `,
                }),

        accountDeactivated: ({ name }) =>
            baseTemplate({
                title: "Account deactivated",
                body: `
                    <p>Hi <strong>${name}</strong>,</p>
                <p>Your UniSphere account has been <strong>deactivated</strong>.</p>
                <p>Please contact your administrator if you think this is a mistake.</p>
                `,
            }),
            
        accountActivated: ({ name, loginUrl }) => 
            baseTemplate({
                title: "Account activated",
                body: `
                    <p>Hi <strong>${name}</strong>,</p>
                <p>Your UniSphere account has been <strong>reactivated</strong>.
                   You can now log in.</p>
                <a href="${loginUrl}"
                   style="display: inline-block; margin-top: 12px; padding: 12px 28px;
                          background: #4A90E2; color: white; border-radius: 6px;
                          text-decoration: none; font-weight: bold;">
                    Login to UniSphere
                </a>
                `,
            }),
};

const sendMail = async ({ to, subject, html }) => {
    try {
        const mail = getTransporter();
        const info = await mail.sendMail({
            from: `UniSphere ${process.env.EMAIL_USER}`,
            to,
            subject,
            html
        });
        console.log(`Email sent -> ${to} | MessageId: ${info.messageId}`);
    } catch (error) {
        console.log(`Email failed -> ${to} | Error: ${error.message}`);
        throw new Error(`Email could not be sent: ${error.message}`);
    }
}

export const sendCredentialsMail = ({ name, email, password, role }) => {
    const loginUrl = `${process.env.FRONTEND_URL}/${role}/login`;
    return sendMail({
        to: email,
        subject: "Welcome to UniSphere - Your login credentials",
        html: templates.credentials({ name, email, password, role, loginUrl })
    });
}

export const sendPasswordResetMail = ({ name, email, resetUrl }) => {
    return sendMail({
        to: email,
        subject: "UniSphere - Password reset request",
        html: templates.passwordReset({ name, resetUrl })
    });
}

export const sendPasswordChangedMail = ({ name, email }) => {
    return sendMail({
        to: email,
        subject: "UniSphere - Password Changed Successfully",
        html: templates.passwordChanged({ name }),
    });
};
 
export const sendAccountDeactivatedMail = ({ name, email }) => {
    return sendMail({
        to: email,
        subject: "UniSphere - Account Deactivated",
        html: templates.accountDeactivated({ name }),
    });
};
 
export const sendAccountActivatedMail = ({ name, email, role }) => {
    const loginUrl = `${process.env.FRONTEND_URL}/${role}/login`;
    return sendMail({
        to: email,
        subject: "UniSphere - Account Activated",
        html: templates.accountActivated({ name, loginUrl }),
    });
};