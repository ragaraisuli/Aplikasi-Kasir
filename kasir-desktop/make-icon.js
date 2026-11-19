const fs = require('fs');
const path = require('path');

function buildIcoFromPngBuffer(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Image type (1 = ICO)
  header.writeUInt16LE(1, 4); // Number of images

  const directory = Buffer.alloc(16);
  directory.writeUInt8(0, 0);   // Width: 0 = 256px
  directory.writeUInt8(0, 1);   // Height: 0 = 256px
  directory.writeUInt8(0, 2);   // Color palette
  directory.writeUInt8(0, 3);   // Reserved
  directory.writeUInt16LE(1, 4); // Color planes
  directory.writeUInt16LE(32, 6); // Bits per pixel
  directory.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  directory.writeUInt32LE(22, 12); // Offset of image data (6 + 16 = 22)

  return Buffer.concat([header, directory, pngBuffer]);
}

const inputPngPath = path.join(__dirname, 'icon.png');
const outputIcoPath = path.join(__dirname, 'icon.ico');

const pngBuffer = fs.readFileSync(inputPngPath);
const icoBuffer = buildIcoFromPngBuffer(pngBuffer);

fs.writeFileSync(outputIcoPath, icoBuffer);
console.log('Berhasil membuat icon.ico dari icon.png');