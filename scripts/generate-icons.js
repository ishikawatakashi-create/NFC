const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgPath = path.join(__dirname, '../public/icon.svg');
  const publicDir = path.join(__dirname, '../public');
  
  // SVGファイルを読み込む
  const svgBuffer = fs.readFileSync(svgPath);
  
  // 32x32 PNG (ライトモード用)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'icon-light-32x32.png'));
  
  // 32x32 PNG (ダークモード用 - 同じアイコンを使用)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'icon-dark-32x32.png'));
  
  // 180x180 PNG (Apple Touch Icon用)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-icon.png'));
  
  console.log('アイコンファイルの生成が完了しました！');
}

generateIcons().catch(console.error);

