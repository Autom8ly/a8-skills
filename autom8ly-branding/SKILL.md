---
name: autom8ly-branding
description: >
  Applies Autom8ly's official brand colors (navy #0F3765, orange #F9824F) and Jost SemiBold typography
  to any artifact — presentations, documents, spreadsheets, HTML pages, or styled outputs.
  Use this skill whenever Autom8ly brand colors, style guidelines, visual formatting, or company design
  standards apply. Trigger it when the user mentions "Autom8ly brand", "our branding", "brand colors",
  "company style", or requests any document or presentation that should carry the Autom8ly look-and-feel,
  even if they don't explicitly say "branding." If the output is a deliverable that represents Autom8ly
  externally or internally, this skill should be used.
---

# Autom8ly Brand Styling

## Overview

This skill defines Autom8ly's visual identity so that every artifact Claude produces — slide decks,
Word documents, spreadsheets, HTML pages, React components, and more — looks unmistakably Autom8ly.

The brand centers on a confident navy-and-orange palette with clean, modern typography. The "8" in the
logo is always rendered in the secondary orange, reinforcing the automation-forward identity. The overall
feel is professional, approachable, and tech-savvy.

**Keywords**: Autom8ly, branding, corporate identity, visual identity, styling, brand colors, typography,
visual formatting, visual design, company style, presentations, documents

---

## Brand Guidelines

### Colors

**Primary Palette:**

| Role             | Hex       | RGB            | Usage                                      |
|------------------|-----------|----------------|--------------------------------------------|
| Primary (Navy)   | `#0F3765` | 15, 55, 101    | Headings, dark backgrounds, primary text   |
| Secondary (Orange)| `#F9824F`| 249, 130, 79   | Accents, CTAs, highlights, the "8" in logo |

**Extended Palette (derived from the primary pair):**

| Role              | Hex       | RGB            | Usage                                       |
|-------------------|-----------|----------------|---------------------------------------------|
| White              | `#FFFFFF` | 255, 255, 255  | Light backgrounds, text on dark             |
| Off-White          | `#F5F7FA` | 245, 247, 250  | Subtle section backgrounds, alternating rows|
| Light Navy         | `#1B4F8C` | 27, 79, 140    | Hover states, secondary headings, links     |
| Light Orange       | `#FBAA80` | 251, 170, 128  | Soft accent backgrounds, tag fills          |
| Dark Text          | `#1A1A2E` | 26, 26, 46     | Body text on light backgrounds              |
| Mid Gray           | `#6B7280` | 107, 114, 128  | Secondary text, captions, metadata          |
| Light Gray         | `#E5E7EB` | 229, 231, 235  | Borders, dividers, subtle UI elements       |
| Black              | `#000000` | 0, 0, 0        | High-contrast alternative backgrounds       |

### Typography

- **Primary Font**: Jost SemiBold (weight 600)
- **Fallback Fonts**: Calibri → Arial → sans-serif
- Jost is a geometric sans-serif that feels modern and precise — a natural match for an automation brand.

**Application rules:**

| Context            | Font               | Weight   | Size guidance       |
|--------------------|--------------------|----------|---------------------|
| Slide titles       | Jost SemiBold      | 600      | 28–36pt             |
| Section headings   | Jost SemiBold      | 600      | 20–28pt             |
| Subheadings        | Jost Medium        | 500      | 16–20pt             |
| Body text          | Jost Regular       | 400      | 11–14pt             |
| Captions/metadata  | Jost Light         | 300      | 9–11pt              |

Because Autom8ly uses a single font family (Jost) across all weights, hierarchy is expressed through
weight and size rather than switching between display and body typefaces. This keeps things clean and
consistent.

### Logo Usage

- The logo features interlocking gear-like circles (representing automation) alongside the wordmark.
- The "8" in "Autom8ly" is always in the secondary orange (`#F9824F`), even when the rest of the
  wordmark is in navy or white.
- **Light backgrounds**: Navy logo with orange "8"
- **Dark/navy backgrounds**: White logo with orange "8"
- **Orange backgrounds**: White logo with white "8"
- **Black backgrounds**: White logo with orange "8"
- Maintain clear space around the logo equal to the height of the "8" character.

---

## Applying the Brand

### Presentations (PPTX)

When building Autom8ly-branded slide decks:

- **Title slides**: Navy (`#0F3765`) background, white text, orange accent bar or element
- **Content slides**: White or off-white background, navy headings, dark text body
- **Section dividers**: Orange (`#F9824F`) background, white text
- **Accent shapes**: Cycle through orange → light navy → light orange
- **Charts and graphs**: Use navy as the primary data color, orange as the secondary, then light navy
  and light orange for additional series
- Apply Jost SemiBold to all headings (24pt+), Jost Regular to body text

### Documents (DOCX)

When building Autom8ly-branded Word documents:

- **Heading 1**: Jost SemiBold, 24pt, navy (`#0F3765`)
- **Heading 2**: Jost SemiBold, 18pt, navy
- **Heading 3**: Jost Medium, 14pt, light navy (`#1B4F8C`)
- **Body**: Jost Regular, 11pt, dark text (`#1A1A2E`)
- **Accent lines / horizontal rules**: Orange (`#F9824F`)
- **Table headers**: Navy background, white text
- **Table alternating rows**: Off-white (`#F5F7FA`)
- **Hyperlinks**: Light navy (`#1B4F8C`)

### Spreadsheets (XLSX)

When building Autom8ly-branded spreadsheets:

- **Header row**: Navy (`#0F3765`) fill, white bold text (Jost SemiBold if available)
- **Alternating rows**: White and off-white (`#F5F7FA`)
- **Totals / summary rows**: Light orange (`#FBAA80`) fill
- **Borders**: Light gray (`#E5E7EB`)
- **Charts**: Navy primary, orange secondary, then extended palette

### HTML & React Artifacts

When building web-based outputs:

```css
:root {
  --autom8ly-navy: #0F3765;
  --autom8ly-orange: #F9824F;
  --autom8ly-white: #FFFFFF;
  --autom8ly-off-white: #F5F7FA;
  --autom8ly-light-navy: #1B4F8C;
  --autom8ly-light-orange: #FBAA80;
  --autom8ly-dark-text: #1A1A2E;
  --autom8ly-mid-gray: #6B7280;
  --autom8ly-light-gray: #E5E7EB;

  --font-primary: 'Jost', 'Calibri', 'Arial', sans-serif;
}
```

- Import Jost from Google Fonts: `https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap`
- Use navy for headers and nav bars, orange for buttons and interactive accents
- Off-white for page backgrounds, white for card surfaces
- Maintain accessible contrast ratios (WCAG AA minimum)

---

## Technical Details

### Font Management

- Jost is freely available via Google Fonts and can be pre-installed in the environment
- When Jost is not available, fall back to Calibri (widely available on Windows/Office), then Arial
- For PPTX and DOCX: use `python-pptx` / `python-docx` font assignment with the fallback chain
- For HTML/React: import from Google Fonts CDN with local fallbacks in the font stack

### Color Application

- Use RGB tuples for `python-pptx` (`RGBColor(15, 55, 101)`) and `python-docx`
- Use hex values for CSS, HTML, and React styling
- When generating charts with matplotlib/plotly, set the color cycle to: navy, orange, light navy, light orange, mid gray

### Contrast and Accessibility

- Navy on white: contrast ratio ~10.5:1 (AAA)
- Orange on white: contrast ratio ~3.2:1 — use only for large text (18pt+) or decorative elements, never for small body text
- White on navy: ~10.5:1 (AAA)
- White on orange: ~3.2:1 — acceptable for large headings on orange section dividers
- For data visualizations, avoid relying on color alone; include labels or patterns
