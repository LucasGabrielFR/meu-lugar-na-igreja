export const normalizeCatalogName = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const parishIdentity = value => normalizeCatalogName(value).replace(/^paroquia (?:de )?/, '').replace(/\bd abadia\b/g,'da abadia');
const stateNames = ['Rondônia','Acre','Amazonas','Roraima','Pará','Amapá','Tocantins','Maranhão','Piauí','Ceará','Rio Grande do Norte','Paraíba','Pernambuco','Alagoas','Sergipe','Bahia','Minas Gerais','Espírito Santo','Rio de Janeiro','São Paulo','Paraná','Santa Catarina','Rio Grande do Sul','Mato Grosso do Sul','Mato Grosso','Goiás','Distrito Federal'];
const stateCodes = ['RO','AC','AM','RR','PA','AP','TO','MA','PI','CE','RN','PB','PE','AL','SE','BA','MG','ES','RJ','SP','PR','SC','RS','MS','MT','GO','DF'];
const states = new Map(stateNames.flatMap((name,i)=>[[normalizeCatalogName(name),stateCodes[i]],[normalizeCatalogName(stateCodes[i]),stateCodes[i]]]));
export function resolveCatalogMunicipality(location, municipalities) {
  const parts=String(location??'').split(/\s*[-–—]\s*/),uf=states.get(normalizeCatalogName(parts.pop()));
  if(!uf)return null;
  const name=normalizeCatalogName(parts.join('-'));
  const matches=municipalities.filter(m=>m.uf===uf&&normalizeCatalogName(m.name)===name);
  return matches.length===1?matches[0]:null;
}
