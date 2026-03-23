const crypto = require('crypto');
const fs = require('fs');

async function testDecryption() {
    const baseUrl = "https://vault-14.owocdn.top/stream/14/02/bdc98a2744f87894f503fcce8bc0a3c8c8747d0135d264190eb30325a87d2bde/";
    const keyUrl = baseUrl + "mon.key";
    const segmentUrl = baseUrl + "segment-1-v1-a1.jpg";
    const headers = {
        'Referer': 'https://kwik.cx/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    try {
        console.log("Fetching Key...");
        const keyRes = await fetch(keyUrl, { headers });
        const keyBuf = await keyRes.arrayBuffer();
        const key = Buffer.from(keyBuf);
        console.log("Success: Key fetched, length:", key.length);
        console.log("Key Hex:", key.toString('hex'));

        console.log("Fetching Segment...");
        const segRes = await fetch(segmentUrl, { headers });
        const encryptedSegBuf = await segRes.arrayBuffer();
        const encryptedSeg = Buffer.from(encryptedSegBuf);
        console.log("Success: Segment fetched, length:", encryptedSeg.length);

        // AES-128-CBC
        const iv = Buffer.alloc(16);
        iv.writeUInt32BE(1, 12);
        console.log("Using IV for Segment 1:", iv.toString('hex'));

        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        decipher.setAutoPadding(false); 
        const decrypted = Buffer.concat([decipher.update(encryptedSeg), decipher.final()]);
        
        console.log("Decrypted Length:", decrypted.length);
        console.log("First 16 bytes (hex):", decrypted.slice(0, 16).toString('hex'));
        
        if (decrypted[0] === 0x47) {
            console.log("DETECTED: MPEG-TS sync byte (0x47)!");
        } else {
            console.log("FAILED: No 0x47 sync byte found. Upstream may be fMP4 or using different IV.");
            // Try IV 0
            const iv0 = Buffer.alloc(16);
            const decipher0 = crypto.createDecipheriv('aes-128-cbc', key, iv0);
            decipher0.setAutoPadding(false);
            const decrypted0 = Buffer.concat([decipher0.update(encryptedSeg), decipher0.final()]);
            if (decrypted0[0] === 0x47) console.log("DETECTED: Sync byte with IV 0!");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testDecryption();
