export interface Abastecimento {
  id: number;
  placa: string;
  km: number;
  litragem: number;
  combustivel: 'DIESEL' | 'ARLA';
  motorista: string;
  responsavel: string;
  horaInicio: string;
  horaFim: string;
  duracao: string;
  duracaoMin: number;
  foto: string;
  horario: string;
  data: string;
  timestamp: number;
}

export interface TanqueConfig {
  capacidade: number;
  atual: number;
}

export interface FirebaseConfig {
  apikey: string;
  projectid: string;
  collection: string;
}
