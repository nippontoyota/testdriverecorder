---
name: Velocity Systems
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0b1c30'
  on-tertiary-container: '#75859d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  table-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '450'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  row-height-dense: 32px
  row-height-standard: 48px
  stack-gap: 12px
---

## Brand & Style

The design system is engineered for the high-stakes environment of automotive fleet management. It targets operations managers and sales directors who require immediate clarity over high-velocity data. The brand personality is **Corporate/Modern**: it is precise, systematic, and exudes the reliability of a precision-engineered machine.

The visual style prioritizes **Minimalism** with a focus on data density. It avoids unnecessary ornamentation to reduce cognitive load during complex scheduling and tracking tasks. The emotional response should be one of "controlled efficiency"—the user should feel that every data point is exactly where it needs to be to facilitate a frictionless workflow.

## Colors

The palette is anchored in **Slate Greys** and **Corporate Blues** to establish a foundation of trust and professional rigor.

- **Primary (#0F172A):** Deep navy used for navigation, primary headers, and high-impact text to ground the interface.
- **Secondary (#2563EB):** A vibrant but professional blue reserved for primary actions, active states, and focus indicators.
- **Neutral (#F8FAFC):** Used for large surface areas to provide a clean, "paper-like" background that allows data tables to stand out.
- **Semantic Colors:** Rigorous application of Green (Available), Amber (In-Progress), and Red (Overdue/Issues) for instant status recognition in vehicle tracking.

## Typography

This design system utilizes a tiered typography strategy to manage data density. **Hanken Grotesk** provides a modern, sharp edge to high-level dashboard summaries. **Inter** is the workhorse for all body content and UI controls, chosen for its exceptional legibility at small sizes within data tables. 

**JetBrains Mono** is introduced specifically for VIN numbers, license plates, and timestamps, ensuring that characters like '0' and 'O' or '1' and 'l' are never confused during rapid data entry or review. Use `label-caps` for table headers and section dividers to create clear structural anchors.

## Layout & Spacing

The system employs a **Fixed-Fluid Hybrid** grid. The primary navigation is a fixed 240px sidebar, while the content area utilizes a 12-column fluid grid. 

- **Density:** The layout supports two density modes. "Standard" for general management and "Compact" for high-volume inventory screens.
- **Tables:** Data tables should span the full width of their containers. Use a sticky header for long scrolls and sticky columns for vehicle identifiers.
- **Margins:** Maintain a 24px outer margin on desktop to provide breathing room. On mobile, reduce this to 16px and collapse the sidebar into a bottom-anchored navigation or hamburger menu.

## Elevation & Depth

To maintain a clean, SaaS-like appearance, depth is conveyed through **Tonal Layers** and **Low-contrast outlines** rather than heavy shadows.

- **Base Level:** The application background is the lightest neutral (#F8FAFC).
- **Surface Level:** Cards, table containers, and form blocks use a pure white (#FFFFFF) background with a 1px solid border (#E2E8F0).
- **Active Elevation:** Only the most critical interactive elements (like an active "Start Test Drive" modal) receive a subtle, ultra-diffused shadow (0px 4px 12px rgba(15, 23, 42, 0.08)).
- **Separation:** Use 1px dividers in Slate-200 for internal table borders and form grouping.

## Shapes

The design system uses a **Soft** shape language. A 4px (0.25rem) base radius is applied to buttons, input fields, and small UI components. This creates a professional appearance that feels modern but remains grounded and structured.

- **Standard Elements:** 4px radius.
- **Cards/Containers:** 8px radius for a slightly softer boundary on large content blocks.
- **Status Badges:** Fully rounded (pill) to distinguish them clearly from interactive buttons.

## Components

### Data Tables
Tables are the heart of the system. Use a "Zebra-stripe" pattern on hover only. Table headers use `label-caps` typography with a subtle grey background. Include inline action icons (edit, view, print) that appear on row-hover to reduce visual clutter.

### Status Badges
Used for TD (Test Drive) Categories: 
- *Pending:* Light Grey / Slate text.
- *Active:* Light Blue / Blue text.
- *Completed:* Light Green / Green text.
- *Issue/Overdue:* Light Red / Red text.
All badges use high-contrast text on a low-opacity background of the same hue.

### Input Fields
Inputs should have a clear 1px border. Focus states must use the Secondary blue with a 2px outer glow. Labels are always visible (never placeholder-only) to ensure accessibility during rapid data entry.

### Analytical Charts
Use a palette of Blues and Slates for primary data. Semantic colors should only be used in charts when representing specific health metrics (e.g., vehicle maintenance alerts). Line charts should use a 2px stroke width with subtle area fills.

### Primary Buttons
High-contrast (Primary Navy or Secondary Blue background) with white text. Hover states should darken the background color by 10%.