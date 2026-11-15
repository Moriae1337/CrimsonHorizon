# CrimsonHorizon Design System & Color Palette

This specification defines the visual design system, color palette, design tokens, and UI component standards for **CrimsonHorizon**. All frontend implementations, map components, and future UI features must strictly adhere to this specification.

---

## 1. Core 3-Color Palette

The interface is anchored by a minimal three-color palette inspired by Martian geology and deep space operations:

| Token         | Hex       | RGB                  | Role & Usage                                                                                                                                                |
| :------------ | :-------- | :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Main**      | `#212121` | `rgb(33, 33, 33)`    | **Dark Canvas & Surface.** Header, sidebar, card backgrounds, panel surfaces, container backgrounds.                                                        |
| **Secondary** | `#EBEBEB` | `rgb(235, 235, 235)` | **Light Foreground & High Contrast.** Primary headings, body text, secondary button backgrounds, landmark markers, active radio indicators.                 |
| **Accent**    | `#8F5A53` | `rgb(143, 90, 83)`   | **Martian Terracotta / Rust.** Primary action buttons, active checkbox fills, selected landmarks, slider tracks, badges/tags, focus rings, traverse routes. |

```
┌─────────────────────────────────┐   ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│                                 │   │                                 │   │                                 │
│              Main               │   │            Secondary            │   │             Accent              │
│            #212121              │   │             #EBEBEB             │   │             #8F5A53             │
│                                 │   │                                 │   │                                 │
└─────────────────────────────────┘   └─────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 2. Derived Semantic Design Tokens

To ensure consistency across complex layouts, forms, and map overlays, the three base colors expand into semantic design tokens:

### 2.1 Surfaces & Backgrounds

| Semantic Token       | Value     | Tailwind / CSS Variable                      | Purpose                                                         |
| :------------------- | :-------- | :------------------------------------------- | :-------------------------------------------------------------- |
| **Canvas**           | `#171717` | `bg-canvas` (`--color-canvas`)               | Deep background behind map tiles and page canvas.               |
| **Card / Surface**   | `#212121` | `bg-card` (`--color-card`)                   | Header, sidebar background, primary card container.             |
| **Elevated Surface** | `#282828` | `bg-card-elevated` (`--color-card-elevated`) | Dropdowns, popovers, modals, hover states of cards and buttons. |
| **Input / Sunken**   | `#1A1A1A` | `bg-input` (`--color-input`)                 | Recessed form inputs, coordinate readouts, landmark item cards. |

### 2.2 Borders & Dividers

| Semantic Token    | Value     | Tailwind / CSS Variable                          | Purpose                                                            |
| :---------------- | :-------- | :----------------------------------------------- | :----------------------------------------------------------------- |
| **Border Subtle** | `#333333` | `border-card-border` (`--color-card-border`)     | 1px borders on header, sidebar, cards, and input outlines.         |
| **Border Strong** | `#4A4A4A` | `border-border-strong` (`--color-border-strong`) | Prominent separators, active card outlines.                        |
| **Border Accent** | `#8F5A53` | `border-accent` (`--color-accent`)               | Focused inputs, selected container outlines, active landmark card. |

### 2.3 Typography & Text Hierarchies

| Semantic Token     | Value     | Tailwind / CSS Variable                          | Purpose                                               |
| :----------------- | :-------- | :----------------------------------------------- | :---------------------------------------------------- |
| **Text Primary**   | `#EBEBEB` | `text-text-main` (`--color-text-main`)           | Headings, primary labels, values, active button text. |
| **Text Secondary** | `#A3A3A3` | `text-text-secondary` (`--color-text-secondary`) | Subheadings, descriptions, body prose, metadata.      |
| **Text Muted**     | `#737373` | `text-text-muted` (`--color-text-muted`)         | Section counters, input placeholders, disabled text.  |
| **Text Accent**    | `#8F5A53` | `text-accent` (`--color-accent`)                 | Highlighted units, active links, accent badges.       |

### 2.4 Interactive & Accent States

| Interaction State         | Value                                   | Description                                                               |
| :------------------------ | :-------------------------------------- | :------------------------------------------------------------------------ |
| **Accent Default**        | `#8F5A53`                               | Normal state for primary actions and highlights.                          |
| **Accent Hover**          | `#9F665E`                               | Hover state for accent buttons and interactive elements (+10% lightness). |
| **Accent Active**         | `#7E4D46`                               | Active / pressed state for accent buttons (-10% lightness).               |
| **Accent Subtle (Badge)** | `#8F5A5333` (`rgba(143, 90, 83, 0.20)`) | Pill badge background, selection halo, translucent overlays.              |
| **Focus Ring**            | `ring-1 ring-[#8F5A53]`                 | Universal focus indicator for keyboard and form navigation.               |

---

## 3. UI Component Specifications

### 3.1 Badges / Category Pills

- **Structure**: Pill with rounded corners (`rounded-full` or `rounded-md`), compact typography (`text-xs font-semibold uppercase tracking-wider`).
- **Colors**:
  - Background: `rgba(143, 90, 83, 0.2)` (`bg-accent-subtle` / `#8F5A5333`)
  - Border: 1px solid `rgba(143, 90, 83, 0.4)`
  - Text: `#EBEBEB` (`text-secondary`)
- **Usage**: Mission context pills (e.g. `UI PLAYGROUND`, `JEZERO CRATER · IAU2000:104905`, `HAWKSBILL GAP`).

### 3.2 Buttons

Three primary button variants are permitted:

1. **Primary Button**:
   - Background: `#8F5A53` (`bg-accent`)
   - Hover: `#9F665E` (`hover:bg-accent-hover`)
   - Active: `#7E4D46` (`active:bg-accent-active`)
   - Text: `#EBEBEB` (`text-secondary`), `font-medium text-xs sm:text-sm`
   - Border radius: `rounded-lg` (8px)
   - Padding: `px-3 py-1.5` or `px-4 py-2`
   - Usage: Primary call-to-action (e.g. "Jezero Crater", "Calculate Route").

2. **Secondary Button**:
   - Background: `#EBEBEB` (`bg-secondary`)
   - Hover: `#FFFFFF`
   - Active: `#D6D6D6`
   - Text: `#212121` (`text-main`), `font-medium text-xs sm:text-sm`
   - Border radius: `rounded-lg` (8px)
   - Padding: `px-3 py-1.5` or `px-4 py-2`
   - Usage: Alternative actions, secondary navigation (e.g. "Global Mars", "Field Brief").

3. **Outline Button**:
   - Background: `transparent`
   - Border: 1px solid `#3E3E3E` (hover: `#EBEBEB`)
   - Hover: `bg-[#2A2A2A]`
   - Text: `#EBEBEB` (`text-secondary`), `font-medium text-xs sm:text-sm`
   - Border radius: `rounded-lg` (8px)
   - Padding: `px-3 py-1.5` or `px-4 py-2`
   - Usage: Tertiary actions, utility commands, reset view.

### 3.3 Form Elements

- **Text Inputs & Textareas**:
  - Background: `#1A1A1A` (`bg-input`)
  - Border: 1px solid `#333333` (`border-input-border`)
  - Border Focus: `#8F5A53` (`focus:border-accent`), `focus:ring-1 focus:ring-accent`
  - Text: `#EBEBEB`
  - Placeholder: `#666666`
  - Border radius: `rounded-lg`
- **Checkboxes**:
  - Selected state: Background `#8F5A53`, border `#8F5A53`, checkmark `#EBEBEB`.
  - Unselected state: Background `#1A1A1A`, border `#444444`.
- **Radio Buttons**:
  - Selected state: Outer ring `#8F5A53` (or `#EBEBEB`), inner dot `#8F5A53` (or `#EBEBEB`).
  - Unselected state: Outer ring `#444444`, transparent interior.
- **Sliders**:
  - Track (filled/active): `#8F5A53` (`bg-accent`).
  - Track (unfilled): `#333333`.
  - Thumb: Circular `#EBEBEB` (`bg-secondary`), diameter 16px with subtle shadow.

### 3.4 OpenLayers & Map Overlays

- **Map View Background**: `#171717`.
- **Controls (`.ol-control`)**: Background `rgba(33, 33, 33, 0.9)`, border `1px solid #333333`, button background `#282828`, hover `#8F5A53`.
- **Scale Line (`.ol-scale-line`)**: Background `rgba(33, 33, 33, 0.9)`, border `1px solid #333333`, inner scale border `#8F5A53`, text `#EBEBEB`.
- **Attribution (`.ol-attribution`)**: Background `rgba(33, 33, 33, 0.9)`, border `1px solid #333333`, text `#A3A3A3`.
- **Landmark Markers**:
  - Default: fill `#EBEBEB`, stroke `#212121` (2px), radius 6.
  - Selected: fill `#8F5A53`, stroke `#EBEBEB` (2px), radius 8.
  - Label text: fill `#EBEBEB`, stroke `#212121` (3px).
- **Nominal Traverse Path**: `#8F5A53` (solid line 2.5px).
- **Alternative / Contingency Path**: `#EBEBEB` (dashed line 2px).
