const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const PHONE_NUMBER = "5562981573734";   // Seu número

async function conectar() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Bot Figurinhas Dedão', 'Chrome', '1.0'],
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('QR Code gerado (caso precise):');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'connecting' || qr) {
            try {
                const code = await sock.requestPairingCode(PHONE_NUMBER);
                console.log('\n🔑 CÓDIGO DE PAREAMENTO:');
                console.log(code);
                console.log('\nAbra o WhatsApp Business → Configurações → Dispositivos vinculados → "Conectar com número de telefone"');
                console.log('Digite o código acima');
            } catch (err) {
                console.error('Erro ao gerar código:', err.message);
            }
        }

        if (connection === 'open') {
            console.log('✅ Bot conectado com sucesso!');
        }

        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
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

        const isImage = msg.message.imageMessage;
        const isVideo = msg.message.videoMessage;
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const isQuotedImage = quoted?.imageMessage;
        const isQuotedVideo = quoted?.videoMessage;

        if (!isImage && !isVideo && !isQuotedImage && !isQuotedVideo &&
            texto !== '/s' && texto !== '/s2') {
            return;
        }

        console.log('📸 Criando sticker...');

        try {
            let buffer = await sock.downloadMediaMessage(msg);

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
        const from = msg.key.remoteJid;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();

        const isImage = msg.message.imageMessage;
        const isVideo = msg.message.videoMessage;
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const isQuotedImage = quoted?.imageMessage;
        const isQuotedVideo = quoted?.videoMessage;

        if (!isImage && !isVideo && !isQuotedImage && !isQuotedVideo &&
            texto !== '/s' && texto !== '/s2' && !texto.startsWith('/s ') && !texto.startsWith('/s2 ')) {
            return;
        }

        const comando = texto.split(' ')[0];

        console.log(`📸 Criando sticker - Modo: ${comando === '/s' ? 'ACHATADO' : 'NORMAL'}`);

        try {
            let buffer = await sock.downloadMediaMessage(msg);

            let sharpInstance = sharp(buffer);

            if (comando === '/s') {
                // ACHATADO - estica forçadamente
                sharpInstance = sharpInstance.resize({
                    width: 512,
                    height: 512,
                    fit: 'fill',
                    kernel: sharp.kernel.lanczos3,
                    withoutEnlargement: false
                });
            } else {
                // NORMAL (/s2) - mantém proporção
                sharpInstance = sharpInstance.resize({
                    width: 512,
                    height: 512,
                    fit: 'inside',
                    kernel: sharp.kernel.lanczos3,
                    withoutEnlargement: false
                });
            }

            buffer = await sharpInstance
                .webp({ quality: 85, effort: 5 })
                .toBuffer();

            const sticker = new Sticker(buffer, {
                pack: 'Bot do',      // ← Correto
                author: 'Dedão',     // ← Correto
                type: StickerTypes.FULL,
                categories: ['😎'],
                quality: 80,
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });

        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, { text: '❌ Erro ao criar sticker. Tente novamente.' });
        }
    });
}

conectar();
