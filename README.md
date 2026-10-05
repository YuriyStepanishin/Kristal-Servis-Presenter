# Kristal Service Presenter

Окремий встановлюваний презентатор каталогів LASKA.

## Структура

- `public/catalogs/` - PDF-каталоги, які входять до проєкту.
- `public/manifest.webmanifest` - налаштування встановлення додатка.
- `public/sw.js` - офлайн-кешування додатка та відкритих каталогів.
- `src/App.tsx` - вибір каталогу, групи, підгрупи та бренду.
- `src/PdfReader.tsx` - адаптивне читання PDF по одній сторінці.
- `src/SlideNavigation.tsx` - перехід між сторінками, лічильник і прогрес читання.

## Запуск для розробки

```bash
npm install
npm run dev
```

## Production-збірка

```bash
npm run build
npm run preview
```

У браузері додаток можна встановити через кнопку встановлення в адресному рядку або меню браузера.
