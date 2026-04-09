export interface MalaysiaCity {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

export const MALAYSIA_CITIES: MalaysiaCity[] = [
  { id: "Putrajaya", label: "Putrajaya", lat: 2.9264, lon: 101.6964 },
  { id: "Kuala Lumpur (KL)", label: "Kuala Lumpur (KL)", lat: 3.139, lon: 101.6869 },

  // Selangor / Klang Valley
  { id: "Shah Alam", label: "Shah Alam", lat: 3.0738, lon: 101.5183 },
  { id: "Petaling Jaya", label: "Petaling Jaya", lat: 3.1073, lon: 101.6067 },
  { id: "Subang Jaya", label: "Subang Jaya", lat: 3.043, lon: 101.5803 },
  { id: "Puchong", label: "Puchong", lat: 3.016, lon: 101.616 },
  { id: "Cheras", label: "Cheras", lat: 3.073, lon: 101.766 },
  { id: "Klang", label: "Klang", lat: 3.0433, lon: 101.4497 },
  { id: "Kajang", label: "Kajang", lat: 2.9931, lon: 101.7872 },
  { id: "Ampang", label: "Ampang", lat: 3.1481, lon: 101.761 },
  { id: "Batu Caves", label: "Batu Caves", lat: 3.237, lon: 101.684 },
  { id: "Sungai Buloh", label: "Sungai Buloh", lat: 3.209, lon: 101.575 },
  { id: "Serdang", label: "Serdang", lat: 2.998, lon: 101.713 },
  { id: "Bangi", label: "Bangi", lat: 2.903, lon: 101.7809 },
  { id: "Cyberjaya", label: "Cyberjaya", lat: 2.9213, lon: 101.6559 },
  { id: "Rawang", label: "Rawang", lat: 3.3213, lon: 101.5767 },
  { id: "Puncak Alam", label: "Puncak Alam", lat: 3.225, lon: 101.427 },
  { id: "Banting", label: "Banting", lat: 2.813, lon: 101.5 },
  { id: "Kuala Kubu Bharu", label: "Kuala Kubu Bharu", lat: 3.56, lon: 101.655 },
  { id: "Sabak Bernam", label: "Sabak Bernam", lat: 3.77, lon: 100.987 },
  { id: "Kuala Selangor", label: "Kuala Selangor", lat: 3.35, lon: 101.25 },
  { id: "Sepang", label: "Sepang", lat: 2.693, lon: 101.749 },

  // Penang
  { id: "Penang", label: "Penang (George Town)", lat: 5.4141, lon: 100.3288 },
  { id: "Butterworth", label: "Butterworth", lat: 5.3991, lon: 100.3634 },
  { id: "Bukit Mertajam", label: "Bukit Mertajam", lat: 5.363, lon: 100.4667 },
  { id: "Bayan Lepas", label: "Bayan Lepas", lat: 5.297, lon: 100.277 },
  { id: "Balik Pulau", label: "Balik Pulau", lat: 5.356, lon: 100.21 },
  { id: "Perai", label: "Perai", lat: 5.383, lon: 100.39 },
  { id: "Nibong Tebal", label: "Nibong Tebal", lat: 5.165, lon: 100.477 },

  // Kedah / Perlis
  { id: "Alor Setar", label: "Alor Setar", lat: 6.1248, lon: 100.3676 },
  { id: "Sungai Petani", label: "Sungai Petani", lat: 5.647, lon: 100.4877 },
  { id: "Kulim", label: "Kulim", lat: 5.364, lon: 100.559 },
  { id: "Jitra", label: "Jitra", lat: 6.268, lon: 100.421 },
  { id: "Baling", label: "Baling", lat: 5.678, lon: 100.98 },
  { id: "Pendang", label: "Pendang", lat: 5.984, lon: 100.476 },
  { id: "Langkawi (Kuah)", label: "Langkawi (Kuah)", lat: 6.32, lon: 99.85 },
  { id: "Kangar", label: "Kangar (Perlis)", lat: 6.4414, lon: 100.1986 },
  { id: "Arau", label: "Arau", lat: 6.43, lon: 100.27 },
  { id: "Kuala Perlis", label: "Kuala Perlis", lat: 6.4, lon: 100.13 },

  // Perak
  { id: "Ipoh", label: "Ipoh", lat: 4.5975, lon: 101.0901 },
  { id: "Taiping", label: "Taiping", lat: 4.85, lon: 100.7333 },
  { id: "Teluk Intan", label: "Teluk Intan", lat: 4.025, lon: 101.0208 },
  { id: "Lumut", label: "Lumut", lat: 4.232, lon: 100.629 },
  { id: "Sitiawan", label: "Sitiawan", lat: 4.217, lon: 100.700 },
  { id: "Batu Gajah", label: "Batu Gajah", lat: 4.47, lon: 101.04 },
  { id: "Kampar", label: "Kampar", lat: 4.31, lon: 101.15 },
  { id: "Kuala Kangsar", label: "Kuala Kangsar", lat: 4.77, lon: 100.93 },
  { id: "Parit Buntar", label: "Parit Buntar", lat: 5.13, lon: 100.49 },
  { id: "Tanjung Malim", label: "Tanjung Malim", lat: 3.685, lon: 101.52 },
  { id: "Gerik", label: "Gerik", lat: 5.42, lon: 101.13 },

  // Negeri Sembilan / Melaka
  { id: "Seremban", label: "Seremban", lat: 2.7258, lon: 101.9424 },
  { id: "Port Dickson", label: "Port Dickson", lat: 2.522, lon: 101.795 },
  { id: "Nilai", label: "Nilai", lat: 2.804, lon: 101.797 },
  { id: "Kuala Pilah", label: "Kuala Pilah", lat: 2.739, lon: 102.248 },
  { id: "Rembau", label: "Rembau", lat: 2.627, lon: 102.088 },
  { id: "Tampin", label: "Tampin", lat: 2.47, lon: 102.23 },
  { id: "Bahau", label: "Bahau", lat: 2.81, lon: 102.4 },
  { id: "Gemas", label: "Gemas", lat: 2.59, lon: 102.62 },
  { id: "Malacca City", label: "Malacca City", lat: 2.1896, lon: 102.2501 },
  { id: "Alor Gajah", label: "Alor Gajah", lat: 2.381, lon: 102.208 },
  { id: "Jasin", label: "Jasin", lat: 2.305, lon: 102.428 },
  { id: "Masjid Tanah", label: "Masjid Tanah", lat: 2.352, lon: 102.11 },

  // Johor
  { id: "Johor Bahru", label: "Johor Bahru", lat: 1.4927, lon: 103.7414 },
  { id: "Iskandar Puteri", label: "Iskandar Puteri", lat: 1.4167, lon: 103.6 },
  { id: "Skudai", label: "Skudai", lat: 1.535, lon: 103.666 },
  { id: "Kulai", label: "Kulai", lat: 1.656, lon: 103.603 },
  { id: "Pasir Gudang", label: "Pasir Gudang", lat: 1.47, lon: 103.9 },
  { id: "Batu Pahat", label: "Batu Pahat", lat: 1.85, lon: 102.9333 },
  { id: "Muar", label: "Muar", lat: 2.05, lon: 102.5667 },
  { id: "Tangkak", label: "Tangkak", lat: 2.267, lon: 102.545 },
  { id: "Yong Peng", label: "Yong Peng", lat: 2.02, lon: 103.06 },
  { id: "Kluang", label: "Kluang", lat: 2.0333, lon: 103.3167 },
  { id: "Segamat", label: "Segamat", lat: 2.5167, lon: 102.8167 },
  { id: "Labis", label: "Labis", lat: 2.38, lon: 103.02 },
  { id: "Pontian", label: "Pontian", lat: 1.485, lon: 103.39 },
  { id: "Kota Tinggi", label: "Kota Tinggi", lat: 1.74, lon: 103.9 },
  { id: "Pengerang", label: "Pengerang", lat: 1.36, lon: 104.15 },
  { id: "Mersing", label: "Mersing", lat: 2.433, lon: 103.84 },

  // Pahang
  { id: "Kuantan", label: "Kuantan", lat: 3.8077, lon: 103.326 },
  { id: "Pahang", label: "Pahang (Kuantan)", lat: 3.8077, lon: 103.326 },
  { id: "Genting Highlands", label: "Genting Highlands", lat: 3.422, lon: 101.793 },
  { id: "Temerloh", label: "Temerloh", lat: 3.45, lon: 102.4167 },
  { id: "Mentakab", label: "Mentakab", lat: 3.483, lon: 102.349 },
  { id: "Bentong", label: "Bentong", lat: 3.5333, lon: 101.9 },
  { id: "Raub", label: "Raub", lat: 3.7833, lon: 101.85 },
  { id: "Pekan", label: "Pekan", lat: 3.5, lon: 103.4 },
  { id: "Maran", label: "Maran", lat: 3.58, lon: 102.78 },
  { id: "Kuala Lipis", label: "Kuala Lipis", lat: 4.184, lon: 102.046 },
  { id: "Kuala Rompin", label: "Kuala Rompin", lat: 2.8, lon: 103.49 },
  { id: "Gambang", label: "Gambang", lat: 3.7, lon: 103.12 },
  { id: "Cameron Highlands (Tanah Rata)", label: "Cameron Highlands (Tanah Rata)", lat: 4.47, lon: 101.37 },
  { id: "Jerantut", label: "Jerantut", lat: 3.9333, lon: 102.3667 },

  // Kelantan
  { id: "Kota Bharu", label: "Kota Bharu", lat: 6.1254, lon: 102.2381 },
  { id: "Pasir Mas", label: "Pasir Mas", lat: 6.05, lon: 102.1333 },
  { id: "Tumpat", label: "Tumpat", lat: 6.2, lon: 102.17 },
  { id: "Bachok", label: "Bachok", lat: 6.01, lon: 102.39 },
  { id: "Rantau Panjang", label: "Rantau Panjang", lat: 6.0, lon: 101.99 },
  { id: "Tanah Merah", label: "Tanah Merah", lat: 5.8, lon: 102.15 },
  { id: "Machang", label: "Machang", lat: 5.76, lon: 102.2 },
  { id: "Kuala Krai", label: "Kuala Krai", lat: 5.5333, lon: 102.2 },
  { id: "Jeli", label: "Jeli", lat: 5.7, lon: 101.84 },
  { id: "Gua Musang", label: "Gua Musang", lat: 4.8833, lon: 101.9667 },

  // Terengganu
  { id: "Kuala Terengganu", label: "Kuala Terengganu", lat: 5.3302, lon: 103.1408 },
  { id: "Kuala Nerus", label: "Kuala Nerus", lat: 5.39, lon: 103.11 },
  { id: "Kemaman (Chukai)", label: "Kemaman (Chukai)", lat: 4.2333, lon: 103.4167 },
  { id: "Dungun", label: "Dungun", lat: 4.756, lon: 103.414 },
  { id: "Marang", label: "Marang", lat: 5.206, lon: 103.205 },
  { id: "Besut (Jerteh)", label: "Besut (Jerteh)", lat: 5.733, lon: 102.49 },
  { id: "Setiu", label: "Setiu", lat: 5.67, lon: 102.72 },
  { id: "Hulu Terengganu (Kuala Berang)", label: "Hulu Terengganu (Kuala Berang)", lat: 5.05, lon: 102.95 },

  // Sabah
  { id: "Kota Kinabalu", label: "Kota Kinabalu", lat: 5.9804, lon: 116.0735 },
  { id: "Sandakan", label: "Sandakan", lat: 5.84, lon: 118.117 },
  { id: "Tawau", label: "Tawau", lat: 4.2498, lon: 117.8871 },
  { id: "Lahad Datu", label: "Lahad Datu", lat: 5.03, lon: 118.33 },
  { id: "Keningau", label: "Keningau", lat: 5.3378, lon: 116.1602 },
  { id: "Semporna", label: "Semporna", lat: 4.48, lon: 118.6 },
  { id: "Kudat", label: "Kudat", lat: 6.89, lon: 116.85 },
  { id: "Papar", label: "Papar", lat: 5.734, lon: 115.933 },
  { id: "Tuaran", label: "Tuaran", lat: 6.177, lon: 116.231 },
  { id: "Kota Belud", label: "Kota Belud", lat: 6.351, lon: 116.43 },
  { id: "Ranau", label: "Ranau", lat: 5.953, lon: 116.66 },
  { id: "Beaufort", label: "Beaufort", lat: 5.35, lon: 115.75 },
  { id: "Kunak", label: "Kunak", lat: 4.68, lon: 118.25 },

  // Sarawak
  { id: "Kuching", label: "Kuching", lat: 1.5533, lon: 110.3592 },
  { id: "Kota Samarahan", label: "Kota Samarahan", lat: 1.46, lon: 110.49 },
  { id: "Serian", label: "Serian", lat: 1.18, lon: 110.58 },
  { id: "Miri", label: "Miri", lat: 4.399, lon: 113.9914 },
  { id: "Sibu", label: "Sibu", lat: 2.2833, lon: 111.8333 },
  { id: "Bintulu", label: "Bintulu", lat: 3.1667, lon: 113.0333 },
  { id: "Mukah", label: "Mukah", lat: 2.894, lon: 112.091 },
  { id: "Sri Aman", label: "Sri Aman", lat: 1.2333, lon: 111.45 },
  { id: "Betong", label: "Betong", lat: 1.41, lon: 111.53 },
  { id: "Sarikei", label: "Sarikei", lat: 2.13, lon: 111.52 },
  { id: "Kapit", label: "Kapit", lat: 2.01, lon: 112.93 },
  { id: "Limbang", label: "Limbang", lat: 4.75, lon: 115.0 },
  { id: "Lawas", label: "Lawas", lat: 4.86, lon: 115.41 },

  // Federal Territory
  { id: "Labuan", label: "Labuan", lat: 5.2831, lon: 115.2308 }
];

export const MALAYSIA_BOUNDS = {
  minLat: 0.85,
  maxLat: 7.55,
  minLon: 99.6,
  maxLon: 119.4
};

// Simplified silhouettes to give the map picker some visual structure.
export const MALAYSIA_OUTLINES: string[] = [
  "M14,16 L24,12 L32,16 L33,24 L28,34 L26,44 L21,55 L18,64 L10,72 L8,64 L10,52 L10,38 L12,26 Z",
  "M54,46 L65,40 L78,44 L88,54 L86,66 L78,78 L64,84 L54,74 L52,60 Z",
];
