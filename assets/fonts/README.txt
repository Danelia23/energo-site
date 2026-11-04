Шрифт бренда — Qanelas (брендбук, раздел 2.0).

Сейчас в папке: qanelas-medium (.woff2 и .ttf) — он используется для всех начертаний.
Чтобы получить настоящий жирный и остальные веса, положите сюда файлы с такими именами
(.woff2 с веб-лицензией) и раскомментируйте нужные блоки @font-face в начале css/styles.css:

  qanelas-regular.woff2   (400)
  qanelas-semibold.woff2  (600)
  qanelas-bold.woff2      (700)
  qanelas-extrabold.woff2 (800) — хэды (h1, h2): ExtraBold
  (сабы — h3 — это Bold 700)

Когда добавите Bold и ExtraBold: раскомментируйте их @font-face в css/styles.css и поставьте
--stroke-head и --stroke-sub (в :root) в 0 — сейчас жирность имитируется контуром.

Файлы qanelas-medium.eot и qanelas-medium.woff (по 0 байт) и qanelas-medium.svg сайту не нужны.
