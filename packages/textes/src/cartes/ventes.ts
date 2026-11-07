// Cartes d'anomalie des ventes : titre et détail en mots simples. Vouvoiement, ton neutre.
// Paramètres de gabarit permis : {numero}, {ecart}, {montant}, {date}.
export const cartesVentes: Record<
  | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7' | 'A8' | 'A9' | 'A10'
  | 'A11' | 'A12' | 'A13' | 'A14' | 'A15' | 'A16' | 'A17' | 'A18' | 'A19' | 'A20'
  | 'annee_close' | 'a_declarer_periode_ouverte' | 'regime_a_confirmer',
  { titre: string; detail: string }
> = {
  A1: { titre: 'Facture déjà lue', detail: 'La facture {numero} ressemble à une facture déjà reçue : indiquez si c’est un doublon.' },
  A2: { titre: 'Écart de TVA', detail: 'Écart de TVA {ecart} sur la facture {numero} : vérifiez les lignes et le total.' },
  A3: { titre: 'Total à relire', detail: 'Le total de la facture {numero} ne correspond pas à ses lignes : relisez les montants.' },
  A4: { titre: 'Facture manquante', detail: 'La facture {numero} manque : déposez-la ou dites si elle a été annulée.' },
  A5: { titre: 'Numéro déjà utilisé', detail: 'Le numéro {numero} apparaît deux fois : à vérifier avec votre logiciel de facturation.' },
  A6: { titre: 'Ordre des dates', detail: 'Ordre des dates : la facture {numero} est datée du {date}, avant une facture au numéro plus petit. À vérifier.' },
  A7: { titre: 'Mention de franchise', detail: 'Mention de franchise absente : à vérifier sur la facture {numero}.' },
  A8: { titre: 'Date d’opération absente', detail: 'La date de l’opération manque sur la facture {numero} : indiquez-la.' },
  A9: { titre: 'Client à confirmer', detail: 'Le client de la facture {numero} est à confirmer : choisissez-le dans votre liste.' },
  A10: { titre: 'Nature à confirmer', detail: 'Bien ou service ? Précisez la nature des lignes de la facture {numero}.' },
  A11: { titre: 'Taux de TVA à vérifier', detail: 'Le taux de TVA lu sur la facture {numero} est à vérifier.' },
  A12: { titre: 'Client hors de France', detail: 'Le client de la facture {numero} est situé hors de France : à vérifier avant de valider.' },
  A13: { titre: 'Numéro de TVA du client', detail: 'Le numéro de TVA du client n’a pas pu être vérifié : confirmez-le.' },
  A14: { titre: 'Avoir sans facture', detail: 'L’avoir {numero} de {montant} ne se rattache à aucune facture : rattachez-le.' },
  A15: { titre: 'Avoir plus grand que la facture', detail: 'L’avoir {numero} dépasse la facture d’origine de {ecart} : à vérifier.' },
  A16: { titre: 'TVA en franchise', detail: 'TVA facturée en franchise : à vérifier.' },
  A17: { titre: 'Échéance à relire', detail: 'L’échéance de la facture {numero} est à relire : indiquez la bonne date.' },
  A18: { titre: 'Remboursement ou acompte', detail: 'Remboursement ou acompte ? Choisissez pour la somme de {montant}.' },
  A19: { titre: 'Encaissement à rattacher', detail: 'Un encaissement de {montant} pourrait correspondre à la facture {numero} : confirmez le rattachement.' },
  A20: { titre: 'Facture de plateforme', detail: 'À émettre par votre plateforme agréée : déposez ensuite la facture {numero} ici.' },
  annee_close: { titre: 'Année close', detail: 'Facture d’une année close : à vérifier avant tout changement.' },
  a_declarer_periode_ouverte: { titre: 'Période ouverte', detail: 'À déclarer sur une période ouverte : à vérifier.' },
  regime_a_confirmer: { titre: 'Régime à confirmer', detail: 'Votre régime de TVA est à confirmer : indiquez-le dans votre profil.' },
};
