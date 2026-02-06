# DataHub 3: Særtilfælde og fejlhåndtering

Alle edge cases, fejlscenarier og genopretningsprocedurer samlet ét sted. Dækker korrektioner af måledata, fejlagtige processer, annulleringer, afstemningsafvigelser, systemfejl og kundetvister.

---

## 1. Korrektioner af måledata

Den vigtigste edge case i systemet. Netvirksomheden kan indsende **rettede målinger** for en allerede afregnet periode.

### Hvordan korrektioner ankommer

- Vi modtager en ny RSM-012 for samme målepunkt + periode via Timeseries-køen
- Der er **ingen eksplicit markering** der siger "dette er en korrektion"
- Vi skal selv sammenligne med det vi allerede har gemt
- Enhver RSM-012 kan potentielt være en korrektion

### Detektionslogik

```
1. Modtag RSM-012 → parse MeteringPointId + periode + Point[]
2. Slå op i metering_data for samme MeteringPointId + tidsinterval
3. Hvis INGEN eksisterende data → initial data (normal indlæsning)
4. Hvis eksisterende data FINDES → dette er en korrektion:
   a. Beregn delta pr. interval: ny_mængde - gammel_mængde
   b. Beregn økonomisk effekt (se korrektionsformler)
   c. Overskriv måledata med nye værdier
   d. Generér kredit-/debitnota
5. Dequeue beskeden
```

### Korrektionsformler

| Komponent | Formel |
|-----------|--------|
| **Energi** | `deltaKwh × calculatedPrice` |
| **Tarif** | `originalKwh × (newRate - oldRate) + deltaKwh × newRate` |
| **Produktmargin** | `deltaKwh × productRate` |
| **Abonnement** | Uændret (fast beløb, afhænger ikke af forbrug) |
| **Elafgift** | `deltaKwh × afgiftssats` |
| **Moms** | 25% af summen af alle ændringer |

### Mulige årsager til korrektioner

| Årsag | Typisk tidspunkt | Hyppighed |
|-------|-----------------|-----------|
| Målerfejl korrigeret | Uger/måneder efter original aflæsning | Sjælden |
| Estimerede data erstattet med faktiske | Dage efter original | Almindelig |
| Netvirksomhed retter valideringsfejl | Dage-uger | Lejlighedsvis |
| Kvalitetskode-opgradering (A02→A03) | Dage | Almindelig |

### Systemdesign-implikationer

- **Idempotent opdatering:** Overskriv-logik skal håndtere at samme korrektion kan ankomme flere gange
- **Historik:** Bevar den originale aflæsning i en audit-log før overskrivning
- **Genberegning:** Afregningsmotor skal kunne genberegne for vilkårlige historiske perioder
- **Tidsbegrænsning:** Korrektioner kan ankomme op til 3 år efter den oprindelige aflæsning (⚠ VERIFICÉR)

---

## 2. Fejlagtige processer

### 2.1 Fejlagtigt leverandørskifte (BRS-042)

Et leverandørskifte er sket ved en fejl — f.eks. forkert målepunkt eller kunden har ikke accepteret.

**Flow:**

| Trin | Retning | Handling |
|------|---------|----------|
| 1 | DDQ → DataHub | **BRS-042** tilbageførselsanmodning |
| 2 | DataHub | Validerer anmodning, tilbagefører skiftet |
| 3 | DataHub → gammel DDQ | Gammel leverandør genindsættes |
| 4 | Internt | Alle måledata for den fejlagtige periode tilbageføres |
| 5 | Internt | Udstedte fakturaer for perioden krediteres |

**Tidsfrist:** Inden for 20 hverdage efter ikrafttrædelse (⚠ VERIFICÉR, jf. Forskrift H1)

**Konsekvenser for systemet:**
- Målepunkt skifter tilbage til gammel leverandør → supply_period skal korrigeres
- Alle afregningsresultater for perioden skal markeres som ugyldige
- Kreditnotaer genereres for eventuelle udstedte fakturaer
- Modtagne måledata for perioden slettes eller markeres som tilbageført

### 2.2 Fejlagtig flytning (BRS-011)

En til- eller fraflytningsdato var forkert.

**Flow:**

| Trin | Retning | Handling |
|------|---------|----------|
| 1 | DDQ → DataHub | **BRS-011** med den rettede dato |
| 2 | DataHub | Justerer leveranceperioden |
| 3 | DataHub → DDQ | Opdaterede måledata for den berørte periode (RSM-012) |
| 4 | Internt | Genberegn afregning for den berørte periode |
| 5 | Internt | Udsted kredit-/debitnotaer for differencer |

**Konsekvenser for systemet:**
- Leveranceperiodens start- eller slutdato ændres
- Måledata for den berørte periode kan ændre sig
- Abonnementsberegning (pro rata) justeres
- Acontoopgørelse skal evt. genberegnes

---

## 3. Annulleringer

### 3.1 Annuller leverandørskifte (BRS-003)

Kunden fortryder et leverandørskifte **inden** ikrafttrædelsesdatoen.

**Forudsætning:** Skiftet er anmodet (BRS-001) men ikrafttrædelsesdatoen er endnu ikke nået.

| Trin | Handling |
|------|----------|
| 1 | DDQ → DataHub: **BRS-003** annulleringsanmodning |
| 2 | DataHub → DDQ: Kvittering (accepteret/afvist) |
| 3 | DataHub → gammel DDQ: Notifikation om annullering |
| 4 | Internt: Markér ProcessRequest som `cancelled` |
| 5 | Internt: Fjern forberedte faktureringsplaner, acontoestimater etc. |

**Kan ikke annulleres efter ikrafttrædelse** — brug BRS-042 i stedet.

### 3.2 Annuller leveranceophør (BRS-044)

Kunden fortryder en opsigelse eller betaler et udestående beløb **inden** ikrafttrædelsesdatoen.

| Trin | Handling |
|------|----------|
| 1 | DDQ → DataHub: **BRS-044** annuller ophør |
| 2 | DataHub → DDQ: Kvittering (ophør annulleret) |
| 3 | Internt: Leverance fortsætter normalt |
| 4 | Internt: Annullér eventuelle forberedte slutafregninger |

**Typisk scenarie:** Kunden har fået BRS-002 pga. manglende betaling, betaler derefter.

---

## 4. Slutafregning ved offboarding

Uanset offboarding-årsag (leverandørskifte, fraflytning, manglende betaling) er slutafregningen den samme.

### Offboarding-scenarier

| Scenarie | Trigger | BRS-proces | Hvem initierer |
|----------|---------|------------|----------------|
| **A** | Kunden skifter til anden leverandør | Indgående BRS-001 | Ny leverandør |
| **B** | Kunden opsiger | BRS-002 | Os |
| **C** | Kunden fraflytter | BRS-010 | Os eller netvirksomhed |
| **D** | Manglende betaling | BRS-002 | Os |

### Slutafregningsprocedure

1. Modtag endelige RSM-012-måledata fra DataHub (op til slutdato)
2. Kør afregning for den delvise faktureringsperiode (periodens start → leverancens slutdato)
3. Beregn alle komponenter: energi, nettarif, abonnementer (**forholdsmæssigt**), afgifter

### Acontokunde: slutopgørelse

1. Beregn faktisk forbrug fra kvartalets start til leverancens slutdato (delvis periode)
2. Sammenlign med acontobetalinger modtaget for denne periode
3. Generér slutfaktura med afstemning:
   - Overbetalt → kreditnota / tilbagebetaling
   - Underbetalt → slutfaktura med restbeløb

### Slutfakturaens linjer

| Linje | Beskrivelse |
|-------|-------------|
| Energi + margin | Faktisk forbrug × satser for den delvise periode |
| Nettarif | Faktisk forbrug × tarifsatser, forholdsmæssigt |
| Abonnement (eget) | Forholdsmæssigt til leverancens slutdato |
| Abonnement (net) | Forholdsmæssigt til leverancens slutdato |
| Afgifter og gebyrer | Pr. kWh på faktisk forbrug |
| Acontoopgørelse (hvis relevant) | Difference mellem betalte estimater og faktisk total |
| Udestående saldo | Eventuelle ubetalte tidligere fakturaer |
| **Skyldig / tilgodehavende** | Nettobeløb |

### Efter slutfaktura

| Handling | Frist |
|----------|-------|
| Send slutfaktura til kunden | Inden 4 uger (jf. elleveringsbekendtgørelsen §17) |
| Ved kreditsaldo: tilbagebetaling til kundens bankkonto | Uden unødig forsinkelse |
| Ved debitsaldo: normale betalingsvilkår | Netto 14-30 dage |
| Ubetalt debitsaldo → inkasso | Efter betalingsfrist |
| Arkivér kundepost | Bevar i 5 år (⚠ VERIFICÉR) |
| Bevar måledata | Jf. opbevaringspolitik (3+ år ⚠ VERIFICÉR) |
| Deaktivér kundeportaladgang | Efter endelig betaling |

---

## 5. Afstemningsafvigelser (BRS-027)

Vores egen afregningsberegning afviger fra DataHubs engrosopgørelse (RSM-014).

### Afvigelsesprocedure

```
1. Modtag RSM-014 (aggregerede data pr. netområde)
2. Sammenlign med egen afregning for samme periode og netområde
3. Hvis afvigelse:
   a. Identificér afvigende målepunkter
   b. Anmod detaljerede aggregerede data (RSM-016)
   c. Analyser årsag:
      - Manglende måledata?
      - Forkerte tarifsatser?
      - Beregningsfejl?
4. Korriger:
   - Manglende data → anmod historiske data (RSM-015)
   - Forkerte satser → opdatér og genberegn
   - Beregningsfejl → ret og genberegn
5. Udsted kredit-/debitnotaer for berørte kunder
```

### Typiske årsager til afvigelse

| Årsag | Handling |
|-------|----------|
| Manglende RSM-012 for ét eller flere målepunkter | Anmod historiske data via RSM-015, genberegn |
| Forkerte/forældede tarifsatser brugt | Opdatér satser fra Charges-kø, genberegn |
| Korrektion modtaget efter vores afregningskørsel | Genberegn med korrigerede data |
| Tidszone-/afrundingsdifference | Juster beregningslogik |
| Målepunkt mangler i vores portefølje | Undersøg — mulig fejl i BRS-001-flow |

---

## 6. Kunde bestrider faktura

### Procedure

| Trin | Handling |
|------|----------|
| 1 | Kunden kontakter support med indsigelse |
| 2 | Anmod historiske validerede data fra DataHub (RSM-015) for verifikation |
| 3 | Anmod aggregerede data (RSM-016) til krydskontrol |
| 4 | Sammenlign vores afregning med DataHub-data |
| 5a | Hvis måledata var forkerte → netvirksomheden indsender rettelse (BRS-021) → ny RSM-012 → korrektion (se sektion 1) |
| 5b | Hvis vores beregning var forkert → genberegn og udsted kredit-/debitnota |
| 5c | Hvis alt stemmer → informér kunden med dokumentation |

---

## 7. Systemfejl og genopretning

### DataHub-kommunikationsfejl

| Scenarie | Handling |
|----------|----------|
| DataHub 5xx / timeout | Genforsøg med eksponentiel backoff, dequeue **ikke** |
| 401 Unauthorized | Hent nyt OAuth2-token, genforsøg |
| 403 Forbidden | Tjek credentials og GLN i aktørportalen |
| 429 Too Many Requests | Vent og genforsøg med backoff |

### Meddelelsesbehandlingsfejl

| Scenarie | Handling |
|----------|----------|
| Fejl i meddelelsesparsing (ugyldigt JSON/XML) | Dead-letter, dequeue for at frigøre køen |
| Ukendt MessageType | Dead-letter, dequeue, alarmér operatør |
| Forretningsvalideringsfejl (ukendt GSRN etc.) | Log + gem til gennemgang, dequeue |
| Database-fejl under persistering | Genforsøg, dequeue **ikke** (at-least-once garanti) |

### Afregningsfejl

| Scenarie | Handling |
|----------|----------|
| Afregningsberegningsfejl | Fejl kørslen, alarmér, bevar delresultater til fejlfinding |
| Manglende spotpriser for perioden | Stop afregningskørsel, alarmér — kan ikke beregne uden priser |
| Manglende tarifsatser for netområde | Stop for berørte målepunkter, alarmér |
| Inkonsistente måledata (huller i tidsserien) | Markér berørte målepunkter, genberegn når data er komplet |

### Dead-letter-håndtering

Meddelelser der fejler parsing eller validering ender i dead-letter-tabellen.

**Operatørprocedure:**
1. Overvåg `datahub.dead_letter` for uløste poster (alarmér ved vækst)
2. Analysér `error_reason` og `raw_payload`
3. Ret årsagen (parsing-fejl, manglende data etc.)
4. Genbehandl beskeden manuelt eller via genafspilning
5. Markér som `resolved`

```sql
-- Ubehandlede dead letters
SELECT id, queue_name, error_reason, failed_at
FROM datahub.dead_letter
WHERE NOT resolved
ORDER BY failed_at DESC;
```

---

## 8. Samtidige processer

### Leverandørskifte og korrektion samtidigt

En korrektion ankommer for en periode der overlapper med et leverandørskifte:
- Korrektionen gælder kun for den periode vi var leverandør
- Filtrer korrektionsdata til vores leveranceperiode (supply_period.start_date → end_date)
- Ignorer data uden for vores leveranceperiode

### Fraflytning og acontoopgørelse

Kunden fraflytter midt i et kvartal:
- Slutafregning beregnes for den delvise periode (kvartalets start → fraflytningsdato)
- Acontoopgørelse beregner difference mod forholdsmæssig acontoindbetaling
- Slutfaktura udstedes som separat kredit-/debitnota (ikke den normale kombinerede kvartalsfaktura)

### Tarif-ændring midt i faktureringsperiode

Netvirksomheden ændrer tarifsatser med virkning midt i en måned:
- Afregningsberegning skal anvende gammel sats før ændringsdato og ny sats efter
- Tariff-lookup bruger `valid_from`/`valid_to` pr. time, ikke pr. periode
- Eksisterende fakturaer berøres **ikke** medmindre en korrektion modtages

---

## Tidsfrist-oversigt

| Proces | Frist | Kilde |
|--------|-------|-------|
| BRS-001 leverandørskifte (varsel) | Min. 15 hverdage | Forskrift H1 |
| BRS-043 kort varsel | 1 hverdag (⚠ VERIFICÉR) | Forskrift H1 |
| BRS-003 annuller skifte | Inden ikrafttrædelsesdato | Forskrift H1 |
| BRS-042 tilbageførsel | 20 hverdage efter ikrafttrædelse (⚠ VERIFICÉR) | Forskrift H1 |
| BRS-044 annuller ophør | Inden ikrafttrædelsesdato | Forskrift H1 |
| Slutfaktura ved offboarding | 4 uger efter kundens afgang | Elleveringsbekendtgørelsen §17 |
| Kundedata-arkivering | 5 år (⚠ VERIFICÉR) | GDPR / bogføringsloven |
| Måledata-opbevaring | 3+ år (⚠ VERIFICÉR) | Lovkrav |

---

## Kilder

- [Kundelivscyklus](datahub3-customer-lifecycle.md) — faser og offboarding-flow
- [Sekvensdiagrammer](datahub3-sequence-diagrams.md) — meddelelsesflows for BRS/RSM
- [Forretningsprocesser](datahub3-ddq-business-processes.md) — BRS/RSM-reference
- [RSM-012 reference](rsm-012-datahub3-measure-data.md) — korrektionsflow for måledata
- [Afregningsoverblik](datahub3-settlement-overview.md) — korrektioner som edge case
- [Systemarkitektur](datahub3-proposed-architecture.md) — fejlhåndtering og dead-letter
- [Databasemodel](datahub3-database-model.md) — dead_letter-tabel
