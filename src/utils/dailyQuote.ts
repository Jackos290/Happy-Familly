const starts = [
  "Aujourd'hui",
  "Ce matin",
  "En famille",
  "Petit à petit",
  "Tous ensemble",
  "Avec patience",
  "Avec le sourire",
  "Même doucement",
  "Chaque journée",
  "À la maison",
  "Quand on s'écoute",
  "Quand on s'entraide",
  "Un pas après l'autre",
  "Avec confiance",
  "Dans les petits gestes",
];

const middles = [
  "on avance",
  "on apprend",
  "on grandit",
  "on se soutient",
  "on fait de notre mieux",
  "on trouve une solution",
  "on construit de beaux souvenirs",
  "on garde le cap",
  "on transforme les efforts en fierté",
  "on choisit la douceur",
  "on prend soin les uns des autres",
  "on ose recommencer",
  "on partage l'énergie",
  "on rend la journée plus simple",
  "on voit ce qui va bien",
  "on respire et on repart",
  "on s'encourage",
];

const endings = [
  "et c'est déjà beaucoup.",
  "à notre rythme.",
  "avec un peu plus de confiance.",
  "sans avoir besoin d'être parfaits.",
  "en gardant le meilleur de la journée.",
  "avec calme et courage.",
  "et chacun compte.",
  "avec de la joie dans les détails.",
  "en faisant équipe.",
  "avec le coeur léger.",
  "et demain sera encore une chance.",
  "en gardant ce qui nous fait du bien.",
  "avec une petite victoire à célébrer.",
  "et la maison devient plus douce.",
  "en se rappelant qu'on est ensemble.",
  "avec l'envie d'essayer encore.",
  "et ça suffit pour aujourd'hui.",
];

export function getDailyQuote(date = new Date()) {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86_400_000);
  const index = Math.max(0, dayOfYear - 1) % 365;

  return `${starts[index % starts.length]}, ${middles[index % middles.length]} ${endings[index % endings.length]}`;
}
