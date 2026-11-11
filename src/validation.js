function normalizePhone(value){return String(value||'').trim().replace(/[\s().-]/g,'')}
function isValidPhone(value){const v=normalizePhone(value);return v===''||/^\+[1-9]\d{7,14}$/.test(v)}
function isValidEmail(value){
 const v=String(value||'').trim();if(v.length>254||v.split('@').length!==2)return false;
 const [local,domain]=v.split('@');if(!local||local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..')||/[\s<>()[\]\\,;:"]/.test(local))return false;
 const labels=domain.split('.');if(labels.length<2||labels.some(s=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(s)))return false;
 return /^[a-z]{2,63}$/i.test(labels.at(-1))||/^xn--[a-z0-9-]{2,59}$/i.test(labels.at(-1));
}
