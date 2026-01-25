const { TransactionalEmailsApi, SendSmtpEmail } = require('@getbrevo/brevo');
const db = require('./db');
const { redisClient } = require('./redis');

const BREVO_API_KEY_CACHE_KEY = 'settings:brevo_api_key';

async function getBrevoApiKey() {
    try {
        const cachedApiKey = await redisClient.get(BREVO_API_KEY_CACHE_KEY);
        if (cachedApiKey) {
            return cachedApiKey;
        }
    } catch (error) {
        console.error('Redis error getting Brevo API key:', error);
    }

    const { rows } = await db.query("SELECT value FROM settings WHERE key = 'BREVO_API_KEY'");
    if (rows.length > 0) {
        const apiKey = rows[0].value;
        try {
            await redisClient.set(BREVO_API_KEY_CACHE_KEY, apiKey, { EX: 3600 }); // Cache for 1 hour
        } catch (error) {
            console.error('Redis error setting Brevo API key:', error);
        }
        return apiKey;
    }
    return null;
}

const sendEmail = async (to, subject, html) => {
    const apiKey = await getBrevoApiKey();
    if (!apiKey) {
        console.error('Brevo API Key not found in settings.');
        return;
    }

    const apiInstance = new TransactionalEmailsApi();
    const apiKeyAuth = apiInstance.authentications['apiKey'];
    apiKeyAuth.apiKey = apiKey;

    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = { name: 'Plataforma Educativa Aurora', email: 'desdechaves@gmail.com' };
    sendSmtpEmail.to = [{ email: to }];

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
        if (error.response) {
            console.error(error.response.body)
        }
    }
};

module.exports = {
    sendEmail
};
