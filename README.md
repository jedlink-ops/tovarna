# 🌿 Zelené Údolí

Útulná budovatelská hra pro mobil (běží v prohlížeči, bez instalace a buildu). Z malé osady vybuduj prosperující údolí – a nauč se vozit zboží dopravníky.

## Jak se hraje

- **Level 1 je tutoriál**, který tě provede krok za krokem (jde přeskočit tlačítkem).
- Vyber budovu dole a klepni na zvýrazněné pole. Mapu posouváš prstem, dvěma prsty přibližuješ.
- **Klepni na budovu** – vyskočí okénko: co dělá, co potřebuje (vstupy), jak postupuje výroba a proč případně stojí.
- 9 levelů odemykají **nové budovy**. Mlhu rozptýlíš **Průzkumnou chatou** (postavíš ji do 10 polí od mlhy a materiál dovezeš pásem), takže si sám vybíráš, kam se vydáš.

## Logistika

- Budovy zboží samy nepřenášejí. Stavěj **dopravníky** (táhni prstem; pás se kreslí ve směru tažení) a vozi suroviny do Radnice, skladů i do dalších budov.
- Výrobní řetězce potřebují víc surovin z různých míst: pila (2× dřevo), pekárna (2× pšenice), kovárna (2× ruda + dřevo), dílna (železo + prkno), klenotník (zlato + železo).
- **Rozdělovač** posílá zboží střídavě na všechny strany.
- Přes **řeky** vedou mosty (od levelu 3, stojí prkna). Lesy a skály musíš obejít. Každý další level má těžší terén.
- 🏠 **Chaloupky**: dělníci bydlí do 6 polí od práce (2 na chaloupku). Klepnutím na chaloupku uvidíš dosah.
- 🍞 Od levelu 3 chaloupky jedí chléb a ryby (dovezené dopravníkem). Hladoví pracují poloviční rychlostí.
- 🏗 **Staveniště:** velké stavby (kovárna, dílna, klenotník, zlatý důl, Velký chrám) se nestaví z Radnice. Materiál na ně dovezeš pásem.
- 🌍 **Vzdálené projekty** na mapě (Přístav, Horská osada, Lesní hrad) spojíš jedním pásem. Dají trvalé bonusy.
- ⬆ **Vylepšování** budov na 3 stupně (klepni na budovu): rychlejší, odolnější a mění vzhled.
- 🌙 **Den a noc:** v noci vylézají **vlci** a kazí pásy a budovy (oprava 🔧). Brání **Strážní věž**, **Hlídka** a **Myslivec** (loví i zvěřinu). Noc přeskočí tlačítko 🌙 Spát.
- 🌧️🔥 **Události:** povodeň poškodí pásy a stavby na březích, požár se šíří a hasí ho studna nebo klepání.
- Levely se plní **dodáním** surovin do Radnice/skladu a stavbami. Cíl: **Velký chrám**.

## Ukládání a mapa

- Hra se ukládá automaticky v prohlížeči. V menu (☰) je **💾 Uložit**, **📤 Export** (kód nebo soubor) a **📥 Import** pro zálohu a přenos na jiné zařízení.
- **Nová hra:** pevná mapa „Údolí" nebo **náhodná mapa ze seedu** (číslo nebo slovo; stejný seed = stejná mapa).
- **↩ Zpět** vrátí poslední stavbu nebo bourání, **📊 Statistiky** ukážou výrobu a kde se zboží zasekává.

## Spuštění

Otevři `index.html`, nebo `python3 -m http.server` → `http://localhost:8000`. Postup se ukládá do prohlížeče.

## GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / `(root)`. Hra pak běží na `https://jedlink-ops.github.io/tovarna/`.

## Postavičky
- Každá pracující budova má jmenovaného pracovníka (dřevorubec kácí, kameník a horník kopou, farmář okopává, rybář rybaří, pekař, kovář, pilař…) – s vlastním nářadím a čepicí, nosí hotové zboží k budově.
- V chaloupkách bydlí obyvatelé, kteří se procházejí, povídají si a v noci nebo při vlcích utečou domů.
- Na staveništích pracují stavitelé, myslivec a hlídka střílejí/odhánějí vlky.
- Postavičky mívají bubliny s hláškami (reagují na noc, déšť, hlad, vlky, požár).
- Klepnutím na postavičku se otevře okénko se jménem, povoláním a aktuální činností.

## Hloubka (2.5D)
Skály, rudy a zlato mají boční stěny jako vyvýšené bloky, budovy, stromy a kameny vrhají stíny podle denní doby (ráno vlevo, večer vpravo, v noci mizí), koruny stromů se houpají ve větru a obraz má jemný vzdušný opar nahoře a teplé světlo dole.
