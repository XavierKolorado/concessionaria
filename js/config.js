export const site = {
  name: "Vértice Motors",

  // Número fictício. Substitua pelo WhatsApp real no formato internacional, só dígitos (ex.: 5511999999999).
  whatsappNumber: "5500000000000",
  whatsappIsPlaceholder: true,
};

export function whatsappLink(message) {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

// Veículo do HERO. O modelo é um carro-conceito fictício, então todos os números são demonstrativos.
export const featured = {
  name: "Arco GT",
  model: {
    src: "models/car.glb",
    hiddenMeshes: ["License Plate", "InteriorSteeringEmblem"],
  },
  // Nomes iguais às variantes KHR_materials_variants do arquivo GLB.
  paints: [
    { variant: "Carmine Candy", label: "Carmim", swatch: "#6e0f18" },
    { variant: "Torched Graphite", label: "Grafite queimado", swatch: "#2b2d31" },
    { variant: "Pearly Swirly", label: "Pérola iridescente", swatch: "#b9b3c9" },
  ],
  specs: [
    { label: "Motorização", value: "2 motores elétricos", detail: "um por eixo, tração integral" },
    { label: "Potência", value: "680", unit: "cv", detail: "potência combinada" },
    { label: "Torque", value: "850", unit: "Nm", detail: "disponível desde a partida" },
    { label: "Aceleração", value: "2,4", unit: "s", detail: "de 0 a 100 km/h" },
    { label: "Velocidade máxima", value: "300", unit: "km/h", detail: "limitada eletronicamente" },
    { label: "Transmissão", value: "Direta", detail: "uma marcha, sem trocas" },
    { label: "Quilometragem", value: "1.200", unit: "km", detail: "unidade de exposição" },
    { label: "Ano", value: "2025", detail: "modelo 2025" },
  ],
};

// Renders gerados a partir do próprio modelo 3D (tools/render.html).
export const gallery = [
  { src: "images/arco/front.webp", width: 1800, height: 1100, alt: "Arco GT carmim visto de frente, faróis em linha fina acesos" },
  { src: "images/arco/rear-graphite.webp", width: 1800, height: 1100, alt: "Arco GT grafite queimado, traseira de três quartos com lanternas acesas" },
  { src: "images/arco/side.webp", width: 2000, height: 1000, alt: "Perfil lateral do Arco GT carmim" },
  { src: "images/arco/pearl.webp", width: 1800, height: 1100, alt: "Arco GT em pérola iridescente, dianteira de três quartos" },
  { src: "images/arco/top.webp", width: 1800, height: 1100, alt: "Arco GT visto de cima, teto de vidro mostrando o interior vermelho" },
  { src: "images/arco/headlight.webp", width: 1600, height: 1100, alt: "Detalhe do capô e do farol do Arco GT carmim" },
  { src: "images/arco/wheel.webp", width: 1600, height: 1100, alt: "Detalhe da roda dianteira e do disco de freio do Arco GT" },
];

// Estoque demonstrativo. Ano, quilometragem e preço são fictícios.
// Motor, potência e aceleração seguem os dados de referência divulgados para cada versão.
export const inventory = [
  {
    id: "porsche-911-carrera-s",
    brand: "Porsche",
    model: "911 Carrera S",
    generation: "Geração 992",
    year: 2022,
    km: 18400,
    price: 1089000,
    engine: "3.0 boxer 6 cilindros biturbo",
    power: "450 cv",
    acceleration: "3,7 s de 0 a 100 km/h",
    transmission: "PDK de 8 marchas",
    note: "Revisões na rede autorizada, pintura original.",
    image: {
      src: "images/stock/porsche-911.webp",
      alt: "Porsche 911 Carrera S branco, vista dianteira de três quartos",
      width: 1400,
      height: 663,
      credit: "Alexander Migl",
      license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Porsche_992_Carrera_S_coupe_IMG_5832.jpg",
    },
  },
  {
    id: "audi-rs-e-tron-gt",
    brand: "Audi",
    model: "RS e-tron GT",
    generation: "Elétrico, tração quattro",
    year: 2023,
    km: 9700,
    price: 879000,
    engine: "2 motores elétricos",
    power: "646 cv com overboost",
    acceleration: "3,3 s de 0 a 100 km/h",
    transmission: "2 marchas no eixo traseiro",
    note: "Bateria com garantia de fábrica vigente.",
    image: {
      src: "images/stock/rs-etron-gt.webp",
      alt: "Audi RS e-tron GT branco em exposição, vista dianteira de três quartos",
      width: 1400,
      height: 743,
      credit: "Alexander-93",
      license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Audi_RS_e-tron_GT_Auto_Zuerich_2023_1X7A1112.jpg",
    },
  },
  {
    id: "bmw-m4-competition",
    brand: "BMW",
    model: "M4 Competition",
    generation: "Geração G82",
    year: 2023,
    km: 12300,
    price: 749000,
    engine: "3.0 6 cilindros em linha biturbo",
    power: "510 cv",
    acceleration: "3,9 s de 0 a 100 km/h",
    transmission: "M Steptronic de 8 marchas",
    note: "Pacote de fibra de carbono e rodas forjadas.",
    image: {
      src: "images/stock/bmw-m4.webp",
      alt: "BMW M4 Competition branco com rodas pretas, vista dianteira de três quartos",
      width: 1400,
      height: 701,
      credit: "Alexander Migl",
      license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:BMW_M4_(G82)_Competition_1X7A6103.jpg",
    },
  },
  {
    id: "mercedes-amg-gt",
    brand: "Mercedes-AMG",
    model: "GT",
    generation: "Cupê, motor dianteiro central",
    year: 2019,
    km: 26800,
    price: 689000,
    engine: "4.0 V8 biturbo",
    power: "476 cv",
    acceleration: "4,0 s de 0 a 100 km/h",
    transmission: "AMG Speedshift de 7 marchas",
    note: "Escapamento esportivo de série, dois donos.",
    image: {
      src: "images/stock/amg-gt.webp",
      alt: "Mercedes-AMG GT cinza grafite, vista traseira de três quartos",
      width: 1400,
      height: 677,
      credit: "Calreyn88",
      license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:2019_Mercedes_AMG_GT_Premium_Edition.jpg",
    },
  },
];

export const formatPrice = (n) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const formatKm = (n) => `${n.toLocaleString("pt-BR")} km`;
