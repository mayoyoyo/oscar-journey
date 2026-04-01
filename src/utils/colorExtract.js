export function extractDominantColor(imgSrc, callback) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 4, 4);
    try {
      const data = ctx.getImageData(0, 0, 4, 4).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i+1]; b += data[i+2];
      }
      const pixels = data.length / 4;
      callback(`${Math.round(r/pixels)}, ${Math.round(g/pixels)}, ${Math.round(b/pixels)}`);
    } catch { callback(null); }
  };
  img.onerror = () => callback(null);
  img.src = imgSrc;
}
