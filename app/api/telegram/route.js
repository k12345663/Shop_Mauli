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

        const statusEmoji = status === 'paid' ? '✅' : status === 'partial' ? '⚠️' : '❌';

        const message =
            `<b>🏢 Rent Update</b>\n` +
            `<b>Renter:</b> ${renterCode} (${renterName})\n` +
            `<b>Shops:</b> ${shops}\n` +
            `<b>Month:</b> ${month}\n` +
            `<b>Status:</b> ${statusEmoji} ${status.toUpperCase()}\n` +
            `<b>Amount:</b> ₹${received} / ₹${expected}\n` +
            `<b>Time:</b> ${time}`;

        const result = await sendTelegramMessage(message);

        return NextResponse.json({ ok: true, result });
    } catch (err) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
