# 🌿 Zelené Údolí

Útulná budovatelská hra pro mobil (běží v prohlížeči, žádná instalace ani build). Z malé osady vybuduj prosperující údolí.

## Jak se hraje

- Vyber budovu dole a **klepni na zvýrazněné pole**. Mapu posouváš prstem, dvěma prsty přibližuješ.
- Klepnutím na postavenou budovu uvidíš její stav a můžeš ji zbourat (vrátí polovinu ceny).
- Nahoře vidíš **level a jeho cíle**. Každý splněný level:
  - odemkne **novou oblast mapy** (zatím schovanou v mlze),
  - odemkne **nové budovy**,
  - dá bonusové suroviny.
- 9 levelů, cíl je postavit **Velký chrám**.

## Mechaniky

- 🏠 **Chaloupky** přivádějí obyvatele, ti pracují v budovách (každá výrobní budova potřebuje 1 pracovníka).
- 🍞 Od levelu 3 obyvatelé jedí chléb a ryby. Při hladu hra zpomalí práci a lidé přestanou přibývat.
- 💧 **Studna** zrychlí všechny sousední budovy o 50 %. 🌾 Pole u vody rostou rychleji.
- 📦 **Sklady** zvětšují místo pro každou surovinu. Když je sklad plný, výroba stojí.
- ⏩ Tlačítko vpravo nahoře zrychlí čas (1×, 2×, 4×).
- Postup se ukládá automaticky a údolí pracuje i po tvém odchodu (až 15 minut).

## Spuštění lokálně

Otevři `index.html` v prohlížeči, nebo `python3 -m http.server` a jdi na `http://localhost:8000`.

## GitHub Pages

V repozitáři **Settings → Pages**, *Deploy from a branch*, větev `main`, složka `/ (root)`. Hra pak poběží na `https://jedlink-ops.github.io/tovarna/`.
