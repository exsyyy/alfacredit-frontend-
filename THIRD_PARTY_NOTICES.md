# Сторонние компоненты frontend

Общая поставка: [NaOpite/alfacredit](https://github.com/NaOpite/alfacredit). Этот файл перечисляет зависимости интерфейса; полный граф зафиксирован в package-lock.json. Лицензии/copyright в пакетах и базовых образах сохраняются.

## Frontend: npm-библиотеки и инструменты

| Пакет | Версия | Лицензия по package-lock.json | Использование |
|---|---|---|---|
| [react](https://www.npmjs.com/package/react/v/19.3.0) | 19.3.0 | MIT | интерфейс |
| [react-dom](https://www.npmjs.com/package/react-dom/v/19.3.0) | 19.3.0 | MIT | интерфейс |
| [react-router-dom](https://www.npmjs.com/package/react-router-dom/v/7.18.4) | 7.18.4 | MIT | интерфейс |
| [@testing-library/jest-dom](https://www.npmjs.com/package/@testing-library/jest-dom/v/7.0.1) | 7.0.1 | MIT | сборка / типы / тесты |
| [@testing-library/react](https://www.npmjs.com/package/@testing-library/react/v/16.3.3) | 16.3.3 | MIT | сборка / типы / тесты |
| [@types/node](https://www.npmjs.com/package/@types/node/v/24.13.5) | 24.13.5 | MIT | сборка / типы / тесты |
| [@types/react](https://www.npmjs.com/package/@types/react/v/19.3.0) | 19.3.0 | MIT | сборка / типы / тесты |
| [@types/react-dom](https://www.npmjs.com/package/@types/react-dom/v/19.3.0) | 19.3.0 | MIT | сборка / типы / тесты |
| [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react/v/6.1.1) | 6.1.1 | MIT | сборка / типы / тесты |
| [jsdom](https://www.npmjs.com/package/jsdom/v/29.1.1) | 29.1.1 | MIT | сборка / типы / тесты |
| [typescript](https://www.npmjs.com/package/typescript/v/6.0.3) | 6.0.3 | Apache-2.0 | сборка / типы / тесты |
| [vite](https://www.npmjs.com/package/vite/v/8.3.0) | 8.3.0 | MIT | сборка / типы / тесты |
| [vitest](https://www.npmjs.com/package/vitest/v/5.0.3) | 5.0.3 | MIT | сборка / типы / тесты |

Полный граф зависимостей и сведения о лицензиях — в `package-lock.json` frontend. Системные шрифты Arial/Segoe UI запрашиваются CSS браузера; файлы шрифтов в поставку проекта не включены.

## Сборка и контейнер

Node.js 24-alpine используется при сборке (MIT и сторонние notices Node.js), nginx:stable-alpine — для раздачи интерфейса (BSD-2-Clause для nginx). У пакетов Alpine собственные лицензии. Версии прямых npm-зависимостей фиксированы в package.json/package-lock.json.

CSS использует системные Arial/Segoe UI; файлы шрифтов не распространяются. Моковые данные синтетические. Скриншоты продукта находятся в главном репозитории. Реальный кредитный процесс обеспечивается API, а не локальным мок-режимом.
