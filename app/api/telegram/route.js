import { sendTelegramMessage } from '@/lib/telegram';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { renterCode, renterName, shops, month, status, received, expected, complex } = body;

        const time = new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
        });

        const remaining = expected - received;
        const statusEmoji = status === 'paid' ? '✅' : status === 'partial' ? '⚠️' : '❌';

        let message = `<b>🏢 Rent Payment Received</b>\n\n`;
        message += `<b>👤 Renter:</b> ${renterName} (${renterCode})\n`;
        message += `<b>🏪 Shop:</b> ${shops}\n`;
        message += `<b>📍 Complex:</b> ${complex || 'Main'}\n`;
        message += `<b>📅 Month:</b> ${month}\n\n`;

        if (status === 'paid') {
            message += `<b>💰 Status:</b> ${statusEmoji} <b>FULL PAYMENT</b>\n`;
            message += `<b>💵 Paid:</b> ₹${Number(received).toLocaleString()}\n`;
        } else if (status === 'partial') {
            message += `<b>💰 Status:</b> ${statusEmoji} <b>PARTIAL PAYMENT</b>\n`;
            message += `<b>💵 Paid:</b> ₹${Number(received).toLocaleString()}\n`;
            message += `<b>📉 Remaining:</b> ₹${Number(remaining).toLocaleString()}\n`;
            message += `<b>📈 Total Expected:</b> ₹${Number(expected).toLocaleString()}\n`;
        } else {
            message += `<b>💰 Status:</b> ${statusEmoji} <b>UNPAID</b>\n`;
            message += `<b>📊 Expected:</b> ₹${Number(expected).toLocaleString()}\n`;
        }

        message += `\n<b>🕒 Time:</b> ${time}`;

        const result = await sendTelegramMessage(message);

        return NextResponse.json({ ok: true, result });
    } catch (err) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
