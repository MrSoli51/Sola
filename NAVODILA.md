# 📱 Redovalnica kot aplikacija na telefonu (PWA)

Nič nameščanja programov, nič prevajanja. Tri minute.

## Kaj potrebuješ
Vse datoteke iz mape `redovalnica_pwa` (index.html, style.css, script.js, manifest.json, sw.js in ikone).
Morajo biti **skupaj v isti mapi** na spletu. PWA namreč deluje samo prek `https://`, ne z navadnim dvoklikom.

## Najlažje: GitHub Pages (že imaš račun MrSoli51)

1. Na github.com ustvari nov repozitorij, npr. `redovalnica` (Public).
2. Klikni **Add file → Upload files** in povleci vseh 8 datotek iz mape `redovalnica_pwa`.
   ⚠️ Naloži same datoteke, NE mape — da so v korenu repozitorija.
3. Commit.
4. Pojdi v **Settings → Pages**. Pri "Source" izberi **Deploy from a branch**, veja `main`, mapa `/ (root)`. Shrani.
5. Počakaj minuto. Zgoraj se pojavi naslov tipa:
   `https://mrsoli51.github.io/redovalnica/`

## Namesti na telefon

1. Ta naslov odpri v brskalniku na telefonu (Chrome / Safari).
2. **Android (Chrome):** meni ⋮ → **Dodaj na začetni zaslon** (ali samodejni poziv "Namesti").
   **iPhone (Safari):** gumb Deli → **Dodaj na začetni zaslon**.
3. Dobiš ikono. Odpre se čez cel zaslon kot prava aplikacija in dela brez interneta.

## Opomniki za teste

V zavihku **Ocenjevanje znanja** tapni predmet/mesec → dodaj test → izberi opomnik (npr. "1 dan prej ob 18:00").
Pri vsakem testu je gumb 📅 — tapni ga in telefon odpre koledarski vnos z že vpisanim opomnikom, ti samo potrdiš **Shrani**.
Tako te opomni **Google/Apple koledar** ob izbrani uri, tudi ko je redovalnica zaprta.

(To je en tap na test. Popolnoma samodejnega vpisa v koledar brez tapa ne delam, ker bi zahteval prijavo v tvoj Google račun — nepotrebno tveganje.)

## Prenos ocen z računalnika na telefon
Na računalniku odpri isto stran → meni → **Izvozi** (dobiš .json). Prenesi na telefon, v aplikaciji → **Uvozi**. Vse ocene se prenesejo.

---
Če obtičiš pri GitHub Pages, mi povej pri katerem koraku, pa te vodim.
