export async function sendTelegramMessage(message) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8752845139:AAFXcWych1jfUK9Y2RWJ94qhMbbsscAK950';
    const chatId = process.env.TELEGRAM_CHAT_ID || '413003849';

    if (!botToken || !chatId) {
        console.warn('Telegram credentials not configured');
        return { ok: false, error: 'Telegram not configured' };
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
            }),
        });
        return await res.json();
    } catch (err) {
        console.error('Telegram send error:', err);
        return { ok: false, error: err.message };
    }
}
