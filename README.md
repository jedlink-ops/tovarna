# 🌿 Zelené Údolí

Útulná budovatelská hra pro mobil (běží v prohlížeči, bez instalace a buildu). Z malé osady vybuduj prosperující údolí – a nauč se vozit zboží dopravníky.

## Jak se hraje

- **Level 1 je tutoriál**, který tě provede krok za krokem (jde přeskočit tlačítkem).
- Vyber budovu dole a klepni na zvýrazněné pole. Mapu posouváš prstem, dvěma prsty přibližuješ.
- **Klepni na budovu** – vyskočí okénko: co dělá, co potřebuje (vstupy), jak postupuje výroba a proč případně stojí.
- 9 levelů. Každý odemkne **novou oblast** z mlhy a **nové budovy**.

## Logistika

- Budovy zboží samy nepřenášejí. Stavěj **dopravníky** (táhni prstem; pás se kreslí ve směru tažení) a vozi suroviny do Radnice, skladů i do dalších budov.
- Výrobní řetězce potřebují víc surovin z různých míst: pila (2× dřevo), pekárna (2× pšenice), kovárna (2× ruda + dřevo), dílna (železo + prkno), klenotník (zlato + železo).
- **Rozdělovač** posílá zboží střídavě na všechny strany.
- Přes **řeky** vedou mosty (od levelu 3, stojí prkna). Lesy a skály musíš obejít. Každý další level má těžší terén.
- 🏠 **Chaloupky**: dělníci bydlí do 6 polí od práce (2 na chaloupku). Klepnutím na chaloupku uvidíš dosah.
- 🍞 Od levelu 3 chaloupky jedí chléb a ryby (dovezené dopravníkem). Hladoví pracují poloviční rychlostí.
- Levely se plní **dodáním** surovin do Radnice/skladu a stavbami. Cíl: **Velký chrám**.

## Spuštění

Otevři `index.html`, nebo `python3 -m http.server` → `http://localhost:8000`. Postup se ukládá do prohlížeče.

## GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / `(root)`. Hra pak běží na `https://jedlink-ops.github.io/tovarna/`.
