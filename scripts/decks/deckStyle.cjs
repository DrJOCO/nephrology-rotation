// Shared styling + helpers for the 6 nephrology teaching decks.
// Design: "Teal Trust" palette, serif headers, clean sans body.

const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");

const PALETTE = {
  primary: "065A82",
  primaryDark: "033E5C",
  secondary: "1C7293",
  accent: "E76F51",
  accentDark: "C8553D",
  cream: "F8F5F0",
  card: "FFFFFF",
  charcoal: "1E293B",
  muted: "64748B",
  good: "2C5F2D",
  goodLight: "D8E4C4",
  danger: "9B2226",
  dangerLight: "F4D1D3",
  warn: "BC6C25",
  warnLight: "F5E4CD",
  border: "CBD5E1",
  ice: "EBF3F7",
};

const FONT = {
  title: "Georgia",
  body: "Calibri",
};

// Slide dimensions: 10 × 5.625 (LAYOUT_16x9)
const SLIDE = { W: 10, H: 5.625 };

function renderIconSvg(IconComponent, color = "#000000", size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color = "#065A82", size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

// ------- SLIDE HEADER (consistent across all content slides) -------
function addHeader(slide, { topic, slideNumber, totalSlides }) {
  // Thin top bar (teal)
  slide.addShape("rect", {
    x: 0, y: 0, w: SLIDE.W, h: 0.1,
    fill: { color: PALETTE.primary }, line: { type: "none" },
  });

  // Topic name top-left
  slide.addText(topic, {
    x: 0.4, y: 0.18, w: 6, h: 0.3,
    fontFace: FONT.body, fontSize: 10, color: PALETTE.muted,
    bold: true, charSpacing: 4, margin: 0,
  });

  // Slide N/Total top-right
  if (slideNumber && totalSlides) {
    slide.addText(`${slideNumber} / ${totalSlides}`, {
      x: 8.4, y: 0.18, w: 1.2, h: 0.3,
      fontFace: FONT.body, fontSize: 10, color: PALETTE.muted,
      align: "right", margin: 0,
    });
  }
}

// ------- SLIDE FOOTER (citation/source line) -------
function addFooter(slide, sourceText) {
  slide.addShape("line", {
    x: 0.4, y: 5.30, w: 9.2, h: 0,
    line: { color: PALETTE.border, width: 0.5 },
  });
  slide.addText(sourceText, {
    x: 0.4, y: 5.36, w: 9.2, h: 0.25,
    fontFace: FONT.body, fontSize: 8.5, color: PALETTE.muted,
    italic: true, margin: 0,
  });
}

// ------- SLIDE TITLE -------
// Title sits at y=0.45, height 0.55 — single line; keep titles concise.
// Subtitle at y=1.02.
function addSlideTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.4, y: 0.45, w: 9.2, h: 0.55,
    fontFace: FONT.title, fontSize: 24, bold: true,
    color: PALETTE.charcoal, margin: 0, valign: "middle",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 1.02, w: 9.2, h: 0.28,
      fontFace: FONT.body, fontSize: 12, italic: true,
      color: PALETTE.secondary, margin: 0,
    });
  }
}

// ------- COVER (TITLE SLIDE) -------
function addCoverSlide(pres, { topic, subtitle, tagline }) {
  const slide = pres.addSlide();
  slide.background = { color: PALETTE.primaryDark };

  // Left accent strip
  slide.addShape("rect", {
    x: 0, y: 0, w: 0.35, h: SLIDE.H,
    fill: { color: PALETTE.accent }, line: { type: "none" },
  });

  // Series label
  slide.addText("NEPHROLOGY TEACHING SERIES", {
    x: 0.9, y: 0.9, w: 8, h: 0.35,
    fontFace: FONT.body, fontSize: 11, bold: true,
    color: PALETTE.accent, charSpacing: 8, margin: 0,
  });

  // Topic title
  slide.addText(topic, {
    x: 0.9, y: 1.5, w: 8.5, h: 1.4,
    fontFace: FONT.title, fontSize: 54, bold: true,
    color: "FFFFFF", margin: 0,
  });

  // Subtitle
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.9, y: 2.95, w: 8.5, h: 0.45,
      fontFace: FONT.body, fontSize: 18, italic: true,
      color: PALETTE.ice, margin: 0,
    });
  }

  // Divider
  slide.addShape("rect", {
    x: 0.9, y: 3.55, w: 1.0, h: 0.04,
    fill: { color: PALETTE.accent }, line: { type: "none" },
  });

  // Tagline
  if (tagline) {
    slide.addText(tagline, {
      x: 0.9, y: 3.7, w: 8.5, h: 0.5,
      fontFace: FONT.body, fontSize: 13,
      color: PALETTE.ice, margin: 0,
    });
  }

  // Bottom meta
  slide.addText("Dr. Cheng  •  Premier Nephrology Medical Group", {
    x: 0.9, y: 4.85, w: 8, h: 0.3,
    fontFace: FONT.body, fontSize: 11,
    color: PALETTE.ice, margin: 0,
  });
  slide.addText("MS3/MS4 rotation teaching", {
    x: 0.9, y: 5.15, w: 8, h: 0.3,
    fontFace: FONT.body, fontSize: 10, italic: true,
    color: PALETTE.secondary, margin: 0,
  });
  return slide;
}

// ------- CONTENT SLIDE (empty canvas with title + header/footer) -------
function newContentSlide(pres, opts) {
  const slide = pres.addSlide();
  slide.background = { color: PALETTE.cream };
  addHeader(slide, opts);
  if (opts.title) addSlideTitle(slide, opts.title, opts.subtitle);
  if (opts.source) addFooter(slide, opts.source);
  return slide;
}

// ------- CARD (rectangle with left accent bar + header + body) -------
function addCard(slide, { x, y, w, h, accent, header, body, headerColor, bodyColor }) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: PALETTE.card },
    line: { color: PALETTE.border, width: 0.5 },
    shadow: { type: "outer", color: "000000", blur: 6, offset: 1, angle: 90, opacity: 0.06 },
  });
  // Left accent
  slide.addShape("rect", {
    x, y, w: 0.08, h,
    fill: { color: accent || PALETTE.primary }, line: { type: "none" },
  });
  if (header) {
    slide.addText(header, {
      x: x + 0.2, y: y + 0.08, w: w - 0.3, h: 0.3,
      fontFace: FONT.body, fontSize: 11.5, bold: true,
      color: headerColor || PALETTE.primary, margin: 0, charSpacing: 2,
    });
  }
  if (body) {
    slide.addText(body, {
      x: x + 0.2, y: y + 0.4, w: w - 0.3, h: h - 0.45,
      fontFace: FONT.body, fontSize: 11,
      color: bodyColor || PALETTE.charcoal, margin: 0,
      valign: "top",
    });
  }
}

// ------- BULLET LIST -------
function bulletBlock(items, opts = {}) {
  return items.map((it, i) => {
    const isStr = typeof it === "string";
    const text = isStr ? it : it.text;
    const options = {
      bullet: { type: "bullet" },
      color: opts.color || PALETTE.charcoal,
      fontSize: opts.fontSize || 12,
      fontFace: FONT.body,
      paraSpaceAfter: opts.paraSpaceAfter || 4,
      breakLine: i < items.length - 1,
    };
    if (!isStr && it.bold) options.bold = true;
    if (!isStr && it.color) options.color = it.color;
    return { text, options };
  });
}

// ------- PEARL BOX (big callout with icon stub) -------
function addPearlBox(slide, { x, y, w, h, label, body }) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: PALETTE.ice },
    line: { color: PALETTE.secondary, width: 1 },
  });
  slide.addShape("rect", {
    x, y, w, h: 0.08,
    fill: { color: PALETTE.accent }, line: { type: "none" },
  });
  slide.addText(label || "TEACHING PEARL", {
    x: x + 0.25, y: y + 0.18, w: w - 0.5, h: 0.3,
    fontFace: FONT.body, fontSize: 10, bold: true,
    color: PALETTE.accent, charSpacing: 6, margin: 0,
  });
  slide.addText(body, {
    x: x + 0.25, y: y + 0.5, w: w - 0.5, h: h - 0.6,
    fontFace: FONT.title, fontSize: 14.5, italic: true,
    color: PALETTE.primaryDark, margin: 0, valign: "top",
  });
}

// ------- REFERENCES SLIDE (dark) -------
function addReferencesSlide(pres, { topic, references, uptodateTopics }) {
  const slide = pres.addSlide();
  slide.background = { color: PALETTE.primaryDark };

  slide.addShape("rect", {
    x: 0, y: 0, w: 0.35, h: SLIDE.H,
    fill: { color: PALETTE.accent }, line: { type: "none" },
  });
  slide.addText("REFERENCES", {
    x: 0.9, y: 0.6, w: 8, h: 0.4,
    fontFace: FONT.body, fontSize: 11, bold: true,
    color: PALETTE.accent, charSpacing: 8, margin: 0,
  });
  slide.addText(topic, {
    x: 0.9, y: 0.95, w: 8, h: 0.6,
    fontFace: FONT.title, fontSize: 32, bold: true,
    color: "FFFFFF", margin: 0,
  });

  // Guidelines column
  slide.addText("Guidelines", {
    x: 0.9, y: 1.85, w: 4, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true,
    color: PALETTE.accent, charSpacing: 3, margin: 0,
  });
  slide.addText(bulletBlock(references.guidelines, { color: "FFFFFF", fontSize: 10.5, paraSpaceAfter: 3 }), {
    x: 0.9, y: 2.15, w: 4.3, h: 3.0, margin: 0, valign: "top",
  });

  // Trials column
  slide.addText("Landmark Trials", {
    x: 5.4, y: 1.85, w: 4, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true,
    color: PALETTE.accent, charSpacing: 3, margin: 0,
  });
  slide.addText(bulletBlock(references.trials, { color: "FFFFFF", fontSize: 10.5, paraSpaceAfter: 3 }), {
    x: 5.4, y: 2.15, w: 4.2, h: 3.0, margin: 0, valign: "top",
  });

  // UpToDate mention at bottom
  if (uptodateTopics && uptodateTopics.length) {
    slide.addText("UpToDate (2026 access):", {
      x: 0.9, y: 5.05, w: 8.5, h: 0.25,
      fontFace: FONT.body, fontSize: 9, bold: true,
      color: PALETTE.accent, charSpacing: 3, margin: 0,
    });
    slide.addText(uptodateTopics.join("  •  "), {
      x: 0.9, y: 5.3, w: 8.5, h: 0.25,
      fontFace: FONT.body, fontSize: 8.5, italic: true,
      color: PALETTE.ice, margin: 0,
    });
  }
  return slide;
}

// ------- ABBREVIATIONS SLIDE -------
// opts: { topic, slideNumber, totalSlides, items: [[abbr, full], ...] }
function addAbbreviationsSlide(pres, opts) {
  const s = newContentSlide(pres, {
    topic: opts.topic,
    slideNumber: opts.slideNumber,
    totalSlides: opts.totalSlides,
    title: "Key abbreviations",
    subtitle: "Expanded on first use; listed here for reference throughout the deck.",
    source: "Standard nephrology usage.",
  });
  const items = opts.items || [];
  // Decide columns (2 for <= 18 items, 3 otherwise)
  const cols = items.length > 14 ? 3 : 2;
  const perCol = Math.ceil(items.length / cols);
  const colW = 9.2 / cols;
  for (let c = 0; c < cols; c++) {
    const colItems = items.slice(c * perCol, (c + 1) * perCol);
    const x = 0.4 + c * colW;
    const text = colItems.map((pair, i) => ([
      { text: pair[0], options: { bold: true, color: PALETTE.primary, fontSize: 10.5, fontFace: FONT.body } },
      { text: "   " + pair[1], options: { color: PALETTE.charcoal, fontSize: 10.5, fontFace: FONT.body, breakLine: i < colItems.length - 1 } },
    ])).flat();
    s.addText(text, {
      x, y: 1.4, w: colW - 0.1, h: 3.8,
      margin: 0, valign: "top", paraSpaceAfter: 2,
    });
  }
  return s;
}

// ------- CLINICAL CASE SLIDE -------
// opts: { topic, slideNumber, totalSlides, vignette, question, answer, teaching, source }
function addCaseSlide(pres, opts) {
  const s = newContentSlide(pres, {
    topic: opts.topic,
    slideNumber: opts.slideNumber,
    totalSlides: opts.totalSlides,
    title: opts.title || "Clinical case",
    subtitle: opts.subtitle || "Apply what you've learned — MS3/MS4 level vignette.",
    source: opts.source || "Clinical teaching case.",
  });

  // Vignette card
  s.addShape("rect", {
    x: 0.4, y: 1.4, w: 9.2, h: 1.55,
    fill: { color: PALETTE.card },
    line: { color: PALETTE.border, width: 0.5 },
  });
  s.addShape("rect", {
    x: 0.4, y: 1.4, w: 0.08, h: 1.55,
    fill: { color: PALETTE.primary }, line: { type: "none" },
  });
  s.addText("VIGNETTE", {
    x: 0.6, y: 1.48, w: 8.8, h: 0.25,
    fontFace: FONT.body, fontSize: 10, bold: true,
    color: PALETTE.primary, charSpacing: 4, margin: 0,
  });
  s.addText(opts.vignette, {
    x: 0.6, y: 1.75, w: 8.8, h: 1.15,
    fontFace: FONT.body, fontSize: 11,
    color: PALETTE.charcoal, margin: 0, valign: "top",
  });

  // Question + Answer
  s.addShape("rect", {
    x: 0.4, y: 3.05, w: 9.2, h: 0.85,
    fill: { color: PALETTE.ice },
    line: { color: PALETTE.secondary, width: 0.5 },
  });
  s.addText([
    { text: "QUESTION:  ", options: { bold: true, color: PALETTE.primaryDark, fontSize: 11, fontFace: FONT.body } },
    { text: opts.question, options: { color: PALETTE.charcoal, fontSize: 11, fontFace: FONT.body } },
  ], {
    x: 0.6, y: 3.12, w: 8.8, h: 0.7,
    margin: 0, valign: "top",
  });

  // Answer card
  s.addShape("rect", {
    x: 0.4, y: 4.0, w: 9.2, h: 1.2,
    fill: { color: PALETTE.card },
    line: { color: PALETTE.border, width: 0.5 },
  });
  s.addShape("rect", {
    x: 0.4, y: 4.0, w: 0.08, h: 1.2,
    fill: { color: PALETTE.accent }, line: { type: "none" },
  });
  s.addText("ANSWER + TEACHING", {
    x: 0.6, y: 4.07, w: 8.8, h: 0.25,
    fontFace: FONT.body, fontSize: 10, bold: true,
    color: PALETTE.accent, charSpacing: 4, margin: 0,
  });
  s.addText([
    { text: opts.answer, options: { bold: true, color: PALETTE.primary, fontSize: 11, fontFace: FONT.body, breakLine: true } },
    { text: opts.teaching, options: { color: PALETTE.charcoal, fontSize: 10.5, fontFace: FONT.body } },
  ], {
    x: 0.6, y: 4.32, w: 8.8, h: 0.85,
    margin: 0, valign: "top", paraSpaceAfter: 3,
  });

  return s;
}

// ------- CASE QUESTION SLIDE (vignette + question only) -------
function addCaseQuestionSlide(pres, opts) {
  const s = newContentSlide(pres, {
    topic: opts.topic,
    slideNumber: opts.slideNumber,
    totalSlides: opts.totalSlides,
    title: opts.title || "Clinical case",
    subtitle: opts.subtitle || "Think it through — answer is on the next slide.",
    source: opts.source || "Clinical teaching case.",
  });

  // Vignette card (large)
  s.addShape("rect", {
    x: 0.4, y: 1.4, w: 9.2, h: 2.75,
    fill: { color: PALETTE.card },
    line: { color: PALETTE.border, width: 0.5 },
  });
  s.addShape("rect", {
    x: 0.4, y: 1.4, w: 0.08, h: 2.75,
    fill: { color: PALETTE.primary }, line: { type: "none" },
  });
  s.addText("VIGNETTE", {
    x: 0.6, y: 1.48, w: 8.8, h: 0.25,
    fontFace: FONT.body, fontSize: 10, bold: true,
    color: PALETTE.primary, charSpacing: 4, margin: 0,
  });
  s.addText(opts.vignette, {
    x: 0.6, y: 1.78, w: 8.8, h: 2.3,
    fontFace: FONT.body, fontSize: 13,
    color: PALETTE.charcoal, margin: 0, valign: "top",
  });

  // Question box (prominent)
  s.addShape("rect", {
    x: 0.4, y: 4.3, w: 9.2, h: 0.9,
    fill: { color: PALETTE.ice },
    line: { color: PALETTE.secondary, width: 0.5 },
  });
  s.addText([
    { text: "QUESTION:  ", options: { bold: true, color: PALETTE.primaryDark, fontSize: 13, fontFace: FONT.body } },
    { text: opts.question, options: { color: PALETTE.charcoal, fontSize: 13, fontFace: FONT.body } },
  ], {
    x: 0.6, y: 4.37, w: 8.8, h: 0.78,
    margin: 0, valign: "middle",
  });
  return s;
}

// ------- CASE ANSWER SLIDE (answer + teaching only) -------
function addCaseAnswerSlide(pres, opts) {
  const s = newContentSlide(pres, {
    topic: opts.topic,
    slideNumber: opts.slideNumber,
    totalSlides: opts.totalSlides,
    title: opts.title || "Clinical case — answer",
    subtitle: opts.subtitle || "Key teaching points from the case.",
    source: opts.source || "Clinical teaching case.",
  });

  // Answer card
  s.addShape("rect", {
    x: 0.4, y: 1.4, w: 9.2, h: 1.2,
    fill: { color: PALETTE.card },
    line: { color: PALETTE.border, width: 0.5 },
  });
  s.addShape("rect", {
    x: 0.4, y: 1.4, w: 0.08, h: 1.2,
    fill: { color: PALETTE.accent }, line: { type: "none" },
  });
  s.addText("ANSWER", {
    x: 0.6, y: 1.48, w: 8.8, h: 0.25,
    fontFace: FONT.body, fontSize: 10, bold: true,
    color: PALETTE.accent, charSpacing: 4, margin: 0,
  });
  s.addText(opts.answer, {
    x: 0.6, y: 1.78, w: 8.8, h: 0.8,
    fontFace: FONT.body, fontSize: 14, bold: true,
    color: PALETTE.primary, margin: 0, valign: "top",
  });

  // Teaching card
  s.addShape("rect", {
    x: 0.4, y: 2.75, w: 9.2, h: 2.45,
    fill: { color: PALETTE.card },
    line: { color: PALETTE.border, width: 0.5 },
  });
  s.addShape("rect", {
    x: 0.4, y: 2.75, w: 0.08, h: 2.45,
    fill: { color: PALETTE.primary }, line: { type: "none" },
  });
  s.addText("TEACHING", {
    x: 0.6, y: 2.83, w: 8.8, h: 0.25,
    fontFace: FONT.body, fontSize: 10, bold: true,
    color: PALETTE.primary, charSpacing: 4, margin: 0,
  });
  s.addText(opts.teaching, {
    x: 0.6, y: 3.12, w: 8.8, h: 2.0,
    fontFace: FONT.body, fontSize: 12,
    color: PALETTE.charcoal, margin: 0, valign: "top",
  });
  return s;
}

module.exports = {
  PALETTE, FONT, SLIDE,
  iconToBase64Png,
  addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addAbbreviationsSlide, addCaseSlide,
  addCaseQuestionSlide, addCaseAnswerSlide,
};
