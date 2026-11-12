# 🏭 Mini Továrna

Jednoduchá hra ve stylu Factoria, určená pro mobil (dotykové ovládání). Běží v prohlížeči, žádná instalace ani build.

## Jak se hraje

- Vyber nástroj dole a **táhni prstem** po mapě. Pásy se kreslí ve směru tažení.
- **Dva prsty** = posun a zoom. Nástroj ✋ posouvá mapu jedním prstem, klepnutím na pás ho otočíš.
- ⛏️ **Důl** se staví na rudu (šedomodrá = železo, oranžová = měď) a sám předává rudu sousedním pásům a strojům.
- 🔥 **Pec** taví rudu na plechy, ⚙️ **Kola** z 2 železných plechů dělají ozubené kolo, 🔌 **Obvody** z 1 železa + 1 mědi dělají obvod.
- Všechno, co dopravíš do 📦 **základny**, se přičte do zásob a z plechů a kol platíš nové stavby.
- Plň úkoly nahoře, za každý dostaneš bonus.
- Postup se ukládá automaticky do prohlížeče (localStorage).

## Spuštění lokálně

Stačí otevřít `index.html` v prohlížeči, nebo např. `python3 -m http.server` a jít na `http://localhost:8000`.

## Nahrání na GitHub a hraní z mobilu (GitHub Pages)

1. Na github.com vytvoř nový repozitář (např. `mini-tovarna`), veřejný.
2. Nahraj soubory `index.html`, `game.js` a `README.md`
   (webově: **Add file → Upload files**, nebo přes git:
   `git init && git add . && git commit -m "první verze" && git branch -M main && git remote add origin https://github.com/TVOJE_JMENO/mini-tovarna.git && git push -u origin main`).
3. V repozitáři otevři **Settings → Pages**, u *Source* vyber **Deploy from a branch**, větev `main` a složku `/ (root)`, ulož.
4. Za minutu nebo dvě bude hra na `https://TVOJE_JMENO.github.io/mini-tovarna/`.
5. Na mobilu otevři odkaz a v prohlížeči zvol **Přidat na plochu**, bude se tvářit jako aplikace.

## Nápady, co přidat dál

- uhlí a palivo do pecí, rozdělovače pásů, vyšší úrovně dolů
- nepřátelé a obrana, víc receptů, výzkum
- generování náhodné mapy podle seedu, zvuky
