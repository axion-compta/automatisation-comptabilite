// Cartes d'anomalie des ventes : titre et détail en mots simples. Vouvoiement, ton neutre.
// Paramètres de gabarit permis : {numero}, {ecart}, {montant}, {date}.
export const cartesVentes: Record<
  | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7' | 'A8' | 'A9' | 'A10'
  | 'A11' | 'A12' | 'A13' | 'A14' | 'A15' | 'A16' | 'A17' | 'A18' | 'A19' | 'A20'
  | 'annee_close' | 'a_declarer_periode_ouverte' | 'regime_a_confirmer',
  { titre: string; detail: string }
> = {
  A1: { titre: 'Totaux à relire', detail: 'Sur la facture {numero}, le montant hors taxe plus la TVA ne donne pas le total : relisez les montants.' },
  A2: { titre: 'Écart de TVA', detail: 'Écart de TVA {ecart} sur la facture {numero} : vérifiez les lignes et le total.' },
  A3: { titre: 'Taux de TVA inconnu', detail: 'Le taux de TVA de la facture {numero} n’existe pas à la date {date} : indiquez le bon taux.' },
  A4: { titre: 'Facture manquante', detail: 'La facture {numero} manque : déposez-la ou dites si elle a été annulée.' },
  A5: { titre: 'Numéro utilisé avec deux montants', detail: 'Le numéro {numero} apparaît sur deux factures de montants différents : précisez laquelle est la bonne.' },
  A6: { titre: 'Ordre des dates', detail: 'Ordre des dates : la facture {numero} est datée du {date}, avant une facture au numéro plus petit. À vérifier.' },
  A7: { titre: 'Mention de franchise', detail: 'Mention de franchise absente : à vérifier sur la facture {numero}.' },
  A8: { titre: 'Date d’opération absente', detail: 'La date de l’opération manque sur la facture {numero} : indiquez-la.' },
  A9: { titre: 'Facture hors exercice', detail: 'La facture {numero} ne tombe dans aucun exercice : vérifiez sa date.' },
  A10: { titre: 'Doublon reçu deux fois', detail: 'La facture {numero} est arrivée par deux canaux : confirmez que c’est un doublon.' },
  A11: { titre: 'Facture avant immatriculation', detail: 'La facture {numero} est datée d’avant l’immatriculation : vérifiez sa date.' },
  A12: { titre: 'Avoir sans facture d’origine', detail: 'L’avoir {numero} ne se rattache à aucune facture d’origine : rattachez-le.' },
  A13: { titre: 'Avoir trop élevé', detail: 'L’avoir {numero} dépasse le reste dû de la facture : à vérifier.' },
  A14: { titre: 'Acomptes et solde à relire', detail: 'Les acomptes et le solde de la facture {numero} ne donnent pas le total, écart de {ecart} : vérifiez les montants.' },
  A15: { titre: 'Client sans SIREN ni TVA', detail: 'Le client professionnel de la facture {numero} n’a ni SIREN ni numéro de TVA : indiquez-en un.' },
  A16: { titre: 'TVA en franchise', detail: 'TVA facturée en franchise : à vérifier.' },
  A17: { titre: 'TVA du client de l’UE', detail: 'Le numéro de TVA du client de l’UE de la facture {numero} n’est pas vérifié : confirmez-le.' },
  A18: { titre: 'Client créditeur (trop-perçu)', detail: 'Remboursement ou acompte ? Choisissez pour la somme de {montant}.' },
  A19: { titre: 'Balance âgée et solde', detail: 'La balance âgée ne correspond pas au solde du client, écart de {ecart} : à vérifier.' },
  A20: { titre: 'Facture de plateforme', detail: 'À émettre par votre plateforme agréée : déposez ensuite la facture {numero} ici.' },
  annee_close: { titre: 'Année close', detail: 'Facture d’une année close : à vérifier avant tout changement.' },
  a_declarer_periode_ouverte: { titre: 'Période ouverte', detail: 'À déclarer sur une période ouverte : à vérifier.' },
  regime_a_confirmer: { titre: 'Régime à confirmer', detail: 'Votre régime de TVA est à confirmer : indiquez-le dans votre profil.' },
};
