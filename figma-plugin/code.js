/**
 * Spec Designer — builds real Figma layers from a plain JSON spec.
 *
 * Spec shape (all fields optional except `type`):
 * {
 *   "type": "frame" | "text" | "rectangle" | "ellipse" | "component" | "line",
 *   "name": "Login Screen",
 *   "width": 390, "height": 844,
 *   "fills": "#FFFFFF" | [{ "type": "SOLID", "color": "#111827" }],
 *   "strokes": "#E5E7EB", "strokeWeight": 1,
 *   "cornerRadius": 16,           // number or { topLeft, topRight, bottomRight, bottomLeft }
 *   "effects": [{ "type": "DROP_SHADOW", "color": "#00000033", "offset": { "x": 0, "y": 8 }, "radius": 24 }],
 *   "opacity": 1,
 *   // auto layout (frames/components)
 *   "layoutMode": "VERTICAL" | "HORIZONTAL",
 *   "padding": 32 | [32, 24] | { "top": 32, "right": 24, "bottom": 32, "left": 24 },
 *   "itemSpacing": 16,
 *   "primaryAxisAlignItems": "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN",
 *   "counterAxisAlignItems": "MIN" | "CENTER" | "MAX",
 *   "primaryAxisSizingMode": "AUTO" | "FIXED",
 *   "counterAxisSizingMode": "AUTO" | "FIXED",
 *   // child behaviour inside an auto-layout parent
 *   "layoutAlign": "STRETCH" | "INHERIT",
 *   "layoutGrow": 1,
 *   // text only
 *   "characters": "Welcome back",
 *   "fontSize": 24, "fontName": { "family": "Inter", "style": "Bold" },
 *   "textAlignHorizontal": "LEFT" | "CENTER" | "RIGHT",
 *   "lineHeight": 32, "letterSpacing": -0.2,
 *   "textAutoResize": "WIDTH_AND_HEIGHT" | "HEIGHT" | "NONE",
 *   "children": [ ... ]
 * }
 */

figma.showUI(__html__, { width: 560, height: 620, title: 'Spec Designer' });

const DEFAULT_FONT = { family: 'Inter', style: 'Regular' };
const FRAME_TYPES = ['frame', 'component'];

/* ------------------------------------------------------------------ utils */

function hexToRgb(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6); // alpha handled separately
  const int = parseInt(h, 16);
  if (isNaN(int) || h.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: ((int >> 16) & 255) / 255,
    g: ((int >> 8) & 255) / 255,
    b: (int & 255) / 255,
  };
}

function alphaFromHex(hex) {
  const h = String(hex).trim().replace('#', '');
  if (h.length === 8) return parseInt(h.slice(6, 8), 16) / 255;
  return 1;
}

function toColor(value) {
  if (typeof value === 'string') {
    return { ...hexToRgb(value), a: alphaFromHex(value) };
  }
  if (value && typeof value === 'object') {
    if (value.hex || value.color) return toColor(value.hex || value.color);
    const c = {
      r: value.r ?? 0,
      g: value.g ?? 0,
      b: value.b ?? 0,
      a: value.a ?? 1,
    };
    // allow 0-255 input
    if (c.r > 1 || c.g > 1 || c.b > 1) {
      c.r /= 255; c.g /= 255; c.b /= 255;
    }
    return c;
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function toPaints(value) {
  if (value === undefined || value === null) return undefined;
  const list = Array.isArray(value) ? value : [value];
  return list.map((p) => {
    if (typeof p === 'object' && p.type && p.type !== 'SOLID') {
      // gradients etc.: pass through with normalized stops
      const paint = { type: p.type, ...p };
      if (Array.isArray(paint.stops)) {
        paint.stops = paint.stops.map((s) => ({ position: s.position ?? 0, color: toColor(s.color) }));
      }
      if (p.color) paint.color = toColor(p.color);
      return paint;
    }
    return { type: 'SOLID', color: toColor(typeof p === 'object' ? (p.color ?? p.hex ?? p) : p), opacity: (typeof p === 'object' && p.opacity) || undefined };
  });
}

function toEffects(value) {
  if (!Array.isArray(value)) return undefined;
  return value.map((e) => ({
    type: e.type === 'INNER_SHADOW' ? 'INNER_SHADOW' : 'DROP_SHADOW',
    color: toColor(e.color ?? '#00000033'),
    offset: { x: e.offset?.x ?? 0, y: e.offset?.y ?? 0 },
    radius: e.radius ?? 8,
    spread: e.spread ?? 0,
    visible: e.visible ?? true,
    blendMode: e.blendMode ?? 'NORMAL',
  }));
}

function toPadding(p) {
  if (p === undefined) return null;
  if (typeof p === 'number') return { top: p, right: p, bottom: p, left: p };
  if (Array.isArray(p)) {
    if (p.length === 2) return { top: p[0], right: p[1], bottom: p[0], left: p[1] };
    if (p.length === 4) return { top: p[0], right: p[1], bottom: p[2], left: p[3] };
    return { top: p[0] ?? 0, right: p[1] ?? p[0] ?? 0, bottom: p[2] ?? p[0] ?? 0, left: p[3] ?? p[1] ?? p[0] ?? 0 };
  }
  return { top: p.top ?? 0, right: p.right ?? 0, bottom: p.bottom ?? 0, left: p.left ?? 0 };
}

/* ------------------------------------------------------------ node factory */

function createNode(spec) {
  switch ((spec.type || 'frame').toLowerCase()) {
    case 'text': return figma.createText();
    case 'rectangle': return figma.createRectangle();
    case 'ellipse': return figma.createEllipse();
    case 'line': return figma.createLine();
    case 'component': return figma.createComponent();
    case 'frame':
    default: return figma.createFrame();
  }
}

const usedFonts = new Set();
async function ensureFont(font) {
  const key = `${font.family}|${font.style}`;
  if (usedFonts.has(key)) return;
  await figma.loadFontAsync(font);
  usedFonts.add(key);
}

async function applyProps(node, spec) {
  if (spec.name) node.name = spec.name;

  // geometry first (text nodes resize themselves)
  if (spec.textAutoResize !== undefined && node.type === 'TEXT') {
    node.textAutoResize = spec.textAutoResize;
  }
  if (spec.width && spec.height && !(node.type === 'TEXT' && node.textAutoResize !== 'NONE')) {
    node.resize(spec.width, spec.height);
  } else if (spec.width && node.type !== 'TEXT') {
    node.resize(spec.width, node.height || 1);
  }

  if (spec.fills !== undefined) node.fills = toPaints(spec.fills) || [];
  if (spec.strokes !== undefined) {
    node.strokes = toPaints(spec.strokes) || [];
    node.strokeWeight = spec.strokeWeight ?? 1;
    if (spec.strokeAlign) node.strokeAlign = spec.strokeAlign;
  }
  if (spec.effects !== undefined) node.effects = toEffects(spec.effects) || [];
  if (spec.opacity !== undefined) node.opacity = spec.opacity;
  if (spec.blendMode) node.blendMode = spec.blendMode;
  if (spec.visible === false) node.visible = false;

  // corner radius
  if (spec.cornerRadius !== undefined) {
    if (typeof spec.cornerRadius === 'number') {
      node.cornerRadius = spec.cornerRadius;
    } else {
      const c = spec.cornerRadius;
      if ('topLeft' in node) {
        node.topLeftRadius = c.topLeft ?? 0;
        node.topRightRadius = c.topRight ?? 0;
        node.bottomRightRadius = c.bottomRight ?? 0;
        node.bottomLeftRadius = c.bottomLeft ?? 0;
      }
    }
  }

  // auto layout
  if (FRAME_TYPES.includes((spec.type || 'frame').toLowerCase())) {
    if (spec.layoutMode) {
      node.layoutMode = spec.layoutMode; // 'VERTICAL' | 'HORIZONTAL'
      const pad = toPadding(spec.padding ?? 0);
      if (pad) {
        node.paddingTop = pad.top;
        node.paddingRight = pad.right;
        node.paddingBottom = pad.bottom;
        node.paddingLeft = pad.left;
      }
      if (spec.itemSpacing !== undefined) node.itemSpacing = spec.itemSpacing;
      if (spec.primaryAxisAlignItems) node.primaryAxisAlignItems = spec.primaryAxisAlignItems;
      if (spec.counterAxisAlignItems) node.counterAxisAlignItems = spec.counterAxisAlignItems;
      if (spec.primaryAxisSizingMode) node.primaryAxisSizingMode = spec.primaryAxisSizingMode;
      if (spec.counterAxisSizingMode) node.counterAxisSizingMode = spec.counterAxisSizingMode;
      if (spec.clipsContent !== undefined) node.clipsContent = !!spec.clipsContent;
    } else if (spec.clipsContent !== undefined) {
      node.clipsContent = !!spec.clipsContent;
    }
  }

  // child behaviour (only meaningful inside an auto-layout parent)
  if (spec.layoutAlign && 'layoutAlign' in node) node.layoutAlign = spec.layoutAlign;
  if (spec.layoutGrow !== undefined && 'layoutGrow' in node) node.layoutGrow = spec.layoutGrow;

  // text
  if (node.type === 'TEXT') {
    const font = spec.fontName || DEFAULT_FONT;
    let loaded = font;
    try {
      await ensureFont(font);
    } catch (err) {
      loaded = DEFAULT_FONT;
      try { await ensureFont(loaded); } catch (e) { /* font unavailable */ }
    }
    node.fontName = loaded;
    if (spec.characters !== undefined) node.characters = String(spec.characters);
    if (spec.fontSize) node.fontSize = spec.fontSize;
    if (spec.lineHeight) {
      node.lineHeight = typeof spec.lineHeight === 'number'
        ? { value: spec.lineHeight, unit: 'PIXELS' }
        : spec.lineHeight;
    }
    if (spec.letterSpacing) {
      node.letterSpacing = typeof spec.letterSpacing === 'number'
        ? { value: spec.letterSpacing, unit: 'PIXELS' }
        : spec.letterSpacing;
    }
    if (spec.textAlignHorizontal) node.textAlignHorizontal = spec.textAlignHorizontal;
    if (spec.textAlignVertical) node.textAlignVertical = spec.textAlignVertical;
    if (spec.textDecoration) node.textDecoration = spec.textDecoration;
    if (spec.textCase) node.textCase = spec.textCase;
  }
}

async function build(spec, parent) {
  const node = createNode(spec);
  await applyProps(node, spec);
  if (parent && 'appendChild' in parent) parent.appendChild(node);

  const kids = spec.children || [];
  for (const child of kids) {
    await build(child, node);
  }

  // sizing fallback: hug contents when no explicit size was given
  if (FRAME_TYPES.includes((spec.type || 'frame').toLowerCase())) {
    if (!spec.width && spec.layoutMode) node.primaryAxisSizingMode = node.primaryAxisSizingMode || 'AUTO';
    if (!spec.height && spec.layoutMode) node.counterAxisSizingMode = node.counterAxisSizingMode || 'AUTO';
  }
  return node;
}

/* ---------------------------------------------------------------- messages */

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'cancel') {
    figma.closePlugin();
    return;
  }

  if (msg.type === 'generate') {
    let spec;
    try {
      spec = typeof msg.spec === 'string' ? JSON.parse(msg.spec) : msg.spec;
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: 'JSON نامعتبر: ' + err.message });
      return;
    }

    if (msg.clearPage) {
      figma.currentPage.children.forEach((c) => c.remove());
    }

    let roots;
    if (Array.isArray(spec)) {
      roots = [];
      for (const s of spec) roots.push(await build(s, figma.currentPage));
    } else {
      roots = [await build(spec, figma.currentPage)];
    }

    // frame the result nicely on screen
    const vp = figma.viewport.center;
    roots.forEach((root, i) => {
      if ('x' in root) {
        root.x = Math.round(vp.x + i * ((root.width || 200) + 80) - (root.width || 200) / 2);
        root.y = Math.round(vp.y - (root.height || 200) / 2);
      }
    });

    figma.currentPage.selection = roots;
    if (msg.zoomIn !== false && roots.length) {
      figma.viewport.scrollAndZoomIntoView(roots);
    }

    figma.ui.postMessage({
      type: 'done',
      message: `${roots.length} لایه‌ی ریشه ساخته شد: ${roots.map((r) => r.name).join('، ')}`,
    });
  }
};
