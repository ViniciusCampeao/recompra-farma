/**
 * Utilitários de telefone - normalização E.164, nono dígito, parse de JID WhatsApp.
 *
 * Regras aplicadas:
 *  1. Remove tudo que não é dígito
 *  2. Se começa com 0, assume Brasil e troca pelo 55
 *  3. Se não começa com 55, prepends 55
 *  4. Celulares BR (55 + 2 dígitos DDD + 8 dígitos) recebem nono dígito (9)
 *  5. Resultado final: 55 + 2 DDD + 9 + 8 dígitos = 13 dígitos
 */

/** Remove qualquer coisa que não seja dígito */
function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Adiciona nono dígito se for celular BR com 12 dígitos (55 + DDD + 8) */
function ensureNinthDigit(digits: string): string {
  // 55 + 2 DDD + 8 = 12 dígitos  →  adiciona o 9 depois do DDD
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    // Celulares começam com 6,7,8,9 (sem o nono dígito)
    if (/^[6-9]/.test(number)) {
      return `55${ddd}9${number}`;
    }
  }
  return digits;
}

/**
 * Normaliza qualquer input de telefone para formato E.164 sem o +.
 * Ex: "(14) 99966-0536" → "5514999660536"
 */
export function normalizePhone(raw: string): string {
  let digits = onlyDigits(raw);

  if (!digits) return '';

  // Remove leading 0 (ex: 014999660536)
  if (digits.startsWith('0')) {
    digits = '55' + digits.slice(1);
  }

  // Se não começa com 55, assume BR
  if (!digits.startsWith('55')) {
    digits = '55' + digits;
  }

  // Adiciona nono dígito se necessário
  digits = ensureNinthDigit(digits);

  return digits;
}

/**
 * Extrai número E.164 de um JID do WhatsApp.
 * JID pode ser: "5514999660536@s.whatsapp.net", "5514999660536@lid", etc.
 */
export function phoneFromJid(jid: string): string {
  if (!jid) return '';
  const atIndex = jid.indexOf('@');
  const raw = atIndex > 0 ? jid.slice(0, atIndex) : jid;
  return normalizePhone(raw);
}

/**
 * Formata um número E.164 para exibição.
 * Ex: "5514999660536" → "(14) 99966-0536"
 */
export function formatPhoneDisplay(e164: string): string {
  const digits = onlyDigits(e164);
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9, 13);
    return `(${ddd}) ${part1}-${part2}`;
  }
  return e164;
}

/**
 * Verifica se parece ser um número válido BR.
 */
export function isValidBRPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^55\d{2}9\d{8}$/.test(normalized);
}
