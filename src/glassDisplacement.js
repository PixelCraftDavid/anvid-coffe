// A convex rounded-rectangle lens: a broad shoulder and a smaller inner lip.
// Neutral pixels leave the centre untouched; curvature is strongest at corners.
export function createGlassDisplacement(width, height, radius) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const corner = Math.min(radius, width / 2, height / 2);
  const rim = Math.min(27, corner);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + .5 - width / 2, py = y + .5 - height / 2;
      const qx = Math.abs(px) - (width / 2 - corner), qy = Math.abs(py) - (height / 2 - corner);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0), length = Math.hypot(ox, oy);
      const depth = corner - (length + Math.min(Math.max(qx, qy), 0));
      let dx = 0, dy = 0;
      if (depth > 0 && depth < rim) {
        const t = depth / rim;
        const shoulder = Math.sin(Math.PI * t) * Math.pow(1 - t, .45);
        const lip = .12 * Math.sin(3 * Math.PI * t) * Math.sin(Math.PI * t);
        const strength = (shoulder + lip) * 106;
        if (length > .001) { dx = ox / length * Math.sign(px); dy = oy / length * Math.sign(py); }
        else if (qx > qy) dx = Math.sign(px);
        else dy = Math.sign(py);
        dx *= strength; dy *= strength;
      }
      const i = (y * width + x) * 4;
      pixels[i] = 128 + dx; pixels[i + 1] = 128 + dy;
      pixels[i + 2] = 128; pixels[i + 3] = 255;
    }
  }
  return pixels;
}
