import { Abastecimento } from './types';

/**
 * Compresses an image captured via camera/input using HTML5 Canvas.
 * Regulates the dimensions and converts to JPEG format with adjusted quality (0 to 1).
 * This prevents QuotaExceededError in localStorage by keeping files under ~100KB-150KB.
 */
export function compressImage(file: File, maxWidth = 600, maxHeight = 600, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src); // fallback to original base64 if canvas context is unavailable
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve('');
      };
      img.src = src;
    };
    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo.'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Automatically seeds the database if empty, establishing structural records
 * spread over the last 45 days.
 */
export function seedAbastecimentos(): Abastecimento[] {
  const stored = localStorage.getItem('abastecimentos');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  const placas = ['QSK7D92', 'OXO0532', 'OXO0542', 'OXO0552', 'OXO0782', 'SLB4A26', 'NPR2601', 'SLB4A56', 'TOZ8B20', 'TOZ8B50'];
  const motoristas = ['Carlos Silva', 'Marcos Pereira', 'João Souza', 'Pedro Lima', 'Rafael Santos', 'Eduardo Costa'];
  const responsaveis = ['Thiago Alves', 'Lucas Ferreira'];

  const rnd = (min: number, max: number) => Math.random() * (max - min) + min;
  const rndInt = (min: number, max: number) => Math.floor(rnd(min, max));
  const padZ = (n: number) => String(n).padStart(2, '0');

  const agora = Date.now();
  const seeds: Abastecimento[] = [];

  for (let i = 0; i < 35; i++) {
    const diasAtras = rndInt(0, 45);
    const ts = agora - diasAtras * 86400000 - rndInt(0, 86400000);
    const dt = new Date(ts);
    const data = `${padZ(dt.getDate())}/${padZ(dt.getMonth() + 1)}/${dt.getFullYear()}`;
    const hHour = rndInt(6, 11);
    const hMin = rndInt(0, 59);
    const hI = `${padZ(hHour)}:${padZ(hMin)}`;
    const duracaoMin = rndInt(12, 45);
    const fimMin = hMin + duracaoMin;
    const hF = `${padZ(hHour + Math.floor(fimMin / 60))}:${padZ(fimMin % 60)}`;
    const dur = duracaoMin >= 60 ? `${Math.floor(duracaoMin / 60)}h ${duracaoMin % 60}min` : `${duracaoMin}min`;

    const placa = placas[rndInt(0, placas.length)];
    const isTruck = placa.startsWith('OXO') || placa.startsWith('TOZ') || placa.startsWith('QSK');
    const litragem = isTruck ? rnd(80, 200) : rnd(40, 90);
    const combustivel = Math.random() < 0.88 ? 'DIESEL' : 'ARLA';
    const km = 80000 + rndInt(0, 120000);

    seeds.push({
      id: ts - i,
      placa,
      km,
      litragem: parseFloat(litragem.toFixed(1)),
      combustivel,
      motorista: motoristas[rndInt(0, motoristas.length)],
      responsavel: responsaveis[rndInt(0, responsaveis.length)],
      horaInicio: hI,
      horaFim: hF,
      duracao: dur,
      duracaoMin,
      foto: '',
      horario: dt.toLocaleString('pt-BR'),
      data,
      timestamp: ts,
    });
  }

  seeds.sort((a, b) => b.timestamp - a.timestamp);
  localStorage.setItem('abastecimentos', JSON.stringify(seeds));
  return seeds;
}
