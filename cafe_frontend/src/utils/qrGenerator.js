import QRCode from "qrcode";

/**
 * Generate standard SVG string for QR Code with error correction and quiet zone
 */
export async function generateQRCodeSVG(
  text,
  size = 240,
  color = "#2A1710",
  bg = "#FFFFFF"
) {
  try {
    return await QRCode.toString(text, {
      type: "svg",
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: color,
        light: bg,
      },
    });
  } catch (err) {
    console.error("QR SVG generation error:", err);
    return "";
  }
}

/**
 * Draw QR Code directly onto a given HTML5 Canvas element
 */
export async function drawQRCodeToCanvas(
  canvas,
  text,
  size = 400,
  color = "#2A1710",
  bg = "#FFFFFF"
) {
  try {
    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: color,
        light: bg,
      },
    });
  } catch (err) {
    console.error("QR Canvas generation error:", err);
  }
}

/**
 * Generate data URL (PNG format)
 */
export async function generateQRCodeDataURL(
  text,
  size = 400,
  color = "#2A1710",
  bg = "#FFFFFF"
) {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: color,
        light: bg,
      },
    });
  } catch (err) {
    console.error("QR DataURL generation error:", err);
    return "";
  }
}
