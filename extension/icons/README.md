# Sentinel AI Extension Icons

This directory contains the icons for the Sentinel AI - Life Tracker browser extension.

## 🎨 Icon Design

The icons feature a modern, professional design with:
- **Purple gradient background** (#667eea to #764ba2) - representing AI and technology
- **Stylized eye symbol** - representing surveillance and tracking
- **Circuit patterns** - representing AI and neural networks
- **Clean, minimalist design** - recognizable at all sizes

## 📦 Generated Icons

Three icon sizes have been generated to meet Chrome extension requirements:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store and installation)

## 🛠️ How Icons Were Created

Icons were generated using the `generate_icons.py` Python script, which uses the Pillow (PIL) library to create the icons programmatically.

### To Regenerate Icons

If you need to modify the icons, you can:

1. Edit the `generate_icons.py` script to change colors, shapes, or design
2. Run the script:
   ```bash
   python generate_icons.py
   ```

### Alternative: HTML Generator

An HTML-based icon generator (`icon-generator.html`) is also included. Open it in a browser to:
- Preview the icons
- Download them manually
- Experiment with the design in real-time

## ✅ Integration

The icons have been integrated into `manifest.json`:

```json
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

## 🎯 Design Philosophy

The eye symbol represents:
- **Watchfulness** - Sentinel AI's monitoring capabilities
- **Awareness** - Tracking digital footprints
- **Intelligence** - AI-powered analysis

The circuit patterns add:
- **Technology aesthetic** - Modern, AI-focused design
- **Neural network reference** - Connection to machine learning
- **Professional appearance** - Suitable for a productivity tool

---

*Icons created for Sentinel AI - Life Tracker Extension*
