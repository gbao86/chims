# CHIMS Frontend

CHIMS is a hardware inventory and maintenance management system built with Next.js, Ant Design, and a FastAPI backend.

## Features

- Dashboard with live operational stats
- Inventory management with brand, image, stock metadata, and export actions
- Sales, purchase/import, customers, warranty, and reports pages connected to backend APIs
- Maintenance kanban board with drag-and-drop status updates
- Role-aware sidebar navigation and dark-mode friendly layout

## Getting Started

```bash
npm install
npm run dev
```

The app expects the backend API to be available at `http://localhost:8000` by default. You can override this with `NEXT_PUBLIC_API_URL`.

## Main Routes

- `/dashboard`
- `/inventory`
- `/catalog`
- `/sales`
- `/purchase`
- `/customers`
- `/maintenance`
- `/warranty`
- `/reports`

## Notes

- Inventory export supports CSV and Excel-compatible download endpoints.
- The maintenance board supports drag-and-drop status updates.
- Sales and purchase pages provide create/edit drawers backed by the API.
