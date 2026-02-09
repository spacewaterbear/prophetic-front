[SEGMENT]

# -+-NOM DE L'ACTIF OU PRÉNOM NOM ARTISTE-+-

[RÉFÉRENCE]

---

VALEUR ACTUELLE

# €[VALEUR]

[VS_ATH]% vs ATH · Verified [VERIFIED]%

---

## Identification

| Critère | Détail |
|:--|--:|
| Année | [ANNÉE] |
| Rareté | [RARETÉ] |
| État | [ÉTAT] |
| Provenance | [PROVENANCE] |

---

<!-- CONDITION:TABLEAU — Afficher SI données macro segment disponibles -->

## Marché Segment

| Indicateur | Valeur |
|:--|--:|
| Marché | [TAILLE_MARCHE] |
| Sell-through | [SELL_THROUGH]% |
| Nvx acheteurs | +[NVX_ACHETEURS]% |
| Corr. S&P | [CORR_SP] |

---

## Récit Patrimonial

[PARAGRAPHE_1]

[PARAGRAPHE_2]

[PARAGRAPHE_3]

---

### Positionnement Marché

[POSITIONNEMENT]

---

> *« [CITATION] »*
>
> — [AUTEUR]

---

### Notre Lecture

[ANALYSE]

---

## Score Prophetic

**[SCORE]** / 100

Momentum [MOMENTUM]

| Critère | Note |
|:--|--:|
| Rareté | [S_RARETE] |
| Désirabilité | [S_DESIRABILITE] |
| Historique | [S_HISTORIQUE] |
| Liquidité | [S_LIQUIDITE] |
| Institution | [S_INSTITUTION] |
| Potentiel | [S_POTENTIEL] |

---

## Performance 5 ans

| Actif | Perf. |
|:--|--:|
| **-+-NOM_ACTIF-+-** | **+[PERF_ACTIF]%** |
| Bitcoin | +[PERF_BTC]% |
| S&P 500 | +[PERF_SP500]% |
| Or | +[PERF_OR]% |
| Immobilier | +[PERF_IMMO]% |

---

## Trajectoire

| Année | Valeur |
|:--|--:|
| [AN_1] | €[VAL_1] |
| [AN_2] | €[VAL_2] |
| [AN_3] | €[VAL_3] ATH |
| [AN_4] | €[VAL_4] |
| [AN_5] | €[VAL_5] |

---

## Scénarios ROI

**Bear** [PROB_BEAR]%

| Horizon | ROI |
|:--|--:|
| 12 mois | +[ROI_BEAR_12]% |
| 36 mois | +[ROI_BEAR_36]% |

**Base** [PROB_BASE]%

| Horizon | ROI |
|:--|--:|
| 12 mois | +[ROI_BASE_12]% |
| 36 mois | +[ROI_BASE_36]% |

**Bull** [PROB_BULL]%

| Horizon | ROI |
|:--|--:|
| 12 mois | +[ROI_BULL_12]% |
| 36 mois | +[ROI_BULL_36]% |

---

## Métriques

| Indicateur | Valeur |
|:--|--:|
| CAGR | [CAGR]% |
| Sharpe | [SHARPE] |
| Volatilité | [VOLATILITE]% |
| Max DD | [MAX_DD]% |
| Corr. S&P | [CORR_SP] |

Décorrélé

---

<!-- CONDITION:VIGNETTES — Afficher SI ≥3 actifs comparables identifiés dans le segment -->

## Comparables

```
#[RANG_1] -+-NOM_COMPARABLE_1-+- [SCORE_1]
[SEGMENT_1] · €[FOURCHETTE_1] · [MOMENTUM_1]
[ACHIEVEMENT_1]

#[RANG_2] -+-NOM_COMPARABLE_2-+- [SCORE_2]
[SEGMENT_2] · €[FOURCHETTE_2] · [MOMENTUM_2]
[ACHIEVEMENT_2]

#[RANG_3] -+-NOM_COMPARABLE_3-+- [SCORE_3]
[SEGMENT_3] · €[FOURCHETTE_3] · [MOMENTUM_3]
[ACHIEVEMENT_3]

#[RANG_4] -+-NOM_COMPARABLE_4-+- [SCORE_4]
[SEGMENT_4] · €[FOURCHETTE_4] · [MOMENTUM_4]
[ACHIEVEMENT_4]
```

---

<!-- CONDITION:PROGRESS BAR — Afficher SI classement momentum segment disponible -->

## Top Momentum

```
#1 -+-NOM_TOP_1-+- ▬▬▬▬▬▬▬▬▬▬
[TAG_1]+[TAG_2]+[TAG_3]

#2 -+-NOM_TOP_2-+- ▬▬▬▬▬▬▬▬▬░
[TAG_1]+[TAG_2]

#3 -+-NOM_TOP_3-+- ▬▬▬▬▬▬▬▬░░
[TAG_1]+[TAG_2]

#4 -+-NOM_TOP_4-+- ▬▬▬▬▬▬▬▬░░
[TAG_1]+[TAG_2]

#5 -+-NOM_TOP_5-+- ▬▬▬▬▬▬▬▬░░
[TAG_1]+[TAG_2]
```

---

## Portfolio Recommandé

**€[BUDGET]**

ROI 36m +[ROI_PORTFOLIO]%

| Actif | Alloc. |
|:--|--:|
| -+-ACTIF_1-+- | [PCT_1]% |
| -+-ACTIF_2-+- | [PCT_2]% |
| -+-ACTIF_3-+- | [PCT_3]% |
| Liquidités | [PCT_4]% |

---

## Signal

| Action | Seuil |
|:--|--:|
| Renforcer | €[SEUIL_BUY] |
| Actuel | €[SEUIL_HOLD] |
| Alléger | €[SEUIL_SELL] |

---

## Disponibilité

| Plateforme | Prix |
|:--|--:|
| [PLATFORM_1] | €[PRIX_1] ● |
| [PLATFORM_2] | €[PRIX_2] ● |
| [PLATFORM_3] | €[PRIX_3] ○ |
| [PLATFORM_4] | €[PRIX_4] ○ |

● Dispo · ○ Indispo

---

## Sortie

| Canal | Délai · Frais |
|:--|--:|
| [CANAL_1] | [DELAI_1] · [FRAIS_1] |
| [CANAL_2] | [DELAI_2] · [FRAIS_2] |
| [CANAL_3] | [DELAI_3] · [FRAIS_3] |

---

## Leasing + Exit

Éligible

**12 mois**

| Composante | Montant |
|:--|--:|
| Leasing | +€[LEASING_12] |
| Plus-value | +€[PV_12] |
| ROI Total | +[ROI_12]% |

**24 mois**

| Composante | Montant |
|:--|--:|
| Leasing | +€[LEASING_24] |
| Plus-value | +€[PV_24] |
| ROI Total | +[ROI_24]% |

**36 mois**

| Composante | Montant |
|:--|--:|
| Leasing | +€[LEASING_36] |
| Plus-value | +€[PV_36] |
| ROI Total | +[ROI_36]% |

---

## Conservation

| Poste | Détail |
|:--|--:|
| Stockage | [STOCKAGE] |
| Entretien | [ENTRETIEN] |
| Assurance | [ASSURANCE] |

**Documents**

[DOC_1] · [DOC_2] · [DOC_3] · [DOC_4]

---

## Fiscalité

**France**

| Régime | Taux |
|:--|--:|
| TVA | [TVA_FR] |
| Plus-values | [PV_FR] |
| Abattement | [ABAT_FR] |
| Exonération | [EXON_FR] |

**Suisse**

| Régime | Taux |
|:--|--:|
| TVA | [TVA_CH] |
| Plus-values | [PV_CH] |

**HK/SG**

| Régime | Taux |
|:--|--:|
| TVA | [TVA_HK] |
| Plus-values | [PV_HK] |

---

## Risques

| Facteur | Niveau |
|:--|--:|
| [RISQUE_1] | [NIVEAU_1]/10 |
| [RISQUE_2] | [NIVEAU_2]/10 |
| [RISQUE_3] | [NIVEAU_3]/10 |

---

## Verdict

# [SIGNAL]

- [POINT_1]
- [POINT_2]
- [POINT_3]

---

**Forces**

- [FORCE_1]
- [FORCE_2]
- [FORCE_3]

**Vigilance**

- [VIGILANCE_1]
- [VIGILANCE_2]

---

PROPHETIC

[X] Sources citées · [X] données Prophetic · [X] algorithmes SCORE · 86% précision · [X] Données Live

© 2025 Prophetic SAS

---

*Information stratégique uniquement. Ne constitue pas un conseil en investissement.*