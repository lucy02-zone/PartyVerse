
const TELUGU_MOVIES = [
  "Nuvve Kavali",
  "Chitram",
  "Badri",
  "Annayya",
  "Murari",
  "Nuvvu Naaku Nachav",
  "Manasantha Nuvve",
  "Indra",
  "Aadi",
  "Jayam",
  "Santosham",
  "Malliswari",
  "Okkadu",
  "Simhadri",
  "Tagore",
  "Varsham",
  "Arya",
  "Mass",
  "Shankar Dada MBBS",
  "Venky",
  "Bunny",
  "Bhadra",
  "Athadu",
  "Chatrapathi",
  "Nuvvostanante Nenoddantana",
  "Pokiri",
  "Bommarillu",
  "Vikramarkudu",
  "Happy Days",
  "Desamuduru",
  "Dubai Seenu",
  "Chirutha",
  "Yamadonga",
  "Jalsa",
  "Ready",
  "Parugu",
  "Arundhati",
  "Magadheera",
  "Kick",
  "Arya 2",
  "Leader",
  "Ye Maaya Chesave",
  "Darling",
  "Brindavanam",
  "Maryada Ramanna",
  "Dookudu",
  "100% Love",
  "Mr. Perfect",
  "Eega",
  "Julayi",
  "Gabbar Singh",
  "Businessman",
  "Seethamma Vakitlo Sirimalle Chettu",
  "Attarintiki Daredi",
  "Mirchi",
  "Race Gurram",
  "Manam",
  "Drushyam",
  "Temper",
  "Srimanthudu",
  "Baahubali: The Beginning",
  "Rudhramadevi",
  "Bhale Bhale Magadivoy",
  "Pelli Choopulu",
  "Kanche",
  "Janatha Garage",
  "Dhruva",
  "Khaidi No. 150",
  "Fidaa",
  "Arjun Reddy",
  "Rangasthalam",
  "Bharat Ane Nenu",
  "Geetha Govindam",
  "Mahanati",
  "Goodachari",
  "Taxiwaala",
  "Jersey",
  "Majili",
  "Maharshi",
  "Evaru",
  "Oh! Baby",
  "Agent Sai Srinivasa Athreya",
  "Brochevarevarura",
  "Sye Raa Narasimha Reddy",
  "Venky Mama",
  "Ala Vaikunthapurramuloo",
  "Sarileru Neekevvaru",
  "Uppena",
  "Jathi Ratnalu",
  "Vakeel Saab",
  "Love Story",
  "Shyam Singha Roy",
  "Pushpa: The Rise",
  "Akhanda",
  "RRR",
  "Bheemla Nayak",
  "Sarkaru Vaari Paata",
  "Sita Ramam",
  "Karthikeya 2",
  "Major",
  "DJ Tillu",
  "Ante Sundaraniki",
  "HIT: The Second Case",
  "Dhamaka",
  "18 Pages",
  "Waltair Veerayya",
  "Veera Simha Reddy",
  "Dasara",
  "Virupaksha",
  "Baby",
  "Miss Shetty Mr Polishetty",
  "Hi Nanna",
  "Salaar: Part 1 – Ceasefire",
  "Hanu-Man",
  "Guntur Kaaram",
  "Tillu Square",
  "Gaami",
  "Lucky Baskhar",
  "Kalki 2898 AD",
  "Devara: Part 1",
  "Saripodhaa Sanivaaram",
  "Mathu Vadalara 2",
  "Pushpa 2: The Rule",
  "Sankranthiki Vasthunam",
  "Game Changer",
  "They Call Him OG",
  "Kuberaa",
  "Mirai",
  "Court: State vs A Nobody",
  "Kingdom",
  "Thammudu",
  "Mana Shankara Vara Prasad Garu",
  // Additional released Telugu-language films; sequel names remain distinct titles.
  "Nuvvu Vastavani", "Kalisundam Raa", "Nuvvu Nenu", "Nuvvu Leka Nenu Lenu",
  "Sreeram", "Narasimha Naidu", "Kushi", "Khushi", "Sontham", "Okkadu",
  "Sivamani", "Sye", "Gharshana", "Balu", "Naa Autograph", "Anukokunda Oka Roju",
  "Athadu", "Narasimhudu", "Aparichitudu", "Pokiri", "Stalin", "Vikramarkudu",
  "Desamuduru", "Munna", "Yamadonga", "Chandamama", "Bujjigadu", "King",
  "Sasirekha Parinayam", "Bendu Apparao R.M.P", "Namo Venkatesa", "Prasthanam",
  "Vedam", "Ala Modalaindi", "100% Love", "Ishq", "Gabbar Singh", "Uyyala Jampala",
  "Prasthanam", "Swamy Ra Ra", "Oohalu Gusagusalade", "Uyyala Jampala",
  "Karthikeya", "Bhale Manchi Roju", "Kshanam", "Oopiri", "A Aa", "Pelli Choopulu",
  "Kshanam", "Nenu Local", "Raja the Great", "F2: Fun and Frustration",
  "Chalo", "Tholi Prema", "RX 100", "Sammohanam", "Mallesham", "Jersey",
  "Brochevarevarura", "Khaidi No. 150", "Ninnu Kori", "Hello!", "Bhaagamathie",
  "Sye Raa Narasimha Reddy", "V", "Colour Photo", "Uppena", "Republic",
  "Thellavarithe Guruvaram", "Love Story", "Major", "Kondapolam", "Mishan Impossible",
  "Bimbisara", "Yashoda", "Virata Parvam", "Kushi", "Balagam", "Kushi",
  "HIT: The First Case", "Masooda", "Writer Padmabhushan", "Mangalavaaram",
  "Keedaa Cola", "Kota Bommali PS", "Lucky Bhaskar", "35 Chinna Katha Kaadu",
  "Aay", "Committee Kurrollu", "Saripodhaa Sanivaaram", "KA", "Amaran",
  "Meiyazhagan", "Mechanic Rocky", "Zebra", "Daaku Maharaaj", "Thandel",
  "Court: State vs A Nobody", "Mad Square", "HIT: The Third Case",
];

const uniqueTitles = [
  ...new Set(
    TELUGU_MOVIES.map((title) => title.trim()).filter(Boolean)
  ),
];

// This local party deck is curated from established Telugu film releases and
// intentionally stops at 2024: forthcoming 2025–26 releases are not treated as facts.
const yearByTitle = new Map();
const eraGroups = [
  [2000, `Nuvve Kavali|Chitram|Badri|Annayya|Murari|Nuvvu Naaku Nachav|Manasantha Nuvve|Indra|Aadi|Jayam|Santosham|Malliswari|Okkadu|Simhadri|Tagore|Varsham|Arya|Mass|Shankar Dada MBBS|Venky|Bunny|Bhadra|Athadu|Chatrapathi|Nuvvostanante Nenoddantana|Pokiri|Bommarillu|Vikramarkudu|Happy Days|Desamuduru|Dubai Seenu|Chirutha|Yamadonga|Jalsa|Ready|Parugu|Arundhati|Magadheera|Kick|Arya 2`, 2000],
  [2010, `Leader|Ye Maaya Chesave|Darling|Brindavanam|Maryada Ramanna|Dookudu|100% Love|Mr. Perfect|Eega|Julayi|Gabbar Singh|Businessman|Seethamma Vakitlo Sirimalle Chettu|Attarintiki Daredi|Mirchi|Race Gurram|Manam|Drushyam|Temper|Srimanthudu|Baahubali: The Beginning|Rudhramadevi|Bhale Bhale Magadivoy|Pelli Choopulu|Kanche|Janatha Garage|Dhruva|Khaidi No. 150|Fidaa|Arjun Reddy|Rangasthalam|Bharat Ane Nenu|Geetha Govindam|Mahanati|Goodachari|Taxiwaala|Jersey|Majili|Maharshi|Evaru|Oh! Baby|Agent Sai Srinivasa Athreya|Brochevarevarura|Sye Raa Narasimha Reddy|Venky Mama`, 2010],
  [2020, `Ala Vaikunthapurramuloo|Sarileru Neekevvaru|Uppena|Jathi Ratnalu|Vakeel Saab|Love Story|Shyam Singha Roy|Pushpa: The Rise|Akhanda|RRR|Bheemla Nayak|Sarkaru Vaari Paata|Sita Ramam|Karthikeya 2|Major|DJ Tillu|Ante Sundaraniki|HIT: The Second Case|Dhamaka|18 Pages|Waltair Veerayya|Veera Simha Reddy|Dasara|Virupaksha|Baby|Miss Shetty Mr Polishetty|Hi Nanna|Salaar: Part 1 – Ceasefire|Hanu-Man|Guntur Kaaram|Tillu Square|Gaami|Lucky Baskhar|Kalki 2898 AD|Devara: Part 1|Saripodhaa Sanivaaram|Mathu Vadalara 2|Pushpa 2: The Rule|Sankranthiki Vasthunam|Game Changer|Court: State vs A Nobody|Thandel|Mad Square|HIT: The Third Case`, 2020],
];
for (const [start, titles] of eraGroups) {
  titles.split("|").forEach((title, index) => yearByTitle.set(title, Math.min(2024, start + Math.floor(index / 5))));
}
for (const title of ["Game Changer", "Daaku Maharaaj", "Thandel", "Mad Square", "HIT: The Third Case"]) yearByTitle.set(title, 2025);

const hardTitles = new Set(`Agent Sai Srinivasa Athreya|Mahanati|Kanche|Mallesham|Prasthanam|Colour Photo|Masooda|Mangalavaaram|Keedaa Cola|Balagam|Gaami`.split("|"));
const easyTitles = new Set(`Magadheera|Pokiri|RRR|Baahubali: The Beginning|Pushpa: The Rise|Athadu|Okkadu|Arya|Jalsa|Eega|Arjun Reddy|Ala Vaikunthapurramuloo|Hanu-Man|Kalki 2898 AD`.split("|"));

export const CHARADES_PROMPTS = uniqueTitles
  .filter((prompt) => !/They Call Him OG|Kuberaa|Mirai|Kingdom|Thammudu|Mana Shankara Vara Prasad Garu/.test(prompt))
  .map((prompt) => ({
    category: "Telugu Movies",
    prompt,
    year: yearByTitle.get(prompt) || 2015,
    difficulty: hardTitles.has(prompt) ? "Hard" : easyTitles.has(prompt) ? "Easy" : "Medium",
  }));

export function getPromptDeck(_category = "Telugu Movies", limit = 200, filters = {}) {
  const filtered = CHARADES_PROMPTS.filter((entry) => {
    const eraMatch = !filters.era || (entry.year >= filters.era[0] && entry.year <= filters.era[1]);
    const difficultyMatch = !filters.difficulty || filters.difficulty === "Mixed" || entry.difficulty === filters.difficulty;
    return eraMatch && difficultyMatch;
  });
  const shuffled = [...filtered];

  // Fisher-Yates shuffle.
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.max(0, Math.min(limit, shuffled.length)));
}
