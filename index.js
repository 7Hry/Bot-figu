const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function conectar() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Bot Figurinhas Dedão', 'Chrome', '1.0'],
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n🔥 QR CODE GERADO!');
            qrcode.generate(qr, { small: true });
            console.log('\nTire print ou copie esse QR e escaneie com o WhatsApp Business → Dispositivos vinculados');
        }

        if (connection === 'open') {
            console.log('✅ BOT CONECTADO COM SUCESSO!');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Reconectando...');
                setTimeout(conectar, 5000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();

        const isMedia = msg.message.imageMessage || msg.message.videoMessage ||
                       msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
                       msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

        if (!isMedia && texto !== '/s' && texto !== '/s2') return;

        console.log('📸 Criando sticker...');

        try {
            const buffer = await sock.downloadMediaMessage(msg);

            const sticker = new Sticker(buffer, {
                pack: 'Bot do',
                author: 'Dedão',
                type: StickerTypes.FULL,
                categories: ['😎'],
                quality: 80,
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });

        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, { text: '❌ Erro ao criar sticker.' });
        }
    });
}

conectar();
