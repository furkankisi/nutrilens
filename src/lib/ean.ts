/**
 * EAN-13 / EAN-8 / UPC-A / UPC-E sağlama (checksum) doğrulaması.
 * Kameradan yanlış okunan barkodların API'ye gitmesini engeller.
 */
function checksumOk(digits: string): boolean {
  const nums = digits.split('').map(Number);
  const check = nums.pop() as number;
  let sum = 0;
  // Sağdan sola: 3,1,3,1...
  nums.reverse().forEach((n, i) => {
    sum += n * (i % 2 === 0 ? 3 : 1);
  });
  return (10 - (sum % 10)) % 10 === check;
}

function expandUpcE(upce: string): string {
  const [ns, ...rest] = upce.split('');
  const d = rest.slice(0, 6);
  const chk = rest[6];
  const last = d[5];
  let body: string;
  if (last === '0' || last === '1' || last === '2') body = `${d[0]}${d[1]}${last}0000${d[2]}${d[3]}${d[4]}`;
  else if (last === '3') body = `${d[0]}${d[1]}${d[2]}00000${d[3]}${d[4]}`;
  else if (last === '4') body = `${d[0]}${d[1]}${d[2]}${d[3]}00000${d[4]}`;
  else body = `${d[0]}${d[1]}${d[2]}${d[3]}${d[4]}0000${last}`;
  return `${ns}${body}${chk}`;
}

export function isValidProductBarcode(raw: string): boolean {
  const code = raw.trim();
  if (!/^\d+$/.test(code)) return false;
  if (code.length === 13 || code.length === 12 || code.length === 8) {
    if (code.length === 8 && (code[0] === '0' || code[0] === '1')) {
      // UPC-E de 8 hane olabilir; EAN-8 kontrolü başarısızsa UPC-E dene
      return checksumOk(code) || checksumOk(expandUpcE(code));
    }
    return checksumOk(code);
  }
  return false;
}

/** UPC-A (12) kodlarını Open Food Facts'in beklediği 13 haneli forma çevirir. */
export function normalizeBarcode(raw: string): string {
  const code = raw.trim();
  return code.length === 12 ? `0${code}` : code;
}
