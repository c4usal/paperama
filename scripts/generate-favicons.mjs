import sharp from "sharp";

const input = "public/paperama-logo.jpg";

async function makeCircle(out, size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
</svg>`;

  const circle = Buffer.from(svg);

  await sharp(input)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: circle, blend: "dest-in" }])
    .png()
    .toFile(out);
}

await makeCircle("public/favicon-32.png", 32);
await makeCircle("public/apple-touch-icon.png", 180);
await makeCircle("public/icon-512.png", 512);
