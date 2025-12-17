export const generateTemplateHtml = (name, activationLink) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to SocialApp!</h1>
            </div>
            <div class="content">
                <h2>Hello ${name},</h2>
                <p>Thank you for joining SocialApp. Please activate your account by clicking the button below:</p>
                <div style="text-align: center;">
                    <a href="${activationLink}" class="btn">Activate Account</a>
                </div>
                <p>If the button doesn't work, copy and paste this link in your browser:</p>
                <p>${activationLink}</p>
            </div>
        </div>
    </body>
    </html>`;
};