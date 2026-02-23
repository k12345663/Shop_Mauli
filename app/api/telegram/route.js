import { sendTelegramMessage } from '@/lib/telegram';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { renterCode, renterName, shops, month, status, received, expected } = body;

        const time = new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
        });

        const remaining = expected - received;
        const statusEmoji = status === 'paid' ? '✅' : status === 'partial' ? '⚠️' : '❌';

        let message = `<b>🏢 Rent Notification</b>\n\n`;
        message += `<b>Renter:</b> ${renterName} (Code: ${renterCode})\n`;
        message += `<b>Month:</b> ${month}\n`;

        if (status === 'paid') {
            message += `<b>Status:</b> ${statusEmoji} Payment <b>COMPLETE</b>\n`;
            message += `<b>Amount Paid:</b> ₹${received}\n`;
        } else if (status === 'partial') {
            message += `<b>Status:</b> ${statusEmoji} <b>PARTIAL</b> Payment\n`;
            message += `<b>Amount Paid:</b> ₹${received}\n`;
            message += `<b>Remaining:</b> ₹${remaining}\n`;
        } else {
            message += `<b>Status:</b> ${statusEmoji} <b>UNPAID</b>\n`;
            message += `<b>Expected:</b> ₹${expected}\n`;
        }

        message += `\n<b>Time:</b> ${time}`;

        const result = await sendTelegramMessage(message);

        return NextResponse.json({ ok: true, result });
    } catch (err) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
