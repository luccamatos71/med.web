export const SUBJECT_COLORS = [
  '#2EA39E',
  '#D97706',
  '#2E7D52',
  '#9B2226',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
] as const

export type SubjectColor = typeof SUBJECT_COLORS[number]

export const MED_CURRICULUM: Record<string, string[]> = {
  'Cardiologia': [
    'Anatomia cardíaca', 'Hipertensão arterial', 'Insuficiência cardíaca',
    'Cardiopatia isquêmica', 'Arritmias', 'Valvopatias', 'Pericardite',
    'ECG e interpretação', 'Semiologia cardiovascular',
  ],
  'Neurologia': [
    'AVC isquêmico', 'AVC hemorrágico', 'Epilepsia', 'Cefaleias',
    'Doenças neurodegenerativas', 'Neuropatias periféricas',
    'Infecções do SNC', 'Esclerose múltipla', 'Semiologia neurológica',
  ],
  'Pneumologia': [
    'Asma', 'DPOC', 'Pneumonia', 'Tuberculose', 'Derrame pleural',
    'TEP', 'Câncer de pulmão', 'Semiologia pulmonar', 'Espirometria',
  ],
  'Gastroenterologia': [
    'Doença do refluxo', 'Úlcera péptica', 'Hepatites virais',
    'Cirrose hepática', 'Doenças inflamatórias intestinais',
    'Síndrome do intestino irritável', 'Pancreatite', 'Câncer colorretal',
  ],
  'Endocrinologia': [
    'Diabetes mellitus tipo 1', 'Diabetes mellitus tipo 2', 'Hipotireoidismo',
    'Hipertireoidismo', 'Síndrome de Cushing', 'Insuficiência adrenal',
    'Obesidade', 'Dislipidemia', 'Semiologia endócrina',
  ],
  'Nefrologia': [
    'Insuficiência renal aguda', 'Doença renal crônica', 'Glomerulonefrites',
    'Síndrome nefrótica', 'ITU', 'Litíase renal', 'Hiponatremia',
    'Hipercalemia', 'Equilíbrio ácido-base',
  ],
  'Infectologia': [
    'HIV/AIDS', 'Sepse', 'Endocardite infecciosa', 'Malária',
    'Dengue', 'Leptospirose', 'Tuberculose', 'Hanseníase',
    'Antibioticoterapia', 'Profilaxias',
  ],
  'Reumatologia': [
    'Artrite reumatoide', 'Lúpus eritematoso sistêmico', 'Gota',
    'Espondiloartrites', 'Osteoartrite', 'Fibromialgia',
    'Vasculites', 'Semiologia articular',
  ],
  'Hematologia': [
    'Anemias', 'Leucemias', 'Linfomas', 'Mieloma múltiplo',
    'Distúrbios da coagulação', 'Trombocitopenias',
    'Hemoglobinopatias', 'Transfusão sanguínea',
  ],
  'Medicina de Emergência': [
    'Parada cardiorrespiratória', 'Choque', 'Politrauma',
    'Intoxicações agudas', 'Dor torácica aguda', 'Dispneia aguda',
    'Coma e alterações de consciência', 'Queimaduras',
  ],
  'Cirurgia Geral': [
    'Abdome agudo', 'Apendicite', 'Hérnia abdominal',
    'Colecistite', 'Obstrução intestinal', 'Câncer gástrico',
    'Peritonite', 'Trauma abdominal',
  ],
  'Ginecologia e Obstetrícia': [
    'Pré-natal', 'Trabalho de parto', 'Complicações da gestação',
    'Contracepção', 'Doenças sexualmente transmissíveis',
    'Câncer de colo do útero', 'Endometriose', 'Síndrome do ovário policístico',
  ],
  'Pediatria': [
    'Crescimento e desenvolvimento', 'Imunizações', 'Neonatologia',
    'Doenças respiratórias', 'Doenças exantemáticas', 'Desnutrição',
    'Diarreia aguda', 'Febre sem foco',
  ],
  'Psiquiatria': [
    'Depressão', 'Transtorno bipolar', 'Esquizofrenia', 'Transtornos de ansiedade',
    'Transtornos de personalidade', 'Dependência química',
    'Transtornos alimentares', 'Semiologia psiquiátrica',
  ],
  'Farmacologia': [
    'Farmacocinética', 'Farmacodinâmica', 'Anti-hipertensivos',
    'Antidiabéticos', 'Antibióticos', 'Anticoagulantes',
    'Drogas vasoativas', 'Interações medicamentosas',
  ],
}

export const SUGGESTED_SUBJECTS = Object.keys(MED_CURRICULUM)
