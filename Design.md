# Dum & Co. Design Guide

## Product

Dum & Co. is a direct ordering site for a Hyderabadi kitchen. Customers pick an outlet, browse the menu, customize dishes, and track their order. Kitchen staff use a separate workspace to advance tickets and manage availability. The storefront should feel warm through food photography and clear through its interface.

## Visual language

Use white as the main canvas, charcoal for headings, and pink to draw attention to the next action. Let dish photography carry most of the color. Use Geist Variable throughout, with large headlines in the storefront and a quieter type hierarchy in forms and workspaces.

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#FFFFFF` | Page, navigation, menu cards, and dialogs |
| Soft surface | `#F7F7F7` | Featured dishes, party banner, and staff columns |
| Strong surface | `#F2F2F2` | Segmented controls and hover surfaces |
| Ink | `#222222` | Headings, navigation, and secondary buttons |
| Body and muted | `#3F3F3F` / `#6A6A6A` | Descriptions and supporting details |
| Divider | `#DDDDDD` | Separators and field borders |
| Accent | `#FF385C` | Decorative accents and category selection indicator |
| Primary action | `#E00B41` | Buttons with white labels, including the bag and featured dish actions |
| Error and success | `#C13515` / `#387444` | Validation and positive feedback alongside text labels |

Use 8 px corners on standard buttons and inputs, 14 px corners on menu cards and dialogs, and pill shapes on search and photo badges. Use one subtle shadow for floating elements. Photo overlays keep white labels readable against the image.

## Storefront

1. Keep the outlet selector in the header so customers can see which kitchen serves the menu.
2. Open with the full-width food photograph and the two-line “Hyderabad, served hot.” headline. Give **Explore the menu** the primary treatment and **Plan a party** the secondary treatment.
3. Show Biryani, Starters, and Desserts as photo tiles that open the matching menu category.
4. Keep search, category filters, and the vegetarian toggle with the menu grid. Dish cards show the photo, dietary information, price, and an Add action. The dish dialog shows available choices and allergen information.
5. Follow the menu with the house favourites carousel, the three-step ordering story, and the party-order banner.

## Checkout and staff screens

Keep the bag contents and order totals easy to scan. Show the customer’s preparation estimate and current status together in order tracking. In the kitchen workspace, make the ticket number, items, elapsed time, and next action legible at a glance. Use clear labels for late tickets, sold-out dishes, and errors so these states are recognizable by more than color.

## Layout and motion

Preserve the current component structure, section order, spacing, grids, and responsive breakpoints. The category grid expands the hovered or focused tile on desktop and stacks on smaller screens. Keep the existing photo zoom, manual carousel controls, scroll-driven text reveal, and desktop story-card stack. Respect the operating system’s reduced-motion preference and retain visible keyboard focus.

Shared tokens and component styles live in `frontend/src/index.css`. Storefront-specific styles live in `frontend/src/components/storefront.css`.
