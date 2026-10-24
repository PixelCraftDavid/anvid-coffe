export function tokenFromText(value,origin){
  const text=String(value||'').trim();if(/^[a-f0-9]{48}$/.test(text))return text;
  try{const url=new URL(text,origin);if(url.origin!==origin||url.pathname!=='/')return null;return /^#p=([a-f0-9]{48})$/.exec(url.hash)?.[1]||null;}catch{return null;}
}
