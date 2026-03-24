const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const sharp = require('sharp');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const http = require('http');

// Servidor fake para o Render não matar o processo
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot de figurinhas rodando...\n');
}).listen(process.env.PORT || 10000);

console.log('🚀 Servidor fake iniciado para Render');

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
            console.log('\n🔥 QR CODE:');
            qrcode.generate(qr, { small: true });
            console.log('Escaneie com o WhatsApp Business');
        }

        if (connection === 'open') {
            console.log('✅ MODO DEFORMAÇÃO TOTAL ATIVADO!');
        }

        if (connection === 'close') {
            console.log('Conexão fechada. Reconectando em 8 segundos...');
            setTimeout(conectar, 8000);
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

        if (!isMedia && !texto.startsWith('/s')) return;

        const isAchatado = texto === '/s' || texto.startsWith('/s ');

        console.log(`📸 Criando sticker - ${isAchatado ? 'ACHATADO' : 'NORMAL'}`);

        try {
            const buffer = await sock.downloadMediaMessage(msg);

            let finalBuffer = buffer;

            // ACHATADO (igual o que você queria no antigo)
            if (isAchatado) {
                finalBuffer = await sharp(buffer)
                    .resize(512, 512, {
                        fit: 'fill',           // ← força esticar (achatado)
                        kernel: sharp.kernel.lanczos3
                    })
                    .webp({ quality: 70 })
                    .toBuffer();
            } 
            // NORMAL
            else {
                finalBuffer = await sharp(buffer)
                    .resize(512, 512, {
                        fit: 'inside',
                        kernel: sharp.kernel.lanczos3
                    })
                    .webp({ quality: 80 })
                    .toBuffer();
            }

            const sticker = new Sticker(finalBuffer, {
                pack: 'Bot do',
                author: 'Dedão',
                type: StickerTypes.FULL,
                categories: ['🤡'],
                quality: 75,
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });

            console.log('✅ Sticker enviado com sucesso!');

        } catch (err) {
            console.error('Erro ao criar sticker:', err);
            await sock.sendMessage(from, { text: '❌ Erro ao criar sticker, tente novamente.' });
        }
    });
}

conectar();
